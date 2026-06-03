import { createEmptyLineItem, roundCurrency } from "./receipt-utils.js";

function cloneLineItem(item) {
  return {
    name: item?.name || "",
    quantity: item?.quantity ?? 1,
    unitPrice: item?.unitPrice ?? 0,
    lineTotal: item?.lineTotal ?? 0,
    rawLine: item?.rawLine || ""
  };
}

function cloneAmountFields(item) {
  return {
    quantity: item?.quantity ?? 1,
    unitPrice: item?.unitPrice ?? 0,
    lineTotal: item?.lineTotal ?? 0
  };
}

function cloneNameFields(item) {
  return {
    name: item?.name || "",
    rawLine: item?.rawLine || ""
  };
}

export function parseOptionalNumber(value) {
  if (value === "" || value == null) {
    return null;
  }

  const normalized =
    typeof value === "number" ? value : Number(String(value).trim().replace(/\s+/g, "").replace(",", "."));

  return Number.isFinite(normalized) ? normalized : null;
}

export function calculateUnitPriceFromLineTotal(item) {
  const quantity = parseOptionalNumber(item?.quantity);
  const lineTotal = parseOptionalNumber(item?.lineTotal);

  if (!quantity || quantity <= 0 || lineTotal == null) {
    return item;
  }

  return {
    ...item,
    unitPrice: roundCurrency(lineTotal / quantity)
  };
}

export function calculateLineTotalFromUnitPrice(item) {
  const quantity = parseOptionalNumber(item?.quantity);
  const unitPrice = parseOptionalNumber(item?.unitPrice);

  if (!quantity || quantity <= 0 || unitPrice == null) {
    return item;
  }

  return {
    ...item,
    lineTotal: roundCurrency(quantity * unitPrice)
  };
}

export function insertFullRow(rows, index) {
  const next = rows.map(cloneLineItem);
  next.splice(index, 0, { ...createEmptyLineItem(), rawLine: "" });
  return next;
}

export function insertNameOnlyRow(rows, index) {
  const next = [];

  for (let cursor = 0; cursor <= rows.length; cursor += 1) {
    const amountSource = rows[cursor];
    const nameSource = cursor < index ? rows[cursor] : rows[cursor - 1];
    const base = amountSource ? cloneLineItem(amountSource) : { ...createEmptyLineItem(), rawLine: "" };

    if (cursor === index) {
      next.push({
        ...base,
        name: "",
        rawLine: ""
      });
      continue;
    }

    next.push({
      ...base,
      ...cloneNameFields(nameSource)
    });
  }

  return next;
}

export function insertAmountsOnlyRow(rows, index) {
  const next = [];

  for (let cursor = 0; cursor <= rows.length; cursor += 1) {
    const nameSource = rows[cursor];
    const amountSource = cursor < index ? rows[cursor] : rows[cursor - 1];
    const base = nameSource ? cloneLineItem(nameSource) : { ...createEmptyLineItem(), rawLine: "" };

    if (cursor === index) {
      next.push({
        ...base,
        quantity: 1,
        unitPrice: 0,
        lineTotal: 0
      });
      continue;
    }

    next.push({
      ...base,
      ...cloneAmountFields(amountSource)
    });
  }

  return next;
}
