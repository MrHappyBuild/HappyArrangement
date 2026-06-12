import { NextResponse } from "next/server";

import { getEvent, readGuestPageMedia } from "@/lib/local-store";

function errorResponse(message, status) {
  return NextResponse.json({ error: message }, { status });
}

function isSafeId(value) {
  return typeof value === "string" && /^[a-zA-Z0-9-]+$/.test(value);
}

export const dynamic = "force-dynamic";

export async function GET(_request, context) {
  try {
    const { eventId, mediaId } = await context.params;

    if (!isSafeId(eventId) || !isSafeId(mediaId)) {
      return errorResponse("Ugyldig medieid.", 400);
    }

    const event = await getEvent(eventId);

    if (!event) {
      return errorResponse("Fant ikke arrangementet.", 404);
    }

    const media = await readGuestPageMedia(eventId, mediaId);

    if (!media) {
      return errorResponse("Fant ikke bildet.", 404);
    }

    return new NextResponse(media.buffer, {
      headers: {
        "Content-Type": media.contentType || "image/png",
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Kunne ikke hente bildet.",
      500
    );
  }
}
