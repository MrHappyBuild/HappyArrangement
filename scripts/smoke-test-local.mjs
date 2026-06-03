import { readFile } from "node:fs/promises";

import sharp from "sharp";

const baseUrl = process.env.RECEIPT_APP_URL || "http://127.0.0.1:3000";
const outputPath = "/tmp/kvitteringsdeler-smoke.png";
const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="3200">
    <rect width="100%" height="100%" fill="white" />
    <text x="60" y="110" font-size="44" font-family="Menlo, monospace" fill="black">TESTBUTIKK</text>
    <text x="60" y="175" font-size="34" font-family="Menlo, monospace" fill="black">Dato: 01.06.2026   Tid: 14:37</text>
    <text x="60" y="265" font-size="34" font-family="Menlo, monospace" fill="black">1  Kaffe              39,00</text>
    <text x="60" y="320" font-size="34" font-family="Menlo, monospace" fill="black">2  Bolle              25,00</text>
    <text x="60" y="375" font-size="34" font-family="Menlo, monospace" fill="black">1  Vann               22,00</text>
    <text x="60" y="430" font-size="34" font-family="Menlo, monospace" fill="black">1  Yoghurt            28,00</text>
    <text x="60" y="485" font-size="34" font-family="Menlo, monospace" fill="black">3  Eple               12,00</text>
    <text x="60" y="540" font-size="34" font-family="Menlo, monospace" fill="black">1  Juice              31,00</text>
    <text x="60" y="595" font-size="34" font-family="Menlo, monospace" fill="black">1  Salat              64,00</text>
    <text x="60" y="650" font-size="34" font-family="Menlo, monospace" fill="black">1  Wrap               79,00</text>
    <text x="60" y="705" font-size="34" font-family="Menlo, monospace" fill="black">2  Banan              11,00</text>
    <text x="60" y="815" font-size="40" font-family="Menlo, monospace" fill="black">SUM                 299,00</text>
  </svg>
`;

await sharp(Buffer.from(svg)).png().toFile(outputPath);

const buffer = await readFile(outputPath);
const formData = new FormData();
formData.append("receipt", new File([buffer], "smoke-receipt.png", { type: "image/png" }));

const response = await fetch(`${baseUrl}/api/receipts`, {
  method: "POST",
  body: formData
});
const payload = await response.json();

if (!response.ok) {
  throw new Error(payload?.error || `Smoke-test feilet med HTTP ${response.status}.`);
}

if (!payload?.job) {
  throw new Error("Smoke-test fikk ikke tilbake en jobb fra API-et.");
}

if (payload.job.status !== "completed") {
  throw new Error(payload.job.error_message || "Smoke-test fullførte ikke analysen.");
}

console.log(
  JSON.stringify(
    {
      status: payload.job.status,
      merchantName: payload.job.result?.merchantName || null,
      receiptDate: payload.job.result?.receiptDate || null,
      receiptTime: payload.job.result?.receiptTime || null,
      grandTotal: payload.job.result?.grandTotal ?? null,
      items: payload.job.result?.items || []
    },
    null,
    2
  )
);
