import * as fileStore from "./file-store.js";
import * as supabaseStore from "./supabase-store.js";
import { isSupabaseConfigured } from "./supabase.js";

function getStore() {
  return isSupabaseConfigured() ? supabaseStore : fileStore;
}

export function getLocalJob(...args) {
  return getStore().getLocalJob(...args);
}

export function listLocalJobs(...args) {
  return getStore().listLocalJobs(...args);
}

export function listEvents(...args) {
  return getStore().listEvents(...args);
}

export function getEvent(...args) {
  return getStore().getEvent(...args);
}

export function createEvent(...args) {
  return getStore().createEvent(...args);
}

export function addEventMember(...args) {
  return getStore().addEventMember(...args);
}

export function updateEvent(...args) {
  return getStore().updateEvent(...args);
}

export function createLocalJob(...args) {
  return getStore().createLocalJob(...args);
}

export function createManualLocalJob(...args) {
  return getStore().createManualLocalJob(...args);
}

export function updateLocalJob(...args) {
  return getStore().updateLocalJob(...args);
}

export function saveGuestPageMedia(...args) {
  return getStore().saveGuestPageMedia(...args);
}

export function readGuestPageMedia(...args) {
  return getStore().readGuestPageMedia(...args);
}

export function saveSubmissionReceiptMedia(...args) {
  return getStore().saveSubmissionReceiptMedia(...args);
}

export function readReceiptImage(...args) {
  return getStore().readReceiptImage(...args);
}

export function readSubmissionReceiptMedia(...args) {
  return getStore().readSubmissionReceiptMedia(...args);
}
