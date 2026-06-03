import { NextResponse } from "next/server";

import { createManualLocalJob, getEvent } from "@/lib/local-store";
import { rebuildReceiptFromEditor } from "@/receipt-utils";

function errorResponse(message, status) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const eventId = typeof payload?.eventId === "string" && payload.eventId.trim() ? payload.eventId : null;
    const fileName =
      typeof payload?.fileName === "string" && payload.fileName.trim()
        ? payload.fileName.trim()
        : "Manuell faktura";
    const editedResult = payload?.result;
    const paidByMemberId =
      typeof payload?.paidByMemberId === "string" && payload.paidByMemberId.trim()
        ? payload.paidByMemberId
        : null;

    if (!eventId) {
      return errorResponse("Velg et arrangement først.", 400);
    }

    const event = await getEvent(eventId);

    if (!event) {
      return errorResponse("Fant ikke arrangementet.", 400);
    }

    if (!editedResult || typeof editedResult !== "object") {
      return errorResponse("Mangler innhold for manuell faktura.", 400);
    }

    if (paidByMemberId && !event.members?.some((member) => member.id === paidByMemberId)) {
      return errorResponse("Betaler må være et medlem i arrangementet.", 400);
    }

    const result = rebuildReceiptFromEditor(editedResult);
    const job = await createManualLocalJob({
      fileName,
      eventId,
      result,
      paidByMemberId
    });

    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Kunne ikke opprette manuell faktura.",
      400
    );
  }
}
