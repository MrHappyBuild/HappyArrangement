import crypto from "node:crypto";

import { ensureEventShape } from "../event-platform-utils.js";
import { getSupabaseAdmin, getSupabaseEnv } from "./supabase.js";

const EVENT_SELECT = [
  "id",
  "owner_user_id",
  "slug",
  "name",
  "title",
  "description",
  "location",
  "starts_at",
  "ends_at",
  "dress_code",
  "practical_info",
  "workspace_state",
  "created_at",
  "updated_at"
].join(",");

const RECEIPT_JOB_SELECT = [
  "id",
  "event_id",
  "status",
  "source_kind",
  "original_filename",
  "stored_image_path",
  "storage_bucket",
  "storage_object_path",
  "sanitized_content_type",
  "input_sha256",
  "merchant_name",
  "merchant_category",
  "receipt_date",
  "receipt_time",
  "currency",
  "subtotal",
  "tax_total",
  "grand_total",
  "notes",
  "result",
  "distribution_state",
  "error_message",
  "created_at",
  "updated_at",
  "completed_at",
  "paid_by_member_id"
].join(",");

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function sanitizeNotes(value) {
  return ensureArray(value).filter((note) => typeof note === "string" && note.trim());
}

function asNullableNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeObjectPath(value) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  const prefixedMatch = trimmed.match(/^supabase:\/\/[^/]+\/(.+)$/i);
  return prefixedMatch ? prefixedMatch[1] : trimmed;
}

function toEventRecord(event) {
  const nextEvent = ensureEventShape(event);
  const overview = nextEvent.overview || {};
  const { defaultOwnerUserId } = getSupabaseEnv();

  return {
    owner_user_id: cleanString(defaultOwnerUserId) || null,
    name: cleanString(nextEvent.name) || cleanString(overview.title) || "Arrangement",
    title: cleanString(overview.title) || cleanString(nextEvent.name) || "",
    description: cleanString(overview.description),
    location: cleanString(overview.location),
    starts_at: cleanString(overview.startsAt) || null,
    ends_at: cleanString(overview.endsAt) || null,
    dress_code: cleanString(overview.dressCode),
    practical_info: cleanString(overview.practicalInfo),
    workspace_state: nextEvent
  };
}

function fromEventRecord(record) {
  const workspaceState =
    record?.workspace_state && typeof record.workspace_state === "object" ? record.workspace_state : {};
  const nextEvent = ensureEventShape({
    ...workspaceState,
    id: record.id,
    name: cleanString(record.name) || cleanString(workspaceState.name) || "Arrangement",
    created_at: record.created_at || workspaceState.created_at,
    updated_at: record.updated_at || workspaceState.updated_at,
    overview: {
      ...(workspaceState.overview && typeof workspaceState.overview === "object"
        ? workspaceState.overview
        : {}),
      title:
        cleanString(record.title) ||
        cleanString(workspaceState?.overview?.title) ||
        cleanString(record.name),
      description: cleanString(record.description) || cleanString(workspaceState?.overview?.description),
      location: cleanString(record.location) || cleanString(workspaceState?.overview?.location),
      startsAt: cleanString(record.starts_at) || cleanString(workspaceState?.overview?.startsAt),
      endsAt: cleanString(record.ends_at) || cleanString(workspaceState?.overview?.endsAt),
      dressCode: cleanString(record.dress_code) || cleanString(workspaceState?.overview?.dressCode),
      practicalInfo:
        cleanString(record.practical_info) || cleanString(workspaceState?.overview?.practicalInfo)
    }
  });

  return nextEvent;
}

function toReceiptSummary(result) {
  return {
    merchant_name: cleanString(result?.merchantName) || null,
    merchant_category: cleanString(result?.merchantCategory) || "unknown",
    receipt_date: cleanString(result?.receiptDate) || null,
    receipt_time: cleanString(result?.receiptTime) || null,
    currency: cleanString(result?.currency) || "NOK",
    subtotal: asNullableNumber(result?.subtotal),
    tax_total: asNullableNumber(result?.taxTotal),
    grand_total: asNullableNumber(result?.grandTotal),
    notes: sanitizeNotes(result?.notes)
  };
}

function fromReceiptJobRecord(record) {
  return {
    id: record.id,
    status: record.status,
    source_kind: record.source_kind,
    original_filename: record.original_filename,
    stored_image_path:
      cleanString(record.storage_object_path) || cleanString(record.stored_image_path) || null,
    storage_bucket: cleanString(record.storage_bucket) || null,
    storage_object_path: cleanString(record.storage_object_path) || null,
    sanitized_content_type: record.sanitized_content_type,
    input_sha256: record.input_sha256,
    event_id: record.event_id,
    created_at: record.created_at,
    updated_at: record.updated_at,
    completed_at: record.completed_at,
    error_message: record.error_message,
    result: record.result ?? null,
    paid_by_member_id: record.paid_by_member_id ?? null,
    distribution_state: record.distribution_state ?? null
  };
}

async function uploadBinary(objectPath, buffer, contentType) {
  const client = getSupabaseAdmin();
  const { mediaBucket } = getSupabaseEnv();
  const normalizedPath = normalizeObjectPath(objectPath);

  const { error } = await client.storage
    .from(mediaBucket)
    .upload(normalizedPath, buffer, {
      contentType,
      cacheControl: "3600",
      upsert: true
    });

  if (error) {
    throw new Error(`Kunne ikke laste opp fil til Supabase Storage: ${error.message}`);
  }

  return {
    bucket: mediaBucket,
    objectPath: normalizedPath
  };
}

async function downloadBinary(objectPath) {
  const client = getSupabaseAdmin();
  const { mediaBucket } = getSupabaseEnv();
  const normalizedPath = normalizeObjectPath(objectPath);

  if (!normalizedPath) {
    return null;
  }

  const { data, error } = await client.storage.from(mediaBucket).download(normalizedPath);

  if (error) {
    const message = String(error.message || "").toLowerCase();

    if (message.includes("not found") || message.includes("does not exist")) {
      return null;
    }

    throw new Error(`Kunne ikke hente fil fra Supabase Storage: ${error.message}`);
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  return {
    buffer
  };
}

export async function getLocalJob(jobId) {
  const client = getSupabaseAdmin();
  const { data, error } = await client
    .from("receipt_jobs")
    .select(RECEIPT_JOB_SELECT)
    .eq("id", jobId)
    .maybeSingle();

  if (error) {
    throw new Error(`Kunne ikke hente kvitteringsjobben: ${error.message}`);
  }

  return data ? fromReceiptJobRecord(data) : null;
}

export async function listLocalJobs(limit = 50) {
  const client = getSupabaseAdmin();
  const { data, error } = await client
    .from("receipt_jobs")
    .select(RECEIPT_JOB_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Kunne ikke hente kvitteringsjobber: ${error.message}`);
  }

  return ensureArray(data).map(fromReceiptJobRecord);
}

export async function listEvents() {
  const client = getSupabaseAdmin();
  const { data, error } = await client
    .from("events")
    .select(EVENT_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Kunne ikke hente arrangementer: ${error.message}`);
  }

  return ensureArray(data).map(fromEventRecord);
}

export async function getEvent(eventId) {
  const client = getSupabaseAdmin();
  const { data, error } = await client
    .from("events")
    .select(EVENT_SELECT)
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    throw new Error(`Kunne ikke hente arrangementet: ${error.message}`);
  }

  return data ? fromEventRecord(data) : null;
}

export async function createEvent({ name }) {
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

  const client = getSupabaseAdmin();
  const { data, error } = await client
    .from("events")
    .insert({
      id: event.id,
      ...toEventRecord(event)
    })
    .select(EVENT_SELECT)
    .single();

  if (error) {
    throw new Error(`Kunne ikke opprette arrangementet i Supabase: ${error.message}`);
  }

  return fromEventRecord(data);
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
  const current = await getEvent(eventId);

  if (!current) {
    throw new Error("Fant ikke arrangementet.");
  }

  const updated = updater(current);
  const next = ensureEventShape({
    ...current,
    ...(updated && typeof updated === "object" ? updated : {}),
    updated_at: new Date().toISOString()
  });

  const client = getSupabaseAdmin();
  const { data, error } = await client
    .from("events")
    .update(toEventRecord(next))
    .eq("id", eventId)
    .select(EVENT_SELECT)
    .single();

  if (error) {
    throw new Error(`Kunne ikke oppdatere arrangementet: ${error.message}`);
  }

  return fromEventRecord(data);
}

export async function createLocalJob({ fileName, sanitized, eventId = null }) {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const storage = await uploadBinary(
    `receipts/${id}/input.${sanitized.extension || "bin"}`,
    sanitized.buffer,
    sanitized.contentType || "application/octet-stream"
  );
  const client = getSupabaseAdmin();

  const { data, error } = await client
    .from("receipt_jobs")
    .insert({
      id,
      status: "processing",
      source_kind: "image_upload",
      original_filename: fileName,
      stored_image_path: storage.objectPath,
      storage_bucket: storage.bucket,
      storage_object_path: storage.objectPath,
      sanitized_content_type: sanitized.contentType,
      input_sha256: sanitized.sha256,
      event_id: eventId,
      created_at: createdAt,
      updated_at: createdAt,
      paid_by_member_id: null,
      distribution_state: null
    })
    .select(RECEIPT_JOB_SELECT)
    .single();

  if (error) {
    throw new Error(`Kunne ikke opprette kvitteringsjobb: ${error.message}`);
  }

  return fromReceiptJobRecord(data);
}

export async function createManualLocalJob({
  fileName,
  eventId = null,
  result,
  paidByMemberId = null
}) {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const client = getSupabaseAdmin();

  const { data, error } = await client
    .from("receipt_jobs")
    .insert({
      id,
      status: "completed",
      source_kind: "manual_invoice",
      original_filename: fileName || "Manuell faktura",
      event_id: eventId,
      created_at: createdAt,
      updated_at: createdAt,
      completed_at: createdAt,
      error_message: null,
      result,
      paid_by_member_id: paidByMemberId,
      distribution_state: null,
      ...toReceiptSummary(result)
    })
    .select(RECEIPT_JOB_SELECT)
    .single();

  if (error) {
    throw new Error(`Kunne ikke opprette manuell faktura: ${error.message}`);
  }

  return fromReceiptJobRecord(data);
}

export async function updateLocalJob(jobId, updater) {
  const current = await getLocalJob(jobId);

  if (!current) {
    throw new Error("Fant ikke lokal jobb.");
  }

  const next = {
    ...current,
    ...(updater(current) || {}),
    updated_at: new Date().toISOString()
  };
  const client = getSupabaseAdmin();
  const { data, error } = await client
    .from("receipt_jobs")
    .update({
      status: next.status,
      original_filename: next.original_filename,
      event_id: next.event_id,
      stored_image_path: next.stored_image_path,
      storage_bucket: next.storage_bucket,
      storage_object_path: next.storage_object_path,
      sanitized_content_type: next.sanitized_content_type,
      input_sha256: next.input_sha256,
      completed_at: next.completed_at,
      error_message: next.error_message,
      result: next.result,
      paid_by_member_id: next.paid_by_member_id,
      distribution_state: next.distribution_state,
      updated_at: next.updated_at,
      ...toReceiptSummary(next.result)
    })
    .eq("id", jobId)
    .select(RECEIPT_JOB_SELECT)
    .single();

  if (error) {
    throw new Error(`Kunne ikke oppdatere kvitteringsjobb: ${error.message}`);
  }

  return fromReceiptJobRecord(data);
}

export async function saveGuestPageMedia({ eventId, sanitized }) {
  const mediaId = crypto.randomUUID();
  const storage = await uploadBinary(
    `guest-media/${eventId}/${mediaId}.png`,
    sanitized.buffer,
    sanitized.contentType || "image/png"
  );

  return {
    mediaId,
    absolutePath: storage.objectPath,
    contentType: sanitized.contentType || "image/png"
  };
}

export async function readGuestPageMedia(eventId, mediaId) {
  const file = await downloadBinary(`guest-media/${eventId}/${mediaId}.png`);

  if (!file) {
    return null;
  }

  return {
    buffer: file.buffer,
    contentType: "image/png"
  };
}

export async function saveSubmissionReceiptMedia({ eventId, submissionId, sanitized }) {
  const storage = await uploadBinary(
    `submission-media/${eventId}/${submissionId}.png`,
    sanitized.buffer,
    sanitized.contentType || "image/png"
  );

  return {
    absolutePath: storage.objectPath,
    contentType: sanitized.contentType || "image/png"
  };
}

export async function readReceiptImage(jobId) {
  const job = await getLocalJob(jobId);

  if (!job?.stored_image_path) {
    return null;
  }

  const file = await downloadBinary(job.storage_object_path || job.stored_image_path);

  if (!file) {
    return null;
  }

  return {
    buffer: file.buffer,
    contentType: job.sanitized_content_type || "image/jpeg"
  };
}

export async function readSubmissionReceiptMedia(eventId, submissionId, storedImagePath = "") {
  const objectPath =
    normalizeObjectPath(storedImagePath) || `submission-media/${eventId}/${submissionId}.png`;
  const file = await downloadBinary(objectPath);

  if (!file) {
    return null;
  }

  return {
    buffer: file.buffer,
    contentType: "image/png"
  };
}
