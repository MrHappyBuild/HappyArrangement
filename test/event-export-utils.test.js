import assert from "node:assert/strict";
import test from "node:test";

import { createEventExportPayload } from "../src/event-export-utils.js";

test("createEventExportPayload includes summary, payer names and line details for arrangement export", () => {
  const event = {
    id: "event-1",
    name: "Sommerfest",
    members: [
      { id: "member-1", name: "Ola" },
      { id: "member-2", name: "Kari" }
    ]
  };
  const jobs = [
    {
      id: "job-1",
      event_id: "event-1",
      status: "completed",
      original_filename: "middag.jpg",
      created_at: "2026-06-02T09:00:00.000Z",
      paid_by_member_id: "member-1",
      result: {
        merchantName: "Steak",
        receiptDate: "2026-06-01",
        receiptTime: "19:32",
        currency: "NOK",
        grandTotal: 200,
        totals: {
          itemsTotal: 200,
          difference: 0
        },
        lineItems: [{ name: "Burger", quantity: 2, unitPrice: 100, lineTotal: 200, rawLine: "2 Burger 200,00" }]
      },
      distribution_state: {
        participants: [
          { id: "member-1", name: "Ola" },
          { id: "member-2", name: "Kari" }
        ],
        activeParticipantId: "member-1",
        entries: [
          {
            id: "entry-0",
            assignments: [
              {
                id: "assignment-1",
                participantId: "member-1",
                type: "whole",
                label: "Burger",
                quantity: 1,
                amount: 100
              }
            ]
          }
        ]
      }
    },
    {
      id: "job-2",
      event_id: "event-2",
      status: "completed",
      result: {
        grandTotal: 999
      }
    }
  ];

  const payload = createEventExportPayload(event, jobs);

  assert.equal(payload.eventName, "Sommerfest");
  assert.equal(payload.summary.receiptCount, 1);
  assert.equal(payload.summary.totalSpent, 200);
  assert.equal(payload.receipts.length, 1);
  assert.equal(payload.receipts[0].paidByMemberName, "Ola");
  assert.equal(payload.receipts[0].distributedTotal, 100);
  assert.equal(payload.receipts[0].unassignedTotal, 100);
  assert.equal(payload.receipts[0].lineItems[0].rawLine, "2 Burger 200,00");
  assert.equal(payload.summary.members[0].receiptSummaries.length, 1);
  assert.equal(payload.summary.members[0].receiptSummaries[0].memberPaidTotal, 200);
  assert.equal(payload.summary.members[0].receiptSummaries[0].memberUsedTotal, 100);
  assert.equal(payload.summary.members[0].lineAssignments.length, 1);
  assert.equal(payload.summary.members[0].lineAssignments[0].itemName, "Burger");
  assert.equal(payload.summary.members[0].lineAssignments[0].amount, 100);
  assert.equal(payload.summary.members[1].receiptSummaries.length, 0);
});

test("createEventExportPayload handles receipts without saved distribution", () => {
  const event = {
    id: "event-1",
    name: "Tur",
    members: [{ id: "member-1", name: "Per" }]
  };
  const jobs = [
    {
      id: "job-1",
      event_id: "event-1",
      status: "completed",
      original_filename: "taxi",
      paid_by_member_id: null,
      result: {
        grandTotal: 150,
        items: [{ name: "Taxi", quantity: 1, unitPrice: 150, lineTotal: 150 }]
      },
      distribution_state: null
    }
  ];

  const payload = createEventExportPayload(event, jobs);

  assert.equal(payload.summary.unassignedTotal, 150);
  assert.equal(payload.summary.missingPayerCount, 1);
  assert.equal(payload.receipts[0].paidByMemberName, "");
  assert.equal(payload.receipts[0].lineItems[0].name, "Taxi");
  assert.equal(payload.summary.members[0].receiptSummaries.length, 0);
  assert.equal(payload.summary.members[0].lineAssignments.length, 0);
});
