import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { getEvent, saveSubmissionReceiptMedia, updateEvent } from "@/lib/local-store";
import { sanitizeReceiptUpload } from "@/lib/uploads";

function errorResponse(message, status) {
  return NextResponse.json({ error: message }, { status });
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
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
    const title = cleanString(formData.get("title"));
    const submittedByPersonId = cleanString(formData.get("submittedByPersonId"));
    const note = cleanString(formData.get("note"));
    const file = formData.get("image");

    if (!title || !submittedByPersonId) {
      return errorResponse("Mangler tittel eller innsender.", 400);
    }

    if (!(file instanceof File)) {
      return errorResponse("Velg et kvitteringsbilde.", 400);
    }

    const submissionId = crypto.randomUUID();
    const sanitized = await sanitizeReceiptUpload(file);
    const media = await saveSubmissionReceiptMedia({
      eventId,
      submissionId,
      sanitized
    });

    const nextEvent = await updateEvent(eventId, (current) => ({
      ...current,
      submissions: [
        ...(current.submissions || []),
        {
          id: submissionId,
          type: "receipt_upload",
          title,
          submittedByPersonId,
          status: "pending_approval",
          note,
          storedImagePath: media.absolutePath,
          imageContentType: media.contentType,
          imageOriginalFilename: file.name || "",
          created_at: new Date().toISOString()
        }
      ]
    }));

    return NextResponse.json({ event: nextEvent }, { status: 201 });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Kunne ikke opprette bildeinnsending.",
      400
    );
  }
}
