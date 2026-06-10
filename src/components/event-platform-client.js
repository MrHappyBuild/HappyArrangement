"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";

import { DashboardClient } from "@/components/dashboard-client";
import { GuestPageContentView } from "@/components/guest-page-content-view";
import { GuestSeatingPageView } from "@/components/guest-seating-page-view";
import { GuestSiteLinksPanel } from "@/components/guest-site-links-panel";
import { VenueTab } from "@/components/venue-tab";
import {
  CAPABILITY_OPTIONS,
  FINANCE_ROLE_OPTIONS,
  GUEST_PAGE_FONT_OPTIONS,
  GUEST_PAGE_TEXT_SIZE_OPTIONS,
  GUEST_PAGE_TEXT_WEIGHT_OPTIONS,
  GUEST_PAGE_VISIBILITY_OPTIONS,
  PERSON_TEMPLATES,
  PLANNING_ROLE_OPTIONS,
  PROJECT_ROLE_OPTIONS,
  RSVP_OPTIONS,
  SUBMISSION_STATUS_OPTIONS,
  TASK_STATUS_OPTIONS,
  buildApprovalSummary,
  buildGuestSiteBasePath,
  buildGuestSiteNavigationEntries,
  canViewerSeeGuestPage,
  buildEventFinanceSummary,
  buildAgendaHighlights,
  buildProjectDashboard,
  buildProjectHierarchy,
  buildGuestSummary,
  buildProjectSummary,
  buildSettlementSuggestions,
  buildTaskAgenda,
  buildTaskSwimlanes,
  buildViewerAccess,
  ensureEventShape
} from "@/event-platform-utils";
import {
  buildTaskDependencyDragPayload,
  deriveFollowingTaskIds
} from "@/task-dependency-utils";

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

function formatClockTime(value) {
  if (!value) {
    return "--:--";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("nb-NO", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatDateBadge(value) {
  if (!value) {
    return "Ikke satt";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Ikke satt";
  }

  return new Intl.DateTimeFormat("nb-NO", {
    day: "2-digit",
    month: "short"
  }).format(date);
}

function formatAgendaGroupDate(value) {
  if (!value) {
    return "Mangler dato";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Mangler dato";
  }

  const label = new Intl.DateTimeFormat("nb-NO", {
    weekday: "long",
    day: "2-digit",
    month: "long"
  }).format(date);

  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatDurationMinutes(value) {
  const minutes = typeof value === "number" ? value : Number(value || 0);

  if (!Number.isFinite(minutes) || minutes <= 0) {
    return "0 min";
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (hours > 0 && remainder > 0) {
    return `${hours} t ${remainder} min`;
  }

  if (hours > 0) {
    return `${hours} t`;
  }

  return `${remainder} min`;
}

function buildGuestInlineStyleMarkup(text, styles) {
  const source = typeof text === "string" ? text : "";
  const attributes = [];

  if (styles?.fontPreset) {
    attributes.push(`font=${styles.fontPreset}`);
  }

  if (styles?.textSize) {
    attributes.push(`size=${styles.textSize}`);
  }

  if (styles?.textWeight) {
    attributes.push(`weight=${styles.textWeight}`);
  }

  if (!attributes.length) {
    return source;
  }

  return `[style ${attributes.join(" ")}]${source}[/style]`;
}

function stripGuestInlineStyleMarkup(text) {
  return typeof text === "string"
    ? text.replace(/\[style[^\]]*\]([\s\S]*?)\[\/style\]/gi, "$1")
    : "";
}

function collectFormList(formData, name) {
  return formData
    .getAll(name)
    .map((value) => String(value || "").trim())
    .filter(Boolean);
}

function templateOptions() {
  return Object.entries(PERSON_TEMPLATES).map(([value, template]) => ({
    value,
    label: template.label
  }));
}

function accessRoleOptions(kind) {
  if (kind === "planning") {
    return PLANNING_ROLE_OPTIONS;
  }

  if (kind === "project") {
    return PROJECT_ROLE_OPTIONS;
  }

  return FINANCE_ROLE_OPTIONS;
}

function getGuestPageVisibilityLabel(value) {
  return (
    GUEST_PAGE_VISIBILITY_OPTIONS.find((option) => option.value === value)?.label ||
    GUEST_PAGE_VISIBILITY_OPTIONS[0].label
  );
}

function getGuestPageFontLabel(value) {
  return (
    GUEST_PAGE_FONT_OPTIONS.find((option) => option.value === value)?.label ||
    GUEST_PAGE_FONT_OPTIONS[0].label
  );
}

function getGuestPageTextSizeLabel(value) {
  return (
    GUEST_PAGE_TEXT_SIZE_OPTIONS.find((option) => option.value === value)?.label ||
    GUEST_PAGE_TEXT_SIZE_OPTIONS[1].label
  );
}

function getGuestPageTextWeightLabel(value) {
  return (
    GUEST_PAGE_TEXT_WEIGHT_OPTIONS.find((option) => option.value === value)?.label ||
    GUEST_PAGE_TEXT_WEIGHT_OPTIONS[0].label
  );
}

function getRsvpLabel(value) {
  return RSVP_OPTIONS.find((option) => option.value === value)?.label || RSVP_OPTIONS[0].label;
}

function buildGuestSiteBackgroundStyle(backgroundImageUrl) {
  if (!backgroundImageUrl) {
    return undefined;
  }

  return {
    backgroundImage: `linear-gradient(180deg, rgba(255, 252, 247, 0.76), rgba(255, 248, 238, 0.9)), url(${backgroundImageUrl})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    padding: "18px",
    borderRadius: "32px"
  };
}

function buildPersonDietarySummary(person) {
  const details = [person.allergies, person.dietaryNotes].filter(Boolean);
  return details.length > 0 ? details.join(" · ") : "Ingen registrert";
}

function buildPersonContextSummary(person) {
  const details = [person.note, person.seatingNote].filter(Boolean);
  return details.length > 0 ? details.join(" · ") : "Ingen ekstra info";
}

function personTemplateValue(person) {
  const entry = Object.entries(PERSON_TEMPLATES).find(([, template]) => {
    return (
      (person.effectivePlanningRole || person.planningRole) === template.planningRole &&
      (person.effectiveProjectRole || person.projectRole) === template.projectRole &&
      (person.effectiveFinanceRole || person.financeRole) === template.financeRole
    );
  });

  return entry?.[0] || "guest";
}

function applyTemplate(key) {
  return PERSON_TEMPLATES[key] || PERSON_TEMPLATES.guest;
}

function buildRoleSummary(role) {
  const details = [];

  if ((role.planningRole || "none") !== "none") {
    details.push(`Planlegging: ${accessRoleOptions("planning").find((option) => option.value === role.planningRole)?.label || role.planningRole}`);
  }

  if ((role.projectRole || "none") !== "none") {
    details.push(`Oppgaver: ${accessRoleOptions("project").find((option) => option.value === role.projectRole)?.label || role.projectRole}`);
  }

  if ((role.financeRole || "none") !== "none") {
    details.push(`Faktura: ${accessRoleOptions("finance").find((option) => option.value === role.financeRole)?.label || role.financeRole}`);
  }

  const capabilityLabels = CAPABILITY_OPTIONS.filter(
    (option) => role.capabilities?.[option.key]
  ).map((option) => option.label);

  if (capabilityLabels.length) {
    details.push(capabilityLabels.join(" · "));
  }

  return details.length ? details.join(" • ") : "Ingen ekstra tilgang";
}

function buildPersonRoleNames(person, eventRoles) {
  const roles = Array.isArray(eventRoles) ? eventRoles : [];
  const assignedRoleNames = roles
    .filter((role) => (person.roleIds || []).includes(role.id))
    .map((role) => role.name);

  if (assignedRoleNames.length) {
    return assignedRoleNames;
  }

  const templateLabel = PERSON_TEMPLATES[personTemplateValue(person)]?.label;
  return templateLabel ? [templateLabel] : ["Tilpasset tilgang"];
}

function buildPersonRoleSummary(person, eventRoles) {
  const names = buildPersonRoleNames(person, eventRoles);

  if (names.length <= 2) {
    return names.join(" · ");
  }

  return `${names.length} roller`;
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
          <Link className="secondary-link" href="/receipts">
            Aapne dagens kvitteringsmotor
          </Link>
        </div>
        <div className="overview-grid">
          <InfoCard label="Inviterte" value={guestSummary.invited} />
          <InfoCard label="Kommer" value={guestSummary.accepted} tone="success" />
          <InfoCard label="Oppgaver" value={projectSummary.total} />
          <InfoCard label="Pa agenda" value={projectSummary.agendaVisible || 0} />
          <InfoCard label="Hovedoppgaver" value={projectSummary.parentTasks || 0} />
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

function GuestTab({
  event,
  viewerAccess,
  viewerPerson,
  onAddGuestPage,
  onUpdateGuestPage,
  onDeleteGuestPage,
  onAddRole,
  onUpdateRole,
  onAddPerson,
  onUpdatePerson
}) {
  const templateList = templateOptions();
  const visiblePages = useMemo(() => {
    const navigationEntries = buildGuestSiteNavigationEntries(event);
    return navigationEntries.filter((page) =>
      page.kind === "venue_seating" ? true : canViewerSeeGuestPage(page, viewerAccess, viewerPerson)
    );
  }, [event, viewerAccess, viewerPerson]);
  const [selectedPageId, setSelectedPageId] = useState(visiblePages[0]?.id || "");
  const [draftPage, setDraftPage] = useState(null);
  const [mediaStatus, setMediaStatus] = useState("");
  const [inlineStyleStatus, setInlineStyleStatus] = useState("");
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [guestSiteOrigin, setGuestSiteOrigin] = useState("");
  const [guestSiteIntroDraft, setGuestSiteIntroDraft] = useState("");
  const [guestSiteNavigationLabelDraft, setGuestSiteNavigationLabelDraft] = useState("Navigasjon");
  const [guestSiteBackgroundImageUrlDraft, setGuestSiteBackgroundImageUrlDraft] = useState("");
  const [guestSiteBackgroundStatus, setGuestSiteBackgroundStatus] = useState("");
  const [isUploadingGuestSiteBackground, setIsUploadingGuestSiteBackground] = useState(false);
  const [openRoleId, setOpenRoleId] = useState("");
  const [openPersonId, setOpenPersonId] = useState("");
  const [textSelection, setTextSelection] = useState({ start: 0, end: 0 });
  const [inlineStyleControls, setInlineStyleControls] = useState({
    fontPreset: "",
    textSize: "",
    textWeight: ""
  });
  const guestPageTextareaRef = useRef(null);
  const inlineFontOptions = useMemo(
    () => [{ value: "", label: "Behold font" }, ...GUEST_PAGE_FONT_OPTIONS],
    []
  );
  const inlineSizeOptions = useMemo(
    () => [{ value: "", label: "Behold størrelse" }, ...GUEST_PAGE_TEXT_SIZE_OPTIONS],
    []
  );
  const inlineWeightOptions = useMemo(
    () => [{ value: "", label: "Behold vekt" }, ...GUEST_PAGE_TEXT_WEIGHT_OPTIONS],
    []
  );
  const selectedPage = visiblePages.find((page) => page.id === selectedPageId) || visiblePages[0] || null;
  const isVenueSeatingPage = selectedPage?.kind === "venue_seating";
  const editablePage = !isVenueSeatingPage ? selectedPage : null;
  const previewPage =
    viewerAccess.canManageGuest && draftPage && editablePage ? { ...editablePage, ...draftPage } : editablePage;
  const guestSiteBasePath = useMemo(() => buildGuestSiteBasePath(event), [event]);
  const guestSiteBaseUrl = guestSiteOrigin ? `${guestSiteOrigin}${guestSiteBasePath}` : guestSiteBasePath;
  const guestSiteShellStyle = useMemo(
    () => buildGuestSiteBackgroundStyle(guestSiteBackgroundImageUrlDraft),
    [guestSiteBackgroundImageUrlDraft]
  );
  const guestPageLinks = useMemo(
    () =>
      buildGuestSiteNavigationEntries(event).map((page) => ({
        ...page,
        url: guestSiteOrigin ? `${guestSiteOrigin}${page.path}` : page.path
      })),
    [event, guestSiteOrigin]
  );

  useEffect(() => {
    if (!visiblePages.some((page) => page.id === selectedPageId)) {
      setSelectedPageId(visiblePages[0]?.id || "");
    }
  }, [selectedPageId, visiblePages]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setGuestSiteOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    setGuestSiteIntroDraft(event.guestSite?.introText || "");
    setGuestSiteNavigationLabelDraft(event.guestSite?.navigationLabel || "Navigasjon");
    setGuestSiteBackgroundImageUrlDraft(event.guestSite?.backgroundImageUrl || "");
    setGuestSiteBackgroundStatus("");
  }, [event.guestSite?.backgroundImageUrl, event.guestSite?.introText, event.guestSite?.navigationLabel, event.id]);

  useEffect(() => {
    if (!editablePage) {
      setDraftPage(null);
      setMediaStatus("");
      setInlineStyleStatus("");
      setTextSelection({ start: 0, end: 0 });
      return;
    }

    setDraftPage({
      title: editablePage.title || "",
      menuLabel: editablePage.menuLabel || "",
      visibility: editablePage.visibility || "open",
      fontPreset: editablePage.fontPreset || "clean",
      textSize: editablePage.textSize || "md",
      textWeight: editablePage.textWeight || "regular",
      showImageCaption: Boolean(editablePage.showImageCaption),
      content: editablePage.content || ""
    });
    setMediaStatus("");
    setInlineStyleStatus("");
    setTextSelection({ start: 0, end: 0 });
  }, [editablePage]);

  function replaceGuestPageTextSelection(nextValue, selectionStart, selectionEnd) {
    setDraftPage((currentDraft) =>
      currentDraft
        ? {
            ...currentDraft,
            content: nextValue
          }
        : currentDraft
    );

    requestAnimationFrame(() => {
      const textarea = guestPageTextareaRef.current;

      if (!textarea) {
        return;
      }

      textarea.focus();
      textarea.setSelectionRange(selectionStart, selectionEnd);
      setTextSelection({
        start: selectionStart,
        end: selectionEnd
      });
    });
  }

  function applyInlineStyleToSelectedText() {
    const textarea = guestPageTextareaRef.current;
    const currentContent = draftPage?.content || "";

    if (!textarea) {
      return;
    }

    const selectionStart = textSelection.start ?? textarea.selectionStart ?? 0;
    const selectionEnd = textSelection.end ?? textarea.selectionEnd ?? 0;

    if (selectionStart === selectionEnd) {
      setInlineStyleStatus("Marker teksten du vil endre først.");
      return;
    }

    if (
      !inlineStyleControls.fontPreset &&
      !inlineStyleControls.textSize &&
      !inlineStyleControls.textWeight
    ) {
      setInlineStyleStatus("Velg minst én tekstendring før du bruker den på markert tekst.");
      return;
    }

    const selectedText = currentContent.slice(selectionStart, selectionEnd);
    const normalizedSelection = stripGuestInlineStyleMarkup(selectedText);
    const styledText = buildGuestInlineStyleMarkup(normalizedSelection, inlineStyleControls);
    const nextContent = `${currentContent.slice(0, selectionStart)}${styledText}${currentContent.slice(selectionEnd)}`;

    replaceGuestPageTextSelection(nextContent, selectionStart, selectionStart + styledText.length);
    setInlineStyleStatus("Stilen er lagt på den markerte teksten.");
  }

  function removeInlineStyleFromSelectedText() {
    const textarea = guestPageTextareaRef.current;
    const currentContent = draftPage?.content || "";

    if (!textarea) {
      return;
    }

    const selectionStart = textSelection.start ?? textarea.selectionStart ?? 0;
    const selectionEnd = textSelection.end ?? textarea.selectionEnd ?? 0;

    if (selectionStart === selectionEnd) {
      setInlineStyleStatus("Marker teksten eller stilblokken du vil rydde opp i først.");
      return;
    }

    const selectedText = currentContent.slice(selectionStart, selectionEnd);
    const unwrappedText = stripGuestInlineStyleMarkup(selectedText);

    if (unwrappedText === selectedText) {
      setInlineStyleStatus("Fant ingen tekststil i markeringen som kunne fjernes.");
      return;
    }

    const nextContent = `${currentContent.slice(0, selectionStart)}${unwrappedText}${currentContent.slice(selectionEnd)}`;

    replaceGuestPageTextSelection(nextContent, selectionStart, selectionStart + unwrappedText.length);
    setInlineStyleStatus("Tekststilen ble fjernet fra markeringen.");
  }

  async function handleGuestPageMediaUpload(eventObject) {
    const file = eventObject.currentTarget.files?.[0];

    if (!file || !editablePage || !viewerAccess.canManageGuest) {
      return;
    }

    setIsUploadingMedia(true);
    setMediaStatus("");
    setInlineStyleStatus("");

    try {
      const formData = new FormData();
      formData.set("image", file);

      const response = await fetch(`/api/events/${event.id}/guest-media`, {
        method: "POST",
        body: formData
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body?.error || "Kunne ikke laste opp bildet.");
      }

      const currentContent = draftPage?.content || "";
      const nextContent = currentContent.trim()
        ? `${currentContent.trim()}\n\n${body.markdown}`
        : body.markdown;

      setDraftPage((currentDraft) =>
        currentDraft
          ? {
              ...currentDraft,
              content: nextContent
            }
          : currentDraft
      );
      setMediaStatus("Bildet er satt inn i innholdet. Lagre siden for aa beholde endringen.");
    } catch (error) {
      setMediaStatus(error instanceof Error ? error.message : "Kunne ikke laste opp bildet.");
    } finally {
      eventObject.currentTarget.value = "";
      setIsUploadingMedia(false);
    }
  }

  async function handleSaveGuestSiteIntro() {
    if (!viewerAccess.canManageGuest) {
      return;
    }

    const nextEvent = await patchEvent("update_guest_site", {
      guestSite: {
        introText: guestSiteIntroDraft,
        navigationLabel: guestSiteNavigationLabelDraft,
        backgroundImageUrl: guestSiteBackgroundImageUrlDraft
      }
    });

    if (nextEvent) {
      setStatusMessage("Gjestenettsiden ble oppdatert.");
    }
  }

  async function handleGuestSiteBackgroundUpload(eventObject) {
    const file = eventObject.currentTarget.files?.[0];

    if (!file || !viewerAccess.canManageGuest) {
      return;
    }

    setIsUploadingGuestSiteBackground(true);
    setGuestSiteBackgroundStatus("");

    try {
      const formData = new FormData();
      formData.set("image", file);

      const response = await fetch(`/api/events/${event.id}/guest-media`, {
        method: "POST",
        body: formData
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body?.error || "Kunne ikke laste opp bakgrunnsbildet.");
      }

      setGuestSiteBackgroundImageUrlDraft(body.url);
      setGuestSiteBackgroundStatus(
        "Bakgrunnsbildet er valgt. Lagre gjestenettsiden for å publisere det."
      );
    } catch (error) {
      setGuestSiteBackgroundStatus(
        error instanceof Error ? error.message : "Kunne ikke laste opp bakgrunnsbildet."
      );
    } finally {
      eventObject.currentTarget.value = "";
      setIsUploadingGuestSiteBackground(false);
    }
  }

  function handleRemoveGuestSiteBackgroundImage() {
    if (!viewerAccess.canManageGuest) {
      return;
    }

    setGuestSiteBackgroundImageUrlDraft("");
    setGuestSiteBackgroundStatus("Bakgrunnsbildet er fjernet. Lagre gjestenettsiden for å oppdatere publiseringen.");
  }

  return (
    <div className="stack">
      <section className="panel stack">
        <div className="panel-header-inline">
          <div>
            <h3>Gjestenettside</h3>
            <p className="muted">
              Lag egne informasjonssider for gjestene, og la dem navigere i en venstremeny som hører til dette arrangementet.
            </p>
          </div>
        </div>
        <GuestSiteLinksPanel
          baseUrl={guestSiteBaseUrl}
          canManageGuest={viewerAccess.canManageGuest}
          introText={guestSiteIntroDraft}
          navigationLabel={guestSiteNavigationLabelDraft}
          backgroundImageUrl={guestSiteBackgroundImageUrlDraft}
          backgroundUploadStatus={guestSiteBackgroundStatus}
          isUploadingBackground={isUploadingGuestSiteBackground}
          pageLinks={guestPageLinks}
          onIntroTextChange={setGuestSiteIntroDraft}
          onNavigationLabelChange={setGuestSiteNavigationLabelDraft}
          onBackgroundUpload={handleGuestSiteBackgroundUpload}
          onRemoveBackgroundImage={handleRemoveGuestSiteBackgroundImage}
          onSaveIntro={handleSaveGuestSiteIntro}
        />
        <div className="guest-site-shell" style={guestSiteShellStyle}>
          <aside className="guest-site-sidebar">
            <div className="stack">
              <p className="eyebrow">{guestSiteNavigationLabelDraft || "Navigasjon"}</p>
              <nav className="guest-site-menu">
                {visiblePages.map((page) => (
                  <button
                    className={`guest-site-link ${selectedPage?.id === page.id ? "is-active" : ""}`}
                    key={page.id}
                    type="button"
                    onClick={() => setSelectedPageId(page.id)}
                  >
                    <strong>{page.menuLabel || page.title}</strong>
                    <span>{page.title}</span>
                    {viewerAccess.canManageGuest && page.kind !== "venue_seating" ? (
                      <small className="guest-page-visibility-badge">
                        {getGuestPageVisibilityLabel(page.visibility)}
                      </small>
                    ) : null}
                  </button>
                ))}
              </nav>
            </div>
            {viewerAccess.canManageGuest ? (
              <form className="stack guest-page-composer" onSubmit={onAddGuestPage}>
                <label className="field">
                  <span>Ny side</span>
                  <input name="title" placeholder="F.eks. Program, Overnatting eller FAQ" required />
                </label>
                <label className="field">
                  <span>Synlighet</span>
                  <select defaultValue="open" name="visibility">
                    {GUEST_PAGE_VISIBILITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="secondary-button" type="submit">
                  Opprett side
                </button>
              </form>
            ) : null}
          </aside>

          <div className="guest-site-stage stack">
            {selectedPage ? (
              <>
                <article className="guest-site-preview">
                  <h2>{previewPage?.title || selectedPage.title}</h2>
                  {viewerAccess.canManageGuest && !isVenueSeatingPage ? (
                    <div className="guest-page-settings-summary">
                      <p className="guest-page-visibility-note">
                        Synlighet: {getGuestPageVisibilityLabel(previewPage?.visibility || selectedPage.visibility)}
                      </p>
                      <p className="guest-page-visibility-note">
                        Font: {getGuestPageFontLabel(previewPage?.fontPreset || selectedPage.fontPreset)}
                      </p>
                      <p className="guest-page-visibility-note">
                        Størrelse: {getGuestPageTextSizeLabel(previewPage?.textSize || selectedPage.textSize)}
                      </p>
                      <p className="guest-page-visibility-note">
                        Tekstvekt: {getGuestPageTextWeightLabel(previewPage?.textWeight || selectedPage.textWeight)}
                      </p>
                      <p className="guest-page-visibility-note">
                        Bildetekst: {Boolean(previewPage?.showImageCaption) ? "Vises" : "Skjult"}
                      </p>
                    </div>
                  ) : null}
                  {isVenueSeatingPage ? (
                    <GuestSeatingPageView event={event} title={selectedPage.title} />
                  ) : (
                    <div
                      className={`guest-site-copy guest-page-font-${previewPage?.fontPreset || "clean"} guest-page-size-${
                        previewPage?.textSize || "md"
                      } guest-page-weight-${previewPage?.textWeight || "regular"}`}
                    >
                      <GuestPageContentView
                        content={previewPage?.content || ""}
                        showImageCaption={Boolean(previewPage?.showImageCaption)}
                      />
                    </div>
                  )}
                </article>

                {viewerAccess.canManageGuest && !isVenueSeatingPage ? (
                  <form
                    className="panel stack guest-page-editor"
                    key={selectedPage.id}
                    onSubmit={(eventObject) => onUpdateGuestPage(eventObject, selectedPage, draftPage)}
                  >
                    <div className="panel-header-inline">
                      <div>
                        <h3>Rediger side</h3>
                        <p className="muted">Endringene lagres bare for denne valgte siden.</p>
                      </div>
                      <button
                        className="danger-button compact-action-button"
                        type="button"
                        onClick={() => onDeleteGuestPage(selectedPage)}
                      >
                        Slett side
                      </button>
                    </div>
                    <label className="field">
                      <span>Sidetittel</span>
                      <input
                        name="title"
                        onChange={(eventObject) => {
                          const nextValue = eventObject.currentTarget.value;
                          setDraftPage((currentDraft) => ({
                            ...(currentDraft || {}),
                            title: nextValue
                          }));
                        }}
                        required
                        value={draftPage?.title || ""}
                      />
                    </label>
                    <label className="field">
                      <span>Menynavn</span>
                      <input
                        name="menuLabel"
                        onChange={(eventObject) => {
                          const nextValue = eventObject.currentTarget.value;
                          setDraftPage((currentDraft) => ({
                            ...(currentDraft || {}),
                            menuLabel: nextValue
                          }));
                        }}
                        placeholder="Kort navn i venstremenyen"
                        value={draftPage?.menuLabel || ""}
                      />
                    </label>
                    <label className="field">
                      <span>Synlighet</span>
                      <select
                        name="visibility"
                        onChange={(eventObject) => {
                          const nextValue = eventObject.currentTarget.value;
                          setDraftPage((currentDraft) => ({
                            ...(currentDraft || {}),
                            visibility: nextValue
                          }));
                        }}
                        value={draftPage?.visibility || "open"}
                      >
                        {GUEST_PAGE_VISIBILITY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="guest-page-design-grid">
                      <label className="field">
                        <span>Font</span>
                        <select
                          name="fontPreset"
                          onChange={(eventObject) => {
                            const nextValue = eventObject.currentTarget.value;
                            setDraftPage((currentDraft) => ({
                              ...(currentDraft || {}),
                              fontPreset: nextValue
                            }));
                          }}
                          value={draftPage?.fontPreset || "clean"}
                        >
                          {GUEST_PAGE_FONT_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span>Størrelse</span>
                        <select
                          name="textSize"
                          onChange={(eventObject) => {
                            const nextValue = eventObject.currentTarget.value;
                            setDraftPage((currentDraft) => ({
                              ...(currentDraft || {}),
                              textSize: nextValue
                            }));
                          }}
                          value={draftPage?.textSize || "md"}
                        >
                          {GUEST_PAGE_TEXT_SIZE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span>Tekstvekt</span>
                        <select
                          name="textWeight"
                          onChange={(eventObject) => {
                            const nextValue = eventObject.currentTarget.value;
                            setDraftPage((currentDraft) => ({
                              ...(currentDraft || {}),
                              textWeight: nextValue
                            }));
                          }}
                          value={draftPage?.textWeight || "regular"}
                        >
                          {GUEST_PAGE_TEXT_WEIGHT_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field checkbox-field">
                        <span>Bilder</span>
                        <span className="checkbox-inline">
                          <input
                            checked={Boolean(draftPage?.showImageCaption)}
                            name="showImageCaption"
                            onChange={(eventObject) => {
                              const nextValue = eventObject.currentTarget.checked;
                              setDraftPage((currentDraft) => ({
                                ...(currentDraft || {}),
                                showImageCaption: nextValue
                              }));
                            }}
                            type="checkbox"
                          />
                          <span>Vis tekst under bilder</span>
                        </span>
                      </label>
                    </div>
                    <div className="guest-page-toolbar">
                      <label className="secondary-button guest-page-upload-button">
                        <input
                          accept="image/jpeg,image/png,image/webp"
                          className="visually-hidden"
                          disabled={isUploadingMedia}
                          onChange={handleGuestPageMediaUpload}
                          type="file"
                        />
                        {isUploadingMedia ? "Laster opp bilde..." : "Last opp bilde"}
                      </label>
                      <p className="guest-page-help">
                        Du kan ogsa bruke `[lenketekst](https://...)` for klikkbare lenker.
                      </p>
                      {mediaStatus ? <p className="guest-page-upload-status">{mediaStatus}</p> : null}
                    </div>
                    <div className="guest-page-inline-style-panel">
                      <div className="guest-page-inline-style-grid">
                        <label className="field">
                          <span>Marker tekst og velg font</span>
                          <select
                            name="inlineFontPreset"
                            onChange={(eventObject) => {
                              const nextValue = eventObject.currentTarget.value;
                              setInlineStyleControls((currentValue) => ({
                                ...currentValue,
                                fontPreset: nextValue
                              }));
                            }}
                            value={inlineStyleControls.fontPreset}
                          >
                            {inlineFontOptions.map((option) => (
                              <option key={option.value || "font-default"} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="field">
                          <span>Størrelse</span>
                          <select
                            name="inlineTextSize"
                            onChange={(eventObject) => {
                              const nextValue = eventObject.currentTarget.value;
                              setInlineStyleControls((currentValue) => ({
                                ...currentValue,
                                textSize: nextValue
                              }));
                            }}
                            value={inlineStyleControls.textSize}
                          >
                            {inlineSizeOptions.map((option) => (
                              <option key={option.value || "size-default"} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="field">
                          <span>Tekstvekt</span>
                          <select
                            name="inlineTextWeight"
                            onChange={(eventObject) => {
                              const nextValue = eventObject.currentTarget.value;
                              setInlineStyleControls((currentValue) => ({
                                ...currentValue,
                                textWeight: nextValue
                              }));
                            }}
                            value={inlineStyleControls.textWeight}
                          >
                            {inlineWeightOptions.map((option) => (
                              <option key={option.value || "weight-default"} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <div className="button-row">
                        <button
                          className="secondary-button"
                          type="button"
                          onMouseDown={(eventObject) => eventObject.preventDefault()}
                          onClick={applyInlineStyleToSelectedText}
                        >
                          Bruk på markert tekst
                        </button>
                        <button
                          className="secondary-button subtle-button"
                          type="button"
                          onMouseDown={(eventObject) => eventObject.preventDefault()}
                          onClick={removeInlineStyleFromSelectedText}
                        >
                          Fjern stil i markering
                        </button>
                      </div>
                      <p className="guest-page-help">
                        Marker teksten direkte i feltet under, og bruk deretter stilvalgene bare på
                        den markerte delen.
                      </p>
                      {inlineStyleStatus ? (
                        <p className="guest-page-upload-status">{inlineStyleStatus}</p>
                      ) : null}
                    </div>
                    <label className="field">
                      <span>Innhold</span>
                      <textarea
                        className="guest-page-textarea"
                        ref={guestPageTextareaRef}
                        name="content"
                        onChange={(eventObject) => {
                          const nextValue = eventObject.currentTarget.value;
                          setDraftPage((currentDraft) => ({
                            ...(currentDraft || {}),
                            content: nextValue
                          }));
                        }}
                        onClick={(eventObject) => {
                          setTextSelection({
                            start: eventObject.currentTarget.selectionStart ?? 0,
                            end: eventObject.currentTarget.selectionEnd ?? 0
                          });
                        }}
                        onKeyUp={(eventObject) => {
                          setTextSelection({
                            start: eventObject.currentTarget.selectionStart ?? 0,
                            end: eventObject.currentTarget.selectionEnd ?? 0
                          });
                        }}
                        onSelect={(eventObject) => {
                          setTextSelection({
                            start: eventObject.currentTarget.selectionStart ?? 0,
                            end: eventObject.currentTarget.selectionEnd ?? 0
                          });
                        }}
                        rows={14}
                        value={draftPage?.content || ""}
                      />
                    </label>
                    <button className="secondary-button" type="submit">
                      Lagre side
                    </button>
                  </form>
                ) : null}
                {viewerAccess.canManageGuest && isVenueSeatingPage ? (
                  <section className="panel stack guest-page-editor">
                    <div className="panel-header-inline">
                      <div>
                        <h3>Sitteplansiden styres fra lokaleplanen</h3>
                        <p className="muted">
                          Gå til <strong>Lokale</strong> og slå av/på publisering der. Her vises siden bare som forhåndsvisning sammen med resten av gjestenettsiden.
                        </p>
                      </div>
                    </div>
                    <div className="notice">
                      <strong>Ingen ekstra gjesteinformasjon deles</strong>
                      <p>
                        Denne siden viser bare navn, bord og plasseringer, samt søk på navn for å finne riktig bord.
                      </p>
                    </div>
                  </section>
                ) : null}
              </>
            ) : (
              <EmptyState
                title={event.guestPages.length ? "Ingen sider synlige" : "Ingen sider enda"}
                body={
                  event.guestPages.length
                    ? "Denne visningen har ikke tilgang til noen av sidene akkurat na."
                    : "Arrangoren kan opprette egne informasjonssider for gjestene her."
                }
              />
            )}
          </div>
        </div>
      </section>

      {viewerAccess.canManageGuest ? (
        <>
          <section className="panel stack">
            <h3>Roller og tilganger</h3>
            <p className="muted">
              Lag roller for arrangementet og gi dem tilgang til planlegging, oppgaver, faktura og ekstra handlinger.
            </p>
            <form className="grid-form compact-grid" onSubmit={onAddRole}>
              <label className="field">
                <span>Navn på rolle</span>
                <input name="name" placeholder="F.eks. Toastmaster, Familiekoordinator eller Regnskapsansvarlig" required />
              </label>
              <label className="field">
                <span>Start fra</span>
                <select defaultValue="guest" name="template">
                  {templateList.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field field-span-full">
                <span>Beskrivelse</span>
                <input name="description" placeholder="Hva skal denne rollen brukes til?" />
              </label>
              <button className="primary-button" type="submit">
                Opprett rolle
              </button>
            </form>
            <div className="person-list">
              <div className="person-list-header person-role-list-header">
                <span>Rolle</span>
                <span>Planlegging</span>
                <span>Oppgaver</span>
                <span>Faktura</span>
                <span>Tilganger</span>
                <span>Detaljer</span>
              </div>
              {event.roles.map((role) => {
                const isOpen = openRoleId === role.id;
                const capabilitySummary = CAPABILITY_OPTIONS.filter(
                  (option) => role.capabilities?.[option.key]
                )
                  .map((option) => option.label)
                  .join(" · ");

                return (
                  <article className={`person-list-item ${isOpen ? "is-open" : ""}`} key={role.id}>
                    <div className="person-list-row person-role-list-row">
                      <div className="person-list-main">
                        <strong>{role.name}</strong>
                        <span>{role.description || "Ingen beskrivelse enda"}</span>
                      </div>
                      <span className="role-pill">
                        {PLANNING_ROLE_OPTIONS.find((option) => option.value === role.planningRole)?.label || "Ingen"}
                      </span>
                      <span className="role-pill">
                        {PROJECT_ROLE_OPTIONS.find((option) => option.value === role.projectRole)?.label || "Ingen"}
                      </span>
                      <span className="role-pill">
                        {FINANCE_ROLE_OPTIONS.find((option) => option.value === role.financeRole)?.label || "Ingen"}
                      </span>
                      <span className="person-list-summary">{capabilitySummary || "Ingen ekstra"}</span>
                      <button
                        className="secondary-button compact-action-button"
                        type="button"
                        onClick={() =>
                          setOpenRoleId((currentValue) => (currentValue === role.id ? "" : role.id))
                        }
                      >
                        {isOpen ? "Lukk" : "Åpne"}
                      </button>
                    </div>
                    {isOpen ? (
                      <form
                        className="person-list-detail stack"
                        onSubmit={(eventObject) => onUpdateRole(eventObject, role)}
                      >
                        <div className="compact-grid">
                          <label className="field">
                            <span>Navn</span>
                            <input defaultValue={role.name} name="name" required />
                          </label>
                          <label className="field field-span-full">
                            <span>Beskrivelse</span>
                            <input defaultValue={role.description} name="description" placeholder="Hva rollen skal brukes til" />
                          </label>
                          <label className="field">
                            <span>Planlegging</span>
                            <select defaultValue={role.planningRole} name="planningRole">
                              {PLANNING_ROLE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="field">
                            <span>Oppgaver</span>
                            <select defaultValue={role.projectRole} name="projectRole">
                              {PROJECT_ROLE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="field">
                            <span>Faktura</span>
                            <select defaultValue={role.financeRole} name="financeRole">
                              {FINANCE_ROLE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <div className="toggle-row">
                          {CAPABILITY_OPTIONS.map((option) => (
                            <label key={option.key}>
                              <input
                                defaultChecked={Boolean(role.capabilities?.[option.key])}
                                name={option.key}
                                type="checkbox"
                              />
                              {option.label}
                            </label>
                          ))}
                        </div>
                        <div className="button-row">
                          <button className="secondary-button" type="submit">
                            Lagre rolle
                          </button>
                        </div>
                      </form>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>

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
                <span>Mobilnummer</span>
                <input name="phone" placeholder="+47 900 00 000" type="tel" />
              </label>
              <label className="field">
                <span>Startrolle</span>
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
              <label className="field">
                <span>Allergier</span>
                <input name="allergies" placeholder="F.eks. notter, skalldyr eller laktose" />
              </label>
              <label className="field">
                <span>Matpreferanser</span>
                <input name="dietaryNotes" placeholder="F.eks. vegetar, halal eller alkoholfritt" />
              </label>
              <label className="field field-span-full">
                <span>Sitteinfo</span>
                <input
                  name="seatingNote"
                  placeholder="F.eks. bor sitte narmt familien, unna hoy musikk eller ved barnestol"
                />
              </label>
              <button className="primary-button" type="submit">
                Legg til person
              </button>
            </form>
          </section>
        </>
      ) : null}

      <section className="panel stack">
        <h3>Personer i arrangementet</h3>
        {event.people.length === 0 ? (
          <EmptyState
            title="Ingen personer enda"
            body="Legg til gjester, hjelpere eller fakturamedlemmer for aa styre tilgangene."
          />
        ) : (
          <div className="person-list">
            <div className="person-list-header">
              <span>Person</span>
              <span>RSVP</span>
              <span>Allergier og mat</span>
              <span>Roller</span>
              <span>Merknader</span>
              <span>Detaljer</span>
            </div>
            {event.people.map((person) => {
              const canEditSelf = !viewerAccess.canManageGuest && viewerPerson?.id === person.id;
              const canSave = viewerAccess.canManageGuest || canEditSelf;
              const isOpen = openPersonId === person.id;
              const roleLabel = buildPersonRoleSummary(person, event.roles);
              const dietarySummary = buildPersonDietarySummary(person);
              const contextSummary = buildPersonContextSummary(person);

              return (
                <article className={`person-list-item ${isOpen ? "is-open" : ""}`} key={person.id}>
                  <div className="person-list-row">
                    <div className="person-list-main">
                      <strong>{person.name}</strong>
                      <span>{[person.email || "Ingen e-post", person.phone || "Ingen mobil"].join(" · ")}</span>
                    </div>
                    <span className={`role-pill role-pill-rsvp role-pill-rsvp-${person.rsvpStatus || "pending"}`}>
                      {getRsvpLabel(person.rsvpStatus)}
                    </span>
                    <span className="person-list-summary">{dietarySummary}</span>
                    <span className="role-pill">{roleLabel}</span>
                    <span className="person-list-summary">{contextSummary}</span>
                    <button
                      className="secondary-button compact-action-button"
                      type="button"
                      onClick={() =>
                        setOpenPersonId((currentValue) => (currentValue === person.id ? "" : person.id))
                      }
                    >
                      {isOpen ? "Lukk" : "Åpne"}
                    </button>
                  </div>
                  {isOpen ? (
                    <form
                      className="person-list-detail stack"
                      onSubmit={(eventObject) => onUpdatePerson(eventObject, person)}
                    >
                      <input name="personId" type="hidden" value={person.id} />
                      <div className="compact-grid">
                        <label className="field">
                          <span>Navn</span>
                          <input
                            defaultValue={person.name}
                            disabled={!canSave}
                            name="name"
                            placeholder="Fornavn Etternavn"
                            required
                          />
                        </label>
                        <label className="field">
                          <span>E-post</span>
                          <input
                            defaultValue={person.email}
                            disabled={!canSave}
                            name="email"
                            placeholder="navn@epost.no"
                            type="email"
                          />
                        </label>
                        <label className="field">
                          <span>Mobilnummer</span>
                          <input
                            defaultValue={person.phone}
                            disabled={!canSave}
                            name="phone"
                            placeholder="+47 900 00 000"
                            type="tel"
                          />
                        </label>
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
                        {viewerAccess.canManageGuest ? (
                          <label className="field field-span-full">
                            <span>Roller</span>
                            <RoleChecklist
                              disabled={!viewerAccess.canManageGuest}
                              roles={event.roles}
                              selectedIds={person.roleIds || []}
                            />
                          </label>
                        ) : null}
                      </div>
                      {viewerAccess.canManageGuest ? (
                        <>
                          <div className="notice">
                            <strong>Direkte overstyring</strong>
                            <p>
                              Roller styrer normalt tilgangen. Bruk feltene under bare hvis denne personen skal ha ekstra eller avvikende tilgang utover rollene sine.
                            </p>
                          </div>
                          <div className="toggle-row">
                            <label>
                              <input
                                defaultChecked={Boolean(person.useDirectAccessOverrides)}
                                name="useDirectAccessOverrides"
                                type="checkbox"
                              />
                              Bruk direkte overstyring i tillegg til rollene
                            </label>
                          </div>
                          <div className="compact-grid">
                            <label className="field">
                              <span>Planlegging</span>
                              <select
                                defaultValue={person.planningRole}
                                disabled={!viewerAccess.canManageGuest}
                                name="planningRole"
                              >
                                {PLANNING_ROLE_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="field">
                              <span>Oppgaver</span>
                              <select
                                defaultValue={person.projectRole}
                                disabled={!viewerAccess.canManageGuest}
                                name="projectRole"
                              >
                                {PROJECT_ROLE_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="field">
                              <span>Faktura</span>
                              <select
                                defaultValue={person.financeRole}
                                disabled={!viewerAccess.canManageGuest}
                                name="financeRole"
                              >
                                {FINANCE_ROLE_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                          <div className="toggle-row">
                            {CAPABILITY_OPTIONS.map((option) => (
                              <label key={option.key}>
                                <input
                                  defaultChecked={Boolean(person.capabilities?.[option.key])}
                                  disabled={!viewerAccess.canManageGuest}
                                  name={option.key}
                                  type="checkbox"
                                />
                                {option.label}
                              </label>
                            ))}
                          </div>
                        </>
                      ) : null}
                      <div className="compact-grid">
                        <label className="field">
                          <span>Notat</span>
                          <input
                            defaultValue={person.note}
                            disabled={!canSave}
                            name="note"
                            placeholder="Rolle, ansvar eller info"
                          />
                        </label>
                        <label className="field">
                          <span>Allergier</span>
                          <input
                            defaultValue={person.allergies}
                            disabled={!canSave}
                            name="allergies"
                            placeholder="F.eks. gluten eller notter"
                          />
                        </label>
                        <label className="field">
                          <span>Matpreferanser</span>
                          <input
                            defaultValue={person.dietaryNotes}
                            disabled={!canSave}
                            name="dietaryNotes"
                            placeholder="F.eks. vegetar eller alkoholfritt"
                          />
                        </label>
                        <label className="field field-span-full">
                          <span>Sitteinfo</span>
                          <input
                            defaultValue={person.seatingNote}
                            disabled={!canSave}
                            name="seatingNote"
                            placeholder="F.eks. narmt scene, ved partner eller unna trekk"
                          />
                        </label>
                      </div>
                      {canSave ? (
                        <div className="button-row">
                          <button className="secondary-button" type="submit">
                            {viewerAccess.canManageGuest ? "Lagre person" : "Oppdater mitt svar"}
                          </button>
                        </div>
                      ) : (
                        <p className="muted">Lesetilgang for denne visningen.</p>
                      )}
                    </form>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function DependencyChecklist({ options, selectedIds, disabled, inputName }) {
  if (options.length === 0) {
    return <p className="muted">Ingen andre aktiviteter aa koble til enda.</p>;
  }

  return (
    <div className="dependency-chip-grid">
      {options.map((option) => (
        <label className="dependency-chip" key={option.id}>
          <input
            defaultChecked={selectedIds.includes(option.id)}
            disabled={disabled}
            name={inputName}
            type="checkbox"
            value={option.id}
          />
          <span>{option.title || "Uten tittel"}</span>
        </label>
      ))}
    </div>
  );
}

function RoleChecklist({ roles, selectedIds, disabled, inputName = "roleIds" }) {
  const [checkedIds, setCheckedIds] = useState(selectedIds);

  useEffect(() => {
    setCheckedIds(selectedIds);
  }, [selectedIds]);

  if (roles.length === 0) {
    return <p className="muted">Ingen roller er opprettet for arrangementet enda.</p>;
  }

  const selectedNames = roles
    .filter((role) => checkedIds.includes(role.id))
    .map((role) => role.name);
  const summaryLabel =
    selectedNames.length === 0
      ? "Velg roller"
      : selectedNames.length <= 2
        ? selectedNames.join(", ")
        : `${selectedNames.length} roller valgt`;

  return (
    <details className={`assignee-dropdown ${disabled ? "is-disabled" : ""}`}>
      <summary className="assignee-dropdown-summary">
        <span className="assignee-dropdown-label">{summaryLabel}</span>
        <span className="assignee-dropdown-meta">
          {selectedNames.length ? `${selectedNames.length} valgt` : "Ingen valgt"}
        </span>
      </summary>
      <div className="assignee-dropdown-panel">
        {roles.map((role) => (
          <label className="assignee-dropdown-option" key={role.id}>
            <input
              checked={checkedIds.includes(role.id)}
              disabled={disabled}
              name={inputName}
              onChange={(eventObject) => {
                const nextChecked = eventObject.currentTarget.checked;
                setCheckedIds((currentValue) =>
                  nextChecked
                    ? [...currentValue, role.id]
                    : currentValue.filter((candidateId) => candidateId !== role.id)
                );
              }}
              type="checkbox"
              value={role.id}
            />
            <span>{role.name}</span>
          </label>
        ))}
      </div>
    </details>
  );
}

function AssigneeChecklist({ people, selectedIds, disabled, inputName = "assigneeIds" }) {
  const [checkedIds, setCheckedIds] = useState(selectedIds);

  useEffect(() => {
    setCheckedIds(selectedIds);
  }, [selectedIds]);

  if (people.length === 0) {
    return <p className="muted">Ingen personer er lagt til arrangementet enda.</p>;
  }

  const selectedNames = people
    .filter((person) => checkedIds.includes(person.id))
    .map((person) => person.name);
  const summaryLabel =
    selectedNames.length === 0
      ? "Velg ansvarlige"
      : selectedNames.length <= 2
        ? selectedNames.join(", ")
        : `${selectedNames.length} ansvarlige valgt`;

  return (
    <details className={`assignee-dropdown ${disabled ? "is-disabled" : ""}`}>
      <summary className="assignee-dropdown-summary">
        <span className="assignee-dropdown-label">{summaryLabel}</span>
        <span className="assignee-dropdown-meta">
          {selectedNames.length ? `${selectedNames.length} valgt` : "Ingen valgt"}
        </span>
      </summary>
      <div className="assignee-dropdown-panel">
        {people.map((person) => (
          <label className="assignee-dropdown-option" key={person.id}>
            <input
              checked={checkedIds.includes(person.id)}
              disabled={disabled}
              name={inputName}
              onChange={(eventObject) => {
                const nextChecked = eventObject.currentTarget.checked;

                setCheckedIds((currentIds) =>
                  nextChecked
                    ? [...currentIds, person.id]
                    : currentIds.filter((currentId) => currentId !== person.id)
                );
              }}
              type="checkbox"
              value={person.id}
            />
            <span>{person.name}</span>
          </label>
        ))}
      </div>
    </details>
  );
}

function buildSwimlaneConnectorPath(fromPosition, toPosition) {
  const startX = fromPosition.left + fromPosition.width;
  const startY = fromPosition.centerY;
  const endX = toPosition.left;
  const endY = toPosition.centerY;
  const horizontalBend = endX >= startX ? Math.max(28, (endX - startX) / 2) : 28;

  return [
    `M ${startX} ${startY}`,
    `C ${startX + horizontalBend} ${startY}, ${endX - horizontalBend} ${endY}, ${endX} ${endY}`
  ].join(" ");
}

function formatTimelineTick(value) {
  if (!value) {
    return "--:--";
  }

  return formatClockTime(value);
}

function taskMatchesAssigneeFilter(task, filterValue, viewerPersonId) {
  if (!filterValue || filterValue === "all") {
    return true;
  }

  if (filterValue === "mine") {
    return Boolean(viewerPersonId) && task.assigneeIds.includes(viewerPersonId);
  }

  if (filterValue === "unassigned") {
    return task.assigneeIds.length === 0;
  }

  return task.assigneeIds.includes(filterValue);
}

function formatTaskOptionLabel(task) {
  if (!task) {
    return "Ukjent aktivitet";
  }

  const hierarchyLabel =
    Array.isArray(task.hierarchyPathTitles) && task.hierarchyPathTitles.length
      ? task.hierarchyPathTitles.join(" / ")
      : task.title || "Uten tittel";

  return hierarchyLabel;
}

const PROJECT_VIEW_OPTIONS = [
  {
    id: "overview",
    label: "Oversikt",
    description:
      "Start her for aa se hva som haster, hva som mangler ansvarlig, og hvilke oppgaver som kan true arrangementet."
  },
  {
    id: "structure",
    label: "Struktur",
    description:
      "Gir deg hele prosjektet som en profesjonell outline med hovedoppgaver, underoppgaver og samlet fremdrift."
  },
  {
    id: "list",
    label: "Liste",
    description:
      "Best for detaljredigering av rekkefolge, frister, varighet, avhengigheter og ansvarlige."
  },
  {
    id: "board",
    label: "Board",
    description:
      "Gir deg et flytbilde per status, sa du raskt ser hva som star, hva som er i gang og hva som sitter fast."
  },
  {
    id: "timeline",
    label: "Tidslinje",
    description:
      "Viser oppgavene som en tidslinje med koblinger, sa du ser varighet, avhengigheter og faste klokkeslett."
  },
  {
    id: "assignment",
    label: "Ansvar",
    description:
      "Viser alle oppgavene per person, sa du enkelt kan dra dem til den som skal eie dem."
  },
  {
    id: "workload",
    label: "Belastning",
    description:
      "Samler arbeidet per person, sa du ser hvem som har mest, hvem som er blokkert og hvor det mangler eier."
  }
];

const TASK_LIST_DRAG_OPTIONS = [
  {
    id: "reorder",
    label: "Flytt og bygg hierarki",
    description:
      "Dra til toppen eller bunnen for aa legge oppgaven paa samme niva. Dra i midten mot hoyre for aa legge den under som suboppgave."
  },
  {
    id: "dependency",
    label: "Lag avhengighet",
    description:
      "Dra til toppen for aa si at den dratte aktiviteten skjer for denne, eller til bunnen for aa si at den skjer etter denne."
  }
];

const TASK_LIST_PRESENTATION_OPTIONS = [
  {
    id: "cards",
    label: "Kortvisning"
  },
  {
    id: "simple",
    label: "Enkel liste"
  }
];

function sortProjectTasksByAttention(tasks) {
  return [...tasks].sort((left, right) => {
    const leftPriority = left.isOverdue ? 0 : left.hasWarnings ? 1 : left.isDueSoon ? 2 : 3;
    const rightPriority = right.isOverdue ? 0 : right.hasWarnings ? 1 : right.isDueSoon ? 2 : 3;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    const leftTime = left.dueDateMs ?? left.scheduledStartMs ?? Number.MAX_SAFE_INTEGER;
    const rightTime = right.dueDateMs ?? right.scheduledStartMs ?? Number.MAX_SAFE_INTEGER;

    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    return (left.agendaPosition || 0) - (right.agendaPosition || 0);
  });
}

function summarizeProjectTasks(tasks) {
  return tasks.reduce(
    (summary, task) => {
      summary.total += 1;
      summary.totalDurationMinutes += Number.isFinite(task.durationMinutes) ? task.durationMinutes : 0;

      if (task.status === "done") {
        summary.done += 1;
      } else if (task.status === "in_progress") {
        summary.inProgress += 1;
      } else if (task.status === "blocked") {
        summary.blocked += 1;
      } else if (task.status === "todo") {
        summary.todo += 1;
      } else if (task.status === "canceled") {
        summary.canceled += 1;
      }

      if (task.status !== "done" && task.status !== "canceled") {
        summary.open += 1;
      }

      if (task.assigneeIds.length === 0) {
        summary.unassigned += 1;
      } else {
        summary.assigned += 1;
      }

      if (task.isFixedTime) {
        summary.fixedTime += 1;
      }

      if (task.isOverdue) {
        summary.overdue += 1;
      }

      if (task.isDueSoon) {
        summary.dueSoon += 1;
      }

      if (task.hasWarnings) {
        summary.warningTasks += 1;
        summary.agendaWarnings += task.warnings.length;
      }

      if (!task.isScheduled) {
        summary.unscheduled += 1;
      }

      return summary;
    },
    {
      total: 0,
      todo: 0,
      inProgress: 0,
      blocked: 0,
      done: 0,
      canceled: 0,
      open: 0,
      assigned: 0,
      unassigned: 0,
      fixedTime: 0,
      overdue: 0,
      dueSoon: 0,
      unscheduled: 0,
      warningTasks: 0,
      agendaWarnings: 0,
      totalDurationMinutes: 0
    }
  );
}

function filterWorkloadRows(rows, filterValue, viewerPersonId) {
  if (!filterValue || filterValue === "all") {
    return rows;
  }

  if (filterValue === "mine") {
    return viewerPersonId ? rows.filter((row) => row.id === viewerPersonId) : [];
  }

  if (filterValue === "unassigned") {
    return rows.filter((row) => row.id === "__unassigned");
  }

  return rows.filter((row) => row.id === filterValue);
}

function getProjectRoleDescription(kind, role) {
  if (kind === "unassigned") {
    return "Oppgaver som ikke er eid av noen enda.";
  }

  if (kind === "shared") {
    return "Oppgaver med flere ansvarlige. Dra dem til en person hvis du vil gi tydelig eier.";
  }

  if (role === "owner") {
    return "Har full prosjektkontroll";
  }

  if (role === "manager") {
    return "Styrer oppgaver i prosjektrommet";
  }

  if (role === "helper") {
    return "Bidrar med gjennomforing";
  }

  return "Ingen aktiv prosjektrolle";
}

function haveSameIds(leftIds, rightIds) {
  const left = [...new Set((Array.isArray(leftIds) ? leftIds : []).filter(Boolean))].sort();
  const right = [...new Set((Array.isArray(rightIds) ? rightIds : []).filter(Boolean))].sort();

  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

function summarizeAssignmentRow(row, tasks) {
  const sortedTasks = sortProjectTasksByAttention(tasks);

  return {
    ...row,
    tasks: sortedTasks,
    taskCount: sortedTasks.length,
    openTaskCount: sortedTasks.filter(
      (task) => task.status !== "done" && task.status !== "canceled"
    ).length,
    warningCount: sortedTasks.filter((task) => task.hasWarnings).length,
    fixedTimeCount: sortedTasks.filter((task) => task.isFixedTime).length,
    totalDurationMinutes: sortedTasks.reduce(
      (sum, task) => sum + (Number.isFinite(task.durationMinutes) ? task.durationMinutes : 0),
      0
    )
  };
}

function buildTaskAssignmentRows(tasks, people) {
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const safePeople = Array.isArray(people) ? people : [];
  const peopleMap = new Map(safePeople.map((person) => [person.id, person]));
  const unassignedTasks = [];
  const sharedTasks = [];
  const personRows = safePeople
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name, "nb"))
    .map((person) => ({
      id: person.id,
      label: person.name,
      kind: "person",
      role: person.effectiveProjectRole || person.projectRole || "none",
      tasks: []
    }));
  const personRowMap = new Map(personRows.map((row) => [row.id, row]));

  safeTasks.forEach((task) => {
    if (!Array.isArray(task.assigneeIds) || task.assigneeIds.length === 0) {
      unassignedTasks.push(task);
      return;
    }

    if (task.assigneeIds.length === 1 && peopleMap.has(task.assigneeIds[0])) {
      personRowMap.get(task.assigneeIds[0])?.tasks.push(task);
      return;
    }

    sharedTasks.push(task);
  });

  const rows = [
    summarizeAssignmentRow(
      {
        id: "__unassigned",
        label: "Uten ansvarlig",
        kind: "unassigned",
        role: "none"
      },
      unassignedTasks
    )
  ];

  if (sharedTasks.length > 0) {
    rows.push(
      summarizeAssignmentRow(
        {
          id: "__shared",
          label: "Delt ansvar",
          kind: "shared",
          role: "none"
        },
        sharedTasks
      )
    );
  }

  return [
    ...rows,
    ...personRows.map((row) =>
      summarizeAssignmentRow(
        {
          id: row.id,
          label: row.label,
          kind: row.kind,
          role: row.role
        },
        row.tasks
      )
    )
  ];
}

function buildHierarchyContextTaskIds(tasks) {
  const taskIds = new Set();

  (Array.isArray(tasks) ? tasks : []).forEach((task) => {
    if (!task || typeof task !== "object" || typeof task.id !== "string") {
      return;
    }

    taskIds.add(task.id);

    if (Array.isArray(task.hierarchyPathIds)) {
      task.hierarchyPathIds.forEach((taskId) => {
        if (typeof taskId === "string" && taskId) {
          taskIds.add(taskId);
        }
      });
    }
  });

  return [...taskIds];
}

function ProjectTab({
  composerVersion,
  event,
  viewerAccess,
  viewerPerson,
  onAddTask,
  onLinkTasksInList,
  onScaleTasksFromAgenda,
  onAssignTaskAssignees,
  onSetTaskParent,
  onUpdateTask,
  onReorderTasks
}) {
  const projectDashboard = useMemo(() => buildProjectDashboard(event), [event]);
  const agenda = projectDashboard.agenda;
  const swimlanes = useMemo(() => buildTaskSwimlanes(event), [event]);
  const [dragTaskId, setDragTaskId] = useState("");
  const [dropTaskId, setDropTaskId] = useState("");
  const dragTaskIdRef = useRef("");
  const [collapsedHierarchyIds, setCollapsedHierarchyIds] = useState([]);
  const [expandedTaskIds, setExpandedTaskIds] = useState([]);
  const [subtaskComposerParentId, setSubtaskComposerParentId] = useState("");
  const [projectView, setProjectView] = useState("structure");
  const [taskListPresentation, setTaskListPresentation] = useState(
    TASK_LIST_PRESENTATION_OPTIONS[0].id
  );
  const [selectedTaskFilter, setSelectedTaskFilter] = useState("all");
  const [taskListDragMode, setTaskListDragMode] = useState(TASK_LIST_DRAG_OPTIONS[0].id);
  const taskFilterOptions = useMemo(() => {
    const options = [{ value: "all", label: "Alle oppgaver" }];

    if (viewerPerson?.id) {
      options.push({ value: "mine", label: "Mine oppgaver" });
    }

    options.push({ value: "unassigned", label: "Uten ansvarlig" });

    event.people.forEach((person) => {
      options.push({
        value: person.id,
        label: person.name
      });
    });

    return options;
  }, [event.people, viewerPerson?.id]);
  const taskParentOptions = useMemo(
    () =>
      projectDashboard.tasks.map((task) => ({
        id: task.id,
        label: formatTaskOptionLabel(task)
      })),
    [projectDashboard.tasks]
  );
  const filteredAgendaTasks = useMemo(
    () =>
      projectDashboard.tasks.filter((task) =>
        taskMatchesAssigneeFilter(task, selectedTaskFilter, viewerPerson?.id || "")
      ),
    [projectDashboard.tasks, selectedTaskFilter, viewerPerson?.id]
  );
  const filteredTaskSummary = useMemo(
    () => summarizeProjectTasks(filteredAgendaTasks),
    [filteredAgendaTasks]
  );
  const filteredTaskIds = useMemo(
    () => filteredAgendaTasks.map((task) => task.id),
    [filteredAgendaTasks]
  );
  const filteredParentTaskIds = useMemo(
    () =>
      filteredAgendaTasks
        .filter((task) => task.hasChildren)
        .map((task) => task.id),
    [filteredAgendaTasks]
  );
  const hierarchyContextTaskIds = useMemo(
    () => buildHierarchyContextTaskIds(filteredAgendaTasks),
    [filteredAgendaTasks]
  );
  const visibleAgendaTasks = useMemo(
    () =>
      filteredAgendaTasks.filter(
        (task) =>
          !task.hierarchyPathIds
            .slice(0, -1)
            .some((ancestorTaskId) => collapsedHierarchyIds.includes(ancestorTaskId))
      ),
    [collapsedHierarchyIds, filteredAgendaTasks]
  );
  const displayTaskSummary =
    selectedTaskFilter === "all" ? projectDashboard.summary : filteredTaskSummary;
  const visibleTaskIds = useMemo(
    () => new Set(filteredAgendaTasks.map((task) => task.id)),
    [filteredAgendaTasks]
  );
  const filteredBoardColumns = useMemo(
    () =>
      projectDashboard.board.map((column) => ({
        ...column,
        tasks: column.tasks.filter((task) => visibleTaskIds.has(task.id))
      })),
    [projectDashboard.board, visibleTaskIds]
  );
  const filteredFocus = useMemo(
    () => ({
      blocked: sortProjectTasksByAttention(
        projectDashboard.focus.blocked.filter((task) => visibleTaskIds.has(task.id))
      ),
      overdue: sortProjectTasksByAttention(
        projectDashboard.focus.overdue.filter((task) => visibleTaskIds.has(task.id))
      ),
      dueSoon: sortProjectTasksByAttention(
        projectDashboard.focus.dueSoon.filter((task) => visibleTaskIds.has(task.id))
      ),
      unassigned: sortProjectTasksByAttention(
        projectDashboard.focus.unassigned.filter((task) => visibleTaskIds.has(task.id))
      ),
      fixedTime: sortProjectTasksByAttention(
        projectDashboard.focus.fixedTime.filter((task) => visibleTaskIds.has(task.id))
      ),
      unscheduled: sortProjectTasksByAttention(
        projectDashboard.focus.unscheduled.filter((task) => visibleTaskIds.has(task.id))
      )
    }),
    [projectDashboard.focus, visibleTaskIds]
  );
  const attentionTasks = useMemo(() => {
    const taskMap = new Map();

    [...filteredFocus.overdue, ...filteredFocus.blocked].forEach((task) => {
      taskMap.set(task.id, task);
    });

    return sortProjectTasksByAttention([...taskMap.values()]);
  }, [filteredFocus.overdue, filteredFocus.blocked]);
  const filteredWorkloadRows = useMemo(
    () => filterWorkloadRows(projectDashboard.workload, selectedTaskFilter, viewerPerson?.id || ""),
    [projectDashboard.workload, selectedTaskFilter, viewerPerson?.id]
  );
  const assignmentRows = useMemo(
    () => buildTaskAssignmentRows(filteredAgendaTasks, event.people),
    [event.people, filteredAgendaTasks]
  );
  const sharedAssignmentCount = useMemo(
    () => assignmentRows.find((row) => row.kind === "shared")?.taskCount || 0,
    [assignmentRows]
  );
  const projectHierarchy = useMemo(
    () => buildProjectHierarchy(event, { taskIds: hierarchyContextTaskIds }),
    [event, hierarchyContextTaskIds]
  );
  const draggedTask = useMemo(
    () => projectDashboard.tasks.find((task) => task.id === dragTaskId) || null,
    [projectDashboard.tasks, dragTaskId]
  );
  const allFilteredParentsCollapsed =
    filteredParentTaskIds.length > 0 &&
    filteredParentTaskIds.every((taskId) => collapsedHierarchyIds.includes(taskId));
  const activeTaskListDragMode =
    TASK_LIST_DRAG_OPTIONS.find((option) => option.id === taskListDragMode) || TASK_LIST_DRAG_OPTIONS[0];
  const filteredSwimlanes = useMemo(() => {
    const visibleTaskIds = new Set(filteredAgendaTasks.map((task) => task.id));

    return {
      ...swimlanes,
      lanes: swimlanes.lanes
        .map((lane) => ({
          ...lane,
          tasks: lane.tasks.filter((task) => visibleTaskIds.has(task.id))
        }))
        .filter((lane) => lane.tasks.length > 0),
      dependencyLinks: swimlanes.dependencyLinks.filter(
        (link) => visibleTaskIds.has(link.fromTaskId) && visibleTaskIds.has(link.toTaskId)
      ),
      tasks: swimlanes.tasks.filter((task) => visibleTaskIds.has(task.id))
    };
  }, [filteredAgendaTasks, swimlanes]);

  useEffect(() => {
    if (!taskFilterOptions.some((option) => option.value === selectedTaskFilter)) {
      setSelectedTaskFilter("all");
    }
  }, [selectedTaskFilter, taskFilterOptions]);

  useEffect(() => {
    if (
      subtaskComposerParentId &&
      !projectDashboard.tasks.some((task) => task.id === subtaskComposerParentId)
    ) {
      setSubtaskComposerParentId("");
    }
  }, [projectDashboard.tasks, subtaskComposerParentId]);

  const swimlaneLayout = useMemo(() => {
    const labelWidth = 180;
    const slotWidth =
      filteredSwimlanes.slotMinutes <= 15 ? 86 : filteredSwimlanes.slotMinutes <= 30 ? 94 : 108;
    const laneHeight = 110;
    const laneGap = 18;
    const cardHeight = 76;
    const trackInset = 10;
    const trackWidth = Math.max(slotWidth * filteredSwimlanes.totalColumns, slotWidth * 3);
    const lanePositions = new Map();

    filteredSwimlanes.lanes.forEach((lane, laneIndex) => {
      const top = laneIndex * (laneHeight + laneGap);
      lane.tasks.forEach((task) => {
        const left = labelWidth + task.columnStart * slotWidth + trackInset;
        const width = Math.max(slotWidth * task.columnSpan - trackInset * 2, 74);
        const topOffset = top + (laneHeight - cardHeight) / 2;

        lanePositions.set(task.id, {
          left,
          top: topOffset,
          width,
          centerY: topOffset + cardHeight / 2
        });
      });
    });

    return {
      labelWidth,
      slotWidth,
      laneHeight,
      laneGap,
      cardHeight,
      trackWidth,
      boardWidth: labelWidth + trackWidth,
      boardHeight:
        filteredSwimlanes.lanes.length * laneHeight +
        Math.max(0, filteredSwimlanes.lanes.length - 1) * laneGap,
      connectors: filteredSwimlanes.dependencyLinks
        .map((link) => {
          const fromPosition = lanePositions.get(link.fromTaskId);
          const toPosition = lanePositions.get(link.toTaskId);

          if (!fromPosition || !toPosition) {
            return null;
          }

          return {
            ...link,
            path: buildSwimlaneConnectorPath(fromPosition, toPosition)
          };
        })
        .filter(Boolean),
      lanePositions
    };
  }, [filteredSwimlanes]);

  function toggleTaskExpansion(taskId) {
    setExpandedTaskIds((currentIds) =>
      currentIds.includes(taskId)
        ? currentIds.filter((currentTaskId) => currentTaskId !== taskId)
        : [...currentIds, taskId]
    );
  }

  function toggleHierarchyCollapse(taskId) {
    setCollapsedHierarchyIds((currentIds) =>
      currentIds.includes(taskId)
        ? currentIds.filter((currentTaskId) => currentTaskId !== taskId)
        : [...currentIds, taskId]
    );
  }

  function collapseVisibleHierarchy() {
    if (filteredParentTaskIds.length === 0) {
      return;
    }

    setCollapsedHierarchyIds((currentIds) => [
      ...new Set([...currentIds, ...filteredParentTaskIds])
    ]);
  }

  function expandVisibleHierarchy() {
    if (filteredParentTaskIds.length === 0) {
      return;
    }

    const parentIdSet = new Set(filteredParentTaskIds);
    setCollapsedHierarchyIds((currentIds) =>
      currentIds.filter((taskId) => !parentIdSet.has(taskId))
    );
  }

  function openTaskInList(taskId) {
    setProjectView("list");
    setExpandedTaskIds((currentIds) =>
      currentIds.includes(taskId) ? currentIds : [...currentIds, taskId]
    );
  }

  function toggleSubtaskComposer(taskId) {
    if (!viewerAccess.canManageProject) {
      return;
    }

    setProjectView("list");
    setCollapsedHierarchyIds((currentIds) => currentIds.filter((currentTaskId) => currentTaskId !== taskId));
    setExpandedTaskIds((currentIds) =>
      currentIds.includes(taskId) ? currentIds : [...currentIds, taskId]
    );
    setSubtaskComposerParentId((currentTaskId) => (currentTaskId === taskId ? "" : taskId));
  }

  function canDropTaskIntoParent(targetTask) {
    const sourceTaskId = String(dragTaskIdRef.current || dragTaskId || "").trim();

    if (!viewerAccess.canManageProject || !sourceTaskId || !targetTask) {
      return false;
    }

    if (sourceTaskId === targetTask.id) {
      return false;
    }

    return !(
      Array.isArray(targetTask.hierarchyPathIds) &&
      targetTask.hierarchyPathIds.includes(sourceTaskId)
    );
  }

  function getTaskDropLabel(task, placement) {
    if (placement === "under") {
      return `Slipp for aa legge "${draggedTask?.title || "aktiviteten"}" under ${task.title}`;
    }

    if (activeTaskListDragMode.id === "dependency") {
      return placement === "before"
        ? `Slipp for aa si at "${draggedTask?.title || "aktiviteten"}" skjer for ${task.title}`
        : `Slipp for aa si at "${draggedTask?.title || "aktiviteten"}" skjer etter ${task.title}`;
    }

    return placement === "before"
      ? `Slipp for aa flytte foran ${task.title}`
      : `Slipp for aa flytte bak ${task.title}`;
  }

  function handleTaskCardDrop(eventObject, task, placement) {
    eventObject.preventDefault();
    eventObject.stopPropagation();
    const sourceTaskId = resolveDraggedTaskId(eventObject);

    if (!viewerAccess.canManageProject || !sourceTaskId || sourceTaskId === task.id) {
      return;
    }

    if (activeTaskListDragMode.id === "dependency") {
      onLinkTasksInList(sourceTaskId, task.id, placement);
    } else {
      onReorderTasks(sourceTaskId, task.id, placement);
    }

    dragTaskIdRef.current = "";
    setDragTaskId("");
    setDropTaskId("");
  }

  function getDropPlacement(eventObject, task) {
    const currentTarget = eventObject.currentTarget;

    if (!currentTarget || typeof currentTarget.getBoundingClientRect !== "function") {
      return "after";
    }

    const bounds = currentTarget.getBoundingClientRect();
    const height = Math.max(bounds.height, 1);
    const verticalRatio = (eventObject.clientY - bounds.top) / height;

    if (
      activeTaskListDragMode.id !== "dependency" &&
      canDropTaskIntoParent(task) &&
      eventObject.clientX > bounds.left + Math.min(120, bounds.width * 0.32) &&
      verticalRatio >= 0.24 &&
      verticalRatio <= 0.76
    ) {
      return "under";
    }

    return verticalRatio < 0.5 ? "before" : "after";
  }

  function handleTaskRowDragOver(eventObject, task) {
    const sourceTaskId = resolveDraggedTaskId(eventObject);

    if (!viewerAccess.canManageProject || !sourceTaskId || sourceTaskId === task.id) {
      return;
    }

    eventObject.preventDefault();

    if (eventObject.dataTransfer) {
      eventObject.dataTransfer.dropEffect = "move";
    }

    const placement = getDropPlacement(eventObject, task);
    setDropTaskId(`${task.id}:${placement}`);
  }

  function handleTaskRowDrop(eventObject, task) {
    const placement = getDropPlacement(eventObject, task);
    handleTaskCardDrop(eventObject, task, placement);
  }

  function canDropTaskIntoAssignmentRow(row, sourceTaskId) {
    if (!viewerAccess.canManageProject || !row || row.kind === "shared" || !sourceTaskId) {
      return false;
    }

    const sourceTask = projectDashboard.tasks.find((task) => task.id === sourceTaskId);

    if (!sourceTask) {
      return false;
    }

    const nextAssigneeIds = row.kind === "unassigned" ? [] : [row.id];
    return !haveSameIds(sourceTask.assigneeIds, nextAssigneeIds);
  }

  function handleAssignmentLaneDragOver(eventObject, row) {
    const sourceTaskId = resolveDraggedTaskId(eventObject);

    if (!canDropTaskIntoAssignmentRow(row, sourceTaskId)) {
      return;
    }

    eventObject.preventDefault();

    if (eventObject.dataTransfer) {
      eventObject.dataTransfer.dropEffect = "move";
    }

    setDropTaskId(`assignment:${row.id}`);
  }

  function handleAssignmentLaneDrop(eventObject, row) {
    eventObject.preventDefault();
    const sourceTaskId = resolveDraggedTaskId(eventObject);

    if (!canDropTaskIntoAssignmentRow(row, sourceTaskId)) {
      return;
    }

    onAssignTaskAssignees(sourceTaskId, row.kind === "unassigned" ? [] : [row.id]);
    dragTaskIdRef.current = "";
    setDragTaskId("");
    setDropTaskId("");
  }

  function resolveDraggedTaskId(eventObject) {
    const transferredTaskId = String(eventObject?.dataTransfer?.getData("text/plain") || "").trim();
    return transferredTaskId || dragTaskIdRef.current || dragTaskId;
  }

  function startTaskDrag(taskId, eventObject) {
    if (!viewerAccess.canManageProject) {
      return;
    }

    eventObject.stopPropagation();
    dragTaskIdRef.current = taskId;

    if (eventObject.dataTransfer) {
      eventObject.dataTransfer.effectAllowed = "move";
      eventObject.dataTransfer.setData("text/plain", taskId);
    }

    window.setTimeout(() => {
      setDragTaskId(taskId);
      setDropTaskId("");
    }, 0);
  }

  function finishTaskDrag() {
    dragTaskIdRef.current = "";
    setDragTaskId("");
    setDropTaskId("");
  }

  async function handleInlineSubtaskSubmit(formEvent, task) {
    const createdTask = await onAddTask(formEvent);

    if (createdTask) {
      setSubtaskComposerParentId("");
      setCollapsedHierarchyIds((currentIds) =>
        currentIds.filter((currentTaskId) => currentTaskId !== task.id)
      );
      setExpandedTaskIds((currentIds) =>
        currentIds.includes(task.id) ? currentIds : [...currentIds, task.id]
      );
    }
  }

  function renderInlineSubtaskComposer(task) {
    if (!viewerAccess.canManageProject || subtaskComposerParentId !== task.id) {
      return null;
    }

    return (
      <form
        className="inline-subtask-composer stack"
        key={`subtask-composer-${task.id}-${composerVersion}`}
        onSubmit={(eventObject) => handleInlineSubtaskSubmit(eventObject, task)}
      >
        <input name="parentTaskId" type="hidden" value={task.id} />
        <input name="status" type="hidden" value="todo" />
        <div className="inline-subtask-composer-head">
          <strong>Ny underoppgave under {task.title}</strong>
          <button
            className="secondary-button task-inline-button"
            type="button"
            onClick={() => setSubtaskComposerParentId("")}
          >
            Avbryt
          </button>
        </div>
        <div className="agenda-field-grid field-span-full">
          <label className="field agenda-inline-field">
            <span>Tittel</span>
            <input
              name="title"
              placeholder="F.eks. Tale fra mor eller klargjor projektor"
              required
            />
          </label>
          <label className="field agenda-inline-field">
            <span>Varighet (min)</span>
            <input defaultValue="30" min="5" name="durationMinutes" step="5" type="number" />
          </label>
          <label className="field agenda-inline-field">
            <span>Ansvarlig (valgfritt)</span>
            <select defaultValue="" name="assigneeIds">
              <option value="">Ingen ansvarlig</option>
              {event.people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field agenda-inline-field checkbox-field">
            <span>Agenda</span>
            <span className="checkbox-inline">
              <input name="showOnAgenda" type="checkbox" />
              <span>Vises pa agenda</span>
            </span>
          </label>
        </div>
        <label className="field field-span-full">
          <span>Synlig kommentar i agenda</span>
          <input
            name="agendaComment"
            placeholder="F.eks. Velkomst og mingling i hagen"
          />
        </label>
        <button className="primary-button" type="submit">
          Opprett underoppgave
        </button>
      </form>
    );
  }

  const activeView =
    PROJECT_VIEW_OPTIONS.find((option) => option.id === projectView) || PROJECT_VIEW_OPTIONS[0];

  function renderProjectStructureRows(nodes, depth = 0) {
    return (Array.isArray(nodes) ? nodes : []).map((task) => {
      const hasChildren = Array.isArray(task.children) && task.children.length > 0;
      const isCollapsed = collapsedHierarchyIds.includes(task.id);
      const statusLabel =
        hasChildren && task.subtreeTaskCount > 1 ? task.progressLabel : task.statusLabel;
      const assigneeLabel =
        hasChildren && task.subtreeAssigneeIds.length ? task.subtreeAssigneeLabel : task.assigneeLabel;
      const timeLabel =
        task.subtreeStartAt && task.subtreeEndAt
          ? `${formatClockTime(task.subtreeStartAt)} - ${formatClockTime(task.subtreeEndAt)}`
          : task.displayStartAt && task.displayEndAt
            ? `${formatClockTime(task.displayStartAt)} - ${formatClockTime(task.displayEndAt)}`
            : "Ikke planlagt";
      const dateLabel =
        task.subtreeStartAt && task.subtreeEndAt
          ? `${formatDateBadge(task.subtreeStartAt)} - ${formatDateBadge(task.subtreeEndAt)}`
          : task.displayStartAt
            ? formatDateBadge(task.displayStartAt)
            : "Mangler dato";

      return (
        <Fragment key={`structure-${task.id}`}>
          <div
            className={`project-structure-row ${depth > 0 ? "is-nested" : ""} ${
              hasChildren ? "is-parent" : ""
            }`}
            style={{
              "--task-depth": String(Math.min(depth, 5))
            }}
          >
            <div className="project-structure-cell project-structure-title-cell">
              {hasChildren ? (
                <button
                  className="project-structure-toggle"
                  type="button"
                  onClick={() => toggleHierarchyCollapse(task.id)}
                >
                  {isCollapsed ? ">" : "v"}
                </button>
              ) : (
                <span className="project-structure-toggle project-structure-toggle-placeholder">·</span>
              )}
              <div className="project-structure-title-stack">
                <div className="project-structure-title-line">
                  <strong>{task.title}</strong>
                  <span className="role-pill">#{task.agendaPosition}</span>
                  {task.isFixedTime ? <span className="data-tag">Fast tidspunkt</span> : null}
                  {task.showOnAgenda ? <span className="data-tag">Agenda</span> : null}
                </div>
                <div className="project-structure-meta">
                  <span>{task.parentTaskTitle ? `Under ${task.parentTaskTitle}` : "Hovedoppgave"}</span>
                  {hasChildren ? (
                    <span>
                      {task.children.length} direkte / {task.descendantCount} underoppgaver
                    </span>
                  ) : null}
                  {task.subtreeBlockedCount ? <span>{task.subtreeBlockedCount} blokkerte i sporet</span> : null}
                </div>
              </div>
            </div>
            <div className="project-structure-cell">
              <span className="project-structure-label">Ansvarlige</span>
              <strong>{assigneeLabel || "Ingen ansvarlig"}</strong>
            </div>
            <div className="project-structure-cell">
              <span className="project-structure-label">Tidsrom</span>
              <strong>{timeLabel}</strong>
              <span className="muted">{dateLabel}</span>
            </div>
            <div className="project-structure-cell">
              <span className="project-structure-label">Fremdrift</span>
              <div className="project-chip-row">
                <span className="data-tag">{statusLabel}</span>
                <span className="data-tag">{formatDurationMinutes(task.subtreeDurationMinutes)}</span>
                {task.subtreeWarningTaskCount ? (
                  <span className="data-tag warning-tag">
                    Varsler {task.subtreeWarningTaskCount}
                  </span>
                ) : null}
                {task.subtreeOverdueCount ? (
                  <span className="data-tag danger-tag">
                    For sent {task.subtreeOverdueCount}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="project-structure-cell project-structure-action-cell">
              <button
                className="secondary-button task-inline-button"
                type="button"
                onClick={() => openTaskInList(task.id)}
              >
                Aapne
              </button>
            </div>
          </div>
          {hasChildren && !isCollapsed ? renderProjectStructureRows(task.children, depth + 1) : null}
        </Fragment>
      );
    });
  }

  return (
    <div className="stack">
      <section className="panel stack">
        <div className="panel-header-inline">
          <div>
            <h3>Prosjektrom</h3>
            <p className="muted">
              Samme oppgavedata presenteres som flere prosjektledervisninger, slik at arrangoren kan
              bytte mellom styring, flyt, tidslinje og belastning uten aa miste kontrollen.
            </p>
          </div>
          <div className="project-filter-row">
            <label className="field inline-field">
              <span>Filtrer ansvarlig</span>
              <select
                value={selectedTaskFilter}
                onChange={(eventObject) => setSelectedTaskFilter(eventObject.currentTarget.value)}
              >
                {taskFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <span className="role-pill">
              Viser {filteredAgendaTasks.length} av {agenda.tasks.length}
            </span>
          </div>
        </div>
        <div className="stack compact-stack">
          <div className="tab-row">
            {PROJECT_VIEW_OPTIONS.map((option) => (
              <button
                className={`tab-chip ${projectView === option.id ? "active" : ""}`}
                key={option.id}
                type="button"
                onClick={() => setProjectView(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="muted project-view-note">{activeView.description}</p>
        </div>
      </section>

      {projectView === "overview" ? (
        <section className="panel stack">
          <div className="panel-header-inline">
            <div>
              <h3>Prosjektoversikt</h3>
              <p className="muted">
                Start her for aa se fremdrift, eierskap, varsler og hvilke aktiviteter som kan vippe arrangementet ut av kurs.
              </p>
            </div>
          </div>
          <div className="overview-grid">
            <InfoCard label="Oppgaver" value={displayTaskSummary.total} />
            <InfoCard label="Hovedspor" value={projectHierarchy.totalRootNodes} />
            <InfoCard label="Pa agenda" value={displayTaskSummary.agendaVisible || 0} />
            <InfoCard label="Aapne" value={displayTaskSummary.open} />
            <InfoCard label="Ferdige" tone="success" value={displayTaskSummary.done} />
            <InfoCard
              label="Blokkerte"
              tone={displayTaskSummary.blocked ? "warning" : "success"}
              value={displayTaskSummary.blocked}
            />
            <InfoCard
              label="Varsler"
              tone={displayTaskSummary.warningTasks ? "warning" : "success"}
              value={displayTaskSummary.warningTasks}
            />
            <InfoCard label="Fast tid" value={displayTaskSummary.fixedTime} />
            <InfoCard
              label="Uten ansvarlig"
              tone={displayTaskSummary.unassigned ? "warning" : "success"}
              value={displayTaskSummary.unassigned}
            />
            <InfoCard
              label="Neste 48 t"
              tone={displayTaskSummary.dueSoon || displayTaskSummary.overdue ? "warning" : "success"}
              value={displayTaskSummary.dueSoon + displayTaskSummary.overdue}
            />
          </div>
          {!agenda.hasEventStart ? (
            <p className="notice warning">
              Sett `Starter` under planlegging, eller legg inn onsket starttid pa forste aktivitet, for
              aa fa en mer presis agenda.
            </p>
          ) : null}
          {agenda.tasks.length === 0 ? (
            <EmptyState
              title="Ingen aktiviteter enda"
              body="Legg inn aktiviteter her for aa bygge prosjektrommet for arrangementet."
            />
          ) : filteredAgendaTasks.length === 0 ? (
            <EmptyState
              title="Ingen oppgaver matcher filteret"
              body="Bytt ansvarligfilteret for aa se andre oppgaver."
            />
          ) : (
            <div className="project-focus-grid">
              <article className="project-focus-panel stack">
                <div className="panel-header-inline">
                  <div>
                    <h4>Ma tas tak i</h4>
                    <p className="muted">Blokkerte oppgaver, kollisjoner og varsler som krever grep.</p>
                  </div>
                  <span className="role-pill">{attentionTasks.length}</span>
                </div>
                {attentionTasks.length ? (
                  <ul className="compact-list">
                    {attentionTasks.slice(0, 4).map((task) => (
                      <li key={`attention-${task.id}`}>
                        <div className="compact-list-main">
                          <strong>{task.title}</strong>
                          <span>{task.warnings[0] || task.assigneeLabel}</span>
                        </div>
                        <div className="compact-list-actions">
                          <span className="data-tag">{task.statusLabel}</span>
                          <button
                            className="compact-action-button"
                            type="button"
                            onClick={() => openTaskInList(task.id)}
                          >
                            Aapne
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">Ingen akutte prosjektflaskehalser akkurat naa.</p>
                )}
              </article>
              <article className="project-focus-panel stack">
                <div className="panel-header-inline">
                  <div>
                    <h4>Neste frister</h4>
                    <p className="muted">Oppgaver som haster eller allerede er for sent ute.</p>
                  </div>
                  <span className="role-pill">
                    {filteredFocus.overdue.length + filteredFocus.dueSoon.length}
                  </span>
                </div>
                {filteredFocus.overdue.length || filteredFocus.dueSoon.length ? (
                  <ul className="compact-list">
                    {[...filteredFocus.overdue, ...filteredFocus.dueSoon].slice(0, 4).map((task) => (
                      <li key={`deadline-${task.id}`}>
                        <div className="compact-list-main">
                          <strong>{task.title}</strong>
                          <span>
                            {task.dueDate ? `Frist ${formatDateTime(task.dueDate)}` : "Ingen frist"}
                          </span>
                        </div>
                        <div className="compact-list-actions">
                          <span className={`data-tag ${task.isOverdue ? "danger-tag" : "warning-tag"}`}>
                            {task.isOverdue ? "For sent" : "Kommer snart"}
                          </span>
                          <button
                            className="compact-action-button"
                            type="button"
                            onClick={() => openTaskInList(task.id)}
                          >
                            Aapne
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">Ingen frister som krever ekstra oppmerksomhet naa.</p>
                )}
              </article>
              <article className="project-focus-panel stack">
                <div className="panel-header-inline">
                  <div>
                    <h4>Mangler ansvarlig</h4>
                    <p className="muted">Oppgaver som bor faa eier foer resten av planen kan stole pa dem.</p>
                  </div>
                  <span className="role-pill">{filteredFocus.unassigned.length}</span>
                </div>
                {filteredFocus.unassigned.length ? (
                  <ul className="compact-list">
                    {filteredFocus.unassigned.slice(0, 4).map((task) => (
                      <li key={`unassigned-${task.id}`}>
                        <div className="compact-list-main">
                          <strong>{task.title}</strong>
                          <span>
                            {task.scheduledStartAt
                              ? `Planlagt ${formatDateTime(task.scheduledStartAt)}`
                              : "Ikke planlagt enda"}
                          </span>
                        </div>
                        <div className="compact-list-actions">
                          <span className="data-tag">Ingen ansvarlig</span>
                          <button
                            className="compact-action-button"
                            type="button"
                            onClick={() => openTaskInList(task.id)}
                          >
                            Aapne
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">Alle oppgaver har en eier i dette utsnittet.</p>
                )}
              </article>
              <article className="project-focus-panel stack">
                <div className="panel-header-inline">
                  <div>
                    <h4>Fast tid og agenda</h4>
                    <p className="muted">Aktiviteter som ikke kan flyttes, eller som fortsatt mangler plass.</p>
                  </div>
                  <span className="role-pill">
                    {filteredFocus.fixedTime.length + filteredFocus.unscheduled.length}
                  </span>
                </div>
                {filteredFocus.fixedTime.length || filteredFocus.unscheduled.length ? (
                  <ul className="compact-list">
                    {[...filteredFocus.fixedTime, ...filteredFocus.unscheduled].slice(0, 4).map((task) => (
                      <li key={`schedule-${task.id}`}>
                        <div className="compact-list-main">
                          <strong>{task.title}</strong>
                          <span>
                            {task.scheduledStartAt
                              ? `${formatClockTime(task.scheduledStartAt)} - ${formatClockTime(task.scheduledEndAt)}`
                              : "Mangler start/slutt"}
                          </span>
                        </div>
                        <div className="compact-list-actions">
                          {task.isFixedTime ? <span className="data-tag">Kan ikke forskyves</span> : null}
                          {!task.isScheduled ? <span className="data-tag warning-tag">Mangler plass</span> : null}
                          <button
                            className="compact-action-button"
                            type="button"
                            onClick={() => openTaskInList(task.id)}
                          >
                            Aapne
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">Ingen faste eller uplanlagte aktiviteter aa folge opp akkurat naa.</p>
                )}
              </article>
            </div>
          )}
        </section>
      ) : null}

      {projectView === "structure" ? (
        <section className="panel stack">
          <div className="panel-header-inline">
            <div>
              <h3>Prosjektstruktur</h3>
              <p className="muted">
                Hele arrangementet vises som ett samlet oppgavehierarki, slik at du kan lese ansvar,
                tid, fremdrift og varsler i ett profesjonelt tre.
              </p>
            </div>
            <div className="project-chip-row">
              <span className="data-tag">{projectHierarchy.totalRootNodes} hovedoppgaver</span>
              <span className="data-tag">{projectHierarchy.totalVisibleTasks} synlige aktiviteter</span>
              <span className="data-tag">{displayTaskSummary.nestedTasks} underoppgaver</span>
            </div>
          </div>
          {projectHierarchy.totalVisibleTasks === 0 ? (
            <EmptyState
              title="Ingen oppgaver i dette utsnittet"
              body="Bytt ansvarligfilteret eller legg til flere aktiviteter for aa se prosjektstrukturen."
            />
          ) : (
            <div className="project-structure-stack">
              <article className="project-structure-group stack">
                <div className="project-structure-group-head">
                  <div className="stack compact-stack">
                    <h4>Alle oppgaver</h4>
                    <p className="muted">
                      Hovedoppgaver og underoppgaver vises i samme struktur, uten ekstra prosjektspor.
                    </p>
                  </div>
                  <div className="project-chip-row">
                    <span className="role-pill">{projectHierarchy.totalVisibleTasks} aktiviteter</span>
                    <span className="data-tag">{projectHierarchy.totalRootNodes} hovedoppgaver</span>
                    <span className="data-tag">{displayTaskSummary.open} aapne</span>
                    {displayTaskSummary.warningTasks ? (
                      <span className="data-tag warning-tag">{displayTaskSummary.warningTasks} varsler</span>
                    ) : null}
                  </div>
                </div>
                <div className="project-structure-table">
                  <div className="project-structure-header">
                    <span>Aktivitet</span>
                    <span>Ansvarlige</span>
                    <span>Tidsrom</span>
                    <span>Fremdrift</span>
                    <span>Handling</span>
                  </div>
                  <div className="project-structure-body">
                    {renderProjectStructureRows(projectHierarchy.rootNodes)}
                  </div>
                </div>
              </article>
            </div>
          )}
        </section>
      ) : null}

      {projectView === "board" ? (
        <section className="panel stack">
          <div className="panel-header-inline">
            <div>
              <h3>Board</h3>
              <p className="muted">
                Som i board-baserte prosjektverktøy ser du her oppgavene per status, sa flyten blir enklere aa lese.
              </p>
            </div>
          </div>
          {agenda.tasks.length === 0 ? (
            <EmptyState
              title="Ingen aktiviteter enda"
              body="Legg inn aktiviteter for aa faa et board over hele arrangementet."
            />
          ) : filteredAgendaTasks.length === 0 ? (
            <EmptyState
              title="Ingen oppgaver matcher filteret"
              body="Bytt ansvarligfilteret for aa se andre oppgaver i boardet."
            />
          ) : (
            <div className="project-board-wrap">
              <div className="project-board-grid">
                {filteredBoardColumns.map((column) => (
                  <section className="project-board-column" data-status={column.id} key={column.id}>
                    <div className="project-board-column-header">
                      <div>
                        <h4>{column.label}</h4>
                        <p className="muted">#{column.tasks.length} i denne kolonnen</p>
                      </div>
                      <span className="role-pill">{column.tasks.length}</span>
                    </div>
                    {column.tasks.length ? (
                      <div className="stack compact-stack">
                        {column.tasks.map((task) => (
                          <article className="project-board-card stack" key={task.id}>
                            <div className="swimlane-task-title-row">
                              <strong>{task.title}</strong>
                              <span className="role-pill">#{task.agendaPosition}</span>
                            </div>
                            <span className="muted">{task.assigneeLabel}</span>
                            <div className="project-chip-row">
                              <span className="data-tag">
                                {task.parentTaskTitle ? `Under ${task.parentTaskTitle}` : "Hovedoppgave"}
                              </span>
                              <span className="data-tag">{formatDurationMinutes(task.durationMinutes)}</span>
                              {task.scheduledStartAt ? (
                                <span className="data-tag">{formatClockTime(task.scheduledStartAt)}</span>
                              ) : null}
                              {task.isFixedTime ? <span className="data-tag">Fast tid</span> : null}
                              {task.hasWarnings ? (
                                <span className="data-tag warning-tag">Varsel {task.warnings.length}</span>
                              ) : null}
                              {task.isOverdue ? (
                                <span className="data-tag danger-tag">Frist passert</span>
                              ) : task.isDueSoon ? (
                                <span className="data-tag warning-tag">Frist snart</span>
                              ) : null}
                            </div>
                            <p className="muted">
                              {task.hierarchyShortLabel ||
                                (task.dueDate
                                  ? `Frist ${formatDateTime(task.dueDate)}`
                                  : task.dependencyNames.join(", ") || "Ingen koblinger enda")}
                            </p>
                            <button
                              className="secondary-button"
                              type="button"
                              onClick={() => openTaskInList(task.id)}
                            >
                              Aapne i liste
                            </button>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="muted">Ingen oppgaver i denne statusen.</p>
                    )}
                  </section>
                ))}
              </div>
            </div>
          )}
        </section>
      ) : null}

      {projectView === "timeline" ? (
        <>
          <section className="panel stack">
            <div className="overview-grid">
              <InfoCard
                label="Planlagt start"
                value={agenda.startsAt ? formatDateTime(agenda.startsAt) : "Ikke satt"}
              />
              <InfoCard
                label="Planlagt slutt"
                value={agenda.endsAt ? formatDateTime(agenda.endsAt) : "Ikke satt"}
              />
              <InfoCard
                label="Total varighet"
                value={formatDurationMinutes(displayTaskSummary.totalDurationMinutes)}
              />
              <InfoCard label="Koblinger" value={filteredSwimlanes.dependencyLinks.length} />
              <InfoCard label="Spor" value={filteredSwimlanes.lanes.length} />
              <InfoCard
                label="Varsler"
                tone={displayTaskSummary.warningTasks ? "warning" : "success"}
                value={displayTaskSummary.warningTasks}
              />
            </div>
          </section>
          <section className="panel stack">
            <div className="panel-header-inline">
              <div>
                <h3>Tidslinje og svommebaner</h3>
                <p className="muted">
                  Aktivitetene er gruppert per ansvarlig, og koblingene viser hvilke oppgaver som maa vaere ferdige foer neste kan starte.
                </p>
              </div>
              <span className="role-pill">Per {filteredSwimlanes.slotMinutes} min</span>
            </div>
            {filteredSwimlanes.lanes.length === 0 ? (
              <EmptyState
                title="Ingen aktiviteter aa vise"
                body="Legg inn oppgaver for aa fa en svommebanevisning av agendaen."
              />
            ) : (
              <div className="swimlane-board-wrap">
                <div className="swimlane-board" style={{ width: `${swimlaneLayout.boardWidth}px` }}>
                  <div
                    className="swimlane-header-row"
                    style={{ gridTemplateColumns: `${swimlaneLayout.labelWidth}px minmax(0, 1fr)` }}
                  >
                    <div className="swimlane-lane-header">Ansvarlig</div>
                    <div
                      className="swimlane-time-scale"
                      style={{
                        gridTemplateColumns: `repeat(${filteredSwimlanes.totalColumns}, ${swimlaneLayout.slotWidth}px)`
                      }}
                    >
                      {filteredSwimlanes.timeMarkers.map((marker) => (
                        <div className="swimlane-time-tick" key={`marker-${marker.columnIndex}`}>
                          <strong>{formatTimelineTick(marker.dateTime)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="swimlane-body" style={{ height: `${swimlaneLayout.boardHeight}px` }}>
                    <svg
                      aria-hidden="true"
                      className="swimlane-connector-layer"
                      height={swimlaneLayout.boardHeight}
                      viewBox={`0 0 ${swimlaneLayout.boardWidth} ${swimlaneLayout.boardHeight}`}
                      width={swimlaneLayout.boardWidth}
                    >
                      <defs>
                        <marker
                          id="swimlane-arrow"
                          markerHeight="8"
                          markerWidth="8"
                          orient="auto-start-reverse"
                          refX="7"
                          refY="4"
                        >
                          <path d="M0,0 L8,4 L0,8 Z" fill="rgba(36, 95, 82, 0.75)" />
                        </marker>
                      </defs>
                      {swimlaneLayout.connectors.map((connector) => (
                        <path
                          className="swimlane-connector-path"
                          d={connector.path}
                          key={connector.id}
                          markerEnd="url(#swimlane-arrow)"
                        />
                      ))}
                    </svg>
                    {filteredSwimlanes.lanes.map((lane, laneIndex) => {
                      const rowTop = laneIndex * (swimlaneLayout.laneHeight + swimlaneLayout.laneGap);

                      return (
                        <div
                          className="swimlane-row"
                          key={lane.id}
                          style={{ top: `${rowTop}px`, height: `${swimlaneLayout.laneHeight}px` }}
                        >
                          <div className="swimlane-row-label" style={{ width: `${swimlaneLayout.labelWidth}px` }}>
                            <strong>{lane.label}</strong>
                            <span>{lane.tasks.length} aktiviteter</span>
                          </div>
                          <div
                            className="swimlane-row-track"
                            style={{
                              left: `${swimlaneLayout.labelWidth}px`,
                              width: `${swimlaneLayout.trackWidth}px`,
                              "--swimlane-slot-width": `${swimlaneLayout.slotWidth}px`
                            }}
                          >
                            {lane.tasks.map((task) => {
                              const position = swimlaneLayout.lanePositions.get(task.id);

                              if (!position) {
                                return null;
                              }

                              return (
                                <article
                                  className={`swimlane-task-card ${task.warnings.length ? "has-warning" : ""} ${
                                    task.isUnscheduled ? "is-unscheduled" : ""
                                  }`}
                                  key={task.id}
                                  style={{
                                    left: `${position.left - swimlaneLayout.labelWidth}px`,
                                    top: `${position.top - rowTop}px`,
                                    width: `${position.width}px`,
                                    minHeight: `${swimlaneLayout.cardHeight}px`
                                  }}
                                >
                                  <div className="swimlane-task-title-row">
                                    <strong>{task.title}</strong>
                                    <span className="role-pill">#{task.agendaPosition}</span>
                                  </div>
                                  <span className="swimlane-task-time">
                                    {task.scheduledStartAt && task.scheduledEndAt
                                      ? `${formatClockTime(task.scheduledStartAt)} - ${formatClockTime(task.scheduledEndAt)}`
                                      : "Mangler start/slutt"}
                                  </span>
                                  <span className="swimlane-task-breadcrumb">
                                    {task.parentTaskTitle ? `Under ${task.parentTaskTitle}` : "Hovedoppgave"}
                                  </span>
                                  <div className="swimlane-task-meta">
                                    <span>{formatDurationMinutes(task.durationMinutes)}</span>
                                    {task.isFixedTime ? <span>Fast tidspunkt</span> : null}
                                    <span>
                                      {task.dependencyNames.length
                                        ? `${task.dependencyNames.length} koblinger`
                                        : "Ingen koblinger"}
                                    </span>
                                  </div>
                                </article>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </section>
        </>
      ) : null}

      {viewerAccess.canManageProject ? (
        <section className="panel stack">
          <h3>Ny aktivitet</h3>
          <form className="grid-form compact-grid" key={composerVersion} onSubmit={onAddTask}>
            <label className="field field-span-full">
              <span>Tittel</span>
              <input name="title" placeholder="F.eks. Velkomst, middag eller transport" required />
            </label>
            <div className="agenda-field-grid field-span-full">
              <label className="field agenda-inline-field">
                <span>Legg under aktivitet</span>
                <select defaultValue="" name="parentTaskId">
                  <option value="">Ingen overaktivitet</option>
                  {taskParentOptions.map((taskOption) => (
                    <option key={taskOption.id} value={taskOption.id}>
                      {taskOption.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="agenda-field-grid field-span-full">
              <label className="field agenda-inline-field">
                <span>Status</span>
                <select defaultValue="todo" name="status">
                  {TASK_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field agenda-inline-field">
                <span>Varighet (min)</span>
                <input defaultValue="60" min="5" name="durationMinutes" step="5" type="number" />
              </label>
              <label className="field agenda-inline-field">
                <span>Onsket start</span>
                <input name="desiredStartAt" type="datetime-local" />
              </label>
              <label className="field agenda-inline-field checkbox-field">
                <span>Fast tidspunkt</span>
                <span className="checkbox-inline">
                  <input name="isFixedTime" type="checkbox" />
                  <span>Kan ikke forskyves</span>
                </span>
              </label>
              <label className="field agenda-inline-field checkbox-field">
                <span>Agenda</span>
                <span className="checkbox-inline">
                  <input name="showOnAgenda" type="checkbox" />
                  <span>Vises pa agenda</span>
                </span>
              </label>
              <label className="field agenda-inline-field">
                <span>Frist</span>
                <input name="dueDate" type="datetime-local" />
              </label>
            </div>
            <label className="field field-span-full">
              <span>Synlig kommentar i agenda</span>
              <input
                name="agendaComment"
                placeholder="F.eks. Gjestene samles ved inngangen"
              />
            </label>
            <label className="field field-span-full">
              <span>Beskrivelse</span>
              <textarea name="description" placeholder="Hva skal gjores, og hva er viktig?" rows={3} />
            </label>
            <div className="field field-span-full">
              <span>Ansvarlige</span>
              <AssigneeChecklist disabled={false} people={event.people} selectedIds={[]} />
            </div>
            <div className="field field-span-full">
              <span>Koble etter andre aktiviteter</span>
              <DependencyChecklist
                disabled={false}
                inputName="dependencyIds"
                options={agenda.tasks.map((task) => ({
                  id: task.id,
                  title: task.title
                }))}
                selectedIds={[]}
              />
            </div>
            <div className="field field-span-full">
              <span>Aktiviteter som skal komme etter denne</span>
              <DependencyChecklist
                disabled={false}
                inputName="followingTaskIds"
                options={agenda.tasks.map((task) => ({
                  id: task.id,
                  title: task.title
                }))}
                selectedIds={[]}
              />
            </div>
            <button className="primary-button" type="submit">
              Legg til aktivitet
            </button>
          </form>
        </section>
      ) : null}

      {projectView === "assignment" ? (
        <section className="panel stack">
          <div className="panel-header-inline">
            <div>
              <h3>Ansvarstavle</h3>
              <p className="muted">
                Her ser du alle oppgavene fordelt per person. Dra en oppgave til personen som skal eie den, eller slipp den i `Uten ansvarlig` hvis du vil nullstille ansvar.
              </p>
            </div>
            {!viewerAccess.canManageProject ? <span className="role-pill">Lesetilgang</span> : null}
          </div>
          <div className="overview-grid">
            <InfoCard
              label="Personkolonner"
              value={assignmentRows.filter((row) => row.kind === "person").length}
            />
            <InfoCard
              label="Uten ansvarlig"
              tone={displayTaskSummary.unassigned ? "warning" : "success"}
              value={displayTaskSummary.unassigned}
            />
            <InfoCard
              label="Delt ansvar"
              tone={sharedAssignmentCount ? "warning" : "success"}
              value={sharedAssignmentCount}
            />
            <InfoCard label="Aapne oppgaver" value={displayTaskSummary.open} />
          </div>
          {filteredAgendaTasks.length === 0 ? (
            <EmptyState
              title="Ingen oppgaver matcher filteret"
              body="Bytt ansvarligfilteret for aa se andre oppgaver i ansvarstavlen."
            />
          ) : (
            <div className="project-assignment-wrap">
              <div
                className="project-assignment-grid"
                style={{
                  gridTemplateColumns: `repeat(${Math.max(assignmentRows.length, 1)}, minmax(280px, 1fr))`
                }}
              >
                {assignmentRows.map((row) => (
                  <section
                    className={`project-assignment-column ${dropTaskId === `assignment:${row.id}` ? "is-drop-target" : ""} ${
                      row.kind !== "person" ? `is-${row.kind}` : ""
                    }`}
                    key={row.id}
                    onDragLeave={() => {
                      if (dropTaskId === `assignment:${row.id}`) {
                        setDropTaskId("");
                      }
                    }}
                    onDragOver={(eventObject) => handleAssignmentLaneDragOver(eventObject, row)}
                    onDrop={(eventObject) => handleAssignmentLaneDrop(eventObject, row)}
                  >
                    <div className="project-assignment-column-header">
                      <div className="stack compact-stack">
                        <h4>{row.label}</h4>
                        <p className="muted">{getProjectRoleDescription(row.kind, row.role)}</p>
                      </div>
                      <span className="role-pill">{row.taskCount}</span>
                    </div>
                    <div className="project-chip-row">
                      <span className="data-tag">{row.openTaskCount} aapne</span>
                      <span className="data-tag">{formatDurationMinutes(row.totalDurationMinutes)}</span>
                      {row.fixedTimeCount ? (
                        <span className="data-tag">{row.fixedTimeCount} faste</span>
                      ) : null}
                      {row.warningCount ? (
                        <span className="data-tag warning-tag">{row.warningCount} varsler</span>
                      ) : null}
                    </div>
                    {row.tasks.length ? (
                      <div className="stack compact-stack">
                        {row.tasks.map((task) => (
                          <article
                            className={`project-assignment-card stack ${dragTaskId === task.id ? "is-dragging" : ""}`}
                            draggable={viewerAccess.canManageProject}
                            key={`assignment-${row.id}-${task.id}`}
                            onDragEnd={finishTaskDrag}
                            onDragStart={(eventObject) => startTaskDrag(task.id, eventObject)}
                          >
                            <div className="project-assignment-card-head">
                              <div className="stack compact-stack">
                                <strong>{task.title}</strong>
                                <span>
                                  {task.parentTaskTitle
                                    ? `Under ${task.parentTaskTitle}`
                                    : task.hasChildren
                                      ? "Overoppgave"
                                      : "Hovedoppgave"}
                                </span>
                              </div>
                              <span className="role-pill">#{task.agendaPosition}</span>
                            </div>
                            <div className="project-chip-row">
                              <span className="data-tag">{task.statusLabel}</span>
                              <span className="data-tag">{formatDurationMinutes(task.durationMinutes)}</span>
                              {task.scheduledStartAt ? (
                                <span className="data-tag">{formatClockTime(task.scheduledStartAt)}</span>
                              ) : null}
                              {task.hasChildren ? (
                                <span className="data-tag">{task.childTaskIds.length} under</span>
                              ) : null}
                              {task.isFixedTime ? <span className="data-tag">Fast tid</span> : null}
                              {task.assigneeIds.length > 1 ? (
                                <span className="data-tag warning-tag">Delt ansvar</span>
                              ) : null}
                            </div>
                            <p className="muted">
                              {task.assigneeIds.length > 1
                                ? task.assigneeLabel
                                : task.scheduledStartAt
                                  ? `${formatDateTime(task.scheduledStartAt)}${
                                      task.scheduledEndAt
                                        ? ` - ${formatClockTime(task.scheduledEndAt)}`
                                        : ""
                                    }`
                                  : task.hierarchyShortLabel || "Ingen tid satt enda"}
                            </p>
                            <div className="compact-list-actions">
                              <button
                                className="compact-action-button"
                                type="button"
                                onClick={() => openTaskInList(task.id)}
                              >
                                Aapne
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="muted project-assignment-empty">
                        {row.kind === "shared"
                          ? "Ingen oppgaver med delt ansvar akkurat naa."
                          : row.kind === "unassigned"
                            ? "Slipp en oppgave hit for aa fjerne ansvarlig."
                            : viewerAccess.canManageProject
                              ? "Slipp en oppgave hit for aa gi personen ansvar."
                              : "Ingen oppgaver i denne kolonnen."}
                      </p>
                    )}
                  </section>
                ))}
              </div>
            </div>
          )}
        </section>
      ) : null}

      {projectView === "workload" ? (
        <section className="panel stack">
          <div className="panel-header-inline">
            <div>
              <h3>Belastning per person</h3>
              <p className="muted">
                Se hvem som har mest paa seg, hvem som er blokkert, og hvilke oppgaver som fortsatt mangler eier.
              </p>
            </div>
          </div>
          <div className="overview-grid">
            <InfoCard
              label="Ressurser i spill"
              value={projectDashboard.workload.filter((row) => row.kind === "person").length}
            />
            <InfoCard label="Aapne oppgaver" value={displayTaskSummary.open} />
            <InfoCard
              label="Uten ansvarlig"
              tone={displayTaskSummary.unassigned ? "warning" : "success"}
              value={displayTaskSummary.unassigned}
            />
            <InfoCard
              label="Blokkerte"
              tone={displayTaskSummary.blocked ? "warning" : "success"}
              value={displayTaskSummary.blocked}
            />
          </div>
          {filteredWorkloadRows.length === 0 ? (
            <EmptyState
              title="Ingen arbeidsbelastning for dette filteret"
              body="Velg en annen ansvarlig for aa se ressursbildet."
            />
          ) : (
            <div className="project-workload-grid">
              {filteredWorkloadRows.map((row) => (
                <article
                  className={`project-workload-card stack ${row.kind === "unassigned" ? "is-unassigned" : ""}`}
                  key={row.id}
                >
                  <div className="task-headline">
                    <div className="stack compact-stack">
                      <h4>{row.label}</h4>
                      <span>{getProjectRoleDescription(row.kind, row.role)}</span>
                    </div>
                    <span className="role-pill">{row.taskCount} oppgaver</span>
                  </div>
                  <div className="project-workload-metrics">
                    <span>
                      <strong>{row.openTaskCount}</strong> aapne
                    </span>
                    <span>
                      <strong>{formatDurationMinutes(row.totalDurationMinutes)}</strong> planlagt tid
                    </span>
                    <span>
                      <strong>{row.blockedCount}</strong> blokkerte
                    </span>
                    <span>
                      <strong>{row.fixedTimeCount}</strong> faste tidspunkt
                    </span>
                    <span>
                      <strong>{row.warningCount}</strong> med varsel
                    </span>
                    <span>
                      <strong>{row.nextPlannedTaskAt ? formatDateTime(row.nextPlannedTaskAt) : "Ikke satt"}</strong>{" "}
                      neste start
                    </span>
                  </div>
                  {row.tasks.length ? (
                    <ul className="compact-list project-workload-task-list">
                      {row.tasks.slice(0, 4).map((task) => (
                        <li key={`${row.id}-${task.id}`}>
                          <div className="compact-list-main">
                            <strong>{task.title}</strong>
                            <span>
                              {task.scheduledStartAt
                                ? `${formatDateTime(task.scheduledStartAt)} • ${task.statusLabel}`
                                : task.statusLabel}
                            </span>
                          </div>
                          <div className="compact-list-actions">
                            {task.hasWarnings ? <span className="data-tag warning-tag">Varsel</span> : null}
                            <button
                              className="compact-action-button"
                              type="button"
                              onClick={() => openTaskInList(task.id)}
                            >
                              Aapne
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">Ingen oppgaver i dette utsnittet.</p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {projectView === "list" ? (
        <>
          <section className="panel stack">
            <div className="panel-header-inline">
              <div>
                <h3>Liste og agenda</h3>
                <p className="muted">
                  Dette er arbeidsvisningen for rekkefolge, frister, detaljer og oppgavevedlikehold.
                </p>
              </div>
            </div>
            <div className="overview-grid">
              <InfoCard
                label="Planlagt start"
                value={agenda.startsAt ? formatDateTime(agenda.startsAt) : "Ikke satt"}
              />
              <InfoCard
                label="Planlagt slutt"
                value={agenda.endsAt ? formatDateTime(agenda.endsAt) : "Ikke satt"}
              />
              <InfoCard
                label="Total varighet"
                value={formatDurationMinutes(displayTaskSummary.totalDurationMinutes)}
              />
              <InfoCard
                label="Varsler"
                tone={displayTaskSummary.warningTasks ? "warning" : "success"}
                value={displayTaskSummary.warningTasks}
              />
            </div>
            {!agenda.hasEventStart ? (
              <p className="notice warning">
                Sett `Starter` under planlegging, eller legg inn onsket starttid pa forste aktivitet, for
                aa fa en mer presis agenda.
              </p>
            ) : null}
            {agenda.tasks.length === 0 ? (
              <EmptyState
                title="Ingen aktiviteter enda"
                body="Legg inn aktiviteter her for aa bygge en tidslinje for arrangementet."
              />
            ) : filteredAgendaTasks.length === 0 ? (
              <EmptyState
                title="Ingen oppgaver matcher filteret"
                body="Bytt ansvarligfilteret for aa se andre oppgaver."
              />
            ) : (
              <div className="agenda-table-wrap">
                <table className="mini-table agenda-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Aktivitet</th>
                      <th>Start</th>
                      <th>Slutt</th>
                      <th>Varighet</th>
                      <th>Onsket</th>
                      <th>Koblet etter</th>
                      <th>Varsel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleAgendaTasks.map((task) => (
                      <tr className={task.warnings.length ? "agenda-row-warning" : ""} key={task.id}>
                        <td>{task.agendaPosition}</td>
                        <td>
                          <div className="stack compact-stack">
                            <strong>{task.title}</strong>
                            <div className="task-structure-row">
                              {task.parentTaskTitle ? (
                                <span className="data-tag">Under: {task.parentTaskTitle}</span>
                              ) : null}
                              {task.hasChildren ? (
                                <span className="data-tag">
                                  {task.childTaskIds.length} underaktiviteter
                                </span>
                              ) : null}
                            </div>
                            {task.isFixedTime ? <span className="data-tag">Kan ikke forskyves</span> : null}
                            {task.showOnAgenda ? <span className="data-tag">Vises pa agenda</span> : null}
                          </div>
                        </td>
                        <td>{task.displayStartAt ? formatDateTime(task.displayStartAt) : "Ikke satt"}</td>
                        <td>{task.displayEndAt ? formatDateTime(task.displayEndAt) : "Ikke satt"}</td>
                        <td>{formatDurationMinutes(task.displayDurationMinutes)}</td>
                        <td>{task.desiredStartAt ? formatDateTime(task.desiredStartAt) : "Ingen preferanse"}</td>
                        <td>{task.dependencyNames.join(", ") || "Ingen"}</td>
                        <td>{task.warnings[0] || "OK"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <section className="panel stack">
            <div className="panel-header-inline">
              <div>
                <h3>Aktiviteter og oppgaver</h3>
                <p className="muted">
                  Dra kortene for aa endre agendaen. Velg om du vil flytte rekkefolgen eller lage avhengigheter direkte i listen.
                </p>
              </div>
              <div className="project-list-toolbar">
                <label className="field inline-field">
                  <span>Listevisning</span>
                  <select
                    value={taskListPresentation}
                    onChange={(eventObject) => setTaskListPresentation(eventObject.currentTarget.value)}
                  >
                    {TASK_LIST_PRESENTATION_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field inline-field">
                  <span>Draggmodus</span>
                  <select
                    value={taskListDragMode}
                    onChange={(eventObject) => setTaskListDragMode(eventObject.currentTarget.value)}
                  >
                    {TASK_LIST_DRAG_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="secondary-button"
                  type="button"
                  disabled={!viewerAccess.canManageProject || visibleAgendaTasks.length === 0}
                  onClick={() => onScaleTasksFromAgenda(visibleAgendaTasks.map((task) => task.id))}
                >
                  Skaler synlige tider
                </button>
              </div>
            </div>
            <p className="muted task-drag-note">{activeTaskListDragMode.description}</p>
            {filteredParentTaskIds.length > 0 ? (
              <div className="project-hierarchy-toolbar">
                <span className="data-tag">
                  {filteredParentTaskIds.length} oppgaver har underoppgaver i dette utsnittet
                </span>
                <button
                  className="secondary-button task-inline-button"
                  type="button"
                  onClick={() =>
                    allFilteredParentsCollapsed ? expandVisibleHierarchy() : collapseVisibleHierarchy()
                  }
                >
                  {allFilteredParentsCollapsed ? "Vis alle underoppgaver" : "Skjul alle underoppgaver"}
                </button>
              </div>
            ) : null}
            {agenda.tasks.length === 0 ? (
              <EmptyState
                title="Ingen aktiviteter enda"
                body="Her kan du fordele arbeid, sette frister, varighet og bygge agendaen for arrangementet."
              />
            ) : filteredAgendaTasks.length === 0 ? (
              <EmptyState
                title="Ingen oppgaver for dette filteret"
                body="Velg en annen ansvarlig for aa se flere aktiviteter."
              />
            ) : (
              <div className="stack">
                {taskListPresentation === "simple" ? (
                  <ul className="project-simple-list">
                    {visibleAgendaTasks.map((task) => {
                      const assignees = event.people
                        .filter((person) => task.assigneeIds.includes(person.id))
                        .map((person) => person.name);
                      const isCollapsed = collapsedHierarchyIds.includes(task.id);

                      return (
                        <Fragment key={task.id}>
                          {activeTaskListDragMode.id === "dependency" &&
                          viewerAccess.canManageProject &&
                          dragTaskId &&
                          dragTaskId !== task.id ? (
                            <li
                              className={`task-drop-zone project-simple-drop-zone ${
                                dropTaskId === `${task.id}:before` ? "is-active" : ""
                              }`}
                              onDragOver={(eventObject) => {
                                eventObject.preventDefault();
                                eventObject.stopPropagation();
                                setDropTaskId(`${task.id}:before`);
                              }}
                              onDrop={(eventObject) => handleTaskCardDrop(eventObject, task, "before")}
                            >
                              {getTaskDropLabel(task, "before")}
                            </li>
                          ) : null}
                          <li
                            className={`project-simple-row ${task.hierarchyDepth > 0 ? "is-nested" : ""} ${
                              dragTaskId === task.id ? "is-dragging" : ""
                            } ${dropTaskId.startsWith(`${task.id}:`) ? "drag-target" : ""} ${
                              dropTaskId === `${task.id}:before` ? "drop-before" : ""
                            } ${dropTaskId === `${task.id}:after` ? "drop-after" : ""} ${
                              dropTaskId === `${task.id}:under` ? "drop-under" : ""
                            }`}
                            style={{
                              "--task-depth": String(Math.min(task.hierarchyDepth || 0, 4))
                            }}
                            onDragOver={(eventObject) => handleTaskRowDragOver(eventObject, task)}
                            onDrop={(eventObject) => handleTaskRowDrop(eventObject, task)}
                          >
                            <div className="project-simple-main">
                              <div className="project-simple-title-row">
                                {viewerAccess.canManageProject ? (
                                  <span
                                    className="drag-handle project-simple-drag-handle"
                                    draggable={viewerAccess.canManageProject}
                                    title="Dra for aa flytte"
                                    onDragEnd={finishTaskDrag}
                                    onDragStart={(eventObject) => startTaskDrag(task.id, eventObject)}
                                  >
                                    ::
                                  </span>
                                ) : null}
                                {task.hasChildren ? (
                                  <button
                                    className="project-simple-toggle"
                                    type="button"
                                    onClick={() => toggleHierarchyCollapse(task.id)}
                                  >
                                    {isCollapsed ? ">" : "v"}
                                  </button>
                                ) : (
                                  <span className="project-simple-toggle project-simple-toggle-placeholder">
                                    ·
                                  </span>
                                )}
                                {viewerAccess.canManageProject ? (
                                  <button
                                    className="project-simple-add-button"
                                    type="button"
                                    onClick={() => toggleSubtaskComposer(task.id)}
                                  >
                                    +
                                  </button>
                                ) : null}
                                <strong>{task.title}</strong>
                                <span className="role-pill">#{task.agendaPosition}</span>
                                {task.isFixedTime ? <span className="data-tag">Fast</span> : null}
                                {task.showOnAgenda ? <span className="data-tag">Agenda</span> : null}
                                {task.hasChildren ? (
                                  <span className="data-tag">
                                    {isCollapsed
                                      ? `Vis ${task.childTaskIds.length} underoppgaver`
                                      : `${task.childTaskIds.length} underoppgaver`}
                                  </span>
                                ) : null}
                                {dropTaskId === `${task.id}:under` ? (
                                  <span className="data-tag warning-tag">Blir underoppgave</span>
                                ) : null}
                              </div>
                              <div className="project-simple-meta">
                                <span>
                                  {task.displayStartAt && task.displayEndAt
                                    ? `${formatClockTime(task.displayStartAt)} - ${formatClockTime(task.displayEndAt)}`
                                    : "Tid ikke satt"}
                                </span>
                                <span>{formatDurationMinutes(task.displayDurationMinutes)}</span>
                                <span>{assignees.join(", ") || "Ingen ansvarlig"}</span>
                                <span>
                                  {TASK_STATUS_OPTIONS.find((option) => option.value === task.status)?.label}
                                </span>
                              </div>
                            </div>
                            <div className="project-simple-actions">
                              {task.hasChildren ? (
                                <button
                                  className="secondary-button task-inline-button"
                                  type="button"
                                  onClick={() => toggleHierarchyCollapse(task.id)}
                                >
                                  {isCollapsed
                                    ? `Vis underoppgaver (${task.childTaskIds.length})`
                                    : `Skjul underoppgaver (${task.childTaskIds.length})`}
                                </button>
                              ) : null}
                              <button
                                className="secondary-button task-inline-button"
                                type="button"
                                onClick={() => {
                                  openTaskInList(task.id);
                                  setTaskListPresentation("cards");
                                }}
                              >
                                Aapne kort
                              </button>
                            </div>
                          </li>
                          {subtaskComposerParentId === task.id ? (
                            <li
                              className="project-simple-subtask-row"
                              style={{
                                "--task-depth": String(Math.min((task.hierarchyDepth || 0) + 1, 5))
                              }}
                            >
                              {renderInlineSubtaskComposer(task)}
                            </li>
                          ) : null}
                          {activeTaskListDragMode.id === "dependency" &&
                          viewerAccess.canManageProject &&
                          dragTaskId &&
                          dragTaskId !== task.id ? (
                            <li
                              className={`task-drop-zone project-simple-drop-zone ${
                                dropTaskId === `${task.id}:after` ? "is-active" : ""
                              }`}
                              onDragOver={(eventObject) => {
                                eventObject.preventDefault();
                                eventObject.stopPropagation();
                                setDropTaskId(`${task.id}:after`);
                              }}
                              onDrop={(eventObject) => handleTaskCardDrop(eventObject, task, "after")}
                            >
                              {getTaskDropLabel(task, "after")}
                            </li>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </ul>
                ) : (
                  visibleAgendaTasks.map((task) => {
                  const assignees = event.people
                    .filter((person) => task.assigneeIds.includes(person.id))
                    .map((person) => person.name);
                  const dependencyOptions = agenda.tasks
                    .filter((candidate) => candidate.id !== task.id)
                    .map((candidate) => ({
                      id: candidate.id,
                      title: candidate.title
                    }));
                  const followingTaskIds = deriveFollowingTaskIds(agenda.tasks, task.id);
                  const followingTaskNames = agenda.tasks
                    .filter((candidate) => followingTaskIds.includes(candidate.id))
                    .map((candidate) => candidate.title);
                  const parentTaskOptions = projectDashboard.tasks
                    .filter(
                      (candidate) =>
                        candidate.id !== task.id &&
                        !(Array.isArray(candidate.hierarchyPathIds) && candidate.hierarchyPathIds.includes(task.id))
                    )
                    .map((candidate) => ({
                      id: candidate.id,
                      label: formatTaskOptionLabel(candidate)
                    }));
                  const canEditTask =
                    viewerAccess.canManageProject ||
                    (viewerAccess.canUpdateAssignedTasks &&
                      viewerPerson &&
                      task.assigneeIds.includes(viewerPerson.id));
                  const isExpanded = expandedTaskIds.includes(task.id);

                  return (
                    <form
                      className={`task-card agenda-task-card ${dragTaskId === task.id ? "is-dragging" : ""} ${
                        dropTaskId.startsWith(`${task.id}:`) ? "drag-target" : ""
                      } ${dropTaskId === `${task.id}:before` ? "drop-before" : ""} ${
                        dropTaskId === `${task.id}:after` ? "drop-after" : ""
                      } ${dropTaskId === `${task.id}:under` ? "drop-under" : ""} ${
                        task.hierarchyDepth > 0 ? "is-nested" : ""
                      }`}
                      key={task.id}
                      onSubmit={(eventObject) => onUpdateTask(eventObject, task)}
                      style={{
                        "--task-depth": String(Math.min(task.hierarchyDepth || 0, 4))
                      }}
                      onDragOver={(eventObject) => handleTaskRowDragOver(eventObject, task)}
                      onDrop={(eventObject) => handleTaskRowDrop(eventObject, task)}
                    >
                      <input name="taskId" type="hidden" value={task.id} />
                      {activeTaskListDragMode.id === "dependency" &&
                      viewerAccess.canManageProject &&
                      dragTaskId &&
                      dragTaskId !== task.id ? (
                        <div
                          className={`task-drop-zone ${
                            dropTaskId === `${task.id}:before` ? "is-active" : ""
                          }`}
                          onDragOver={(eventObject) => {
                            eventObject.preventDefault();
                            eventObject.stopPropagation();
                            setDropTaskId(`${task.id}:before`);
                          }}
                          onDrop={(eventObject) => handleTaskCardDrop(eventObject, task, "before")}
                        >
                          {getTaskDropLabel(task, "before")}
                        </div>
                      ) : null}
                      <div className="agenda-card-layout">
                        <aside className="agenda-time-rail">
                          <div className="agenda-time-block">
                            <span className="agenda-time-label">Start</span>
                            <strong className="agenda-time-value">{formatClockTime(task.displayStartAt)}</strong>
                            <span className="agenda-time-date">{formatDateBadge(task.displayStartAt)}</span>
                          </div>
                          <div className="agenda-time-divider" />
                          <div className="agenda-time-block">
                            <span className="agenda-time-label">Slutt</span>
                            <strong className="agenda-time-value">{formatClockTime(task.displayEndAt)}</strong>
                            <span className="agenda-time-date">{formatDateBadge(task.displayEndAt)}</span>
                          </div>
                          <div className="agenda-duration-pill">
                            {formatDurationMinutes(task.displayDurationMinutes)}
                          </div>
                        </aside>
                        <div className="agenda-card-content stack">
                          <div className="task-headline">
                            <div className="stack">
                              <div className="agenda-card-title">
                                {viewerAccess.canManageProject ? (
                                  <span
                                    className="drag-handle"
                                    draggable={viewerAccess.canManageProject}
                                    title="Dra for aa flytte"
                                    onDragEnd={finishTaskDrag}
                                    onDragStart={(eventObject) => startTaskDrag(task.id, eventObject)}
                                  >
                                    ::
                                  </span>
                                ) : null}
                                <strong>{task.title}</strong>
                                <span className="role-pill">#{task.agendaPosition}</span>
                                {task.isFixedTime ? <span className="data-tag">Fast tidspunkt</span> : null}
                                {task.showOnAgenda ? <span className="data-tag">Agenda</span> : null}
                                {dropTaskId === `${task.id}:under` ? (
                                  <span className="data-tag warning-tag">Blir underoppgave</span>
                                ) : null}
                              </div>
                              <div className="task-structure-row">
                                {task.parentTaskTitle ? (
                                  <span className="data-tag">Under: {task.parentTaskTitle}</span>
                                ) : null}
                                {task.hasChildren ? (
                                  <span className="data-tag">
                                    {task.childTaskIds.length} underaktiviteter
                                  </span>
                                ) : null}
                              </div>
                              {viewerAccess.canManageProject || task.hasChildren ? (
                                <div className="task-hierarchy-controls">
                                  {viewerAccess.canManageProject ? (
                                    <>
                                      <label className="field agenda-inline-field compact-inline-field">
                                        <span>Plassering</span>
                                        <select
                                          value={task.parentTaskId || ""}
                                          onChange={(eventObject) =>
                                            onSetTaskParent(task, eventObject.currentTarget.value)
                                          }
                                        >
                                          <option value="">Egen hovedoppgave</option>
                                          {parentTaskOptions.map((taskOption) => (
                                            <option key={taskOption.id} value={taskOption.id}>
                                              {taskOption.label}
                                            </option>
                                          ))}
                                        </select>
                                      </label>
                                      {task.parentTaskId ? (
                                        <button
                                          className="secondary-button task-inline-button"
                                          type="button"
                                          onClick={() => onSetTaskParent(task, "__promote__")}
                                        >
                                          Loft ett niva
                                        </button>
                                      ) : null}
                                      <button
                                        className="secondary-button task-inline-button"
                                        type="button"
                                        onClick={() => toggleSubtaskComposer(task.id)}
                                      >
                                        + Underoppgave
                                      </button>
                                    </>
                                  ) : null}
                                  {task.hasChildren ? (
                                    <button
                                      className="secondary-button task-inline-button"
                                      type="button"
                                      onClick={() => toggleHierarchyCollapse(task.id)}
                                    >
                                      {collapsedHierarchyIds.includes(task.id)
                                        ? `Vis underoppgaver (${task.childTaskIds.length})`
                                        : `Skjul underoppgaver (${task.childTaskIds.length})`}
                                    </button>
                                  ) : null}
                                </div>
                              ) : null}
                              <span>{assignees.join(", ") || "Ingen ansvarlig"}</span>
                            </div>
                            <div className="task-inline-tools">
                              <span className="role-pill">
                                {TASK_STATUS_OPTIONS.find((option) => option.value === task.status)?.label}
                              </span>
                              <button
                                className="secondary-button task-expand-button"
                                type="button"
                                onClick={() => toggleTaskExpansion(task.id)}
                              >
                                {isExpanded ? "Skjul" : "Vis mer"}
                              </button>
                            </div>
                          </div>
                          <div className="agenda-inline-summary">
                            <span>
                              <strong>Varsler:</strong> {task.warnings.length ? `${task.warnings.length} stk` : "Ingen"}
                            </span>
                            <span>
                              <strong>Onsket:</strong>{" "}
                              {task.desiredStartAt ? formatDateTime(task.desiredStartAt) : "Ingen preferanse"}
                            </span>
                            <span>
                              <strong>Flytting:</strong> {task.isFixedTime ? "Laast" : "Kan forskyves"}
                            </span>
                            <span>
                              <strong>Agenda:</strong> {task.showOnAgenda ? "Vises" : "Skjult"}
                            </span>
                          </div>
                          {task.warnings.length && !isExpanded ? (
                            <p className="notice warning compact-warning">{task.warnings[0]}</p>
                          ) : null}
                          {isExpanded ? (
                            <div className="agenda-expanded-body stack">
                              <div className="agenda-meta">
                                <span>
                                  <strong>Planlagt:</strong>{" "}
                                  {task.displayStartAt && task.displayEndAt
                                    ? `${formatDateTime(task.displayStartAt)} - ${formatDateTime(task.displayEndAt)}`
                                    : "Mangler start/slutt"}
                                </span>
                                <span>
                                  <strong>Varighet:</strong> {formatDurationMinutes(task.displayDurationMinutes)}
                                </span>
                                <span>
                                  <strong>Onsket:</strong>{" "}
                                  {task.desiredStartAt ? formatDateTime(task.desiredStartAt) : "Ingen preferanse"}
                                </span>
                                <span>
                                  <strong>Fast tidspunkt:</strong> {task.isFixedTime ? "Ja" : "Nei"}
                                </span>
                                <span>
                                  <strong>Hierarki:</strong>{" "}
                                  {task.parentTaskTitle
                                    ? `Under ${task.parentTaskTitle}`
                                    : task.hasChildren
                                      ? `Overaktivitet for ${task.childTaskIds.length}`
                                      : "Topplan"}
                                </span>
                              </div>
                              {task.dependencyNames.length ? (
                                <div className="tag-list">
                                  {task.dependencyNames.map((dependencyName) => (
                                    <span className="data-tag" key={`${task.id}-${dependencyName}`}>
                                      Etter {dependencyName}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                              {followingTaskNames.length ? (
                                <div className="tag-list">
                                  {followingTaskNames.map((followingName) => (
                                    <span className="data-tag" key={`${task.id}-following-${followingName}`}>
                                      Folges av {followingName}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                              {task.warnings.length ? (
                                <div className="stack">
                                  {task.warnings.map((warning, index) => (
                                    <p className="notice warning" key={`${task.id}-warning-${index}`}>
                                      {warning}
                                    </p>
                                  ))}
                                </div>
                              ) : null}
                              <p>{task.description || "Ingen beskrivelse enda."}</p>
                                <div className="compact-grid">
                                  <label className="field field-span-full">
                                    <span>Tittel</span>
                                    <input defaultValue={task.title} disabled={!viewerAccess.canManageProject} name="title" />
                                  </label>
                                  <div className="agenda-field-grid field-span-full">
                                    <label className="field agenda-inline-field">
                                      <span>Legg under aktivitet</span>
                                      <select
                                      defaultValue={task.parentTaskId || ""}
                                      disabled={!viewerAccess.canManageProject}
                                      name="parentTaskId"
                                    >
                                      <option value="">Ingen overaktivitet</option>
                                      {parentTaskOptions.map((taskOption) => (
                                        <option key={taskOption.id} value={taskOption.id}>
                                          {taskOption.label}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                </div>
                                <div className="agenda-field-grid field-span-full">
                                  <label className="field agenda-inline-field">
                                    <span>Status</span>
                                    <select defaultValue={task.status} disabled={!canEditTask} name="status">
                                      {TASK_STATUS_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <label className="field agenda-inline-field">
                                    <span>Varighet (min)</span>
                                    <input
                                      defaultValue={task.durationMinutes}
                                      disabled={!viewerAccess.canManageProject}
                                      min="5"
                                      name="durationMinutes"
                                      step="5"
                                      type="number"
                                    />
                                  </label>
                                  <label className="field agenda-inline-field">
                                    <span>Onsket start</span>
                                    <input
                                      defaultValue={task.desiredStartAt}
                                      disabled={!viewerAccess.canManageProject}
                                      name="desiredStartAt"
                                      type="datetime-local"
                                    />
                                  </label>
                                  <label className="field agenda-inline-field checkbox-field">
                                    <span>Fast tidspunkt</span>
                                    <span className="checkbox-inline">
                                      <input
                                        defaultChecked={Boolean(task.isFixedTime)}
                                        disabled={!viewerAccess.canManageProject}
                                        name="isFixedTime"
                                        type="checkbox"
                                      />
                                      <span>Kan ikke forskyves</span>
                                    </span>
                                  </label>
                                  <label className="field agenda-inline-field checkbox-field">
                                    <span>Agenda</span>
                                    <span className="checkbox-inline">
                                      <input
                                        defaultChecked={Boolean(task.showOnAgenda)}
                                        disabled={!viewerAccess.canManageProject}
                                        name="showOnAgenda"
                                        type="checkbox"
                                      />
                                      <span>Vises pa agenda</span>
                                    </span>
                                  </label>
                                  <label className="field agenda-inline-field">
                                    <span>Frist</span>
                                    <input
                                      defaultValue={task.dueDate}
                                      disabled={!viewerAccess.canManageProject}
                                      name="dueDate"
                                      type="datetime-local"
                                    />
                                  </label>
                                </div>
                                <label className="field field-span-full">
                                  <span>Synlig kommentar i agenda</span>
                                  <input
                                    defaultValue={task.agendaComment || ""}
                                    disabled={!viewerAccess.canManageProject}
                                    name="agendaComment"
                                    placeholder="F.eks. Velkomst og mingling i hagen"
                                  />
                                </label>
                              </div>
                              <label className="field">
                                <span>Beskrivelse</span>
                                <textarea
                                  defaultValue={task.description}
                                  disabled={!viewerAccess.canManageProject}
                                  name="description"
                                  rows={3}
                                />
                              </label>
                              <div className="field">
                                <span>Ansvarlige</span>
                                <AssigneeChecklist
                                  disabled={!viewerAccess.canManageProject}
                                  people={event.people}
                                  selectedIds={task.assigneeIds}
                                />
                              </div>
                              <div className="field">
                                <span>Koble etter andre aktiviteter</span>
                                <DependencyChecklist
                                  disabled={!viewerAccess.canManageProject}
                                  inputName="dependencyIds"
                                  options={dependencyOptions}
                                  selectedIds={task.dependencyIds}
                                />
                              </div>
                              <div className="field">
                                <span>Aktiviteter som kommer etter denne</span>
                                <DependencyChecklist
                                  disabled={!viewerAccess.canManageProject}
                                  inputName="followingTaskIds"
                                  options={dependencyOptions}
                                  selectedIds={followingTaskIds}
                                />
                              </div>
                              {canEditTask ? (
                                <button className="secondary-button" type="submit">
                                  {viewerAccess.canManageProject ? "Lagre aktivitet" : "Oppdater status"}
                                </button>
                              ) : (
                                <p className="muted">Du kan se oppgavene, men ikke endre dem i denne visningen.</p>
                              )}
                              {renderInlineSubtaskComposer(task)}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      {activeTaskListDragMode.id === "dependency" &&
                      viewerAccess.canManageProject &&
                      dragTaskId &&
                      dragTaskId !== task.id ? (
                        <div
                          className={`task-drop-zone ${
                            dropTaskId === `${task.id}:after` ? "is-active" : ""
                          }`}
                          onDragOver={(eventObject) => {
                            eventObject.preventDefault();
                            eventObject.stopPropagation();
                            setDropTaskId(`${task.id}:after`);
                          }}
                          onDrop={(eventObject) => handleTaskCardDrop(eventObject, task, "after")}
                        >
                          {getTaskDropLabel(task, "after")}
                        </div>
                      ) : null}
                    </form>
                  );
                }))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

function PlanningTab({ event, viewerAccess, onSaveOverview }) {
  const agendaHighlights = buildAgendaHighlights(event);
  const agendaHighlightGroups = [];
  let currentAgendaGroup = null;

  agendaHighlights.tasks.forEach((task) => {
    const groupKey = task.displayStartAt ? String(task.displayStartAt).slice(0, 10) : "__missing_date";

    if (!currentAgendaGroup || currentAgendaGroup.key !== groupKey) {
      currentAgendaGroup = {
        key: groupKey,
        label: formatAgendaGroupDate(task.displayStartAt),
        tasks: []
      };
      agendaHighlightGroups.push(currentAgendaGroup);
    }

    currentAgendaGroup.tasks.push(task);
  });

  if (!viewerAccess.canViewPlanning) {
    return (
      <EmptyState
        title="Ingen planleggingstilgang"
        body="Denne personen har ikke tilgang til aa se eller endre planleggingsdelen."
      />
    );
  }

  return (
    <div className="stack">
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

      <section className="panel stack">
        <div className="panel-header-inline">
          <div>
            <h3>Vises pa agenda</h3>
            <p className="muted">
              Marker oppgaver med `Vises pa agenda` i prosjektrommet, sa havner de her i en ren,
              tids-sortert liste for programmet.
            </p>
          </div>
          <div className="project-chip-row">
            <span className="role-pill">{agendaHighlights.total} punkter</span>
            {agendaHighlights.unscheduledCount ? (
              <span className="data-tag warning-tag">
                {agendaHighlights.unscheduledCount} mangler starttid
              </span>
            ) : null}
          </div>
        </div>
        {agendaHighlights.total === 0 ? (
          <EmptyState
            title="Ingen agenda-punkter valgt enda"
            body="Gaa til Oppgaver og marker de aktivitetene som skal vises i agendaen."
          />
        ) : (
          <div className="planning-agenda-groups">
            {agendaHighlightGroups.map((group) => (
              <section className="planning-agenda-group stack" key={`agenda-group-${group.key}`}>
                <div className="planning-agenda-group-header">
                  <h4>{group.label}</h4>
                  <span className="role-pill">{group.tasks.length}</span>
                </div>
                <ul className="compact-list planning-agenda-list">
                  {group.tasks.map((task) => (
                    <li
                      className={`planning-agenda-item ${task.isScheduled ? "" : "is-unscheduled"}`}
                      key={`planning-agenda-${task.id}`}
                    >
                      <div className="planning-agenda-time">
                        <strong>{task.displayStartAt ? formatClockTime(task.displayStartAt) : "Ikke satt"}</strong>
                      </div>
                      <div className="planning-agenda-main">
                        <strong>{task.title}</strong>
                        {task.agendaComment ? (
                          <span className="muted planning-agenda-comment">{task.agendaComment}</span>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </section>
    </div>
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
  onOpenSettlementModal,
  onDeleteLedgerEntry
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
                    <div className="compact-list-main">
                      <span>{label}</span>
                      <small className="muted">{formatDateTime(entry.created_at)}</small>
                    </div>
                    <div className="compact-list-actions">
                      <strong>{formatCurrency(entry.amount)}</strong>
                      {viewerAccess.canManageFinance ? (
                        <button
                          className="danger-button compact-action-button"
                          type="button"
                          onClick={() => onDeleteLedgerEntry(entry)}
                        >
                          Slett
                        </button>
                      ) : null}
                    </div>
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

function ApprovalsTab({
  event,
  viewerAccess,
  onAddReceiptSubmission,
  onAddSubmission,
  onUpdateSubmission
}) {
  if (!viewerAccess.canViewApprovals) {
    return (
      <EmptyState
        title="Ingen godkjenningstilgang"
        body="Denne visningen har ikke tilgang til godkjenningskoen."
      />
    );
  }

  const [composerType, setComposerType] = useState("receipt_upload");
  const submitButtonLabel =
    composerType === "receipt_upload"
      ? "Legg inn bildekvittering"
      : composerType === "manual_invoice"
        ? "Legg inn manuell faktura"
        : "Legg inn forskudd";

  return (
    <div className="stack">
      <section className="panel stack">
        <div className="panel-header-inline">
          <div>
            <h3>Legg inn innsending til godkjenning</h3>
            <p className="muted">
              Velg om du vil sende inn bildekvittering, manuell faktura eller forskudd til godkjenning.
            </p>
          </div>
        </div>
        <div className="tab-row approval-composer-tabs">
          <button
            className={`tab-chip ${composerType === "receipt_upload" ? "active" : ""}`}
            type="button"
            onClick={() => setComposerType("receipt_upload")}
          >
            Bildekvittering
          </button>
          <button
            className={`tab-chip ${composerType === "manual_invoice" ? "active" : ""}`}
            type="button"
            onClick={() => setComposerType("manual_invoice")}
          >
            Manuell faktura
          </button>
          <button
            className={`tab-chip ${composerType === "advance_contribution" ? "active" : ""}`}
            type="button"
            onClick={() => setComposerType("advance_contribution")}
          >
            Forskudd
          </button>
        </div>
        {composerType === "receipt_upload" ? (
          <form className="grid-form compact-grid" onSubmit={onAddReceiptSubmission}>
            <label className="field">
              <span>Tittel</span>
              <input name="title" placeholder="Kvittering fra grillkveld" required />
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
            <label className="field field-span-full">
              <span>Kvitteringsbilde</span>
              <input accept="image/jpeg,image/png,image/webp" name="image" required type="file" />
            </label>
            <label className="field field-span-full">
              <span>Notat</span>
              <textarea
                name="note"
                placeholder="F.eks. lastet opp av medlem og venter pa godkjenning for AI-behandling."
                rows={3}
              />
            </label>
            <button className="primary-button" type="submit">
              {submitButtonLabel}
            </button>
          </form>
        ) : (
          <form className="grid-form compact-grid" onSubmit={onAddSubmission}>
            <input name="type" type="hidden" value={composerType} />
            <label className="field">
              <span>Tittel</span>
              <input
                name="title"
                placeholder={
                  composerType === "manual_invoice"
                    ? "Manuell faktura for hytteutlegg"
                    : "Forskudd til felleskasse"
                }
                required
              />
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
            <label className="field field-span-full">
              <span>Notat</span>
              <textarea name="note" rows={3} />
            </label>
            <button className="primary-button" type="submit">
              {submitButtonLabel}
            </button>
          </form>
        )}
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
                  <div className="approval-meta">
                    <span className="data-tag">
                      {submission.type === "receipt_upload"
                        ? "Bildekvittering"
                        : submission.type === "manual_invoice"
                          ? "Manuell faktura"
                          : "Forskudd"}
                    </span>
                    {submission.imageOriginalFilename ? (
                      <span className="muted">{submission.imageOriginalFilename}</span>
                    ) : null}
                  </div>
                  <p>{submission.note || "Ingen kommentar."}</p>
                  {submission.storedImagePath ? (
                    <a
                      className="approval-image-link"
                      href={`/api/events/${event.id}/submissions/${submission.id}/image`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <img
                        alt={`Kvitteringsbilde for ${submission.title}`}
                        className="approval-image-preview"
                        src={`/api/events/${event.id}/submissions/${submission.id}/image`}
                      />
                      <span>Apne kvitteringsbilde</span>
                    </a>
                  ) : null}
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
  const [projectComposerVersion, setProjectComposerVersion] = useState(0);

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
    { id: "venue", label: "Lokale", visible: viewerAccess.canViewPlanning },
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
    setProjectComposerVersion(0);
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
    const form = formEvent.currentTarget;
    const formData = new FormData(form);
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
      form.reset();
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

  async function handleSaveVenuePlan(venuePlan, successMessage = "Lokaleplanen ble oppdatert.") {
    if (!viewerAccess.canManagePlanning) {
      return null;
    }

    const nextEvent = await patchEvent("update_venue_plan", {
      venuePlan
    });

    if (nextEvent) {
      setStatusMessage(successMessage);
    }

    return nextEvent;
  }

  async function handleAddGuestPage(formEvent) {
    formEvent.preventDefault();
    if (!viewerAccess.canManageGuest) {
      return;
    }

    const form = formEvent.currentTarget;
    const formData = new FormData(form);
    const nextEvent = await patchEvent("add_guest_page", {
      page: {
        title: String(formData.get("title") || "").trim(),
        visibility: String(formData.get("visibility") || "open").trim()
      }
    });

    if (nextEvent) {
      form.reset();
      setStatusMessage("Ny gjesteside er opprettet.");
    }
  }

  async function handleUpdateGuestPage(formEvent, page, draftSnapshot) {
    formEvent.preventDefault();
    if (!viewerAccess.canManageGuest) {
      return;
    }

    const nextDraft = draftSnapshot || {
      title: page.title || "",
      menuLabel: page.menuLabel || "",
      visibility: page.visibility || "open",
      fontPreset: page.fontPreset || "clean",
      textSize: page.textSize || "md",
      textWeight: page.textWeight || "regular",
      showImageCaption: Boolean(page.showImageCaption),
      content: page.content || ""
    };
    const nextEvent = await patchEvent("update_guest_page", {
      pageId: page.id,
      changes: {
        title: String(nextDraft.title || "").trim(),
        menuLabel: String(nextDraft.menuLabel || "").trim(),
        content: String(nextDraft.content || "").trim(),
        visibility: String(nextDraft.visibility || "open").trim(),
        fontPreset: String(nextDraft.fontPreset || "clean").trim(),
        textSize: String(nextDraft.textSize || "md").trim(),
        textWeight: String(nextDraft.textWeight || "regular").trim(),
        showImageCaption: Boolean(nextDraft.showImageCaption)
      }
    });

    if (nextEvent) {
      setStatusMessage(`Siden "${page.title}" ble oppdatert.`);
    }
  }

  async function handleDeleteGuestPage(page) {
    if (!viewerAccess.canManageGuest) {
      return;
    }

    const shouldDelete = window.confirm(`Vil du slette siden "${page.title}"?`);

    if (!shouldDelete) {
      return;
    }

    const nextEvent = await patchEvent("delete_guest_page", {
      pageId: page.id
    });

    if (nextEvent) {
      setStatusMessage("Gjestesiden er slettet.");
    }
  }

  async function handleAddRole(formEvent) {
    formEvent.preventDefault();

    if (!viewerAccess.canManageGuest) {
      return;
    }

    const form = formEvent.currentTarget;
    const formData = new FormData(form);
    const templateKey = String(formData.get("template") || "guest");
    const template = applyTemplate(templateKey);
    const nextName = String(formData.get("name") || "").trim();

    if (!nextName) {
      return;
    }

    const nextEvent = await patchEvent("add_role", {
      role: {
        key: templateKey,
        name: nextName,
        description: String(formData.get("description") || "").trim(),
        planningRole: template.planningRole,
        projectRole: template.projectRole,
        financeRole: template.financeRole,
        capabilities: template.capabilities
      }
    });

    if (nextEvent) {
      form.reset();
      setStatusMessage(`Rollen "${nextName}" er opprettet.`);
    }
  }

  async function handleUpdateRole(formEvent, role) {
    formEvent.preventDefault();

    if (!viewerAccess.canManageGuest) {
      return;
    }

    const formData = new FormData(formEvent.currentTarget);
    const nextName = String(formData.get("name") || role.name).trim() || role.name;
    const nextEvent = await patchEvent("update_role", {
      roleId: role.id,
      changes: {
        name: nextName,
        description: String(formData.get("description") || "").trim(),
        planningRole: String(formData.get("planningRole") || role.planningRole),
        projectRole: String(formData.get("projectRole") || role.projectRole),
        financeRole: String(formData.get("financeRole") || role.financeRole),
        capabilities: CAPABILITY_OPTIONS.reduce((nextCapabilities, option) => {
          nextCapabilities[option.key] = formData.get(option.key) === "on";
          return nextCapabilities;
        }, {})
      }
    });

    if (nextEvent) {
      setStatusMessage(`Rollen "${nextName}" ble oppdatert.`);
    }
  }

  async function handleAddPerson(formEvent) {
    formEvent.preventDefault();
    if (!viewerAccess.canManageGuest) {
      return;
    }

    const form = formEvent.currentTarget;
    const formData = new FormData(form);
    const templateKey = String(formData.get("template") || "guest");
    const template = applyTemplate(templateKey);
    const templateRoleId = selectedEvent?.roles.find((role) => role.key === templateKey)?.id || "";
    const nextEvent = await patchEvent("add_person", {
      person: {
        name: String(formData.get("name") || "").trim(),
        email: String(formData.get("email") || "").trim(),
        phone: String(formData.get("phone") || "").trim(),
        note: String(formData.get("note") || "").trim(),
        allergies: String(formData.get("allergies") || "").trim(),
        dietaryNotes: String(formData.get("dietaryNotes") || "").trim(),
        seatingNote: String(formData.get("seatingNote") || "").trim(),
        rsvpStatus: "pending",
        invitedAt: new Date().toISOString(),
        planningRole: template.planningRole,
        projectRole: template.projectRole,
        financeRole: template.financeRole,
        roleIds: templateRoleId ? [templateRoleId] : [],
        useDirectAccessOverrides: false,
        capabilities: template.capabilities
      }
    });

    if (nextEvent) {
      form.reset();
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
    const nextName = String(formData.get("name") || person.name).trim() || person.name;
    const nextEvent = await patchEvent("update_person", {
      personId: person.id,
      changes: {
        name: nextName,
        email: String(formData.get("email") || "").trim(),
        phone: String(formData.get("phone") || "").trim(),
        rsvpStatus: String(formData.get("rsvpStatus") || person.rsvpStatus),
        planningRole: String(formData.get("planningRole") || person.planningRole),
        projectRole: String(formData.get("projectRole") || person.projectRole),
        financeRole: String(formData.get("financeRole") || person.financeRole),
        roleIds: viewerAccess.canManageGuest ? collectFormList(formData, "roleIds") : person.roleIds,
        useDirectAccessOverrides: viewerAccess.canManageGuest
          ? formData.get("useDirectAccessOverrides") === "on"
          : person.useDirectAccessOverrides,
        note: String(formData.get("note") || "").trim(),
        allergies: String(formData.get("allergies") || "").trim(),
        dietaryNotes: String(formData.get("dietaryNotes") || "").trim(),
        seatingNote: String(formData.get("seatingNote") || "").trim(),
        respondedAt: new Date().toISOString(),
        capabilities: viewerAccess.canManageGuest
          ? CAPABILITY_OPTIONS.reduce((nextCapabilities, option) => {
              nextCapabilities[option.key] = formData.get(option.key) === "on";
              return nextCapabilities;
            }, {})
          : person.capabilities
      }
    });

    if (nextEvent) {
      setStatusMessage(`Oppdaterte ${nextName}.`);
    }
  }

  async function handleAddTask(formEvent) {
    formEvent.preventDefault();
    if (!viewerAccess.canManageProject) {
      return null;
    }

    const formData = new FormData(formEvent.currentTarget);
    const nextEvent = await patchEvent("add_task", {
      task: {
        title: String(formData.get("title") || "").trim(),
        description: String(formData.get("description") || "").trim(),
        dueDate: String(formData.get("dueDate") || "").trim(),
        desiredStartAt: String(formData.get("desiredStartAt") || "").trim(),
        isFixedTime: formData.get("isFixedTime") === "on",
        showOnAgenda: formData.get("showOnAgenda") === "on",
        agendaComment: String(formData.get("agendaComment") || "").trim(),
        durationMinutes: Number(formData.get("durationMinutes") || 60),
        status: String(formData.get("status") || "todo"),
        subprojectId: formData.has("subprojectId")
          ? String(formData.get("subprojectId") || "").trim()
          : "",
        parentTaskId: String(formData.get("parentTaskId") || "").trim(),
        dependencyIds: collectFormList(formData, "dependencyIds"),
        followingTaskIds: collectFormList(formData, "followingTaskIds"),
        assigneeIds: collectFormList(formData, "assigneeIds")
      }
    });

    if (nextEvent) {
      setProjectComposerVersion((current) => current + 1);
      setStatusMessage("Oppgaven er lagt til.");
    }

    return nextEvent;
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
    const nextEvent = await patchEvent("update_task", {
      taskId: task.id,
      changes: {
        status: String(formData.get("status") || task.status),
        title: viewerAccess.canManageProject
          ? String(formData.get("title") || task.title).trim()
          : task.title,
        description: viewerAccess.canManageProject
          ? String(formData.get("description") || "").trim()
          : task.description,
        dueDate: viewerAccess.canManageProject
          ? String(formData.get("dueDate") || "").trim()
          : task.dueDate,
        agendaComment: viewerAccess.canManageProject
          ? String(formData.get("agendaComment") || "").trim()
          : task.agendaComment,
        desiredStartAt: viewerAccess.canManageProject
          ? String(formData.get("desiredStartAt") || "").trim()
          : task.desiredStartAt,
        isFixedTime: viewerAccess.canManageProject
          ? formData.get("isFixedTime") === "on"
          : Boolean(task.isFixedTime),
        showOnAgenda: viewerAccess.canManageProject
          ? formData.get("showOnAgenda") === "on"
          : Boolean(task.showOnAgenda),
        durationMinutes: viewerAccess.canManageProject
          ? Number(formData.get("durationMinutes") || task.durationMinutes || 60)
          : task.durationMinutes,
        subprojectId: viewerAccess.canManageProject
          ? formData.has("subprojectId")
            ? String(formData.get("subprojectId") || "").trim()
            : task.explicitSubprojectId || task.subprojectId
          : task.explicitSubprojectId || task.subprojectId,
        parentTaskId: viewerAccess.canManageProject
          ? String(formData.get("parentTaskId") || "").trim()
          : task.parentTaskId,
        dependencyIds: viewerAccess.canManageProject
          ? collectFormList(formData, "dependencyIds")
          : task.dependencyIds,
        ...(viewerAccess.canManageProject
          ? {
              followingTaskIds: collectFormList(formData, "followingTaskIds")
            }
          : {}),
        assigneeIds: viewerAccess.canManageProject
          ? collectFormList(formData, "assigneeIds")
          : task.assigneeIds
      }
    });

    if (nextEvent) {
      setStatusMessage(`Oppdaterte oppgaven "${task.title}".`);
    }
  }

  async function handleAssignTaskAssignees(taskId, assigneeIds = []) {
    if (!viewerAccess.canManageProject || !selectedEvent) {
      return;
    }

    const task = selectedEvent.tasks.find((candidate) => candidate.id === taskId);

    if (!task) {
      return;
    }

    const nextAssigneeIds = [...new Set((Array.isArray(assigneeIds) ? assigneeIds : []).filter(Boolean))];

    if (haveSameIds(task.assigneeIds, nextAssigneeIds)) {
      return;
    }

    const nextEvent = await patchEvent("update_task", {
      taskId,
      changes: {
        assigneeIds: nextAssigneeIds
      }
    });

    if (!nextEvent) {
      return;
    }

    if (nextAssigneeIds.length === 0) {
      setStatusMessage(`"${task.title}" er naa uten ansvarlig.`);
      return;
    }

    const assigneeNames = nextEvent.people
      .filter((person) => nextAssigneeIds.includes(person.id))
      .map((person) => person.name);
    setStatusMessage(
      nextAssigneeIds.length === 1
        ? `"${task.title}" ligger naa paa ${assigneeNames[0] || "valgt person"}.`
        : `"${task.title}" deles naa mellom ${assigneeNames.join(", ")}.`
    );
  }

  async function handleSetTaskParent(task, requestedParentTaskId) {
    if (!viewerAccess.canManageProject || !selectedEvent || !task) {
      return;
    }

    const currentParentTask = task.parentTaskId
      ? selectedEvent.tasks.find((candidate) => candidate.id === task.parentTaskId)
      : null;
    const nextParentTaskId =
      requestedParentTaskId === "__promote__"
        ? String(currentParentTask?.parentTaskId || "").trim()
        : String(requestedParentTaskId || "").trim();
    const nextSubprojectId =
      !nextParentTaskId && !(task.explicitSubprojectId || "")
        ? String(task.effectiveSubprojectId || "").trim()
        : String(task.explicitSubprojectId || task.subprojectId || "").trim();

    if (
      nextParentTaskId === String(task.parentTaskId || "").trim() &&
      nextSubprojectId === String(task.explicitSubprojectId || task.subprojectId || "").trim()
    ) {
      return;
    }

    const nextEvent = await patchEvent("update_task", {
      taskId: task.id,
      changes: {
        parentTaskId: nextParentTaskId,
        subprojectId: nextSubprojectId
      }
    });

    if (nextEvent) {
      if (!nextParentTaskId) {
        setStatusMessage(`"${task.title}" er na en egen hovedoppgave.`);
        return;
      }

      const nextParentTask = nextEvent.tasks.find((candidate) => candidate.id === nextParentTaskId);
      setStatusMessage(`"${task.title}" ligger na under "${nextParentTask?.title || "valgt oppgave"}".`);
    }
  }

  async function handleLinkTasksInList(sourceTaskId, targetTaskId, placement) {
    if (!viewerAccess.canManageProject || !selectedEvent || sourceTaskId === targetTaskId) {
      return;
    }

    let payload;

    try {
      payload = buildTaskDependencyDragPayload(
        selectedEvent.tasks,
        sourceTaskId,
        targetTaskId,
        placement
      );
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Kunne ikke koble aktivitetene.");
      return;
    }

    const relationUpdatedEvent = payload.changed
      ? await patchEvent("update_task", {
          taskId: payload.taskId,
          changes: {
            dependencyIds: payload.dependencyIds,
            followingTaskIds: payload.followingTaskIds
          }
        })
      : selectedEvent;

    if (!relationUpdatedEvent) {
      return;
    }

    const finalEvent =
      sourceTaskId !== targetTaskId
        ? await patchEvent("move_task_tree", {
            sourceTaskId,
            targetTaskId,
            placement
          })
        : relationUpdatedEvent;

    if (finalEvent) {
      const sourceTask = finalEvent.tasks.find((task) => task.id === sourceTaskId);
      const targetTask = finalEvent.tasks.find((task) => task.id === targetTaskId);
      setStatusMessage(
        placement === "before"
          ? `"${sourceTask?.title || "Aktiviteten"}" legges naa for "${targetTask?.title || "aktiviteten"}".`
          : `"${sourceTask?.title || "Aktiviteten"}" legges naa etter "${targetTask?.title || "aktiviteten"}".`
      );
    }
  }

  async function handleReorderTasks(sourceTaskId, targetTaskId, placement = "before") {
    if (!viewerAccess.canManageProject || !selectedEvent || sourceTaskId === targetTaskId) {
      return;
    }

    const nextEvent = await patchEvent("move_task_tree", {
      sourceTaskId,
      targetTaskId,
      placement
    });

    if (nextEvent) {
      const sourceTask = nextEvent.tasks.find((task) => task.id === sourceTaskId);
      const targetTask = nextEvent.tasks.find((task) => task.id === targetTaskId);
      setStatusMessage(
        placement === "under"
          ? `"${sourceTask?.title || "Aktiviteten"}" ligger naa under "${targetTask?.title || "aktiviteten"}".`
          : placement === "before"
            ? `"${sourceTask?.title || "Aktiviteten"}" ligger naa foran "${targetTask?.title || "aktiviteten"}".`
            : `"${sourceTask?.title || "Aktiviteten"}" ligger naa etter "${targetTask?.title || "aktiviteten"}".`
      );
    }
  }

  async function handleScaleTasksFromAgenda(taskIds = []) {
    if (!viewerAccess.canManageProject || !selectedEvent) {
      return;
    }

    const scopedTaskIds = Array.isArray(taskIds) ? taskIds.filter(Boolean) : [];
    const nextEvent = await patchEvent("scale_tasks", {
      taskIds: scopedTaskIds
    });

    if (nextEvent) {
      setStatusMessage(
        scopedTaskIds.length > 0
          ? `Skalerte ${scopedTaskIds.length} synlige aktiviteter etter agendaen.`
          : "Skalerte aktivitetene etter agendaen."
      );
    }
  }

  async function handleAddAdvance(formEvent) {
    formEvent.preventDefault();
    if (!viewerAccess.canManageFinance) {
      return;
    }

    const form = formEvent.currentTarget;
    const formData = new FormData(form);
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
      form.reset();
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

    const form = formEvent.currentTarget;
    const formData = new FormData(form);
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
      form.reset();
      setFinanceModal(null);
      setShowSettlementPlan(true);
      setStatusMessage("Oppgjoret er registrert.");
    }
  }

  async function handleAddSubmission(formEvent) {
    formEvent.preventDefault();
    const form = formEvent.currentTarget;
    const formData = new FormData(form);
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
      form.reset();
      setStatusMessage("Innsendingen er lagt i koen.");
    }
  }

  async function handleAddReceiptSubmission(formEvent) {
    formEvent.preventDefault();
    const form = formEvent.currentTarget;
    const formData = new FormData(form);

    try {
      setIsSaving(true);
      const response = await fetch(`/api/events/${selectedEvent.id}/submissions/receipt`, {
        method: "POST",
        body: formData
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body?.error || "Kunne ikke opprette bildeinnsendingen.");
      }

      const nextEvent = ensureEventShape(body.event);
      setEvents((currentEvents) => syncEvent(currentEvents, nextEvent));
      form.reset();
      setStatusMessage("Bildekvitteringen er lagt i godkjenningskoen.");
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Kunne ikke opprette bildeinnsendingen."
      );
    } finally {
      setIsSaving(false);
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

  async function handleDeleteLedgerEntry(entry) {
    if (!viewerAccess.canManageFinance) {
      return;
    }

    const typeLabel =
      entry.type === "settlement_transfer"
        ? "oppgjoret"
        : entry.type === "advance_contribution"
          ? "forskuddet"
          : "posten";
    const shouldDelete = window.confirm(
      `Vil du slette ${typeLabel} pa ${formatCurrency(entry.amount)} kr?`
    );

    if (!shouldDelete) {
      return;
    }

    const nextEvent = await patchEvent("delete_ledger_entry", {
      entryId: entry.id
    });

    if (nextEvent) {
      setShowSettlementPlan(true);
      setStatusMessage("Ledger-posten er slettet.");
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
          <Link className="secondary-link" href="/receipts">
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
                  onAddGuestPage={handleAddGuestPage}
                  onAddRole={handleAddRole}
                  onAddPerson={handleAddPerson}
                  onDeleteGuestPage={handleDeleteGuestPage}
                  onUpdateGuestPage={handleUpdateGuestPage}
                  onUpdateRole={handleUpdateRole}
                  onUpdatePerson={handleUpdatePerson}
                  viewerAccess={viewerAccess}
                  viewerPerson={viewerPerson}
                />
              ) : null}
              {currentTab === "project" ? (
                <ProjectTab
                  composerVersion={projectComposerVersion}
                  event={selectedEvent}
                  onAddTask={handleAddTask}
                  onAssignTaskAssignees={handleAssignTaskAssignees}
                  onLinkTasksInList={handleLinkTasksInList}
                  onReorderTasks={handleReorderTasks}
                  onScaleTasksFromAgenda={handleScaleTasksFromAgenda}
                  onSetTaskParent={handleSetTaskParent}
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
              {currentTab === "venue" ? (
                <VenueTab
                  event={selectedEvent}
                  onSaveVenuePlan={handleSaveVenuePlan}
                  viewerAccess={viewerAccess}
                />
              ) : null}
              {currentTab === "finance" ? (
                <FinanceTab
                  engineOpen={financeEngineOpen}
                  event={selectedEvent}
                  financeSummary={financeSummary}
                  jobs={selectedJobs}
                  onDeleteLedgerEntry={handleDeleteLedgerEntry}
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
                  onAddReceiptSubmission={handleAddReceiptSubmission}
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
