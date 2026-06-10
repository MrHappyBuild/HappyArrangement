import assert from "node:assert/strict";
import test from "node:test";

import {
  buildManualInvoiceResultFromSubmission,
  deriveSubmissionStatusFromReceiptJob,
  shouldPromoteSubmission
} from "../src/submission-utils.js";

test("shouldPromoteSubmission only promotes approved receipt and manual submissions once", () => {
  assert.equal(
    shouldPromoteSubmission(
      {
        id: "submission-1",
        type: "receipt_upload",
        promotedJobId: ""
      },
      "approved"
    ),
    true
  );

  assert.equal(
    shouldPromoteSubmission(
      {
        id: "submission-2",
        type: "manual_invoice",
        promotedJobId: "job-1"
      },
      "approved"
    ),
    false
  );

  assert.equal(
    shouldPromoteSubmission(
      {
        id: "submission-3",
        type: "advance_contribution",
        promotedJobId: ""
      },
      "approved"
    ),
    false
  );

  assert.equal(
    shouldPromoteSubmission(
      {
        id: "submission-4",
        type: "receipt_upload",
        promotedJobId: ""
      },
      "rejected"
    ),
    false
  );
});

test("deriveSubmissionStatusFromReceiptJob follows the finance pipeline states", () => {
  assert.equal(deriveSubmissionStatusFromReceiptJob("queued"), "processing_ai");
  assert.equal(deriveSubmissionStatusFromReceiptJob("processing"), "processing_ai");
  assert.equal(deriveSubmissionStatusFromReceiptJob("completed"), "processed");
  assert.equal(deriveSubmissionStatusFromReceiptJob("failed"), "needs_changes");
});

test("buildManualInvoiceResultFromSubmission creates an editable finance draft", () => {
  const result = buildManualInvoiceResultFromSubmission({
    title: "Utlegg for hytte",
    note: "Manglet pa kortet til Ole."
  });

  assert.equal(result.merchantName, "Utlegg for hytte");
  assert.equal(result.currency, "NOK");
  assert.deepEqual(result.notes, ["Manglet pa kortet til Ole."]);
  assert.equal(result.lineItems.length, 1);
  assert.equal(result.lineItems[0].name, "Vare 1");
  assert.equal(result.lineItems[0].quantity, 1);
});
