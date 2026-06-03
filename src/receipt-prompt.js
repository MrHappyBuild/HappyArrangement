export const RECEIPT_EXTRACTION_PROMPT = `
Extract structured receipt data from the attached image.

Rules:
- Return JSON only.
- Read merchant name and classify it as store, restaurant, or unknown.
- Extract receipt date in YYYY-MM-DD if visible.
- Extract receipt time in HH:MM 24-hour format if visible.
- Extract currency like NOK, SEK, DKK, EUR, or USD when possible.
- Create one item per visible purchased line.
- For each item, also return "rawLine" with the line text exactly as you read it from the receipt.
- Also return "tableRows" as the visible receipt rows in top-to-bottom order for the item area. Include rows even when you are unsure whether they are item rows.
- Quantity must be numeric. Use 1 if missing.
- If a receipt has a dedicated quantity column, prefer that column over defaulting to 1.
- For patterns like "2 x 39.90", set quantity=2, unitPrice=39.90, lineTotal=79.80.
- On restaurant receipts like this, the left-most column is often quantity, the middle is name, the number in parentheses is unit price, and the right-most column is line total.
- If a small standalone number appears on the same line as a product before the money columns, treat it as quantity rather than part of the name when plausible.
- If the line shows both unit price and line total, do not swap them.
- If the item name is partly cut off, still prefer the readable product words over inventing a new name.
- Do not include card details, VAT summaries, subtotal rows, or payment method rows as items.
- Discounts or refunds should use negative line totals.
- If unreadable, return null rather than guessing.
- Keep product names short and recognizable.
`.trim();

export const RECEIPT_SUMMARY_PROMPT = `
Extract receipt summary data from the attached image.

Rules:
- Return JSON only.
- Read merchant name and classify it as store, restaurant, or unknown.
- Extract receipt date in YYYY-MM-DD if visible.
- Extract receipt time in HH:MM 24-hour format if visible.
- Extract currency like NOK, SEK, DKK, EUR, or USD when possible.
- Extract subtotal, tax total, and grand total when visible.
- Do not return purchased items here.
- Add short raw note lines only when they help explain uncertain totals or dates.
- If unreadable, return null rather than guessing.
`.trim();

export const RECEIPT_ITEMS_PROMPT = `
Extract purchased receipt line items from the attached image.

Rules:
- Return JSON only.
- Create one item per visible purchased line.
- For each item, also return "rawLine" with the line text exactly as you read it from the receipt.
- Also return "tableRows" as the visible receipt rows in top-to-bottom order for the item area. Include rows even when you are unsure whether they are item rows.
- Quantity must be numeric. Use 1 if missing.
- If a receipt has a dedicated quantity column, prefer that column over defaulting to 1.
- For patterns like "2 x 39.90", set quantity=2, unitPrice=39.90, lineTotal=79.80.
- On restaurant receipts like this, the left-most column is often quantity, the middle is name, the number in parentheses is unit price, and the right-most column is line total.
- If a small standalone number appears on the same line as a product before the money columns, treat it as quantity rather than part of the name when plausible.
- If the line shows both unit price and line total, do not swap them.
- If the item name is partly cut off, still prefer the readable product words over inventing a new name.
- Do not include merchant name, card details, VAT summaries, subtotal rows, grand total rows, or payment method rows as items.
- Ignore any item line that is visibly cut off at the very top or bottom edge of the image.
- If the slice is mostly blank or contains no purchased item lines, return an empty items array.
- Discounts or refunds should use negative line totals.
- If unreadable, return null rather than guessing.
- Keep product names short and recognizable.
`.trim();
