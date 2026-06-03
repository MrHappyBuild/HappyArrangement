import { parseReceiptRawLine } from "./receipt-utils.js";

const DATE_PATTERN = /\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b|\b\d{4}[./-]\d{1,2}[./-]\d{1,2}\b/;
const TIME_PATTERN = /\b\d{1,2}[:.]\d{2}\b/;
const LOCALIZED_AMOUNT_PATTERN = /-?(?:\d{1,3}(?:[ .]\d{3})+|\d+)[,.]\d{2}\b/g;

function normalizeWhitespace(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

function parseAmount(value) {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number(
    value
      .replace(/\s+/g, "")
      .replace(/\.(?=\d{3}(?:\D|$))/g, "")
      .replace(/,/g, ".")
      .replace(/[^\d.-]/g, "")
  );

  return Number.isFinite(parsed) ? parsed : null;
}

function detectTags(text, parsedLine) {
  const tags = [];
  const normalized = text.toLowerCase();
  const amounts = text.match(LOCALIZED_AMOUNT_PATTERN) || [];

  if (DATE_PATTERN.test(text)) {
    tags.push("dato");
  }

  if (TIME_PATTERN.test(text)) {
    tags.push("tid");
  }

  if (/\b(sum|total|subtotal|mva|tax)\b/i.test(text)) {
    tags.push("total");
  }

  if (parsedLine?.quantity != null) {
    tags.push("antall");
  }

  if (parsedLine?.unitPrice != null) {
    tags.push("pris pr");
  }

  if (amounts.length > 0) {
    tags.push("belop");
  }

  if (parsedLine?.name && amounts.length >= 1) {
    tags.push("varelinje");
  }

  if (!/\d/.test(text) && text.length > 2) {
    tags.push("tekst");
  }

  if (normalized.includes("@")) {
    tags.push("kolonne");
  }

  return Array.from(new Set(tags));
}

function pushUniqueCandidate(list, seen, candidate) {
  if (candidate?.value == null && !candidate?.text) {
    return;
  }

  const key = `${candidate.field}:${candidate.text}:${candidate.value ?? ""}`;

  if (seen.has(key)) {
    return;
  }

  seen.add(key);
  list.push({
    id: `${candidate.field}-${list.length}`,
    ...candidate
  });
}

function buildFieldCandidates(text, parsedLine) {
  const amounts = Array.from(text.matchAll(LOCALIZED_AMOUNT_PATTERN)).map((match) => ({
    text: match[0],
    value: parseAmount(match[0])
  }));
  const numericCandidates = [];
  const numericSeen = new Set();

  if (parsedLine?.quantity != null) {
    pushUniqueCandidate(numericCandidates, numericSeen, {
      field: "quantity",
      text: parsedLine.quantityText || String(parsedLine.quantity),
      value: parsedLine.quantity
    });
  }

  amounts.forEach((amount) => {
    pushUniqueCandidate(numericCandidates, numericSeen, {
      field: "amount",
      text: amount.text,
      value: amount.value
    });
  });

  const fieldCandidates = {
    name: [],
    quantity: [],
    unitPrice: [],
    lineTotal: []
  };
  const seenByField = {
    name: new Set(),
    quantity: new Set(),
    unitPrice: new Set(),
    lineTotal: new Set()
  };

  if (parsedLine?.name) {
    pushUniqueCandidate(fieldCandidates.name, seenByField.name, {
      field: "name",
      text: parsedLine.name,
      value: parsedLine.name,
      preferred: true
    });
  }

  if (parsedLine?.quantity != null) {
    pushUniqueCandidate(fieldCandidates.quantity, seenByField.quantity, {
      field: "quantity",
      text: parsedLine.quantityText || String(parsedLine.quantity),
      value: parsedLine.quantity,
      preferred: true
    });
  }

  if (parsedLine?.unitPrice != null) {
    pushUniqueCandidate(fieldCandidates.unitPrice, seenByField.unitPrice, {
      field: "unitPrice",
      text: parsedLine.unitPriceText || String(parsedLine.unitPrice),
      value: parsedLine.unitPrice,
      preferred: true
    });
  }

  if (parsedLine?.lineTotal != null) {
    pushUniqueCandidate(fieldCandidates.lineTotal, seenByField.lineTotal, {
      field: "lineTotal",
      text: parsedLine.lineTotalText || String(parsedLine.lineTotal),
      value: parsedLine.lineTotal,
      preferred: true
    });
  }

  numericCandidates.forEach((candidate) => {
    pushUniqueCandidate(fieldCandidates.quantity, seenByField.quantity, {
      field: "quantity",
      text: candidate.text,
      value: candidate.value
    });
    pushUniqueCandidate(fieldCandidates.unitPrice, seenByField.unitPrice, {
      field: "unitPrice",
      text: candidate.text,
      value: candidate.value
    });
    pushUniqueCandidate(fieldCandidates.lineTotal, seenByField.lineTotal, {
      field: "lineTotal",
      text: candidate.text,
      value: candidate.value
    });
  });

  return fieldCandidates;
}

export function buildRawDataRows({ result, draft } = {}) {
  const seen = new Set();
  const rows = [];
  const pushRow = (value, source) => {
    const text = normalizeWhitespace(value || "");

    if (!text || seen.has(text)) {
      return;
    }

    seen.add(text);
    const parsedLine = parseReceiptRawLine(text);

    rows.push({
      id: `${source}-${rows.length}`,
      text,
      source,
      tags: detectTags(text, parsedLine),
      fields: {
        name: parsedLine?.name ?? null,
        quantity: parsedLine?.quantity ?? null,
        unitPrice: parsedLine?.unitPrice ?? null,
        lineTotal: parsedLine?.lineTotal ?? null
      },
      fieldCandidates: buildFieldCandidates(text, parsedLine)
    });
  };

  (result?.tableRows || []).forEach((row) => pushRow(row, "tabell"));
  (result?.lineItems || []).forEach((item) => pushRow(item?.rawLine, "linje"));
  (result?.items || []).forEach((item) => {
    if (Array.isArray(item?.rawLines)) {
      item.rawLines.forEach((line) => pushRow(line, "aggregert"));
    }
  });
  (draft?.lineItems || []).forEach((item) => pushRow(item?.rawLine, "utkast"));
  (result?.notes || []).forEach((note) => pushRow(note, "notat"));

  return rows;
}
