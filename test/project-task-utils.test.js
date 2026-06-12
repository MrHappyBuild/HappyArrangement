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

  assert.deepEqual(headerRow.slice(0, 5), [
    "Aktivitetskode",
    "Tittel",
    "Beskrivelse",
    "Status",
    "Ansvarlige"
  ]);
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

  assert.equal(rows[1][0], "VELKOMST");
  assert.equal(rows[2][0], "LEKER");
  assert.equal(rows[2][12], "VELKOMST");
  assert.equal(rows[2][13], "VELKOMST");
});

test("parseProjectTaskImportRows resolves assignees and references", () => {
  const parsed = parseProjectTaskImportRows(
    [
      [
        "Aktivitetskode",
        "Tittel",
        "Ansvarlige",
        "Varighet (min)",
        "Fast tidspunkt",
        "Vises pa agenda",
        "Overkode",
        "Avhenger av"
      ],
      ["VELKOMST", "Velkomstdrinker", "Ida; aki@example.no", "0", "Ja", "Ja", "", ""],
      ["LEKER", "Introdusere leker", "Ida", "15", "Nei", "Ja", "VELKOMST", "VELKOMST"]
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
  assert.deepEqual(parsed.rows[0].assigneeIds.sort(), ["p1", "p2"]);
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
