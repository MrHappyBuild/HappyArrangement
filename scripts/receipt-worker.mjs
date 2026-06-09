import { setTimeout as sleep } from "node:timers/promises";

import { analyzeReceiptWithOllama } from "../src/lib/local-ai.js";
import { readReceiptImage, updateLocalJob } from "../src/lib/local-store.js";
import { getSupabaseAdmin, isSupabaseConfigured } from "../src/lib/supabase.js";

const WATCH_MODE = process.argv.includes("--watch");
const POLL_INTERVAL_MS = Number(process.env.RECEIPT_WORKER_POLL_MS || 5000);

async function claimNextJob() {
  const client = getSupabaseAdmin();
  const { data, error } = await client
    .from("receipt_jobs")
    .select("id")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) {
    throw new Error(`Kunne ikke hente jobbkøen: ${error.message}`);
  }

  const candidate = Array.isArray(data) ? data[0] : null;

  if (!candidate?.id) {
    return null;
  }

  const { data: claimedRows, error: claimError } = await client
    .from("receipt_jobs")
    .update({
      status: "processing",
      error_message: null,
      updated_at: new Date().toISOString()
    })
    .eq("id", candidate.id)
    .eq("status", "queued")
    .select("id")
    .limit(1);

  if (claimError) {
    throw new Error(`Kunne ikke claime jobb ${candidate.id}: ${claimError.message}`);
  }

  const claimed = Array.isArray(claimedRows) ? claimedRows[0] : null;
  return claimed?.id || null;
}

async function processJob(jobId) {
  const media = await readReceiptImage(jobId);

  if (!media?.buffer) {
    await updateLocalJob(jobId, () => ({
      status: "failed",
      error_message: "Fant ikke kvitteringsbildet i Supabase Storage.",
      completed_at: new Date().toISOString()
    }));
    return;
  }

  try {
    const result = await analyzeReceiptWithOllama(media.buffer);
    await updateLocalJob(jobId, () => ({
      status: "completed",
      result,
      error_message: null,
      completed_at: new Date().toISOString()
    }));
    console.log(`Ferdig: ${jobId}`);
  } catch (error) {
    await updateLocalJob(jobId, () => ({
      status: "failed",
      error_message: error instanceof Error ? error.message : "Ukjent analysefeil.",
      completed_at: new Date().toISOString()
    }));
    console.error(`Feilet: ${jobId}`);
  }
}

async function runOnce() {
  const jobId = await claimNextJob();

  if (!jobId) {
    return false;
  }

  await processJob(jobId);
  return true;
}

async function main() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase er ikke konfigurert. Sett SUPABASE_URL og SUPABASE_SERVICE_ROLE_KEY.");
  }

  console.log(WATCH_MODE ? "Starter kvitteringsworker i watch-modus..." : "Kjører én jobbsyklus...");

  do {
    const worked = await runOnce();

    if (!WATCH_MODE) {
      break;
    }

    if (!worked) {
      await sleep(POLL_INTERVAL_MS);
    }
  } while (WATCH_MODE);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
