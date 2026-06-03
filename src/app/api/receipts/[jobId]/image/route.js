import fs from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { getLocalEnv } from "@/lib/env";
import { getLocalJob } from "@/lib/local-store";

export const dynamic = "force-dynamic";

export async function GET(_request, context) {
  const { jobId } = await context.params;
  const job = await getLocalJob(jobId);

  if (!job?.stored_image_path) {
    return NextResponse.json({ error: "Fant ikke kvitteringsbildet." }, { status: 404 });
  }

  const normalizedPath = path.normalize(job.stored_image_path);
  const { localDataDir } = getLocalEnv();
  const uploadsRoot = path.join(/* turbopackIgnore: true */ process.cwd(), localDataDir, "uploads");

  if (!normalizedPath.startsWith(path.normalize(uploadsRoot))) {
    return NextResponse.json({ error: "Ugyldig bildebane." }, { status: 400 });
  }

  const buffer = await fs.readFile(normalizedPath);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": job.sanitized_content_type || "image/jpeg",
      "Cache-Control": "no-store"
    }
  });
}
