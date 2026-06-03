import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

import { NextResponse } from "next/server";

import { createEventExportPayload } from "@/event-export-utils";
import { getLocalEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

const BUNDLED_PYTHON =
  process.env.CODEX_BUNDLED_PYTHON ||
  "/Users/mr.reinfjord/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3";

const MIME_TYPES = {
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
};

function sanitizeName(value, fallback) {
  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }

  return value
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || fallback;
}

async function runExportScript({ payload, kind, format, outputPath }) {
  const { localDataDir } = getLocalEnv();
  const exportDir = path.join(process.cwd(), localDataDir, "exports");
  await fs.mkdir(exportDir, { recursive: true });

  const id = crypto.randomUUID();
  const payloadPath = path.join(exportDir, `${id}.json`);
  const scriptPath = path.join(process.cwd(), "scripts", "export_receipt_bundle.py");

  await fs.writeFile(payloadPath, JSON.stringify(payload, null, 2), "utf8");

  await new Promise((resolve, reject) => {
    const child = spawn(BUNDLED_PYTHON, [scriptPath, payloadPath, outputPath, kind, format], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr || "Eksportscriptet feilet."));
    });
  });

  await fs.rm(payloadPath, { force: true });
}

function resolveFilename(payload, kind, format) {
  if (kind === "event") {
    const eventName = sanitizeName(payload?.eventName, "arrangement");
    return `${eventName}-arrangement.${format}`;
  }

  const merchant = sanitizeName(payload?.result?.merchantName, "kvittering");
  const date = sanitizeName(payload?.result?.receiptDate, "ukjent-dato");

  if (kind === "registered") {
    return `${merchant}-${date}-registrert.${format}`;
  }

  if (kind === "distribution") {
    return `${merchant}-${date}-fordeling.${format}`;
  }

  const participant = sanitizeName(payload?.participantName, "person");
  return `${merchant}-${date}-fordeling-${participant}.${format}`;
}

export async function POST(request) {
  let payload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Kunne ikke lese eksportforesporselen." }, { status: 400 });
  }

  const kind = payload?.kind;
  const format = payload?.format;

  if (!["registered", "distribution", "participant", "event"].includes(kind)) {
    return NextResponse.json({ error: "Ugyldig eksporttype." }, { status: 400 });
  }

  if (!["pdf", "xlsx"].includes(format)) {
    return NextResponse.json({ error: "Ugyldig eksportformat." }, { status: 400 });
  }

  if (kind === "event") {
    if (!payload?.event || typeof payload.event !== "object") {
      return NextResponse.json({ error: "Mangler arrangementsdata." }, { status: 400 });
    }

    if (!Array.isArray(payload?.jobs)) {
      return NextResponse.json({ error: "Mangler kvitteringer for arrangementet." }, { status: 400 });
    }
  }

  if (kind !== "event" && (!payload?.result || typeof payload.result !== "object")) {
    return NextResponse.json({ error: "Mangler kvitteringsdata." }, { status: 400 });
  }

  if ((kind === "distribution" || kind === "participant") && !payload?.distributionState) {
    return NextResponse.json({ error: "Mangler fordelingsdata." }, { status: 400 });
  }

  if (kind === "participant" && !payload?.participantId) {
    return NextResponse.json({ error: "Mangler personvalg." }, { status: 400 });
  }

  try {
    const exportPayload =
      kind === "event" ? createEventExportPayload(payload.event, payload.jobs) : payload;
    const { localDataDir } = getLocalEnv();
    const exportDir = path.join(process.cwd(), localDataDir, "exports");
    await fs.mkdir(exportDir, { recursive: true });

    const exportId = crypto.randomUUID();
    const filename = resolveFilename(exportPayload, kind, format);
    const outputPath = path.join(exportDir, `${exportId}.${format}`);
    const metaPath = path.join(exportDir, `${exportId}.meta.json`);

    await runExportScript({ payload: exportPayload, kind, format, outputPath });
    await fs.writeFile(
      metaPath,
      JSON.stringify(
        {
          id: exportId,
          filename,
          format,
          mimeType: MIME_TYPES[format],
          createdAt: new Date().toISOString()
        },
        null,
        2
      ),
      "utf8"
    );

    return NextResponse.json({
      ok: true,
      filename,
      downloadUrl: `/api/exports/${exportId}`
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Kunne ikke lage eksportfilen."
      },
      { status: 500 }
    );
  }
}
