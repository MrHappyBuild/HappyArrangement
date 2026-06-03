"use client";

import { useEffect, useMemo, useState } from "react";

import {
  createDistributionState,
  assignWholeItem,
  normalizeDistributionState,
  removeAssignment,
  setActiveParticipant,
  splitAllEntriesEqually,
  splitEntryEqually,
  splitEntryByPercent,
  summarizeDistribution
} from "@/distribution-utils";
import { buildEventSettlement } from "@/event-settlement-utils";
import {
  calculateLineTotalFromUnitPrice,
  calculateUnitPriceFromLineTotal,
  insertAmountsOnlyRow,
  insertFullRow,
  insertNameOnlyRow,
  parseOptionalNumber
} from "@/editor-utils";
import { buildRawDataRows } from "@/raw-data-utils";
import { createEmptyLineItem, rebuildReceiptFromEditor } from "@/receipt-utils";

const DEFAULT_LOCAL_AI_HEALTH = {
  ready: false,
  reachable: false,
  configuredModel: "qwen2.5vl:3b",
  installedModels: [],
  message: "Sjekker lokal Ollama..."
};

const DISTRIBUTION_STORAGE_KEY = "receipt-distributions-v1";

function formatDate(value) {
  return value || "Ikke funnet";
}

function formatTime(value) {
  return value || "Ikke funnet";
}

function formatCurrency(amount) {
  if (typeof amount !== "number" || Number.isNaN(amount)) {
    return "Ikke funnet";
  }

  return new Intl.NumberFormat("nb-NO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

function formatDifference(amount) {
  if (typeof amount !== "number" || Number.isNaN(amount)) {
    return "Ikke funnet";
  }

  const prefix = amount > 0 ? "+" : "";
  return `${prefix}${formatCurrency(amount)}`;
}

function formatDateTime(value) {
  if (!value) {
    return "Ukjent tidspunkt";
  }

  return new Intl.DateTimeFormat("nb-NO", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function memberInitials(name) {
  if (typeof name !== "string") {
    return "?";
  }

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function statusLabel(status) {
  if (status === "queued") {
    return "I kø";
  }

  if (status === "processing") {
    return "Behandles lokalt";
  }

  if (status === "completed") {
    return "Ferdig";
  }

  if (status === "failed") {
    return "Feilet";
  }

  return status;
}

function localAiLabel(health) {
  if (health.ready) {
    return "Klar lokalt";
  }

  if (health.reachable) {
    return "Mangler modell";
  }

  return "Ikke kontakt";
}

function localAiTone(health) {
  if (health.ready) {
    return "success";
  }

  if (health.reachable) {
    return "warning";
  }

  return "danger";
}

function cloneLineItem(item) {
  return {
    name: item?.name || "",
    quantity: item?.quantity ?? 1,
    unitPrice: item?.unitPrice ?? 0,
    lineTotal: item?.lineTotal ?? 0,
    rawLine: item?.rawLine || ""
  };
}

function createEmptyReceiptDraft() {
  return {
    merchantName: "",
    merchantCategory: "unknown",
    receiptDate: "",
    receiptTime: "",
    currency: "NOK",
    subtotal: "",
    taxTotal: "",
    grandTotal: "",
    notes: [],
    tableRows: [],
    lineItems: [createEmptyLineItem()]
  };
}

function createDraftFromResult(result) {
  return {
    merchantName: result?.merchantName || "",
    merchantCategory: result?.merchantCategory || "unknown",
    receiptDate: result?.receiptDate || "",
    receiptTime: result?.receiptTime || "",
    currency: result?.currency || "NOK",
    subtotal: result?.subtotal ?? "",
    taxTotal: result?.taxTotal ?? "",
    grandTotal: result?.grandTotal ?? "",
    notes: Array.isArray(result?.notes) ? result.notes : [],
    tableRows: Array.isArray(result?.tableRows) ? result.tableRows : [],
    lineItems:
      result?.lineItems?.map(cloneLineItem) ||
      result?.items?.map((item) => cloneLineItem(item)) ||
      [createEmptyLineItem()]
  };
}

function buildReceiptPayload(draft) {
  return {
    merchantName: draft.merchantName,
    merchantCategory: draft.merchantCategory,
    receiptDate: draft.receiptDate,
    receiptTime: draft.receiptTime,
    currency: draft.currency,
    subtotal: parseOptionalNumber(draft.subtotal),
    taxTotal: parseOptionalNumber(draft.taxTotal),
    grandTotal: parseOptionalNumber(draft.grandTotal),
    notes: Array.isArray(draft.notes) ? draft.notes : [],
    tableRows: Array.isArray(draft.tableRows) ? draft.tableRows : [],
    lineItems: draft.lineItems.map((item) => ({
      name: item.name,
      quantity: parseOptionalNumber(item.quantity),
      unitPrice: parseOptionalNumber(item.unitPrice),
      lineTotal: parseOptionalNumber(item.lineTotal),
      rawLine: item.rawLine || null
    }))
  };
}

function canCalculateUnitPrice(item) {
  const quantity = parseOptionalNumber(item.quantity);
  const lineTotal = parseOptionalNumber(item.lineTotal);
  return !!quantity && quantity > 0 && lineTotal != null;
}

function canCalculateLineTotal(item) {
  const quantity = parseOptionalNumber(item.quantity);
  const unitPrice = parseOptionalNumber(item.unitPrice);
  return !!quantity && quantity > 0 && unitPrice != null;
}

function formatRawFieldValue(field, value) {
  if (value == null || value === "") {
    return "Ikke tolket";
  }

  if (field === "name") {
    return value;
  }

  if (field === "quantity") {
    return String(value);
  }

  return formatCurrency(value);
}

function RawCandidateCell({ row, field, onApplyField }) {
  const candidates = row.fieldCandidates?.[field] || [];
  const primaryValue = row.fields?.[field] ?? null;

  if (primaryValue == null && candidates.length === 0) {
    return <span className="muted">Ikke tolket</span>;
  }

  return (
    <div className="raw-cell-stack">
      <strong>{formatRawFieldValue(field, primaryValue)}</strong>
      {onApplyField ? (
        <div className="raw-candidate-buttons">
          {candidates.map((candidate) => (
            <button
              className={`raw-value-button ${candidate.preferred ? "preferred-raw-value" : ""}`}
              key={`${row.id}-${field}-${candidate.id}`}
              type="button"
              onClick={() => onApplyField(field, candidate, row)}
            >
              {field === "name" ? candidate.text : formatRawFieldValue(field, candidate.value)}
            </button>
          ))}
        </div>
      ) : candidates.length > 1 ? (
        <span className="muted">Flere kandidater tilgjengelig ved redigering.</span>
      ) : null}
    </div>
  );
}

function RawDataTable({ rows, selectedRawLine, onApplyField, onApplyWholeRow }) {
  if (rows.length === 0) {
    return <p className="notice">Fant ingen rålinjer å bygge tabell fra ennå.</p>;
  }

  return (
    <table className="mini-table raw-data-table">
      <thead>
        <tr>
          <th>Kilde</th>
          <th>Tagger</th>
          <th>Vare</th>
          <th>Antall</th>
          <th>Pris pr</th>
          <th>Linjesum</th>
          <th>Rålinje</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            className={selectedRawLine && selectedRawLine === row.text ? "active-raw-row" : ""}
            key={row.id}
          >
            <td>{row.source}</td>
            <td>
              <div className="tag-list">
                {row.tags.length > 0 ? (
                  row.tags.map((tag) => (
                    <span className="data-tag" key={`${row.id}-${tag}`}>
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="muted">ukjent</span>
                )}
              </div>
            </td>
            <td className="raw-field-cell">
              <RawCandidateCell row={row} field="name" onApplyField={onApplyField} />
            </td>
            <td className="raw-field-cell">
              <RawCandidateCell row={row} field="quantity" onApplyField={onApplyField} />
            </td>
            <td className="raw-field-cell">
              <RawCandidateCell row={row} field="unitPrice" onApplyField={onApplyField} />
            </td>
            <td className="raw-field-cell">
              <RawCandidateCell row={row} field="lineTotal" onApplyField={onApplyField} />
            </td>
            <td>{row.text}</td>
            <td>
              {onApplyWholeRow ? (
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => onApplyWholeRow(row)}
                >
                  Bruk hele raden
                </button>
              ) : (
                <span className="muted">Oversikt</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function readDistributionMap() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(DISTRIBUTION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeDistributionMap(next) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(DISTRIBUTION_STORAGE_KEY, JSON.stringify(next));
}

function loadDistributionState(job, members = []) {
  const stored = readDistributionMap();
  return normalizeDistributionState(stored[job.id] || job.distribution_state, job.result, members);
}

function saveDistributionState(jobId, state) {
  const stored = readDistributionMap();
  stored[jobId] = state;
  writeDistributionMap(stored);
}

function clearDistributionState(jobId) {
  const stored = readDistributionMap();
  delete stored[jobId];
  writeDistributionMap(stored);
}

function formatBalanceTone(amount) {
  if (amount > 0.02) {
    return "success";
  }

  if (amount < -0.02) {
    return "danger";
  }

  return "muted";
}

function formatBalanceText(amount) {
  if (typeof amount !== "number" || Number.isNaN(amount)) {
    return "Ikke beregnet";
  }

  if (Math.abs(amount) <= 0.02) {
    return "I balanse";
  }

  return amount > 0 ? `Til gode ${formatCurrency(amount)}` : `Skylder ${formatCurrency(Math.abs(amount))}`;
}

function ReceiptTotals({ result }) {
  const itemsTotal = result.totals?.itemsTotal;
  const difference = result.totals?.difference;
  const hasDifference = typeof difference === "number" && Math.abs(difference) > 0.02;

  return (
    <div className="totals-card">
      <div className="totals-row">
        <span>Sum av varene vi har lest</span>
        <strong>{formatCurrency(itemsTotal)}</strong>
      </div>
      <div className="totals-row">
        <span>Kvitteringens total</span>
        <strong>{formatCurrency(result.grandTotal)}</strong>
      </div>
      <div className={`totals-row ${hasDifference ? "difference-warning" : "difference-ok"}`}>
        <span>Avvik mellom kvittering og estimert sum</span>
        <strong>{formatDifference(difference)}</strong>
      </div>
    </div>
  );
}

function ReceiptResult({ result }) {
  if (!result) {
    return null;
  }

  return (
    <div className="result-grid">
      <div className="stats">
        <article className="stat">
          <div className="stat-label">Butikk / Restaurant</div>
          <div className="stat-value">{result.merchantName || "Ikke funnet"}</div>
        </article>
        <article className="stat">
          <div className="stat-label">Dato</div>
          <div className="stat-value">{formatDate(result.receiptDate)}</div>
        </article>
        <article className="stat">
          <div className="stat-label">Tid</div>
          <div className="stat-value">{formatTime(result.receiptTime)}</div>
        </article>
        <article className="stat">
          <div className="stat-label">Kvittering total</div>
          <div className="stat-value">{formatCurrency(result.grandTotal)}</div>
        </article>
      </div>

      <table className="mini-table">
        <thead>
          <tr>
            <th>Vare</th>
            <th>Antall</th>
            <th>Pris per vare</th>
            <th>Linjesum</th>
          </tr>
        </thead>
        <tbody>
          {(result.items || []).map((item) => (
            <tr key={`${item.name}-${item.sourceLines ?? 0}`}>
              <td>{item.name}</td>
              <td>{item.quantity}</td>
              <td>{formatCurrency(item.unitPrice)}</td>
              <td>{formatCurrency(item.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <ReceiptTotals result={result} />
    </div>
  );
}

function EventOverview({ summary, onExport }) {
  if (!summary) {
    return null;
  }

  return (
    <section className="panel stack">
      <div className="job-head">
        <div className="job-meta">
          <div className="job-name">Total oversikt for {summary.eventName}</div>
          <div className="job-time">
            Sammenligner hva hver person har betalt med hva de faktisk har brukt i arrangementet.
          </div>
        </div>
      </div>

      <div className="button-row">
        <button
          className="button button-secondary"
          type="button"
          onClick={() => onExport?.("xlsx")}
          disabled={summary.receiptCount === 0}
        >
          Arrangement Excel
        </button>
        <button
          className="button button-secondary"
          type="button"
          onClick={() => onExport?.("pdf")}
          disabled={summary.receiptCount === 0}
        >
          Arrangement PDF
        </button>
      </div>

      <div className="stats">
        <article className="stat">
          <div className="stat-label">Kvitteringer</div>
          <div className="stat-value">{summary.receiptCount}</div>
        </article>
        <article className="stat">
          <div className="stat-label">Totalt brukt</div>
          <div className="stat-value">{formatCurrency(summary.totalSpent)}</div>
        </article>
        <article className="stat">
          <div className="stat-label">Registrert betalt</div>
          <div className="stat-value">{formatCurrency(summary.totalPaid)}</div>
        </article>
        <article className="stat">
          <div className="stat-label">Fordelt på personer</div>
          <div className="stat-value">{formatCurrency(summary.totalUsed)}</div>
        </article>
        <article className="stat">
          <div className="stat-label">Ufordelt rest</div>
          <div className="stat-value">{formatCurrency(summary.unassignedTotal)}</div>
        </article>
        <article className="stat">
          <div className="stat-label">Mangler betaler</div>
          <div className="stat-value">{summary.missingPayerCount}</div>
        </article>
      </div>

      {summary.unassignedTotal > 0.02 ? (
        <p className="notice warning">
          Arrangementet har fortsatt {formatCurrency(summary.unassignedTotal)} som ikke er fordelt på personer ennå.
        </p>
      ) : null}

      {summary.missingPayerCount > 0 ? (
        <p className="notice warning">
          {summary.missingPayerCount} kvittering{summary.missingPayerCount === 1 ? "" : "er"} mangler fortsatt
          informasjon om hvem som betalte.
        </p>
      ) : null}

      <table className="mini-table">
        <thead>
          <tr>
            <th>Person</th>
            <th>Betalt</th>
            <th>Brukt</th>
            <th>Balanse</th>
          </tr>
        </thead>
        <tbody>
          {summary.members.map((member) => (
            <tr key={member.id}>
              <td>
                <strong>{member.name}</strong>
              </td>
              <td>{formatCurrency(member.paidTotal)}</td>
              <td>{formatCurrency(member.usedTotal)}</td>
              <td className={`balance-cell ${formatBalanceTone(member.balance)}`}>
                {formatBalanceText(member.balance)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function ManualReceiptForm({
  draft,
  fileName,
  paidByMemberId,
  members,
  submitting,
  onChangeFileName,
  onChangePaidByMember,
  onChangeField,
  onChangeRow,
  onInsertRow,
  onDeleteRow,
  onCreate,
  onCancel
}) {
  return (
    <section className="panel stack">
      <div className="job-head">
        <div className="job-meta">
          <div className="job-name">Manuell faktura</div>
          <div className="job-time">
            Bruk dette når du vil registrere en kostnad uten bilde, og så kontrollere eller fordele den senere.
          </div>
        </div>
        <div className="button-row">
          <button className="button button-secondary" type="button" onClick={onCancel}>
            Avbryt
          </button>
          <button className="button button-primary" type="button" onClick={onCreate} disabled={submitting}>
            {submitting ? "Oppretter..." : "Opprett manuell faktura"}
          </button>
        </div>
      </div>

      <div className="editor-grid">
        <label className="field">
          <span>Filnavn / tittel</span>
          <input type="text" value={fileName} onChange={(event) => onChangeFileName(event.target.value)} />
        </label>
        <label className="field">
          <span>Betalt av</span>
          <select
            className="select-input"
            value={paidByMemberId}
            onChange={(event) => onChangePaidByMember(event.target.value)}
          >
            <option value="">Ikke valgt ennå</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Butikk / Restaurant</span>
          <input
            type="text"
            value={draft.merchantName}
            onChange={(event) => onChangeField("merchantName", event.target.value)}
          />
        </label>
        <label className="field">
          <span>Kategori</span>
          <select
            className="select-input"
            value={draft.merchantCategory}
            onChange={(event) => onChangeField("merchantCategory", event.target.value)}
          >
            <option value="unknown">Ukjent</option>
            <option value="store">Butikk</option>
            <option value="restaurant">Restaurant</option>
          </select>
        </label>
        <label className="field">
          <span>Dato</span>
          <input
            type="text"
            value={draft.receiptDate}
            onChange={(event) => onChangeField("receiptDate", event.target.value)}
            placeholder="2026-06-02"
          />
        </label>
        <label className="field">
          <span>Tid</span>
          <input
            type="text"
            value={draft.receiptTime}
            onChange={(event) => onChangeField("receiptTime", event.target.value)}
            placeholder="18:42"
          />
        </label>
        <label className="field">
          <span>Valuta</span>
          <input type="text" value={draft.currency} onChange={(event) => onChangeField("currency", event.target.value)} />
        </label>
        <label className="field">
          <span>Kvittering total</span>
          <input
            type="text"
            inputMode="decimal"
            value={draft.grandTotal}
            onChange={(event) => onChangeField("grandTotal", event.target.value)}
          />
        </label>
        <label className="field">
          <span>Delsum</span>
          <input
            type="text"
            inputMode="decimal"
            value={draft.subtotal}
            onChange={(event) => onChangeField("subtotal", event.target.value)}
          />
        </label>
        <label className="field">
          <span>MVA</span>
          <input
            type="text"
            inputMode="decimal"
            value={draft.taxTotal}
            onChange={(event) => onChangeField("taxTotal", event.target.value)}
          />
        </label>
      </div>

      <div className="editor-actions">
        <div className="button-row">
          <button className="button button-secondary" type="button" onClick={onInsertRow}>
            Legg til rad
          </button>
        </div>
      </div>

      <div className="editable-rows">
        {draft.lineItems.map((item, index) => (
          <article className="editable-row" key={`manual-row-${index}`}>
            <div className="editable-row-head">
              <strong>Rad {index + 1}</strong>
              <div className="button-row compact">
                <button
                  className="button button-secondary danger-button"
                  type="button"
                  onClick={() => onDeleteRow(index)}
                  disabled={draft.lineItems.length === 1}
                >
                  Slett
                </button>
              </div>
            </div>

            <div className="editable-row-grid">
              <label className="field row-name-field">
                <span>Vare</span>
                <input
                  type="text"
                  value={item.name}
                  onChange={(event) => onChangeRow(index, "name", event.target.value)}
                />
              </label>
              <label className="field">
                <span>Antall</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={item.quantity}
                  onChange={(event) => onChangeRow(index, "quantity", event.target.value)}
                />
              </label>
              <label className="field">
                <span>Pris per vare</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={item.unitPrice}
                  onChange={(event) => onChangeRow(index, "unitPrice", event.target.value)}
                />
              </label>
              <label className="field">
                <span>Linjesum</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={item.lineTotal}
                  onChange={(event) => onChangeRow(index, "lineTotal", event.target.value)}
                />
              </label>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ReceiptEditor({
  sourceResult,
  draft,
  imageOpen,
  imageUrl,
  imageAvailable,
  historyDepth,
  actionMessage,
  onChangeField,
  onChangeRow,
  onInsertNameOnly,
  onInsertAmountsOnly,
  onInsertFullRow,
  onDeleteRow,
  onMoveRow,
  onCalculateUnitPrice,
  onCalculateLineTotal,
  onApplyRawField,
  onApplyRawRow,
  onUndo,
  onSave,
  onCancel,
  onToggleImage,
  saving
}) {
  const preview = useMemo(() => rebuildReceiptFromEditor(buildReceiptPayload(draft)), [draft]);
  const rawRows = useMemo(() => buildRawDataRows({ result: sourceResult, draft }), [sourceResult, draft]);
  const [openRawForRow, setOpenRawForRow] = useState(null);
  const [showReceiptRawTable, setShowReceiptRawTable] = useState(false);

  return (
    <section className="editor-card stack">
      <div className="job-head">
        <div className="job-meta">
          <div className="job-name">Kontroller kvitteringen</div>
          <div className="job-time">
            Bruk knapper for regnesteg og angre hvis du trykker feil. Forhåndsvisningen nederst viser
            hva som faktisk blir lagret.
          </div>
        </div>
        <div className="button-row">
          {imageAvailable ? (
            <button className="button button-secondary" type="button" onClick={onToggleImage}>
              {imageOpen ? "Skjul kvitteringsbilde" : "Se kvitteringsbilde"}
            </button>
          ) : null}
          <button className="button button-secondary" type="button" onClick={onUndo} disabled={historyDepth === 0}>
            Angre
          </button>
          <button className="button button-secondary" type="button" onClick={onCancel}>
            Lukk
          </button>
          <button className="button button-primary" type="button" onClick={onSave} disabled={saving}>
            {saving ? "Lagrer..." : "Lagre endringer"}
          </button>
        </div>
      </div>

      {actionMessage ? <p className="notice success">{actionMessage}</p> : null}

      <div className={`editor-layout ${imageOpen ? "with-receipt-preview" : ""}`}>
        <div className="editor-main stack">
          <div className="editor-grid">
            <label className="field">
              <span>Butikk / Restaurant</span>
              <input
                type="text"
                value={draft.merchantName}
                onChange={(event) => onChangeField("merchantName", event.target.value)}
              />
            </label>
            <label className="field">
              <span>Kategori</span>
              <select
                className="select-input"
                value={draft.merchantCategory}
                onChange={(event) => onChangeField("merchantCategory", event.target.value)}
              >
                <option value="unknown">Ukjent</option>
                <option value="store">Butikk</option>
                <option value="restaurant">Restaurant</option>
              </select>
            </label>
            <label className="field">
              <span>Dato</span>
              <input
                type="text"
                value={draft.receiptDate}
                onChange={(event) => onChangeField("receiptDate", event.target.value)}
                placeholder="2026-06-02"
              />
            </label>
            <label className="field">
              <span>Tid</span>
              <input
                type="text"
                value={draft.receiptTime}
                onChange={(event) => onChangeField("receiptTime", event.target.value)}
                placeholder="18:42"
              />
            </label>
            <label className="field">
              <span>Valuta</span>
              <input
                type="text"
                value={draft.currency}
                onChange={(event) => onChangeField("currency", event.target.value)}
              />
            </label>
            <label className="field">
              <span>Kvittering total</span>
              <input
                type="text"
                inputMode="decimal"
                value={draft.grandTotal}
                onChange={(event) => onChangeField("grandTotal", event.target.value)}
              />
            </label>
            <label className="field">
              <span>Delsum</span>
              <input
                type="text"
                inputMode="decimal"
                value={draft.subtotal}
                onChange={(event) => onChangeField("subtotal", event.target.value)}
              />
            </label>
            <label className="field">
              <span>MVA</span>
              <input
                type="text"
                inputMode="decimal"
                value={draft.taxTotal}
                onChange={(event) => onChangeField("taxTotal", event.target.value)}
              />
            </label>
          </div>

          <div className="editor-actions">
            <div className="button-row">
              <button className="button button-secondary" type="button" onClick={() => onInsertFullRow(draft.lineItems.length)}>
                Legg til tom rad nederst
              </button>
              <button
                className="button button-secondary"
                type="button"
                onClick={() => setShowReceiptRawTable((current) => !current)}
              >
                {showReceiptRawTable ? "Skjul råtabell" : "Vis råtabell fra hele kvitteringen"}
              </button>
            </div>
            <p className="muted">
              Bruk “Sett inn navn” når varen mangler men prisene allerede står riktig. Bruk “Sett inn pris”
              når prisen mangler men navnene allerede står riktig.
            </p>
          </div>

          {showReceiptRawTable ? (
            <div className="raw-data-panel">
              <div className="raw-data-head">
                <strong>Råtabell fra hele kvitteringen</strong>
                <span className="muted">
                  Dette er en best mulig tabellvisning av rålinjene. Hvis antall eller pris er tolket feil,
                  kan du åpne en rad under og hente riktig felt herfra.
                </span>
              </div>
              {!sourceResult?.tableRows?.length ? (
                <p className="notice">
                  Denne analysen ble laget før appen begynte å lagre full råtabell. Derfor starter oversikten med
                  varelinjer og notater vi allerede har, men en ny analyse av samme kvittering vil gi bedre grunnlag
                  for antall og kolonnevalg.
                </p>
              ) : null}
              <RawDataTable rows={rawRows} />
            </div>
          ) : null}

          <div className="editable-rows">
            {draft.lineItems.map((item, index) => (
              <article className="editable-row" key={`edit-row-${index}`}>
                <div className="editable-row-head">
                  <strong>Rad {index + 1}</strong>
                  <div className="button-row compact">
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={() => onMoveRow(index, -1)}
                      disabled={index === 0}
                    >
                      Opp
                    </button>
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={() => onMoveRow(index, 1)}
                      disabled={index === draft.lineItems.length - 1}
                    >
                      Ned
                    </button>
                    <button className="button button-secondary" type="button" onClick={() => onInsertNameOnly(index)}>
                      Sett inn navn
                    </button>
                    <button className="button button-secondary" type="button" onClick={() => onInsertAmountsOnly(index)}>
                      Sett inn pris
                    </button>
                    <button className="button button-secondary" type="button" onClick={() => onInsertFullRow(index)}>
                      Sett inn hel rad
                    </button>
                    <button
                      className="button button-secondary danger-button"
                      type="button"
                      onClick={() => onDeleteRow(index)}
                      disabled={draft.lineItems.length === 1}
                    >
                      Slett
                    </button>
                  </div>
                </div>

                <div className="editable-row-grid">
                  <label className="field row-name-field">
                    <span>Vare</span>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(event) => onChangeRow(index, "name", event.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>Antall</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={item.quantity}
                      onChange={(event) => onChangeRow(index, "quantity", event.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>Pris per vare</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={item.unitPrice}
                      onChange={(event) => onChangeRow(index, "unitPrice", event.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>Linjesum</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={item.lineTotal}
                      onChange={(event) => onChangeRow(index, "lineTotal", event.target.value)}
                    />
                  </label>
                </div>

                <div className="button-row compact">
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => onCalculateUnitPrice(index)}
                    disabled={!canCalculateUnitPrice(item)}
                  >
                    Regn ut pris pr
                  </button>
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => onCalculateLineTotal(index)}
                    disabled={!canCalculateLineTotal(item)}
                  >
                    Regn ut total
                  </button>
                </div>

                <label className="field">
                  <span>Rå tekstlinje fra OCR (valgfritt)</span>
                  <input
                    type="text"
                    value={item.rawLine}
                    onChange={(event) => onChangeRow(index, "rawLine", event.target.value)}
                  />
                </label>

                <div className="button-row compact">
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => setOpenRawForRow((current) => (current === index ? null : index))}
                  >
                    {openRawForRow === index ? "Skjul rådata" : "Velg fra rådata"}
                  </button>
                </div>

                {openRawForRow === index ? (
                  <div className="raw-data-panel">
                    <div className="raw-data-head">
                      <strong>Råtabell for rad {index + 1}</strong>
                      <span className="muted">
                        Velg en annen kildelinje eller bruk et enkeltfelt som antall, pris eller linjesum fra en
                        annen rad i originaltabellen.
                      </span>
                    </div>
                    {!sourceResult?.tableRows?.length ? (
                      <p className="notice">
                        Denne kvitteringen mangler full råtabell fra første analyse. Rålinjene under er fortsatt
                        nyttige, men en ny analyse av samme bilde vil gi bedre treff på antall.
                      </p>
                    ) : null}

                    <RawDataTable
                      rows={rawRows}
                      selectedRawLine={item.rawLine}
                      onApplyField={(field, candidate, row) => {
                        onApplyRawField(index, field, candidate.value, row.text);
                        setOpenRawForRow(null);
                      }}
                      onApplyWholeRow={(row) => {
                        onApplyRawRow(index, row);
                        setOpenRawForRow(null);
                      }}
                    />
                  </div>
                ) : null}
              </article>
            ))}
          </div>

          <div className="stack">
            <p className="eyebrow">Forhåndsvisning</p>
            <ReceiptResult result={preview} />
          </div>
        </div>

        {imageOpen ? (
          <aside className="editor-aside">
            <div className="receipt-image-panel sticky-receipt-panel">
              <div className="raw-data-head">
                <strong>Original kvittering</strong>
                <span className="muted">Denne holder seg synlig mens du scroller i editoren.</span>
              </div>
              <img className="receipt-image" src={imageUrl} alt="Originalt kvitteringsbilde" />
            </div>
          </aside>
        ) : null}
      </div>
    </section>
  );
}

function DistributionView({
  distribution,
  result,
  onClose,
  onReset,
  onAddParticipant,
  onSetActiveParticipant,
  onAssignWhole,
  onSplitAllEqually,
  onSplitEntryEqually,
  onSplitEntry,
  onRemoveAssignment,
  onExportDistribution,
  onExportParticipant
}) {
  const [newParticipantName, setNewParticipantName] = useState("");
  const [quantityDrafts, setQuantityDrafts] = useState({});
  const [splitOpenEntryId, setSplitOpenEntryId] = useState(null);
  const [splitDrafts, setSplitDrafts] = useState({});
  const [selectedEqualSplitIds, setSelectedEqualSplitIds] = useState(
    distribution.participants.map((participant) => participant.id)
  );
  const summary = useMemo(() => summarizeDistribution(distribution), [distribution]);
  const activeParticipant = distribution.participants.find(
    (participant) => participant.id === distribution.activeParticipantId
  );

  useEffect(() => {
    setSelectedEqualSplitIds((current) => {
      const validIds = distribution.participants.map((participant) => participant.id);
      const filtered = current.filter((id) => validIds.includes(id));
      return filtered.length > 0 ? filtered : validIds;
    });
  }, [distribution.participants]);

  function getQuantityDraft(entryId) {
    return quantityDrafts[entryId] || "1";
  }

  function getSplitDraft(entryId, participantId) {
    return splitDrafts[entryId]?.[participantId] || "";
  }

  function toggleEqualSplitMember(participantId) {
    setSelectedEqualSplitIds((current) =>
      current.includes(participantId)
        ? current.filter((id) => id !== participantId)
        : [...current, participantId]
    );
  }

  return (
    <section className="distribution-card stack">
      <div className="job-head">
        <div className="job-meta">
          <div className="job-name">Fordel regningen</div>
          <div className="job-time">
            Velg hvem som handler nå, flytt varer inn i handlekurver, og fordel delte kostnader med
            prosentandeler.
          </div>
        </div>
        <div className="button-row">
          <button className="button button-secondary" type="button" onClick={() => onExportDistribution("xlsx")}>
            Last ned fordeling Excel
          </button>
          <button className="button button-secondary" type="button" onClick={() => onExportDistribution("pdf")}>
            Last ned fordeling PDF
          </button>
          <button className="button button-secondary" type="button" onClick={onReset}>
            Nullstill fordeling
          </button>
          <button className="button button-secondary" type="button" onClick={onClose}>
            Lukk
          </button>
        </div>
      </div>

      <div className="distribution-summary">
        <article className="stat">
          <div className="stat-label">Kvittering total</div>
          <div className="stat-value">{formatCurrency(result.grandTotal)}</div>
        </article>
        <article className="stat">
          <div className="stat-label">Fordelt hittil</div>
          <div className="stat-value">
            {formatCurrency(
              summary.participants.reduce((sum, participant) => sum + participant.total, 0)
            )}
          </div>
        </article>
        <article className="stat">
          <div className="stat-label">Gjenstår å fordele</div>
          <div className="stat-value">{formatCurrency(summary.remainingTotal)}</div>
        </article>
      </div>

      <div className="participants-panel">
        <div className="button-row participant-chips">
          {distribution.participants.map((participant) => (
            <button
              key={participant.id}
              className={`button button-secondary participant-chip ${
                distribution.activeParticipantId === participant.id ? "active-chip" : ""
              }`}
              type="button"
              onClick={() => onSetActiveParticipant(participant.id)}
            >
              {participant.name}
            </button>
          ))}
        </div>

        <div className="button-row">
          <input
            className="inline-input"
            type="text"
            value={newParticipantName}
            onChange={(event) => setNewParticipantName(event.target.value)}
            placeholder="Legg til person"
          />
          <button
            className="button button-secondary"
            type="button"
            onClick={() => {
              onAddParticipant(newParticipantName);
              setNewParticipantName("");
            }}
          >
            Legg til person
          </button>
        </div>

        <div className="equal-split-panel stack">
          <div className="section-header">
            <h3>Del likt på valgte medlemmer</h3>
            <p className="muted">
              Velg hvem som skal være med i likefordelingen, og bruk dette enten på én rad eller på hele kvitteringen.
            </p>
          </div>
          <div className="button-row participant-chips">
            {distribution.participants.map((participant) => {
              const selected = selectedEqualSplitIds.includes(participant.id);

              return (
                <button
                  key={`equal-${participant.id}`}
                  className={`button button-secondary participant-chip ${selected ? "active-chip" : ""}`}
                  type="button"
                  onClick={() => toggleEqualSplitMember(participant.id)}
                >
                  {participant.name}
                </button>
              );
            })}
          </div>
          <div className="button-row">
            <button
              className="button button-secondary"
              type="button"
              onClick={() => setSelectedEqualSplitIds(distribution.participants.map((participant) => participant.id))}
            >
              Velg alle
            </button>
            <button
              className="button button-secondary"
              type="button"
              onClick={() => setSelectedEqualSplitIds([])}
            >
              Fjern alle valg
            </button>
            <button
              className="button button-primary"
              type="button"
              onClick={() => onSplitAllEqually(selectedEqualSplitIds)}
              disabled={selectedEqualSplitIds.length === 0}
            >
              Fordel hele kvitteringen likt
            </button>
          </div>
        </div>
      </div>

      <div className="distribution-layout">
        <div className="distribution-column stack">
          <div className="section-header">
            <h3>Gjenstående varer</h3>
            <p className="muted">
              Aktiv handlekurv: <strong>{activeParticipant?.name || "Velg en person"}</strong>
            </p>
          </div>

          {summary.remainingEntries.length === 0 ? (
            <p className="notice success">Alle varer er nå fordelt.</p>
          ) : (
            summary.remainingEntries.map((entry) => (
              <article className="distribution-item" key={entry.id}>
                <div className="distribution-item-head">
                  <div>
                    <strong>{entry.name}</strong>
                    <p className="muted">
                      Gjenstår {entry.remainingQuantity} stk, pris pr {formatCurrency(entry.unitPrice)}, sum{" "}
                      {formatCurrency(entry.remainingTotal)}
                    </p>
                  </div>
                  <div className="button-row compact">
                    <input
                      className="inline-input quantity-input"
                      type="text"
                      inputMode="decimal"
                      value={getQuantityDraft(entry.id)}
                      onChange={(event) =>
                        setQuantityDrafts((current) => ({
                          ...current,
                          [entry.id]: event.target.value
                        }))
                      }
                    />
                    <button
                      className="button button-primary"
                      type="button"
                      onClick={() =>
                        onAssignWhole(entry.id, distribution.activeParticipantId, getQuantityDraft(entry.id))
                      }
                      disabled={!distribution.activeParticipantId}
                    >
                      Legg i handlekurv
                    </button>
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={() =>
                        setSplitOpenEntryId((current) => (current === entry.id ? null : entry.id))
                      }
                    >
                      Del kostnad
                    </button>
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={() => onSplitEntryEqually(entry.id, selectedEqualSplitIds)}
                      disabled={selectedEqualSplitIds.length === 0}
                    >
                      Del likt på valgte
                    </button>
                  </div>
                </div>

                {splitOpenEntryId === entry.id ? (
                  <div className="split-editor stack">
                    <p className="muted">
                      Fyll inn prosentandeler. Du kan fordele hele eller deler av den gjenstående kostnaden.
                    </p>
                    <div className="split-grid">
                      {distribution.participants.map((participant) => (
                        <label className="field" key={`${entry.id}-${participant.id}`}>
                          <span>{participant.name}</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={getSplitDraft(entry.id, participant.id)}
                            onChange={(event) =>
                              setSplitDrafts((current) => ({
                                ...current,
                                [entry.id]: {
                                  ...(current[entry.id] || {}),
                                  [participant.id]: event.target.value
                                }
                              }))
                            }
                            placeholder="0"
                          />
                        </label>
                      ))}
                    </div>
                    <div className="button-row">
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={() => {
                          const shares = distribution.participants.map((participant) => ({
                            participantId: participant.id,
                            percent: getSplitDraft(entry.id, participant.id)
                          }));
                          onSplitEntry(entry.id, shares);
                          setSplitOpenEntryId(null);
                        }}
                      >
                        Fordel andeler
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            ))
          )}
        </div>

        <div className="distribution-column stack">
          <div className="section-header">
            <h3>Handlekurver</h3>
            <p className="muted">Du kan fjerne enkeltlinjer fra en handlekurv hvis noe ble feil.</p>
          </div>

          <div className="cart-grid">
            {summary.participants.map((participant) => (
              <article className="cart-card" key={participant.id}>
                <div className="cart-head">
                  <div className="cart-title-text">{participant.name}</div>
                  <strong>{formatCurrency(participant.total)}</strong>
                </div>

                <div className="button-row compact">
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => onExportParticipant(participant.id, participant.name, "xlsx")}
                  >
                    Eksporter Excel
                  </button>
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => onExportParticipant(participant.id, participant.name, "pdf")}
                  >
                    Eksporter PDF
                  </button>
                </div>

                {participant.assignments.length === 0 ? (
                  <p className="muted">Ingen varer lagt til ennå.</p>
                ) : (
                  <div className="cart-lines">
                    {participant.assignments.map((assignment) => (
                      <div className="cart-line" key={assignment.id}>
                        <div>
                          <strong>{assignment.label}</strong>
                          <p className="muted">
                            {assignment.type === "split"
                              ? `${assignment.percent}% andel`
                              : `${assignment.quantity} stk`}{" "}
                            • {formatCurrency(assignment.amount)}
                          </p>
                        </div>
                        <button
                          className="button button-secondary"
                          type="button"
                          onClick={() => onRemoveAssignment(assignment.entryId, assignment.id)}
                        >
                          Fjern
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function DashboardClient({
  initialJobs,
  initialEvents,
  initialSelectedEventId = null,
  embeddedMode = false
}) {
  const [jobs, setJobs] = useState(initialJobs);
  const [events, setEvents] = useState(initialEvents);
  const [selectedEventId, setSelectedEventId] = useState(
    initialSelectedEventId || initialEvents[0]?.id || null
  );
  const [status, setStatus] = useState(
    "Velg et kvitteringsbilde. Appen lagrer det lokalt og analyserer med lokal Ollama."
  );
  const [submitting, setSubmitting] = useState(false);
  const [savingJobId, setSavingJobId] = useState(null);
  const [localAiHealth, setLocalAiHealth] = useState(DEFAULT_LOCAL_AI_HEALTH);
  const [editingJobId, setEditingJobId] = useState(null);
  const [distributionJobId, setDistributionJobId] = useState(null);
  const [imageOpenForJobId, setImageOpenForJobId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [draftHistory, setDraftHistory] = useState([]);
  const [editorActionMessage, setEditorActionMessage] = useState("");
  const [distributionState, setDistributionState] = useState(null);
  const [exportStatus, setExportStatus] = useState("");
  const [exportLinks, setExportLinks] = useState([]);
  const [newEventName, setNewEventName] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualDraft, setManualDraft] = useState(createEmptyReceiptDraft());
  const [manualFileName, setManualFileName] = useState("Manuell faktura");
  const [manualPaidByMemberId, setManualPaidByMemberId] = useState("");
  const [manualSubmitting, setManualSubmitting] = useState(false);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEventId]
  );
  const visibleJobs = useMemo(
    () => jobs.filter((job) => job.event_id === selectedEventId),
    [jobs, selectedEventId]
  );
  const eventSettlement = useMemo(
    () => (selectedEvent ? buildEventSettlement(selectedEvent, visibleJobs) : null),
    [selectedEvent, visibleJobs]
  );

  useEffect(() => {
    if (!initialSelectedEventId) {
      return;
    }

    setSelectedEventId(initialSelectedEventId);
  }, [initialSelectedEventId]);

  const stats = useMemo(() => {
    return {
      processing: jobs.filter((job) => job.status === "processing").length,
      completed: jobs.filter((job) => job.status === "completed").length,
      failed: jobs.filter((job) => job.status === "failed").length
    };
  }, [jobs]);

  useEffect(() => {
    if (submitting || savingJobId || editingJobId) {
      return undefined;
    }

    let cancelled = false;

    async function refresh() {
      try {
        const [jobsResponse, healthResponse, eventsResponse] = await Promise.all([
          fetch("/api/receipts", {
            method: "GET",
            cache: "no-store"
          }),
          fetch("/api/local-ai", {
            method: "GET",
            cache: "no-store"
          }),
          fetch("/api/events", {
            method: "GET",
            cache: "no-store"
          })
        ]);

        if (!jobsResponse.ok) {
          return;
        }

        const jobsPayload = await jobsResponse.json();
        const healthPayload = healthResponse.ok ? await healthResponse.json() : DEFAULT_LOCAL_AI_HEALTH;
        const eventsPayload = eventsResponse.ok ? await eventsResponse.json() : { events: [] };

        if (!cancelled) {
          setJobs(jobsPayload.jobs || []);
          setLocalAiHealth(healthPayload);
          setEvents(eventsPayload.events || []);
        }
      } catch {
        // Ignore transient refresh issues.
      }
    }

    refresh();
    const timer = window.setInterval(refresh, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [editingJobId, savingJobId, submitting]);

  useEffect(() => {
    if (!distributionJobId || !distributionState) {
      return;
    }

    saveDistributionState(distributionJobId, distributionState);
    setJobs((current) =>
      current.map((job) =>
        job.id === distributionJobId ? { ...job, distribution_state: distributionState } : job
      )
    );

    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/receipts/${distributionJobId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            distributionState
          })
        });
        const payload = await response.json();

        if (response.ok) {
          setJobs((current) =>
            current.map((job) => (job.id === distributionJobId ? payload.job : job))
          );
        }
      } catch {
        // Keep local state; next interaction or refresh can retry.
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [distributionJobId, distributionState]);

  async function updateReceiptMetadata(jobId, updates, successMessage = "") {
    const response = await fetch(`/api/receipts/${jobId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(updates)
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Kunne ikke oppdatere kvitteringen.");
    }

    setJobs((current) => current.map((job) => (job.id === jobId ? payload.job : job)));

    if (successMessage) {
      setStatus(successMessage);
    }

    return payload.job;
  }

  async function handleUpload(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    if (!selectedEventId) {
      setStatus("Opprett eller velg et arrangement før du laster opp kvitteringer.");
      return;
    }

    formData.set("eventId", selectedEventId);

    setSubmitting(true);
    setStatus("Laster opp, saniterer og analyserer lokalt. Dette kan ta litt tid.");

    try {
      const response = await fetch("/api/receipts", {
        method: "POST",
        body: formData
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Kunne ikke opprette jobb.");
      }

      const nextJobs = Array.isArray(payload.jobs) ? payload.jobs : payload.job ? [payload.job] : [];

      setJobs((current) => {
        const nextIds = new Set(nextJobs.map((job) => job.id));
        const rest = current.filter((job) => !nextIds.has(job.id));
        return [...nextJobs, ...rest];
      });

      const completedCount = nextJobs.filter((job) => job.status === "completed").length;
      const failedCount = nextJobs.filter((job) => job.status === "failed").length;
      setStatus(
        nextJobs.length > 1
          ? `Ferdig med ${nextJobs.length} kvitteringer. ${completedCount} ferdige, ${failedCount} feilet.`
          : completedCount === 1
            ? "Kvitteringen er analysert lokalt."
            : "Analysen feilet. Se feilmeldingen under jobben."
      );
      form.reset();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Kunne ikke laste opp kvitteringen.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateEvent(event) {
    event.preventDefault();

    const name = newEventName.trim();
    if (!name) {
      setStatus("Skriv inn navn på arrangementet først.");
      return;
    }

    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Kunne ikke opprette arrangementet.");
      }

      setEvents((current) => [payload.event, ...current]);
      setSelectedEventId(payload.event.id);
      setNewEventName("");
      setStatus("Arrangement opprettet.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Kunne ikke opprette arrangementet.");
    }
  }

  async function handleAddMember(event) {
    event.preventDefault();

    if (!selectedEventId) {
      setStatus("Velg et arrangement først.");
      return;
    }

    const name = newMemberName.trim();
    if (!name) {
      setStatus("Skriv inn navnet på medlemmet først.");
      return;
    }

    try {
      const response = await fetch(`/api/events/${selectedEventId}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Kunne ikke legge til medlem.");
      }

      setEvents((current) =>
        current.map((item) => (item.id === payload.event.id ? payload.event : item))
      );
      setNewMemberName("");
      setStatus("Medlem lagt til i arrangementet.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Kunne ikke legge til medlem.");
    }
  }

  async function downloadExport(payload, filenameHint) {
    setExportStatus("Lager eksportfil...");

    try {
      const response = await fetch("/api/exports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload.error || "Kunne ikke lage eksportfilen.");
      }

      const payloadJson = await response.json();
      const nextLink = {
        filename: payloadJson.filename || filenameHint,
        url: payloadJson.downloadUrl
      };

      setExportLinks((current) => [nextLink, ...current].slice(0, 8));
      setExportStatus("Eksportfil er klar. Bruk lenken under for å laste ned uten å forlate denne visningen.");
    } catch (error) {
      setExportStatus(error instanceof Error ? error.message : "Kunne ikke lage eksportfilen.");
    }
  }

  function applyDraftChange(updater, message = "") {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      const next = updater(current);

      if (next !== current) {
        setDraftHistory((history) => [current, ...history].slice(0, 50));
      }

      return next;
    });
    setEditorActionMessage(message);
  }

  function resetManualForm() {
    setManualDraft(createEmptyReceiptDraft());
    setManualFileName("Manuell faktura");
    setManualPaidByMemberId("");
    setShowManualForm(false);
  }

  async function handleCreateManualReceipt() {
    if (!selectedEventId) {
      setStatus("Velg et arrangement før du oppretter en manuell faktura.");
      return;
    }

    setManualSubmitting(true);
    setStatus("Oppretter manuell faktura.");

    try {
      const response = await fetch("/api/receipts/manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          eventId: selectedEventId,
          fileName: manualFileName,
          paidByMemberId: manualPaidByMemberId || null,
          result: buildReceiptPayload(manualDraft)
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Kunne ikke opprette manuell faktura.");
      }

      setJobs((current) => [payload.job, ...current]);
      resetManualForm();
      setStatus("Manuell faktura opprettet.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Kunne ikke opprette manuell faktura.");
    } finally {
      setManualSubmitting(false);
    }
  }

  function startEditing(job) {
    setDistributionJobId(null);
    setDistributionState(null);
    setEditingJobId(job.id);
    setDraft(createDraftFromResult(job.result));
    setDraftHistory([]);
    setEditorActionMessage("");
    setImageOpenForJobId(null);
    setStatus("Du kontrollerer nå analysen lokalt. Bruk knapper for utregning og angre ved behov.");
  }

  function stopEditing() {
    setEditingJobId(null);
    setImageOpenForJobId(null);
    setDraft(null);
    setDraftHistory([]);
    setEditorActionMessage("");
  }

  function undoDraftChange() {
    setDraftHistory((history) => {
      if (history.length === 0) {
        return history;
      }

      const [previous, ...rest] = history;
      setDraft(previous);
      return rest;
    });
    setEditorActionMessage("Siste endring er angret.");
  }

  async function saveDraft(jobId) {
    if (!draft) {
      return;
    }

    setSavingJobId(jobId);
    setStatus("Lagrer endringene lokalt og regner oppsummeringen på nytt.");

    try {
      const response = await fetch(`/api/receipts/${jobId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          result: buildReceiptPayload(draft),
          distributionState: null
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Kunne ikke lagre endringene.");
      }

      clearDistributionState(jobId);
      setJobs((current) => current.map((job) => (job.id === jobId ? payload.job : job)));
      stopEditing();
      setStatus("Endringene er lagret.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Kunne ikke lagre endringene.");
    } finally {
      setSavingJobId(null);
    }
  }

  function startDistribution(job) {
    stopEditing();
    setDistributionJobId(job.id);
    const eventMembers = events.find((event) => event.id === job.event_id)?.members || [];
    setDistributionState(loadDistributionState(job, eventMembers));
    setStatus("Du fordeler nå regningen mellom personer. Gjenstående varer blir liggende igjen til høyre.");
  }

  function stopDistribution() {
    setDistributionJobId(null);
    setDistributionState(null);
  }

  return (
    <div className="grid stack">
      <section className={`dashboard-layout ${embeddedMode ? "embedded-dashboard-layout" : ""}`}>
        {!embeddedMode ? (
          <aside className="panel stack event-sidebar">
            <div className="stack">
              <p className="eyebrow">Hovedmeny</p>
              <h2>Arrangementer</h2>
              <p className="muted">
                Opprett arrangementer, legg til medlemmer, og sorter alle kvitteringer under riktig arrangement.
              </p>
            </div>

            <form className="stack" onSubmit={handleCreateEvent}>
              <label className="field">
                <span>Nytt arrangement</span>
                <input
                  type="text"
                  value={newEventName}
                  onChange={(event) => setNewEventName(event.target.value)}
                  placeholder="Sommerfest 2026"
                />
              </label>
              <button className="button button-primary" type="submit">
                Opprett arrangement
              </button>
            </form>

            <div className="event-list">
              {events.length === 0 ? (
                <p className="notice">Ingen arrangementer ennå. Opprett det første for å komme i gang.</p>
              ) : (
                events.map((event) => (
                  <button
                    key={event.id}
                    className={`event-list-item ${selectedEventId === event.id ? "active-event" : ""}`}
                    type="button"
                    onClick={() => setSelectedEventId(event.id)}
                  >
                    <strong>{event.name}</strong>
                    <span>{(event.members || []).length} medlemmer</span>
                  </button>
                ))
              )}
            </div>
          </aside>
        ) : null}

        <div className="grid stack">
      <div className="stats">
        <article className="stat">
          <div className="stat-label">Ollama</div>
          <div className={`stat-value status-inline ${localAiTone(localAiHealth)}`}>
            <span className={`status-dot ${localAiTone(localAiHealth)}`} />
            {localAiLabel(localAiHealth)}
          </div>
        </article>
        <article className="stat">
          <div className="stat-label">Modell</div>
          <div className="stat-value">{localAiHealth.configuredModel}</div>
        </article>
        <article className="stat">
          <div className="stat-label">Lokal modus</div>
          <div className="stat-value">Kun denne maskinen</div>
        </article>
        <article className="stat">
          <div className="stat-label">Lagring</div>
          <div className="stat-value">
            <code>local-data/</code>
          </div>
        </article>
        <article className="stat">
          <div className="stat-label">Pågår</div>
          <div className="stat-value">{stats.processing}</div>
        </article>
        <article className="stat">
          <div className="stat-label">Ferdige</div>
          <div className="stat-value">{stats.completed}</div>
        </article>
        <article className="stat">
          <div className="stat-label">Feilet</div>
          <div className="stat-value">{stats.failed}</div>
        </article>
      </div>

      <section className="panel upload-card stack">
        <div className="stack">
          <p className="eyebrow">{embeddedMode ? "Kvitteringsmotor" : "Ny analyse"}</p>
          <h2>
            {selectedEvent ? `Legg kvitteringer i ${selectedEvent.name}` : "Velg et arrangement først"}
          </h2>
          <p className="lede">
            Bildet re-enkodes og lagres lokalt i prosjektmappen. Deretter sendes det direkte til
            lokal Ollama over <code>localhost</code>.
          </p>
          <p className="notice">
            Før første analyse: kjør <code>npm run ai:serve</code> i ett terminalvindu, og
            installer modellen med <code>npm run ai:pull</code> hvis den ikke allerede finnes.
          </p>
        </div>

        <form className="stack" onSubmit={handleUpload}>
          <label className="field">
            <span>Kvitteringsbilder</span>
            <input
              type="file"
              name="receipt"
              accept="image/jpeg,image/png,image/webp"
              multiple
              required
            />
          </label>

          <div className="button-row">
            <button
              className="button button-primary"
              type="submit"
              disabled={submitting || !localAiHealth.ready || !selectedEvent}
            >
              {submitting
                ? "Analyserer..."
                : localAiHealth.ready
                  ? "Analyser kvittering"
                  : "Venter på lokal Ollama"}
            </button>
            <button
              className="button button-secondary"
              type="button"
              onClick={() => setShowManualForm((current) => !current)}
              disabled={!selectedEvent}
            >
              {showManualForm ? "Skjul manuell faktura" : "Opprett manuell faktura"}
            </button>
          </div>
        </form>

        <p className={`notice ${localAiTone(localAiHealth) === "success" ? "success" : "warning"}`}>
          {localAiHealth.message}
        </p>
        <p className="notice">{status}</p>
        {exportStatus ? <p className="notice">{exportStatus}</p> : null}
        {exportLinks.length > 0 ? (
          <div className="export-links">
            {exportLinks.map((item) => (
              <a className="export-link" key={`${item.url}-${item.filename}`} href={item.url} target="_blank" rel="noreferrer">
                {item.filename}
              </a>
            ))}
          </div>
        ) : null}
      </section>

      {showManualForm && selectedEvent ? (
        <ManualReceiptForm
          draft={manualDraft}
          fileName={manualFileName}
          paidByMemberId={manualPaidByMemberId}
          members={selectedEvent.members || []}
          submitting={manualSubmitting}
          onChangeFileName={setManualFileName}
          onChangePaidByMember={setManualPaidByMemberId}
          onChangeField={(field, value) => setManualDraft((current) => ({ ...current, [field]: value }))}
          onChangeRow={(index, field, value) =>
            setManualDraft((current) => ({
              ...current,
              lineItems: current.lineItems.map((row, rowIndex) =>
                rowIndex === index ? { ...row, [field]: value } : row
              )
            }))
          }
          onInsertRow={() =>
            setManualDraft((current) => ({
              ...current,
              lineItems: insertFullRow(current.lineItems, current.lineItems.length)
            }))
          }
          onDeleteRow={(index) =>
            setManualDraft((current) => ({
              ...current,
              lineItems: current.lineItems.filter((_, rowIndex) => rowIndex !== index)
            }))
          }
          onCreate={handleCreateManualReceipt}
          onCancel={resetManualForm}
        />
      ) : null}

      <section className="panel stack">
        <div className="job-head">
          <div className="job-meta">
            <div className="job-name">
              {selectedEvent ? `Medlemmer i ${selectedEvent.name}` : "Medlemmer"}
            </div>
            <div className="job-time">
              Medlemmene brukes som personer når du fordeler en kvittering.
            </div>
          </div>
        </div>

        {!embeddedMode ? (
          <form className="button-row member-form" onSubmit={handleAddMember}>
            <input
              className="inline-input"
              type="text"
              value={newMemberName}
              onChange={(event) => setNewMemberName(event.target.value)}
              placeholder="Legg til nytt medlem"
              disabled={!selectedEvent}
            />
            <button className="button button-secondary" type="submit" disabled={!selectedEvent}>
              Legg til medlem
            </button>
          </form>
        ) : null}

        {selectedEvent ? (
          selectedEvent.members?.length ? (
            <>
              <div className="member-overview">
                <div>
                  <strong>{selectedEvent.members.length} medlemmer</strong>
                  <p className="muted">Alle ligger klare for fordeling og likefordeling.</p>
                </div>
              </div>
              <div className="member-list">
                {selectedEvent.members.map((member) => (
                  <div className="member-chip" key={member.id}>
                    <span className="member-chip-avatar" aria-hidden="true">
                      {memberInitials(member.name)}
                    </span>
                    <span className="member-chip-name">{member.name}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="notice">Ingen medlemmer ennå. Legg til første person som skal kunne få deler av regninger.</p>
          )
        ) : (
          <p className="notice">Velg et arrangement for å se og legge til medlemmer.</p>
        )}
      </section>

      {selectedEvent ? (
        <EventOverview
          summary={eventSettlement}
          onExport={(format) =>
            downloadExport(
              {
                kind: "event",
                format,
                event: selectedEvent,
                jobs: visibleJobs
              },
              `${selectedEvent.name || "arrangement"}.${format}`
            )
          }
        />
      ) : null}

      <section className="jobs">
        {visibleJobs.length === 0 ? (
          <article className="panel notice">
            {selectedEvent
              ? "Ingen kvitteringer i dette arrangementet ennå. Last opp den første for å starte."
              : "Velg eller opprett et arrangement for å se kvitteringer."}
          </article>
        ) : (
          visibleJobs.map((job) => {
            const isEditing = editingJobId === job.id && draft;
            const isDistributing = distributionJobId === job.id && distributionState;
            const imageOpen = imageOpenForJobId === job.id;
            const hasReceiptImage = Boolean(job.stored_image_path);

            return (
              <article className="job-card" key={job.id}>
                <div className="job-head">
                  <div className="job-meta">
                    <div className="job-name">{job.original_filename || "Uten filnavn"}</div>
                    <div className="job-time">Opprettet {formatDateTime(job.created_at)}</div>
                  </div>
                  <span className={`pill ${job.status}`}>{statusLabel(job.status)}</span>
                </div>

                {job.error_message ? <p className="notice warning">{job.error_message}</p> : null}
                {job.result ? <ReceiptResult result={job.result} /> : null}

                {job.result && selectedEvent?.members?.length ? (
                  <div className="payer-panel">
                    <label className="field payer-field">
                      <span>Betalt av</span>
                      <select
                        className="select-input"
                        value={job.paid_by_member_id || ""}
                        onChange={async (event) => {
                          const nextValue = event.target.value || null;
                          setJobs((current) =>
                            current.map((item) =>
                              item.id === job.id ? { ...item, paid_by_member_id: nextValue } : item
                            )
                          );

                          try {
                            await updateReceiptMetadata(
                              job.id,
                              { paidByMemberId: nextValue },
                              nextValue
                                ? "Betaler er oppdatert på kvitteringen."
                                : "Betaler er fjernet fra kvitteringen."
                            );
                          } catch (error) {
                            setStatus(
                              error instanceof Error
                                ? error.message
                                : "Kunne ikke oppdatere hvem som betalte."
                            );
                          }
                        }}
                      >
                        <option value="">Ikke valgt ennå</option>
                        {selectedEvent.members.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <p className="muted">
                      Hele kvitteringens total føres som betalt av denne personen i arrangementsbalansen.
                    </p>
                  </div>
                ) : null}

                {job.result ? (
                  <div className="button-row">
                    <button className="button button-secondary" type="button" onClick={() => startEditing(job)}>
                      Kontroller regning
                    </button>
                    <button className="button button-secondary" type="button" onClick={() => startDistribution(job)}>
                      Fordel regning
                    </button>
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={() =>
                        downloadExport(
                          {
                            kind: "registered",
                            format: "xlsx",
                            result: job.result
                          },
                          "registrert-kostnad.xlsx"
                        )
                      }
                    >
                      Registrert Excel
                    </button>
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={() =>
                        downloadExport(
                          {
                            kind: "registered",
                            format: "pdf",
                            result: job.result
                          },
                          "registrert-kostnad.pdf"
                        )
                      }
                    >
                      Registrert PDF
                    </button>
                    {hasReceiptImage ? (
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={() => setImageOpenForJobId(imageOpen ? null : job.id)}
                      >
                        {imageOpen ? "Skjul kvitteringsbilde" : "Se kvitteringsbilde"}
                      </button>
                    ) : null}
                  </div>
                ) : null}

                {job.result && imageOpen && !isEditing && hasReceiptImage ? (
                  <div className="receipt-image-panel">
                    <img
                      className="receipt-image"
                      src={`/api/receipts/${job.id}/image`}
                      alt="Originalt kvitteringsbilde"
                    />
                  </div>
                ) : null}

                {isEditing ? (
                  <ReceiptEditor
                    sourceResult={job.result}
                    draft={draft}
                    imageOpen={imageOpen}
                    imageAvailable={hasReceiptImage}
                    imageUrl={`/api/receipts/${job.id}/image`}
                    historyDepth={draftHistory.length}
                    actionMessage={editorActionMessage}
                    onChangeField={(field, value) => applyDraftChange((current) => ({ ...current, [field]: value }))}
                    onChangeRow={(index, field, value) =>
                      applyDraftChange((current) => ({
                        ...current,
                        lineItems: current.lineItems.map((row, rowIndex) =>
                          rowIndex === index ? { ...row, [field]: value } : row
                        )
                      }))
                    }
                    onInsertNameOnly={(index) =>
                      applyDraftChange(
                        (current) => ({
                          ...current,
                          lineItems: insertNameOnlyRow(current.lineItems, index)
                        }),
                        "La inn ny varenavn-rad og lot prisene stå på plass."
                      )
                    }
                    onInsertAmountsOnly={(index) =>
                      applyDraftChange(
                        (current) => ({
                          ...current,
                          lineItems: insertAmountsOnlyRow(current.lineItems, index)
                        }),
                        "La inn ny prisrad og lot varenavnene stå på plass."
                      )
                    }
                    onInsertFullRow={(index) =>
                      applyDraftChange(
                        (current) => ({
                          ...current,
                          lineItems: insertFullRow(current.lineItems, index)
                        }),
                        "La inn en hel tom rad."
                      )
                    }
                    onDeleteRow={(index) =>
                      applyDraftChange(
                        (current) => ({
                          ...current,
                          lineItems: current.lineItems.filter((_, rowIndex) => rowIndex !== index)
                        }),
                        "Slettet rad."
                      )
                    }
                    onMoveRow={(index, direction) =>
                      applyDraftChange(
                        (current) => {
                          const next = current.lineItems.map(cloneLineItem);
                          const toIndex = index + direction;

                          if (toIndex < 0 || toIndex >= next.length) {
                            return current;
                          }

                          const [item] = next.splice(index, 1);
                          next.splice(toIndex, 0, item);

                          return {
                            ...current,
                            lineItems: next
                          };
                        },
                        "Flyttet rad."
                      )
                    }
                    onCalculateUnitPrice={(index) =>
                      applyDraftChange(
                        (current) => ({
                          ...current,
                          lineItems: current.lineItems.map((row, rowIndex) =>
                            rowIndex === index ? calculateUnitPriceFromLineTotal(row) : row
                          )
                        }),
                        "Pris per vare er beregnet fra antall og linjesum."
                      )
                    }
                    onCalculateLineTotal={(index) =>
                      applyDraftChange(
                        (current) => ({
                          ...current,
                          lineItems: current.lineItems.map((row, rowIndex) =>
                            rowIndex === index ? calculateLineTotalFromUnitPrice(row) : row
                          )
                        }),
                        "Linjesum er beregnet fra antall og pris per vare."
                      )
                    }
                    onApplyRawField={(index, field, value, rawLine) =>
                      applyDraftChange(
                        (current) => ({
                          ...current,
                          lineItems: current.lineItems.map((row, rowIndex) =>
                            rowIndex === index ? { ...row, [field]: value, rawLine } : row
                          )
                        }),
                        `Oppdaterte ${field === "name" ? "varenavn" : field === "quantity" ? "antall" : field === "unitPrice" ? "pris per vare" : "linjesum"} fra råtabellen.`
                      )
                    }
                    onApplyRawRow={(index, sourceRow) =>
                      applyDraftChange(
                        (current) => ({
                          ...current,
                          lineItems: current.lineItems.map((row, rowIndex) =>
                            rowIndex === index
                              ? {
                                  ...row,
                                  name: sourceRow.fields.name ?? row.name,
                                  quantity: sourceRow.fields.quantity ?? row.quantity,
                                  unitPrice: sourceRow.fields.unitPrice ?? row.unitPrice,
                                  lineTotal: sourceRow.fields.lineTotal ?? row.lineTotal,
                                  rawLine: sourceRow.text
                                }
                              : row
                          )
                        }),
                        "Rad oppdatert fra råtabellen."
                      )
                    }
                    onUndo={undoDraftChange}
                    onSave={() => saveDraft(job.id)}
                    onCancel={stopEditing}
                    onToggleImage={() => setImageOpenForJobId(imageOpen ? null : job.id)}
                    saving={savingJobId === job.id}
                  />
                ) : null}

                {isDistributing ? (
                  <DistributionView
                    distribution={distributionState}
                    result={job.result}
                    onClose={stopDistribution}
                    onReset={async () => {
                      const eventMembers = events.find((event) => event.id === job.event_id)?.members || [];
                      const next = createDistributionState(job.result, eventMembers);
                      setDistributionState(next);
                      clearDistributionState(job.id);
                      try {
                        await updateReceiptMetadata(job.id, { distributionState: null });
                        setStatus("Fordelingen er nullstilt.");
                      } catch (error) {
                        setStatus(
                          error instanceof Error ? error.message : "Kunne ikke nullstille lagret fordeling."
                        );
                      }
                    }}
                    onAddParticipant={async (name) => {
                      if (!job.event_id) {
                        return;
                      }

                      const response = await fetch(`/api/events/${job.event_id}/members`, {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ name })
                      });
                      const payload = await response.json();

                      if (!response.ok) {
                        setStatus(payload.error || "Kunne ikke legge til medlem.");
                        return;
                      }

                      setEvents((current) =>
                        current.map((item) => (item.id === payload.event.id ? payload.event : item))
                      );
                      setDistributionState((current) => ({
                        ...current,
                        participants: payload.event.members.map((member) => ({
                          id: member.id,
                          name: member.name
                        })),
                        activeParticipantId: payload.event.members.at(-1)?.id || current.activeParticipantId
                      }));
                      setStatus("Nytt medlem lagt til i arrangementet.");
                    }}
                    onSetActiveParticipant={(participantId) =>
                      setDistributionState((current) => setActiveParticipant(current, participantId))
                    }
                    onAssignWhole={(entryId, participantId, quantity) =>
                      setDistributionState((current) =>
                        assignWholeItem(current, {
                          entryId,
                          participantId,
                          quantity
                        })
                      )
                    }
                    onSplitAllEqually={(participantIds) =>
                      setDistributionState((current) =>
                        splitAllEntriesEqually(current, {
                          participantIds
                        })
                      )
                    }
                    onSplitEntryEqually={(entryId, participantIds) =>
                      setDistributionState((current) =>
                        splitEntryEqually(current, {
                          entryId,
                          participantIds
                        })
                      )
                    }
                    onSplitEntry={(entryId, shares) =>
                      setDistributionState((current) =>
                        splitEntryByPercent(current, {
                          entryId,
                          shares
                        })
                      )
                    }
                    onRemoveAssignment={(entryId, assignmentId) =>
                      setDistributionState((current) =>
                        removeAssignment(current, {
                          entryId,
                          assignmentId
                        })
                      )
                    }
                    onExportDistribution={(format) =>
                      (() => {
                        saveDistributionState(job.id, distributionState);
                        return downloadExport(
                          {
                            kind: "distribution",
                            format,
                            result: job.result,
                            distributionState
                          },
                          `fordeling.${format}`
                        );
                      })()
                    }
                    onExportParticipant={(participantId, participantName, format) =>
                      (() => {
                        saveDistributionState(job.id, distributionState);
                        return downloadExport(
                          {
                            kind: "participant",
                            format,
                            result: job.result,
                            distributionState,
                            participantId,
                            participantName
                          },
                          `${participantName || "person"}.${format}`
                        );
                      })()
                    }
                  />
                ) : null}
              </article>
            );
          })
        )}
      </section>
        </div>
      </section>
    </div>
  );
}
