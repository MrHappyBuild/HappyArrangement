import test from "node:test";
import assert from "node:assert/strict";

import { buildEventSettlement } from "../src/event-settlement-utils.js";

test("buildEventSettlement compares paid totals against used totals per member", () => {
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
      paid_by_member_id: "member-1",
      result: {
        grandTotal: 200,
        items: [
          { name: "Burger", quantity: 2, unitPrice: 50, lineTotal: 100 },
          { name: "Fries", quantity: 2, unitPrice: 50, lineTotal: 100 }
        ]
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
                amount: 50
              },
              {
                id: "assignment-2",
                participantId: "member-2",
                type: "whole",
                label: "Burger",
                quantity: 1,
                amount: 50
              }
            ]
          },
          {
            id: "entry-1",
            assignments: [
              {
                id: "assignment-3",
                participantId: "member-2",
                type: "whole",
                label: "Fries",
                quantity: 2,
                amount: 100
              }
            ]
          }
        ]
      }
    }
  ];

  const summary = buildEventSettlement(event, jobs);

  assert.equal(summary.receiptCount, 1);
  assert.equal(summary.totalSpent, 200);
  assert.equal(summary.totalPaid, 200);
  assert.equal(summary.totalUsed, 200);
  assert.equal(summary.unassignedTotal, 0);
  assert.equal(summary.members[0].paidTotal, 200);
  assert.equal(summary.members[0].usedTotal, 50);
  assert.equal(summary.members[0].balance, 150);
  assert.equal(summary.members[1].paidTotal, 0);
  assert.equal(summary.members[1].usedTotal, 150);
  assert.equal(summary.members[1].balance, -150);
});

test("buildEventSettlement reports unassigned totals and missing payers", () => {
  const event = {
    id: "event-1",
    name: "Sommerfest",
    members: [{ id: "member-1", name: "Ola" }]
  };
  const jobs = [
    {
      id: "job-1",
      event_id: "event-1",
      status: "completed",
      paid_by_member_id: null,
      result: {
        grandTotal: 125,
        items: [{ name: "Pizza", quantity: 1, unitPrice: 100, lineTotal: 100 }]
      },
      distribution_state: null
    }
  ];

  const summary = buildEventSettlement(event, jobs);

  assert.equal(summary.totalSpent, 125);
  assert.equal(summary.totalPaid, 0);
  assert.equal(summary.totalUsed, 0);
  assert.equal(summary.unassignedTotal, 125);
  assert.equal(summary.missingPayerCount, 1);
});
