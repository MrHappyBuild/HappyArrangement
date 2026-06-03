import test from "node:test";
import assert from "node:assert/strict";

import { buildRawDataRows } from "../src/raw-data-utils.js";

test("buildRawDataRows deduplicates raw lines and tags totals and quantities", () => {
  const rows = buildRawDataRows({
    result: {
      tableRows: ["2 Pommes frites (@92,00) 184,00", "Coca Cola Zero 2 45,00 90,00"],
      notes: ["SUM 299,00", "30.05.2026 20.28", "Steak"],
      lineItems: [
        { rawLine: "2 Pommes frites (@92,00) 184,00" },
        { rawLine: "2 Pommes frites (@92,00) 184,00" }
      ],
      items: []
    },
    draft: {
      lineItems: [{ rawLine: "1 Coca Cola (@92,00) 92,00" }]
    }
  });

  assert.equal(rows.length, 6);

  const totalRow = rows.find((row) => row.text === "SUM 299,00");
  assert.ok(totalRow.tags.includes("total"));
  assert.ok(totalRow.tags.includes("belop"));

  const itemRow = rows.find((row) => row.text === "2 Pommes frites (@92,00) 184,00");
  assert.ok(itemRow.tags.includes("antall"));
  assert.ok(itemRow.tags.includes("pris pr"));
  assert.ok(itemRow.tags.includes("varelinje"));
  assert.equal(itemRow.fields.quantity, 2);
  assert.equal(itemRow.fields.name, "Pommes frites");
  assert.equal(itemRow.fields.unitPrice, 92);
  assert.equal(itemRow.fields.lineTotal, 184);

  const dateRow = rows.find((row) => row.text === "30.05.2026 20.28");
  assert.ok(dateRow.tags.includes("dato"));
  assert.ok(dateRow.tags.includes("tid"));

  const separatedQuantityRow = rows.find((row) => row.text === "Coca Cola Zero 2 45,00 90,00");
  assert.equal(separatedQuantityRow.fields.quantity, 2);
  assert.equal(separatedQuantityRow.fields.unitPrice, 45);
  assert.equal(separatedQuantityRow.fields.lineTotal, 90);
  assert.ok(separatedQuantityRow.fieldCandidates.quantity.length >= 2);
});
