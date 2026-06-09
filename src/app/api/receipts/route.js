import { NextResponse } from "next/server";

import { getLocalEnv } from "@/lib/env";
import { analyzeReceiptWithOllama } from "@/lib/local-ai";
import { createLocalJob, getEvent, listLocalJobs, updateLocalJob } from "@/lib/local-store";
import { sanitizeReceiptUpload } from "@/lib/uploads";

function errorResponse(message, status) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    const jobs = await listLocalJobs();
    return NextResponse.json({ jobs });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Kunne ikke hente lokale analyser.",
      500
    );
  }
}

export async function POST(request) {
  try {
    const env = getLocalEnv();
    const formData = await request.formData();
    const files = formData.getAll("receipt").filter((file) => file instanceof File);
    const eventIdRaw = formData.get("eventId");
    const eventId = typeof eventIdRaw === "string" && eventIdRaw.trim() ? eventIdRaw : null;

    if (files.length === 0) {
      return errorResponse("Last opp minst ett bilde først.", 400);
    }

    if (eventId) {
      const event = await getEvent(eventId);

      if (!event) {
        return errorResponse("Velg et gyldig arrangement først.", 400);
      }
    }

    const jobs = [];

    for (const file of files) {
      const sanitized = await sanitizeReceiptUpload(file);
      const initialJob = await createLocalJob({
        fileName: file.name,
        sanitized,
        eventId
      });

      if (env.receiptProcessingMode === "queue") {
        const queuedJob = await updateLocalJob(initialJob.id, () => ({
          status: "queued",
          error_message: null,
          completed_at: null
        }));
        jobs.push(queuedJob);
        continue;
      }

      try {
        const result = await analyzeReceiptWithOllama(sanitized.buffer);
        const completedJob = await updateLocalJob(initialJob.id, () => ({
          status: "completed",
          result,
          error_message: null,
          completed_at: new Date().toISOString()
        }));
        jobs.push(completedJob);
      } catch (error) {
        const failedJob = await updateLocalJob(initialJob.id, () => ({
          status: "failed",
          error_message: error instanceof Error ? error.message : "Ukjent lokal analysefeil.",
          completed_at: new Date().toISOString()
        }));
        jobs.push(failedJob);
      }
    }

    return NextResponse.json({ jobs }, { status: 201 });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Kunne ikke analysere kvitteringen.", 400);
  }
}
