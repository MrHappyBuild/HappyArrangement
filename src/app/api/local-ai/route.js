import { NextResponse } from "next/server";

import { getLocalEnv } from "@/lib/env";
import { getLocalAiHealth } from "@/lib/local-ai";

export async function GET() {
  const env = getLocalEnv();

  if (env.receiptProcessingMode === "queue") {
    return NextResponse.json({
      ready: true,
      reachable: false,
      configuredModel: env.ollamaModel,
      installedModels: [],
      processingMode: "queue",
      message:
        "Ko-modus er aktiv. Bilag sendes til Supabase-koen og behandles av lokal worker paa din egen maskin."
    });
  }

  const health = await getLocalAiHealth();
  return NextResponse.json({
    ...health,
    processingMode: env.receiptProcessingMode
  });
}
