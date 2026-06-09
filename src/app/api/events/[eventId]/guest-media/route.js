import { NextResponse } from "next/server";

import { getEvent, saveGuestPageMedia } from "@/lib/local-store";
import { sanitizeGuestPageUpload } from "@/lib/uploads";

function errorResponse(message, status) {
  return NextResponse.json({ error: message }, { status });
}

function normalizeAltText(fileName) {
  const baseName = typeof fileName === "string" ? fileName.replace(/\.[^.]+$/, "") : "";
  const cleaned = baseName.replace(/[\[\]\(\)]/g, " ").replace(/\s+/g, " ").trim();
  return cleaned || "Bilde";
}

export const dynamic = "force-dynamic";

export async function POST(request, context) {
  try {
    const { eventId } = await context.params;
    const event = await getEvent(eventId);

    if (!event) {
      return errorResponse("Fant ikke arrangementet.", 404);
    }

    const formData = await request.formData();
    const file = formData.get("image");

    if (!(file instanceof File)) {
      return errorResponse("Velg et bilde for opplasting.", 400);
    }

    const sanitized = await sanitizeGuestPageUpload(file);
    const media = await saveGuestPageMedia({
      eventId,
      sanitized
    });
    const altText = normalizeAltText(file.name);
    const url = `/api/events/${eventId}/guest-media/${media.mediaId}`;

    return NextResponse.json(
      {
        mediaId: media.mediaId,
        url,
        markdown: `![${altText}](${url})`
      },
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Kunne ikke laste opp bildet.",
      400
    );
  }
}
