import { NextResponse } from "next/server";

import { addEventMember } from "@/lib/local-store";

function errorResponse(message, status) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request, context) {
  try {
    const { eventId } = await context.params;
    const payload = await request.json();
    const name = typeof payload?.name === "string" ? payload.name.trim() : "";

    if (!name) {
      return errorResponse("Skriv inn navnet på medlemmet.", 400);
    }

    const event = await addEventMember(eventId, { name });
    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Kunne ikke legge til medlem.",
      400
    );
  }
}
