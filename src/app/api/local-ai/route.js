import { NextResponse } from "next/server";

import { getLocalAiHealth } from "@/lib/local-ai";

export async function GET() {
  const health = await getLocalAiHealth();
  return NextResponse.json(health);
}
