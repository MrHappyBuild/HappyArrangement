import assert from "node:assert/strict";
import test from "node:test";

import {
  assignGuestToVenueSeat,
  buildVenuePlanningState,
  clearGuestFromVenueSeat,
  createVenueItem,
  findVenueSeatAssignment,
  normalizeVenuePlan,
  resetVenueSeatOffsetsInPlan,
  updateVenueSeatOffsetInPlan,
  updateVenueItemInPlan
} from "../src/venue-layout-utils.js";

test("normalizeVenuePlan creates sane defaults for room and seats", () => {
  const plan = normalizeVenuePlan({
    room: {
      widthMeters: 2,
      heightMeters: 100
    },
    items: [
      {
        id: "table-1",
        type: "round_table",
        seatCount: 4
      }
    ]
  });

  assert.equal(plan.room.name, "Hovedsal");
  assert.equal(plan.room.widthMeters, 4);
  assert.equal(plan.room.heightMeters, 100);
  assert.equal(plan.items[0].seatCount, 4);
  assert.equal(plan.items[0].seats.length, 4);
  assert.equal(plan.items[0].seats[0].label, "Plass 1");
});

test("custom zone keeps editable shape information", () => {
  const zone = createVenueItem("custom_zone", 0);
  const plan = normalizeVenuePlan({
    room: {
      name: "Festsal",
      widthMeters: 18,
      heightMeters: 10
    },
    items: [
      {
        ...zone,
        shape: "oval"
      }
    ]
  });

  assert.equal(plan.items[0].type, "custom_zone");
  assert.equal(plan.items[0].shape, "oval");
});

test("restroom is available as a non-seatable venue item", () => {
  const restroom = createVenueItem("restroom", 0);
  const plan = normalizeVenuePlan({
    room: {
      name: "Festsal",
      widthMeters: 18,
      heightMeters: 10
    },
    items: [restroom]
  });

  assert.equal(plan.items[0].type, "restroom");
  assert.equal(plan.items[0].label, "Toalett 1");
  assert.equal(plan.items[0].seatCount, 0);
  assert.equal(plan.items[0].shape, "rectangle");
});

test("assignGuestToVenueSeat moves the guest to only one seat", () => {
  const item = createVenueItem("round_table", 0);
  const plan = updateVenueItemInPlan(
    {
      room: { name: "Sal", widthMeters: 12, heightMeters: 8, notes: "" },
      items: [item]
    },
    item.id,
    { seatCount: 2 }
  );
  const firstSeatId = plan.items[0].seats[0].id;
  const secondSeatId = plan.items[0].seats[1].id;

  const assignedOnce = assignGuestToVenueSeat(plan, item.id, firstSeatId, "guest-1");
  const assignedTwice = assignGuestToVenueSeat(assignedOnce, item.id, secondSeatId, "guest-1");

  assert.equal(assignedTwice.items[0].seats[0].guestId, "");
  assert.equal(assignedTwice.items[0].seats[1].guestId, "guest-1");
  assert.deepEqual(findVenueSeatAssignment(assignedTwice, "guest-1"), {
    itemId: item.id,
    itemLabel: assignedTwice.items[0].label,
    seatId: secondSeatId,
    seatLabel: assignedTwice.items[0].seats[1].label
  });
});

test("buildVenuePlanningState highlights missing exits and dietary guests without seats", () => {
  const table = createVenueItem("round_table", 0);
  const basePlan = updateVenueItemInPlan(
    {
      room: { name: "Festlokale", widthMeters: 14, heightMeters: 9, notes: "" },
      items: [table]
    },
    table.id,
    { seatCount: 1 }
  );
  const seatId = basePlan.items[0].seats[0].id;
  const plan = assignGuestToVenueSeat(basePlan, table.id, seatId, "guest-1");
  const state = buildVenuePlanningState({
    venuePlan: plan,
    people: [
      {
        id: "guest-1",
        name: "Ola",
        rsvpStatus: "accepted",
        allergies: ""
      },
      {
        id: "guest-2",
        name: "Kari",
        rsvpStatus: "accepted",
        allergies: "Gluten"
      }
    ]
  });

  assert.equal(state.totalSeats, 1);
  assert.equal(state.assignedSeats, 1);
  assert.equal(state.unplacedGuests.length, 1);
  assert.equal(state.dietaryAssignments.length, 0);
  assert.match(state.warnings.join(" "), /nodutgang/i);
  assert.match(state.warnings.join(" "), /allergier eller kostbehov/i);
});

test("clearGuestFromVenueSeat removes assignments cleanly", () => {
  const chair = createVenueItem("chair", 0);
  const seatId = chair.seats[0].id;
  const assigned = assignGuestToVenueSeat(
    {
      room: { name: "Lounge", widthMeters: 8, heightMeters: 6, notes: "" },
      items: [chair]
    },
    chair.id,
    seatId,
    "guest-7"
  );

  const cleared = clearGuestFromVenueSeat(assigned, chair.id, seatId);

  assert.equal(cleared.items[0].seats[0].guestId, "");
  assert.equal(findVenueSeatAssignment(cleared, "guest-7"), null);
});

test("venue seat offsets can be adjusted and reset manually", () => {
  const table = createVenueItem("round_table", 0);
  const seatId = table.seats[0].id;
  const moved = updateVenueSeatOffsetInPlan(
    {
      room: { name: "Sal", widthMeters: 16, heightMeters: 10, notes: "" },
      items: [table]
    },
    table.id,
    seatId,
    12,
    -6
  );

  assert.equal(moved.items[0].seats[0].offsetX, 12);
  assert.equal(moved.items[0].seats[0].offsetY, -6);

  const reset = resetVenueSeatOffsetsInPlan(moved, table.id);
  assert.equal(reset.items[0].seats[0].offsetX, 0);
  assert.equal(reset.items[0].seats[0].offsetY, 0);
});

test("legacy full_round_table items are normalized into standard round tables", () => {
  const plan = normalizeVenuePlan({
    room: { name: "Sal", widthMeters: 16, heightMeters: 10, notes: "" },
    items: [
      {
        id: "legacy-table",
        type: "full_round_table",
        label: "Ovalt bord 1",
        seatCount: 8
      }
    ]
  });

  assert.equal(plan.items[0].type, "round_table");
  assert.equal(plan.items[0].label, "Rundt bord 1");
  assert.equal(plan.items[0].shape, "circle");
  assert.equal(plan.items[0].width, plan.items[0].height);
  assert.equal(plan.items[0].seatCount, 8);
});
