import { NextResponse } from "next/server";

import { createEvent, listEvents } from "@/lib/local-store";

function errorResponse(message, status) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    const events = await listEvents();
    return NextResponse.json({ events });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Kunne ikke hente arrangementer.",
      500
    );
  }
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const name = typeof payload?.name === "string" ? payload.name.trim() : "";

    if (!name) {
      return errorResponse("Skriv inn et navn på arrangementet.", 400);
    }

    const event = await createEvent({ name });
    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Kunne ikke opprette arrangementet.",
      400
    );
  }
}
