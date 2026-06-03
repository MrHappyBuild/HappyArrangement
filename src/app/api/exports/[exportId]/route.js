import fs from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { getLocalEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET(_request, context) {
  const { exportId } = await context.params;
  const { localDataDir } = getLocalEnv();
  const exportDir = path.join(process.cwd(), localDataDir, "exports");
  const metaPath = path.join(exportDir, `${exportId}.meta.json`);

  let meta;

  try {
    meta = JSON.parse(await fs.readFile(metaPath, "utf8"));
  } catch {
    return NextResponse.json({ error: "Fant ikke eksportfilen." }, { status: 404 });
  }

  const extension = meta?.format || "pdf";
  const filePath = path.join(exportDir, `${exportId}.${extension}`);

  try {
    const buffer = await fs.readFile(filePath);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": meta?.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${meta?.filename || `export.${extension}`}"`,
        "Cache-Control": "no-store"
      }
    });
  } catch {
    return NextResponse.json({ error: "Fant ikke eksportinnholdet." }, { status: 404 });
  }
}
