import http from "node:http";

import { getLocalEnv } from "../src/lib/env.js";
import { getLocalAiHealth } from "../src/lib/local-ai.js";
import { listLocalJobs } from "../src/lib/local-store.js";

const PORT = Number(process.env.LOCAL_AI_BRIDGE_PORT || 4315);
const HOST = process.env.LOCAL_AI_BRIDGE_HOST || "127.0.0.1";

function writeJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,OPTIONS"
  });
  response.end(JSON.stringify(payload));
}

async function buildHealthPayload() {
  const env = getLocalEnv();
  const health = await getLocalAiHealth();
  const jobs = await listLocalJobs();
  const queueCounts = (Array.isArray(jobs) ? jobs : []).reduce(
    (summary, job) => {
      const status = String(job?.status || "");

      if (status === "queued") {
        summary.queued += 1;
      } else if (status === "processing") {
        summary.processing += 1;
      } else if (status === "completed") {
        summary.completed += 1;
      } else if (status === "failed") {
        summary.failed += 1;
      }

      return summary;
    },
    {
      queued: 0,
      processing: 0,
      completed: 0,
      failed: 0
    }
  );

  return {
    ok: true,
    processingMode: env.receiptProcessingMode,
    workerCommand: "npm run worker:watch",
    bridgeCommand: "npm run ai:bridge",
    ollama: health,
    queue: queueCounts,
    generatedAt: new Date().toISOString()
  };
}

const server = http.createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    writeJson(response, 200, { ok: true });
    return;
  }

  if (request.method !== "GET") {
    writeJson(response, 405, { ok: false, error: "Method not allowed." });
    return;
  }

  if (!request.url || request.url === "/" || request.url.startsWith("/health")) {
    try {
      const payload = await buildHealthPayload();
      writeJson(response, 200, payload);
    } catch (error) {
      writeJson(response, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Ukjent feil i lokal AI-bro."
      });
    }
    return;
  }

  writeJson(response, 404, { ok: false, error: "Not found." });
});

server.listen(PORT, HOST, () => {
  console.log(`Lokal AI-bro lytter paa http://${HOST}:${PORT}`);
});
