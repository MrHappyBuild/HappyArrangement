import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { getLocalEnv } from "./env.js";
import { ensureEventShape } from "../event-platform-utils.js";

function getPaths() {
  const { localDataDir } = getLocalEnv();
  const root = path.join(/* turbopackIgnore: true */ process.cwd(), localDataDir);

  return {
    root,
    uploadsDir: path.join(root, "uploads"),
    guestMediaDir: path.join(root, "guest-media"),
    submissionMediaDir: path.join(root, "submission-media"),
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
    .map((event) => ensureEventShape(event))
    .slice()
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
}

export async function getEvent(eventId) {
  const events = await readEvents();
  const event = events.find((entry) => entry.id === eventId);
  return event ? ensureEventShape(event) : null;
}

export async function createEvent({ name }) {
  const events = await readEvents();
  const createdAt = new Date().toISOString();
  const event = ensureEventShape({
    id: crypto.randomUUID(),
    name,
    created_at: createdAt,
    updated_at: createdAt,
    members: [],
    overview: {
      title: name,
      description: "",
      location: "",
      startsAt: "",
      endsAt: "",
      dressCode: "",
      practicalInfo: ""
    },
    guestPages: [],
    people: [],
    tasks: [],
    ledgerEntries: [],
    submissions: []
  });

  events.push(event);
  await writeEvents(events);
  return event;
}

export async function addEventMember(eventId, { name }) {
  return updateEvent(eventId, (event) => {
    const createdAt = new Date().toISOString();
    const personId = crypto.randomUUID();
    const person = {
      id: personId,
      name,
      created_at: createdAt,
      rsvpStatus: "pending",
      planningRole: "viewer",
      projectRole: "none",
      financeRole: "member",
      capabilities: {
        canCreateEvents: false,
        canSubmitReceipts: true,
        canSubmitManualInvoices: true,
        canSendToAiDirectly: true
      }
    };

    return {
      ...event,
      people: [...(Array.isArray(event.people) ? event.people : []), person]
    };
  });
}

export async function updateEvent(eventId, updater) {
  const events = await readEvents();
  const index = events.findIndex((event) => event.id === eventId);

  if (index === -1) {
    throw new Error("Fant ikke arrangementet.");
  }

  const current = ensureEventShape(events[index]);
  const updated = updater(current);
  const next = ensureEventShape({
    ...current,
    ...(updated && typeof updated === "object" ? updated : {}),
    updated_at: new Date().toISOString()
  });

  events[index] = next;
  await writeEvents(events);
  return next;
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

export async function saveGuestPageMedia({ eventId, sanitized }) {
  const paths = await ensureStore();
  const mediaId = crypto.randomUUID();
  const mediaDir = path.join(paths.guestMediaDir, eventId);
  const absolutePath = path.join(mediaDir, `${mediaId}.png`);

  await fs.mkdir(mediaDir, { recursive: true });
  await fs.writeFile(absolutePath, sanitized.buffer);

  return {
    mediaId,
    absolutePath,
    contentType: sanitized.contentType || "image/png"
  };
}

export async function readGuestPageMedia(eventId, mediaId) {
  const paths = await ensureStore();
  const guestMediaRoot = path.join(paths.guestMediaDir);
  const absolutePath = path.join(guestMediaRoot, eventId, `${mediaId}.png`);
  const normalizedPath = path.normalize(absolutePath);
  const normalizedRoot = path.normalize(guestMediaRoot);

  if (!normalizedPath.startsWith(normalizedRoot)) {
    throw new Error("Ugyldig mediebane.");
  }

  try {
    const buffer = await fs.readFile(normalizedPath);
    return {
      buffer,
      contentType: "image/png"
    };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

export async function saveSubmissionReceiptMedia({ eventId, submissionId, sanitized }) {
  const paths = await ensureStore();
  const mediaDir = path.join(paths.submissionMediaDir, eventId);
  const absolutePath = path.join(mediaDir, `${submissionId}.png`);

  await fs.mkdir(mediaDir, { recursive: true });
  await fs.writeFile(absolutePath, sanitized.buffer);

  return {
    absolutePath,
    contentType: sanitized.contentType || "image/png"
  };
}

export async function readReceiptImage(jobId) {
  const job = await getLocalJob(jobId);

  if (!job?.stored_image_path) {
    return null;
  }

  const normalizedPath = path.normalize(job.stored_image_path);
  const { localDataDir } = getLocalEnv();
  const uploadsRoot = path.join(/* turbopackIgnore: true */ process.cwd(), localDataDir, "uploads");

  if (!normalizedPath.startsWith(path.normalize(uploadsRoot))) {
    throw new Error("Ugyldig bildebane.");
  }

  const buffer = await fs.readFile(normalizedPath);

  return {
    buffer,
    contentType: job.sanitized_content_type || "image/jpeg"
  };
}

export async function readSubmissionReceiptMedia(eventId, submissionId, storedImagePath = "") {
  const paths = await ensureStore();
  const mediaRoot = path.join(paths.submissionMediaDir);
  const absolutePath =
    typeof storedImagePath === "string" && storedImagePath
      ? storedImagePath
      : path.join(mediaRoot, eventId, `${submissionId}.png`);
  const normalizedPath = path.normalize(absolutePath);

  if (!normalizedPath.startsWith(path.normalize(mediaRoot))) {
    throw new Error("Ugyldig bildebane.");
  }

  try {
    const buffer = await fs.readFile(normalizedPath);
    return {
      buffer,
      contentType: "image/png"
    };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}
