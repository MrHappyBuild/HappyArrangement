const CURRENCY_MAP = {
  KR: "NOK",
  KRONER: "NOK",
  NOK: "NOK",
  SEK: "SEK",
  DKK: "DKK",
  EUR: "EUR",
  USD: "USD",
  GBP: "GBP"
};

const PLACEHOLDER_NAME_PATTERN = /^vare \d+$/i;
const LOCALIZED_AMOUNT_SOURCE = "-?(?:\\d{1,3}(?:[ .]\\d{3})+|\\d+),\\d{2}\\b";
const NON_ITEM_NAME_PATTERNS = [
  /^steak$/i,
  /^bord\b/i,
  /^id[:\s]/i,
  /^org(?:anr)?[:.\s]/i,
  /^www\./i,
  /^forelopig\b/i,
  /^foreløpig\b/i,
  /^ikke kvittering/i,
  /^subtotal\b/i,
  /^total\b/i,
  /^brukernavn\b/i,
  /^signatur\b/i,
  /\bmva\b/i,
  /\bforelopig kvittering\b/i,
  /\bforeløpig kvittering\b/i
];

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function parseLocalizedAmount(value) {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value
    .replace(/\s+/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(/,/g, ".");
  const parsed = Number(cleaned.replace(/[^\d.-]/g, ""));

  return Number.isFinite(parsed) ? roundCurrency(parsed) : null;
}

function extractLocalizedAmounts(value) {
  if (typeof value !== "string") {
    return [];
  }

  return Array.from(value.matchAll(new RegExp(LOCALIZED_AMOUNT_SOURCE, "g"))).map((match) => ({
    text: match[0],
    value: parseLocalizedAmount(match[0]),
    index: match.index ?? -1
  }));
}

export function roundCurrency(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function roundQuantity(value) {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

export function normalizeCurrency(value) {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value.trim().toUpperCase().replace(/[^A-Z]/g, "");

  if (!cleaned) {
    return null;
  }

  return CURRENCY_MAP[cleaned] ?? cleaned.slice(0, 3);
}

export function normalizeMerchantCategory(value) {
  if (value === "store" || value === "restaurant" || value === "unknown") {
    return value;
  }

  if (typeof value !== "string") {
    return "unknown";
  }

  const cleaned = value.toLowerCase();

  if (
    cleaned.includes("restaurant") ||
    cleaned.includes("restaur") ||
    cleaned.includes("cafe") ||
    cleaned.includes("bar")
  ) {
    return "restaurant";
  }

  if (
    cleaned.includes("store") ||
    cleaned.includes("butikk") ||
    cleaned.includes("shop") ||
    cleaned.includes("market")
  ) {
    return "store";
  }

  return "unknown";
}

export function normalizeReceiptDate(value) {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = normalizeWhitespace(value).replace(/[.]/g, ".").replace(/,/g, ".");
  let match = cleaned.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);

  if (match) {
    const [, year, month, day] = match;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  match = cleaned.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);

  if (match) {
    let [, day, month, year] = match;

    if (year.length === 2) {
      year = `20${year}`;
    }

    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  match = cleaned.match(/^(\d{2})(\d{2})(\d{4})$/);

  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month}-${day}`;
  }

  return cleaned || null;
}

export function normalizeReceiptTime(value) {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = normalizeWhitespace(value);
  let match = cleaned.match(/^(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?$/);

  if (match) {
    const [, hour, minute] = match;
    return `${hour.padStart(2, "0")}:${minute}`;
  }

  match = cleaned.match(/^(\d{2})(\d{2})$/);

  if (match) {
    const [, hour, minute] = match;
    return `${hour}:${minute}`;
  }

  return cleaned || null;
}

function normalizeQuantity(value) {
  if (!isFiniteNumber(value) || value <= 0) {
    return 1;
  }

  return roundQuantity(value);
}

function normalizeAmount(value) {
  if (!isFiniteNumber(value)) {
    return null;
  }

  return roundCurrency(value);
}

function normalizeItemName(value, index) {
  if (typeof value !== "string") {
    return `Vare ${index + 1}`;
  }

  const cleaned = normalizeWhitespace(value.replace(/\s{2,}/g, " "));
  return cleaned || `Vare ${index + 1}`;
}

function stripColumnArtifacts(value) {
  return normalizeWhitespace(
    value
      .replace(/\((?:@)?\s*-?[\d .]+,\d{2}\s*\)/gi, " ")
      .replace(/@\s*-?[\d .]+,\d{2}/gi, " ")
      .replace(/-?[\d .]+,\d{2}\s*$/g, " ")
      .replace(/[|]+/g, " ")
  );
}

function parseQuantityFromRawValue(value) {
  const parsed = parseLocalizedAmount(value);

  if (!isFiniteNumber(parsed)) {
    return null;
  }

  return roundQuantity(parsed);
}

function deriveQuantityFromTotals(unitPrice, lineTotal) {
  if (!isFiniteNumber(unitPrice) || !isFiniteNumber(lineTotal) || unitPrice === 0) {
    return null;
  }

  const inferred = Math.round(lineTotal / unitPrice);

  if (inferred <= 0) {
    return null;
  }

  if (Math.abs(roundCurrency(inferred * unitPrice) - lineTotal) <= 0.02) {
    return inferred;
  }

  return null;
}

function findQuantityMeta(cleaned, amountMatches) {
  const firstAmountIndex = amountMatches[0]?.index ?? cleaned.length;
  const prefix = cleaned.slice(0, firstAmountIndex);
  const explicitPatterns = [
    /^(-?\d+(?:[.,]\d+)?)\s*(?:stk|pcs)\b\s*/i,
    /^(-?\d+(?:[.,]\d+)?)\s*[x×]\s*/i,
    /^(-?\d+(?:[.,]\d+)?)\s+/
  ];

  for (const pattern of explicitPatterns) {
    const match = prefix.match(pattern);

    if (!match) {
      continue;
    }

    const quantity = parseQuantityFromRawValue(match[1]);

    if (quantity != null && quantity > 0) {
      return {
        quantity,
        text: match[1],
        placement: "leading",
        prefixWithoutQuantity: prefix.slice(match[0].length)
      };
    }
  }

  const labelledMatch = prefix.match(/\b(?:ant|qty|stk|stk\.|pcs)\s*[:x]?\s*(-?\d+(?:[.,]\d+)?)\b/i);

  if (labelledMatch) {
    const quantity = parseQuantityFromRawValue(labelledMatch[1]);

    if (quantity != null && quantity > 0) {
      return {
        quantity,
        text: labelledMatch[1],
        placement: "labelled",
        prefixWithoutQuantity: prefix.replace(labelledMatch[0], " ")
      };
    }
  }

  const trailingIntegerMatches = Array.from(prefix.matchAll(/(?:^|\s)(\d{1,2})(?=\s*$)/g));

  if (trailingIntegerMatches.length > 0) {
    const match = trailingIntegerMatches.at(-1);
    const quantity = Number(match[1]);

    if (Number.isFinite(quantity) && quantity > 0 && quantity <= 20) {
      const start = (match.index ?? 0) + match[0].indexOf(match[1]);
      const end = start + match[1].length;

      return {
        quantity,
        text: match[1],
        placement: "trailing",
        prefixWithoutQuantity: `${prefix.slice(0, start)} ${prefix.slice(end)}`
      };
    }
  }

  return {
    quantity: null,
    text: null,
    placement: null,
    prefixWithoutQuantity: prefix
  };
}

export function parseReceiptRawLine(rawLine) {
  if (typeof rawLine !== "string" || !rawLine.trim()) {
    return null;
  }

  const cleaned = normalizeWhitespace(rawLine);
  const amountMatches = extractLocalizedAmounts(cleaned);
  const totalMatch = amountMatches.at(-1) ?? null;
  const unitMatch =
    cleaned.match(new RegExp(`\\((?:@)?\\s*(${LOCALIZED_AMOUNT_SOURCE})\\s*\\)`, "i")) ||
    cleaned.match(new RegExp(`@\\s*(${LOCALIZED_AMOUNT_SOURCE})`, "i"));
  const quantityMeta = findQuantityMeta(cleaned, amountMatches);
  const lineTotal = totalMatch?.value ?? null;
  const unitPrice =
    (unitMatch ? parseLocalizedAmount(unitMatch[1]) : null) ??
    (amountMatches.length >= 2 ? amountMatches.at(-2)?.value ?? null : null);
  const firstAmountIndex = amountMatches[0]?.index ?? cleaned.length;
  let namePart = quantityMeta.prefixWithoutQuantity || cleaned.slice(0, firstAmountIndex);

  if (firstAmountIndex < cleaned.length) {
    namePart = cleaned.slice(0, firstAmountIndex);

    if (quantityMeta.placement === "leading") {
      namePart = quantityMeta.prefixWithoutQuantity;
    } else if (quantityMeta.placement === "trailing" || quantityMeta.placement === "labelled") {
      namePart = quantityMeta.prefixWithoutQuantity;
    }
  }

  namePart = stripColumnArtifacts(namePart)
    .replace(/[@()]+/g, " ")
    .replace(/\b[x×]\b/gi, " ")
    .trim();

  return {
    rawLine: cleaned,
    quantity: quantityMeta.quantity,
    quantityText: quantityMeta.text,
    unitPrice,
    unitPriceText:
      (unitMatch ? unitMatch[1] : null) ??
      (amountMatches.length >= 2 ? amountMatches.at(-2)?.text ?? null : null),
    lineTotal,
    lineTotalText: totalMatch?.text ?? null,
    name: namePart || null,
    amountTexts: amountMatches.map((match) => match.text)
  };
}

function isLikelyNonItemName(value) {
  if (typeof value !== "string") {
    return true;
  }

  const cleaned = normalizeWhitespace(value);

  if (!cleaned) {
    return true;
  }

  return NON_ITEM_NAME_PATTERNS.some((pattern) => pattern.test(cleaned));
}

function shouldPreferRawName(currentName, rawName) {
  if (typeof rawName !== "string" || !rawName.trim()) {
    return false;
  }

  if (PLACEHOLDER_NAME_PATTERN.test(currentName)) {
    return true;
  }

  return rawName.length > currentName.length && !isLikelyNonItemName(rawName);
}

function createAggregationKey(name) {
  const cleaned = name
    .toLocaleLowerCase("nb-NO")
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

  return cleaned || name.toLocaleLowerCase("nb-NO");
}

export function hydrateItem(item, index, options = {}) {
  const parsedRawLine = parseReceiptRawLine(item?.rawLine);
  const preferExplicitFields = options.preferExplicitFields === true;
  const rawOrExplicit = (rawValue, explicitValue) =>
    preferExplicitFields ? explicitValue ?? rawValue : rawValue ?? explicitValue;

  let quantity = normalizeQuantity(rawOrExplicit(parsedRawLine?.quantity, item?.quantity));
  let unitPrice = normalizeAmount(rawOrExplicit(parsedRawLine?.unitPrice, item?.unitPrice));
  let lineTotal = normalizeAmount(rawOrExplicit(parsedRawLine?.lineTotal, item?.lineTotal));
  let name = normalizeItemName(item?.name, index);

  if (parsedRawLine?.name && shouldPreferRawName(name, parsedRawLine.name)) {
    name = normalizeItemName(parsedRawLine.name, index);
  }

  if (lineTotal == null && unitPrice != null) {
    lineTotal = roundCurrency(unitPrice * quantity);
  }

  if (unitPrice == null && lineTotal != null) {
    unitPrice = roundCurrency(lineTotal / quantity);
  }

  if (unitPrice != null && lineTotal != null) {
    const calculatedLineTotal = roundCurrency(unitPrice * quantity);

    if (Math.abs(calculatedLineTotal - lineTotal) > 0.02) {
      const derivedQuantity = deriveQuantityFromTotals(unitPrice, lineTotal);

      if (derivedQuantity != null && derivedQuantity !== quantity) {
        quantity = derivedQuantity;
      } else if (quantity !== 0) {
        unitPrice = roundCurrency(lineTotal / quantity);
      }
    }
  }

  return {
    name,
    quantity,
    unitPrice: unitPrice ?? 0,
    lineTotal: lineTotal ?? 0,
    rawLine: parsedRawLine?.rawLine ?? (typeof item?.rawLine === "string" ? item.rawLine : null)
  };
}

export function aggregateItems(items) {
  const grouped = new Map();

  items.forEach((item) => {
    const key = createAggregationKey(item.name);
    const existing = grouped.get(key);

    if (existing) {
      existing.quantity = roundQuantity(existing.quantity + item.quantity);
      existing.lineTotal = roundCurrency(existing.lineTotal + item.lineTotal);
      existing.unitPrice =
        existing.quantity > 0 ? roundCurrency(existing.lineTotal / existing.quantity) : 0;
      existing.sourceLines += 1;
      if (item.rawLine) {
        existing.rawLines.push(item.rawLine);
      }
      return;
    }

    grouped.set(key, {
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
      sourceLines: 1,
      rawLines: item.rawLine ? [item.rawLine] : []
    });
  });

  return Array.from(grouped.values());
}

export function createEmptyLineItem() {
  return {
    name: "",
    quantity: 1,
    unitPrice: 0,
    lineTotal: 0,
    rawLine: null
  };
}

export function hydrateReceipt(parsedReceipt, options = {}) {
  const lineItems = Array.isArray(parsedReceipt?.items)
    ? parsedReceipt.items
        .map((item, index) => hydrateItem(item, index, options))
        .filter((item) => !isLikelyNonItemName(item.name))
    : [];
  const items = aggregateItems(lineItems);

  const itemsTotal = roundCurrency(items.reduce((sum, item) => sum + item.lineTotal, 0));
  const totalQuantity = roundQuantity(items.reduce((sum, item) => sum + item.quantity, 0));
  const grandTotal = isFiniteNumber(parsedReceipt?.grandTotal)
    ? roundCurrency(parsedReceipt.grandTotal)
    : itemsTotal;
  const subtotal = isFiniteNumber(parsedReceipt?.subtotal)
    ? roundCurrency(parsedReceipt.subtotal)
    : itemsTotal;
  const taxTotal = isFiniteNumber(parsedReceipt?.taxTotal)
    ? roundCurrency(parsedReceipt.taxTotal)
    : null;

  return {
    merchantName:
      typeof parsedReceipt?.merchantName === "string" && parsedReceipt.merchantName.trim()
        ? normalizeWhitespace(parsedReceipt.merchantName)
        : null,
    merchantCategory: normalizeMerchantCategory(parsedReceipt?.merchantCategory),
    receiptDate: normalizeReceiptDate(parsedReceipt?.receiptDate),
    receiptTime: normalizeReceiptTime(parsedReceipt?.receiptTime),
    currency: normalizeCurrency(parsedReceipt?.currency),
    items,
    lineItems,
    subtotal,
    taxTotal,
    grandTotal,
    notes: Array.isArray(parsedReceipt?.notes)
      ? parsedReceipt.notes.filter((note) => typeof note === "string" && note.trim())
      : [],
    tableRows: Array.isArray(parsedReceipt?.tableRows)
      ? parsedReceipt.tableRows
          .filter((row) => typeof row === "string" && row.trim())
          .map((row) => normalizeWhitespace(row))
      : [],
    totals: {
      lineCount: items.length,
      sourceLineCount: lineItems.length,
      itemCount: totalQuantity,
      itemsTotal,
      difference: roundCurrency(grandTotal - itemsTotal)
    }
  };
}

export function rebuildReceiptFromEditor(parsedReceipt) {
  return hydrateReceipt(
    {
      merchantName: parsedReceipt?.merchantName,
      merchantCategory: parsedReceipt?.merchantCategory,
      receiptDate: parsedReceipt?.receiptDate,
      receiptTime: parsedReceipt?.receiptTime,
      currency: parsedReceipt?.currency,
      subtotal: parsedReceipt?.subtotal,
      taxTotal: parsedReceipt?.taxTotal,
      grandTotal: parsedReceipt?.grandTotal,
      notes: Array.isArray(parsedReceipt?.notes) ? parsedReceipt.notes : [],
      tableRows: Array.isArray(parsedReceipt?.tableRows) ? parsedReceipt.tableRows : [],
      items: Array.isArray(parsedReceipt?.lineItems) ? parsedReceipt.lineItems : parsedReceipt?.items
    },
    { preferExplicitFields: true }
  );
}
