import test from "node:test";
import assert from "node:assert/strict";

import {
  aggregateItems,
  createEmptyLineItem,
  hydrateItem,
  hydrateReceipt,
  normalizeReceiptDate,
  normalizeReceiptTime,
  parseReceiptRawLine,
  rebuildReceiptFromEditor
} from "../src/receipt-utils.js";

test("hydrateItem derives line total from quantity and unit price", () => {
  const item = hydrateItem(
    {
      name: "Kaffe",
      quantity: 2,
      unitPrice: 35
    },
    0
  );

  assert.deepEqual(item, {
    name: "Kaffe",
    quantity: 2,
    unitPrice: 35,
    lineTotal: 70,
    rawLine: null
  });
});

test("hydrateItem derives unit price from line total", () => {
  const item = hydrateItem(
    {
      name: "Burger",
      quantity: 2,
      lineTotal: 219
    },
    0
  );

  assert.equal(item.unitPrice, 109.5);
  assert.equal(item.lineTotal, 219);
});

test("hydrateItem prefers parsed quantity and prices from rawLine", () => {
  const item = hydrateItem(
    {
      name: "Dry Aged Entrecote",
      quantity: 1,
      unitPrice: 1090,
      lineTotal: 1090,
      rawLine: "2 Dry Aged Entrecote (@545,00) 1090,00"
    },
    0
  );

  assert.equal(item.quantity, 2);
  assert.equal(item.unitPrice, 545);
  assert.equal(item.lineTotal, 1090);
});

test("hydrateItem fills missing name from rawLine", () => {
  const item = hydrateItem(
    {
      name: "Vare 1",
      quantity: null,
      unitPrice: null,
      lineTotal: null,
      rawLine: "3 Fløtegratinerte poteter (@129,00) 387,00"
    },
    0
  );

  assert.equal(item.name, "Fløtegratinerte poteter");
  assert.equal(item.quantity, 3);
  assert.equal(item.unitPrice, 129);
  assert.equal(item.lineTotal, 387);
});

test("parseReceiptRawLine finds quantity from a separate column before price columns", () => {
  const parsed = parseReceiptRawLine("Coca Cola Zero 2 45,00 90,00");

  assert.equal(parsed.name, "Coca Cola Zero");
  assert.equal(parsed.quantity, 2);
  assert.equal(parsed.unitPrice, 45);
  assert.equal(parsed.lineTotal, 90);
});

test("hydrateReceipt summarizes quantities and totals", () => {
  const receipt = hydrateReceipt({
    merchantName: "Meny",
    merchantCategory: "butikk",
    receiptDate: "2026-06-01",
    receiptTime: "18:42",
    currency: "kr",
    subtotal: 99.5,
    taxTotal: 12.4,
    grandTotal: 99.5,
    notes: ["Noe tekst var delvis uklart."],
    items: [
      {
        name: "Melk",
        quantity: 1,
        lineTotal: 22.5
      },
      {
        name: "Brød",
        quantity: 2,
        unitPrice: 38.5
      },
      {
        name: "melk",
        quantity: 1,
        lineTotal: 22.5
      }
    ]
  });

  assert.equal(receipt.merchantCategory, "store");
  assert.equal(receipt.currency, "NOK");
  assert.equal(receipt.totals.lineCount, 2);
  assert.equal(receipt.totals.sourceLineCount, 3);
  assert.equal(receipt.totals.itemCount, 4);
  assert.equal(receipt.totals.itemsTotal, 122);
  assert.equal(receipt.grandTotal, 99.5);
  assert.equal(receipt.items[0].sourceLines, 2);
});

test("hydrateReceipt filters obvious non-item rows", () => {
  const receipt = hydrateReceipt({
    merchantName: "Steak",
    merchantCategory: "restaurant",
    receiptDate: "2026-06-01",
    receiptTime: "18:42",
    currency: "nok",
    subtotal: 100,
    taxTotal: null,
    grandTotal: 100,
    notes: [],
    items: [
      {
        name: "Steak",
        quantity: 1,
        unitPrice: 100,
        lineTotal: 100,
        rawLine: "Steak"
      },
      {
        name: "Coca Cola 0,6",
        quantity: 1,
        unitPrice: 92,
        lineTotal: 92,
        rawLine: "1 Coca Cola 0,6 (@92,00) 92,00"
      }
    ]
  });

  assert.equal(receipt.items.length, 1);
  assert.equal(receipt.items[0].name, "Coca Cola 0,6");
});

test("aggregateItems merges matching names case-insensitively", () => {
  const items = aggregateItems([
    { name: "Cola Zero", quantity: 1, unitPrice: 39, lineTotal: 39 },
    { name: "cola zero", quantity: 2, unitPrice: 39, lineTotal: 78 }
  ]);

  assert.deepEqual(items, [
    {
      name: "Cola Zero",
      quantity: 3,
      unitPrice: 39,
      lineTotal: 117,
      sourceLines: 2,
      rawLines: []
    }
  ]);
});

test("createEmptyLineItem returns a safe blank editor row", () => {
  assert.deepEqual(createEmptyLineItem(), {
    name: "",
    quantity: 1,
    unitPrice: 0,
    lineTotal: 0,
    rawLine: null
  });
});

test("rebuildReceiptFromEditor rehydrates editable line items", () => {
  const receipt = rebuildReceiptFromEditor({
    merchantName: "Steak",
    merchantCategory: "restaurant",
    receiptDate: "02.06.2026",
    receiptTime: "1842",
    currency: "nok",
    grandTotal: 180,
    lineItems: [
      {
        name: "Cola Zero",
        quantity: 2,
        unitPrice: 45,
        lineTotal: 90,
        rawLine: "2 Cola Zero (@45,00) 90,00"
      },
      {
        name: "Fries",
        quantity: 1,
        unitPrice: 55,
        lineTotal: 55,
        rawLine: ""
      }
    ]
  });

  assert.equal(receipt.receiptDate, "2026-06-02");
  assert.equal(receipt.receiptTime, "18:42");
  assert.equal(receipt.currency, "NOK");
  assert.equal(receipt.totals.itemsTotal, 145);
  assert.equal(receipt.totals.difference, 35);
  assert.equal(receipt.lineItems.length, 2);
});

test("rebuildReceiptFromEditor keeps manual field overrides even when rawLine differs", () => {
  const receipt = rebuildReceiptFromEditor({
    merchantName: "Steak",
    merchantCategory: "restaurant",
    receiptDate: "2026-06-02",
    receiptTime: "18:42",
    currency: "nok",
    grandTotal: 180,
    tableRows: ["Coca Cola Zero 2 45,00 90,00"],
    lineItems: [
      {
        name: "Coca Cola Zero",
        quantity: 3,
        unitPrice: 45,
        lineTotal: 135,
        rawLine: "Coca Cola Zero 2 45,00 90,00"
      }
    ]
  });

  assert.equal(receipt.lineItems[0].quantity, 3);
  assert.equal(receipt.lineItems[0].lineTotal, 135);
  assert.deepEqual(receipt.tableRows, ["Coca Cola Zero 2 45,00 90,00"]);
});

test("normalizeReceiptDate handles common Norwegian receipt formats", () => {
  assert.equal(normalizeReceiptDate("01.06.2026"), "2026-06-01");
  assert.equal(normalizeReceiptDate("2026/6/1"), "2026-06-01");
});

test("normalizeReceiptTime handles dots and plain digits", () => {
  assert.equal(normalizeReceiptTime("18.42"), "18:42");
  assert.equal(normalizeReceiptTime("1842"), "18:42");
});
