"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { DashboardClient } from "@/components/dashboard-client";
import {
  PERSON_TEMPLATES,
  RSVP_OPTIONS,
  SUBMISSION_STATUS_OPTIONS,
  TASK_STATUS_OPTIONS,
  buildApprovalSummary,
  buildEventFinanceSummary,
  buildGuestSummary,
  buildProjectSummary,
  buildSettlementSuggestions,
  buildViewerAccess,
  ensureEventShape
} from "@/event-platform-utils";

function formatCurrency(amount) {
  if (typeof amount !== "number" || Number.isNaN(amount)) {
    return "0,00";
  }

  return new Intl.NumberFormat("nb-NO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

function formatDateTime(value) {
  if (!value) {
    return "Ikke satt";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("nb-NO", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function templateOptions() {
  return Object.entries(PERSON_TEMPLATES).map(([value, template]) => ({
    value,
    label: template.label
  }));
}

function personTemplateValue(person) {
  const entry = Object.entries(PERSON_TEMPLATES).find(([, template]) => {
    return (
      person.planningRole === template.planningRole &&
      person.projectRole === template.projectRole &&
      person.financeRole === template.financeRole
    );
  });

  return entry?.[0] || "guest";
}

function applyTemplate(key) {
  return PERSON_TEMPLATES[key] || PERSON_TEMPLATES.guest;
}

function syncEvent(events, nextEvent) {
  return events.map((event) => (event.id === nextEvent.id ? ensureEventShape(nextEvent) : event));
}

function InfoCard({ label, value, tone = "default" }) {
  return (
    <article className={`info-card ${tone !== "default" ? `info-card-${tone}` : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function EmptyState({ title, body }) {
  return (
    <div className="notice event-platform-empty">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

function ActionTile({ title, body, actions }) {
  return (
    <article className="action-tile">
      <div className="stack">
        <strong>{title}</strong>
        <p className="muted">{body}</p>
      </div>
      <div className="button-row">{actions}</div>
    </article>
  );
}

function ModalShell({ title, body, onClose, children }) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        aria-modal="true"
        className="modal-panel"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div className="stack">
            <h3>{title}</h3>
            {body ? <p className="muted">{body}</p> : null}
          </div>
          <button className="secondary-button" type="button" onClick={onClose}>
            Lukk
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function OverviewTab({ event, jobs, financeSummary, guestSummary, projectSummary, approvalSummary }) {
  return (
    <div className="stack">
      <section className="panel stack">
        <div className="panel-header-inline">
          <div>
            <p className="eyebrow">Arrangement</p>
            <h2>{event.overview.title || event.name}</h2>
          </div>
          <Link className="secondary-link" href="/">
            Aapne dagens kvitteringsmotor
          </Link>
        </div>
        <div className="overview-grid">
          <InfoCard label="Inviterte" value={guestSummary.invited} />
          <InfoCard label="Kommer" value={guestSummary.accepted} tone="success" />
          <InfoCard label="Oppgaver" value={projectSummary.total} />
          <InfoCard label="Venter pa godkjenning" value={approvalSummary.pending} tone="warning" />
          <InfoCard label="Kvitteringer" value={financeSummary.receiptCount} />
          <InfoCard label="Brukt totalt" value={formatCurrency(financeSummary.totalSpent)} />
        </div>
      </section>

      <section className="two-col">
        <article className="panel stack">
          <h3>Praktisk informasjon</h3>
          <div className="detail-list">
            <div>
              <span>Sted</span>
              <strong>{event.overview.location || "Ikke satt"}</strong>
            </div>
            <div>
              <span>Starter</span>
              <strong>{formatDateTime(event.overview.startsAt)}</strong>
            </div>
            <div>
              <span>Slutter</span>
              <strong>{formatDateTime(event.overview.endsAt)}</strong>
            </div>
            <div>
              <span>Dresscode</span>
              <strong>{event.overview.dressCode || "Ikke satt"}</strong>
            </div>
          </div>
          <p className="event-copy">{event.overview.description || "Ingen beskrivelse enda."}</p>
          <p className="muted">{event.overview.practicalInfo || "Ingen praktiske detaljer enda."}</p>
        </article>

        <article className="panel stack">
          <h3>Okonomisk oversikt</h3>
          <div className="detail-list">
            <div>
              <span>Betalt via kvitteringer</span>
              <strong>{formatCurrency(financeSummary.totalPaid)}</strong>
            </div>
            <div>
              <span>Forskudd / innbetalinger</span>
              <strong>{formatCurrency(financeSummary.totalAdvances)}</strong>
            </div>
            <div>
              <span>Fordelt brukt</span>
              <strong>{formatCurrency(financeSummary.totalUsed)}</strong>
            </div>
            <div>
              <span>Ufordelt</span>
              <strong>{formatCurrency(financeSummary.unassignedTotal)}</strong>
            </div>
          </div>
          <ul className="compact-list">
            {jobs.slice(0, 5).map((job) => (
              <li key={job.id}>
                <span>{job.result?.merchantName || job.original_filename}</span>
                <strong>{formatCurrency(job.result?.grandTotal || 0)}</strong>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}

function GuestTab({ event, viewerAccess, viewerPerson, onAddPerson, onUpdatePerson }) {
  const templateList = templateOptions();

  return (
    <div className="stack">
      {viewerAccess.canManageGuest ? (
        <section className="panel stack">
          <h3>Inviter ny person</h3>
          <form className="grid-form compact-grid" onSubmit={onAddPerson}>
            <label className="field">
              <span>Navn</span>
              <input name="name" placeholder="Fornavn Etternavn" required />
            </label>
            <label className="field">
              <span>E-post</span>
              <input name="email" placeholder="navn@epost.no" type="email" />
            </label>
            <label className="field">
              <span>Mal</span>
              <select defaultValue="guest" name="template">
                {templateList.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Notat</span>
              <input name="note" placeholder="F.eks. toastmaster eller sjafor" />
            </label>
            <button className="primary-button" type="submit">
              Legg til person
            </button>
          </form>
        </section>
      ) : null}

      <section className="panel stack">
        <h3>Personer i arrangementet</h3>
        {event.people.length === 0 ? (
          <EmptyState
            title="Ingen personer enda"
            body="Legg til gjester, hjelpere eller fakturamedlemmer for aa styre tilgangene."
          />
        ) : (
          <div className="person-grid">
            {event.people.map((person) => {
              const canEditSelf = !viewerAccess.canManageGuest && viewerPerson?.id === person.id;
              const canSave = viewerAccess.canManageGuest || canEditSelf;

              return (
                <form
                  className="person-card"
                  key={person.id}
                  onSubmit={(eventObject) => onUpdatePerson(eventObject, person)}
                >
                  <div className="person-card-header">
                    <div>
                      <strong>{person.name}</strong>
                      <span>{person.email || "Ingen e-post registrert"}</span>
                    </div>
                    <span className="role-pill">
                      {PERSON_TEMPLATES[personTemplateValue(person)]?.label}
                    </span>
                  </div>
                  <input name="personId" type="hidden" value={person.id} />
                  <div className="compact-grid">
                    <label className="field">
                      <span>RSVP</span>
                      <select defaultValue={person.rsvpStatus} disabled={!canSave} name="rsvpStatus">
                        {RSVP_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Planlegging</span>
                      <select
                        defaultValue={person.planningRole}
                        disabled={!viewerAccess.canManageGuest}
                        name="planningRole"
                      >
                        <option value="none">Ingen</option>
                        <option value="viewer">Se</option>
                        <option value="manager">Forvalte</option>
                        <option value="owner">Fullt ansvar</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Oppgaver</span>
                      <select
                        defaultValue={person.projectRole}
                        disabled={!viewerAccess.canManageGuest}
                        name="projectRole"
                      >
                        <option value="none">Ingen</option>
                        <option value="helper">Hjelper</option>
                        <option value="manager">Forvalte</option>
                        <option value="owner">Fullt ansvar</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Faktura</span>
                      <select
                        defaultValue={person.financeRole}
                        disabled={!viewerAccess.canManageGuest}
                        name="financeRole"
                      >
                        <option value="none">Ingen tilgang</option>
                        <option value="member">Medlem</option>
                        <option value="manager">Forvalter</option>
                        <option value="owner">Fullt ansvar</option>
                      </select>
                    </label>
                  </div>
                  <div className="toggle-row">
                    <label>
                      <input
                        defaultChecked={person.capabilities.canSubmitReceipts}
                        disabled={!viewerAccess.canManageGuest}
                        name="canSubmitReceipts"
                        type="checkbox"
                      />
                      Kan sende inn kvittering
                    </label>
                    <label>
                      <input
                        defaultChecked={person.capabilities.canSubmitManualInvoices}
                        disabled={!viewerAccess.canManageGuest}
                        name="canSubmitManualInvoices"
                        type="checkbox"
                      />
                      Kan lage manuell faktura
                    </label>
                    <label>
                      <input
                        defaultChecked={person.capabilities.canSendToAiDirectly}
                        disabled={!viewerAccess.canManageGuest}
                        name="canSendToAiDirectly"
                        type="checkbox"
                      />
                      Kan sende rett til AI
                    </label>
                  </div>
                  <label className="field">
                    <span>Notat</span>
                    <input
                      defaultValue={person.note}
                      disabled={!canSave}
                      name="note"
                      placeholder="Rolle, ansvar eller info"
                    />
                  </label>
                  {canSave ? (
                    <button className="secondary-button" type="submit">
                      {viewerAccess.canManageGuest ? "Lagre person" : "Oppdater mitt svar"}
                    </button>
                  ) : (
                    <p className="muted">Lesetilgang for denne visningen.</p>
                  )}
                </form>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function ProjectTab({ event, viewerAccess, viewerPerson, onAddTask, onUpdateTask }) {
  return (
    <div className="stack">
      {viewerAccess.canManageProject ? (
        <section className="panel stack">
          <h3>Ny oppgave</h3>
          <form className="grid-form compact-grid" onSubmit={onAddTask}>
            <label className="field">
              <span>Tittel</span>
              <input name="title" placeholder="Bestille aktiviteter" required />
            </label>
            <label className="field">
              <span>Frist</span>
              <input name="dueDate" type="datetime-local" />
            </label>
            <label className="field">
              <span>Status</span>
              <select defaultValue="todo" name="status">
                {TASK_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Ansvarlig</span>
              <select defaultValue="" name="assigneeId">
                <option value="">Velg person</option>
                {event.people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field field-span-full">
              <span>Beskrivelse</span>
              <textarea name="description" placeholder="Hva skal gjores, og hva er viktig?" rows={3} />
            </label>
            <button className="primary-button" type="submit">
              Legg til oppgave
            </button>
          </form>
        </section>
      ) : null}

      <section className="panel stack">
        <h3>Oppgaveliste</h3>
        {event.tasks.length === 0 ? (
          <EmptyState
            title="Ingen oppgaver enda"
            body="Her kan du fordele arbeid, sette frister og folge status for planleggingen."
          />
        ) : (
          <div className="stack">
            {event.tasks.map((task) => {
              const assignees = event.people
                .filter((person) => task.assigneeIds.includes(person.id))
                .map((person) => person.name);
              const canEditTask =
                viewerAccess.canManageProject ||
                (viewerAccess.canUpdateAssignedTasks &&
                  viewerPerson &&
                  task.assigneeIds.includes(viewerPerson.id));

              return (
                <form
                  className="task-card"
                  key={task.id}
                  onSubmit={(eventObject) => onUpdateTask(eventObject, task)}
                >
                  <input name="taskId" type="hidden" value={task.id} />
                  <div className="task-headline">
                    <div>
                      <strong>{task.title}</strong>
                      <span>{assignees.join(", ") || "Ingen ansvarlig"}</span>
                    </div>
                    <span className="role-pill">{TASK_STATUS_OPTIONS.find((option) => option.value === task.status)?.label}</span>
                  </div>
                  <p>{task.description || "Ingen beskrivelse enda."}</p>
                  <div className="compact-grid">
                    <label className="field">
                      <span>Status</span>
                      <select defaultValue={task.status} disabled={!canEditTask} name="status">
                        {TASK_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Frist</span>
                      <input
                        defaultValue={task.dueDate}
                        disabled={!viewerAccess.canManageProject}
                        name="dueDate"
                        type="datetime-local"
                      />
                    </label>
                    <label className="field">
                      <span>Ansvarlig</span>
                      <select
                        defaultValue={task.assigneeIds[0] || ""}
                        disabled={!viewerAccess.canManageProject}
                        name="assigneeId"
                      >
                        <option value="">Ingen</option>
                        {event.people.map((person) => (
                          <option key={person.id} value={person.id}>
                            {person.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {canEditTask ? (
                    <button className="secondary-button" type="submit">
                      {viewerAccess.canManageProject ? "Lagre oppgave" : "Oppdater status"}
                    </button>
                  ) : (
                    <p className="muted">Du kan se oppgavene, men ikke endre dem i denne visningen.</p>
                  )}
                </form>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function PlanningTab({ event, viewerAccess, onSaveOverview }) {
  if (!viewerAccess.canViewPlanning) {
    return (
      <EmptyState
        title="Ingen planleggingstilgang"
        body="Denne personen har ikke tilgang til aa se eller endre planleggingsdelen."
      />
    );
  }

  return (
    <section className="panel stack">
      <h3>Planleggingsrom</h3>
      <form className="grid-form compact-grid" key={event.id} onSubmit={onSaveOverview}>
        <label className="field">
          <span>Tittel</span>
          <input
            defaultValue={event.overview.title || event.name}
            disabled={!viewerAccess.canManagePlanning}
            name="title"
          />
        </label>
        <label className="field">
          <span>Sted</span>
          <input
            defaultValue={event.overview.location}
            disabled={!viewerAccess.canManagePlanning}
            name="location"
            placeholder="Hytte, restaurant eller adresse"
          />
        </label>
        <label className="field">
          <span>Starter</span>
          <input
            defaultValue={event.overview.startsAt}
            disabled={!viewerAccess.canManagePlanning}
            name="startsAt"
            type="datetime-local"
          />
        </label>
        <label className="field">
          <span>Slutter</span>
          <input
            defaultValue={event.overview.endsAt}
            disabled={!viewerAccess.canManagePlanning}
            name="endsAt"
            type="datetime-local"
          />
        </label>
        <label className="field">
          <span>Dresscode</span>
          <input
            defaultValue={event.overview.dressCode}
            disabled={!viewerAccess.canManagePlanning}
            name="dressCode"
            placeholder="Smart casual, kostyme..."
          />
        </label>
        <label className="field field-span-full">
          <span>Beskrivelse</span>
          <textarea
            defaultValue={event.overview.description}
            disabled={!viewerAccess.canManagePlanning}
            name="description"
            rows={4}
          />
        </label>
        <label className="field field-span-full">
          <span>Praktisk informasjon</span>
          <textarea
            defaultValue={event.overview.practicalInfo}
            disabled={!viewerAccess.canManagePlanning}
            name="practicalInfo"
            rows={4}
          />
        </label>
        {viewerAccess.canManagePlanning ? (
          <button className="primary-button" type="submit">
            Lagre planlegging
          </button>
        ) : (
          <p className="muted">Denne visningen er lese-modus for planleggingen.</p>
        )}
      </form>
    </section>
  );
}

function FinanceTab({
  event,
  jobs,
  viewerAccess,
  financeSummary,
  engineOpen,
  settlementPlan,
  showSettlementPlan,
  onToggleSettlementPlan,
  onToggleEngine,
  onOpenAdvanceModal,
  onOpenSettlementModal
}) {
  if (!viewerAccess.canViewFinance) {
    return (
      <EmptyState
        title="Ingen fakturatilgang"
        body="Denne personen skal ikke se finansdelen av arrangementet."
      />
    );
  }

  return (
    <div className="stack">
      <section className="panel stack">
        <div className="overview-grid">
          <InfoCard label="Kvitteringer betalt" value={formatCurrency(financeSummary.totalPaid)} />
          <InfoCard label="Totalt innbetalt" value={formatCurrency(financeSummary.totalContributed)} />
          <InfoCard label="Brukt" value={formatCurrency(financeSummary.totalUsed)} />
          <InfoCard label="Forskudd" value={formatCurrency(financeSummary.totalAdvances)} />
          <InfoCard label="Ufordelt" value={formatCurrency(financeSummary.unassignedTotal)} tone="warning" />
        </div>
        <p className="notice">
          Forskudd lagres som egen post og brukes automatisk i `totalt innbetalt`, `balanse for oppgjor`
          og `gjenstaende`. Du skal ikke trekke det fra manuelt senere.
        </p>
      </section>

      <section className="panel stack">
        <div className="panel-header-inline">
          <div>
            <h3>Arbeidsrom for faktura</h3>
            <p className="muted">
              Kvitteringsmotor, forskudd og oppgjor bor ligge i samme fakturaflyt. Her er det samlet i et tydeligere kontrollrom.
            </p>
          </div>
        </div>
        <div className="action-tile-grid">
          <ActionTile
            title="Kvitteringsmotor"
            body="Den ble holdt utenfor V2 i forrige steg for aa unnga aa blande ny tilgangsmodell med gammel kvitteringsflyt for tidlig. Na er den koblet direkte inn her for fakturaforvaltere."
            actions={
              <>
                {viewerAccess.canManageFinance ? (
                  <button className="primary-button" type="button" onClick={onToggleEngine}>
                    {engineOpen ? "Skjul kvitteringsmotor" : "Aapne kvitteringsmotor"}
                  </button>
                ) : (
                  <span className="muted">Kun fakturaforvaltere kan aapne hele motoren.</span>
                )}
                <Link className="secondary-link" href={`/?eventId=${event.id}`}>
                  Aapne fullskjerm
                </Link>
              </>
            }
          />
          <ActionTile
            title="Registrer forskudd / innbetaling"
            body="Bruk dette nar noen sender inn penger i forkant. Det teller pa betalt, men ikke pa brukt."
            actions={
              viewerAccess.canManageFinance ? (
                <button className="secondary-button" type="button" onClick={onOpenAdvanceModal}>
                  Ny innbetaling
                </button>
              ) : (
                <span className="muted">Kun forvaltere kan registrere dette.</span>
              )
            }
          />
          <ActionTile
            title="Registrer oppgjor"
            body="Bruk dette nar medlemmer sender penger til hverandre etter at varene er fordelt."
            actions={
              viewerAccess.canManageFinance ? (
                <button className="secondary-button" type="button" onClick={onOpenSettlementModal}>
                  Nytt oppgjor
                </button>
              ) : (
                <span className="muted">Kun forvaltere kan registrere dette.</span>
              )
            }
          />
          <ActionTile
            title="Regn ut oppgjor"
            body="Bruk gjenstaende balanse for aa foresla hvem som skal overfore hva til hvem for at arrangementet skal ga i null."
            actions={
              viewerAccess.canManageFinance ? (
                <button className="secondary-button" type="button" onClick={onToggleSettlementPlan}>
                  {showSettlementPlan ? "Skjul oppgjorsforslag" : "Regn ut oppgjorsforslag"}
                </button>
              ) : (
                <span className="muted">Kun forvaltere kan se hele oppgjorsforslaget.</span>
              )
            }
          />
        </div>
      </section>

      {viewerAccess.canManageFinance && engineOpen ? (
        <section className="panel stack embedded-engine-panel">
          <div className="panel-header-inline">
            <div>
              <h3>Kvitteringsmotor for {event.name}</h3>
              <p className="muted">
                Opplasting, kontroll, fordeling og eksport bruker den eksisterende motoren direkte i denne flaten.
              </p>
            </div>
          </div>
          <DashboardClient
            embeddedMode
            initialEvents={[event]}
            initialJobs={jobs}
            initialSelectedEventId={event.id}
          />
        </section>
      ) : null}

      {showSettlementPlan ? (
        <section className="panel stack">
          <div className="panel-header-inline">
            <div>
              <h3>Oppgjorsforslag</h3>
              <p className="muted">
                Forslaget bruker `gjenstaende balanse` etter at forskudd og registrerte oppgjor er tatt med.
              </p>
            </div>
          </div>
          {settlementPlan.alreadyBalanced ? (
            <p className="notice success">Arrangementet ser allerede oppgjort ut. Ingen nye overforinger trengs.</p>
          ) : settlementPlan.suggestions.length ? (
            <div className="stack">
              <ul className="suggestion-list">
                {settlementPlan.suggestions.map((suggestion, index) => (
                  <li className="suggestion-card" key={`${suggestion.fromId}-${suggestion.toId}-${index}`}>
                    <strong>{suggestion.fromName}</strong>
                    <span>betaler</span>
                    <strong>{suggestion.toName}</strong>
                    <span className="suggestion-amount">{formatCurrency(suggestion.amount)} kr</span>
                  </li>
                ))}
              </ul>
              {settlementPlan.unmatchedOutgoing.length || settlementPlan.unmatchedIncoming.length ? (
                <p className="notice warning">
                  Det er et lite restavvik etter avrunding. Sjekk oppgjor og balanse en gang til.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="notice">Fant ingen konkrete overforinger akkurat na.</p>
          )}
        </section>
      ) : null}

      <section className="panel stack">
        <h3>Medlemsbalanse</h3>
        {financeSummary.members.length === 0 ? (
          <EmptyState
            title="Ingen fakturamedlemmer"
            body="Legg personer inn med fakturatilgang for aa fa balanse og oppgjor."
          />
        ) : (
          <table className="mini-table">
            <thead>
              <tr>
                <th>Medlem</th>
                <th>Kvitt. betalt</th>
                <th>Forskudd</th>
                <th>Totalt innbetalt</th>
                <th>Brukt</th>
                <th>Mottatt</th>
                <th>Sendt</th>
                <th>Balanse for oppgjor</th>
                <th>Gjenstaende</th>
              </tr>
            </thead>
            <tbody>
              {financeSummary.members.map((member) => (
                <tr key={member.id}>
                  <td>{member.name}</td>
                  <td>{formatCurrency(member.receiptPaidTotal)}</td>
                  <td>{formatCurrency(member.advanceTotal)}</td>
                  <td>{formatCurrency(member.totalContributed)}</td>
                  <td>{formatCurrency(member.usedTotal)}</td>
                  <td>{formatCurrency(member.receivedSettlementTotal)}</td>
                  <td>{formatCurrency(member.sentSettlementTotal)}</td>
                  <td>{formatCurrency(member.balanceBeforeSettlements)}</td>
                  <td>{formatCurrency(member.remainingBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="two-col">
        <article className="panel stack">
          <h3>Kvitteringer i arrangementet</h3>
          <ul className="compact-list">
            {jobs.length === 0 ? (
              <li>Ingen kvitteringer er koblet til dette arrangementet enda.</li>
            ) : (
              jobs.map((job) => (
                <li key={job.id}>
                  <span>{job.result?.merchantName || job.original_filename}</span>
                  <strong>{formatCurrency(job.result?.grandTotal || 0)}</strong>
                </li>
              ))
            )}
          </ul>
        </article>
        <article className="panel stack">
          <h3>Ledger-poster</h3>
          <ul className="compact-list">
            {event.ledgerEntries.length === 0 ? (
              <li>Ingen forskudd eller oppgjor registrert enda.</li>
            ) : (
              event.ledgerEntries.map((entry) => {
                const from = event.members.find((member) => member.id === entry.memberId)?.name || "Ukjent";
                const to =
                  event.members.find((member) => member.id === entry.counterpartyMemberId)?.name || "";
                const label =
                  entry.type === "settlement_transfer"
                    ? `${from} til ${to}`
                    : `${from} - ${entry.type === "advance_contribution" ? "forskudd" : "justering"}`;

                return (
                  <li key={entry.id}>
                    <span>{label}</span>
                    <strong>{formatCurrency(entry.amount)}</strong>
                  </li>
                );
              })
            )}
          </ul>
        </article>
      </section>
    </div>
  );
}

function ApprovalsTab({ event, viewerAccess, onAddSubmission, onUpdateSubmission }) {
  if (!viewerAccess.canViewApprovals) {
    return (
      <EmptyState
        title="Ingen godkjenningstilgang"
        body="Denne visningen har ikke tilgang til godkjenningskoen."
      />
    );
  }

  return (
    <div className="stack">
      <section className="panel stack">
        <h3>Legg inn innsending til godkjenning</h3>
        <form className="grid-form compact-grid" onSubmit={onAddSubmission}>
          <label className="field">
            <span>Tittel</span>
            <input name="title" placeholder="Kvittering fra grillkveld" required />
          </label>
          <label className="field">
            <span>Type</span>
            <select defaultValue="receipt_upload" name="type">
              <option value="receipt_upload">Bildekvittering</option>
              <option value="manual_invoice">Manuell faktura</option>
              <option value="advance_contribution">Forskudd</option>
            </select>
          </label>
          <label className="field">
            <span>Innsender</span>
            <select defaultValue="" name="submittedByPersonId" required>
              <option value="">Velg person</option>
              {event.people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Status</span>
            <select defaultValue="pending_approval" name="status">
              {SUBMISSION_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field field-span-full">
            <span>Notat</span>
            <textarea name="note" rows={3} />
          </label>
          <button className="primary-button" type="submit">
            Lag ny innsending
          </button>
        </form>
      </section>

      <section className="panel stack">
        <h3>Godkjenningsko</h3>
        {event.submissions.length === 0 ? (
          <EmptyState
            title="Ingen innsendinger i koen"
            body="Bruk dette rommet til aa samle opp kvitteringer, manuelle fakturaer og forskudd som trenger godkjenning."
          />
        ) : (
          <div className="stack">
            {event.submissions.map((submission) => {
              const submitter =
                event.people.find((person) => person.id === submission.submittedByPersonId)?.name || "Ukjent";

              return (
                <form
                  className="task-card"
                  key={submission.id}
                  onSubmit={(eventObject) => onUpdateSubmission(eventObject, submission)}
                >
                  <input name="submissionId" type="hidden" value={submission.id} />
                  <div className="task-headline">
                    <div>
                      <strong>{submission.title}</strong>
                      <span>
                        {submitter} - {formatDateTime(submission.created_at)}
                      </span>
                    </div>
                    <span className="role-pill">
                      {SUBMISSION_STATUS_OPTIONS.find((option) => option.value === submission.status)?.label}
                    </span>
                  </div>
                  <p>{submission.note || "Ingen kommentar."}</p>
                  <div className="compact-grid">
                    <label className="field">
                      <span>Status</span>
                      <select defaultValue={submission.status} name="status">
                        {SUBMISSION_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <button className="secondary-button" type="submit">
                    Oppdater innsending
                  </button>
                </form>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export function EventPlatformClient({ initialEvents, initialJobs }) {
  const [events, setEvents] = useState(() => initialEvents.map((event) => ensureEventShape(event)));
  const [jobs] = useState(() => initialJobs);
  const [selectedEventId, setSelectedEventId] = useState(() => initialEvents[0]?.id || "");
  const [activeTab, setActiveTab] = useState("overview");
  const [viewerId, setViewerId] = useState("organizer-local");
  const [statusMessage, setStatusMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [financeModal, setFinanceModal] = useState(null);
  const [financeEngineOpen, setFinanceEngineOpen] = useState(false);
  const [showSettlementPlan, setShowSettlementPlan] = useState(false);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) || null,
    [events, selectedEventId]
  );
  const selectedJobs = useMemo(
    () =>
      selectedEvent
        ? jobs.filter(
            (job) => job.event_id === selectedEvent.id && job.status === "completed" && job.result
          )
        : [],
    [jobs, selectedEvent]
  );
  const viewerPerson = selectedEvent?.people.find((person) => person.id === viewerId) || null;
  const viewerAccess = buildViewerAccess(viewerId === "organizer-local" ? null : viewerPerson);
  const guestSummary = selectedEvent ? buildGuestSummary(selectedEvent) : buildGuestSummary(null);
  const projectSummary = selectedEvent ? buildProjectSummary(selectedEvent) : buildProjectSummary(null);
  const approvalSummary = selectedEvent ? buildApprovalSummary(selectedEvent) : buildApprovalSummary(null);
  const financeSummary = selectedEvent
    ? buildEventFinanceSummary(selectedEvent, selectedJobs)
    : buildEventFinanceSummary(null, []);
  const settlementPlan = useMemo(
    () => buildSettlementSuggestions(financeSummary),
    [financeSummary]
  );

  const tabs = [
    { id: "overview", label: "Oversikt", visible: true },
    { id: "guest", label: "Gjest", visible: viewerAccess.canViewGuest },
    { id: "project", label: "Oppgaver", visible: viewerAccess.canViewProject },
    { id: "planning", label: "Planlegging", visible: viewerAccess.canViewPlanning },
    { id: "finance", label: "Faktura", visible: viewerAccess.canViewFinance },
    { id: "approvals", label: "Godkjenning", visible: viewerAccess.canViewApprovals }
  ].filter((tab) => tab.visible);
  const currentTab = tabs.some((tab) => tab.id === activeTab) ? activeTab : "overview";

  useEffect(() => {
    if (currentTab !== "finance") {
      setFinanceModal(null);
      setFinanceEngineOpen(false);
      setShowSettlementPlan(false);
    }
  }, [currentTab]);

  useEffect(() => {
    setFinanceModal(null);
    setFinanceEngineOpen(false);
    setShowSettlementPlan(false);
  }, [selectedEventId]);

  async function patchEvent(action, payload) {
    if (!selectedEvent) {
      return null;
    }

    setIsSaving(true);
    setStatusMessage("");

    try {
      const response = await fetch(`/api/events/${selectedEvent.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action,
          ...payload
        })
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body?.error || "Kunne ikke oppdatere arrangementet.");
      }

      const nextEvent = ensureEventShape(body.event);
      setEvents((currentEvents) => syncEvent(currentEvents, nextEvent));
      return nextEvent;
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Noe gikk galt.");
      return null;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateEvent(formEvent) {
    formEvent.preventDefault();
    const formData = new FormData(formEvent.currentTarget);
    const name = String(formData.get("name") || "").trim();

    if (!name) {
      return;
    }

    setIsSaving(true);
    setStatusMessage("");

    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body?.error || "Kunne ikke opprette arrangementet.");
      }

      const nextEvent = ensureEventShape(body.event);
      setEvents((currentEvents) => [nextEvent, ...currentEvents]);
      setSelectedEventId(nextEvent.id);
      setViewerId("organizer-local");
      formEvent.currentTarget.reset();
      setStatusMessage("Nytt arrangement er klart i V2.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Kunne ikke opprette arrangementet.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveOverview(formEvent) {
    formEvent.preventDefault();
    if (!viewerAccess.canManagePlanning) {
      return;
    }

    const formData = new FormData(formEvent.currentTarget);
    const nextEvent = await patchEvent("update_overview", {
      overview: {
        title: String(formData.get("title") || "").trim(),
        location: String(formData.get("location") || "").trim(),
        startsAt: String(formData.get("startsAt") || "").trim(),
        endsAt: String(formData.get("endsAt") || "").trim(),
        dressCode: String(formData.get("dressCode") || "").trim(),
        description: String(formData.get("description") || "").trim(),
        practicalInfo: String(formData.get("practicalInfo") || "").trim()
      }
    });

    if (nextEvent) {
      setStatusMessage("Planleggingen ble oppdatert.");
    }
  }

  async function handleAddPerson(formEvent) {
    formEvent.preventDefault();
    if (!viewerAccess.canManageGuest) {
      return;
    }

    const formData = new FormData(formEvent.currentTarget);
    const template = applyTemplate(String(formData.get("template") || "guest"));
    const nextEvent = await patchEvent("add_person", {
      person: {
        name: String(formData.get("name") || "").trim(),
        email: String(formData.get("email") || "").trim(),
        note: String(formData.get("note") || "").trim(),
        rsvpStatus: "pending",
        invitedAt: new Date().toISOString(),
        planningRole: template.planningRole,
        projectRole: template.projectRole,
        financeRole: template.financeRole,
        capabilities: template.capabilities
      }
    });

    if (nextEvent) {
      formEvent.currentTarget.reset();
      setStatusMessage("Personen er lagt til.");
    }
  }

  async function handleUpdatePerson(formEvent, person) {
    formEvent.preventDefault();
    const canEditSelf = !viewerAccess.canManageGuest && viewerPerson?.id === person.id;

    if (!viewerAccess.canManageGuest && !canEditSelf) {
      return;
    }

    const formData = new FormData(formEvent.currentTarget);
    const nextEvent = await patchEvent("update_person", {
      personId: person.id,
      changes: {
        rsvpStatus: String(formData.get("rsvpStatus") || person.rsvpStatus),
        planningRole: String(formData.get("planningRole") || person.planningRole),
        projectRole: String(formData.get("projectRole") || person.projectRole),
        financeRole: String(formData.get("financeRole") || person.financeRole),
        note: String(formData.get("note") || "").trim(),
        respondedAt: new Date().toISOString(),
        capabilities: viewerAccess.canManageGuest
          ? {
              canSubmitReceipts: formData.get("canSubmitReceipts") === "on",
              canSubmitManualInvoices: formData.get("canSubmitManualInvoices") === "on",
              canSendToAiDirectly: formData.get("canSendToAiDirectly") === "on"
            }
          : person.capabilities
      }
    });

    if (nextEvent) {
      setStatusMessage(`Oppdaterte ${person.name}.`);
    }
  }

  async function handleAddTask(formEvent) {
    formEvent.preventDefault();
    if (!viewerAccess.canManageProject) {
      return;
    }

    const formData = new FormData(formEvent.currentTarget);
    const assigneeId = String(formData.get("assigneeId") || "").trim();
    const nextEvent = await patchEvent("add_task", {
      task: {
        title: String(formData.get("title") || "").trim(),
        description: String(formData.get("description") || "").trim(),
        dueDate: String(formData.get("dueDate") || "").trim(),
        status: String(formData.get("status") || "todo"),
        assigneeIds: assigneeId ? [assigneeId] : []
      }
    });

    if (nextEvent) {
      formEvent.currentTarget.reset();
      setStatusMessage("Oppgaven er lagt til.");
    }
  }

  async function handleUpdateTask(formEvent, task) {
    formEvent.preventDefault();
    const canEditTask =
      viewerAccess.canManageProject ||
      (viewerAccess.canUpdateAssignedTasks &&
        viewerPerson &&
        task.assigneeIds.includes(viewerPerson.id));

    if (!canEditTask) {
      return;
    }

    const formData = new FormData(formEvent.currentTarget);
    const assigneeId = String(formData.get("assigneeId") || "").trim();
    const nextEvent = await patchEvent("update_task", {
      taskId: task.id,
      changes: {
        status: String(formData.get("status") || task.status),
        dueDate: viewerAccess.canManageProject
          ? String(formData.get("dueDate") || "").trim()
          : task.dueDate,
        assigneeIds: viewerAccess.canManageProject ? (assigneeId ? [assigneeId] : []) : task.assigneeIds
      }
    });

    if (nextEvent) {
      setStatusMessage(`Oppdaterte oppgaven "${task.title}".`);
    }
  }

  async function handleAddAdvance(formEvent) {
    formEvent.preventDefault();
    if (!viewerAccess.canManageFinance) {
      return;
    }

    const formData = new FormData(formEvent.currentTarget);
    const nextEvent = await patchEvent("add_ledger_entry", {
      entry: {
        type: "advance_contribution",
        memberId: String(formData.get("memberId") || "").trim(),
        amount: Number(formData.get("amount") || 0),
        note: String(formData.get("note") || "").trim(),
        status: "approved"
      }
    });

    if (nextEvent) {
      formEvent.currentTarget.reset();
      setFinanceModal(null);
      setShowSettlementPlan(true);
      setStatusMessage("Forskudd er registrert.");
    }
  }

  async function handleAddSettlement(formEvent) {
    formEvent.preventDefault();
    if (!viewerAccess.canManageFinance) {
      return;
    }

    const formData = new FormData(formEvent.currentTarget);
    const fromMemberId = String(formData.get("fromMemberId") || "").trim();
    const toMemberId = String(formData.get("toMemberId") || "").trim();

    if (!fromMemberId || !toMemberId || fromMemberId === toMemberId) {
      setStatusMessage("Velg to ulike medlemmer for oppgjor.");
      return;
    }

    const nextEvent = await patchEvent("add_ledger_entry", {
      entry: {
        type: "settlement_transfer",
        memberId: fromMemberId,
        counterpartyMemberId: toMemberId,
        amount: Number(formData.get("amount") || 0),
        note: String(formData.get("note") || "").trim(),
        status: "approved"
      }
    });

    if (nextEvent) {
      formEvent.currentTarget.reset();
      setFinanceModal(null);
      setShowSettlementPlan(true);
      setStatusMessage("Oppgjoret er registrert.");
    }
  }

  async function handleAddSubmission(formEvent) {
    formEvent.preventDefault();
    const formData = new FormData(formEvent.currentTarget);
    const nextEvent = await patchEvent("add_submission", {
      submission: {
        title: String(formData.get("title") || "").trim(),
        type: String(formData.get("type") || "receipt_upload"),
        submittedByPersonId: String(formData.get("submittedByPersonId") || "").trim(),
        status: String(formData.get("status") || "pending_approval"),
        note: String(formData.get("note") || "").trim()
      }
    });

    if (nextEvent) {
      formEvent.currentTarget.reset();
      setStatusMessage("Innsendingen er lagt i koen.");
    }
  }

  async function handleUpdateSubmission(formEvent, submission) {
    formEvent.preventDefault();
    const formData = new FormData(formEvent.currentTarget);
    const nextEvent = await patchEvent("update_submission", {
      submissionId: submission.id,
      changes: {
        status: String(formData.get("status") || submission.status)
      }
    });

    if (nextEvent) {
      setStatusMessage(`Oppdaterte innsendingen "${submission.title}".`);
    }
  }

  return (
    <section className="platform-shell stack">
      <div className="panel beta-banner">
        <div>
          <p className="eyebrow">V2 Beta</p>
          <h2>Ny arrangementsplattform ved siden av dagens losning</h2>
          <p className="lede">
            Dette er den nye arbeidsflaten for gjester, oppgaver, planlegging, godkjenning og utvidet
            oppgjor. Dagens kvitteringslosning er fortsatt tilgjengelig uendret pa startsiden.
          </p>
        </div>
        <div className="stack">
          <Link className="secondary-link" href="/">
            Tilbake til dagens app
          </Link>
          <p className="muted">Git-baseline: `main` og arbeidsgren `feature/event-platform-v2`.</p>
        </div>
      </div>

      <div className="dashboard-layout platform-layout">
        <aside className="panel event-sidebar stack">
          <div>
            <p className="eyebrow">Arrangementer</p>
            <h2>Velg arbeidsflate</h2>
          </div>

          <form className="stack" onSubmit={handleCreateEvent}>
            <label className="field">
              <span>Nytt arrangement</span>
              <input name="name" placeholder="F.eks. Hyttehelg 2026" required />
            </label>
            <button className="primary-button" disabled={isSaving} type="submit">
              Opprett arrangement
            </button>
          </form>

          <div className="event-list">
            {events.map((event) => (
              <button
                className={`event-list-item ${event.id === selectedEventId ? "selected" : ""}`}
                key={event.id}
                type="button"
                onClick={() => {
                  setSelectedEventId(event.id);
                  setActiveTab("overview");
                  setViewerId("organizer-local");
                  setFinanceEngineOpen(false);
                }}
              >
                <strong>{event.name}</strong>
                <span>
                  {event.people.length} personer, {event.tasks.length} oppgaver
                </span>
              </button>
            ))}
          </div>
        </aside>

        <div className="stack">
          {selectedEvent ? (
            <>
              <section className="panel stack">
                <div className="platform-toolbar">
                  <div>
                    <p className="eyebrow">Vis som</p>
                    <h2>{selectedEvent.name}</h2>
                  </div>
                  <label className="field inline-field">
                    <span>Persona</span>
                    <select
                      value={viewerId}
                      onChange={(event) => {
                        setViewerId(event.target.value);
                        setFinanceEngineOpen(false);
                      }}
                    >
                      <option value="organizer-local">Arrangor (lokal full tilgang)</option>
                      {selectedEvent.people.map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="tab-row">
                  {tabs.map((tab) => (
                    <button
                      className={`tab-chip ${currentTab === tab.id ? "active" : ""}`}
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <p className="muted">
                  Denne V2-flaten simulerer adgangsnivaer lokalt. Senere kan dette kobles til ekte
                  innlogging og adminstyrte brukertilganger.
                </p>
              </section>

              {currentTab === "overview" ? (
                <OverviewTab
                  approvalSummary={approvalSummary}
                  event={selectedEvent}
                  financeSummary={financeSummary}
                  guestSummary={guestSummary}
                  jobs={selectedJobs}
                  projectSummary={projectSummary}
                />
              ) : null}
              {currentTab === "guest" ? (
                <GuestTab
                  event={selectedEvent}
                  onAddPerson={handleAddPerson}
                  onUpdatePerson={handleUpdatePerson}
                  viewerAccess={viewerAccess}
                  viewerPerson={viewerPerson}
                />
              ) : null}
              {currentTab === "project" ? (
                <ProjectTab
                  event={selectedEvent}
                  onAddTask={handleAddTask}
                  onUpdateTask={handleUpdateTask}
                  viewerAccess={viewerAccess}
                  viewerPerson={viewerPerson}
                />
              ) : null}
              {currentTab === "planning" ? (
                <PlanningTab
                  event={selectedEvent}
                  onSaveOverview={handleSaveOverview}
                  viewerAccess={viewerAccess}
                />
              ) : null}
              {currentTab === "finance" ? (
                <FinanceTab
                  engineOpen={financeEngineOpen}
                  event={selectedEvent}
                  financeSummary={financeSummary}
                  jobs={selectedJobs}
                  onToggleSettlementPlan={() => setShowSettlementPlan((current) => !current)}
                  onOpenAdvanceModal={() => setFinanceModal("advance")}
                  onOpenSettlementModal={() => setFinanceModal("settlement")}
                  onToggleEngine={() => setFinanceEngineOpen((current) => !current)}
                  settlementPlan={settlementPlan}
                  showSettlementPlan={showSettlementPlan}
                  viewerAccess={viewerAccess}
                />
              ) : null}
              {currentTab === "approvals" ? (
                <ApprovalsTab
                  event={selectedEvent}
                  onAddSubmission={handleAddSubmission}
                  onUpdateSubmission={handleUpdateSubmission}
                  viewerAccess={viewerAccess}
                />
              ) : null}
            </>
          ) : (
            <section className="panel">
              <EmptyState
                title="Ingen arrangement valgt"
                body="Opprett et nytt arrangement for aa starte med planlegging, gjester, oppgaver og faktura."
              />
            </section>
          )}

          {statusMessage ? <p className="notice">{statusMessage}</p> : null}
        </div>
      </div>

      {selectedEvent && financeModal === "advance" ? (
        <ModalShell
          title="Registrer forskudd / innbetaling"
          body="Dette teller som betalt pa medlemmet, men ikke som brukt."
          onClose={() => setFinanceModal(null)}
        >
          <form className="grid-form compact-grid" onSubmit={handleAddAdvance}>
            <label className="field">
              <span>Medlem</span>
              <select defaultValue="" name="memberId" required>
                <option value="">Velg medlem</option>
                {selectedEvent.members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Belop</span>
              <input min="0" name="amount" required step="0.01" type="number" />
            </label>
            <label className="field field-span-full">
              <span>Notat</span>
              <input name="note" placeholder="F.eks. forskudd til hytte eller felleskasse" />
            </label>
            <div className="button-row">
              <button className="primary-button" type="submit">
                Registrer innbetaling
              </button>
              <button className="secondary-button" type="button" onClick={() => setFinanceModal(null)}>
                Avbryt
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {selectedEvent && financeModal === "settlement" ? (
        <ModalShell
          title="Registrer oppgjor"
          body="Bruk dette nar penger faktisk blir sendt mellom medlemmer etter fordeling."
          onClose={() => setFinanceModal(null)}
        >
          <form className="grid-form compact-grid" onSubmit={handleAddSettlement}>
            <label className="field">
              <span>Fra</span>
              <select defaultValue="" name="fromMemberId" required>
                <option value="">Velg avsender</option>
                {selectedEvent.members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Til</span>
              <select defaultValue="" name="toMemberId" required>
                <option value="">Velg mottaker</option>
                {selectedEvent.members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Belop</span>
              <input min="0" name="amount" required step="0.01" type="number" />
            </label>
            <label className="field field-span-full">
              <span>Notat</span>
              <input name="note" placeholder="F.eks. Vipps oppgjor etter arrangementet" />
            </label>
            <div className="button-row">
              <button className="primary-button" type="submit">
                Registrer oppgjor
              </button>
              <button className="secondary-button" type="button" onClick={() => setFinanceModal(null)}>
                Avbryt
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}
    </section>
  );
}
