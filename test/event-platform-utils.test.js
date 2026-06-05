import assert from "node:assert/strict";
import test from "node:test";

import {
  buildEventFinanceSummary,
  buildSettlementSuggestions,
  ensureEventShape
} from "../src/event-platform-utils.js";

test("ensureEventShape upgrades legacy finance members into shared people structure", () => {
  const event = ensureEventShape({
    id: "event-1",
    name: "Helgetur",
    members: [{ id: "member-1", name: "Ola", created_at: "2026-06-01T10:00:00.000Z" }]
  });

  assert.equal(event.people.length, 1);
  assert.equal(event.people[0].name, "Ola");
  assert.equal(event.people[0].financeRole, "member");
  assert.equal(event.members.length, 1);
  assert.equal(event.members[0].id, "member-1");
  assert.equal(event.platformVersion, 2);
});

test("buildEventFinanceSummary includes advances and settlement transfers in member balances", () => {
  const event = ensureEventShape({
    id: "event-1",
    name: "Middag",
    members: [
      { id: "member-1", name: "Ola", created_at: "2026-06-01T10:00:00.000Z" },
      { id: "member-2", name: "Kari", created_at: "2026-06-01T10:05:00.000Z" }
    ],
    ledgerEntries: [
      {
        id: "ledger-1",
        type: "advance_contribution",
        memberId: "member-1",
        amount: 100,
        status: "approved",
        created_at: "2026-06-01T11:00:00.000Z"
      },
      {
        id: "ledger-2",
        type: "settlement_transfer",
        memberId: "member-2",
        counterpartyMemberId: "member-1",
        amount: 50,
        status: "approved",
        created_at: "2026-06-01T12:00:00.000Z"
      }
    ]
  });
  const jobs = [
    {
      id: "job-1",
      event_id: "event-1",
      status: "completed",
      paid_by_member_id: "member-1",
      result: {
        grandTotal: 200,
        items: [
          { name: "Burger", quantity: 2, unitPrice: 100, lineTotal: 200 }
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
                amount: 100
              },
              {
                id: "assignment-2",
                participantId: "member-2",
                type: "whole",
                label: "Burger",
                quantity: 1,
                amount: 100
              }
            ]
          }
        ]
      }
    }
  ];

  const summary = buildEventFinanceSummary(event, jobs);
  const ola = summary.members.find((member) => member.id === "member-1");
  const kari = summary.members.find((member) => member.id === "member-2");

  assert.equal(summary.totalAdvances, 100);
  assert.equal(summary.totalSettlementTransfers, 50);
  assert.equal(summary.totalContributed, 300);
  assert.equal(ola.receiptPaidTotal, 200);
  assert.equal(ola.advanceTotal, 100);
  assert.equal(ola.totalContributed, 300);
  assert.equal(ola.paidTotal, 300);
  assert.equal(ola.balanceBeforeSettlements, 200);
  assert.equal(ola.receivedSettlementTotal, 50);
  assert.equal(ola.remainingBalance, 150);
  assert.equal(kari.usedTotal, 100);
  assert.equal(kari.sentSettlementTotal, 50);
  assert.equal(kari.remainingBalance, -50);
});

test("buildSettlementSuggestions proposes who should pay whom based on remaining balances", () => {
  const plan = buildSettlementSuggestions({
    members: [
      { id: "a", name: "Person A", remainingBalance: 1500 },
      { id: "b", name: "Person B", remainingBalance: 500 },
      { id: "c", name: "Person C", remainingBalance: -1000 },
      { id: "d", name: "Person D", remainingBalance: -1000 }
    ]
  });

  assert.equal(plan.alreadyBalanced, false);
  assert.equal(plan.suggestions.length, 3);
  assert.deepEqual(
    plan.suggestions.map((entry) => ({
      from: entry.fromName,
      to: entry.toName,
      amount: entry.amount
    })),
    [
      { from: "Person C", to: "Person A", amount: 1000 },
      { from: "Person D", to: "Person A", amount: 500 },
      { from: "Person D", to: "Person B", amount: 500 }
    ]
  );
});
