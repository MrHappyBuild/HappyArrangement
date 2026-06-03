import crypto from "node:crypto";

import sharp from "sharp";

import { getLocalEnv } from "./env.js";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_PIXELS = 40_000_000;

export function assertAllowedFileType(contentType) {
  if (!ALLOWED_TYPES.has(contentType)) {
    throw new Error("Bare JPEG, PNG eller WebP er tillatt.");
  }
}

export function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export async function sanitizeReceiptUpload(file) {
  if (!file) {
    throw new Error("Mangler bildefil.");
  }

  assertAllowedFileType(file.type);

  const maxBytes = getLocalEnv().receiptMaxFileBytes;
  const sourceBuffer = Buffer.from(await file.arrayBuffer());

  if (sourceBuffer.length === 0) {
    throw new Error("Filen var tom.");
  }

  if (sourceBuffer.length > maxBytes) {
    throw new Error("Bildet er for stort. Maks størrelse er 10 MB.");
  }

  const pipeline = sharp(sourceBuffer, {
    limitInputPixels: MAX_PIXELS,
    sequentialRead: true
  }).rotate();

  const metadata = await pipeline.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("Kunne ikke lese bildet.");
  }

  const buffer = await pipeline
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
      palette: false
    })
    .toBuffer();

  return {
    buffer,
    contentType: "image/png",
    extension: "png",
    width: metadata.width,
    height: metadata.height,
    sha256: sha256(buffer)
  };
}
