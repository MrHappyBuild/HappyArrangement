import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { getLocalEnv } from "./env.js";

function getPaths() {
  const { localDataDir } = getLocalEnv();
  const root = path.join(/* turbopackIgnore: true */ process.cwd(), localDataDir);

  return {
    root,
    uploadsDir: path.join(root, "uploads"),
    jobsFile: path.join(root, "receipts.json"),
    eventsFile: path.join(root, "events.json")
  };
}

async function ensureStore() {
  const paths = getPaths();
  await fs.mkdir(paths.uploadsDir, { recursive: true });

  try {
    await fs.access(paths.jobsFile);
  } catch {
    await fs.writeFile(paths.jobsFile, "[]\n", "utf8");
  }

  try {
    await fs.access(paths.eventsFile);
  } catch {
    await fs.writeFile(paths.eventsFile, "[]\n", "utf8");
  }

  return paths;
}

async function readJobs() {
  const { jobsFile } = await ensureStore();
  const raw = await fs.readFile(jobsFile, "utf8");
  return JSON.parse(raw);
}

async function writeJobs(jobs) {
  const { jobsFile } = await ensureStore();
  await fs.writeFile(jobsFile, `${JSON.stringify(jobs, null, 2)}\n`, "utf8");
}

async function readEvents() {
  const { eventsFile } = await ensureStore();
  const raw = await fs.readFile(eventsFile, "utf8");
  return JSON.parse(raw);
}

async function writeEvents(events) {
  const { eventsFile } = await ensureStore();
  await fs.writeFile(eventsFile, `${JSON.stringify(events, null, 2)}\n`, "utf8");
}

export async function getLocalJob(jobId) {
  const jobs = await readJobs();
  return jobs.find((job) => job.id === jobId) ?? null;
}

export async function listLocalJobs(limit = 50) {
  const jobs = await readJobs();
  return jobs
    .slice()
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
    .slice(0, limit);
}

export async function listEvents() {
  const events = await readEvents();
  return events
    .slice()
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
}

export async function getEvent(eventId) {
  const events = await readEvents();
  return events.find((event) => event.id === eventId) ?? null;
}

export async function createEvent({ name }) {
  const events = await readEvents();
  const createdAt = new Date().toISOString();
  const event = {
    id: crypto.randomUUID(),
    name,
    created_at: createdAt,
    updated_at: createdAt,
    members: []
  };

  events.push(event);
  await writeEvents(events);
  return event;
}

export async function addEventMember(eventId, { name }) {
  const events = await readEvents();
  const index = events.findIndex((event) => event.id === eventId);

  if (index === -1) {
    throw new Error("Fant ikke arrangementet.");
  }

  const createdAt = new Date().toISOString();
  const member = {
    id: crypto.randomUUID(),
    name,
    created_at: createdAt
  };

  const event = events[index];
  events[index] = {
    ...event,
    updated_at: createdAt,
    members: [...(Array.isArray(event.members) ? event.members : []), member]
  };

  await writeEvents(events);
  return events[index];
}

export async function createLocalJob({ fileName, sanitized, eventId = null }) {
  const paths = await ensureStore();
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const uploadDir = path.join(paths.uploadsDir, id);
  const inputFilename = `input.${sanitized.extension}`;
  const absoluteImagePath = path.join(uploadDir, inputFilename);

  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(absoluteImagePath, sanitized.buffer);

  const job = {
    id,
    status: "processing",
    original_filename: fileName,
    stored_image_path: absoluteImagePath,
    sanitized_content_type: sanitized.contentType,
    input_sha256: sanitized.sha256,
    event_id: eventId,
    created_at: createdAt,
    updated_at: createdAt,
    completed_at: null,
    error_message: null,
    result: null,
    paid_by_member_id: null,
    distribution_state: null
  };

  const jobs = await readJobs();
  jobs.push(job);
  await writeJobs(jobs);
  return job;
}

export async function createManualLocalJob({
  fileName,
  eventId = null,
  result,
  paidByMemberId = null
}) {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const job = {
    id,
    status: "completed",
    original_filename: fileName || "Manuell faktura",
    stored_image_path: null,
    sanitized_content_type: null,
    input_sha256: null,
    event_id: eventId,
    created_at: createdAt,
    updated_at: createdAt,
    completed_at: createdAt,
    error_message: null,
    result,
    paid_by_member_id: paidByMemberId,
    distribution_state: null
  };

  const jobs = await readJobs();
  jobs.push(job);
  await writeJobs(jobs);
  return job;
}

export async function updateLocalJob(jobId, updater) {
  const jobs = await readJobs();
  const index = jobs.findIndex((job) => job.id === jobId);

  if (index === -1) {
    throw new Error("Fant ikke lokal jobb.");
  }

  const current = jobs[index];
  const next = {
    ...current,
    ...updater(current),
    updated_at: new Date().toISOString()
  };

  jobs[index] = next;
  await writeJobs(jobs);
  return next;
}
