import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateLineTotalFromUnitPrice,
  calculateUnitPriceFromLineTotal,
  insertAmountsOnlyRow,
  insertFullRow,
  insertNameOnlyRow
} from "../src/editor-utils.js";

const sampleRows = [
  { name: "Burger", quantity: 1, unitPrice: 100, lineTotal: 100, rawLine: "Burger" },
  { name: "Fries", quantity: 1, unitPrice: 40, lineTotal: 40, rawLine: "Fries" },
  { name: "Cola", quantity: 2, unitPrice: 25, lineTotal: 50, rawLine: "Cola" }
];

test("insertFullRow adds a blank full row", () => {
  const rows = insertFullRow(sampleRows, 1);

  assert.equal(rows.length, 4);
  assert.deepEqual(rows[1], {
    name: "",
    quantity: 1,
    unitPrice: 0,
    lineTotal: 0,
    rawLine: ""
  });
  assert.equal(rows[2].name, "Fries");
  assert.equal(rows[2].unitPrice, 40);
});

test("insertNameOnlyRow keeps prices in place and shifts names", () => {
  const rows = insertNameOnlyRow(sampleRows, 1);

  assert.equal(rows.length, 4);
  assert.equal(rows[1].name, "");
  assert.equal(rows[1].unitPrice, 40);
  assert.equal(rows[2].name, "Fries");
  assert.equal(rows[2].unitPrice, 25);
  assert.equal(rows[2].lineTotal, 50);
  assert.equal(rows[3].name, "Cola");
  assert.equal(rows[3].unitPrice, 0);
});

test("insertAmountsOnlyRow keeps names in place and shifts prices", () => {
  const rows = insertAmountsOnlyRow(sampleRows, 1);

  assert.equal(rows.length, 4);
  assert.equal(rows[1].name, "Fries");
  assert.equal(rows[1].unitPrice, 0);
  assert.equal(rows[2].name, "Cola");
  assert.equal(rows[2].unitPrice, 40);
  assert.equal(rows[3].name, "");
  assert.equal(rows[3].unitPrice, 25);
  assert.equal(rows[3].lineTotal, 50);
});

test("calculateUnitPriceFromLineTotal derives price per item", () => {
  const row = calculateUnitPriceFromLineTotal({
    name: "Pommes frites",
    quantity: "4",
    unitPrice: "",
    lineTotal: "100"
  });

  assert.equal(row.unitPrice, 25);
  assert.equal(row.lineTotal, "100");
});

test("calculateLineTotalFromUnitPrice derives total", () => {
  const row = calculateLineTotalFromUnitPrice({
    name: "Cola",
    quantity: "3",
    unitPrice: "39,50",
    lineTotal: ""
  });

  assert.equal(row.unitPrice, "39,50");
  assert.equal(row.lineTotal, 118.5);
});
