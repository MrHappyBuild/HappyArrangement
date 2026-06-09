import { NextResponse } from "next/server";

import { readReceiptImage } from "@/lib/local-store";

export const dynamic = "force-dynamic";

export async function GET(_request, context) {
  const { jobId } = await context.params;
  const media = await readReceiptImage(jobId);

  if (!media) {
    return NextResponse.json({ error: "Fant ikke kvitteringsbildet." }, { status: 404 });
  }

  return new NextResponse(media.buffer, {
    headers: {
      "Content-Type": media.contentType || "image/jpeg",
      "Cache-Control": "no-store"
    }
  });
}
