import assert from "node:assert/strict";
import test from "node:test";

import {
  buildVenuePdfExportData,
  buildVenuePdfFilename,
  buildVenueSeatingChartSvg,
  buildVenueSeatingListPdfLines,
  formatVenuePdfGuestInitials
} from "../src/venue-pdf-utils.js";

test("formatVenuePdfGuestInitials uses the first two name parts", () => {
  assert.equal(formatVenuePdfGuestInitials("Anna Berg Solheim"), "AB");
  assert.equal(formatVenuePdfGuestInitials(" Vetle "), "V");
});

test("buildVenuePdfExportData respects guest seating visibility settings", () => {
  const exportData = buildVenuePdfExportData({
    name: "Bryllup",
    venuePlan: {
      room: {
        name: "Hovedsal",
        widthMeters: 12,
        heightMeters: 8
      },
      guestSeatingPage: {
        visibleTypes: {
          round_table: true,
          long_table: false,
          chair: true,
          custom_zone: true,
          stage: false,
          dance_floor: true,
          buffet: true,
          bar: true,
          restroom: true,
          emergency_exit: true
        }
      },
      items: [
        {
          id: "round-1",
          type: "round_table",
          label: "Bord 1",
          widthMeters: 1.8,
          heightMeters: 1.8,
          seatCount: 2,
          seats: [
            { id: "seat-1", label: "Plass 1", guestId: "guest-1" },
            { id: "seat-2", label: "Plass 2", guestId: "" }
          ]
        },
        {
          id: "long-1",
          type: "long_table",
          label: "Langbord 1",
          widthMeters: 3,
          heightMeters: 1,
          seatCount: 2,
          seats: [
            { id: "seat-3", label: "Plass 1", guestId: "" },
            { id: "seat-4", label: "Plass 2", guestId: "" }
          ]
        }
      ]
    },
    people: [
      {
        id: "guest-1",
        name: "Anna Berg",
        rsvpStatus: "accepted"
      }
    ]
  });

  assert.equal(exportData.visibleItems.length, 1);
  assert.equal(exportData.visibleItems[0].label, "Bord 1");
  assert.equal(exportData.seatableItems.length, 1);
  assert.equal(exportData.seatableItems[0].assignedSeats.length, 1);
});

test("buildVenueSeatingChartSvg switches between initials and full names", () => {
  const exportData = buildVenuePdfExportData({
    name: "Bryllup",
    venuePlan: {
      room: {
        name: "Hovedsal",
        widthMeters: 12,
        heightMeters: 8
      },
      items: [
        {
          id: "round-1",
          type: "round_table",
          label: "Bord 1",
          widthMeters: 1.8,
          heightMeters: 1.8,
          seatCount: 1,
          seats: [{ id: "seat-1", label: "Plass 1", guestId: "guest-1" }]
        }
      ]
    },
    people: [
      {
        id: "guest-1",
        name: "Anna Berg",
        rsvpStatus: "accepted"
      }
    ]
  });

  const initialsSvg = buildVenueSeatingChartSvg(exportData, {
    nameDisplay: "initials",
    mapWidth: 1200
  }).svgMarkup;
  const fullNameSvg = buildVenueSeatingChartSvg(exportData, {
    nameDisplay: "full",
    mapWidth: 1200
  }).svgMarkup;

  assert.match(initialsSvg, />AB</);
  assert.doesNotMatch(initialsSvg, /Anna Berg/);
  assert.match(fullNameSvg, /Anna Berg/);
});

test("buildVenueSeatingListPdfLines includes seat labels when enabled", () => {
  const exportData = buildVenuePdfExportData({
    name: "Bryllup",
    venuePlan: {
      room: {
        name: "Hovedsal",
        widthMeters: 12,
        heightMeters: 8
      },
      guestSeatingPage: {
        showSeatLabels: true
      },
      items: [
        {
          id: "round-1",
          type: "round_table",
          label: "Bord 1",
          widthMeters: 1.8,
          heightMeters: 1.8,
          seatCount: 1,
          seats: [{ id: "seat-1", label: "Plass 1", guestId: "guest-1" }]
        }
      ]
    },
    people: [
      {
        id: "guest-1",
        name: "Anna Berg",
        rsvpStatus: "accepted"
      }
    ]
  });

  const lines = buildVenueSeatingListPdfLines(exportData, {
    nameDisplay: "full",
    includeSeatLabels: true
  });

  assert.ok(lines.includes("Plass 1: Anna Berg"));
  assert.equal(buildVenuePdfFilename({ name: "Anna og Vetle Bryllup 2026" }), "anna-og-vetle-bryllup-2026-sitteplan.pdf");
});
