import assert from "node:assert/strict";
import test from "node:test";

import {
  buildProjectTaskExportTable,
  buildProjectTaskImportTemplateTable,
  matchImportedProjectTask,
  parseProjectTaskImportRows
} from "../src/project-task-utils.js";

test("buildProjectTaskImportTemplateTable exposes key import columns", () => {
  const [headerRow] = buildProjectTaskImportTemplateTable();

  assert.deepEqual(headerRow.slice(0, 6), [
    "Aktivitetskode",
    "Tittel",
    "Beskrivelse",
    "Status",
    "Kategori",
    "Ansvarlige"
  ]);
  assert.equal(headerRow.includes("Tilgjengelig buffer (min)"), true);
  assert.equal(headerRow.includes("Navn pa bufferpunkt"), true);
});

test("buildProjectTaskExportTable includes parent and dependency references", () => {
  const rows = buildProjectTaskExportTable(
    [
      {
        id: "a",
        referenceCode: "VELKOMST",
        title: "Velkomstdrinker",
        status: "todo",
        assigneeIds: ["p1"],
        category: "mingling",
        useCategoryBufferDefaults: true,
        bufferConfig: {
          availableMinutes: 15,
          availablePlacement: "end",
          transitionMinutes: 0,
          label: "Buffer"
        },
        durationMinutes: 0,
        desiredStartAt: "2026-07-20T16:00",
        dependencyIds: [],
        parentTaskId: ""
      },
      {
        id: "b",
        referenceCode: "LEKER",
        title: "Introdusere leker",
        status: "in_progress",
        assigneeIds: ["p2"],
        category: "entertainment",
        useCategoryBufferDefaults: false,
        bufferConfig: {
          availableMinutes: 5,
          availablePlacement: "distributed",
          transitionMinutes: 2,
          label: "Pause"
        },
        durationMinutes: 15,
        desiredStartAt: "",
        dependencyIds: ["a"],
        parentTaskId: "a"
      }
    ],
    [
      { id: "p1", name: "Ida" },
      { id: "p2", name: "Aki" }
    ]
  );

  const headerRow = rows[0];
  const parentReferenceIndex = headerRow.indexOf("Overkode");
  const dependencyIndex = headerRow.indexOf("Avhenger av");
  const categoryIndex = headerRow.indexOf("Kategori");
  const bufferLabelIndex = headerRow.indexOf("Navn pa bufferpunkt");

  assert.equal(rows[1][0], "VELKOMST");
  assert.equal(rows[2][0], "LEKER");
  assert.equal(rows[1][categoryIndex], "Mingling");
  assert.equal(rows[2][categoryIndex], "Underholdning");
  assert.equal(rows[2][bufferLabelIndex], "Pause");
  assert.equal(rows[2][parentReferenceIndex], "VELKOMST");
  assert.equal(rows[2][dependencyIndex], "VELKOMST");
});

test("parseProjectTaskImportRows resolves assignees and references", () => {
  const parsed = parseProjectTaskImportRows(
    [
      [
        "Aktivitetskode",
        "Tittel",
        "Kategori",
        "Ansvarlige",
        "Varighet (min)",
        "Fast tidspunkt",
        "Vises pa agenda",
        "Bruk kategoriens bufferstandard",
        "Tilgjengelig buffer (min)",
        "Bufferplassering",
        "Fast mellomrom (min)",
        "Navn pa bufferpunkt",
        "Overkode",
        "Avhenger av"
      ],
      ["VELKOMST", "Velkomstdrinker", "Mingling", "Ida; aki@example.no", "0", "Ja", "Ja", "Ja", "15", "Legg pa slutten", "0", "Buffer", "", ""],
      ["LEKER", "Introdusere leker", "Underholdning", "Ida", "15", "Nei", "Ja", "Nei", "5", "Fordel mellom underoppgavene", "2", "Pause", "VELKOMST", "VELKOMST"]
    ],
    [
      { id: "p1", name: "Ida", email: "ida@example.no" },
      { id: "p2", name: "Aki", email: "aki@example.no" }
    ],
    [{ id: "existing-1", referenceCode: "VELKOMST", title: "Velkomstdrinker" }]
  );

  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.rows[0].durationMinutes, 0);
  assert.equal(parsed.rows[0].isFixedTime, true);
  assert.equal(parsed.rows[0].category, "mingling");
  assert.deepEqual(parsed.rows[0].assigneeIds.sort(), ["p1", "p2"]);
  assert.equal(parsed.rows[1].useCategoryBufferDefaults, false);
  assert.equal(parsed.rows[1].bufferConfig.availablePlacement, "distributed");
  assert.equal(parsed.rows[1].bufferConfig.transitionMinutes, 2);
  assert.equal(parsed.rows[1].bufferConfig.label, "Pause");
  assert.equal(parsed.rows[1].parentReference, "VELKOMST");
  assert.deepEqual(parsed.rows[1].dependencyReferences, ["VELKOMST"]);
  assert.equal(parsed.matchedExistingCount, 1);
});

test("matchImportedProjectTask matches by reference code before title", () => {
  const match = matchImportedProjectTask(
    [
      { id: "a", referenceCode: "VELKOMST", title: "Velkomstdrinker" },
      { id: "b", title: "Tale" }
    ],
    { referenceCode: "VELKOMST", title: "Noe annet" }
  );

  assert.equal(match?.id, "a");
});
