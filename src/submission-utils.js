import { createEmptyLineItem, rebuildReceiptFromEditor } from "./receipt-utils.js";

const PROMOTABLE_SUBMISSION_TYPES = new Set(["receipt_upload", "manual_invoice"]);
const PROMOTION_TRIGGER_STATUSES = new Set(["approved", "processing_ai", "processed"]);

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function shouldPromoteSubmission(submission, nextStatus) {
  const submissionType = cleanString(submission?.type);
  const requestedStatus = cleanString(nextStatus);

  if (!PROMOTABLE_SUBMISSION_TYPES.has(submissionType)) {
    return false;
  }

  if (!PROMOTION_TRIGGER_STATUSES.has(requestedStatus)) {
    return false;
  }

  return !cleanString(submission?.promotedJobId);
}

export function deriveSubmissionStatusFromReceiptJob(jobStatus) {
  if (jobStatus === "completed") {
    return "processed";
  }

  if (jobStatus === "failed") {
    return "needs_changes";
  }

  return "processing_ai";
}

export function buildManualInvoiceResultFromSubmission(submission) {
  return rebuildReceiptFromEditor({
    merchantName: cleanString(submission?.title) || "Manuell faktura",
    merchantCategory: "unknown",
    receiptDate: "",
    receiptTime: "",
    currency: "NOK",
    subtotal: null,
    taxTotal: null,
    grandTotal: null,
    notes: cleanString(submission?.note) ? [cleanString(submission.note)] : [],
    tableRows: [],
    lineItems: [createEmptyLineItem()]
  });
}
