import test from "node:test";
import assert from "node:assert/strict";

import {
  addParticipant,
  assignWholeItem,
  createDistributionState,
  normalizeDistributionState,
  removeAssignment,
  setActiveParticipant,
  splitAllEntriesEqually,
  splitEntryEqually,
  splitEntryByPercent,
  summarizeDistribution
} from "../src/distribution-utils.js";

const receipt = {
  items: [
    {
      name: "Pommes frites",
      quantity: 2,
      unitPrice: 50,
      lineTotal: 100
    },
    {
      name: "Cola",
      quantity: 1,
      unitPrice: 39,
      lineTotal: 39
    }
  ]
};

test("assignWholeItem moves quantity from remaining list to cart", () => {
  const state = createDistributionState(receipt);
  const next = assignWholeItem(state, {
    entryId: "entry-0",
    participantId: "participant-meg",
    quantity: 1
  });
  const summary = summarizeDistribution(next);

  assert.equal(summary.remainingEntries[0].remainingQuantity, 1);
  assert.equal(summary.remainingEntries[0].remainingTotal, 50);
  assert.equal(summary.participants[0].total, 50);
});

test("splitEntryByPercent distributes a shared item by percentages", () => {
  const withFriend = addParticipant(createDistributionState(receipt), "Per");
  const next = splitEntryByPercent(withFriend, {
    entryId: "entry-0",
    shares: [
      { participantId: "participant-meg", percent: 50 },
      { participantId: withFriend.activeParticipantId, percent: 50 }
    ]
  });
  const summary = summarizeDistribution(next);

  assert.equal(summary.remainingEntries[0].remainingTotal, 39);
  assert.equal(summary.participants[0].total, 50);
  assert.equal(summary.participants[1].total, 50);
});

test("removeAssignment puts item amount back into remaining pool", () => {
  const state = assignWholeItem(createDistributionState(receipt), {
    entryId: "entry-1",
    participantId: "participant-meg",
    quantity: 1
  });
  const assignmentId = state.entries[1].assignments[0].id;
  const restored = removeAssignment(state, {
    entryId: "entry-1",
    assignmentId
  });
  const summary = summarizeDistribution(restored);

  assert.equal(summary.remainingEntries[1].remainingTotal, 39);
  assert.equal(summary.participants[0].total, 0);
});

test("setActiveParticipant swaps active shopper", () => {
  const withFriend = addParticipant(createDistributionState(receipt), "Kari");
  const next = setActiveParticipant(withFriend, "participant-meg");

  assert.equal(next.activeParticipantId, "participant-meg");
});

test("splitEntryEqually divides one line across selected participants", () => {
  const withFriends = addParticipant(addParticipant(createDistributionState(receipt), "Per"), "Kari");
  const participantIds = withFriends.participants.map((participant) => participant.id);
  const next = splitEntryEqually(withFriends, {
    entryId: "entry-1",
    participantIds
  });
  const summary = summarizeDistribution(next);

  assert.equal(summary.remainingEntries[1], undefined);
  assert.equal(summary.participants[0].total, 13);
  assert.equal(summary.participants[1].total, 13);
  assert.equal(summary.participants[2].total, 13);
});

test("splitAllEntriesEqually distributes all remaining entries across selected participants", () => {
  const withFriend = addParticipant(createDistributionState(receipt), "Per");
  const participantIds = withFriend.participants.map((participant) => participant.id);
  const next = splitAllEntriesEqually(withFriend, { participantIds });
  const summary = summarizeDistribution(next);

  assert.equal(summary.remainingTotal, 0);
  assert.equal(summary.participants[0].total, 69.5);
  assert.equal(summary.participants[1].total, 69.5);
});

test("normalizeDistributionState keeps saved assignments and event members", () => {
  const normalized = normalizeDistributionState(
    {
      participants: [{ id: "participant-meg", name: "Meg" }],
      activeParticipantId: "participant-meg",
      entries: [
        {
          id: "entry-0",
          assignments: [
            {
              id: "assignment-1",
              participantId: "participant-meg",
              type: "whole",
              label: "Pommes frites",
              quantity: 1,
              amount: 50
            }
          ]
        }
      ]
    },
    receipt,
    [{ id: "member-2", name: "Per" }]
  );

  assert.equal(normalized.participants.length, 2);
  assert.equal(normalized.entries[0].remainingTotal, 50);
  assert.equal(normalized.entries[0].assignments[0].amount, 50);
});
