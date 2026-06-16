"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";

import { DashboardClient } from "@/components/dashboard-client";
import { GuestPageContentView } from "@/components/guest-page-content-view";
import { GuestAgendaPageView } from "@/components/guest-agenda-page-view";
import { GuestSeatingPageView } from "@/components/guest-seating-page-view";
import { GuestSiteLinksPanel } from "@/components/guest-site-links-panel";
import { VenueTab } from "@/components/venue-tab";
import {
  buildGuestPageImageMarkup,
  parseGuestPageImageMarkup
} from "@/guest-page-content";
import {
  DEFAULT_GUEST_EXPORT_FIELDS,
  GUEST_LIST_FIELD_OPTIONS,
  buildGuestExportCsv,
  buildGuestExportFilename,
  buildGuestExportPdfLines,
  buildGuestExportTable,
  buildGuestImportTemplateCsv,
  buildGuestImportTemplateTable,
  buildGuestTemplateFilename,
  parseGuestImportRows,
  parseGuestImportText
} from "@/guest-list-utils";
import {
  DEFAULT_PROJECT_TASK_EXPORT_FIELDS,
  PROJECT_TASK_FIELD_OPTIONS,
  buildProjectTaskExportCsv,
  buildProjectTaskExportFilename,
  buildProjectTaskExportPdfLines,
  buildProjectTaskExportTable,
  buildProjectTaskImportTemplateCsv,
  buildProjectTaskImportTemplateTable,
  buildProjectTaskTemplateFilename,
  matchImportedProjectTask,
  parseProjectTaskImportRows,
  parseProjectTaskImportText
} from "@/project-task-utils";
import {
  VENUE_GUEST_NAME_DISPLAY_OPTIONS,
  VENUE_ITEM_LIBRARY
} from "@/venue-layout-utils";
import {
  CAPABILITY_OPTIONS,
  FINANCE_ROLE_OPTIONS,
  FINANCE_CATEGORY_OPTIONS,
  FINANCE_SUPPLIER_STATUS_OPTIONS,
  GUEST_PAGE_FONT_OPTIONS,
  GUEST_PAGE_TEXT_SIZE_OPTIONS,
  GUEST_PAGE_TEXT_WEIGHT_OPTIONS,
  GUEST_PAGE_VISIBILITY_OPTIONS,
  HOSPITALITY_SERVICE_STYLE_OPTIONS,
  LOCAL_AI_MODE_OPTIONS,
  PERSON_TEMPLATES,
  PLANNING_ROLE_OPTIONS,
  PROJECT_ROLE_OPTIONS,
  RSVP_OPTIONS,
  SUBMISSION_STATUS_OPTIONS,
  TASK_BUFFER_PLACEMENT_OPTIONS,
  TASK_CATEGORY_OPTIONS,
  TASK_LIVE_STATUS_OPTIONS,
  TASK_RECOVERY_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
  buildApprovalSummary,
  buildLiveAgenda,
  buildPlanningAgenda,
  buildGuestSiteBasePath,
  buildGuestSiteNavigationEntries,
  canViewerSeeGuestPage,
  buildFinanceControlRoom,
  buildEventFinanceSummary,
  buildHospitalityBriefs,
  buildProjectDashboard,
  buildProjectHierarchy,
  buildGuestSummary,
  buildProjectSummary,
  buildSettlementSuggestions,
  sortGuestSiteNavigationEntries,
  buildTaskAgenda,
  buildTaskBufferSummary,
  buildTaskRecoverySummary,
  buildTaskSwimlanes,
  buildViewerAccess,
  ensureEventShape,
  getTaskCategoryBufferDefaults,
  getTaskCategoryRecoveryDefaults,
  resolveTaskBufferConfig
} from "@/event-platform-utils";
import {
  buildTaskDependencyDragPayload,
  buildTaskDependencyForest,
  buildTaskDependencySummary,
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

function formatLiveDelta(value) {
  const minutes = typeof value === "number" ? value : Number(value || 0);

  if (!Number.isFinite(minutes) || Math.abs(minutes) < 1) {
    return "I rute";
  }

  return minutes > 0
    ? `${formatDurationMinutes(minutes)} bak skjema`
    : `${formatDurationMinutes(Math.abs(minutes))} foran skjema`;
}

function getTaskLiveStatusLabel(status) {
  return TASK_LIVE_STATUS_OPTIONS.find((option) => option.value === status)?.label || "Ikke startet live";
}

function toCurrentDateTimeLocalString(date = new Date()) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function parseTaskDurationInput(value, fallback = 60) {
  const rawValue =
    typeof value === "string" || typeof value === "number" ? String(value) : "";
  const parsed = Number.parseInt(rawValue, 10);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
}

function normalizeTaskBufferPlacementInput(value, fallback = "end") {
  return String(value || "") === "distributed"
    ? "distributed"
    : fallback === "distributed"
      ? "distributed"
      : "end";
}

function normalizeTaskRecoveryPriorityInput(value, fallback = "normal") {
  return TASK_RECOVERY_PRIORITY_OPTIONS.some((option) => option.value === String(value || ""))
    ? String(value || "")
    : fallback;
}

function getTaskCategoryLabel(category) {
  return TASK_CATEGORY_OPTIONS.find((option) => option.value === category)?.label || "Generelt";
}

function buildTaskBufferPayload(formData, planningSettings = null) {
  const category = String(formData.get("category") || "general");
  const durationMinutes = parseTaskDurationInput(formData.get("durationMinutes"), 60);
  const defaults = getTaskCategoryBufferDefaults(category, planningSettings);
  const recoveryDefaults = getTaskCategoryRecoveryDefaults(category, durationMinutes, planningSettings);
  const useCategoryRecoveryDefaults = formData.get("useCategoryRecoveryDefaults") === "on";
  const customCanShorten = formData.get("recoveryCanShorten") === "on";
  const customMinimumDuration = parseTaskDurationInput(
    formData.get("recoveryMinimumDurationMinutes"),
    recoveryDefaults.minimumDurationMinutes ?? 0
  );

  return {
    category,
    useCategoryBufferDefaults: formData.get("useCategoryBufferDefaults") === "on",
    bufferConfig: {
      availableMinutes: parseTaskDurationInput(
        formData.get("bufferAvailableMinutes"),
        defaults.availableMinutes ?? 0
      ),
      availablePlacement: normalizeTaskBufferPlacementInput(
        formData.get("bufferAvailablePlacement"),
        defaults.availablePlacement || "end"
      ),
      transitionMinutes: parseTaskDurationInput(
        formData.get("bufferTransitionMinutes"),
        defaults.transitionMinutes ?? 0
      ),
      label: String(formData.get("bufferLabel") || defaults.label || "Buffer").trim() || "Buffer"
    },
    useCategoryRecoveryDefaults,
    recoveryConfig: useCategoryRecoveryDefaults
      ? recoveryDefaults
      : {
          canShorten: customCanShorten,
          minimumDurationMinutes: customCanShorten
            ? Math.min(durationMinutes, customMinimumDuration)
            : durationMinutes,
          canSkip: formData.get("recoveryCanSkip") === "on",
          priority: normalizeTaskRecoveryPriorityInput(
            formData.get("recoveryPriority"),
            recoveryDefaults.priority || "normal"
          )
        }
  };
}

function buildPlanningSettingsPayload(formData) {
  return {
    categoryDefaults: TASK_CATEGORY_OPTIONS.reduce((currentDefaults, option) => {
      const keyPrefix = `categoryDefaults__${option.value}__`;

      currentDefaults[option.value] = {
        bufferConfig: {
          availableMinutes: parseTaskDurationInput(formData.get(`${keyPrefix}bufferAvailableMinutes`), 0),
          availablePlacement: normalizeTaskBufferPlacementInput(
            formData.get(`${keyPrefix}bufferAvailablePlacement`),
            "end"
          ),
          transitionMinutes: parseTaskDurationInput(
            formData.get(`${keyPrefix}bufferTransitionMinutes`),
            0
          ),
          label: String(formData.get(`${keyPrefix}bufferLabel`) || "Buffer").trim() || "Buffer"
        },
        recoveryConfig: {
          canShorten: formData.get(`${keyPrefix}recoveryCanShorten`) === "on",
          minimumDurationMinutes: parseTaskDurationInput(
            formData.get(`${keyPrefix}recoveryMinimumDurationMinutes`),
            0
          ),
          canSkip: formData.get(`${keyPrefix}recoveryCanSkip`) === "on",
          priority: normalizeTaskRecoveryPriorityInput(
            formData.get(`${keyPrefix}recoveryPriority`),
            "normal"
          )
        }
      };
      return currentDefaults;
    }, {})
  };
}

function buildHospitalityPlanPayload(formData, fallback = null) {
  const safeFallback = fallback && typeof fallback === "object" ? fallback : {};
  const fallbackShared = safeFallback.shared && typeof safeFallback.shared === "object" ? safeFallback.shared : {};
  const fallbackKitchen =
    safeFallback.kitchen && typeof safeFallback.kitchen === "object" ? safeFallback.kitchen : {};
  const fallbackService =
    safeFallback.service && typeof safeFallback.service === "object" ? safeFallback.service : {};

  return {
    shared: {
      hostContactName: String(formData.get("hostContactName") || fallbackShared.hostContactName || "").trim(),
      hostContactPhone: String(formData.get("hostContactPhone") || fallbackShared.hostContactPhone || "").trim(),
      venueContactName: String(formData.get("venueContactName") || fallbackShared.venueContactName || "").trim(),
      venueContactPhone: String(formData.get("venueContactPhone") || fallbackShared.venueContactPhone || "").trim(),
      finalHeadcountLockedAt: String(
        formData.get("finalHeadcountLockedAt") || fallbackShared.finalHeadcountLockedAt || ""
      ).trim(),
      dietaryServiceNotes: String(
        formData.get("dietaryServiceNotes") || fallbackShared.dietaryServiceNotes || ""
      ).trim(),
      logisticsNotes: String(formData.get("logisticsNotes") || fallbackShared.logisticsNotes || "").trim(),
      emergencyNotes: String(formData.get("emergencyNotes") || fallbackShared.emergencyNotes || "").trim()
    },
    kitchen: {
      leadName: String(formData.get("kitchenLeadName") || fallbackKitchen.leadName || "").trim(),
      leadPhone: String(formData.get("kitchenLeadPhone") || fallbackKitchen.leadPhone || "").trim(),
      prepStartsAt: String(formData.get("kitchenPrepStartsAt") || fallbackKitchen.prepStartsAt || "").trim(),
      serviceStartsAt: String(
        formData.get("kitchenServiceStartsAt") || fallbackKitchen.serviceStartsAt || ""
      ).trim(),
      menuSummary: String(formData.get("kitchenMenuSummary") || fallbackKitchen.menuSummary || "").trim(),
      specialMenus: String(formData.get("kitchenSpecialMenus") || fallbackKitchen.specialMenus || "").trim(),
      productionNotes: String(
        formData.get("kitchenProductionNotes") || fallbackKitchen.productionNotes || ""
      ).trim(),
      equipmentNotes: String(
        formData.get("kitchenEquipmentNotes") || fallbackKitchen.equipmentNotes || ""
      ).trim(),
      deliveryNotes: String(formData.get("kitchenDeliveryNotes") || fallbackKitchen.deliveryNotes || "").trim(),
      fallbackPlan: String(formData.get("kitchenFallbackPlan") || fallbackKitchen.fallbackPlan || "").trim()
    },
    service: {
      leadName: String(formData.get("serviceLeadName") || fallbackService.leadName || "").trim(),
      leadPhone: String(formData.get("serviceLeadPhone") || fallbackService.leadPhone || "").trim(),
      serviceStyle: String(formData.get("serviceStyle") || fallbackService.serviceStyle || "plated"),
      teamSize: parseTaskDurationInput(formData.get("serviceTeamSize"), fallbackService.teamSize ?? 0),
      serviceStartsAt: String(
        formData.get("serviceStartsAt") || fallbackService.serviceStartsAt || ""
      ).trim(),
      beveragePlan: String(formData.get("serviceBeveragePlan") || fallbackService.beveragePlan || "").trim(),
      tablePlanNotes: String(
        formData.get("serviceTablePlanNotes") || fallbackService.tablePlanNotes || ""
      ).trim(),
      clearingPlan: String(formData.get("serviceClearingPlan") || fallbackService.clearingPlan || "").trim(),
      guestCommunicationPlan: String(
        formData.get("serviceGuestCommunicationPlan") || fallbackService.guestCommunicationPlan || ""
      ).trim(),
      issueEscalationPlan: String(
        formData.get("serviceIssueEscalationPlan") || fallbackService.issueEscalationPlan || ""
      ).trim(),
      notes: String(formData.get("serviceNotes") || fallbackService.notes || "").trim()
    }
  };
}

function createEmptyFinanceBudgetItem(index = 0) {
  return {
    id: `budget-item-${Date.now()}-${index}`,
    label: "",
    categoryKey: "uncategorized",
    plannedAmount: 0,
    notes: "",
    orderIndex: index
  };
}

function createEmptyFinanceSupplier(index = 0) {
  return {
    id: `supplier-${Date.now()}-${index}`,
    name: "",
    categoryKey: "uncategorized",
    contactName: "",
    email: "",
    phone: "",
    deliverySummary: "",
    quotedAmount: 0,
    agreedAmount: 0,
    paymentDueAt: "",
    status: "planned",
    notes: "",
    orderIndex: index
  };
}

function normalizeFinancePlanForEditor(financePlan = null) {
  const safePlan = financePlan && typeof financePlan === "object" ? financePlan : {};
  const budgetItems = Array.isArray(safePlan.budgetItems) ? safePlan.budgetItems : [];
  const suppliers = Array.isArray(safePlan.suppliers) ? safePlan.suppliers : [];
  const localAiOps = safePlan.localAiOps && typeof safePlan.localAiOps === "object" ? safePlan.localAiOps : {};

  return {
    budgetItems: budgetItems.map((item, index) => ({
      ...createEmptyFinanceBudgetItem(index),
      ...item,
      plannedAmount: Number(item?.plannedAmount || 0),
      orderIndex: index
    })),
    suppliers: suppliers.map((supplier, index) => ({
      ...createEmptyFinanceSupplier(index),
      ...supplier,
      quotedAmount: Number(supplier?.quotedAmount || 0),
      agreedAmount: Number(supplier?.agreedAmount || 0),
      orderIndex: index
    })),
    localAiOps: {
      mode: localAiOps.mode || "queue_worker",
      machineLabel: localAiOps.machineLabel || "",
      workerCommand: localAiOps.workerCommand || "npm run worker:watch",
      bridgeCommand: localAiOps.bridgeCommand || "npm run ai:bridge",
      notes: localAiOps.notes || ""
    }
  };
}

function getFinanceCategoryLabel(categoryKey) {
  return FINANCE_CATEGORY_OPTIONS.find((option) => option.value === categoryKey)?.label || "Ufordelt";
}

function getFinanceSupplierStatusLabel(status) {
  return FINANCE_SUPPLIER_STATUS_OPTIONS.find((option) => option.value === status)?.label || "Planlagt";
}

function getLocalAiModeLabel(mode) {
  return LOCAL_AI_MODE_OPTIONS.find((option) => option.value === mode)?.label || "Koblet via ko og lokal worker";
}

function TaskBufferSettingsFields({
  task = null,
  planningSettings = null,
  disabled = false,
  helperText = "Brukes naar aktiviteten har underoppgaver."
}) {
  const initialConfig = resolveTaskBufferConfig(task || {}, planningSettings);
  const initialDurationMinutes = parseTaskDurationInput(task?.durationMinutes, 60);
  const initialRecoveryDefaults = getTaskCategoryRecoveryDefaults(
    initialConfig.category,
    initialDurationMinutes,
    planningSettings
  );
  const initialRecoveryConfig =
    task?.useCategoryRecoveryDefaults === false && task?.recoveryConfig && typeof task.recoveryConfig === "object"
      ? {
          ...initialRecoveryDefaults,
          ...task.recoveryConfig
        }
      : initialRecoveryDefaults;
  const [category, setCategory] = useState(initialConfig.category);
  const [useDefaults, setUseDefaults] = useState(initialConfig.useCategoryBufferDefaults);
  const [useRecoveryDefaults, setUseRecoveryDefaults] = useState(
    task?.useCategoryRecoveryDefaults !== false
  );
  const [customConfig, setCustomConfig] = useState({
    availableMinutes: initialConfig.availableMinutes,
    availablePlacement: initialConfig.availablePlacement,
    transitionMinutes: initialConfig.transitionMinutes,
    label: initialConfig.label
  });
  const [customRecoveryConfig, setCustomRecoveryConfig] = useState({
    canShorten: Boolean(initialRecoveryConfig.canShorten),
    minimumDurationMinutes: parseTaskDurationInput(
      initialRecoveryConfig.minimumDurationMinutes,
      initialDurationMinutes
    ),
    canSkip: Boolean(initialRecoveryConfig.canSkip),
    priority: normalizeTaskRecoveryPriorityInput(initialRecoveryConfig.priority, "normal")
  });
  const defaults = useMemo(
    () => getTaskCategoryBufferDefaults(category, planningSettings),
    [category, planningSettings]
  );
  const recoveryDefaults = useMemo(
    () => getTaskCategoryRecoveryDefaults(category, initialDurationMinutes, planningSettings),
    [category, initialDurationMinutes, planningSettings]
  );
  const effectiveConfig = useDefaults ? defaults : customConfig;
  const effectiveRecoveryConfig = useRecoveryDefaults ? recoveryDefaults : customRecoveryConfig;
  const summary = buildTaskBufferSummary(effectiveConfig);
  const recoverySummary = buildTaskRecoverySummary(effectiveRecoveryConfig);

  return (
    <div className="field field-span-full">
      <span>Kategori, buffer og live-regler</span>
      <div className="stack compact-stack">
        <div className="agenda-field-grid field-span-full">
          <label className="field agenda-inline-field">
            <span>Kategori</span>
            <select
              disabled={disabled}
              name="category"
              value={category}
              onChange={(eventObject) => setCategory(eventObject.currentTarget.value)}
            >
              {TASK_CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field agenda-inline-field checkbox-field">
            <span>Standardbuffer</span>
            <span className="checkbox-inline">
              <input
                checked={useDefaults}
                disabled={disabled}
                name="useCategoryBufferDefaults"
                type="checkbox"
                onChange={(eventObject) => setUseDefaults(eventObject.currentTarget.checked)}
              />
              <span>Bruk kategoriens standard</span>
            </span>
          </label>
        </div>
        <p className="muted">{helperText}</p>
        <div className="tag-list">
          <span className="data-tag">{getTaskCategoryLabel(category)}</span>
          {summary ? <span className="data-tag">{summary}</span> : <span className="data-tag">Ingen automatisk buffer</span>}
          <span className="data-tag">{recoverySummary}</span>
        </div>
        {useDefaults ? (
          <>
            <input name="bufferAvailableMinutes" type="hidden" value={String(defaults.availableMinutes)} />
            <input name="bufferAvailablePlacement" type="hidden" value={defaults.availablePlacement} />
            <input name="bufferTransitionMinutes" type="hidden" value={String(defaults.transitionMinutes)} />
            <input name="bufferLabel" type="hidden" value={defaults.label} />
          </>
        ) : (
          <div className="agenda-field-grid field-span-full">
            <label className="field agenda-inline-field">
              <span>Tilgjengelig buffer (min)</span>
              <input
                disabled={disabled}
                min="0"
                name="bufferAvailableMinutes"
                step="1"
                type="number"
                value={String(customConfig.availableMinutes)}
                onChange={(eventObject) =>
                  setCustomConfig((current) => ({
                    ...current,
                    availableMinutes: parseTaskDurationInput(eventObject.currentTarget.value, 0)
                  }))
                }
              />
            </label>
            <label className="field agenda-inline-field">
              <span>Plassering</span>
              <select
                disabled={disabled}
                name="bufferAvailablePlacement"
                value={customConfig.availablePlacement}
                onChange={(eventObject) =>
                  setCustomConfig((current) => ({
                    ...current,
                    availablePlacement: normalizeTaskBufferPlacementInput(
                      eventObject.currentTarget.value,
                      "end"
                    )
                  }))
                }
              >
                {TASK_BUFFER_PLACEMENT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field agenda-inline-field">
              <span>Fast mellomrom (min)</span>
              <input
                disabled={disabled}
                min="0"
                name="bufferTransitionMinutes"
                step="1"
                type="number"
                value={String(customConfig.transitionMinutes)}
                onChange={(eventObject) =>
                  setCustomConfig((current) => ({
                    ...current,
                    transitionMinutes: parseTaskDurationInput(eventObject.currentTarget.value, 0)
                  }))
                }
              />
            </label>
            <label className="field agenda-inline-field">
              <span>Navn pa bufferpunkt</span>
              <input
                disabled={disabled}
                name="bufferLabel"
                value={customConfig.label}
                onChange={(eventObject) =>
                  setCustomConfig((current) => ({
                    ...current,
                    label: eventObject.currentTarget.value
                  }))
                }
              />
            </label>
          </div>
        )}
        <div className="agenda-field-grid field-span-full">
          <label className="field agenda-inline-field checkbox-field">
            <span>Live-standard</span>
            <span className="checkbox-inline">
              <input
                checked={useRecoveryDefaults}
                disabled={disabled}
                name="useCategoryRecoveryDefaults"
                type="checkbox"
                onChange={(eventObject) => setUseRecoveryDefaults(eventObject.currentTarget.checked)}
              />
              <span>Bruk kategoriens live-standard</span>
            </span>
          </label>
        </div>
        {useRecoveryDefaults ? (
          <>
            <input
              name="recoveryCanShorten"
              type="hidden"
              value={recoveryDefaults.canShorten ? "true" : "false"}
            />
            <input
              name="recoveryMinimumDurationMinutes"
              type="hidden"
              value={String(recoveryDefaults.minimumDurationMinutes)}
            />
            <input
              name="recoveryCanSkip"
              type="hidden"
              value={recoveryDefaults.canSkip ? "true" : "false"}
            />
            <input name="recoveryPriority" type="hidden" value={recoveryDefaults.priority} />
          </>
        ) : (
          <div className="agenda-field-grid field-span-full">
            <label className="field agenda-inline-field checkbox-field">
              <span>Kan kortes ned live</span>
              <span className="checkbox-inline">
                <input
                  checked={customRecoveryConfig.canShorten}
                  disabled={disabled}
                  name="recoveryCanShorten"
                  type="checkbox"
                  onChange={(eventObject) =>
                    setCustomRecoveryConfig((current) => ({
                      ...current,
                      canShorten: eventObject.currentTarget.checked
                    }))
                  }
                />
                <span>La toastmaster korte ned dette punktet</span>
              </span>
            </label>
            <label className="field agenda-inline-field">
              <span>Minimumsvarighet (min)</span>
              <input
                disabled={disabled || !customRecoveryConfig.canShorten}
                min="0"
                name="recoveryMinimumDurationMinutes"
                step="1"
                type="number"
                value={String(customRecoveryConfig.minimumDurationMinutes)}
                onChange={(eventObject) =>
                  setCustomRecoveryConfig((current) => ({
                    ...current,
                    minimumDurationMinutes: parseTaskDurationInput(eventObject.currentTarget.value, 0)
                  }))
                }
              />
            </label>
            <label className="field agenda-inline-field checkbox-field">
              <span>Kan hoppes over</span>
              <span className="checkbox-inline">
                <input
                  checked={customRecoveryConfig.canSkip}
                  disabled={disabled}
                  name="recoveryCanSkip"
                  type="checkbox"
                  onChange={(eventObject) =>
                    setCustomRecoveryConfig((current) => ({
                      ...current,
                      canSkip: eventObject.currentTarget.checked
                    }))
                  }
                />
                <span>Kan fjernes helt ved forsinkelse</span>
              </span>
            </label>
            <label className="field agenda-inline-field">
              <span>Innhentingsprioritet</span>
              <select
                disabled={disabled}
                name="recoveryPriority"
                value={customRecoveryConfig.priority}
                onChange={(eventObject) =>
                  setCustomRecoveryConfig((current) => ({
                    ...current,
                    priority: normalizeTaskRecoveryPriorityInput(eventObject.currentTarget.value, "normal")
                  }))
                }
              >
                {TASK_RECOVERY_PRIORITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskCategoryDefaultsEditor({ planningSettings, disabled = false }) {
  return (
    <div className="stack compact-stack">
      {TASK_CATEGORY_OPTIONS.map((option) => {
        const bufferDefaults = getTaskCategoryBufferDefaults(option.value, planningSettings);
        const recoveryDefaults = getTaskCategoryRecoveryDefaults(option.value, 60, planningSettings);
        const keyPrefix = `categoryDefaults__${option.value}__`;

        return (
          <details className="task-settings-details" key={`task-category-default-${option.value}`}>
            <summary>
              <strong>{option.label}</strong>
              <span className="muted">
                {buildTaskBufferSummary(bufferDefaults)} • {buildTaskRecoverySummary(recoveryDefaults)}
              </span>
            </summary>
            <div className="agenda-field-grid field-span-full">
              <label className="field agenda-inline-field">
                <span>Tilgjengelig buffer (min)</span>
                <input
                  defaultValue={String(bufferDefaults.availableMinutes)}
                  disabled={disabled}
                  min="0"
                  name={`${keyPrefix}bufferAvailableMinutes`}
                  step="1"
                  type="number"
                />
              </label>
              <label className="field agenda-inline-field">
                <span>Bufferplassering</span>
                <select
                  defaultValue={bufferDefaults.availablePlacement}
                  disabled={disabled}
                  name={`${keyPrefix}bufferAvailablePlacement`}
                >
                  {TASK_BUFFER_PLACEMENT_OPTIONS.map((placementOption) => (
                    <option key={placementOption.value} value={placementOption.value}>
                      {placementOption.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field agenda-inline-field">
                <span>Fast mellomrom (min)</span>
                <input
                  defaultValue={String(bufferDefaults.transitionMinutes)}
                  disabled={disabled}
                  min="0"
                  name={`${keyPrefix}bufferTransitionMinutes`}
                  step="1"
                  type="number"
                />
              </label>
              <label className="field agenda-inline-field">
                <span>Navn pa bufferpunkt</span>
                <input
                  defaultValue={bufferDefaults.label}
                  disabled={disabled}
                  name={`${keyPrefix}bufferLabel`}
                />
              </label>
              <label className="field agenda-inline-field checkbox-field">
                <span>Kan kortes ned live</span>
                <span className="checkbox-inline">
                  <input
                    defaultChecked={Boolean(recoveryDefaults.canShorten)}
                    disabled={disabled}
                    name={`${keyPrefix}recoveryCanShorten`}
                    type="checkbox"
                  />
                  <span>Forsla kortere varighet ved behov</span>
                </span>
              </label>
              <label className="field agenda-inline-field">
                <span>Minimumsvarighet (min)</span>
                <input
                  defaultValue={String(recoveryDefaults.minimumDurationMinutes)}
                  disabled={disabled}
                  min="0"
                  name={`${keyPrefix}recoveryMinimumDurationMinutes`}
                  step="1"
                  type="number"
                />
              </label>
              <label className="field agenda-inline-field checkbox-field">
                <span>Kan hoppes over</span>
                <span className="checkbox-inline">
                  <input
                    defaultChecked={Boolean(recoveryDefaults.canSkip)}
                    disabled={disabled}
                    name={`${keyPrefix}recoveryCanSkip`}
                    type="checkbox"
                  />
                  <span>Kan foreslas hoppet over live</span>
                </span>
              </label>
              <label className="field agenda-inline-field">
                <span>Innhentingsprioritet</span>
                <select
                  defaultValue={recoveryDefaults.priority}
                  disabled={disabled}
                  name={`${keyPrefix}recoveryPriority`}
                >
                  {TASK_RECOVERY_PRIORITY_OPTIONS.map((priorityOption) => (
                    <option key={priorityOption.value} value={priorityOption.value}>
                      {priorityOption.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </details>
        );
      })}
    </div>
  );
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

const GUEST_PAGE_IMAGE_LAYOUT_OPTIONS = [
  { value: "fit", label: "Vis hele bildet" },
  { value: "crop", label: "Crop til utsnitt" }
];

const GUEST_PAGE_IMAGE_RATIO_OPTIONS = [
  { value: "16:9", label: "16:9 liggende" },
  { value: "4:3", label: "4:3 klassisk" },
  { value: "1:1", label: "1:1 kvadrat" },
  { value: "3:4", label: "3:4 stående" },
  { value: "21:9", label: "21:9 banner" }
];

function findGuestPageImageAtSelection(content, selectionStart) {
  const source = typeof content === "string" ? content : "";
  const cursor = Math.max(0, Math.min(Number(selectionStart) || 0, source.length));
  const lineStart = source.lastIndexOf("\n", Math.max(0, cursor - 1)) + 1;
  const nextNewlineIndex = source.indexOf("\n", cursor);
  const lineEnd = nextNewlineIndex === -1 ? source.length : nextNewlineIndex;
  const rawLine = source.slice(lineStart, lineEnd);
  const parsed = parseGuestPageImageMarkup(rawLine);

  if (!parsed) {
    return null;
  }

  return {
    ...parsed,
    lineStart,
    lineEnd,
    rawLine
  };
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

function getHospitalityMealTypeLabel(value) {
  return value === "special" ? "Spesialmat" : "Vanlig meny";
}

function buildHospitalityBriefPdfLines(event, hospitalityBriefs, focus = "combined") {
  const eventTitle = event?.overview?.title || event?.name || "Arrangement";
  const title =
    focus === "kitchen"
      ? "Kjokkenbrief"
      : focus === "service"
        ? "Serveringsbrief"
        : "Kjokkenbrief og serveringsbrief";
  const lines = [eventTitle, title, ""];
  const sharedContacts = [
    hospitalityBriefs.shared.hostContactName
      ? `Hovedkontakt: ${hospitalityBriefs.shared.hostContactName}${
          hospitalityBriefs.shared.hostContactPhone ? ` (${hospitalityBriefs.shared.hostContactPhone})` : ""
        }`
      : "",
    hospitalityBriefs.shared.venueContactName
      ? `Lokale: ${hospitalityBriefs.shared.venueContactName}${
          hospitalityBriefs.shared.venueContactPhone ? ` (${hospitalityBriefs.shared.venueContactPhone})` : ""
        }`
      : "",
    hospitalityBriefs.shared.finalHeadcountLockedAt
      ? `Låst antall: ${formatDateTime(hospitalityBriefs.shared.finalHeadcountLockedAt)}`
      : ""
  ].filter(Boolean);

  if (sharedContacts.length) {
    lines.push("Kontakter");
    sharedContacts.forEach((line) => lines.push(line));
    lines.push("");
  }

  lines.push(
    `Bekreftet: ${hospitalityBriefs.guestCounts.accepted}`,
    `Kanskje / venter: ${hospitalityBriefs.guestCounts.maybe + hospitalityBriefs.guestCounts.pending}`,
    `Bord / stasjoner: ${hospitalityBriefs.seatingSummary.tableCount}`,
    `Seter totalt: ${hospitalityBriefs.seatingSummary.seatsTotal}`,
    ""
  );

  if (focus !== "service") {
    lines.push("Kjokken");
    lines.push(
      `Ansvarlig: ${hospitalityBriefs.kitchen.leadName || "Ikke satt"}`,
      `Telefon: ${hospitalityBriefs.kitchen.leadPhone || "Ikke satt"}`,
      `Prep starter: ${
        hospitalityBriefs.kitchen.prepStartsAt
          ? formatDateTime(hospitalityBriefs.kitchen.prepStartsAt)
          : "Ikke satt"
      }`,
      `Foerste servering: ${
        hospitalityBriefs.kitchen.serviceStartsAt
          ? formatDateTime(hospitalityBriefs.kitchen.serviceStartsAt)
          : "Ikke satt"
      }`
    );
    if (hospitalityBriefs.kitchen.menuSummary) {
      lines.push(`Meny: ${hospitalityBriefs.kitchen.menuSummary}`);
    }
    if (hospitalityBriefs.kitchen.specialMenus) {
      lines.push(`Spesialmenyer: ${hospitalityBriefs.kitchen.specialMenus}`);
    }
    if (hospitalityBriefs.kitchen.productionNotes) {
      lines.push(`Produksjon: ${hospitalityBriefs.kitchen.productionNotes}`);
    }
    if (hospitalityBriefs.kitchen.equipmentNotes) {
      lines.push(`Utstyr: ${hospitalityBriefs.kitchen.equipmentNotes}`);
    }
    if (hospitalityBriefs.kitchen.deliveryNotes) {
      lines.push(`Leveranser: ${hospitalityBriefs.kitchen.deliveryNotes}`);
    }
    if (hospitalityBriefs.kitchen.fallbackPlan) {
      lines.push(`Plan B: ${hospitalityBriefs.kitchen.fallbackPlan}`);
    }
    lines.push("");
  }

  if (focus !== "kitchen") {
    lines.push("Servering");
    lines.push(
      `Ansvarlig: ${hospitalityBriefs.service.leadName || "Ikke satt"}`,
      `Telefon: ${hospitalityBriefs.service.leadPhone || "Ikke satt"}`,
      `Serveringsform: ${HOSPITALITY_SERVICE_STYLE_OPTIONS.find(
        (option) => option.value === hospitalityBriefs.service.serviceStyle
      )?.label || "Ikke satt"}`,
      `Teamstorrelse: ${hospitalityBriefs.service.teamSize || 0}`,
      `Foerste servering i salen: ${
        hospitalityBriefs.service.serviceStartsAt
          ? formatDateTime(hospitalityBriefs.service.serviceStartsAt)
          : "Ikke satt"
      }`
    );
    if (hospitalityBriefs.service.beveragePlan) {
      lines.push(`Drikkeplan: ${hospitalityBriefs.service.beveragePlan}`);
    }
    if (hospitalityBriefs.service.tablePlanNotes) {
      lines.push(`Bordflyt: ${hospitalityBriefs.service.tablePlanNotes}`);
    }
    if (hospitalityBriefs.service.clearingPlan) {
      lines.push(`Rydding: ${hospitalityBriefs.service.clearingPlan}`);
    }
    if (hospitalityBriefs.service.guestCommunicationPlan) {
      lines.push(`Kommunikasjon: ${hospitalityBriefs.service.guestCommunicationPlan}`);
    }
    if (hospitalityBriefs.service.issueEscalationPlan) {
      lines.push(`Avvik: ${hospitalityBriefs.service.issueEscalationPlan}`);
    }
    lines.push("");
  }

  lines.push("Mathensyn og plassering");
  if (hospitalityBriefs.dietaryGuests.length) {
    hospitalityBriefs.dietaryGuests.forEach((guest) => {
      lines.push(
        `${guest.name} - ${guest.placementLabel || "Ikke plassert"} - ${[
          guest.allergies,
          guest.dietaryNotes,
          guest.seatingNote
        ]
          .filter(Boolean)
          .join(" · ")}`
      );
    });
  } else {
    lines.push("Ingen registrerte allergier eller spesialmenyer.");
  }
  lines.push("");

  lines.push("Bordoversikt");
  if (hospitalityBriefs.tableRows.length) {
    hospitalityBriefs.tableRows.forEach((table) => {
      lines.push(
        `${table.label}: ${table.acceptedCount} bekreftet · ${table.standardMealCount} vanlig · ${table.specialMealCount} spesial`
      );
      table.guestRows.forEach((guest) => {
        lines.push(
          `- ${guest.seatLabel || "Plass"} ${guest.name} (${getRsvpLabel(guest.rsvpStatus)}, ${getHospitalityMealTypeLabel(
            guest.mealType
          )}${[guest.allergies, guest.dietaryNotes, guest.seatingNote].filter(Boolean).length ? `, ${[
            guest.allergies,
            guest.dietaryNotes,
            guest.seatingNote
          ]
            .filter(Boolean)
            .join(" · ")}` : ""})`
        );
      });
    });
  } else {
    lines.push("Ingen bord eller plasseringer er lagt inn enda.");
  }
  lines.push("");

  if (focus !== "kitchen") {
    lines.push("Servicekjoreplan");
    if (hospitalityBriefs.serviceTimeline.length) {
      hospitalityBriefs.serviceTimeline.forEach((item) => {
        lines.push(
          `${item.startAt ? formatClockTime(item.startAt) : "--:--"} - ${item.endAt ? formatClockTime(item.endAt) : "--:--"} ${item.title}${
            item.isGeneratedBuffer
              ? " (systembuffer)"
              : item.agendaComment
                ? ` - ${item.agendaComment}`
                : ""
          }`
        );
      });
    } else {
      lines.push("Ingen planlagte agendaelementer enda.");
    }
  }

  return lines;
}

function HospitalityTableOverview({ tableRows }) {
  if (!tableRows.length) {
    return <p className="muted">Ingen bord eller plasseringer er lagt inn enda.</p>;
  }

  return (
    <div className="hospitality-table-grid">
      {tableRows.map((table) => (
        <article className="panel stack nested-panel hospitality-table-card" key={`hospitality-table-${table.id}`}>
          <div className="panel-header-inline">
            <div>
              <h4>{table.label}</h4>
              <p className="muted">
                {table.acceptedCount} bekreftet · {table.standardMealCount} vanlig · {table.specialMealCount} spesial
              </p>
            </div>
            <div className="project-chip-row">
              <span className="data-tag">{table.assignedCount} plassert</span>
              {table.pendingCount || table.maybeCount ? (
                <span className="data-tag warning-tag">
                  {table.maybeCount + table.pendingCount} avventer
                </span>
              ) : null}
            </div>
          </div>
          {table.guestRows.length ? (
            <ul className="compact-list hospitality-seat-list">
              {table.guestRows.map((guest) => (
                <li key={guest.id}>
                  <div className="compact-list-main">
                    <strong>{guest.name}</strong>
                    <small className="muted">
                      {guest.seatLabel || "Plassering uten etikett"} · {getRsvpLabel(guest.rsvpStatus)}
                      {guest.mealType === "special"
                        ? ` · ${[guest.allergies, guest.dietaryNotes].filter(Boolean).join(" · ")}`
                        : ""}
                      {guest.seatingNote ? ` · ${guest.seatingNote}` : ""}
                    </small>
                  </div>
                  <span className={`data-tag ${guest.mealType === "special" ? "warning-tag" : ""}`}>
                    {getHospitalityMealTypeLabel(guest.mealType)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Ingen gjester er plassert ved dette bordet enda.</p>
          )}
        </article>
      ))}
    </div>
  );
}

function HospitalityFocusedView({ event, hospitalityBriefs, focus }) {
  const isKitchen = focus === "kitchen";

  return (
    <div className="stack hospitality-focused-view">
      <section className="panel stack nested-panel">
        <div className="panel-header-inline">
          <div>
            <h3>{isKitchen ? "Kjokkenvisning" : "Serveringsvisning"}</h3>
            <p className="muted">
              {isKitchen
                ? "Fokusert oversikt for kokk og kjokkenansvarlig."
                : "Fokusert oversikt for hovmester og serveringspersonell."}
            </p>
          </div>
          <div className="project-chip-row">
            <span className="role-pill">{hospitalityBriefs.guestCounts.accepted} bekreftet</span>
            <span className="data-tag">
              {hospitalityBriefs.dietaryGuests.length} med spesialmat
            </span>
          </div>
        </div>
        <div className="overview-grid">
          <InfoCard label="Kommer" value={hospitalityBriefs.guestCounts.accepted} tone="success" />
          <InfoCard label="Spesialmat" value={hospitalityBriefs.dietaryGuests.length} tone={hospitalityBriefs.dietaryGuests.length ? "warning" : "success"} />
          <InfoCard label="Bord" value={hospitalityBriefs.seatingSummary.tableCount} />
          <InfoCard label="Plasserte seter" value={hospitalityBriefs.seatingSummary.assignedSeats} />
        </div>
      </section>

      <section className="panel stack nested-panel">
        <h4>{isKitchen ? "Kontakt og produksjon" : "Kontakt og serviceflyt"}</h4>
        <ul className="compact-list hospitality-summary-list">
          <li>
            <strong>Hovedkontakt:</strong>{" "}
            {hospitalityBriefs.shared.hostContactName || "Ikke satt"}
            {hospitalityBriefs.shared.hostContactPhone ? ` · ${hospitalityBriefs.shared.hostContactPhone}` : ""}
          </li>
          <li>
            <strong>Lokale:</strong>{" "}
            {hospitalityBriefs.shared.venueContactName || "Ikke satt"}
            {hospitalityBriefs.shared.venueContactPhone ? ` · ${hospitalityBriefs.shared.venueContactPhone}` : ""}
          </li>
          {isKitchen ? (
            <>
              <li>
                <strong>Kjokkenansvarlig:</strong>{" "}
                {hospitalityBriefs.kitchen.leadName || "Ikke satt"}
                {hospitalityBriefs.kitchen.leadPhone ? ` · ${hospitalityBriefs.kitchen.leadPhone}` : ""}
              </li>
              <li>
                <strong>Prep starter:</strong>{" "}
                {hospitalityBriefs.kitchen.prepStartsAt
                  ? formatDateTime(hospitalityBriefs.kitchen.prepStartsAt)
                  : "Ikke satt"}
              </li>
              <li>
                <strong>Foerste servering:</strong>{" "}
                {hospitalityBriefs.kitchen.serviceStartsAt
                  ? formatDateTime(hospitalityBriefs.kitchen.serviceStartsAt)
                  : "Ikke satt"}
              </li>
            </>
          ) : (
            <>
              <li>
                <strong>Serviceansvarlig:</strong>{" "}
                {hospitalityBriefs.service.leadName || "Ikke satt"}
                {hospitalityBriefs.service.leadPhone ? ` · ${hospitalityBriefs.service.leadPhone}` : ""}
              </li>
              <li>
                <strong>Serveringsform:</strong>{" "}
                {HOSPITALITY_SERVICE_STYLE_OPTIONS.find(
                  (option) => option.value === hospitalityBriefs.service.serviceStyle
                )?.label || "Ikke satt"}
              </li>
              <li>
                <strong>Foerste servering i salen:</strong>{" "}
                {hospitalityBriefs.service.serviceStartsAt
                  ? formatDateTime(hospitalityBriefs.service.serviceStartsAt)
                  : "Ikke satt"}
              </li>
            </>
          )}
        </ul>
        {isKitchen ? (
          <div className="stack compact-stack">
            {hospitalityBriefs.kitchen.menuSummary ? (
              <p>
                <strong>Meny:</strong> {hospitalityBriefs.kitchen.menuSummary}
              </p>
            ) : null}
            {hospitalityBriefs.kitchen.specialMenus ? (
              <p>
                <strong>Spesialmenyer:</strong> {hospitalityBriefs.kitchen.specialMenus}
              </p>
            ) : null}
            {hospitalityBriefs.kitchen.productionNotes ? (
              <p>
                <strong>Produksjon:</strong> {hospitalityBriefs.kitchen.productionNotes}
              </p>
            ) : null}
            {hospitalityBriefs.kitchen.deliveryNotes ? (
              <p>
                <strong>Leveranser:</strong> {hospitalityBriefs.kitchen.deliveryNotes}
              </p>
            ) : null}
            {hospitalityBriefs.kitchen.equipmentNotes ? (
              <p>
                <strong>Utstyr:</strong> {hospitalityBriefs.kitchen.equipmentNotes}
              </p>
            ) : null}
            {hospitalityBriefs.kitchen.fallbackPlan ? (
              <p>
                <strong>Plan B:</strong> {hospitalityBriefs.kitchen.fallbackPlan}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="stack compact-stack">
            {hospitalityBriefs.service.beveragePlan ? (
              <p>
                <strong>Drikkeplan:</strong> {hospitalityBriefs.service.beveragePlan}
              </p>
            ) : null}
            {hospitalityBriefs.service.tablePlanNotes ? (
              <p>
                <strong>Bordflyt:</strong> {hospitalityBriefs.service.tablePlanNotes}
              </p>
            ) : null}
            {hospitalityBriefs.service.clearingPlan ? (
              <p>
                <strong>Rydding:</strong> {hospitalityBriefs.service.clearingPlan}
              </p>
            ) : null}
            {hospitalityBriefs.service.guestCommunicationPlan ? (
              <p>
                <strong>Kommunikasjon:</strong> {hospitalityBriefs.service.guestCommunicationPlan}
              </p>
            ) : null}
            {hospitalityBriefs.service.issueEscalationPlan ? (
              <p>
                <strong>Avvik:</strong> {hospitalityBriefs.service.issueEscalationPlan}
              </p>
            ) : null}
          </div>
        )}
      </section>

      <section className="panel stack nested-panel">
        <div className="panel-header-inline">
          <div>
            <h4>
              {isKitchen ? "Mathensyn med bord og plassering" : "Bordoversikt og plasseringer"}
            </h4>
            <p className="muted">
              {isKitchen
                ? "Hvem som skal ha spesialmat, og hvor de sitter i rommet."
                : "Bekreftede, vanlig/spesialmat og hvem som sitter hvor."}
            </p>
          </div>
        </div>
        {isKitchen ? (
          hospitalityBriefs.dietaryGuests.length ? (
            <ul className="compact-list hospitality-inline-list">
              {hospitalityBriefs.dietaryGuests.map((guest) => (
                <li key={`hospitality-dietary-${guest.id}`}>
                  <div className="compact-list-main">
                    <strong>{guest.name}</strong>
                    <small className="muted">
                      {guest.placementLabel || "Ikke plassert"} ·{" "}
                      {[guest.allergies, guest.dietaryNotes, guest.seatingNote]
                        .filter(Boolean)
                        .join(" · ") || "Registrert uten detalj"}
                    </small>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Ingen spesialmat registrert enda.</p>
          )
        ) : (
          <HospitalityTableOverview tableRows={hospitalityBriefs.tableRows} />
        )}
      </section>

      {!isKitchen ? (
        <section className="panel stack nested-panel">
          <div className="panel-header-inline">
            <div>
              <h4>Servicekjoreplan</h4>
              <p className="muted">Tidsbildet servering skal jobbe etter gjennom kvelden.</p>
            </div>
          </div>
          {hospitalityBriefs.serviceTimeline.length ? (
            <ul className="compact-list hospitality-inline-list">
              {hospitalityBriefs.serviceTimeline.map((item) => (
                <li key={`hospitality-service-${item.id}`}>
                  <div className="compact-list-main">
                    <strong>
                      {item.startAt ? formatClockTime(item.startAt) : "--:--"} {item.title}
                    </strong>
                    <small className="muted">
                      {item.isGeneratedBuffer
                        ? "Systembuffer"
                        : [item.agendaComment, getTaskCategoryLabel(item.category)].filter(Boolean).join(" · ")}
                    </small>
                  </div>
                  <strong>{item.endAt ? formatClockTime(item.endAt) : "--:--"}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Ingen planlagte agendaelementer enda.</p>
          )}
        </section>
      ) : null}
    </div>
  );
}

function buildGuestSiteBackgroundStyle(backgroundImageUrl) {
  if (!backgroundImageUrl) {
    return {
      pageLayerStyle: undefined,
      shellStyle: undefined
    };
  }

  return {
    pageLayerStyle: {
      backgroundImage: `linear-gradient(180deg, rgba(255, 252, 247, 0.76), rgba(255, 248, 238, 0.9)), url(${backgroundImageUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      borderRadius: "32px"
    },
    shellStyle: {
      backgroundImage: `linear-gradient(180deg, rgba(255, 252, 247, 0.76), rgba(255, 248, 238, 0.9)), url(${backgroundImageUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      padding: "18px",
      borderRadius: "32px"
    }
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

function buildPersonSearchIndex(person, eventRoles) {
  return [
    person.name,
    person.email,
    person.phone,
    person.note,
    person.allergies,
    person.dietaryNotes,
    person.seatingNote,
    buildPersonRoleSummary(person, eventRoles),
    getRsvpLabel(person.rsvpStatus)
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

const GUEST_LIST_FILTER_OPTIONS = [
  { value: "all", label: "Alle" },
  { value: "pending", label: "Ikke svart" },
  { value: "accepted", label: "Kommer" },
  { value: "maybe", label: "Kanskje" },
  { value: "declined", label: "Kommer ikke" },
  { value: "allergies", label: "Har allergier" },
  { value: "dietary", label: "Har matpreferanser" },
  { value: "seating", label: "Har sitteinfo" }
];

function matchGuestListFilter(person, filterValue) {
  if (filterValue === "all") {
    return true;
  }

  if (["pending", "accepted", "maybe", "declined"].includes(filterValue)) {
    return (person.rsvpStatus || "pending") === filterValue;
  }

  if (filterValue === "allergies") {
    return Boolean(String(person.allergies || "").trim());
  }

  if (filterValue === "dietary") {
    return Boolean(String(person.dietaryNotes || "").trim());
  }

  if (filterValue === "seating") {
    return Boolean(String(person.seatingNote || "").trim());
  }

  return true;
}

function matchImportedPerson(existingPeople, incomingPerson) {
  const incomingEmail = String(incomingPerson?.email || "").trim().toLowerCase();
  const incomingPhone = String(incomingPerson?.phone || "").replace(/\s+/g, "");
  const incomingName = String(incomingPerson?.name || "").trim().toLowerCase();
  const people = Array.isArray(existingPeople) ? existingPeople : [];

  if (incomingEmail) {
    const match = people.find(
      (person) => String(person?.email || "").trim().toLowerCase() === incomingEmail
    );

    if (match) {
      return match;
    }
  }

  if (incomingPhone) {
    const match = people.find(
      (person) => String(person?.phone || "").replace(/\s+/g, "") === incomingPhone
    );

    if (match) {
      return match;
    }
  }

  if (incomingName) {
    return (
      people.find(
        (person) => String(person?.name || "").trim().toLowerCase() === incomingName
      ) || null
    );
  }

  return null;
}

function createBulkGuestRow() {
  return {
    id: `bulk-${Math.random().toString(36).slice(2, 10)}`,
    name: "",
    email: "",
    phone: "",
    rsvpStatus: "pending",
    note: "",
    allergies: "",
    dietaryNotes: "",
    seatingNote: ""
  };
}

function createBulkGuestRows(count = 5) {
  return Array.from({ length: count }, () => createBulkGuestRow());
}

function downloadTextFile(filename, content, mimeType = "text/csv;charset=utf-8;") {
  if (typeof window === "undefined") {
    return;
  }

  const blob = new Blob([content], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

function downloadBlobFile(filename, content, mimeType) {
  if (typeof window === "undefined") {
    return;
  }

  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

function wrapPdfLine(line, font, fontSize, maxWidth) {
  const source = String(line || "");

  if (!source) {
    return [""];
  }

  const words = source.split(/\s+/);
  const lines = [];
  let currentLine = "";

  words.forEach((word) => {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    const candidateWidth = font.widthOfTextAtSize(candidate, fontSize);

    if (candidateWidth <= maxWidth || !currentLine) {
      currentLine = candidate;
      return;
    }

    lines.push(currentLine);
    currentLine = word;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length ? lines : [source];
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
  onUpdateGuestSite,
  onSaveVenuePlan,
  onAddGuestPage,
  onUpdateGuestPage,
  onDeleteGuestPage,
  onAddRole,
  onUpdateRole,
  onAddPerson,
  onUpdatePerson,
  onBulkUpsertPeople
}) {
  const templateList = templateOptions();
  const rawNavigationEntries = useMemo(() => buildGuestSiteNavigationEntries(event), [event]);
  const [guestSiteNavigationOrderDraft, setGuestSiteNavigationOrderDraft] = useState(() =>
    Array.isArray(event.guestSite?.navigationOrder) && event.guestSite.navigationOrder.length
      ? event.guestSite.navigationOrder
      : rawNavigationEntries.map((page) => page.id)
  );
  const navigationEntries = useMemo(
    () => sortGuestSiteNavigationEntries(rawNavigationEntries, guestSiteNavigationOrderDraft),
    [guestSiteNavigationOrderDraft, rawNavigationEntries]
  );
  const visiblePages = useMemo(() => {
    return navigationEntries.filter((page) =>
      page.kind === "venue_seating" || page.kind === "guest_agenda"
        ? true
        : canViewerSeeGuestPage(page, viewerAccess, viewerPerson)
    );
  }, [navigationEntries, viewerAccess, viewerPerson]);
  const [selectedPageId, setSelectedPageId] = useState(visiblePages[0]?.id || "");
  const [draftPage, setDraftPage] = useState(null);
  const [mediaStatus, setMediaStatus] = useState("");
  const [inlineStyleStatus, setInlineStyleStatus] = useState("");
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [guestSiteOrigin, setGuestSiteOrigin] = useState("");
  const [guestSiteIntroDraft, setGuestSiteIntroDraft] = useState("");
  const [guestSiteNavigationLabelDraft, setGuestSiteNavigationLabelDraft] = useState("Navigasjon");
  const [guestSiteBackgroundImageUrlDraft, setGuestSiteBackgroundImageUrlDraft] = useState("");
  const [guestSiteBackgroundModeDraft, setGuestSiteBackgroundModeDraft] = useState("shell");
  const [guestSiteBackgroundStatus, setGuestSiteBackgroundStatus] = useState("");
  const [isUploadingGuestSiteBackground, setIsUploadingGuestSiteBackground] = useState(false);
  const [openRoleId, setOpenRoleId] = useState("");
  const [openPersonId, setOpenPersonId] = useState("");
  const [personSearch, setPersonSearch] = useState("");
  const [personFilter, setPersonFilter] = useState("all");
  const [guestModal, setGuestModal] = useState("");
  const [bulkGuestRows, setBulkGuestRows] = useState(() => createBulkGuestRows());
  const [bulkTemplateKey, setBulkTemplateKey] = useState("guest");
  const [exportFieldKeys, setExportFieldKeys] = useState(DEFAULT_GUEST_EXPORT_FIELDS);
  const [guestExportFormat, setGuestExportFormat] = useState("csv");
  const [importPreview, setImportPreview] = useState(null);
  const [guestToolStatus, setGuestToolStatus] = useState("");
  const [guestWorkspaceView, setGuestWorkspaceView] = useState("info_pages");
  const [draggedGuestNavId, setDraggedGuestNavId] = useState("");
  const [guestNavDropIndicator, setGuestNavDropIndicator] = useState(null);
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
  const isGuestAgendaPage = selectedPage?.kind === "guest_agenda";
  const isGeneratedGuestPage = isVenueSeatingPage || isGuestAgendaPage;
  const editablePage = !isGeneratedGuestPage ? selectedPage : null;
  const previewPage =
    viewerAccess.canManageGuest && draftPage && editablePage ? { ...editablePage, ...draftPage } : editablePage;
  const activeGuestImage = useMemo(
    () => findGuestPageImageAtSelection(draftPage?.content || "", textSelection.start),
    [draftPage?.content, textSelection.start]
  );
  const guestSiteBasePath = useMemo(() => buildGuestSiteBasePath(event), [event]);
  const guestSiteBaseUrl = guestSiteOrigin ? `${guestSiteOrigin}${guestSiteBasePath}` : guestSiteBasePath;
  const guestSiteBackgroundStyles = useMemo(
    () => buildGuestSiteBackgroundStyle(guestSiteBackgroundImageUrlDraft),
    [guestSiteBackgroundImageUrlDraft]
  );
  const guestSitePageLayerStyle =
    guestSiteBackgroundModeDraft === "page" ? guestSiteBackgroundStyles.pageLayerStyle : undefined;
  const guestSiteShellStyle =
    guestSiteBackgroundModeDraft === "shell" ? guestSiteBackgroundStyles.shellStyle : undefined;
  const guestPageLinks = useMemo(
    () =>
      navigationEntries.map((page) => ({
        ...page,
        url: guestSiteOrigin ? `${guestSiteOrigin}${page.path}` : page.path
      })),
    [guestSiteOrigin, navigationEntries]
  );
  const filteredPeople = useMemo(() => {
    const query = personSearch.trim().toLowerCase();

    return event.people.filter((person) => {
      if (!matchGuestListFilter(person, personFilter)) {
        return false;
      }

      if (!query) {
        return true;
      }

      return buildPersonSearchIndex(person, event.roles).includes(query);
    });
  }, [event.people, event.roles, personFilter, personSearch]);

  useEffect(() => {
    if (!visiblePages.some((page) => page.id === selectedPageId)) {
      setSelectedPageId(visiblePages[0]?.id || "");
    }
  }, [selectedPageId, visiblePages]);

  useEffect(() => {
    const nextOrder =
      Array.isArray(event.guestSite?.navigationOrder) && event.guestSite.navigationOrder.length
        ? event.guestSite.navigationOrder
        : rawNavigationEntries.map((page) => page.id);
    setGuestSiteNavigationOrderDraft(nextOrder);
    setDraggedGuestNavId("");
    setGuestNavDropIndicator(null);
  }, [event.guestSite?.navigationOrder, event.id, event.updated_at, rawNavigationEntries]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setGuestSiteOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    setGuestSiteIntroDraft(event.guestSite?.introText || "");
    setGuestSiteNavigationLabelDraft(event.guestSite?.navigationLabel || "Navigasjon");
    setGuestSiteBackgroundImageUrlDraft(event.guestSite?.backgroundImageUrl || "");
    setGuestSiteBackgroundModeDraft(event.guestSite?.backgroundMode || "shell");
    setGuestSiteBackgroundStatus("");
  }, [event.id, event.updated_at]);

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

  function updateActiveGuestImage(changes) {
    const currentContent = draftPage?.content || "";

    if (!activeGuestImage) {
      setMediaStatus("Sett markøren på en bildelinje først for å endre utsnitt eller visning.");
      return;
    }

    const nextImage = {
      ...activeGuestImage,
      ...changes
    };

    if (nextImage.displayMode !== "crop") {
      nextImage.displayMode = "fit";
    }

    if (nextImage.displayMode === "crop" && !nextImage.cropRatio) {
      nextImage.cropRatio = "16:9";
    }

    const nextMarkup = buildGuestPageImageMarkup(nextImage);

    if (!nextMarkup) {
      setMediaStatus("Kunne ikke oppdatere bildet med de valgte innstillingene.");
      return;
    }

    const nextContent = `${currentContent.slice(0, activeGuestImage.lineStart)}${nextMarkup}${currentContent.slice(activeGuestImage.lineEnd)}`;
    replaceGuestPageTextSelection(
      nextContent,
      activeGuestImage.lineStart,
      activeGuestImage.lineStart + nextMarkup.length
    );
    setMediaStatus(
      nextImage.displayMode === "crop"
        ? "Bildet er oppdatert med nytt utsnitt. Lagre siden for å publisere endringen."
        : "Bildet er satt til å vise hele motivet. Lagre siden for å publisere endringen."
    );
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
    const input = eventObject.currentTarget;
    const file = input.files?.[0];

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
      const trimmedContent = currentContent.replace(/\s*$/, "");
      const prefix = trimmedContent ? `${trimmedContent}\n\n` : "";
      const nextContent = `${prefix}${body.markdown}`;
      const imageStart = prefix.length;
      const imageEnd = imageStart + body.markdown.length;

      replaceGuestPageTextSelection(nextContent, imageStart, imageEnd);
      setMediaStatus(
        "Bildet er satt inn i innholdet. Sett markøren på bildelinjen hvis du vil justere utsnittet, og lagre siden etterpå."
      );
    } catch (error) {
      setMediaStatus(error instanceof Error ? error.message : "Kunne ikke laste opp bildet.");
    } finally {
      if (input) {
        input.value = "";
      }
      setIsUploadingMedia(false);
    }
  }

  async function handleSaveGuestSiteIntro() {
    if (!viewerAccess.canManageGuest || typeof onUpdateGuestSite !== "function") {
      return null;
    }

    const nextEvent = await onUpdateGuestSite(
      {
        introText: guestSiteIntroDraft,
        navigationLabel: guestSiteNavigationLabelDraft,
        backgroundImageUrl: guestSiteBackgroundImageUrlDraft,
        backgroundMode: guestSiteBackgroundModeDraft
      },
      "Gjestenettsiden ble oppdatert."
    );

    if (nextEvent) {
      setGuestSiteIntroDraft(nextEvent.guestSite?.introText || "");
      setGuestSiteNavigationLabelDraft(nextEvent.guestSite?.navigationLabel || "Navigasjon");
      setGuestSiteBackgroundImageUrlDraft(nextEvent.guestSite?.backgroundImageUrl || "");
      setGuestSiteBackgroundModeDraft(nextEvent.guestSite?.backgroundMode || "shell");
    }

    return nextEvent;
  }

  async function persistGuestSiteBackground(nextBackgroundImageUrl, successMessage) {
    if (!viewerAccess.canManageGuest || typeof onUpdateGuestSite !== "function") {
      return null;
    }

    const nextEvent = await onUpdateGuestSite(
      {
        introText: guestSiteIntroDraft,
        navigationLabel: guestSiteNavigationLabelDraft,
        backgroundImageUrl: nextBackgroundImageUrl,
        backgroundMode: guestSiteBackgroundModeDraft
      },
      successMessage
    );

    if (nextEvent) {
      setGuestSiteIntroDraft(nextEvent.guestSite?.introText || "");
      setGuestSiteNavigationLabelDraft(nextEvent.guestSite?.navigationLabel || "Navigasjon");
      setGuestSiteBackgroundImageUrlDraft(nextEvent.guestSite?.backgroundImageUrl || "");
      setGuestSiteBackgroundModeDraft(nextEvent.guestSite?.backgroundMode || "shell");
    }

    return nextEvent;
  }

  async function handleGuestSiteBackgroundUpload(eventObject) {
    const input = eventObject.currentTarget;
    const file = input.files?.[0];

    if (!file || !viewerAccess.canManageGuest) {
      return;
    }

    setIsUploadingGuestSiteBackground(true);
    setGuestSiteBackgroundStatus("");
    const previousBackgroundImageUrl = event.guestSite?.backgroundImageUrl || "";

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
      const nextEvent = await persistGuestSiteBackground(
        body.url,
        "Bakgrunnsbildet ble publisert på gjestenettsiden."
      );

      if (nextEvent) {
        const persistedBackgroundImageUrl = nextEvent.guestSite?.backgroundImageUrl || "";

        if (persistedBackgroundImageUrl === body.url) {
          setGuestSiteBackgroundStatus("Bakgrunnsbildet er lagret og publisert.");
        } else {
          setGuestSiteBackgroundImageUrlDraft(persistedBackgroundImageUrl);
          setGuestSiteBackgroundStatus(
            "Bakgrunnsbildet ble lastet opp, men ble ikke publisert på gjestenettsiden. Prøv å lagre på nytt."
          );
        }
      } else {
        setGuestSiteBackgroundImageUrlDraft(previousBackgroundImageUrl);
        setGuestSiteBackgroundStatus(
          "Bakgrunnsbildet er valgt lokalt, men kunne ikke publiseres. Prøv å lagre gjestenettsiden på nytt."
        );
      }
    } catch (error) {
      setGuestSiteBackgroundStatus(
        error instanceof Error ? error.message : "Kunne ikke laste opp bakgrunnsbildet."
      );
    } finally {
      if (input) {
        input.value = "";
      }
      setIsUploadingGuestSiteBackground(false);
    }
  }

  function handleRemoveGuestSiteBackgroundImage() {
    if (!viewerAccess.canManageGuest) {
      return;
    }

    setGuestSiteBackgroundImageUrlDraft("");
    setGuestSiteBackgroundStatus("Fjerner bakgrunnsbildet…");
    void persistGuestSiteBackground("", "Bakgrunnsbildet ble fjernet fra gjestenettsiden.")
      .then((nextEvent) => {
        if (nextEvent) {
          const persistedBackgroundImageUrl = nextEvent.guestSite?.backgroundImageUrl || "";
          setGuestSiteBackgroundImageUrlDraft(persistedBackgroundImageUrl);
          setGuestSiteBackgroundStatus(
            persistedBackgroundImageUrl
              ? "Bakgrunnsbildet ble ikke fjernet fra gjestenettsiden. Prøv igjen."
              : "Bakgrunnsbildet er fjernet."
          );
          return;
        }

        setGuestSiteBackgroundImageUrlDraft(event.guestSite?.backgroundImageUrl || "");
        setGuestSiteBackgroundStatus("Kunne ikke fjerne bakgrunnsbildet akkurat nå.");
      });
  }

  async function persistGuestNavigationOrder(nextOrder) {
    if (!viewerAccess.canManageGuest || typeof onUpdateGuestSite !== "function") {
      return;
    }

    const previousOrder = guestSiteNavigationOrderDraft;
    setGuestSiteNavigationOrderDraft(nextOrder);
    const nextEvent = await onUpdateGuestSite(
      {
        navigationOrder: nextOrder
      },
      "Rekkefølgen på gjestenavigasjonen ble oppdatert."
    );

    if (!nextEvent) {
      setGuestSiteNavigationOrderDraft(previousOrder);
      return;
    }

    const persistedOrder =
      Array.isArray(nextEvent.guestSite?.navigationOrder) && nextEvent.guestSite.navigationOrder.length
        ? nextEvent.guestSite.navigationOrder
        : nextOrder;
    setGuestSiteNavigationOrderDraft(persistedOrder);
  }

  async function handleSaveGuestSeatingPageSettings(formEvent) {
    formEvent.preventDefault();

    if (!viewerAccess.canManageGuest || typeof onSaveVenuePlan !== "function") {
      return;
    }

    const formData = new FormData(formEvent.currentTarget);
    const currentVenuePlan =
      event.venuePlan && typeof event.venuePlan === "object" ? event.venuePlan : {};
    const currentGuestSeatingPage =
      currentVenuePlan.guestSeatingPage && typeof currentVenuePlan.guestSeatingPage === "object"
        ? currentVenuePlan.guestSeatingPage
        : {};
    const visibleTypes = VENUE_ITEM_LIBRARY.reduce((accumulator, entry) => {
      accumulator[entry.type] = formData.get(`visibleType:${entry.type}`) === "on";
      return accumulator;
    }, {});

    await onSaveVenuePlan(
      {
        ...currentVenuePlan,
        guestSeatingPage: {
          ...currentGuestSeatingPage,
          showItemLabels: formData.get("showItemLabels") === "on",
          showSeatLabels: formData.get("showSeatLabels") === "on",
          guestNameDisplay:
            String(
              formData.get("guestNameDisplay") ||
                currentGuestSeatingPage.guestNameDisplay ||
                "initials"
            ).trim() || "initials",
          visibleTypes
        }
      },
      "Visningen av sitteplanen på gjestenettsiden ble oppdatert."
    );
  }

  function buildGuestNavigationOrderMove(sourceId, targetId, position = "before") {
    if (!sourceId || !targetId || sourceId === targetId) {
      return null;
    }

    const currentOrder = navigationEntries.map((page) => page.id);
    const sourceIndex = currentOrder.indexOf(sourceId);
    const targetIndex = currentOrder.indexOf(targetId);

    if (sourceIndex === -1 || targetIndex === -1) {
      return null;
    }

    const nextOrder = [...currentOrder];
    nextOrder.splice(sourceIndex, 1);
    const adjustedTargetIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
    const insertIndex = position === "after" ? adjustedTargetIndex + 1 : adjustedTargetIndex;
    nextOrder.splice(insertIndex, 0, sourceId);

    return nextOrder.every((value, index) => value === currentOrder[index]) ? null : nextOrder;
  }

  async function handleMoveGuestNavigation(pageId, direction) {
    if (!viewerAccess.canManageGuest) {
      return;
    }

    const currentOrder = navigationEntries.map((page) => page.id);
    const currentIndex = currentOrder.indexOf(pageId);
    const nextIndex = currentIndex + direction;

    if (currentIndex === -1 || nextIndex < 0 || nextIndex >= currentOrder.length) {
      return;
    }

    const targetId = currentOrder[nextIndex];
    const nextOrder = buildGuestNavigationOrderMove(
      pageId,
      targetId,
      direction > 0 ? "after" : "before"
    );

    if (nextOrder) {
      await persistGuestNavigationOrder(nextOrder);
    }
  }

  function handleGuestNavigationDragStart(pageId, eventObject) {
    if (!viewerAccess.canManageGuest) {
      return;
    }

    setDraggedGuestNavId(pageId);
    setGuestNavDropIndicator(null);
    eventObject.dataTransfer.effectAllowed = "move";
    eventObject.dataTransfer.setData("text/plain", pageId);
  }

  function handleGuestNavigationDragOver(pageId, eventObject) {
    if (!viewerAccess.canManageGuest) {
      return;
    }

    const sourceId = draggedGuestNavId || eventObject.dataTransfer.getData("text/plain");

    if (!sourceId || sourceId === pageId) {
      return;
    }

    eventObject.preventDefault();
    eventObject.dataTransfer.dropEffect = "move";

    const bounds = eventObject.currentTarget.getBoundingClientRect();
    const nextPosition =
      eventObject.clientY - bounds.top > bounds.height / 2 ? "after" : "before";

    setGuestNavDropIndicator({ pageId, position: nextPosition });
  }

  async function handleGuestNavigationDrop(pageId, eventObject) {
    if (!viewerAccess.canManageGuest) {
      return;
    }

    eventObject.preventDefault();
    const sourceId = draggedGuestNavId || eventObject.dataTransfer.getData("text/plain");
    const dropPosition =
      guestNavDropIndicator?.pageId === pageId ? guestNavDropIndicator.position : "before";
    const nextOrder = buildGuestNavigationOrderMove(sourceId, pageId, dropPosition);

    setDraggedGuestNavId("");
    setGuestNavDropIndicator(null);

    if (nextOrder) {
      await persistGuestNavigationOrder(nextOrder);
    }
  }

  function handleGuestNavigationDragEnd() {
    setDraggedGuestNavId("");
    setGuestNavDropIndicator(null);
  }

  function handleOpenGuestModal(nextModal) {
    setGuestToolStatus("");
    setGuestModal(nextModal);
  }

  function handleCloseGuestModal() {
    setGuestToolStatus("");
    setImportPreview(null);
    setGuestModal("");
  }

  function handleBulkGuestRowChange(rowId, key, value) {
    setBulkGuestRows((currentRows) =>
      currentRows.map((row) => (row.id === rowId ? { ...row, [key]: value } : row))
    );
  }

  function handleAddBulkGuestRow() {
    setBulkGuestRows((currentRows) => [...currentRows, createBulkGuestRow()]);
  }

  function handleRemoveBulkGuestRow(rowId) {
    setBulkGuestRows((currentRows) =>
      currentRows.length > 1 ? currentRows.filter((row) => row.id !== rowId) : currentRows
    );
  }

  async function handleSubmitBulkGuests(formEvent) {
    formEvent.preventDefault();

    if (!viewerAccess.canManageGuest || typeof onBulkUpsertPeople !== "function") {
      return;
    }

    const template = applyTemplate(bulkTemplateKey);
    const templateRoleId = event.roles.find((role) => role.key === bulkTemplateKey)?.id || "";
    const payloadPeople = bulkGuestRows
      .map((row) => ({
        name: String(row.name || "").trim(),
        email: String(row.email || "").trim(),
        phone: String(row.phone || "").trim(),
        rsvpStatus: String(row.rsvpStatus || "pending"),
        note: String(row.note || "").trim(),
        allergies: String(row.allergies || "").trim(),
        dietaryNotes: String(row.dietaryNotes || "").trim(),
        seatingNote: String(row.seatingNote || "").trim(),
        planningRole: template.planningRole,
        projectRole: template.projectRole,
        financeRole: template.financeRole,
        roleIds: templateRoleId ? [templateRoleId] : [],
        capabilities: template.capabilities
      }))
      .filter((person) => person.name);

    if (payloadPeople.length === 0) {
      setGuestToolStatus("Legg inn minst én person før du lagrer.");
      return;
    }

    const nextEvent = await onBulkUpsertPeople(payloadPeople);

    if (nextEvent) {
      setBulkGuestRows(createBulkGuestRows());
      setGuestModal("");
      setGuestToolStatus("");
    }
  }

  async function handleDownloadGuestTemplate(format = "csv") {
    try {
      if (format === "xlsx") {
        const XLSX = await import("xlsx");
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet(buildGuestImportTemplateTable());
        XLSX.utils.book_append_sheet(workbook, worksheet, "Gjesteliste-mal");
        const workbookBytes = XLSX.write(workbook, {
          bookType: "xlsx",
          type: "array"
        });
        downloadBlobFile(
          buildGuestTemplateFilename("xlsx"),
          workbookBytes,
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        setGuestToolStatus("Malen er lastet ned som Excel.");
        return;
      }

      downloadTextFile(buildGuestTemplateFilename("csv"), buildGuestImportTemplateCsv());
      setGuestToolStatus("Malen er lastet ned som CSV.");
    } catch (error) {
      setGuestToolStatus(error instanceof Error ? error.message : "Kunne ikke lage malen akkurat nå.");
    }
  }

  async function handleDownloadGuestExport() {
    const safeFieldKeys = exportFieldKeys.length ? exportFieldKeys : DEFAULT_GUEST_EXPORT_FIELDS;

    try {
      if (guestExportFormat === "xlsx") {
        const XLSX = await import("xlsx");
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet(
          buildGuestExportTable(event.people, event.roles, safeFieldKeys)
        );
        XLSX.utils.book_append_sheet(workbook, worksheet, "Gjesteliste");
        const workbookBytes = XLSX.write(workbook, {
          bookType: "xlsx",
          type: "array"
        });
        downloadBlobFile(
          buildGuestExportFilename("xlsx"),
          workbookBytes,
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        setGuestToolStatus("Gjestelisten er eksportert som Excel.");
        return;
      }

      if (guestExportFormat === "pdf") {
        const { PDFDocument, StandardFonts } = await import("pdf-lib");
        const pdfDocument = await PDFDocument.create();
        const regularFont = await pdfDocument.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdfDocument.embedFont(StandardFonts.HelveticaBold);
        const lines = buildGuestExportPdfLines(event.people, event.roles, safeFieldKeys);
        const pageMargin = 48;
        const fontSize = 11;
        const lineHeight = 16;
        let page = pdfDocument.addPage([595.28, 841.89]);
        let currentY = page.getHeight() - pageMargin;
        const maxWidth = page.getWidth() - pageMargin * 2;

        lines.forEach((line, index) => {
          const isTitle = index === 0;
          const activeFont = isTitle ? boldFont : regularFont;
          const activeSize = isTitle ? 15 : fontSize;
          const wrappedLines = wrapPdfLine(line, activeFont, activeSize, maxWidth);

          wrappedLines.forEach((wrappedLine) => {
            if (currentY < pageMargin) {
              page = pdfDocument.addPage([595.28, 841.89]);
              currentY = page.getHeight() - pageMargin;
            }

            page.drawText(wrappedLine, {
              x: pageMargin,
              y: currentY,
              size: activeSize,
              font: activeFont
            });
            currentY -= lineHeight;
          });
        });

        const pdfBytes = await pdfDocument.save();
        downloadBlobFile(buildGuestExportFilename("pdf"), pdfBytes, "application/pdf");
        setGuestToolStatus("Gjestelisten er eksportert som PDF.");
        return;
      }

      const fileContent = buildGuestExportCsv(event.people, event.roles, safeFieldKeys);
      downloadTextFile(buildGuestExportFilename("csv"), fileContent);
      setGuestToolStatus("Gjestelisten er eksportert som CSV.");
    } catch (error) {
      setGuestToolStatus(error instanceof Error ? error.message : "Kunne ikke eksportere gjestelisten akkurat nå.");
    }
  }

  function handleToggleExportField(fieldKey) {
    setExportFieldKeys((currentKeys) =>
      currentKeys.includes(fieldKey)
        ? currentKeys.filter((key) => key !== fieldKey)
        : [...currentKeys, fieldKey]
    );
  }

  async function handleGuestImportFileChange(eventObject) {
    const file = eventObject.currentTarget.files?.[0];

    if (!file) {
      setImportPreview(null);
      return;
    }

    try {
      const lowerName = String(file.name || "").toLowerCase();
      let parsed;

      if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
        const XLSX = await import("xlsx");
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const firstSheet = firstSheetName ? workbook.Sheets[firstSheetName] : null;
        const rows = firstSheet
          ? XLSX.utils.sheet_to_json(firstSheet, {
              header: 1,
              raw: false,
              defval: ""
            })
          : [];
        parsed = parseGuestImportRows(rows, event.roles);
      } else {
        const text = await file.text();
        parsed = parseGuestImportText(text, event.roles);
      }

      const matchedExistingCount = parsed.rows.filter((person) =>
        Boolean(matchImportedPerson(event.people, person))
      ).length;

      setImportPreview({
        ...parsed,
        matchedExistingCount,
        newCount: Math.max(parsed.rows.length - matchedExistingCount, 0),
        fileName: file.name
      });
      setGuestToolStatus(
        parsed.errors.length
          ? "Importen har noen varsler. Sjekk forhåndsvisningen før du fortsetter."
          : "Importfilen er lest inn."
      );
    } catch (error) {
      setImportPreview(null);
      setGuestToolStatus(error instanceof Error ? error.message : "Kunne ikke lese importfilen.");
    }
  }

  async function handleRunGuestImport() {
    if (!viewerAccess.canManageGuest || typeof onBulkUpsertPeople !== "function" || !importPreview) {
      return;
    }

    if (importPreview.rows.length === 0) {
      setGuestToolStatus("Ingen gyldige rader å importere.");
      return;
    }

    const nextEvent = await onBulkUpsertPeople(importPreview.rows);

    if (nextEvent) {
      setImportPreview(null);
      setGuestModal("");
      setGuestToolStatus("");
    }
  }

  return (
    <div className="stack">
      <section className="panel stack">
        <div className="panel-header-inline">
          <div>
            <h3>Gjest</h3>
            <p className="muted">
              Bytt mellom infosider, gjestelisten og egne rolleoppsett for arrangementet.
            </p>
          </div>
        </div>
        <div className="tab-row" role="tablist" aria-label="Undermeny for gjest">
          <button
            aria-selected={guestWorkspaceView === "info_pages"}
            className={`tab-chip ${guestWorkspaceView === "info_pages" ? "active" : ""}`}
            role="tab"
            type="button"
            onClick={() => setGuestWorkspaceView("info_pages")}
          >
            Infosider
          </button>
          <button
            aria-selected={guestWorkspaceView === "guest_list"}
            className={`tab-chip ${guestWorkspaceView === "guest_list" ? "active" : ""}`}
            role="tab"
            type="button"
            onClick={() => setGuestWorkspaceView("guest_list")}
          >
            Gjesteliste
          </button>
          <button
            aria-selected={guestWorkspaceView === "roles"}
            className={`tab-chip ${guestWorkspaceView === "roles" ? "active" : ""}`}
            role="tab"
            type="button"
            onClick={() => setGuestWorkspaceView("roles")}
          >
            Roller
          </button>
        </div>
      </section>

      {guestWorkspaceView === "info_pages" ? (
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
            backgroundMode={guestSiteBackgroundModeDraft}
            backgroundUploadStatus={guestSiteBackgroundStatus}
            isUploadingBackground={isUploadingGuestSiteBackground}
            pageLinks={guestPageLinks}
            onIntroTextChange={setGuestSiteIntroDraft}
            onNavigationLabelChange={setGuestSiteNavigationLabelDraft}
            onBackgroundModeChange={setGuestSiteBackgroundModeDraft}
            onBackgroundUpload={handleGuestSiteBackgroundUpload}
            onRemoveBackgroundImage={handleRemoveGuestSiteBackgroundImage}
            onSaveIntro={handleSaveGuestSiteIntro}
            onIntroBlur={() => {
              if (guestSiteIntroDraft !== (event.guestSite?.introText || "")) {
                void handleSaveGuestSiteIntro();
              }
            }}
            onNavigationLabelBlur={() => {
              if (guestSiteNavigationLabelDraft !== (event.guestSite?.navigationLabel || "Navigasjon")) {
                void handleSaveGuestSiteIntro();
              }
            }}
            onBackgroundModeBlur={() => {
              if (guestSiteBackgroundModeDraft !== (event.guestSite?.backgroundMode || "shell")) {
                void handleSaveGuestSiteIntro();
              }
            }}
          />
          <div
            className={`guest-site-preview-frame ${guestSiteBackgroundModeDraft === "page" ? "is-page-background guest-site-page-background-host" : ""}`}
          >
            {guestSitePageLayerStyle ? (
              <div
                aria-hidden="true"
                className="guest-site-page-background-layer"
                style={guestSitePageLayerStyle}
              />
            ) : null}
            <div className="guest-site-shell" style={guestSiteShellStyle}>
              <aside className="guest-site-sidebar">
                <div className="stack">
                  <div className="panel-header-inline">
                    <p className="eyebrow">{guestSiteNavigationLabelDraft || "Navigasjon"}</p>
                    {viewerAccess.canManageGuest && visiblePages.length > 1 ? (
                      <span className="muted guest-site-nav-help">Dra eller flytt for aa endre rekkefolgen</span>
                    ) : null}
                  </div>
                  <nav className="guest-site-menu">
                    {visiblePages.map((page, index) => {
                      const dropPosition =
                        guestNavDropIndicator?.pageId === page.id
                          ? guestNavDropIndicator.position
                          : null;

                      return (
                        <div
                          className={`guest-site-nav-row ${draggedGuestNavId === page.id ? "is-dragging" : ""} ${
                            dropPosition ? `is-drop-${dropPosition}` : ""
                          }`}
                          draggable={viewerAccess.canManageGuest && visiblePages.length > 1}
                          key={page.id}
                          onDragEnd={handleGuestNavigationDragEnd}
                          onDragOver={(eventObject) => handleGuestNavigationDragOver(page.id, eventObject)}
                          onDragStart={(eventObject) =>
                            handleGuestNavigationDragStart(page.id, eventObject)
                          }
                          onDrop={(eventObject) => handleGuestNavigationDrop(page.id, eventObject)}
                        >
                          {viewerAccess.canManageGuest ? (
                            <div className="guest-site-nav-row-actions">
                              <button
                                aria-label={`Flytt ${page.menuLabel || page.title} opp`}
                                className="ghost-button compact-icon-button"
                                disabled={index === 0}
                                type="button"
                                onClick={() => void handleMoveGuestNavigation(page.id, -1)}
                              >
                                ↑
                              </button>
                              <button
                                aria-label={`Flytt ${page.menuLabel || page.title} ned`}
                                className="ghost-button compact-icon-button"
                                disabled={index === visiblePages.length - 1}
                                type="button"
                                onClick={() => void handleMoveGuestNavigation(page.id, 1)}
                              >
                                ↓
                              </button>
                              <span aria-hidden="true" className="guest-site-nav-drag-handle">
                                ⋮⋮
                              </span>
                            </div>
                          ) : null}
                          <button
                            className={`guest-site-link ${selectedPage?.id === page.id ? "is-active" : ""}`}
                            type="button"
                            onClick={() => setSelectedPageId(page.id)}
                          >
                            <strong>{page.menuLabel || page.title}</strong>
                            <span>{page.title}</span>
                            {viewerAccess.canManageGuest &&
                            page.kind !== "venue_seating" &&
                            page.kind !== "guest_agenda" ? (
                              <small className="guest-page-visibility-badge">
                                {getGuestPageVisibilityLabel(page.visibility)}
                              </small>
                            ) : null}
                          </button>
                        </div>
                      );
                    })}
                  </nav>
                </div>
              {viewerAccess.canManageGuest ? (
                <section className="stack guest-page-composer">
                  <div className="panel-header-inline">
                    <div>
                      <strong>Infosider</strong>
                      <p className="muted">Opprett nye infosider i et eget vindu i stedet for å ha en åpen draft liggende i sidepanelet.</p>
                    </div>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => handleOpenGuestModal("new-page")}
                    >
                      Legg til ny infoside
                    </button>
                  </div>
                </section>
              ) : null}
              </aside>

              <div className="guest-site-stage stack">
              {selectedPage ? (
                <>
                  <article className="guest-site-preview">
                    <h2>{previewPage?.title || selectedPage.title}</h2>
                    {viewerAccess.canManageGuest && !isGeneratedGuestPage ? (
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
                    ) : isGuestAgendaPage ? (
                      <GuestAgendaPageView event={event} title={selectedPage.title} />
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

                  {viewerAccess.canManageGuest && !isGeneratedGuestPage ? (
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
                    <div className="guest-page-image-panel">
                      <div className="panel-header-inline">
                        <div>
                          <h4>Bildevisning</h4>
                          <p className="muted">
                            Sett markøren på en bildelinje i innholdet under for å justere hvordan akkurat det bildet skal vises på gjestenettsiden.
                          </p>
                        </div>
                      </div>
                      {activeGuestImage ? (
                        <div className="guest-page-image-panel-grid">
                          <label className="field">
                            <span>Visning</span>
                            <select
                              value={activeGuestImage.displayMode || "fit"}
                              onChange={(eventObject) =>
                                updateActiveGuestImage({
                                  displayMode: eventObject.currentTarget.value
                                })
                              }
                            >
                              {GUEST_PAGE_IMAGE_LAYOUT_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          {activeGuestImage.displayMode === "crop" ? (
                            <>
                              <label className="field">
                                <span>Utsnitt</span>
                                <select
                                  value={activeGuestImage.cropRatio || "16:9"}
                                  onChange={(eventObject) =>
                                    updateActiveGuestImage({
                                      cropRatio: eventObject.currentTarget.value
                                    })
                                  }
                                >
                                  {GUEST_PAGE_IMAGE_RATIO_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="field">
                                <span>Horisontalt fokus</span>
                                <input
                                  max="100"
                                  min="0"
                                  step="1"
                                  type="range"
                                  value={activeGuestImage.focusX ?? 50}
                                  onChange={(eventObject) =>
                                    updateActiveGuestImage({
                                      focusX: Number(eventObject.currentTarget.value || 50)
                                    })
                                  }
                                />
                              </label>
                              <label className="field">
                                <span>Vertikalt fokus</span>
                                <input
                                  max="100"
                                  min="0"
                                  step="1"
                                  type="range"
                                  value={activeGuestImage.focusY ?? 50}
                                  onChange={(eventObject) =>
                                    updateActiveGuestImage({
                                      focusY: Number(eventObject.currentTarget.value || 50)
                                    })
                                  }
                                />
                              </label>
                            </>
                          ) : null}
                        </div>
                      ) : (
                        <p className="guest-page-help">
                          Ingen bildelinje er valgt akkurat nå. Last opp et bilde, eller plasser markøren på en eksisterende bildelinje som ser ut som
                          `![Bildetekst](...)`.
                        </p>
                      )}
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
                {viewerAccess.canManageGuest && isGeneratedGuestPage ? (
                  <section className="panel stack guest-page-editor">
                    <div className="panel-header-inline">
                      <div>
                        <h3>
                          {isVenueSeatingPage
                            ? "Sitteplansiden styres fra lokaleplanen"
                            : "Agendasiden styres fra planleggingen"}
                        </h3>
                        <p className="muted">
                          {isVenueSeatingPage ? (
                            <>
                              Gå til <strong>Lokale</strong> og slå av/på publisering der. Her vises siden bare som
                              forhåndsvisning sammen med resten av gjestenettsiden.
                            </>
                          ) : (
                            <>
                              Gå til <strong>Planlegging</strong> og slå av/på publisering der. Her vises siden bare
                              som forhåndsvisning sammen med resten av gjestenettsiden.
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="notice">
                      <strong>
                        {isVenueSeatingPage
                          ? "Ingen ekstra gjesteinformasjon deles"
                          : "Agendaen oppdateres automatisk"}
                      </strong>
                      <p>
                        {isVenueSeatingPage
                          ? "Denne siden viser bare navn, bord og plasseringer, samt søk på navn for å finne riktig bord."
                          : "Denne siden viser bare aktiviteter som er merket med `Vises på agenda`, i tidsrekkefølge for gjestene."}
                      </p>
                    </div>
                    {isVenueSeatingPage ? (
                      <form className="stack" onSubmit={handleSaveGuestSeatingPageSettings}>
                        <div className="compact-grid">
                          <div className="field checkbox-field">
                            <span>Tekst og etiketter</span>
                            <label className="checkbox-inline">
                              <input
                                defaultChecked={event.venuePlan?.guestSeatingPage?.showItemLabels !== false}
                                name="showItemLabels"
                                type="checkbox"
                              />
                              <span>Vis navn på bord og soner</span>
                            </label>
                            <label className="checkbox-inline">
                              <input
                                defaultChecked={event.venuePlan?.guestSeatingPage?.showSeatLabels !== false}
                                name="showSeatLabels"
                                type="checkbox"
                              />
                              <span>Vis plasser i bordlista</span>
                            </label>
                          </div>
                          <label className="field">
                            <span>Navn på gjestene</span>
                            <select
                              defaultValue={event.venuePlan?.guestSeatingPage?.guestNameDisplay || "initials"}
                              name="guestNameDisplay"
                            >
                              {VENUE_GUEST_NAME_DISPLAY_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <div className="stack">
                          <strong>Vis komponenter på sitteplansiden</strong>
                          <div className="toggle-row">
                            {VENUE_ITEM_LIBRARY.map((entry) => (
                              <label key={entry.type}>
                                <input
                                  defaultChecked={event.venuePlan?.guestSeatingPage?.visibleTypes?.[entry.type] !== false}
                                  name={`visibleType:${entry.type}`}
                                  type="checkbox"
                                />
                                {entry.label}
                              </label>
                            ))}
                          </div>
                        </div>
                        <button className="secondary-button" type="submit">
                          Lagre sitteplanside
                        </button>
                      </form>
                    ) : null}
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
        </div>
        </section>
      ) : null}

      {guestWorkspaceView === "roles" ? (
        <>
          {viewerAccess.canManageGuest ? (
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
          ) : null}
        </>
      ) : null}

      {guestWorkspaceView === "guest_list" ? (
        <>
          {viewerAccess.canManageGuest ? (
            <section className="panel stack">
              <div className="panel-header-inline">
                <div>
                  <h3>Gjesteverktøy</h3>
                  <p className="muted">
                    Legg til enkeltgjester, fyll inn mange samtidig, eller importer og eksporter gjestelisten som CSV, Excel eller PDF.
                  </p>
                </div>
              </div>
              <div className="button-row">
                <button className="primary-button" type="button" onClick={() => handleOpenGuestModal("add-person")}>
                  Legg til person
                </button>
                <button className="secondary-button" type="button" onClick={() => handleOpenGuestModal("bulk-people")}>
                  Legg til mange
                </button>
                <button className="secondary-button" type="button" onClick={() => handleOpenGuestModal("import-people")}>
                  Importer gjesteliste
                </button>
                <button className="secondary-button" type="button" onClick={() => handleOpenGuestModal("export-people")}>
                  Eksporter gjesteliste
                </button>
                <button className="secondary-button" type="button" onClick={() => handleOpenGuestModal("import-people")}>
                  Maler
                </button>
              </div>
              {guestToolStatus ? <p className="notice">{guestToolStatus}</p> : null}
            </section>
          ) : null}

          <section className="panel stack">
            <div className="panel-header-inline">
              <div>
                <h3>Personer i arrangementet</h3>
                <p className="muted">Søk og filtrer på svarstatus, allergier, matpreferanser eller sitteinfo for å finne riktig person raskere.</p>
              </div>
              <div className="compact-grid" style={{ alignItems: "end" }}>
                <label className="field person-search-field">
                  <span>Filter</span>
                  <select
                    value={personFilter}
                    onChange={(eventObject) => setPersonFilter(eventObject.currentTarget.value)}
                  >
                    {GUEST_LIST_FILTER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field person-search-field">
                  <span>Søk i listen</span>
                  <input
                    placeholder="Navn, e-post, rolle eller allergi"
                    value={personSearch}
                    onChange={(eventObject) => setPersonSearch(eventObject.currentTarget.value)}
                  />
                </label>
              </div>
            </div>
            {filteredPeople.length === 0 ? (
              <EmptyState
                title={event.people.length === 0 ? "Ingen personer enda" : "Ingen treff i gjestelisten"}
                body={
                  event.people.length === 0
                    ? "Legg til gjester, hjelpere eller fakturamedlemmer for aa styre tilgangene."
                    : "Juster søket eller importer flere gjester."
                }
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
                {filteredPeople.map((person) => {
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
        </>
      ) : null}

      {viewerAccess.canManageGuest && guestModal === "new-page" ? (
        <ModalShell
          title="Legg til ny infoside"
          body="Opprett en ny side for program, FAQ, transport, overnatting eller annen informasjon gjestene trenger."
          onClose={handleCloseGuestModal}
        >
          <form
            className="grid-form compact-grid"
            onSubmit={async (formEvent) => {
              const nextEvent = await onAddGuestPage(formEvent);

              if (nextEvent) {
                handleCloseGuestModal();
              }
            }}
          >
            <label className="field">
              <span>Tittel</span>
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
            <div className="button-row field-span-full">
              <button className="primary-button" type="submit">
                Opprett infoside
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {viewerAccess.canManageGuest && guestModal === "add-person" ? (
        <ModalShell
          title="Legg til person"
          body="Opprett én gjest eller hjelper av gangen. Hvis du har mange, bruk heller 'Legg til mange' eller importer fra mal."
          onClose={handleCloseGuestModal}
        >
          <form
            className="grid-form compact-grid"
            onSubmit={async (formEvent) => {
              const nextEvent = await onAddPerson(formEvent);

              if (nextEvent) {
                handleCloseGuestModal();
              }
            }}
          >
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
            <div className="button-row field-span-full">
              <button className="primary-button" type="submit">
                Lagre person
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {viewerAccess.canManageGuest && guestModal === "bulk-people" ? (
        <ModalShell
          title="Legg til mange personer"
          body="Fyll ut flere rader i samme tabell og legg dem inn i én operasjon."
          onClose={handleCloseGuestModal}
        >
          <form className="stack" onSubmit={handleSubmitBulkGuests}>
            <div className="compact-grid">
              <label className="field">
                <span>Startrolle for nye personer</span>
                <select
                  value={bulkTemplateKey}
                  onChange={(eventObject) => setBulkTemplateKey(eventObject.currentTarget.value)}
                >
                  {templateList.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="guest-bulk-table">
              <div className="guest-bulk-table-head">
                <span>Navn</span>
                <span>E-post</span>
                <span>Mobil</span>
                <span>RSVP</span>
                <span>Allergier</span>
                <span>Mat</span>
                <span>Notat</span>
                <span>Rad</span>
              </div>
              {bulkGuestRows.map((row) => (
                <div className="guest-bulk-table-row" key={row.id}>
                  <input
                    placeholder="Navn"
                    value={row.name}
                    onChange={(eventObject) =>
                      handleBulkGuestRowChange(row.id, "name", eventObject.currentTarget.value)
                    }
                  />
                  <input
                    placeholder="E-post"
                    value={row.email}
                    onChange={(eventObject) =>
                      handleBulkGuestRowChange(row.id, "email", eventObject.currentTarget.value)
                    }
                  />
                  <input
                    placeholder="Mobil"
                    value={row.phone}
                    onChange={(eventObject) =>
                      handleBulkGuestRowChange(row.id, "phone", eventObject.currentTarget.value)
                    }
                  />
                  <select
                    value={row.rsvpStatus}
                    onChange={(eventObject) =>
                      handleBulkGuestRowChange(row.id, "rsvpStatus", eventObject.currentTarget.value)
                    }
                  >
                    {RSVP_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <input
                    placeholder="Allergier"
                    value={row.allergies}
                    onChange={(eventObject) =>
                      handleBulkGuestRowChange(row.id, "allergies", eventObject.currentTarget.value)
                    }
                  />
                  <input
                    placeholder="Mat"
                    value={row.dietaryNotes}
                    onChange={(eventObject) =>
                      handleBulkGuestRowChange(row.id, "dietaryNotes", eventObject.currentTarget.value)
                    }
                  />
                  <input
                    placeholder="Notat"
                    value={row.note}
                    onChange={(eventObject) =>
                      handleBulkGuestRowChange(row.id, "note", eventObject.currentTarget.value)
                    }
                  />
                  <button
                    className="ghost-button compact-icon-button"
                    type="button"
                    onClick={() => handleRemoveBulkGuestRow(row.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className="button-row">
              <button className="secondary-button" type="button" onClick={handleAddBulkGuestRow}>
                Legg til rad
              </button>
              <button className="primary-button" type="submit">
                Lagre personer
              </button>
            </div>
            {guestToolStatus ? <p className="notice">{guestToolStatus}</p> : null}
          </form>
        </ModalShell>
      ) : null}

      {viewerAccess.canManageGuest && guestModal === "import-people" ? (
        <ModalShell
          title="Importer gjesteliste"
          body="Bruk CSV- eller Excel-mal for raskest mulig import. Eksisterende personer oppdateres hvis e-post, mobil eller navn matcher."
          onClose={handleCloseGuestModal}
        >
          <div className="stack">
            <div className="button-row">
              <button
                className="secondary-button"
                type="button"
                onClick={() => void handleDownloadGuestTemplate("csv")}
              >
                Last ned CSV-mal
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => void handleDownloadGuestTemplate("xlsx")}
              >
                Last ned Excel-mal
              </button>
            </div>
            <label className="field">
              <span>Velg CSV- eller Excel-fil</span>
              <input
                accept=".csv,text/csv,.txt,.xlsx,.xls"
                type="file"
                onChange={(eventObject) => void handleGuestImportFileChange(eventObject)}
              />
            </label>
            {importPreview ? (
              <div className="stack">
                <div className="overview-grid guest-import-summary-grid">
                  <InfoCard label="Rader klare" value={importPreview.rows.length} />
                  <InfoCard
                    label="Oppdaterer eksisterende"
                    value={importPreview.matchedExistingCount}
                    tone="warning"
                  />
                  <InfoCard label="Nye personer" value={importPreview.newCount} tone="success" />
                </div>
                {importPreview.errors.length ? (
                  <div className="notice">
                    <strong>Varsler i importen</strong>
                    <ul className="compact-list">
                      {importPreview.errors.slice(0, 6).map((error) => (
                        <li key={error}>{error}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div className="button-row">
                  <button className="primary-button" type="button" onClick={() => void handleRunGuestImport()}>
                    Importer gjester
                  </button>
                </div>
              </div>
            ) : null}
            {guestToolStatus ? <p className="notice">{guestToolStatus}</p> : null}
          </div>
        </ModalShell>
      ) : null}

      {viewerAccess.canManageGuest && guestModal === "export-people" ? (
        <ModalShell
          title="Eksporter gjesteliste"
          body="Velg hvilke felt som skal med i eksporten, og last ned som CSV, Excel eller PDF."
          onClose={handleCloseGuestModal}
        >
          <div className="stack">
            <label className="field">
              <span>Format</span>
              <select
                value={guestExportFormat}
                onChange={(eventObject) => setGuestExportFormat(eventObject.currentTarget.value)}
              >
                <option value="csv">CSV</option>
                <option value="xlsx">Excel (.xlsx)</option>
                <option value="pdf">PDF</option>
              </select>
            </label>
            <div className="toggle-row">
              {GUEST_LIST_FIELD_OPTIONS.map((field) => (
                <label key={field.key}>
                  <input
                    checked={exportFieldKeys.includes(field.key)}
                    type="checkbox"
                    onChange={() => handleToggleExportField(field.key)}
                  />
                  {field.label}
                </label>
              ))}
            </div>
            <div className="button-row">
              <button className="primary-button" type="button" onClick={() => void handleDownloadGuestExport()}>
                Last ned eksport
              </button>
            </div>
            {guestToolStatus ? <p className="notice">{guestToolStatus}</p> : null}
          </div>
        </ModalShell>
      ) : null}
    </div>
  );
}

function TaskLinkSelector({
  options,
  selectedIds,
  disabled,
  inputName,
  emptyLabel = "Ingen andre aktiviteter aa koble til enda.",
  emptySelectionLabel = "Velg aktiviteter"
}) {
  const [checkedIds, setCheckedIds] = useState(selectedIds);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setCheckedIds(selectedIds);
  }, [selectedIds]);

  if (options.length === 0) {
    return <p className="muted">{emptyLabel}</p>;
  }

  const normalizedQuery = query.trim().toLowerCase();
  const visibleOptions = options.filter((option) => {
    if (!normalizedQuery) {
      return true;
    }

    const searchableText = [option.title, option.meta, option.badge]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return searchableText.includes(normalizedQuery);
  });
  const selectedOptions = options.filter((option) => checkedIds.includes(option.id));
  const summaryLabel =
    selectedOptions.length === 0
      ? emptySelectionLabel
      : selectedOptions.length <= 2
        ? selectedOptions.map((option) => option.title).join(", ")
        : `${selectedOptions.length} aktiviteter valgt`;

  return (
    <details className={`assignee-dropdown task-link-selector ${disabled ? "is-disabled" : ""}`}>
      <summary className="assignee-dropdown-summary">
        <span className="assignee-dropdown-label">{summaryLabel}</span>
        <span className="assignee-dropdown-meta">
          {selectedOptions.length ? `${selectedOptions.length} valgt` : "Ingen valgt"}
        </span>
      </summary>
      <div className="assignee-dropdown-panel task-link-selector-panel">
        <label className="field task-link-search-field">
          <span>Sok blant aktiviteter</span>
          <input
            disabled={disabled}
            placeholder="Sok paa navn, hierarki eller klokkeslett"
            type="search"
            value={query}
            onChange={(eventObject) => setQuery(eventObject.currentTarget.value)}
          />
        </label>
        {selectedOptions.length ? (
          <div className="task-link-selected-list">
            {selectedOptions.map((option) => (
              <span className="data-tag" key={`${inputName}-${option.id}`}>
                {option.title}
              </span>
            ))}
          </div>
        ) : null}
        {visibleOptions.length === 0 ? (
          <p className="muted">Ingen aktiviteter matcher soket ditt.</p>
        ) : (
          visibleOptions.map((option) => (
            <label className="assignee-dropdown-option task-link-option" key={option.id}>
              <input
                checked={checkedIds.includes(option.id)}
                disabled={disabled}
                name={inputName}
                onChange={(eventObject) => {
                  const nextChecked = eventObject.currentTarget.checked;

                  setCheckedIds((currentIds) =>
                    nextChecked
                      ? [...currentIds, option.id]
                      : currentIds.filter((currentId) => currentId !== option.id)
                  );
                }}
                type="checkbox"
                value={option.id}
              />
              <div className="task-link-option-content">
                <strong>{option.title || "Uten tittel"}</strong>
                {option.meta ? <span>{option.meta}</span> : null}
              </div>
              {option.badge ? <span className="data-tag">{option.badge}</span> : null}
            </label>
          ))
        )}
      </div>
    </details>
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

function buildTaskLinkOptions(tasks, excludedTaskId = "") {
  return (Array.isArray(tasks) ? tasks : [])
    .filter((task) => task?.id && task.id !== excludedTaskId)
    .map((task) => {
      const metaParts = [];

      if (task.parentTaskTitle) {
        metaParts.push(`Under ${task.parentTaskTitle}`);
      } else if (Array.isArray(task.hierarchyPathTitles) && task.hierarchyPathTitles.length > 1) {
        metaParts.push(task.hierarchyPathTitles.slice(0, -1).join(" / "));
      }

      if (task.displayStartAt) {
        metaParts.push(formatDateTime(task.displayStartAt));
      } else if (task.desiredStartAt) {
        metaParts.push(`Onsket ${formatDateTime(task.desiredStartAt)}`);
      }

      return {
        id: task.id,
        title: task.title || "Uten tittel",
        meta: metaParts.join(" · "),
        badge: task.isFixedTime ? "Fast tid" : task.showOnAgenda ? "Agenda" : ""
      };
    });
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
    id: "dependencies",
    label: "Avhengigheter",
    description:
      "Viser startaktiviteter, forgreninger og etterfolgere i ett eget flytbilde, inspirert av predecessor/successor-tankegangen i klassiske prosjektverktoy."
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

const PROJECT_TASK_EXPORT_FORMAT_OPTIONS = [
  { value: "xlsx", label: "Excel (.xlsx)" },
  { value: "pdf", label: "PDF" },
  { value: "csv", label: "CSV" }
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
  onBulkUpsertTasks,
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
  const [activeTaskModalId, setActiveTaskModalId] = useState("");
  const [projectToolsOpen, setProjectToolsOpen] = useState(false);
  const [projectToolStatus, setProjectToolStatus] = useState("");
  const [taskImportPreview, setTaskImportPreview] = useState(null);
  const [taskExportFormat, setTaskExportFormat] = useState("xlsx");
  const [taskExportFieldKeys, setTaskExportFieldKeys] = useState(DEFAULT_PROJECT_TASK_EXPORT_FIELDS);
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
  const dependencySummary = useMemo(
    () => buildTaskDependencySummary(filteredAgendaTasks),
    [filteredAgendaTasks]
  );
  const dependencyForest = useMemo(
    () => buildTaskDependencyForest(filteredAgendaTasks),
    [filteredAgendaTasks]
  );
  const dependencyTaskMap = useMemo(
    () => new Map(dependencySummary.tasks.map((task) => [task.id, task])),
    [dependencySummary.tasks]
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
  const activeTaskModalTask = useMemo(
    () => projectDashboard.tasks.find((task) => task.id === activeTaskModalId) || null,
    [activeTaskModalId, projectDashboard.tasks]
  );
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

  useEffect(() => {
    if (
      activeTaskModalId &&
      !projectDashboard.tasks.some((task) => task.id === activeTaskModalId)
    ) {
      setActiveTaskModalId("");
    }
  }, [activeTaskModalId, projectDashboard.tasks]);

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

  function openTaskInModal(taskId) {
    setProjectView("list");
    setActiveTaskModalId(taskId);
  }

  function closeTaskModal() {
    setActiveTaskModalId("");
  }

  function openProjectToolsModal() {
    setProjectToolStatus("");
    setTaskImportPreview(null);
    setProjectToolsOpen(true);
  }

  function closeProjectToolsModal() {
    setProjectToolStatus("");
    setTaskImportPreview(null);
    setProjectToolsOpen(false);
  }

  async function handleDownloadTaskTemplate(format = "xlsx") {
    try {
      if (format === "xlsx") {
        const XLSX = await import("xlsx");
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet(buildProjectTaskImportTemplateTable());
        XLSX.utils.book_append_sheet(workbook, worksheet, "Prosjektoppgaver-mal");
        const workbookBytes = XLSX.write(workbook, {
          bookType: "xlsx",
          type: "array"
        });
        downloadBlobFile(
          buildProjectTaskTemplateFilename("xlsx"),
          workbookBytes,
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        setProjectToolStatus("Prosjektmalen er lastet ned som Excel.");
        return;
      }

      downloadTextFile(
        buildProjectTaskTemplateFilename("csv"),
        buildProjectTaskImportTemplateCsv()
      );
      setProjectToolStatus("Prosjektmalen er lastet ned som CSV.");
    } catch (error) {
      setProjectToolStatus(error instanceof Error ? error.message : "Kunne ikke lage prosjektmalen.");
    }
  }

  function handleToggleTaskExportField(fieldKey) {
    setTaskExportFieldKeys((currentKeys) =>
      currentKeys.includes(fieldKey)
        ? currentKeys.filter((key) => key !== fieldKey)
        : [...currentKeys, fieldKey]
    );
  }

  async function handleDownloadTaskExport() {
    const safeFieldKeys = taskExportFieldKeys.length
      ? taskExportFieldKeys
      : DEFAULT_PROJECT_TASK_EXPORT_FIELDS;

    try {
      if (taskExportFormat === "xlsx") {
        const XLSX = await import("xlsx");
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet(
          buildProjectTaskExportTable(filteredAgendaTasks, event.people, safeFieldKeys)
        );
        XLSX.utils.book_append_sheet(workbook, worksheet, "Prosjektoppgaver");
        const workbookBytes = XLSX.write(workbook, {
          bookType: "xlsx",
          type: "array"
        });
        downloadBlobFile(
          buildProjectTaskExportFilename("xlsx"),
          workbookBytes,
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        setProjectToolStatus("Prosjektoppgavene er eksportert som Excel.");
        return;
      }

      if (taskExportFormat === "pdf") {
        const { PDFDocument, StandardFonts } = await import("pdf-lib");
        const pdfDocument = await PDFDocument.create();
        const regularFont = await pdfDocument.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdfDocument.embedFont(StandardFonts.HelveticaBold);
        const lines = buildProjectTaskExportPdfLines(filteredAgendaTasks, event.people, safeFieldKeys);
        const pageMargin = 48;
        const fontSize = 11;
        const lineHeight = 16;
        let page = pdfDocument.addPage([595.28, 841.89]);
        let currentY = page.getHeight() - pageMargin;
        const maxWidth = page.getWidth() - pageMargin * 2;

        lines.forEach((line, index) => {
          const isTitle = index === 0;
          const activeFont = isTitle ? boldFont : regularFont;
          const activeSize = isTitle ? 15 : fontSize;
          const wrappedLines = wrapPdfLine(line, activeFont, activeSize, maxWidth);

          wrappedLines.forEach((wrappedLine) => {
            if (currentY < pageMargin) {
              page = pdfDocument.addPage([595.28, 841.89]);
              currentY = page.getHeight() - pageMargin;
            }

            page.drawText(wrappedLine, {
              x: pageMargin,
              y: currentY,
              size: activeSize,
              font: activeFont
            });
            currentY -= lineHeight;
          });
        });

        const pdfBytes = await pdfDocument.save();
        downloadBlobFile(buildProjectTaskExportFilename("pdf"), pdfBytes, "application/pdf");
        setProjectToolStatus("Prosjektoppgavene er eksportert som PDF.");
        return;
      }

      downloadTextFile(
        buildProjectTaskExportFilename("csv"),
        buildProjectTaskExportCsv(filteredAgendaTasks, event.people, safeFieldKeys)
      );
      setProjectToolStatus("Prosjektoppgavene er eksportert som CSV.");
    } catch (error) {
      setProjectToolStatus(
        error instanceof Error ? error.message : "Kunne ikke eksportere prosjektoppgavene."
      );
    }
  }

  async function handleTaskImportFileChange(eventObject) {
    const file = eventObject.currentTarget.files?.[0];

    if (!file) {
      setTaskImportPreview(null);
      return;
    }

    try {
      const lowerName = String(file.name || "").toLowerCase();
      let parsed;

      if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
        const XLSX = await import("xlsx");
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const firstSheet = firstSheetName ? workbook.Sheets[firstSheetName] : null;
        const rows = firstSheet
          ? XLSX.utils.sheet_to_json(firstSheet, {
              header: 1,
              raw: false,
              defval: ""
            })
          : [];
        parsed = parseProjectTaskImportRows(rows, event.people, event.tasks);
      } else {
        const text = await file.text();
        parsed = parseProjectTaskImportText(text, event.people, event.tasks);
      }

      setTaskImportPreview({
        ...parsed,
        fileName: file.name
      });
      setProjectToolStatus(
        parsed.errors.length
          ? "Importen har noen varsler. Sjekk forhandsvisningen for du fortsetter."
          : "Importfilen er lest inn."
      );
    } catch (error) {
      setTaskImportPreview(null);
      setProjectToolStatus(error instanceof Error ? error.message : "Kunne ikke lese prosjektfilen.");
    }
  }

  async function handleRunTaskImport() {
    if (!viewerAccess.canManageProject || typeof onBulkUpsertTasks !== "function" || !taskImportPreview) {
      return;
    }

    if (taskImportPreview.rows.length === 0) {
      setProjectToolStatus("Ingen gyldige oppgaver aa importere.");
      return;
    }

    const nextEvent = await onBulkUpsertTasks(taskImportPreview.rows);

    if (nextEvent) {
      setTaskImportPreview(null);
      setProjectToolStatus("");
      setProjectToolsOpen(false);
    }
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
            <input defaultValue="30" min="0" name="durationMinutes" step="5" type="number" />
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
        <label className="field field-span-full">
          <span>Toastmaster-notat / manus</span>
          <textarea
            name="toastmasterNotes"
            placeholder="Stikkord, manus, hvem som skal introduseres eller praktiske cue-er"
            rows={3}
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

  function getTaskDependencyState(task) {
    return (
      dependencyTaskMap.get(task?.id) || {
        predecessorIds: Array.isArray(task?.dependencyIds) ? task.dependencyIds : [],
        predecessorCount: Array.isArray(task?.dependencyIds) ? task.dependencyIds.length : 0,
        successorIds: [],
        successorCount: 0,
        isStartTask: !Array.isArray(task?.dependencyIds) || task.dependencyIds.length === 0,
        isIndependent: !Array.isArray(task?.dependencyIds) || task.dependencyIds.length === 0,
        hasCrossDependencies: false
      }
    );
  }

  function renderTaskDependencyTags(task) {
    const dependencyState = getTaskDependencyState(task);

    return (
      <>
        {dependencyState.isIndependent ? (
          <span className="data-tag">Uavhengig</span>
        ) : dependencyState.isStartTask ? (
          <span className="data-tag success-tag">Startaktivitet</span>
        ) : (
          <span className="data-tag">Etter {dependencyState.predecessorCount}</span>
        )}
        {dependencyState.successorCount ? (
          <span className="data-tag">Forer videre til {dependencyState.successorCount}</span>
        ) : null}
        {dependencyState.hasCrossDependencies ? (
          <span className="data-tag warning-tag">Flere innganger</span>
        ) : null}
      </>
    );
  }

  function renderTaskModalContent(task) {
    if (!task) {
      return null;
    }

    const dependencyOptions = buildTaskLinkOptions(agenda.tasks, task.id);
    const followingTaskIds = deriveFollowingTaskIds(agenda.tasks, task.id);
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

    return (
      <form className="stack" onSubmit={(eventObject) => void handleUpdateTask(eventObject, task)}>
        <input name="taskId" type="hidden" value={task.id} />
        <div className="stack compact-stack">
          <div className="agenda-card-title">
            <strong>{task.title}</strong>
            <span className="role-pill">#{task.agendaPosition}</span>
            {task.isFixedTime ? <span className="data-tag">Fast tidspunkt</span> : null}
            {task.showOnAgenda ? <span className="data-tag">Agenda</span> : null}
            {task.category && task.category !== "general" ? (
              <span className="data-tag">{getTaskCategoryLabel(task.category)}</span>
            ) : null}
            {task.bufferSummary ? <span className="data-tag">{task.bufferSummary}</span> : null}
            {task.recoverySummary ? <span className="data-tag">{task.recoverySummary}</span> : null}
            {task.toastmasterNotes ? <span className="data-tag">Manus</span> : null}
            {renderTaskDependencyTags(task)}
          </div>
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
              <strong>Ansvar:</strong> {task.assigneeLabel}
            </span>
          </div>
          {task.warnings.length ? (
            <div className="stack compact-stack">
              {task.warnings.map((warning, index) => (
                <p className="notice warning" key={`${task.id}-modal-warning-${index}`}>
                  {warning}
                </p>
              ))}
            </div>
          ) : null}
        </div>
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
                min="0"
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
        <label className="field field-span-full">
          <span>Toastmaster-notat / manus</span>
          <textarea
            defaultValue={task.toastmasterNotes || ""}
            disabled={!viewerAccess.canManageProject}
            name="toastmasterNotes"
            placeholder="Stikkord, manus, intern instruks eller praktisk informasjon"
            rows={4}
          />
        </label>
        <TaskBufferSettingsFields
          disabled={!viewerAccess.canManageProject}
          planningSettings={event.planningSettings}
          task={task}
        />
        </div>
        <label className="field">
          <span>Beskrivelse</span>
          <textarea
            defaultValue={task.description}
            disabled={!viewerAccess.canManageProject}
            name="description"
            rows={4}
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
          <TaskLinkSelector
            disabled={!viewerAccess.canManageProject}
            inputName="dependencyIds"
            options={dependencyOptions}
            selectedIds={task.dependencyIds}
            emptySelectionLabel="Velg forgjengere"
          />
        </div>
        <div className="field">
          <span>Aktiviteter som kommer etter denne</span>
          <TaskLinkSelector
            disabled={!viewerAccess.canManageProject}
            inputName="followingTaskIds"
            options={dependencyOptions}
            selectedIds={followingTaskIds}
            emptySelectionLabel="Velg etterfolgere"
          />
        </div>
        <div className="task-modal-actions">
          {canEditTask ? (
            <button className="primary-button" type="submit">
              {viewerAccess.canManageProject ? "Lagre aktivitet" : "Oppdater status"}
            </button>
          ) : (
            <p className="muted">Du kan se oppgaven her, men ikke endre den.</p>
          )}
          <button className="secondary-button" type="button" onClick={closeTaskModal}>
            Lukk
          </button>
        </div>
      </form>
    );
  }

  function renderDependencyTree(nodes, depth = 0) {
    return (Array.isArray(nodes) ? nodes : []).map((node) => {
      const task = node.task;
      const predecessorNames = node.predecessorIds
        .map((dependencyId) => dependencyTaskMap.get(dependencyId)?.title || "")
        .filter(Boolean);
      const successorNames = node.successorIds
        .map((successorId) => dependencyTaskMap.get(successorId)?.title || "")
        .filter(Boolean);

      return (
        <Fragment key={`dependency-node-${task.id}-${depth}`}>
          <div
            className={`project-dependency-row ${depth > 0 ? "is-nested" : ""}`}
            style={{ "--task-depth": String(Math.min(depth, 5)) }}
          >
            <div className="project-dependency-main">
              <div className="project-dependency-title-row">
                <strong>{task.title}</strong>
                <span className="role-pill">#{task.agendaPosition}</span>
                {renderTaskDependencyTags(task)}
                {node.upstreamRootIds.length > 1 ? (
                  <span className="data-tag warning-tag">
                    Knyttet til {node.upstreamRootIds.length} startspor
                  </span>
                ) : null}
              </div>
              <div className="project-dependency-meta">
                <span>
                  {task.displayStartAt && task.displayEndAt
                    ? `${formatDateTime(task.displayStartAt)} - ${formatDateTime(task.displayEndAt)}`
                    : "Tid ikke satt"}
                </span>
                <span>{task.assigneeLabel}</span>
                <span>{formatDurationMinutes(task.displayDurationMinutes)}</span>
              </div>
              {predecessorNames.length ? (
                <div className="task-structure-row">
                  {predecessorNames.map((name) => (
                    <span className="data-tag" key={`${task.id}-predecessor-${name}`}>
                      Etter {name}
                    </span>
                  ))}
                </div>
              ) : null}
              {successorNames.length ? (
                <div className="task-structure-row">
                  {successorNames.slice(0, 4).map((name) => (
                    <span className="data-tag" key={`${task.id}-successor-${name}`}>
                      Folges av {name}
                    </span>
                  ))}
                  {successorNames.length > 4 ? (
                    <span className="data-tag">+{successorNames.length - 4} til</span>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="project-dependency-actions">
              <button
                className="secondary-button task-inline-button"
                type="button"
                onClick={() => openTaskInModal(task.id)}
              >
                Aapne kort
              </button>
            </div>
          </div>
          {node.children?.length ? renderDependencyTree(node.children, depth + 1) : null}
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
            {viewerAccess.canManageProject ? (
              <button className="secondary-button" type="button" onClick={openProjectToolsModal}>
                Prosjektverktoy
              </button>
            ) : null}
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

      {projectView === "dependencies" ? (
        <section className="panel stack">
          <div className="panel-header-inline">
            <div>
              <h3>Avhengighetsflyt</h3>
              <p className="muted">
                Her ser du alle startaktiviteter for seg, og hvilke oppgaver som bygger videre derfra. Oppgaver med flere forgjengere viser alle innganger samlet.
              </p>
            </div>
          </div>
          <div className="overview-grid">
            <InfoCard label="Startaktiviteter" value={dependencySummary.summary.startTasks} />
            <InfoCard label="Har forgjenger" value={dependencySummary.summary.dependentTasks} />
            <InfoCard label="Forer videre" value={dependencySummary.summary.influencingTasks} />
            <InfoCard label="Uavhengige" value={dependencySummary.summary.independentTasks} />
            <InfoCard
              label="Flere innganger"
              tone={dependencySummary.summary.crossLinkedTasks ? "warning" : "success"}
              value={dependencySummary.summary.crossLinkedTasks}
            />
          </div>
          {filteredAgendaTasks.length === 0 ? (
            <EmptyState
              title="Ingen oppgaver i dette utsnittet"
              body="Bytt ansvarligfilteret eller legg til flere aktiviteter for aa se avhengighetsflyten."
            />
          ) : (
            <div className="stack">
              {dependencyForest.roots.length ? (
                <section className="project-dependency-panel stack">
                  <div className="project-dependency-panel-head">
                    <div>
                      <h4>Startaktiviteter</h4>
                      <p className="muted">
                        Dette tilsvarer oppgaver uten forgjengere. Hver grein viser hva som kan starte herfra.
                      </p>
                    </div>
                    <span className="role-pill">{dependencyForest.roots.length}</span>
                  </div>
                  <div className="stack compact-stack">
                    {dependencyForest.roots.map((rootNode) => (
                      <article className="project-dependency-root" key={`dependency-root-${rootNode.id}`}>
                        <div className="project-dependency-root-head">
                          <div className="stack compact-stack">
                            <strong>{rootNode.task.title}</strong>
                            <span className="muted">
                              {rootNode.task.displayStartAt
                                ? formatDateTime(rootNode.task.displayStartAt)
                                : "Starter uten satt klokkeslett"}
                            </span>
                          </div>
                          <button
                            className="secondary-button task-inline-button"
                            type="button"
                            onClick={() => openTaskInModal(rootNode.task.id)}
                          >
                            Aapne kort
                          </button>
                        </div>
                        <div className="project-dependency-branch">
                          {renderDependencyTree([rootNode])}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ) : null}

              {dependencyForest.summary.independentTasks ? (
                <section className="project-dependency-panel stack">
                  <div className="project-dependency-panel-head">
                    <div>
                      <h4>Helt uavhengige aktiviteter</h4>
                      <p className="muted">
                        Oppgaver som verken venter paa andre eller forer videre til noe nytt.
                      </p>
                    </div>
                    <span className="role-pill">{dependencyForest.summary.independentTasks}</span>
                  </div>
                  <div className="tag-list">
                    {dependencySummary.tasks
                      .filter((task) => task.isIndependent)
                      .map((task) => (
                        <button
                          className="compact-action-button"
                          key={`independent-${task.id}`}
                          type="button"
                          onClick={() => openTaskInModal(task.id)}
                        >
                          {task.title}
                        </button>
                      ))}
                  </div>
                </section>
              ) : null}

              {dependencyForest.disconnected.length ? (
                <section className="project-dependency-panel stack">
                  <div className="project-dependency-panel-head">
                    <div>
                      <h4>Oppgaver som mangler gyldig inngang</h4>
                      <p className="muted">
                        Disse har koblinger som ikke leder tilbake til en tydelig startaktivitet i utsnittet.
                      </p>
                    </div>
                    <span className="role-pill">{dependencyForest.disconnected.length}</span>
                  </div>
                  <div className="stack compact-stack">
                    {renderDependencyTree(
                      dependencyForest.disconnected.map((task) => ({
                        id: task.id,
                        task,
                        predecessorIds: task.predecessorIds,
                        predecessorCount: task.predecessorCount,
                        successorIds: task.successorIds,
                        successorCount: task.successorCount,
                        upstreamRootIds: [],
                        children: []
                      }))
                    )}
                  </div>
                </section>
              ) : null}
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
                <input defaultValue="60" min="0" name="durationMinutes" step="5" type="number" />
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
              <span>Toastmaster-notat / manus</span>
              <textarea
                name="toastmasterNotes"
                placeholder="Stikkord, intern info eller manus for den som leder punktet"
                rows={3}
              />
            </label>
            <TaskBufferSettingsFields planningSettings={event.planningSettings} />
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
              <TaskLinkSelector
                disabled={false}
                inputName="dependencyIds"
                options={buildTaskLinkOptions(agenda.tasks)}
                selectedIds={[]}
                emptySelectionLabel="Velg forgjengere"
              />
            </div>
            <div className="field field-span-full">
              <span>Aktiviteter som skal komme etter denne</span>
              <TaskLinkSelector
                disabled={false}
                inputName="followingTaskIds"
                options={buildTaskLinkOptions(agenda.tasks)}
                selectedIds={[]}
                emptySelectionLabel="Velg etterfolgere"
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
            <div className="project-dependency-summary-grid">
              <div className="agenda-summary-item">
                <span>Startaktiviteter</span>
                <strong>{dependencySummary.summary.startTasks}</strong>
              </div>
              <div className="agenda-summary-item">
                <span>Har forgjenger</span>
                <strong>{dependencySummary.summary.dependentTasks}</strong>
              </div>
              <div className="agenda-summary-item">
                <span>Forer videre</span>
                <strong>{dependencySummary.summary.influencingTasks}</strong>
              </div>
              <div className="agenda-summary-item">
                <span>Flere innganger</span>
                <strong>{dependencySummary.summary.crossLinkedTasks}</strong>
              </div>
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
                                {task.recoverySummary ? <span className="data-tag">{task.recoverySummary}</span> : null}
                                {task.toastmasterNotes ? <span className="data-tag">Manus</span> : null}
                                {renderTaskDependencyTags(task)}
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
                                  openTaskInModal(task.id);
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
                  const dependencyOptions = buildTaskLinkOptions(agenda.tasks, task.id);
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
                                {task.category && task.category !== "general" ? (
                                  <span className="data-tag">{getTaskCategoryLabel(task.category)}</span>
                                ) : null}
                                {task.bufferSummary ? <span className="data-tag">{task.bufferSummary}</span> : null}
                                {task.recoverySummary ? <span className="data-tag">{task.recoverySummary}</span> : null}
                                {task.toastmasterNotes ? <span className="data-tag">Manus</span> : null}
                                {renderTaskDependencyTags(task)}
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
                                {task.bufferSummary ? (
                                  <span>
                                    <strong>Buffer:</strong> {task.bufferSummary}
                                  </span>
                                ) : null}
                                {task.recoverySummary ? (
                                  <span>
                                    <strong>Live-regler:</strong> {task.recoverySummary}
                                  </span>
                                ) : null}
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
                                      min="0"
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
                                <label className="field field-span-full">
                                  <span>Toastmaster-notat / manus</span>
                                  <textarea
                                    defaultValue={task.toastmasterNotes || ""}
                                    disabled={!viewerAccess.canManageProject}
                                    name="toastmasterNotes"
                                    placeholder="Stikkord, manus, intern instruks eller praktisk informasjon"
                                    rows={4}
                                  />
                                </label>
                                <TaskBufferSettingsFields
                                  disabled={!viewerAccess.canManageProject}
                                  planningSettings={event.planningSettings}
                                  task={task}
                                />
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
                                <TaskLinkSelector
                                  disabled={!viewerAccess.canManageProject}
                                  inputName="dependencyIds"
                                  options={dependencyOptions}
                                  selectedIds={task.dependencyIds}
                                  emptySelectionLabel="Velg forgjengere"
                                />
                              </div>
                              <div className="field">
                                <span>Aktiviteter som kommer etter denne</span>
                                <TaskLinkSelector
                                  disabled={!viewerAccess.canManageProject}
                                  inputName="followingTaskIds"
                                  options={dependencyOptions}
                                  selectedIds={followingTaskIds}
                                  emptySelectionLabel="Velg etterfolgere"
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

      {projectToolsOpen ? (
        <ModalShell
          title="Prosjektverktoy"
          body="Importer oppgaver fra Excel, last ned mal, og eksporter prosjektet til Excel, PDF eller CSV."
          onClose={closeProjectToolsModal}
        >
          <div className="stack">
            <section className="panel stack">
              <div className="panel-header-inline">
                <div>
                  <h4>Import</h4>
                  <p className="muted">
                    Bruk aktivitetskoder i malen hvis du vil koble oppgaver til overoppgaver eller avhengigheter paa en trygg maate.
                  </p>
                </div>
              </div>
              <div className="button-row">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => void handleDownloadTaskTemplate("xlsx")}
                >
                  Last ned Excel-mal
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => void handleDownloadTaskTemplate("csv")}
                >
                  Last ned CSV-mal
                </button>
              </div>
              <label className="field">
                <span>Velg fil</span>
                <input
                  accept=".csv,text/csv,.txt,.xlsx,.xls"
                  type="file"
                  onChange={(eventObject) => void handleTaskImportFileChange(eventObject)}
                />
              </label>
              {taskImportPreview ? (
                <div className="stack compact-stack">
                  <div className="overview-grid">
                    <InfoCard label="Rader" value={taskImportPreview.rows.length} />
                    <InfoCard label="Nye" value={taskImportPreview.newCount} />
                    <InfoCard label="Oppdateres" value={taskImportPreview.matchedExistingCount} />
                    <InfoCard
                      label="Varsler"
                      tone={taskImportPreview.errors.length ? "warning" : "success"}
                      value={taskImportPreview.errors.length}
                    />
                  </div>
                  {taskImportPreview.errors.length ? (
                    <div className="stack compact-stack">
                      {taskImportPreview.errors.map((errorMessage, index) => (
                        <p className="notice warning" key={`task-import-warning-${index}`}>
                          {errorMessage}
                        </p>
                      ))}
                    </div>
                  ) : null}
                  <button className="primary-button" type="button" onClick={() => void handleRunTaskImport()}>
                    Importer oppgaver
                  </button>
                </div>
              ) : null}
            </section>

            <section className="panel stack">
              <div className="panel-header-inline">
                <div>
                  <h4>Eksport</h4>
                  <p className="muted">
                    Velg format og hvilke felter som skal med i utskriften eller regnearket.
                  </p>
                </div>
              </div>
              <label className="field">
                <span>Format</span>
                <select
                  value={taskExportFormat}
                  onChange={(eventObject) => setTaskExportFormat(eventObject.currentTarget.value)}
                >
                  {PROJECT_TASK_EXPORT_FORMAT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="tag-list">
                {PROJECT_TASK_FIELD_OPTIONS.map((field) => (
                  <label className="dependency-chip" key={`task-export-field-${field.key}`}>
                    <input
                      checked={taskExportFieldKeys.includes(field.key)}
                      type="checkbox"
                      onChange={() => handleToggleTaskExportField(field.key)}
                    />
                    <span>{field.label}</span>
                  </label>
                ))}
              </div>
              <button className="primary-button" type="button" onClick={() => void handleDownloadTaskExport()}>
                Eksporter prosjektoppgaver
              </button>
            </section>

            {projectToolStatus ? <p className="notice success">{projectToolStatus}</p> : null}
          </div>
        </ModalShell>
      ) : null}

      {activeTaskModalTask ? (
        <ModalShell
          title={activeTaskModalTask.title || "Aktivitet"}
          body="Se og rediger oppgaven i et eget kort uten aa forlate listevisningen."
          onClose={closeTaskModal}
        >
          {renderTaskModalContent(activeTaskModalTask)}
        </ModalShell>
      ) : null}
    </div>
  );
}

function HospitalityPlanPanel({ event, viewerAccess, onSaveHospitalityPlan }) {
  const hospitalityBriefs = useMemo(() => buildHospitalityBriefs(event), [event]);
  const [focusedBriefView, setFocusedBriefView] = useState("");

  async function handleDownloadHospitalityPdf(focus = "combined") {
    try {
      const { PDFDocument, StandardFonts } = await import("pdf-lib");
      const pdfDocument = await PDFDocument.create();
      const regularFont = await pdfDocument.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDocument.embedFont(StandardFonts.HelveticaBold);
      const lines = buildHospitalityBriefPdfLines(event, hospitalityBriefs, focus);
      const pageMargin = 48;
      const fontSize = 11;
      const lineHeight = 16;
      let page = pdfDocument.addPage([595.28, 841.89]);
      let currentY = page.getHeight() - pageMargin;
      const maxWidth = page.getWidth() - pageMargin * 2;

      lines.forEach((line, index) => {
        const isTitle = index === 0 || line === "Kjokken" || line === "Servering" || line === "Mathensyn og plassering" || line === "Bordoversikt" || line === "Servicekjoreplan" || line === "Kontakter";
        const activeFont = isTitle ? boldFont : regularFont;
        const activeSize = index === 0 ? 15 : isTitle ? 12 : fontSize;
        const wrappedLines = wrapPdfLine(line || " ", activeFont, activeSize, maxWidth);

        wrappedLines.forEach((wrappedLine) => {
          if (currentY < pageMargin) {
            page = pdfDocument.addPage([595.28, 841.89]);
            currentY = page.getHeight() - pageMargin;
          }

          page.drawText(wrappedLine, {
            x: pageMargin,
            y: currentY,
            size: activeSize,
            font: activeFont
          });
          currentY -= lineHeight;
        });
      });

      const pdfBytes = await pdfDocument.save();
      const suffix =
        focus === "kitchen" ? "kjokkenbrief" : focus === "service" ? "serveringsbrief" : "driftsbrief";
      downloadBlobFile(
        `${(event?.name || "arrangement").toLowerCase().replace(/\s+/g, "-")}-${suffix}.pdf`,
        pdfBytes,
        "application/pdf"
      );
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <section className="panel stack">
      <div className="panel-header-inline">
        <div>
          <h3>Kjokkenbrief og serveringsbrief</h3>
          <p className="muted">
            Denne delen samler det kjokken og serveringspersonell trenger, bygget oppaa gjesteliste,
            sitteplan og intern agenda.
          </p>
        </div>
        <div className="project-chip-row">
          <span className="role-pill">{hospitalityBriefs.guestCounts.accepted} bekreftet</span>
          {hospitalityBriefs.dietaryGuests.length ? (
            <span className="data-tag warning-tag">
              {hospitalityBriefs.dietaryGuests.length} med mathensyn
            </span>
          ) : (
            <span className="data-tag success-tag">Ingen mathensyn registrert</span>
          )}
          {hospitalityBriefs.tableRows.length ? (
            <span className="data-tag">{hospitalityBriefs.tableRows.length} bord i drift</span>
          ) : null}
        </div>
      </div>
      <div className="overview-grid">
        <InfoCard label="Totalt invitert" value={hospitalityBriefs.guestCounts.total} />
        <InfoCard label="Kommer" value={hospitalityBriefs.guestCounts.accepted} tone="success" />
        <InfoCard label="Kanskje / venter" value={hospitalityBriefs.guestCounts.maybe + hospitalityBriefs.guestCounts.pending} tone="warning" />
        <InfoCard label="Seter i planen" value={hospitalityBriefs.seatingSummary.seatsTotal} />
      </div>
      <section className="panel stack nested-panel">
        <div className="panel-header-inline">
          <div>
            <h4>Driftsvisninger</h4>
            <p className="muted">
              Aapne fokuserte visninger for kjokken eller servering, eller eksporter alt som PDF.
            </p>
          </div>
        </div>
        <div className="button-row">
          <button className="secondary-button" type="button" onClick={() => setFocusedBriefView("kitchen")}>
            Aapne kjokkenvisning
          </button>
          <button className="secondary-button" type="button" onClick={() => setFocusedBriefView("service")}>
            Aapne serveringsvisning
          </button>
          <button className="secondary-button" type="button" onClick={() => void handleDownloadHospitalityPdf("combined")}>
            Eksporter samlet PDF
          </button>
          <button className="secondary-button" type="button" onClick={() => void handleDownloadHospitalityPdf("kitchen")}>
            Kjokken PDF
          </button>
          <button className="secondary-button" type="button" onClick={() => void handleDownloadHospitalityPdf("service")}>
            Servering PDF
          </button>
        </div>
      </section>
      <form className="stack" key={`${event.id}-hospitality-plan`} onSubmit={onSaveHospitalityPlan}>
        <div className="compact-grid">
          <label className="field">
            <span>Hovedkontakt for drift</span>
            <input
              defaultValue={event.hospitalityPlan.shared.hostContactName}
              disabled={!viewerAccess.canManagePlanning}
              name="hostContactName"
              placeholder="Navn"
            />
          </label>
          <label className="field">
            <span>Telefon hovedkontakt</span>
            <input
              defaultValue={event.hospitalityPlan.shared.hostContactPhone}
              disabled={!viewerAccess.canManagePlanning}
              name="hostContactPhone"
              placeholder="+47 ..."
            />
          </label>
          <label className="field">
            <span>Lokale-kontakt</span>
            <input
              defaultValue={event.hospitalityPlan.shared.venueContactName}
              disabled={!viewerAccess.canManagePlanning}
              name="venueContactName"
              placeholder="Navn"
            />
          </label>
          <label className="field">
            <span>Telefon lokale</span>
            <input
              defaultValue={event.hospitalityPlan.shared.venueContactPhone}
              disabled={!viewerAccess.canManagePlanning}
              name="venueContactPhone"
              placeholder="+47 ..."
            />
          </label>
          <label className="field">
            <span>Lås endelig antall</span>
            <input
              defaultValue={event.hospitalityPlan.shared.finalHeadcountLockedAt}
              disabled={!viewerAccess.canManagePlanning}
              name="finalHeadcountLockedAt"
              type="datetime-local"
            />
          </label>
        </div>
        <div className="two-col">
          <article className="panel stack nested-panel">
            <div className="panel-header-inline">
              <div>
                <h4>Kjokkenbrief</h4>
                <p className="muted">
                  Hvem leder kjokkenet, meny, produksjon, utstyr og leveranser.
                </p>
              </div>
            </div>
            <div className="compact-grid">
              <label className="field">
                <span>Kjokkenansvarlig</span>
                <input
                  defaultValue={event.hospitalityPlan.kitchen.leadName}
                  disabled={!viewerAccess.canManagePlanning}
                  name="kitchenLeadName"
                  placeholder="Navn"
                />
              </label>
              <label className="field">
                <span>Telefon kjokken</span>
                <input
                  defaultValue={event.hospitalityPlan.kitchen.leadPhone}
                  disabled={!viewerAccess.canManagePlanning}
                  name="kitchenLeadPhone"
                  placeholder="+47 ..."
                />
              </label>
              <label className="field">
                <span>Prep starter</span>
                <input
                  defaultValue={event.hospitalityPlan.kitchen.prepStartsAt}
                  disabled={!viewerAccess.canManagePlanning}
                  name="kitchenPrepStartsAt"
                  type="datetime-local"
                />
              </label>
              <label className="field">
                <span>Foerste servering</span>
                <input
                  defaultValue={event.hospitalityPlan.kitchen.serviceStartsAt}
                  disabled={!viewerAccess.canManagePlanning}
                  name="kitchenServiceStartsAt"
                  type="datetime-local"
                />
              </label>
              <label className="field field-span-full">
                <span>Meny og serveringsrekkefolge</span>
                <textarea
                  defaultValue={event.hospitalityPlan.kitchen.menuSummary}
                  disabled={!viewerAccess.canManagePlanning}
                  name="kitchenMenuSummary"
                  rows={3}
                />
              </label>
              <label className="field field-span-full">
                <span>Spesialmenyer og unntak</span>
                <textarea
                  defaultValue={event.hospitalityPlan.kitchen.specialMenus}
                  disabled={!viewerAccess.canManagePlanning}
                  name="kitchenSpecialMenus"
                  rows={3}
                />
              </label>
              <label className="field field-span-full">
                <span>Produksjonsnotater</span>
                <textarea
                  defaultValue={event.hospitalityPlan.kitchen.productionNotes}
                  disabled={!viewerAccess.canManagePlanning}
                  name="kitchenProductionNotes"
                  rows={4}
                />
              </label>
              <label className="field field-span-full">
                <span>Utstyr og lokasjon</span>
                <textarea
                  defaultValue={event.hospitalityPlan.kitchen.equipmentNotes}
                  disabled={!viewerAccess.canManagePlanning}
                  name="kitchenEquipmentNotes"
                  rows={3}
                />
              </label>
              <label className="field field-span-full">
                <span>Leveranser og mottak</span>
                <textarea
                  defaultValue={event.hospitalityPlan.kitchen.deliveryNotes}
                  disabled={!viewerAccess.canManagePlanning}
                  name="kitchenDeliveryNotes"
                  rows={3}
                />
              </label>
              <label className="field field-span-full">
                <span>Plan B ved forsinkelse</span>
                <textarea
                  defaultValue={event.hospitalityPlan.kitchen.fallbackPlan}
                  disabled={!viewerAccess.canManagePlanning}
                  name="kitchenFallbackPlan"
                  rows={3}
                />
              </label>
            </div>
          </article>
          <article className="panel stack nested-panel">
            <div className="panel-header-inline">
              <div>
                <h4>Serveringsbrief</h4>
                <p className="muted">
                  Oppdekking, serveringsform, drikke og flyt ute i salen.
                </p>
              </div>
            </div>
            <div className="compact-grid">
              <label className="field">
                <span>Serviceansvarlig</span>
                <input
                  defaultValue={event.hospitalityPlan.service.leadName}
                  disabled={!viewerAccess.canManagePlanning}
                  name="serviceLeadName"
                  placeholder="Navn"
                />
              </label>
              <label className="field">
                <span>Telefon service</span>
                <input
                  defaultValue={event.hospitalityPlan.service.leadPhone}
                  disabled={!viewerAccess.canManagePlanning}
                  name="serviceLeadPhone"
                  placeholder="+47 ..."
                />
              </label>
              <label className="field">
                <span>Serveringsform</span>
                <select
                  defaultValue={event.hospitalityPlan.service.serviceStyle}
                  disabled={!viewerAccess.canManagePlanning}
                  name="serviceStyle"
                >
                  {HOSPITALITY_SERVICE_STYLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Teamstorrelse</span>
                <input
                  defaultValue={event.hospitalityPlan.service.teamSize}
                  disabled={!viewerAccess.canManagePlanning}
                  min="0"
                  name="serviceTeamSize"
                  type="number"
                />
              </label>
              <label className="field">
                <span>Foerste servering i salen</span>
                <input
                  defaultValue={event.hospitalityPlan.service.serviceStartsAt}
                  disabled={!viewerAccess.canManagePlanning}
                  name="serviceStartsAt"
                  type="datetime-local"
                />
              </label>
              <label className="field field-span-full">
                <span>Drikkeplan</span>
                <textarea
                  defaultValue={event.hospitalityPlan.service.beveragePlan}
                  disabled={!viewerAccess.canManagePlanning}
                  name="serviceBeveragePlan"
                  rows={3}
                />
              </label>
              <label className="field field-span-full">
                <span>Bord- og flytnotater</span>
                <textarea
                  defaultValue={event.hospitalityPlan.service.tablePlanNotes}
                  disabled={!viewerAccess.canManagePlanning}
                  name="serviceTablePlanNotes"
                  rows={3}
                />
              </label>
              <label className="field field-span-full">
                <span>Rydding mellom retter</span>
                <textarea
                  defaultValue={event.hospitalityPlan.service.clearingPlan}
                  disabled={!viewerAccess.canManagePlanning}
                  name="serviceClearingPlan"
                  rows={3}
                />
              </label>
              <label className="field field-span-full">
                <span>Kommunikasjon mot gjester</span>
                <textarea
                  defaultValue={event.hospitalityPlan.service.guestCommunicationPlan}
                  disabled={!viewerAccess.canManagePlanning}
                  name="serviceGuestCommunicationPlan"
                  rows={3}
                />
              </label>
              <label className="field field-span-full">
                <span>Avvik og eskalering</span>
                <textarea
                  defaultValue={event.hospitalityPlan.service.issueEscalationPlan}
                  disabled={!viewerAccess.canManagePlanning}
                  name="serviceIssueEscalationPlan"
                  rows={3}
                />
              </label>
              <label className="field field-span-full">
                <span>Interne servicenotater</span>
                <textarea
                  defaultValue={event.hospitalityPlan.service.notes}
                  disabled={!viewerAccess.canManagePlanning}
                  name="serviceNotes"
                  rows={3}
                />
              </label>
            </div>
          </article>
        </div>
        <div className="compact-grid">
          <label className="field field-span-full">
            <span>Mathensyn og merking</span>
            <textarea
              defaultValue={event.hospitalityPlan.shared.dietaryServiceNotes}
              disabled={!viewerAccess.canManagePlanning}
              name="dietaryServiceNotes"
              rows={3}
            />
          </label>
          <label className="field field-span-full">
            <span>Logistikk, rigg og tilgang</span>
            <textarea
              defaultValue={event.hospitalityPlan.shared.logisticsNotes}
              disabled={!viewerAccess.canManagePlanning}
              name="logisticsNotes"
              rows={3}
            />
          </label>
          <label className="field field-span-full">
            <span>Nodrutiner og avvik</span>
            <textarea
              defaultValue={event.hospitalityPlan.shared.emergencyNotes}
              disabled={!viewerAccess.canManagePlanning}
              name="emergencyNotes"
              rows={3}
            />
          </label>
        </div>
        <div className="two-col">
          <article className="panel stack nested-panel">
            <h4>Automatisk oppsummert til drift</h4>
            <ul className="compact-list hospitality-summary-list">
              <li>
                <strong>Bekreftet antall:</strong> {hospitalityBriefs.guestCounts.accepted}
              </li>
              <li>
                <strong>Kanskje / venter:</strong>{" "}
                {hospitalityBriefs.guestCounts.maybe + hospitalityBriefs.guestCounts.pending}
              </li>
              <li>
                <strong>Bord / stasjoner:</strong> {hospitalityBriefs.seatingSummary.tableCount}
              </li>
              <li>
                <strong>Seter totalt:</strong> {hospitalityBriefs.seatingSummary.seatsTotal}
              </li>
              <li>
                <strong>Tildelte seter:</strong> {hospitalityBriefs.seatingSummary.assignedSeats}
              </li>
            </ul>
            {hospitalityBriefs.seatingSummary.itemLabels.length ? (
              <ul className="compact-list hospitality-inline-list">
                {hospitalityBriefs.seatingSummary.itemLabels.map((item) => (
                  <li key={`seating-${item.id}`}>
                    <span>{item.label}</span>
                    <strong>{item.seatCount} plasser</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Ingen bord eller stoler med plasser er lagt inn enda.</p>
            )}
          </article>
          <article className="panel stack nested-panel">
            <h4>Mathensyn fra gjestelisten</h4>
            {hospitalityBriefs.dietaryGuests.length ? (
              <ul className="compact-list hospitality-inline-list">
                {hospitalityBriefs.dietaryGuests.map((guest) => (
                  <li key={`dietary-${guest.id}`}>
                    <div className="compact-list-main">
                      <strong>{guest.name}</strong>
                      <small className="muted">
                        {[
                          guest.placementLabel,
                          guest.allergies,
                          guest.dietaryNotes,
                          guest.seatingNote
                        ]
                          .filter(Boolean)
                          .join(" · ") || "Registrert uten detalj"}
                      </small>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Ingen allergier eller matpreferanser registrert enda.</p>
            )}
          </article>
        </div>
        <article className="panel stack nested-panel">
          <div className="panel-header-inline">
            <div>
              <h4>Bordoversikt for servering</h4>
              <p className="muted">
                Viser bekreftede per bord, vanlig meny vs spesialmat, og hvem som sitter hvor.
              </p>
            </div>
          </div>
          <HospitalityTableOverview tableRows={hospitalityBriefs.tableRows} />
        </article>
        <article className="panel stack nested-panel">
          <div className="panel-header-inline">
            <div>
              <h4>Servicekjoreplan fra agendaen</h4>
              <p className="muted">
                Bygger paa planleggingsagendaen og gir servering og kjokken ett felles tidsbilde.
              </p>
            </div>
            <span className="role-pill">{hospitalityBriefs.serviceTimeline.length}</span>
          </div>
          {hospitalityBriefs.serviceTimeline.length ? (
            <ul className="compact-list hospitality-inline-list">
              {hospitalityBriefs.serviceTimeline.map((item) => (
                <li key={`service-timeline-${item.id}`}>
                  <div className="compact-list-main">
                    <strong>
                      {item.startAt ? formatClockTime(item.startAt) : "--:--"} {item.title}
                    </strong>
                    <small className="muted">
                      {item.isGeneratedBuffer
                        ? "Systembuffer"
                        : [item.agendaComment, getTaskCategoryLabel(item.category)].filter(Boolean).join(" · ")}
                    </small>
                  </div>
                  <strong>{item.endAt ? formatClockTime(item.endAt) : "--:--"}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Ingen planlagte agendaelementer enda.</p>
          )}
        </article>
        {viewerAccess.canManagePlanning ? (
          <button className="primary-button" type="submit">
            Lagre briefene
          </button>
        ) : (
          <p className="muted">Denne delen er lesemodus for planleggingen.</p>
        )}
      </form>
      {focusedBriefView ? (
        <ModalShell
          title={focusedBriefView === "kitchen" ? "Kjokkenvisning" : "Serveringsvisning"}
          body="En fokusert driftsflate med bare den informasjonen teamet trenger paa arrangementsdagen."
          onClose={() => setFocusedBriefView("")}
        >
          <div className="stack">
            <div className="button-row">
              <button
                className="secondary-button"
                type="button"
                onClick={() => void handleDownloadHospitalityPdf(focusedBriefView)}
              >
                Eksporter denne som PDF
              </button>
            </div>
            <HospitalityFocusedView
              event={event}
              hospitalityBriefs={hospitalityBriefs}
              focus={focusedBriefView}
            />
          </div>
        </ModalShell>
      ) : null}
    </section>
  );
}

function FinancePlanningPanel({
  event,
  jobs,
  financeSummary,
  viewerAccess,
  onSaveFinancePlan,
  section = "all"
}) {
  const [draftPlan, setDraftPlan] = useState(() => normalizeFinancePlanForEditor(event.financePlan));

  useEffect(() => {
    setDraftPlan(normalizeFinancePlanForEditor(event.financePlan));
  }, [event.id, event.financePlan]);

  const financeRoom = useMemo(
    () =>
      buildFinanceControlRoom(
        {
          ...event,
          financePlan: draftPlan
        },
        jobs
      ),
    [draftPlan, event, jobs]
  );

  const plannedBudgetTotal = draftPlan.budgetItems.reduce(
    (sum, item) => sum + Number(item.plannedAmount || 0),
    0
  );
  const showBudgetSection = section === "all" || section === "budget";
  const showSupplierSection = section === "all" || section === "suppliers";
  const showLocalAiSection = section === "all" || section === "operations";
  const panelTitle =
    section === "budget"
      ? "Budsjett"
      : section === "suppliers"
        ? "Leverandorer"
        : section === "operations"
          ? "Drift og lokal AI"
          : "Budsjett, leverandorer og lokal AI-drift";
  const panelDescription =
    section === "budget"
      ? "Planlagt ramme per kostnadsomraade, sammenlignet med det som allerede er brukt i arrangementet."
      : section === "suppliers"
        ? "Hold oversikt over leverandorer, hva de skal levere, tilbud, avtalt pris og betalingsstatus."
        : section === "operations"
          ? "Styr hvordan lokal AI skal brukes sammen med Vercel-oppsettet for bilag og analyse."
          : "Denne delen bygger videre paa dagens kvitteringsmotor, forskudd og oppgjor. Her planlegger du budsjett, leverandorer og hvordan lokal AI skal brukes sammen med Vercel-oppsettet.";

  function updateBudgetItem(itemId, changes) {
    setDraftPlan((current) => ({
      ...current,
      budgetItems: current.budgetItems.map((item) =>
        item.id === itemId ? { ...item, ...changes } : item
      )
    }));
  }

  function updateSupplier(itemId, changes) {
    setDraftPlan((current) => ({
      ...current,
      suppliers: current.suppliers.map((supplier) =>
        supplier.id === itemId ? { ...supplier, ...changes } : supplier
      )
    }));
  }

  function addBudgetItem() {
    setDraftPlan((current) => ({
      ...current,
      budgetItems: [...current.budgetItems, createEmptyFinanceBudgetItem(current.budgetItems.length)]
    }));
  }

  function addSupplier() {
    setDraftPlan((current) => ({
      ...current,
      suppliers: [...current.suppliers, createEmptyFinanceSupplier(current.suppliers.length)]
    }));
  }

  function removeBudgetItem(itemId) {
    setDraftPlan((current) => ({
      ...current,
      budgetItems: current.budgetItems.filter((item) => item.id !== itemId)
    }));
  }

  function removeSupplier(itemId) {
    setDraftPlan((current) => ({
      ...current,
      suppliers: current.suppliers.filter((supplier) => supplier.id !== itemId)
    }));
  }

  function updateLocalAiOps(changes) {
    setDraftPlan((current) => ({
      ...current,
      localAiOps: {
        ...current.localAiOps,
        ...changes
      }
    }));
  }

  return (
    <section className="panel stack">
      <div className="panel-header-inline">
        <div>
          <h3>{panelTitle}</h3>
          <p className="muted">{panelDescription}</p>
        </div>
        {!viewerAccess.canManageFinance ? <span className="role-pill">Lesetilgang</span> : null}
      </div>
      <div className="overview-grid">
        <InfoCard label="Planlagt budsjett" value={formatCurrency(plannedBudgetTotal)} />
        <InfoCard label="Faktisk brukt" value={formatCurrency(financeSummary.totalUsed)} tone="success" />
        <InfoCard label="Tilbud totalt" value={formatCurrency(financeRoom.quotedSupplierTotal || 0)} />
        <InfoCard label="Avtalt hos leverandorer" value={formatCurrency(financeRoom.committedSupplierTotal)} />
        <InfoCard label="Forfaller snart" value={financeRoom.dueSoonSupplierCount} tone={financeRoom.dueSoonSupplierCount ? "warning" : "success"} />
      </div>
      <div className="two-col">
        {showBudgetSection ? (
        <article className="panel stack nested-panel">
          <div className="panel-header-inline">
            <div>
              <h4>Budsjettlinjer</h4>
              <p className="muted">
                Planlagt ramme per kostnadsomraade. Faktisk brukt hentes fra eksisterende kvitterings- og
                fakturalogg der det finnes treff.
              </p>
            </div>
            {viewerAccess.canManageFinance ? (
              <button className="secondary-button task-inline-button" type="button" onClick={addBudgetItem}>
                Legg til budsjettlinje
              </button>
            ) : null}
          </div>
          {draftPlan.budgetItems.length ? (
            <div className="stack finance-plan-list">
              {draftPlan.budgetItems.map((item) => {
                const summaryRow = financeRoom.budgetRows.find((row) => row.id === item.id);

                return (
                  <article className="finance-plan-row" key={`budget-${item.id}`}>
                    <div className="compact-grid">
                      <label className="field">
                        <span>Navn</span>
                        <input
                          value={item.label}
                          disabled={!viewerAccess.canManageFinance}
                          onChange={(eventObject) =>
                            updateBudgetItem(item.id, { label: eventObject.currentTarget.value })
                          }
                        />
                      </label>
                      <label className="field">
                        <span>Kategori</span>
                        <select
                          value={item.categoryKey}
                          disabled={!viewerAccess.canManageFinance}
                          onChange={(eventObject) =>
                            updateBudgetItem(item.id, { categoryKey: eventObject.currentTarget.value })
                          }
                        >
                          {FINANCE_CATEGORY_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span>Planlagt belop</span>
                        <input
                          value={item.plannedAmount}
                          disabled={!viewerAccess.canManageFinance}
                          min="0"
                          step="0.01"
                          type="number"
                          onChange={(eventObject) =>
                            updateBudgetItem(item.id, {
                              plannedAmount: Number(eventObject.currentTarget.value || 0)
                            })
                          }
                        />
                      </label>
                      <label className="field field-span-full">
                        <span>Notat</span>
                        <input
                          value={item.notes}
                          disabled={!viewerAccess.canManageFinance}
                          onChange={(eventObject) =>
                            updateBudgetItem(item.id, { notes: eventObject.currentTarget.value })
                          }
                        />
                      </label>
                    </div>
                    <div className="project-chip-row finance-plan-meta">
                      <span className="data-tag">Faktisk {formatCurrency(summaryRow?.actualAmount || 0)}</span>
                      <span className={`data-tag ${(summaryRow?.varianceAmount || 0) >= 0 ? "success-tag" : "warning-tag"}`}>
                        Avvik {formatCurrency(summaryRow?.varianceAmount || 0)}
                      </span>
                      {viewerAccess.canManageFinance ? (
                        <button
                          className="danger-button compact-action-button"
                          type="button"
                          onClick={() => removeBudgetItem(item.id)}
                        >
                          Slett
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="muted">Ingen budsjettlinjer lagt inn enda.</p>
          )}
          {financeRoom.actualCategoryRows.length ? (
            <div className="stack compact-stack">
              <strong>Faktisk kostnadsbilde fra dagens bilag</strong>
              <ul className="compact-list hospitality-inline-list">
                {financeRoom.actualCategoryRows.map((row) => (
                  <li key={`actual-category-${row.key}`}>
                    <span>{row.label}</span>
                    <strong>{formatCurrency(row.amount)}</strong>
                  </li>
                ))}
                {financeRoom.unplannedActualTotal ? (
                  <li>
                    <span>Brukt uten egen budsjettlinje</span>
                    <strong>{formatCurrency(financeRoom.unplannedActualTotal)}</strong>
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}
        </article>
        ) : null}
        {showSupplierSection ? (
        <article className="panel stack nested-panel">
          <div className="panel-header-inline">
            <div>
              <h4>Leverandorregister</h4>
              <p className="muted">
                Hvem som er booket, hva de koster og hva som snart forfaller.
              </p>
            </div>
            {viewerAccess.canManageFinance ? (
              <button className="secondary-button task-inline-button" type="button" onClick={addSupplier}>
                Legg til leverandor
              </button>
            ) : null}
          </div>
          {draftPlan.suppliers.length ? (
            <div className="stack finance-plan-list">
              {draftPlan.suppliers.map((supplier) => {
                const supplierSummary = financeRoom.supplierRows.find((row) => row.id === supplier.id);

                return (
                  <article className="finance-plan-row" key={`supplier-${supplier.id}`}>
                    <div className="compact-grid">
                      <label className="field">
                        <span>Leverandor</span>
                        <input
                          value={supplier.name}
                          disabled={!viewerAccess.canManageFinance}
                          onChange={(eventObject) =>
                            updateSupplier(supplier.id, { name: eventObject.currentTarget.value })
                          }
                        />
                      </label>
                      <label className="field">
                        <span>Kategori</span>
                        <select
                          value={supplier.categoryKey}
                          disabled={!viewerAccess.canManageFinance}
                          onChange={(eventObject) =>
                            updateSupplier(supplier.id, { categoryKey: eventObject.currentTarget.value })
                          }
                        >
                          {FINANCE_CATEGORY_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span>Status</span>
                        <select
                          value={supplier.status}
                          disabled={!viewerAccess.canManageFinance}
                          onChange={(eventObject) =>
                            updateSupplier(supplier.id, { status: eventObject.currentTarget.value })
                          }
                        >
                          {FINANCE_SUPPLIER_STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field field-span-full">
                        <span>Hva skal leveres</span>
                        <input
                          value={supplier.deliverySummary}
                          disabled={!viewerAccess.canManageFinance}
                          placeholder="F.eks. 3-retters middag, blomsteroppsats, DJ fra 18-01"
                          onChange={(eventObject) =>
                            updateSupplier(supplier.id, {
                              deliverySummary: eventObject.currentTarget.value
                            })
                          }
                        />
                      </label>
                      <label className="field">
                        <span>Tilbudspris</span>
                        <input
                          value={supplier.quotedAmount}
                          disabled={!viewerAccess.canManageFinance}
                          min="0"
                          step="0.01"
                          type="number"
                          onChange={(eventObject) =>
                            updateSupplier(supplier.id, {
                              quotedAmount: Number(eventObject.currentTarget.value || 0)
                            })
                          }
                        />
                      </label>
                      <label className="field">
                        <span>Avtalt pris</span>
                        <input
                          value={supplier.agreedAmount}
                          disabled={!viewerAccess.canManageFinance}
                          min="0"
                          step="0.01"
                          type="number"
                          onChange={(eventObject) =>
                            updateSupplier(supplier.id, {
                              agreedAmount: Number(eventObject.currentTarget.value || 0)
                            })
                          }
                        />
                      </label>
                      <label className="field">
                        <span>Kontaktperson</span>
                        <input
                          value={supplier.contactName}
                          disabled={!viewerAccess.canManageFinance}
                          onChange={(eventObject) =>
                            updateSupplier(supplier.id, { contactName: eventObject.currentTarget.value })
                          }
                        />
                      </label>
                      <label className="field">
                        <span>E-post</span>
                        <input
                          value={supplier.email}
                          disabled={!viewerAccess.canManageFinance}
                          type="email"
                          onChange={(eventObject) =>
                            updateSupplier(supplier.id, { email: eventObject.currentTarget.value })
                          }
                        />
                      </label>
                      <label className="field">
                        <span>Telefon</span>
                        <input
                          value={supplier.phone}
                          disabled={!viewerAccess.canManageFinance}
                          onChange={(eventObject) =>
                            updateSupplier(supplier.id, { phone: eventObject.currentTarget.value })
                          }
                        />
                      </label>
                      <label className="field">
                        <span>Forfallsdato</span>
                        <input
                          value={supplier.paymentDueAt}
                          disabled={!viewerAccess.canManageFinance}
                          type="datetime-local"
                          onChange={(eventObject) =>
                            updateSupplier(supplier.id, { paymentDueAt: eventObject.currentTarget.value })
                          }
                        />
                      </label>
                      <label className="field field-span-full">
                        <span>Notat</span>
                        <input
                          value={supplier.notes}
                          disabled={!viewerAccess.canManageFinance}
                          onChange={(eventObject) =>
                            updateSupplier(supplier.id, { notes: eventObject.currentTarget.value })
                          }
                        />
                      </label>
                    </div>
                    <div className="project-chip-row finance-plan-meta">
                      <span className="data-tag">{getFinanceSupplierStatusLabel(supplier.status)}</span>
                      {supplier.quotedAmount ? (
                        <span className="data-tag">Tilbud {formatCurrency(supplier.quotedAmount)}</span>
                      ) : null}
                      <span className="data-tag">Bilag {supplierSummary?.matchedReceiptCount || 0}</span>
                      <span className="data-tag">Faktisk {formatCurrency(supplierSummary?.actualAmount || 0)}</span>
                      {supplierSummary?.dueSoon ? <span className="data-tag warning-tag">Forfaller snart</span> : null}
                      {viewerAccess.canManageFinance ? (
                        <button
                          className="danger-button compact-action-button"
                          type="button"
                          onClick={() => removeSupplier(supplier.id)}
                        >
                          Slett
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="muted">Ingen leverandorer registrert enda.</p>
          )}
        </article>
        ) : null}
      </div>
      {showLocalAiSection ? (
      <article className="panel stack nested-panel">
        <div className="panel-header-inline">
          <div>
            <h4>Lokal AI i Vercel-oppsettet</h4>
            <p className="muted">
              Vercel-versjonen sender bilag til ko. Din egen maskin kan fortsatt sta for bildeanalyse
              ved aa kjore Ollama og worker lokalt mot samme Supabase-prosjekt.
            </p>
          </div>
          <span className="role-pill">{getLocalAiModeLabel(draftPlan.localAiOps.mode)}</span>
        </div>
        <div className="compact-grid">
          <label className="field">
            <span>Driftsmodus</span>
            <select
              value={draftPlan.localAiOps.mode}
              disabled={!viewerAccess.canManageFinance}
              onChange={(eventObject) => updateLocalAiOps({ mode: eventObject.currentTarget.value })}
            >
              {LOCAL_AI_MODE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Maskin / ansvarlig node</span>
            <input
              value={draftPlan.localAiOps.machineLabel}
              disabled={!viewerAccess.canManageFinance}
              placeholder="F.eks. Mac mini i stuen"
              onChange={(eventObject) => updateLocalAiOps({ machineLabel: eventObject.currentTarget.value })}
            />
          </label>
          <label className="field">
            <span>Worker-kommando</span>
            <input
              value={draftPlan.localAiOps.workerCommand}
              disabled={!viewerAccess.canManageFinance}
              onChange={(eventObject) => updateLocalAiOps({ workerCommand: eventObject.currentTarget.value })}
            />
          </label>
          <label className="field">
            <span>Bridge-kommando</span>
            <input
              value={draftPlan.localAiOps.bridgeCommand}
              disabled={!viewerAccess.canManageFinance}
              onChange={(eventObject) => updateLocalAiOps({ bridgeCommand: eventObject.currentTarget.value })}
            />
          </label>
          <label className="field field-span-full">
            <span>Driftsnotater</span>
            <textarea
              value={draftPlan.localAiOps.notes}
              disabled={!viewerAccess.canManageFinance}
              rows={3}
              onChange={(eventObject) => updateLocalAiOps({ notes: eventObject.currentTarget.value })}
            />
          </label>
        </div>
        <p className="notice">
          Anbefalt flyt i produksjon: <code>RECEIPT_PROCESSING_MODE=queue</code> i Vercel, saa
          kjores <code>npm run ai:serve</code> og <code>{draftPlan.localAiOps.workerCommand || "npm run worker:watch"}</code> paa din egen maskin.
          Hvis du vil ha lokal helsesjekk separat, kan du ogsaa bruke <code>{draftPlan.localAiOps.bridgeCommand || "npm run ai:bridge"}</code>.
        </p>
        {viewerAccess.canManageFinance ? (
          <button className="primary-button" type="button" onClick={() => void onSaveFinancePlan(draftPlan)}>
            Lagre budsjett og driftsoppsett
          </button>
        ) : (
          <p className="muted">Denne delen er lesemodus for fakturadelen.</p>
        )}
      </article>
      ) : null}
    </section>
  );
}

function PlanningTab({
  event,
  viewerAccess,
  onSaveOverview,
  onSavePlanningSettings,
  onSaveHospitalityPlan,
  onUpdateTaskLiveState
}) {
  const [planningWorkspaceView, setPlanningWorkspaceView] = useState("overview");
  const planningAgenda = buildPlanningAgenda(event);
  const liveAgenda = buildLiveAgenda(event);
  const agendaHighlightGroups = [];
  let currentAgendaGroup = null;

  planningAgenda.items.forEach((task) => {
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

  const liveAgendaGroups = [];
  const liveOpenItems = liveAgenda.items.filter(
    (item) => item.liveStatus !== "done" && item.liveStatus !== "skipped"
  );
  const liveCompletedItems = liveAgenda.items
    .filter((item) => item.liveStatus === "done" || item.liveStatus === "skipped")
    .sort((left, right) => {
      const leftMoment =
        left.actualEndMs ??
        left.scheduledEndMs ??
        left.timelineEndMs ??
        left.actualStartMs ??
        left.scheduledStartMs ??
        0;
      const rightMoment =
        right.actualEndMs ??
        right.scheduledEndMs ??
        right.timelineEndMs ??
        right.actualStartMs ??
        right.scheduledStartMs ??
        0;

      return rightMoment - leftMoment;
    });
  let currentLiveAgendaGroup = null;

  liveOpenItems.forEach((item) => {
    const groupKey = item.displayStartAt ? String(item.displayStartAt).slice(0, 10) : "__missing_date";

    if (!currentLiveAgendaGroup || currentLiveAgendaGroup.key !== groupKey) {
      currentLiveAgendaGroup = {
        key: groupKey,
        label: formatAgendaGroupDate(item.displayStartAt),
        items: []
      };
      liveAgendaGroups.push(currentLiveAgendaGroup);
    }

    currentLiveAgendaGroup.items.push(item);
  });

  async function handleStartLiveTask(task) {
    if (!viewerAccess.canManagePlanning || !task || task.isGeneratedBuffer) {
      return;
    }

    const nowValue = toCurrentDateTimeLocalString();
    await onUpdateTaskLiveState(
      task,
      {
        liveStatus: "in_progress",
        actualStartAt: nowValue,
        actualEndAt: ""
      },
      `Live agenda startet "${task.title}".`
    );
  }

  async function handleCompleteLiveTask(task) {
    if (!viewerAccess.canManagePlanning || !task || task.isGeneratedBuffer) {
      return;
    }

    const nowValue = toCurrentDateTimeLocalString();
    await onUpdateTaskLiveState(
      task,
      {
        liveStatus: "done",
        actualStartAt: task.actualStartAt || task.scheduledStartAt || nowValue,
        actualEndAt: nowValue
      },
      `"${task.title}" er markert ferdig i live agenda.`
    );
  }

  async function handleSkipLiveTask(task) {
    if (!viewerAccess.canManagePlanning || !task || task.isGeneratedBuffer) {
      return;
    }

    const nowValue = toCurrentDateTimeLocalString();
    await onUpdateTaskLiveState(
      task,
      {
        liveStatus: "skipped",
        actualEndAt: nowValue
      },
      `"${task.title}" er hoppet over i live agenda.`
    );
  }

  async function handleResetLiveTask(task) {
    if (!viewerAccess.canManagePlanning || !task || task.isGeneratedBuffer) {
      return;
    }

    await onUpdateTaskLiveState(
      task,
      {
        liveStatus: "planned",
        actualStartAt: "",
        actualEndAt: ""
      },
      `Tilbakestilte live status for "${task.title}".`
    );
  }

  function renderLiveTaskNotes(task) {
    if (
      !task ||
      task.isGeneratedBuffer ||
      (!task.isCurrent && !task.isNext && task.id !== liveAgenda.currentTask?.id)
    ) {
      return null;
    }

    const note = String(task.toastmasterNotes || "").trim();
    const description = String(task.description || "").trim();

    if (!note && !description) {
      return null;
    }

    return (
      <div className="planning-live-script">
        {note ? (
          <div className="stack compact-stack">
            <strong>Toastmaster-notat / manus</strong>
            <p>{note}</p>
          </div>
        ) : null}
        {description ? (
          <div className="stack compact-stack">
            <strong>Beskrivelse</strong>
            <p>{description}</p>
          </div>
        ) : null}
      </div>
    );
  }

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
        <div className="panel-header-inline">
          <div>
            <h3>Planlegging</h3>
            <p className="muted">
              Bytt mellom oversikt, briefs, standarder, agenda og live-kjoring for dette arrangementet.
            </p>
          </div>
        </div>
        <div className="tab-row" role="tablist" aria-label="Undermeny for planlegging">
          <button
            aria-selected={planningWorkspaceView === "overview"}
            className={`tab-chip ${planningWorkspaceView === "overview" ? "active" : ""}`}
            role="tab"
            type="button"
            onClick={() => setPlanningWorkspaceView("overview")}
          >
            Oversikt
          </button>
          <button
            aria-selected={planningWorkspaceView === "briefs"}
            className={`tab-chip ${planningWorkspaceView === "briefs" ? "active" : ""}`}
            role="tab"
            type="button"
            onClick={() => setPlanningWorkspaceView("briefs")}
          >
            Briefs
          </button>
          <button
            aria-selected={planningWorkspaceView === "standards"}
            className={`tab-chip ${planningWorkspaceView === "standards" ? "active" : ""}`}
            role="tab"
            type="button"
            onClick={() => setPlanningWorkspaceView("standards")}
          >
            Standarder
          </button>
          <button
            aria-selected={planningWorkspaceView === "agenda"}
            className={`tab-chip ${planningWorkspaceView === "agenda" ? "active" : ""}`}
            role="tab"
            type="button"
            onClick={() => setPlanningWorkspaceView("agenda")}
          >
            Agenda
          </button>
          <button
            aria-selected={planningWorkspaceView === "live"}
            className={`tab-chip ${planningWorkspaceView === "live" ? "active" : ""}`}
            role="tab"
            type="button"
            onClick={() => setPlanningWorkspaceView("live")}
          >
            Live
          </button>
        </div>
      </section>

      {planningWorkspaceView === "overview" ? (
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
          <div className="field field-span-full">
            <span>Gjestenettside</span>
            <div className="compact-grid">
              <label className="field checkbox-field">
                <span>Agenda</span>
                <span className="checkbox-inline">
                  <input
                    defaultChecked={Boolean(event.guestSite?.agendaPage?.isPublished)}
                    disabled={!viewerAccess.canManagePlanning}
                    name="publishAgendaPage"
                    type="checkbox"
                  />
                  <span>Vis agendaen i navigasjonen på gjestenettsiden</span>
                </span>
              </label>
              <label className="field">
                <span>Menynavn for agenda</span>
                <input
                  defaultValue={event.guestSite?.agendaPage?.navigationLabel || "Agenda"}
                  disabled={!viewerAccess.canManagePlanning}
                  name="agendaPageNavigationLabel"
                  placeholder="Agenda"
                />
              </label>
            </div>
          </div>
          {viewerAccess.canManagePlanning ? (
            <button className="primary-button" type="submit">
              Lagre planlegging
            </button>
          ) : (
            <p className="muted">Denne visningen er lese-modus for planleggingen.</p>
          )}
        </form>
      </section>
      ) : null}

      {planningWorkspaceView === "briefs" ? (
        <HospitalityPlanPanel
          event={event}
          viewerAccess={viewerAccess}
          onSaveHospitalityPlan={onSaveHospitalityPlan}
        />
      ) : null}

      {planningWorkspaceView === "standards" ? (
        <section className="panel stack">
        <div className="panel-header-inline">
          <div>
            <h3>Kategori-standarder</h3>
            <p className="muted">
              Her styrer du standardbuffer og live-regler per kategori for akkurat dette arrangementet.
              Oppgaver som bruker kategoriens standard arver disse verdiene automatisk.
            </p>
          </div>
          {!viewerAccess.canManagePlanning ? <span className="role-pill">Lesetilgang</span> : null}
        </div>
        <form className="stack" key={`${event.id}-planning-settings`} onSubmit={onSavePlanningSettings}>
          <TaskCategoryDefaultsEditor
            disabled={!viewerAccess.canManagePlanning}
            planningSettings={event.planningSettings}
          />
          {viewerAccess.canManagePlanning ? (
            <button className="primary-button" type="submit">
              Lagre kategori-standarder
            </button>
          ) : null}
        </form>
      </section>
      ) : null}

      {planningWorkspaceView === "agenda" ? (
        <section className="panel stack">
        <div className="panel-header-inline">
          <div>
            <h3>Vises pa agenda</h3>
            <p className="muted">
              Marker oppgaver med `Vises pa agenda` i prosjektrommet. Bufferpunkter fra hovedoppgaver
              legges ogsaa inn her, slik at intern planlegging viser reell flyt.
            </p>
          </div>
          <div className="project-chip-row">
            <span className="role-pill">{planningAgenda.total} punkter</span>
            {planningAgenda.bufferCount ? (
              <span className="data-tag">{planningAgenda.bufferCount} bufferpunkter</span>
            ) : null}
            {planningAgenda.unscheduledCount ? (
              <span className="data-tag warning-tag">
                {planningAgenda.unscheduledCount} mangler starttid
              </span>
            ) : null}
          </div>
        </div>
        {planningAgenda.total === 0 ? (
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
                        {task.isGeneratedBuffer ? (
                          <span className="data-tag">
                            {task.transitionMinutes && task.availableMinutes
                              ? `${task.transitionMinutes} min fast + ${task.availableMinutes} min tilgjengelig`
                              : task.transitionMinutes
                                ? `${task.transitionMinutes} min fast mellomrom`
                                : `${task.availableMinutes} min tilgjengelig tid`}
                          </span>
                        ) : null}
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
      ) : null}

      {planningWorkspaceView === "live" ? (
        <section className="panel stack">
        <div className="panel-header-inline">
          <div>
            <h3>Live agenda / kjoring</h3>
            <p className="muted">
              Denne visningen er laget for toastmaster eller fransier under selve arrangementet. Her ser du hva som gaar naa, hva som kommer, og om dere er foran eller bak skjema.
            </p>
          </div>
          <div className="project-chip-row">
            <span className={`role-pill live-status-pill is-${liveAgenda.statusTone}`}>
              {formatLiveDelta(liveAgenda.driftMinutes)}
            </span>
            {liveAgenda.activeTaskCount ? (
              <span className="data-tag">{liveAgenda.activeTaskCount} paagaar naa</span>
            ) : null}
            {liveAgenda.remainingTaskCount ? (
              <span className="data-tag">{liveAgenda.remainingTaskCount} igjen</span>
            ) : null}
            {liveCompletedItems.length ? (
              <span className="data-tag success-tag">{liveCompletedItems.length} gjennomfort</span>
            ) : null}
          </div>
        </div>
        <div className="overview-grid">
          <InfoCard
            label="Na paagar"
            value={liveAgenda.currentTask?.title || "Ikke startet enda"}
            tone={liveAgenda.currentTask ? "success" : "warning"}
          />
          <InfoCard
            label="Neste punkt"
            value={liveAgenda.nextTask?.title || "Ingen flere planlagte punkter"}
          />
          <InfoCard
            label="Neste faste punkt"
            value={
              liveAgenda.nextFixedTask
                ? `${liveAgenda.nextFixedTask.title} - ${formatDateTime(liveAgenda.nextFixedTask.displayStartAt)}`
                : "Ingen fast laas senere"
            }
            tone={liveAgenda.nextFixedTask ? "success" : "warning"}
          />
          <InfoCard
            label={
              liveAgenda.nextFixedTask ? "Tilgjengelig buffer" : "Planlagt buffer igjen"
            }
            value={formatDurationMinutes(Math.max(0, liveAgenda.availableBufferMinutes))}
            tone={liveAgenda.availableBufferMinutes > 0 ? "success" : "warning"}
          />
        </div>
        {liveAgenda.currentTask ? renderLiveTaskNotes(liveAgenda.currentTask) : null}
        {liveAgenda.activeTaskCount > 1 ? (
          <p className="notice warning">
            Flere aktiviteter star som paagaar samtidig. Live agenda bruker den tidligste av dem som hovedpunkt akkurat naa.
          </p>
        ) : null}
        {liveAgenda.nextFixedTask ? (
          <p className={`notice ${liveAgenda.needsCatchUpMinutes ? "warning" : "success"}`}>
            {liveAgenda.needsCatchUpMinutes
              ? `Dere maa hente inn ${formatDurationMinutes(
                  liveAgenda.needsCatchUpMinutes
                )} for aa rekke "${liveAgenda.nextFixedTask.title}" til ${formatDateTime(
                  liveAgenda.nextFixedTask.displayStartAt
                )}.`
              : `Fram til "${liveAgenda.nextFixedTask.title}" har dere ${formatDurationMinutes(
                  Math.max(0, liveAgenda.availableBufferMinutes)
                )} tilgjengelig tid. Av dette ligger ${formatDurationMinutes(
                  Math.max(0, liveAgenda.plannedBufferMinutes)
                )} som planlagt buffer i lopet.`}
          </p>
        ) : (
          <p className="notice success">
            Ingen flere faste tidspunkt senere i planen. Dere har minst{" "}
            {formatDurationMinutes(Math.max(0, liveAgenda.plannedBufferMinutes))} med planlagt buffer
            igjen i lopet.
          </p>
        )}
        {liveAgenda.recoverySuggestions?.length ? (
          <section className="planning-live-recovery stack">
            <div className="panel-header-inline">
              <div>
                <h4>Forslag for aa hente inn tid</h4>
                <p className="muted">
                  Forslagene bruker bare aktiviteter som er merket med regler for aa kortes ned eller hoppes over live.
                </p>
              </div>
              <span className="data-tag">
                {liveAgenda.recoveryCandidateCount} mulige tiltak
              </span>
            </div>
            <div className="planning-live-recovery-grid">
              {liveAgenda.recoverySuggestions.map((suggestion) => (
                <article className="planning-live-recovery-card stack" key={`recovery-${suggestion.id}`}>
                  <div className="planning-live-title-row">
                    <strong>{suggestion.title}</strong>
                    <span className={`data-tag ${suggestion.coversTarget ? "success-tag" : "warning-tag"}`}>
                      Sparer {formatDurationMinutes(suggestion.savedMinutes)}
                    </span>
                  </div>
                  <p className="muted">{suggestion.description}</p>
                  {!suggestion.coversTarget ? (
                    <p className="notice warning">
                      Denne planen henter inn {formatDurationMinutes(suggestion.savedMinutes)} og mangler fortsatt{" "}
                      {formatDurationMinutes(suggestion.remainingMinutes)}.
                    </p>
                  ) : null}
                  <ul className="compact-list">
                    {suggestion.actions.map((action) => (
                      <li className="planning-live-recovery-step" key={`${suggestion.id}-${action.type}-${action.taskId}`}>
                        <strong>{action.label}</strong>
                        <span className="muted">{action.description}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>
        ) : null}
        {liveAgenda.unscheduledCount ? (
          <p className="notice warning">
            {liveAgenda.unscheduledCount} aktiviteter mangler fortsatt starttid og vil vaere vanskeligere aa bruke live. Sett tid paa dem i Oppgaver om de skal brukes i kjoringen.
          </p>
        ) : null}
        {liveOpenItems.length === 0 ? (
          liveCompletedItems.length ? (
            <p className="notice success">
              Alle planlagte aktiviteter er na enten gjennomfort eller hoppet over. Se oversikten
              over gjennomforte oppgaver nederst.
            </p>
          ) : (
            <EmptyState
              title="Ingen aktiviteter aa kjore live enda"
              body="Legg inn oppgaver i prosjektrommet for aa bruke live agendaen."
            />
          )
        ) : (
          <div className="planning-live-groups">
            {liveAgendaGroups.map((group) => (
              <section className="planning-live-group stack" key={`live-group-${group.key}`}>
                <div className="planning-agenda-group-header">
                  <h4>{group.label}</h4>
                  <span className="role-pill">{group.items.length}</span>
                </div>
                <ul className="compact-list planning-live-list">
                  {group.items.map((item) => (
                    <li
                      className={`planning-live-item ${
                        item.isGeneratedBuffer ? "is-buffer" : ""
                      } ${item.isCurrent ? "is-current" : ""} ${item.isNext ? "is-next" : ""} ${
                        item.isScheduled ? "" : "is-unscheduled"
                      }`}
                      key={`planning-live-${item.id}`}
                    >
                      <div className="planning-live-time">
                        <strong>
                          {item.displayStartAt ? formatClockTime(item.displayStartAt) : "Ikke satt"}
                        </strong>
                        <span>
                          {item.displayEndAt
                            ? `${formatClockTime(item.displayEndAt)} slutt`
                            : "Mangler slutt"}
                        </span>
                      </div>
                      <div className="planning-live-main">
                        <div className="planning-live-title-row">
                          <strong>{item.title}</strong>
                          {item.isGeneratedBuffer ? (
                            <span className="data-tag">{formatDurationMinutes(item.durationMinutes)}</span>
                          ) : (
                            <span className="data-tag">{getTaskLiveStatusLabel(item.liveStatus)}</span>
                          )}
                          {item.isFixedTime ? <span className="data-tag">Fast punkt</span> : null}
                          {item.isCurrent ? <span className="data-tag success-tag">Na</span> : null}
                          {item.isNext ? <span className="data-tag">Neste</span> : null}
                          {!item.isGeneratedBuffer && item.liveDeltaMinutes ? (
                            <span className="data-tag warning-tag">
                              {formatLiveDelta(item.liveDeltaMinutes)}
                            </span>
                          ) : null}
                        </div>
                        <div className="planning-live-meta">
                          <span>
                            Planlagt:{" "}
                            {item.displayStartAt && item.displayEndAt
                              ? `${formatDateTime(item.displayStartAt)} - ${formatClockTime(item.displayEndAt)}`
                              : "Mangler planlagt tid"}
                          </span>
                          {!item.isGeneratedBuffer ? (
                            <span>
                              Faktisk:{" "}
                              {item.actualStartAt
                                ? `${formatDateTime(item.actualStartAt)}${
                                    item.actualEndAt
                                      ? ` - ${formatClockTime(item.actualEndAt)}`
                                      : " - paagaar"
                                  }`
                                : "Ikke startet live"}
                            </span>
                          ) : (
                            <span>
                              {item.transitionMinutes && item.availableMinutes
                                ? `${item.transitionMinutes} min fast + ${item.availableMinutes} min tilgjengelig`
                                : item.transitionMinutes
                                  ? `${item.transitionMinutes} min fast mellomrom`
                                  : `${item.availableMinutes} min tilgjengelig tid`}
                            </span>
                          )}
                        </div>
                        {item.agendaComment ? (
                          <span className="muted planning-live-comment">{item.agendaComment}</span>
                        ) : null}
                        {renderLiveTaskNotes(item)}
                      </div>
                      <div className="planning-live-actions">
                        {!item.isGeneratedBuffer && viewerAccess.canManagePlanning ? (
                          <>
                            {item.canStart ? (
                              <button
                                className="primary-button task-inline-button"
                                type="button"
                                onClick={() => void handleStartLiveTask(item)}
                              >
                                Start na
                              </button>
                            ) : null}
                            {item.canComplete ? (
                              <button
                                className="primary-button task-inline-button"
                                type="button"
                                onClick={() => void handleCompleteLiveTask(item)}
                              >
                                Marker ferdig
                              </button>
                            ) : null}
                            {item.canSkip ? (
                              <button
                                className="secondary-button task-inline-button"
                                type="button"
                                onClick={() => void handleSkipLiveTask(item)}
                              >
                                Hopp over
                              </button>
                            ) : null}
                            {item.canReset ? (
                              <button
                                className="secondary-button task-inline-button"
                                type="button"
                                onClick={() => void handleResetLiveTask(item)}
                              >
                                Nullstill
                              </button>
                            ) : null}
                          </>
                        ) : (
                          <span className="muted">
                            {item.isGeneratedBuffer ? "Systembuffer" : "Lesetilgang"}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
        {liveCompletedItems.length ? (
          <section className="panel stack nested-panel">
            <div className="panel-header-inline">
              <div>
                <h4>Gjennomforte oppgaver</h4>
                <p className="muted">
                  Her samles aktiviteter som er markert ferdig eller hoppet over, slik at hovedlisten
                  bare viser det som fortsatt er relevant live.
                </p>
              </div>
              <span className="role-pill">{liveCompletedItems.length}</span>
            </div>
            <ul className="compact-list planning-live-list">
              {liveCompletedItems.map((item) => (
                <li
                  className={`planning-live-item ${item.liveStatus === "skipped" ? "is-unscheduled" : ""}`}
                  key={`planning-live-completed-${item.id}`}
                >
                  <div className="planning-live-time">
                    <strong>
                      {item.actualEndAt
                        ? formatClockTime(item.actualEndAt)
                        : item.displayEndAt
                          ? formatClockTime(item.displayEndAt)
                          : item.displayStartAt
                            ? formatClockTime(item.displayStartAt)
                            : "Ikke satt"}
                    </strong>
                    <span>
                      {item.actualEndAt
                        ? "Ferdig"
                        : item.liveStatus === "skipped"
                          ? "Hoppet over"
                          : "Avsluttet"}
                    </span>
                  </div>
                  <div className="planning-live-main">
                    <div className="planning-live-title-row">
                      <strong>{item.title}</strong>
                      <span className={`data-tag ${item.liveStatus === "skipped" ? "warning-tag" : "success-tag"}`}>
                        {getTaskLiveStatusLabel(item.liveStatus)}
                      </span>
                    </div>
                    <div className="planning-live-meta">
                      <span>
                        Planlagt:{" "}
                        {item.displayStartAt && item.displayEndAt
                          ? `${formatDateTime(item.displayStartAt)} - ${formatClockTime(item.displayEndAt)}`
                          : "Mangler planlagt tid"}
                      </span>
                      <span>
                        Faktisk:{" "}
                        {item.actualStartAt
                          ? `${formatDateTime(item.actualStartAt)}${
                              item.actualEndAt ? ` - ${formatClockTime(item.actualEndAt)}` : ""
                            }`
                          : item.actualEndAt
                            ? formatDateTime(item.actualEndAt)
                            : "Ikke registrert"}
                      </span>
                    </div>
                    {item.agendaComment ? (
                      <span className="muted planning-live-comment">{item.agendaComment}</span>
                    ) : null}
                  </div>
                  <div className="planning-live-actions">
                    {viewerAccess.canManagePlanning && item.canReset ? (
                      <button
                        className="secondary-button task-inline-button"
                        type="button"
                        onClick={() => void handleResetLiveTask(item)}
                      >
                        Nullstill
                      </button>
                    ) : (
                      <span className="muted">Avsluttet</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </section>
      ) : null}
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
  onSaveFinancePlan,
  onOpenAdvanceModal,
  onOpenSettlementModal,
  onDeleteLedgerEntry
}) {
  const [financeWorkspaceView, setFinanceWorkspaceView] = useState("overview");
  const hospitalityBriefs = useMemo(() => buildHospitalityBriefs(event), [event]);
  const financeRoom = useMemo(() => buildFinanceControlRoom(event, jobs), [event, jobs]);
  const acceptedDietaryCount = hospitalityBriefs.dietaryGuests.filter(
    (guest) => guest.rsvpStatus === "accepted"
  ).length;
  const standardMealCount = Math.max(0, hospitalityBriefs.guestCounts.accepted - acceptedDietaryCount);
  const serviceStyleLabel =
    HOSPITALITY_SERVICE_STYLE_OPTIONS.find(
      (option) => option.value === hospitalityBriefs.service.serviceStyle
    )?.label || "Ikke satt";
  const supplierRows = useMemo(
    () =>
      [...financeRoom.supplierRows].sort((left, right) => {
        if (left.dueSoon && !right.dueSoon) {
          return -1;
        }

        if (!left.dueSoon && right.dueSoon) {
          return 1;
        }

        return String(left.name || "").localeCompare(String(right.name || ""), "nb");
      }),
    [financeRoom.supplierRows]
  );
  const supplierStatusRows = useMemo(
    () =>
      FINANCE_SUPPLIER_STATUS_OPTIONS.map((option) => ({
        ...option,
        count: supplierRows.filter((row) => row.status === option.value).length
      })).filter((row) => row.count > 0),
    [supplierRows]
  );
  const planningSection =
    financeWorkspaceView === "suppliers"
      ? "suppliers"
      : financeWorkspaceView === "operations"
        ? "operations"
        : "budget";
  const showPlanningSections = ["budget", "suppliers", "operations"].includes(financeWorkspaceView);

  useEffect(() => {
    setFinanceWorkspaceView("overview");
  }, [event.id]);

  if (!viewerAccess.canViewFinance) {
    return (
      <EmptyState
        title="Ingen okonomitilgang"
        body="Denne personen skal ikke se okonomidelen av arrangementet."
      />
    );
  }

  return (
    <div className="stack">
      <section className="panel stack">
        <div className="panel-header-inline">
          <div>
            <h3>Økonomi</h3>
            <p className="muted">
              Samlet kontrollrom for budsjett, leverandorer, fakturaer, oppgjor og lokal AI-drift.
            </p>
          </div>
        </div>
        <div className="tab-row" role="tablist" aria-label="Undermeny for okonomi">
          <button
            aria-selected={financeWorkspaceView === "overview"}
            className={`tab-chip ${financeWorkspaceView === "overview" ? "active" : ""}`}
            role="tab"
            type="button"
            onClick={() => setFinanceWorkspaceView("overview")}
          >
            Oversikt
          </button>
          <button
            aria-selected={financeWorkspaceView === "budget"}
            className={`tab-chip ${financeWorkspaceView === "budget" ? "active" : ""}`}
            role="tab"
            type="button"
            onClick={() => setFinanceWorkspaceView("budget")}
          >
            Budsjett
          </button>
          <button
            aria-selected={financeWorkspaceView === "suppliers"}
            className={`tab-chip ${financeWorkspaceView === "suppliers" ? "active" : ""}`}
            role="tab"
            type="button"
            onClick={() => setFinanceWorkspaceView("suppliers")}
          >
            Leverandorer
          </button>
          <button
            aria-selected={financeWorkspaceView === "invoices"}
            className={`tab-chip ${financeWorkspaceView === "invoices" ? "active" : ""}`}
            role="tab"
            type="button"
            onClick={() => setFinanceWorkspaceView("invoices")}
          >
            Fakturaer
          </button>
          <button
            aria-selected={financeWorkspaceView === "settlements"}
            className={`tab-chip ${financeWorkspaceView === "settlements" ? "active" : ""}`}
            role="tab"
            type="button"
            onClick={() => setFinanceWorkspaceView("settlements")}
          >
            Oppgjor
          </button>
          <button
            aria-selected={financeWorkspaceView === "operations"}
            className={`tab-chip ${financeWorkspaceView === "operations" ? "active" : ""}`}
            role="tab"
            type="button"
            onClick={() => setFinanceWorkspaceView("operations")}
          >
            Drift
          </button>
        </div>
      </section>

      {financeWorkspaceView === "overview" ? (
        <>
          <section className="panel stack">
            <div className="overview-grid">
              <InfoCard
                label="Planlagt budsjett"
                value={formatCurrency(
                  event.financePlan.budgetItems.reduce(
                    (sum, item) => sum + Number(item.plannedAmount || 0),
                    0
                  )
                )}
              />
              <InfoCard label="Tilbud totalt" value={formatCurrency(financeRoom.quotedSupplierTotal || 0)} />
              <InfoCard label="Avtalt hos leverandorer" value={formatCurrency(financeRoom.committedSupplierTotal)} />
              <InfoCard label="Kvitteringer betalt" value={formatCurrency(financeSummary.totalPaid)} />
              <InfoCard label="Totalt innbetalt" value={formatCurrency(financeSummary.totalContributed)} />
              <InfoCard label="Brukt" value={formatCurrency(financeSummary.totalUsed)} />
              <InfoCard label="Forskudd" value={formatCurrency(financeSummary.totalAdvances)} />
              <InfoCard
                label="Ubetalte leverandorer"
                value={financeRoom.unpaidSupplierCount}
                tone={financeRoom.unpaidSupplierCount ? "warning" : "success"}
              />
            </div>
            <p className="notice">
              Oversikten trekker sammen eksisterende kvitteringsflyt, budsjettlinjer, leverandorer
              og serveringsbehov. Forskudd brukes automatisk i innbetalinger og oppgjor.
            </p>
          </section>

          <section className="two-col">
            <article className="panel stack">
              <div className="panel-header-inline">
                <div>
                  <h3>Retter og servering</h3>
                  <p className="muted">
                    Praktisk oversikt over hva som skal serveres og hvor mange som trenger vanlig eller spesialmat.
                  </p>
                </div>
              </div>
              <ul className="compact-list hospitality-inline-list">
                <li>
                  <span>Serveringsform</span>
                  <strong>{serviceStyleLabel}</strong>
                </li>
                <li>
                  <span>Bekreftet antall gjester</span>
                  <strong>{hospitalityBriefs.guestCounts.accepted}</strong>
                </li>
                <li>
                  <span>Vanlig meny</span>
                  <strong>{standardMealCount}</strong>
                </li>
                <li>
                  <span>Spesialmat / allergier</span>
                  <strong>{acceptedDietaryCount}</strong>
                </li>
                <li>
                  <span>Forste servering</span>
                  <strong>
                    {formatDateTime(
                      hospitalityBriefs.service.serviceStartsAt ||
                        hospitalityBriefs.kitchen.serviceStartsAt
                    )}
                  </strong>
                </li>
              </ul>
              {hospitalityBriefs.kitchen.menuSummary ? (
                <div className="stack compact-stack">
                  <strong>Planlagte retter</strong>
                  <p style={{ whiteSpace: "pre-wrap" }}>{hospitalityBriefs.kitchen.menuSummary}</p>
                </div>
              ) : (
                <p className="muted">Ingen retter er lagt inn enda.</p>
              )}
              {hospitalityBriefs.kitchen.specialMenus ? (
                <div className="stack compact-stack">
                  <strong>Spesialmenyer og unntak</strong>
                  <p style={{ whiteSpace: "pre-wrap" }}>{hospitalityBriefs.kitchen.specialMenus}</p>
                </div>
              ) : null}
            </article>

            <article className="panel stack">
              <div className="panel-header-inline">
                <div>
                  <h3>Leverandorstatus</h3>
                  <p className="muted">
                    Se hvor mange leverandorer som er pa hvert steg, og hva som trenger oppfolging videre.
                  </p>
                </div>
              </div>
              {supplierStatusRows.length ? (
                <ul className="compact-list hospitality-inline-list">
                  {supplierStatusRows.map((row) => (
                    <li key={`supplier-status-${row.value}`}>
                      <span>{row.label}</span>
                      <strong>{row.count}</strong>
                    </li>
                  ))}
                  <li>
                    <span>Forfaller snart</span>
                    <strong>{financeRoom.dueSoonSupplierCount}</strong>
                  </li>
                </ul>
              ) : (
                <p className="muted">Ingen leverandorer registrert ennå.</p>
              )}
            </article>
          </section>

          <section className="panel stack">
            <div className="panel-header-inline">
              <div>
                <h3>Leverandorer og leveranser</h3>
                <p className="muted">
                  Hvem som skal levere hva, hvor langt de er i lopet, og hva som er tilbudt eller avtalt.
                </p>
              </div>
            </div>
            {supplierRows.length ? (
              <table className="mini-table">
                <thead>
                  <tr>
                    <th>Leverandor</th>
                    <th>Leverer</th>
                    <th>Status</th>
                    <th>Tilbud</th>
                    <th>Avtalt</th>
                    <th>Faktisk</th>
                    <th>Forfaller</th>
                  </tr>
                </thead>
                <tbody>
                  {supplierRows.map((supplier) => (
                    <tr key={`finance-overview-supplier-${supplier.id}`}>
                      <td>{supplier.name}</td>
                      <td>{supplier.deliverySummary || supplier.notes || "Ikke beskrevet"}</td>
                      <td>{getFinanceSupplierStatusLabel(supplier.status)}</td>
                      <td>{formatCurrency(supplier.quotedAmount || 0)}</td>
                      <td>{formatCurrency(supplier.agreedAmount || 0)}</td>
                      <td>{formatCurrency(supplier.actualAmount || 0)}</td>
                      <td>{supplier.paymentDueAt ? formatDateTime(supplier.paymentDueAt) : "Ikke satt"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="muted">Ingen leverandorer er registrert ennå.</p>
            )}
          </section>
        </>
      ) : null}

      <div hidden={!showPlanningSections}>
        <FinancePlanningPanel
          event={event}
          jobs={jobs}
          financeSummary={financeSummary}
          onSaveFinancePlan={onSaveFinancePlan}
          viewerAccess={viewerAccess}
          section={planningSection}
        />
      </div>

      {financeWorkspaceView === "invoices" ? (
        <>
          <section className="panel stack">
            <div className="panel-header-inline">
              <div>
                <h3>Fakturaer og bilag</h3>
                <p className="muted">
                  Kvitteringsmotoren, bilagene og eksporten ligger her samlet i ett arbeidsrom.
                </p>
              </div>
            </div>
            <div className="action-tile-grid">
              <ActionTile
                title="Kvitteringsmotor"
                body="Aapne hele motoren for opplasting, kontroll, fordeling og eksport av fakturaer og kvitteringer."
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

          <section className="panel stack">
            <h3>Bilag i arrangementet</h3>
            {jobs.length === 0 ? (
              <EmptyState
                title="Ingen bilag enda"
                body="Kvitteringer og fakturaer dukker opp her nar de er behandlet eller lagt inn i arrangementet."
              />
            ) : (
              <table className="mini-table">
                <thead>
                  <tr>
                    <th>Navn</th>
                    <th>Leverandor</th>
                    <th>Belop</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={`invoice-job-${job.id}`}>
                      <td>{job.original_filename || "Uten filnavn"}</td>
                      <td>{job.result?.merchantName || "Ikke tolket enda"}</td>
                      <td>{formatCurrency(job.result?.grandTotal || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      ) : null}

      {financeWorkspaceView === "settlements" ? (
        <>
          <section className="panel stack">
            <div className="panel-header-inline">
              <div>
                <h3>Oppgjor og innbetalinger</h3>
                <p className="muted">
                  Registrer forskudd, overforinger og bruk balansen til aa foresla hvem som skal betale hvem.
                </p>
              </div>
            </div>
            <div className="action-tile-grid">
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

          <section className="panel stack">
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
          </section>
        </>
      ) : null}
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
                    {submission.promotedJobId ? (
                      <span className="data-tag success-tag">I fakturamodulen</span>
                    ) : null}
                    {submission.imageOriginalFilename ? (
                      <span className="muted">{submission.imageOriginalFilename}</span>
                    ) : null}
                  </div>
                  <p>{submission.note || "Ingen kommentar."}</p>
                  {submission.approvalError ? (
                    <p className="notice warning">{submission.approvalError}</p>
                  ) : null}
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
  const [jobs, setJobs] = useState(() => initialJobs);
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
    { id: "finance", label: "Økonomi", visible: viewerAccess.canViewFinance },
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

  async function refreshJobs() {
    try {
      const response = await fetch("/api/receipts", {
        method: "GET",
        cache: "no-store"
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body?.error || "Kunne ikke hente fakturajobbene.");
      }

      setJobs(Array.isArray(body.jobs) ? body.jobs : []);
      return true;
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Kunne ikke hente fakturajobbene.");
      return false;
    }
  }

  async function handleUpdateGuestSite(guestSite, successMessage = "Gjestenettsiden ble oppdatert.") {
    const nextEvent = await patchEvent("update_guest_site", { guestSite });

    if (nextEvent) {
      setStatusMessage(successMessage);
    }

    return nextEvent;
  }

  useEffect(() => {
    if (!selectedEvent || (currentTab !== "finance" && currentTab !== "approvals")) {
      return undefined;
    }

    let cancelled = false;

    async function syncJobs() {
      try {
        const response = await fetch("/api/receipts", {
          method: "GET",
          cache: "no-store"
        });
        const body = await response.json();

        if (!response.ok || cancelled) {
          return;
        }

        setJobs(Array.isArray(body.jobs) ? body.jobs : []);
      } catch {
        // La siste kjente jobboversikt bli staende hvis bakgrunnsoppdateringen feiler.
      }
    }

    syncJobs();
    const intervalId = window.setInterval(syncJobs, 8000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [currentTab, selectedEvent]);

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
      },
      guestAgendaPage: {
        isPublished: formData.get("publishAgendaPage") === "on",
        navigationLabel: String(formData.get("agendaPageNavigationLabel") || "").trim()
      }
    });

    if (nextEvent) {
      setStatusMessage("Planleggingen ble oppdatert.");
    }
  }

  async function handleSavePlanningSettings(formEvent) {
    formEvent.preventDefault();
    if (!viewerAccess.canManagePlanning) {
      return;
    }

    const formData = new FormData(formEvent.currentTarget);
    const nextEvent = await patchEvent("update_planning_settings", {
      planningSettings: buildPlanningSettingsPayload(formData)
    });

    if (nextEvent) {
      setStatusMessage("Kategorioppsettet for buffer og live ble oppdatert.");
    }
  }

  async function handleSaveHospitalityPlan(formEvent) {
    formEvent.preventDefault();
    if (!viewerAccess.canManagePlanning) {
      return;
    }

    const formData = new FormData(formEvent.currentTarget);
    const nextEvent = await patchEvent("update_hospitality_plan", {
      hospitalityPlan: buildHospitalityPlanPayload(formData, selectedEvent?.hospitalityPlan)
    });

    if (nextEvent) {
      setStatusMessage("Kjokkenbrief og serveringsbrief ble oppdatert.");
    }
  }

  async function handleSaveFinancePlan(financePlan) {
    if (!viewerAccess.canManageFinance) {
      return null;
    }

    const nextEvent = await patchEvent("update_finance_plan", {
      financePlan
    });

    if (nextEvent) {
      setStatusMessage("Budsjett, leverandorer og lokal AI-oppsett ble oppdatert.");
    }

    return nextEvent;
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

    return nextEvent;
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

    return nextEvent;
  }

  async function handleBulkUpsertPeople(people) {
    if (!viewerAccess.canManageGuest) {
      return null;
    }

    const nextEvent = await patchEvent("bulk_upsert_people", {
      people
    });

    if (nextEvent) {
      setStatusMessage(`${people.length} personer ble lagt til eller oppdatert.`);
    }

    return nextEvent;
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
    const bufferPayload = buildTaskBufferPayload(formData, event.planningSettings);
    const nextEvent = await patchEvent("add_task", {
      task: {
        title: String(formData.get("title") || "").trim(),
        description: String(formData.get("description") || "").trim(),
        dueDate: String(formData.get("dueDate") || "").trim(),
        desiredStartAt: String(formData.get("desiredStartAt") || "").trim(),
        isFixedTime: formData.get("isFixedTime") === "on",
        showOnAgenda: formData.get("showOnAgenda") === "on",
        agendaComment: String(formData.get("agendaComment") || "").trim(),
        toastmasterNotes: String(formData.get("toastmasterNotes") || "").trim(),
        durationMinutes: parseTaskDurationInput(formData.get("durationMinutes"), 60),
        status: String(formData.get("status") || "todo"),
        subprojectId: formData.has("subprojectId")
          ? String(formData.get("subprojectId") || "").trim()
          : "",
        parentTaskId: String(formData.get("parentTaskId") || "").trim(),
        dependencyIds: collectFormList(formData, "dependencyIds"),
        followingTaskIds: collectFormList(formData, "followingTaskIds"),
        assigneeIds: collectFormList(formData, "assigneeIds"),
        ...bufferPayload
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
    const bufferPayload = buildTaskBufferPayload(formData, event.planningSettings);
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
        toastmasterNotes: viewerAccess.canManageProject
          ? String(formData.get("toastmasterNotes") || "").trim()
          : task.toastmasterNotes,
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
          ? parseTaskDurationInput(formData.get("durationMinutes"), task.durationMinutes ?? 60)
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
          : task.assigneeIds,
        category: viewerAccess.canManageProject ? bufferPayload.category : task.category,
        useCategoryBufferDefaults: viewerAccess.canManageProject
          ? bufferPayload.useCategoryBufferDefaults
          : task.useCategoryBufferDefaults,
        bufferConfig: viewerAccess.canManageProject ? bufferPayload.bufferConfig : task.bufferConfig,
        useCategoryRecoveryDefaults: viewerAccess.canManageProject
          ? bufferPayload.useCategoryRecoveryDefaults
          : task.useCategoryRecoveryDefaults,
        recoveryConfig: viewerAccess.canManageProject ? bufferPayload.recoveryConfig : task.recoveryConfig
      }
    });

    if (nextEvent) {
      setStatusMessage(`Oppdaterte oppgaven "${task.title}".`);
    }

    return nextEvent;
  }

  async function handleUpdateTaskLiveState(task, changes, successMessage = "") {
    if (!viewerAccess.canManagePlanning || !selectedEvent || !task) {
      return null;
    }

    const nextEvent = await patchEvent("update_task", {
      taskId: task.id,
      changes
    });

    if (nextEvent && successMessage) {
      setStatusMessage(successMessage);
    }

    return nextEvent;
  }

  async function handleBulkUpsertTasks(tasks) {
    if (!viewerAccess.canManageProject || !selectedEvent) {
      return null;
    }

    const nextEvent = await patchEvent("bulk_upsert_tasks", {
      tasks: Array.isArray(tasks) ? tasks : []
    });

    if (nextEvent) {
      setStatusMessage("Prosjektoppgavene er importert.");
    }

    return nextEvent;
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
    const requestedStatus = String(formData.get("status") || submission.status);
    const nextEvent = await patchEvent("update_submission", {
      submissionId: submission.id,
      changes: {
        status: requestedStatus
      }
    });

    if (nextEvent) {
      await refreshJobs();
      const updatedSubmission = nextEvent.submissions.find((candidate) => candidate.id === submission.id);
      const promotedNow =
        !!updatedSubmission?.promotedJobId && updatedSubmission.promotedJobId !== submission.promotedJobId;
      const movedToFinance =
        promotedNow &&
        (updatedSubmission.type === "receipt_upload" || updatedSubmission.type === "manual_invoice");

      if (movedToFinance) {
        setStatusMessage(`Oppdaterte "${submission.title}" og sendte den videre til fakturamodulen.`);
      } else if (
        requestedStatus === "approved" &&
        updatedSubmission?.type === "advance_contribution"
      ) {
        setStatusMessage(
          `Oppdaterte "${submission.title}". Forskudd legges fortsatt inn som egen finanspost i fakturamodulen.`
        );
      } else {
        setStatusMessage(`Oppdaterte innsendingen "${submission.title}".`);
      }
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
                  onUpdateGuestSite={handleUpdateGuestSite}
                  onSaveVenuePlan={handleSaveVenuePlan}
                  onAddGuestPage={handleAddGuestPage}
                  onAddRole={handleAddRole}
                  onAddPerson={handleAddPerson}
                  onBulkUpsertPeople={handleBulkUpsertPeople}
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
                  onBulkUpsertTasks={handleBulkUpsertTasks}
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
                  onSavePlanningSettings={handleSavePlanningSettings}
                  onSaveHospitalityPlan={handleSaveHospitalityPlan}
                  onUpdateTaskLiveState={handleUpdateTaskLiveState}
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
                  onSaveFinancePlan={handleSaveFinancePlan}
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
