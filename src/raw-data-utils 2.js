const DATE_PATTERN = /\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b|\b\d{4}[./-]\d{1,2}[./-]\d{1,2}\b/;
const TIME_PATTERN = /\b\d{1,2}[:.]\d{2}\b/;
const LOCALIZED_AMOUNT_PATTERN = /-?\d[\d .]*[,.]\d{2}\b/g;

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

function detectTags(text) {
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

  if (/^\d+(?:[.,]\d+)?\s+/.test(text)) {
    tags.push("antall");
  }

  if (/@\s*-?\d[\d .]*[,.]\d{2}|\(-?\d[\d .]*[,.]\d{2}\)/i.test(text)) {
    tags.push("pris pr");
  }

  if (amounts.length > 0) {
    tags.push("belop");
  }

  if (amounts.length >= 2) {
    tags.push("varelinje");
  }

  if (!/\d/.test(text) && text.length > 2) {
    tags.push("tekst");
  }

  return Array.from(new Set(tags));
}

function summarizeFields(text) {
  const amounts = (text.match(LOCALIZED_AMOUNT_PATTERN) || []).map(parseAmount).filter((value) => value != null);
  const quantityMatch = text.match(/^(\d+(?:[.,]\d+)?)\s+/);

  return {
    quantity: quantityMatch ? parseAmount(quantityMatch[1]) : null,
    unitPrice: amounts.length >= 2 ? amounts[amounts.length - 2] : null,
    lineTotal: amounts.length >= 1 ? amounts[amounts.length - 1] : null
  };
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
    rows.push({
      id: `${source}-${rows.length}`,
      text,
      source,
      tags: detectTags(text),
      fields: summarizeFields(text)
    });
  };

  (result?.notes || []).forEach((note) => pushRow(note, "notat"));
  (result?.lineItems || []).forEach((item) => pushRow(item?.rawLine, "linje"));
  (result?.items || []).forEach((item) => {
    if (Array.isArray(item?.rawLines)) {
      item.rawLines.forEach((line) => pushRow(line, "aggregert"));
    }
  });
  (draft?.lineItems || []).forEach((item) => pushRow(item?.rawLine, "utkast"));

  return rows;
}
