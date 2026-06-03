import { getLocalEnv } from "./env.js";
import sharp from "sharp";

import {
  RECEIPT_EXTRACTION_PROMPT,
  RECEIPT_ITEMS_PROMPT,
  RECEIPT_SUMMARY_PROMPT
} from "../receipt-prompt.js";
import {
  receiptItemsJsonSchema,
  receiptJsonSchema,
  receiptSummaryJsonSchema
} from "../receipt-schema.js";
import { hydrateReceipt } from "../receipt-utils.js";

const MAX_SUMMARY_EDGE = 1600;
const MAX_SEGMENT_WIDTH = 1280;
const MAX_SEGMENT_HEIGHT = 1400;
const MAX_FALLBACK_EDGE = 1280;
const TALL_RECEIPT_RATIO = 2.35;
const TALL_RECEIPT_HEIGHT = 2200;

function isAllowedLocalHost(hostname) {
  return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";
}

export function assertSafeOllamaBaseUrl(baseUrl) {
  const parsed = new URL(baseUrl);

  if (!isAllowedLocalHost(parsed.hostname)) {
    throw new Error("OLLAMA_BASE_URL må peke til localhost eller 127.0.0.1.");
  }

  return parsed;
}

function localOllamaUnavailableMessage(ollamaUrl, model) {
  return `Kunne ikke kontakte lokal Ollama på ${ollamaUrl.origin}. Start Ollama og sjekk at modellen ${model} er installert.`;
}

function prefersLooseJson(model) {
  return model.startsWith("qwen2.5vl");
}

function buildPrompt(prompt, schema) {
  return `${prompt}\n\nUse this JSON schema exactly:\n${JSON.stringify(schema)}`;
}

function parseJsonContent(content) {
  const trimmed = content.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)```/i) || trimmed.match(/```([\s\S]*?)```/);

    if (fencedMatch?.[1]) {
      return JSON.parse(fencedMatch[1].trim());
    }

    const objectStart = trimmed.indexOf("{");
    const objectEnd = trimmed.lastIndexOf("}");

    if (objectStart >= 0 && objectEnd > objectStart) {
      return JSON.parse(trimmed.slice(objectStart, objectEnd + 1));
    }

    throw new Error("Kunne ikke tolke JSON fra lokal modell.");
  }
}

function isRetryableModelCrash(error) {
  const message = error instanceof Error ? error.message : String(error);
  return /GGML_ASSERT|signal arrived during cgo execution|an error was encountered while running the model/i.test(
    message
  );
}

async function getImageMetadata(imageBuffer) {
  const metadata = await sharp(imageBuffer).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("Kunne ikke lese bildefil for lokal AI-analyse.");
  }

  return {
    width: metadata.width,
    height: metadata.height
  };
}

function shouldUseSegmentedExtraction({ width, height }) {
  return height >= TALL_RECEIPT_HEIGHT || height / width >= TALL_RECEIPT_RATIO;
}

async function resizeInside(imageBuffer, width, height) {
  const resizeOptions = {
    fit: "inside",
    withoutEnlargement: true
  };

  if (typeof width === "number") {
    resizeOptions.width = width;
  }

  if (typeof height === "number") {
    resizeOptions.height = height;
  }

  return sharp(imageBuffer)
    .resize(resizeOptions)
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
      palette: false
    })
    .toBuffer();
}

async function cropReceiptSurface(imageBuffer) {
  const { info } = await sharp(imageBuffer)
    .grayscale()
    .normalise()
    .threshold(205)
    .trim()
    .png()
    .toBuffer({ resolveWithObject: true });

  if (
    typeof info.trimOffsetLeft !== "number" ||
    typeof info.trimOffsetTop !== "number" ||
    !info.width ||
    !info.height
  ) {
    return imageBuffer;
  }

  const metadata = await getImageMetadata(imageBuffer);
  const left = Math.max(0, info.trimOffsetLeft - 24);
  const top = Math.max(0, info.trimOffsetTop - 24);
  const width = Math.min(metadata.width - left, info.width + 48);
  const height = Math.min(metadata.height - top, info.height + 48);

  if (width <= 0 || height <= 0) {
    return imageBuffer;
  }

  return sharp(imageBuffer)
    .extract({
      left,
      top,
      width,
      height
    })
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
      palette: false
    })
    .toBuffer();
}

async function trimReceiptWhitespace(imageBuffer) {
  const { data, info } = await sharp(imageBuffer)
    .trim()
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
      palette: false
    })
    .toBuffer({ resolveWithObject: true });

  if (!info.width || !info.height) {
    return imageBuffer;
  }

  return data;
}

async function createReceiptSegments(imageBuffer) {
  const metadata = await getImageMetadata(imageBuffer);
  const normalized = await resizeInside(imageBuffer, Math.min(metadata.width, MAX_SEGMENT_WIDTH), null);
  const normalizedMetadata = await getImageMetadata(normalized);

  if (normalizedMetadata.height <= MAX_SEGMENT_HEIGHT) {
    return [normalized];
  }

  const segments = [];

  for (let top = 0; top < normalizedMetadata.height; top += MAX_SEGMENT_HEIGHT) {
    const sliceHeight = Math.min(MAX_SEGMENT_HEIGHT, normalizedMetadata.height - top);
    const segment = await sharp(normalized)
      .extract({
        left: 0,
        top,
        width: normalizedMetadata.width,
        height: sliceHeight
      })
      .png({
        compressionLevel: 9,
        adaptiveFiltering: true,
        palette: false
      })
      .toBuffer();

    segments.push(segment);
  }

  return segments;
}

export async function getLocalAiHealth() {
  const env = getLocalEnv();
  let ollamaUrl;

  try {
    ollamaUrl = assertSafeOllamaBaseUrl(env.ollamaBaseUrl);
  } catch (error) {
    return {
      ready: false,
      reachable: false,
      configuredModel: env.ollamaModel,
      installedModels: [],
      message: error instanceof Error ? error.message : "Ugyldig OLLAMA_BASE_URL."
    };
  }

  try {
    const response = await fetch(new URL("/api/tags", ollamaUrl), {
      method: "GET",
      cache: "no-store"
    });

    if (!response.ok) {
      const body = await response.text();
      return {
        ready: false,
        reachable: true,
        configuredModel: env.ollamaModel,
        installedModels: [],
        message: `Ollama-feil (${response.status}): ${body || "Ukjent svar fra lokal modell."}`
      };
    }

    const payload = await response.json();
    const installedModels = Array.isArray(payload?.models)
      ? payload.models
          .map((model) => model?.name || model?.model)
          .filter((value) => typeof value === "string")
      : [];
    const ready = installedModels.includes(env.ollamaModel);

    return {
      ready,
      reachable: true,
      configuredModel: env.ollamaModel,
      installedModels,
      message: ready
        ? `Ollama er klar med modellen ${env.ollamaModel}.`
        : `Ollama svarer, men modellen ${env.ollamaModel} er ikke installert ennå.`
    };
  } catch {
    return {
      ready: false,
      reachable: false,
      configuredModel: env.ollamaModel,
      installedModels: [],
      message: localOllamaUnavailableMessage(ollamaUrl, env.ollamaModel)
    };
  }
}

async function runOllamaJson({ env, imageBuffer, prompt, schema }) {
  const ollamaUrl = assertSafeOllamaBaseUrl(env.ollamaBaseUrl);
  let response;

  try {
    response = await fetch(new URL("/api/chat", ollamaUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: env.ollamaModel,
        stream: false,
        format: prefersLooseJson(env.ollamaModel) ? "json" : schema,
        options: {
          temperature: 0
        },
        messages: [
          {
            role: "user",
            content: buildPrompt(prompt, schema),
            images: [imageBuffer.toString("base64")]
          }
        ]
      })
    });
  } catch {
    throw new Error(localOllamaUnavailableMessage(ollamaUrl, env.ollamaModel));
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Ollama-feil (${response.status}): ${body || "Ukjent svar fra lokal modell."}`);
  }

  const payload = await response.json();
  const content = payload?.message?.content;

  if (typeof content !== "string" || !content.trim()) {
    throw new Error("Lokal modell returnerte tomt svar.");
  }

  return parseJsonContent(content);
}

async function analyzeSingleReceipt(env, imageBuffer) {
  const parsed = await runOllamaJson({
    env,
    imageBuffer,
    prompt: RECEIPT_EXTRACTION_PROMPT,
    schema: receiptJsonSchema
  });

  return hydrateReceipt(parsed);
}

async function analyzeFocusedReceipt(env, imageBuffer) {
  const summaryImage = await resizeInside(imageBuffer, MAX_SUMMARY_EDGE, MAX_SUMMARY_EDGE);
  const summary = await runOllamaJson({
    env,
    imageBuffer: summaryImage,
    prompt: RECEIPT_SUMMARY_PROMPT,
    schema: receiptSummaryJsonSchema
  });
  const itemsResult = await runOllamaJson({
    env,
    imageBuffer,
    prompt: RECEIPT_ITEMS_PROMPT,
    schema: receiptItemsJsonSchema
  });

  return hydrateReceipt({
    merchantName: summary?.merchantName ?? null,
    merchantCategory: summary?.merchantCategory ?? "unknown",
    receiptDate: summary?.receiptDate ?? null,
    receiptTime: summary?.receiptTime ?? null,
    currency: summary?.currency ?? null,
    subtotal: summary?.subtotal ?? null,
    taxTotal: summary?.taxTotal ?? null,
    grandTotal: summary?.grandTotal ?? null,
    tableRows: Array.isArray(itemsResult?.tableRows) ? itemsResult.tableRows : [],
    notes: [
      ...(Array.isArray(summary?.notes) ? summary.notes : []),
      ...(Array.isArray(itemsResult?.notes) ? itemsResult.notes : [])
    ],
    items: Array.isArray(itemsResult?.items) ? itemsResult.items : []
  });
}

async function analyzeSegmentedReceipt(env, imageBuffer) {
  const summaryImage = await resizeInside(imageBuffer, MAX_SUMMARY_EDGE, MAX_SUMMARY_EDGE);
  const summary = await runOllamaJson({
    env,
    imageBuffer: summaryImage,
    prompt: RECEIPT_SUMMARY_PROMPT,
    schema: receiptSummaryJsonSchema
  });
  const segments = await createReceiptSegments(imageBuffer);
  const segmentResults = [];

  for (let index = 0; index < segments.length; index += 1) {
    const segmentPrompt =
      `${RECEIPT_ITEMS_PROMPT}\n` +
      `This is receipt slice ${index + 1} of ${segments.length}.`;
    const segmentResult = await runOllamaJson({
      env,
      imageBuffer: segments[index],
      prompt: segmentPrompt,
      schema: receiptItemsJsonSchema
    });

    segmentResults.push(segmentResult);
  }

  return hydrateReceipt({
    merchantName: summary?.merchantName ?? null,
    merchantCategory: summary?.merchantCategory ?? "unknown",
    receiptDate: summary?.receiptDate ?? null,
    receiptTime: summary?.receiptTime ?? null,
    currency: summary?.currency ?? null,
    subtotal: summary?.subtotal ?? null,
    taxTotal: summary?.taxTotal ?? null,
    grandTotal: summary?.grandTotal ?? null,
    tableRows: segmentResults.flatMap((segment) =>
      Array.isArray(segment?.tableRows) ? segment.tableRows : []
    ),
    notes: [
      ...(Array.isArray(summary?.notes) ? summary.notes : []),
      ...segmentResults.flatMap((segment) => (Array.isArray(segment?.notes) ? segment.notes : []))
    ],
    items: segmentResults.flatMap((segment) => (Array.isArray(segment?.items) ? segment.items : []))
  });
}

export async function analyzeReceiptWithOllama(imageBuffer) {
  const env = getLocalEnv();
  const croppedImage = await cropReceiptSurface(imageBuffer);
  const optimizedImage = await trimReceiptWhitespace(croppedImage);
  const metadata = await getImageMetadata(optimizedImage);
  const prefersSegmentation = shouldUseSegmentedExtraction(metadata);

  try {
    if (prefersSegmentation) {
      return await analyzeSegmentedReceipt(env, optimizedImage);
    }

    return await analyzeFocusedReceipt(env, optimizedImage);
  } catch (error) {
    if (!isRetryableModelCrash(error)) {
      throw error;
    }

    const fallbackImage = await resizeInside(optimizedImage, MAX_FALLBACK_EDGE, MAX_FALLBACK_EDGE);

    try {
      return prefersSegmentation
        ? await analyzeFocusedReceipt(env, fallbackImage)
        : await analyzeSingleReceipt(env, fallbackImage);
    } catch (fallbackError) {
      const message =
        fallbackError instanceof Error ? fallbackError.message : "Ukjent lokal analysefeil.";
      throw new Error(
        `${message} Prøv igjen med et skarpere bilde, eller bruk en annen lokal modell hvis dette fortsetter.`
      );
    }
  }
}
