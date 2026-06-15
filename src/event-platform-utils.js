import { buildEventSettlement } from "./event-settlement-utils.js";
import { roundCurrency } from "./receipt-utils.js";
import { buildTaskHierarchyDetails } from "./task-hierarchy-utils.js";
import { normalizeVenuePlan } from "./venue-layout-utils.js";

export const PERSON_TEMPLATES = {
  guest: {
    label: "Gjest",
    planningRole: "viewer",
    projectRole: "none",
    financeRole: "none",
    capabilities: {
      canCreateEvents: false,
      canSubmitReceipts: false,
      canSubmitManualInvoices: false,
      canSendToAiDirectly: false
    }
  },
  helper: {
    label: "Hjelper",
    planningRole: "viewer",
    projectRole: "helper",
    financeRole: "none",
    capabilities: {
      canCreateEvents: false,
      canSubmitReceipts: false,
      canSubmitManualInvoices: false,
      canSendToAiDirectly: false
    }
  },
  planning_manager: {
    label: "Planleggingsansvarlig",
    planningRole: "manager",
    projectRole: "manager",
    financeRole: "none",
    capabilities: {
      canCreateEvents: false,
      canSubmitReceipts: false,
      canSubmitManualInvoices: false,
      canSendToAiDirectly: false
    }
  },
  finance_member: {
    label: "Fakturamedlem",
    planningRole: "viewer",
    projectRole: "none",
    financeRole: "member",
    capabilities: {
      canCreateEvents: false,
      canSubmitReceipts: true,
      canSubmitManualInvoices: true,
      canSendToAiDirectly: false
    }
  },
  finance_manager: {
    label: "Fakturaforvalter",
    planningRole: "viewer",
    projectRole: "none",
    financeRole: "manager",
    capabilities: {
      canCreateEvents: false,
      canSubmitReceipts: true,
      canSubmitManualInvoices: true,
      canSendToAiDirectly: true
    }
  },
  co_organizer: {
    label: "Medarrangor",
    planningRole: "owner",
    projectRole: "owner",
    financeRole: "owner",
    capabilities: {
      canCreateEvents: true,
      canSubmitReceipts: true,
      canSubmitManualInvoices: true,
      canSendToAiDirectly: true
    }
  }
};

export const PLANNING_ROLE_OPTIONS = [
  { value: "none", label: "Ingen" },
  { value: "viewer", label: "Se" },
  { value: "manager", label: "Forvalte" },
  { value: "owner", label: "Fullt ansvar" }
];

export const PROJECT_ROLE_OPTIONS = [
  { value: "none", label: "Ingen" },
  { value: "helper", label: "Hjelper" },
  { value: "manager", label: "Forvalte" },
  { value: "owner", label: "Fullt ansvar" }
];

export const FINANCE_ROLE_OPTIONS = [
  { value: "none", label: "Ingen tilgang" },
  { value: "member", label: "Medlem" },
  { value: "manager", label: "Forvalter" },
  { value: "owner", label: "Fullt ansvar" }
];

export const CAPABILITY_OPTIONS = [
  { key: "canCreateEvents", label: "Kan opprette arrangementer" },
  { key: "canSubmitReceipts", label: "Kan sende inn kvittering" },
  { key: "canSubmitManualInvoices", label: "Kan lage manuell faktura" },
  { key: "canSendToAiDirectly", label: "Kan sende rett til AI" }
];

export const RSVP_OPTIONS = [
  { value: "pending", label: "Ikke svart" },
  { value: "accepted", label: "Kommer" },
  { value: "maybe", label: "Kanskje" },
  { value: "declined", label: "Kommer ikke" }
];

export const TASK_STATUS_OPTIONS = [
  { value: "todo", label: "Ikke startet" },
  { value: "in_progress", label: "Pagar" },
  { value: "blocked", label: "Venter" },
  { value: "done", label: "Ferdig" },
  { value: "canceled", label: "Avlyst" }
];

export const TASK_LIVE_STATUS_OPTIONS = [
  { value: "planned", label: "Ikke startet live" },
  { value: "in_progress", label: "Pagar na" },
  { value: "done", label: "Markert ferdig" },
  { value: "skipped", label: "Hoppet over" }
];

export const TASK_CATEGORY_OPTIONS = [
  { value: "general", label: "Generelt" },
  { value: "ceremony", label: "Vielse / fast punkt" },
  { value: "mingling", label: "Mingling" },
  { value: "dinner", label: "Middag" },
  { value: "speeches", label: "Taler" },
  { value: "transport", label: "Transport" },
  { value: "entertainment", label: "Underholdning" },
  { value: "logistics", label: "Praktisk / logistikk" }
];

export const TASK_BUFFER_PLACEMENT_OPTIONS = [
  { value: "end", label: "Legg pa slutten" },
  { value: "distributed", label: "Fordel mellom underoppgavene" }
];

export const TASK_RECOVERY_PRIORITY_OPTIONS = [
  { value: "critical", label: "Kritisk" },
  { value: "normal", label: "Vanlig" },
  { value: "optional", label: "Valgfri" }
];

export const SUBMISSION_STATUS_OPTIONS = [
  { value: "pending_approval", label: "Venter pa godkjenning" },
  { value: "approved", label: "Godkjent" },
  { value: "processing_ai", label: "Sendes til AI" },
  { value: "processed", label: "Ferdig behandlet" },
  { value: "rejected", label: "Avvist" },
  { value: "needs_changes", label: "Trenger endringer" }
];

export const GUEST_PAGE_VISIBILITY_OPTIONS = [
  { value: "open", label: "Apen" },
  { value: "guests", label: "Kun gjester" }
];

export const GUEST_PAGE_FONT_OPTIONS = [
  { value: "clean", label: "Ren sans" },
  { value: "editorial", label: "Magasin" },
  { value: "classic", label: "Klassisk serif" }
];

export const GUEST_PAGE_TEXT_SIZE_OPTIONS = [
  { value: "sm", label: "Liten" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Stor" }
];

export const GUEST_PAGE_TEXT_WEIGHT_OPTIONS = [
  { value: "regular", label: "Normal" },
  { value: "bold", label: "Fet" }
];

export const HOSPITALITY_SERVICE_STYLE_OPTIONS = [
  { value: "plated", label: "Tallerkenservering" },
  { value: "buffet", label: "Buffet" },
  { value: "family_style", label: "Fat pa bordet" },
  { value: "cocktail", label: "Staende servering" },
  { value: "mixed", label: "Blandet opplegg" }
];

export const FINANCE_CATEGORY_OPTIONS = [
  { value: "venue", label: "Lokale" },
  { value: "food_drink", label: "Mat og drikke" },
  { value: "decor", label: "Dekor og blomster" },
  { value: "photo_video", label: "Foto og video" },
  { value: "entertainment", label: "Musikk og underholdning" },
  { value: "transport", label: "Transport" },
  { value: "logistics", label: "Logistikk og innkjop" },
  { value: "attire", label: "Klaer og styling" },
  { value: "admin", label: "Administrasjon" },
  { value: "contingency", label: "Reserve og buffer" },
  { value: "uncategorized", label: "Ufordelt" }
];

export const FINANCE_SUPPLIER_STATUS_OPTIONS = [
  { value: "planned", label: "Planlagt" },
  { value: "requested", label: "Forespurt" },
  { value: "booked", label: "Booket" },
  { value: "confirmed", label: "Bekreftet" },
  { value: "invoiced", label: "Fakturert" },
  { value: "paid", label: "Betalt" },
  { value: "canceled", label: "Avlyst" }
];

export const LOCAL_AI_MODE_OPTIONS = [
  { value: "queue_worker", label: "Koblet via ko og lokal worker" },
  { value: "local_only", label: "Kun lokal analyse" },
  { value: "disabled", label: "Ikke aktiv" }
];

const DEFAULT_CAPABILITIES = {
  canCreateEvents: false,
  canSubmitReceipts: false,
  canSubmitManualInvoices: false,
  canSendToAiDirectly: false
};

const DEFAULT_OVERVIEW = {
  title: "",
  description: "",
  location: "",
  startsAt: "",
  endsAt: "",
  dressCode: "",
  practicalInfo: ""
};

const DEFAULT_PLANNING_SETTINGS = {
  categoryDefaults: {}
};

const DEFAULT_GUEST_SITE = {
  introText: "",
  navigationLabel: "Navigasjon",
  backgroundImageUrl: "",
  backgroundMode: "shell",
  navigationOrder: [],
  agendaPage: {
    isPublished: false,
    navigationLabel: "Agenda"
  }
};
const DEFAULT_GUEST_SEATING_PAGE = {
  isPublished: false,
  navigationLabel: "Sitteplan"
};
const DEFAULT_HOSPITALITY_PLAN = {
  shared: {
    hostContactName: "",
    hostContactPhone: "",
    venueContactName: "",
    venueContactPhone: "",
    finalHeadcountLockedAt: "",
    dietaryServiceNotes: "",
    logisticsNotes: "",
    emergencyNotes: ""
  },
  kitchen: {
    leadName: "",
    leadPhone: "",
    prepStartsAt: "",
    serviceStartsAt: "",
    menuSummary: "",
    specialMenus: "",
    productionNotes: "",
    equipmentNotes: "",
    deliveryNotes: "",
    fallbackPlan: ""
  },
  service: {
    leadName: "",
    leadPhone: "",
    serviceStyle: "plated",
    teamSize: 0,
    serviceStartsAt: "",
    beveragePlan: "",
    tablePlanNotes: "",
    clearingPlan: "",
    guestCommunicationPlan: "",
    issueEscalationPlan: "",
    notes: ""
  }
};
const DEFAULT_FINANCE_PLAN = {
  budgetItems: [],
  suppliers: [],
  localAiOps: {
    mode: "queue_worker",
    machineLabel: "",
    workerCommand: "npm run worker:watch",
    bridgeCommand: "npm run ai:bridge",
    notes: ""
  }
};

const DEFAULT_TASK_DURATION_MINUTES = 60;
const DEFAULT_GUEST_PAGE_ID = "guest-page-default";
const PROJECT_DUE_SOON_WINDOW_MS = 48 * 60 * 60 * 1000;
const DEFAULT_TASK_CATEGORY = "general";
const DEFAULT_TASK_BUFFER_CONFIG = {
  availableMinutes: 0,
  availablePlacement: "end",
  transitionMinutes: 0,
  label: "Buffer"
};
const DEFAULT_TASK_RECOVERY_CONFIG = {
  canShorten: false,
  minimumDurationMinutes: 0,
  canSkip: false,
  priority: "normal"
};
const TASK_CATEGORY_DEFAULTS = {
  general: {
    bufferConfig: DEFAULT_TASK_BUFFER_CONFIG,
    recoveryConfig: DEFAULT_TASK_RECOVERY_CONFIG
  },
  ceremony: {
    bufferConfig: {
      availableMinutes: 0,
      availablePlacement: "end",
      transitionMinutes: 0,
      label: "Buffer"
    },
    recoveryConfig: {
      canShorten: false,
      minimumDurationMinutes: 0,
      canSkip: false,
      priority: "critical"
    }
  },
  mingling: {
    bufferConfig: {
      availableMinutes: 15,
      availablePlacement: "end",
      transitionMinutes: 0,
      label: "Buffer"
    },
    recoveryConfig: {
      canShorten: true,
      minimumDurationMinutes: 10,
      canSkip: false,
      priority: "optional"
    }
  },
  dinner: {
    bufferConfig: {
      availableMinutes: 10,
      availablePlacement: "end",
      transitionMinutes: 0,
      label: "Pause"
    },
    recoveryConfig: {
      canShorten: true,
      minimumDurationMinutes: 30,
      canSkip: false,
      priority: "critical"
    }
  },
  speeches: {
    bufferConfig: {
      availableMinutes: 10,
      availablePlacement: "distributed",
      transitionMinutes: 2,
      label: "Pause"
    },
    recoveryConfig: {
      canShorten: true,
      minimumDurationMinutes: 3,
      canSkip: false,
      priority: "normal"
    }
  },
  transport: {
    bufferConfig: {
      availableMinutes: 10,
      availablePlacement: "end",
      transitionMinutes: 0,
      label: "Buffer"
    },
    recoveryConfig: {
      canShorten: false,
      minimumDurationMinutes: 0,
      canSkip: false,
      priority: "critical"
    }
  },
  entertainment: {
    bufferConfig: {
      availableMinutes: 5,
      availablePlacement: "distributed",
      transitionMinutes: 2,
      label: "Pause"
    },
    recoveryConfig: {
      canShorten: true,
      minimumDurationMinutes: 5,
      canSkip: true,
      priority: "optional"
    }
  },
  logistics: {
    bufferConfig: {
      availableMinutes: 5,
      availablePlacement: "end",
      transitionMinutes: 0,
      label: "Buffer"
    },
    recoveryConfig: {
      canShorten: true,
      minimumDurationMinutes: 0,
      canSkip: true,
      priority: "normal"
    }
  }
};

export function slugifySegment(value, fallback = "side") {
  const normalized = String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || fallback;
}

export function ensureUniqueSlug(baseValue, usedSlugs = new Set(), fallback = "side") {
  const baseSlug = slugifySegment(baseValue, fallback);
  let nextSlug = baseSlug;
  let counter = 2;

  while (usedSlugs.has(nextSlug)) {
    nextSlug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  usedSlugs.add(nextSlug);
  return nextSlug;
}

function normalizeRole(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function normalizeCapabilities(input) {
  return {
    ...DEFAULT_CAPABILITIES,
    ...(input && typeof input === "object" ? input : {})
  };
}

const PLANNING_ROLE_ORDER = ["none", "viewer", "manager", "owner"];
const PROJECT_ROLE_ORDER = ["none", "helper", "manager", "owner"];
const FINANCE_ROLE_ORDER = ["none", "member", "manager", "owner"];

function resolveHighestRole(currentValue, nextValue, allowedOrder, fallback = "none") {
  const currentIndex = allowedOrder.indexOf(currentValue);
  const nextIndex = allowedOrder.indexOf(nextValue);

  if (currentIndex === -1 && nextIndex === -1) {
    return fallback;
  }

  if (currentIndex === -1) {
    return nextValue;
  }

  if (nextIndex === -1) {
    return currentValue;
  }

  return nextIndex > currentIndex ? nextValue : currentValue;
}

function mergeCapabilities(...capabilitySets) {
  return capabilitySets.reduce((merged, entry) => {
    const normalized = normalizeCapabilities(entry);

    CAPABILITY_OPTIONS.forEach((option) => {
      if (normalized[option.key]) {
        merged[option.key] = true;
      }
    });

    return merged;
  }, normalizeCapabilities(null));
}

function normalizeDateTimeString(value) {
  return typeof value === "string" ? value : "";
}

function parseInteger(value, fallback) {
  const numeric = typeof value === "number" ? value : Number.parseInt(String(value || ""), 10);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return numeric;
}

function normalizeTaskDuration(value) {
  const duration = parseInteger(value, DEFAULT_TASK_DURATION_MINUTES);
  return duration >= 0 ? duration : DEFAULT_TASK_DURATION_MINUTES;
}

function normalizeTaskCategory(value) {
  return TASK_CATEGORY_OPTIONS.some((option) => option.value === value)
    ? value
    : DEFAULT_TASK_CATEGORY;
}

function normalizeTaskBufferPlacement(value) {
  return value === "distributed" ? "distributed" : "end";
}

function normalizeTaskBufferLabel(value, fallback = DEFAULT_TASK_BUFFER_CONFIG.label) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeTaskLiveStatus(value) {
  return TASK_LIVE_STATUS_OPTIONS.some((option) => option.value === value) ? value : "planned";
}

function normalizeTaskRecoveryPriority(value) {
  return TASK_RECOVERY_PRIORITY_OPTIONS.some((option) => option.value === value) ? value : "normal";
}

function normalizeTaskBufferConfig(value, fallback = DEFAULT_TASK_BUFFER_CONFIG) {
  const safeValue = value && typeof value === "object" ? value : {};
  const safeFallback = fallback && typeof fallback === "object" ? fallback : DEFAULT_TASK_BUFFER_CONFIG;

  return {
    availableMinutes: Math.max(
      0,
      parseInteger(safeValue.availableMinutes, parseInteger(safeFallback.availableMinutes, 0))
    ),
    availablePlacement: normalizeTaskBufferPlacement(
      safeValue.availablePlacement ?? safeFallback.availablePlacement
    ),
    transitionMinutes: Math.max(
      0,
      parseInteger(safeValue.transitionMinutes, parseInteger(safeFallback.transitionMinutes, 0))
    ),
    label: normalizeTaskBufferLabel(safeValue.label, normalizeTaskBufferLabel(safeFallback.label))
  };
}

function normalizeTaskRecoveryConfig(
  value,
  fallback = DEFAULT_TASK_RECOVERY_CONFIG,
  durationMinutes = DEFAULT_TASK_DURATION_MINUTES
) {
  const safeValue = value && typeof value === "object" ? value : {};
  const safeFallback = fallback && typeof fallback === "object" ? fallback : DEFAULT_TASK_RECOVERY_CONFIG;
  const safeDuration = Math.max(
    0,
    parseInteger(durationMinutes, DEFAULT_TASK_DURATION_MINUTES)
  );
  const canShorten = normalizeBooleanFlag(safeValue.canShorten ?? safeFallback.canShorten);
  const minimumDurationMinutes = Math.min(
    safeDuration,
    Math.max(
      0,
      parseInteger(
        safeValue.minimumDurationMinutes,
        parseInteger(safeFallback.minimumDurationMinutes, 0)
      )
    )
  );

  return {
    canShorten,
    minimumDurationMinutes: canShorten ? minimumDurationMinutes : safeDuration,
    canSkip: normalizeBooleanFlag(safeValue.canSkip ?? safeFallback.canSkip),
    priority: normalizeTaskRecoveryPriority(safeValue.priority ?? safeFallback.priority)
  };
}

function getBuiltInTaskCategoryDefaults(category) {
  const normalizedCategory = normalizeTaskCategory(category);
  const defaults = TASK_CATEGORY_DEFAULTS[normalizedCategory] || TASK_CATEGORY_DEFAULTS.general;

  return {
    bufferConfig: normalizeTaskBufferConfig(
      defaults.bufferConfig,
      DEFAULT_TASK_BUFFER_CONFIG
    ),
    recoveryConfig: normalizeTaskRecoveryConfig(
      defaults.recoveryConfig,
      DEFAULT_TASK_RECOVERY_CONFIG
    )
  };
}

function normalizePlanningSettings(value) {
  const safeValue = value && typeof value === "object" ? value : {};
  const sourceDefaults =
    safeValue.categoryDefaults && typeof safeValue.categoryDefaults === "object"
      ? safeValue.categoryDefaults
      : {};
  const categoryDefaults = TASK_CATEGORY_OPTIONS.reduce((currentDefaults, option) => {
    const builtInDefaults = getBuiltInTaskCategoryDefaults(option.value);
    const overrideEntry =
      sourceDefaults[option.value] && typeof sourceDefaults[option.value] === "object"
        ? sourceDefaults[option.value]
        : {};

    currentDefaults[option.value] = {
      bufferConfig: normalizeTaskBufferConfig(
        overrideEntry.bufferConfig,
        builtInDefaults.bufferConfig
      ),
      recoveryConfig: normalizeTaskRecoveryConfig(
        overrideEntry.recoveryConfig,
        builtInDefaults.recoveryConfig
      )
    };
    return currentDefaults;
  }, {});

  return {
    ...DEFAULT_PLANNING_SETTINGS,
    ...safeValue,
    categoryDefaults
  };
}

export function getTaskCategoryBufferDefaults(category, planningSettings = null) {
  const normalizedCategory = normalizeTaskCategory(category);
  const builtInDefaults = getBuiltInTaskCategoryDefaults(normalizedCategory).bufferConfig;
  const normalizedPlanningSettings = normalizePlanningSettings(planningSettings);
  const categoryDefaults = normalizedPlanningSettings.categoryDefaults[normalizedCategory];

  return normalizeTaskBufferConfig(
    categoryDefaults?.bufferConfig,
    builtInDefaults
  );
}

export function getTaskCategoryRecoveryDefaults(
  category,
  durationMinutes = DEFAULT_TASK_DURATION_MINUTES,
  planningSettings = null
) {
  const normalizedCategory = normalizeTaskCategory(category);
  const builtInDefaults = getBuiltInTaskCategoryDefaults(normalizedCategory).recoveryConfig;
  const normalizedPlanningSettings = normalizePlanningSettings(planningSettings);
  const categoryDefaults = normalizedPlanningSettings.categoryDefaults[normalizedCategory];

  return normalizeTaskRecoveryConfig(
    categoryDefaults?.recoveryConfig,
    builtInDefaults,
    durationMinutes
  );
}

export function resolveTaskBufferConfig(task, planningSettings = null) {
  const normalizedTask = task && typeof task === "object" ? task : {};
  const category = normalizeTaskCategory(normalizedTask.category);
  const useCategoryBufferDefaults = normalizedTask.useCategoryBufferDefaults !== false;
  const categoryDefaults = getTaskCategoryBufferDefaults(category, planningSettings);
  const overrideConfig = normalizeTaskBufferConfig(normalizedTask.bufferConfig, categoryDefaults);
  const effectiveConfig = useCategoryBufferDefaults ? categoryDefaults : overrideConfig;

  return {
    category,
    useCategoryBufferDefaults,
    ...effectiveConfig
  };
}

export function resolveTaskRecoveryConfig(task, planningSettings = null) {
  const normalizedTask = task && typeof task === "object" ? task : {};
  const category = normalizeTaskCategory(normalizedTask.category);
  const durationMinutes = normalizeTaskDuration(normalizedTask.durationMinutes);
  const useCategoryRecoveryDefaults = normalizedTask.useCategoryRecoveryDefaults !== false;
  const categoryDefaults = getTaskCategoryRecoveryDefaults(
    category,
    durationMinutes,
    planningSettings
  );
  const overrideConfig = normalizeTaskRecoveryConfig(
    normalizedTask.recoveryConfig,
    categoryDefaults,
    durationMinutes
  );
  const effectiveConfig = useCategoryRecoveryDefaults ? categoryDefaults : overrideConfig;

  return {
    category,
    useCategoryRecoveryDefaults,
    ...effectiveConfig
  };
}

export function buildTaskBufferSummary(value) {
  const source = value && typeof value === "object" ? value : {};
  const config =
    Object.prototype.hasOwnProperty.call(source, "bufferConfig") ||
    Object.prototype.hasOwnProperty.call(source, "category") ||
    Object.prototype.hasOwnProperty.call(source, "useCategoryBufferDefaults")
      ? resolveTaskBufferConfig(source, source.planningSettings)
      : normalizeTaskBufferConfig(source, DEFAULT_TASK_BUFFER_CONFIG);
  const parts = [];

  if (config.transitionMinutes > 0) {
    parts.push(`${config.transitionMinutes} min mellom underoppgavene`);
  }

  if (config.availableMinutes > 0) {
    parts.push(
      config.availablePlacement === "distributed"
        ? `${config.availableMinutes} min fordelt som ${config.label.toLowerCase()}`
        : `${config.availableMinutes} min ${config.label.toLowerCase()} pa slutten`
    );
  }

  if (parts.length === 0) {
    return "";
  }

  return parts.join(" · ");
}

export function buildTaskRecoverySummary(value) {
  const source = value && typeof value === "object" ? value : {};
  const config =
    Object.prototype.hasOwnProperty.call(source, "recoveryConfig") ||
    Object.prototype.hasOwnProperty.call(source, "category") ||
    Object.prototype.hasOwnProperty.call(source, "useCategoryRecoveryDefaults")
      ? resolveTaskRecoveryConfig(source, source.planningSettings)
      : normalizeTaskRecoveryConfig(source, DEFAULT_TASK_RECOVERY_CONFIG);
  const parts = [];

  if (config.canShorten) {
    parts.push(`Kan kortes ned til ${config.minimumDurationMinutes} min`);
  }

  if (config.canSkip) {
    parts.push("Kan hoppes over");
  }

  const priorityLabel =
    TASK_RECOVERY_PRIORITY_OPTIONS.find((option) => option.value === config.priority)?.label || "Vanlig";
  parts.push(`Prioritet: ${priorityLabel.toLowerCase()}`);

  return parts.join(" · ");
}

function normalizeBooleanFlag(value) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "on";
}

function normalizeGuestSiteBackgroundMode(value) {
  return value === "page" ? "page" : "shell";
}

function normalizeGuestAgendaPage(source) {
  const safeSource = source && typeof source === "object" ? source : {};

  return {
    isPublished: normalizeBooleanFlag(safeSource.isPublished),
    navigationLabel:
      typeof safeSource.navigationLabel === "string" && safeSource.navigationLabel.trim()
        ? safeSource.navigationLabel.trim()
        : DEFAULT_GUEST_SITE.agendaPage.navigationLabel
  };
}

function normalizeHospitalityServiceStyle(value) {
  return HOSPITALITY_SERVICE_STYLE_OPTIONS.some((option) => option.value === value)
    ? value
    : DEFAULT_HOSPITALITY_PLAN.service.serviceStyle;
}

function normalizeFinanceCategoryKey(value) {
  return FINANCE_CATEGORY_OPTIONS.some((option) => option.value === value)
    ? value
    : "uncategorized";
}

function normalizeFinanceSupplierStatus(value) {
  return FINANCE_SUPPLIER_STATUS_OPTIONS.some((option) => option.value === value)
    ? value
    : "planned";
}

function normalizeLocalAiMode(value) {
  return LOCAL_AI_MODE_OPTIONS.some((option) => option.value === value) ? value : "queue_worker";
}

function normalizeCurrencyAmount(value, fallback = 0) {
  const parsed =
    typeof value === "number"
      ? value
      : Number.parseFloat(String(value ?? fallback).replace(/\s/g, "").replace(",", "."));

  if (!Number.isFinite(parsed)) {
    return roundCurrency(fallback);
  }

  return roundCurrency(parsed);
}

function createBudgetItem(item, fallbackIndex = 0) {
  const normalized = item && typeof item === "object" ? item : {};

  return {
    id: typeof normalized.id === "string" ? normalized.id : "",
    label:
      typeof normalized.label === "string" && normalized.label.trim()
        ? normalized.label.trim()
        : "Ny budsjettlinje",
    categoryKey: normalizeFinanceCategoryKey(normalized.categoryKey),
    plannedAmount: normalizeCurrencyAmount(normalized.plannedAmount, 0),
    notes: typeof normalized.notes === "string" ? normalized.notes.trim() : "",
    orderIndex: Number.isFinite(normalized.orderIndex) ? normalized.orderIndex : fallbackIndex,
    created_at: normalized.created_at || new Date(0).toISOString()
  };
}

function createFinanceSupplier(supplier, fallbackIndex = 0) {
  const normalized = supplier && typeof supplier === "object" ? supplier : {};

  return {
    id: typeof normalized.id === "string" ? normalized.id : "",
    name:
      typeof normalized.name === "string" && normalized.name.trim()
        ? normalized.name.trim()
        : "Ny leverandor",
    categoryKey: normalizeFinanceCategoryKey(normalized.categoryKey),
    contactName: typeof normalized.contactName === "string" ? normalized.contactName.trim() : "",
    email: typeof normalized.email === "string" ? normalized.email.trim() : "",
    phone: typeof normalized.phone === "string" ? normalized.phone.trim() : "",
    agreedAmount: normalizeCurrencyAmount(normalized.agreedAmount, 0),
    paymentDueAt: normalizeDateTimeString(normalized.paymentDueAt),
    status: normalizeFinanceSupplierStatus(normalized.status),
    notes: typeof normalized.notes === "string" ? normalized.notes.trim() : "",
    orderIndex: Number.isFinite(normalized.orderIndex) ? normalized.orderIndex : fallbackIndex,
    created_at: normalized.created_at || new Date(0).toISOString()
  };
}

function normalizeHospitalityPlan(source) {
  const safeSource = source && typeof source === "object" ? source : {};
  const sharedSource = safeSource.shared && typeof safeSource.shared === "object" ? safeSource.shared : {};
  const kitchenSource =
    safeSource.kitchen && typeof safeSource.kitchen === "object" ? safeSource.kitchen : {};
  const serviceSource =
    safeSource.service && typeof safeSource.service === "object" ? safeSource.service : {};

  return {
    shared: {
      hostContactName: typeof sharedSource.hostContactName === "string" ? sharedSource.hostContactName.trim() : "",
      hostContactPhone:
        typeof sharedSource.hostContactPhone === "string" ? sharedSource.hostContactPhone.trim() : "",
      venueContactName:
        typeof sharedSource.venueContactName === "string" ? sharedSource.venueContactName.trim() : "",
      venueContactPhone:
        typeof sharedSource.venueContactPhone === "string" ? sharedSource.venueContactPhone.trim() : "",
      finalHeadcountLockedAt: normalizeDateTimeString(sharedSource.finalHeadcountLockedAt),
      dietaryServiceNotes:
        typeof sharedSource.dietaryServiceNotes === "string"
          ? sharedSource.dietaryServiceNotes.trim()
          : "",
      logisticsNotes:
        typeof sharedSource.logisticsNotes === "string" ? sharedSource.logisticsNotes.trim() : "",
      emergencyNotes:
        typeof sharedSource.emergencyNotes === "string" ? sharedSource.emergencyNotes.trim() : ""
    },
    kitchen: {
      leadName: typeof kitchenSource.leadName === "string" ? kitchenSource.leadName.trim() : "",
      leadPhone: typeof kitchenSource.leadPhone === "string" ? kitchenSource.leadPhone.trim() : "",
      prepStartsAt: normalizeDateTimeString(kitchenSource.prepStartsAt),
      serviceStartsAt: normalizeDateTimeString(kitchenSource.serviceStartsAt),
      menuSummary:
        typeof kitchenSource.menuSummary === "string" ? kitchenSource.menuSummary.trim() : "",
      specialMenus:
        typeof kitchenSource.specialMenus === "string" ? kitchenSource.specialMenus.trim() : "",
      productionNotes:
        typeof kitchenSource.productionNotes === "string"
          ? kitchenSource.productionNotes.trim()
          : "",
      equipmentNotes:
        typeof kitchenSource.equipmentNotes === "string"
          ? kitchenSource.equipmentNotes.trim()
          : "",
      deliveryNotes:
        typeof kitchenSource.deliveryNotes === "string" ? kitchenSource.deliveryNotes.trim() : "",
      fallbackPlan:
        typeof kitchenSource.fallbackPlan === "string" ? kitchenSource.fallbackPlan.trim() : ""
    },
    service: {
      leadName: typeof serviceSource.leadName === "string" ? serviceSource.leadName.trim() : "",
      leadPhone: typeof serviceSource.leadPhone === "string" ? serviceSource.leadPhone.trim() : "",
      serviceStyle: normalizeHospitalityServiceStyle(serviceSource.serviceStyle),
      teamSize: Math.max(0, parseInteger(serviceSource.teamSize, 0)),
      serviceStartsAt: normalizeDateTimeString(serviceSource.serviceStartsAt),
      beveragePlan:
        typeof serviceSource.beveragePlan === "string" ? serviceSource.beveragePlan.trim() : "",
      tablePlanNotes:
        typeof serviceSource.tablePlanNotes === "string"
          ? serviceSource.tablePlanNotes.trim()
          : "",
      clearingPlan:
        typeof serviceSource.clearingPlan === "string" ? serviceSource.clearingPlan.trim() : "",
      guestCommunicationPlan:
        typeof serviceSource.guestCommunicationPlan === "string"
          ? serviceSource.guestCommunicationPlan.trim()
          : "",
      issueEscalationPlan:
        typeof serviceSource.issueEscalationPlan === "string"
          ? serviceSource.issueEscalationPlan.trim()
          : "",
      notes: typeof serviceSource.notes === "string" ? serviceSource.notes.trim() : ""
    }
  };
}

function normalizeFinancePlan(source) {
  const safeSource = source && typeof source === "object" ? source : {};
  const localAiOpsSource =
    safeSource.localAiOps && typeof safeSource.localAiOps === "object" ? safeSource.localAiOps : {};

  return {
    budgetItems: Array.isArray(safeSource.budgetItems)
      ? safeSource.budgetItems
          .map((item, index) => createBudgetItem(item, index))
          .sort((left, right) => left.orderIndex - right.orderIndex)
      : [],
    suppliers: Array.isArray(safeSource.suppliers)
      ? safeSource.suppliers
          .map((supplier, index) => createFinanceSupplier(supplier, index))
          .sort((left, right) => left.orderIndex - right.orderIndex)
      : [],
    localAiOps: {
      mode: normalizeLocalAiMode(localAiOpsSource.mode),
      machineLabel:
        typeof localAiOpsSource.machineLabel === "string" ? localAiOpsSource.machineLabel.trim() : "",
      workerCommand:
        typeof localAiOpsSource.workerCommand === "string" && localAiOpsSource.workerCommand.trim()
          ? localAiOpsSource.workerCommand.trim()
          : DEFAULT_FINANCE_PLAN.localAiOps.workerCommand,
      bridgeCommand:
        typeof localAiOpsSource.bridgeCommand === "string" && localAiOpsSource.bridgeCommand.trim()
          ? localAiOpsSource.bridgeCommand.trim()
          : DEFAULT_FINANCE_PLAN.localAiOps.bridgeCommand,
      notes: typeof localAiOpsSource.notes === "string" ? localAiOpsSource.notes.trim() : ""
    }
  };
}

function uniqueIds(values, excludedId = "") {
  const seen = new Set();
  const ids = [];

  values.forEach((value) => {
    if (typeof value !== "string" || !value || value === excludedId || seen.has(value)) {
      return;
    }

    seen.add(value);
    ids.push(value);
  });

  return ids;
}

function parseDateTimeValue(value) {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function formatAgendaDateTime(value) {
  return typeof value === "string" ? value.replace("T", " kl. ") : "";
}

function toDateTimeLocalString(timestamp) {
  if (!Number.isFinite(timestamp)) {
    return "";
  }

  const date = new Date(timestamp);
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function sortTasksByAgenda(tasks) {
  return [...tasks].sort((left, right) => {
    const leftOrder = Number.isFinite(left.orderIndex) ? left.orderIndex : Number.MAX_SAFE_INTEGER;
    const rightOrder = Number.isFinite(right.orderIndex) ? right.orderIndex : Number.MAX_SAFE_INTEGER;
    const createdLeft = new Date(left.created_at || 0).getTime();
    const createdRight = new Date(right.created_at || 0).getTime();

    return (
      leftOrder - rightOrder ||
      createdLeft - createdRight ||
      left.title.localeCompare(right.title, "nb")
    );
  });
}

function compareTaskSequence(left, right) {
  const leftOrder = Number.isFinite(left?.orderIndex) ? left.orderIndex : Number.MAX_SAFE_INTEGER;
  const rightOrder = Number.isFinite(right?.orderIndex) ? right.orderIndex : Number.MAX_SAFE_INTEGER;
  const createdLeft = new Date(left?.created_at || 0).getTime();
  const createdRight = new Date(right?.created_at || 0).getTime();

  return (
    leftOrder - rightOrder ||
    createdLeft - createdRight ||
    String(left?.title || "").localeCompare(String(right?.title || ""), "nb")
  );
}

function orderTasksByHierarchy(tasks) {
  const taskList = Array.isArray(tasks) ? [...tasks] : [];
  const taskMap = new Map(taskList.map((task) => [task.id, task]));
  const childMap = new Map(taskList.map((task) => [task.id, []]));
  const rootTasks = [];

  taskList.forEach((task) => {
    if (task.parentTaskId && taskMap.has(task.parentTaskId)) {
      childMap.get(task.parentTaskId).push(task);
      return;
    }

    rootTasks.push(task);
  });

  childMap.forEach((children) => {
    children.sort(compareTaskSequence);
  });
  rootTasks.sort(compareTaskSequence);

  const orderedTasks = [];
  const visited = new Set();
  const visiting = new Set();

  function visit(task) {
    if (!task || visited.has(task.id)) {
      return;
    }

    if (visiting.has(task.id)) {
      return;
    }

    visiting.add(task.id);

    const parentTask =
      task.parentTaskId && taskMap.has(task.parentTaskId) ? taskMap.get(task.parentTaskId) : null;

    if (parentTask) {
      visit(parentTask);
    }

    if (visited.has(task.id)) {
      visiting.delete(task.id);
      return;
    }

    const dependencies = (Array.isArray(task.dependencyIds) ? task.dependencyIds : [])
      .map((dependencyId) => taskMap.get(dependencyId))
      .filter(Boolean)
      .sort(compareTaskSequence);

    dependencies.forEach((dependencyTask) => visit(dependencyTask));

    if (visited.has(task.id)) {
      visiting.delete(task.id);
      return;
    }

    orderedTasks.push(task);
    visited.add(task.id);
    (childMap.get(task.id) || []).forEach((childTask) => visit(childTask));
    visiting.delete(task.id);
  }

  rootTasks.forEach((task) => visit(task));

  taskList.forEach((task) => visit(task));

  return {
    orderedTasks,
    childMap
  };
}

function getTaskStatusLabel(status) {
  return TASK_STATUS_OPTIONS.find((option) => option.value === status)?.label || "Ikke startet";
}

function compareTaskMoments(left, right) {
  const leftTime =
    left.timelineStartMs ??
    left.scheduledStartMs ??
    left.dueDateMs ??
    Number.MAX_SAFE_INTEGER;
  const rightTime =
    right.timelineStartMs ??
    right.scheduledStartMs ??
    right.dueDateMs ??
    Number.MAX_SAFE_INTEGER;

  if (leftTime !== rightTime) {
    return leftTime - rightTime;
  }

  return (left.agendaPosition || 0) - (right.agendaPosition || 0);
}

function distributeMinutes(totalMinutes, slotCount) {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0 || !Number.isFinite(slotCount) || slotCount <= 0) {
    return [];
  }

  const baseMinutes = Math.floor(totalMinutes / slotCount);
  let remainder = totalMinutes % slotCount;

  return Array.from({ length: slotCount }, () => {
    const nextValue = baseMinutes + (remainder > 0 ? 1 : 0);

    if (remainder > 0) {
      remainder -= 1;
    }

    return nextValue;
  });
}

function compareHierarchyDisplayOrder(left, right) {
  const leftPosition = Number.isFinite(left?.agendaPosition) ? left.agendaPosition : Number.MAX_SAFE_INTEGER;
  const rightPosition = Number.isFinite(right?.agendaPosition) ? right.agendaPosition : Number.MAX_SAFE_INTEGER;

  if (leftPosition !== rightPosition) {
    return leftPosition - rightPosition;
  }

  return compareTaskMoments(left, right);
}

function templateKeyFromDirectAccess(person) {
  const directPerson = person && typeof person === "object" ? person : {};

  const match = Object.entries(PERSON_TEMPLATES).find(([, template]) => {
    return (
      normalizeRole(directPerson.planningRole, PLANNING_ROLE_ORDER, "none") === template.planningRole &&
      normalizeRole(directPerson.projectRole, PROJECT_ROLE_ORDER, "none") === template.projectRole &&
      normalizeRole(directPerson.financeRole, FINANCE_ROLE_ORDER, "none") === template.financeRole
    );
  });

  return match?.[0] || "";
}

function buildDefaultEventRoles() {
  const createdAt = new Date(0).toISOString();

  return Object.entries(PERSON_TEMPLATES).map(([key, template], index) => ({
    id: `role-${key}`,
    key,
    name: template.label,
    description: "",
    planningRole: template.planningRole,
    projectRole: template.projectRole,
    financeRole: template.financeRole,
    capabilities: normalizeCapabilities(template.capabilities),
    isSystemRole: true,
    orderIndex: index,
    created_at: createdAt
  }));
}

function normalizeEventRole(role, fallbackRole, fallbackIndex = 0) {
  const normalized = role && typeof role === "object" ? role : {};
  const fallback = fallbackRole && typeof fallbackRole === "object" ? fallbackRole : PERSON_TEMPLATES.guest;

  return {
    id:
      typeof normalized.id === "string" && normalized.id
        ? normalized.id
        : `role-${fallbackIndex + 1}`,
    key: typeof normalized.key === "string" ? normalized.key : "",
    name:
      typeof normalized.name === "string" && normalized.name.trim()
        ? normalized.name.trim()
        : fallback.label,
    description: typeof normalized.description === "string" ? normalized.description.trim() : "",
    planningRole: normalizeRole(normalized.planningRole, PLANNING_ROLE_ORDER, fallback.planningRole),
    projectRole: normalizeRole(normalized.projectRole, PROJECT_ROLE_ORDER, fallback.projectRole),
    financeRole: normalizeRole(normalized.financeRole, FINANCE_ROLE_ORDER, fallback.financeRole),
    capabilities: normalizeCapabilities(
      normalized.capabilities && typeof normalized.capabilities === "object"
        ? normalized.capabilities
        : fallback.capabilities
    ),
    isSystemRole:
      typeof normalized.isSystemRole === "boolean"
        ? normalized.isSystemRole
        : Boolean(normalized.key && PERSON_TEMPLATES[normalized.key]),
    orderIndex: Number.isFinite(normalized.orderIndex) ? normalized.orderIndex : fallbackIndex,
    created_at: normalized.created_at || new Date(0).toISOString()
  };
}

function normalizePerson(person, fallbackTemplateKey = "guest") {
  const template = PERSON_TEMPLATES[fallbackTemplateKey] || PERSON_TEMPLATES.guest;
  const normalized = person && typeof person === "object" ? person : {};

  return {
    id: typeof normalized.id === "string" ? normalized.id : "",
    name: typeof normalized.name === "string" ? normalized.name : "",
    email: typeof normalized.email === "string" ? normalized.email : "",
    phone: typeof normalized.phone === "string" ? normalized.phone : "",
    note: typeof normalized.note === "string" ? normalized.note : "",
    allergies: typeof normalized.allergies === "string" ? normalized.allergies : "",
    dietaryNotes: typeof normalized.dietaryNotes === "string" ? normalized.dietaryNotes : "",
    seatingNote: typeof normalized.seatingNote === "string" ? normalized.seatingNote : "",
    created_at: normalized.created_at || new Date(0).toISOString(),
    invitedAt: normalized.invitedAt || null,
    respondedAt: normalized.respondedAt || null,
    rsvpStatus: normalizeRole(normalized.rsvpStatus, RSVP_OPTIONS.map((option) => option.value), "pending"),
    planningRole: normalizeRole(normalized.planningRole, ["none", "viewer", "manager", "owner"], template.planningRole),
    projectRole: normalizeRole(normalized.projectRole, ["none", "helper", "manager", "owner"], template.projectRole),
    financeRole: normalizeRole(normalized.financeRole, ["none", "member", "manager", "owner"], template.financeRole),
    roleIds: uniqueIds(Array.isArray(normalized.roleIds) ? normalized.roleIds : []),
    useDirectAccessOverrides:
      typeof normalized.useDirectAccessOverrides === "boolean"
        ? normalized.useDirectAccessOverrides
        : undefined,
    capabilities: normalizeCapabilities({
      ...template.capabilities,
      ...(normalized.capabilities && typeof normalized.capabilities === "object"
        ? normalized.capabilities
        : {})
    })
  };
}

function attachRoleAccessToPerson(person, roleMap) {
  const safePerson = person && typeof person === "object" ? person : {};
  const normalizedRoleMap = roleMap instanceof Map ? roleMap : new Map();
  let roleIds = uniqueIds(Array.isArray(safePerson.roleIds) ? safePerson.roleIds : []).filter((roleId) =>
    normalizedRoleMap.has(roleId)
  );

  if (roleIds.length === 0) {
    const templateKey = templateKeyFromDirectAccess(safePerson);
    const fallbackRole = Array.from(normalizedRoleMap.values()).find((role) => role.key === templateKey);

    if (fallbackRole) {
      roleIds = [fallbackRole.id];
    }
  }

  const assignedRoles = roleIds.map((roleId) => normalizedRoleMap.get(roleId)).filter(Boolean);
  const useDirectAccessOverrides =
    typeof safePerson.useDirectAccessOverrides === "boolean"
      ? safePerson.useDirectAccessOverrides
      : roleIds.length === 0;
  const directPlanningRole = useDirectAccessOverrides
    ? normalizeRole(safePerson.planningRole, PLANNING_ROLE_ORDER, "none")
    : "none";
  const directProjectRole = useDirectAccessOverrides
    ? normalizeRole(safePerson.projectRole, PROJECT_ROLE_ORDER, "none")
    : "none";
  const directFinanceRole = useDirectAccessOverrides
    ? normalizeRole(safePerson.financeRole, FINANCE_ROLE_ORDER, "none")
    : "none";
  const effectivePlanningRole = assignedRoles.reduce(
    (currentValue, role) =>
      resolveHighestRole(currentValue, role.planningRole, PLANNING_ROLE_ORDER, "none"),
    directPlanningRole
  );
  const effectiveProjectRole = assignedRoles.reduce(
    (currentValue, role) =>
      resolveHighestRole(currentValue, role.projectRole, PROJECT_ROLE_ORDER, "none"),
    directProjectRole
  );
  const effectiveFinanceRole = assignedRoles.reduce(
    (currentValue, role) =>
      resolveHighestRole(currentValue, role.financeRole, FINANCE_ROLE_ORDER, "none"),
    directFinanceRole
  );
  const effectiveCapabilities = mergeCapabilities(
    useDirectAccessOverrides ? safePerson.capabilities : null,
    ...assignedRoles.map((role) => role.capabilities)
  );

  return {
    ...safePerson,
    roleIds,
    assignedRoles,
    useDirectAccessOverrides,
    effectivePlanningRole,
    effectiveProjectRole,
    effectiveFinanceRole,
    effectiveCapabilities
  };
}

function mergeLegacyMember(existingPerson, member) {
  const fallback = existingPerson ? "finance_member" : "finance_member";
  const merged = normalizePerson(
    {
      ...member,
      ...existingPerson,
      id: existingPerson?.id || member.id,
      name: existingPerson?.name || member.name,
      created_at: existingPerson?.created_at || member.created_at,
      financeRole:
        existingPerson?.financeRole && existingPerson.financeRole !== "none"
          ? existingPerson.financeRole
          : "member",
      capabilities: {
        canSubmitReceipts: true,
        canSubmitManualInvoices: true,
        canSendToAiDirectly: true,
        ...(existingPerson?.capabilities || {})
      }
    },
    fallback
  );

  return merged;
}

function createTask(task, fallbackIndex = 0) {
  const normalized = task && typeof task === "object" ? task : {};
  const taskId = typeof normalized.id === "string" ? normalized.id : "";
  const durationMinutes = normalizeTaskDuration(normalized.durationMinutes);
  const resolvedBufferConfig = resolveTaskBufferConfig({
    ...normalized,
    durationMinutes
  });
  const resolvedRecoveryConfig = resolveTaskRecoveryConfig({
    ...normalized,
    durationMinutes
  });

  return {
    id: taskId,
    referenceCode:
      typeof normalized.referenceCode === "string" ? normalized.referenceCode.trim() : "",
    title: typeof normalized.title === "string" ? normalized.title : "",
    description: typeof normalized.description === "string" ? normalized.description : "",
    status: normalizeRole(
      normalized.status,
      TASK_STATUS_OPTIONS.map((option) => option.value),
      "todo"
    ),
    dueDate: normalizeDateTimeString(normalized.dueDate),
    desiredStartAt: normalizeDateTimeString(normalized.desiredStartAt),
    isFixedTime: normalizeBooleanFlag(normalized.isFixedTime),
    showOnAgenda: normalizeBooleanFlag(normalized.showOnAgenda),
    agendaComment: typeof normalized.agendaComment === "string" ? normalized.agendaComment.trim() : "",
    toastmasterNotes:
      typeof normalized.toastmasterNotes === "string" ? normalized.toastmasterNotes : "",
    category: resolvedBufferConfig.category,
    useCategoryBufferDefaults: resolvedBufferConfig.useCategoryBufferDefaults,
    bufferConfig: {
      availableMinutes: resolvedBufferConfig.availableMinutes,
      availablePlacement: resolvedBufferConfig.availablePlacement,
      transitionMinutes: resolvedBufferConfig.transitionMinutes,
      label: resolvedBufferConfig.label
    },
    liveStatus: normalizeTaskLiveStatus(normalized.liveStatus),
    actualStartAt: normalizeDateTimeString(normalized.actualStartAt),
    actualEndAt: normalizeDateTimeString(normalized.actualEndAt),
    durationMinutes,
    orderIndex: Number.isFinite(normalized.orderIndex) ? normalized.orderIndex : fallbackIndex,
    useCategoryRecoveryDefaults: resolvedRecoveryConfig.useCategoryRecoveryDefaults,
    recoveryConfig: {
      canShorten: resolvedRecoveryConfig.canShorten,
      minimumDurationMinutes: resolvedRecoveryConfig.minimumDurationMinutes,
      canSkip: resolvedRecoveryConfig.canSkip,
      priority: resolvedRecoveryConfig.priority
    },
    dependencyIds: uniqueIds(
      Array.isArray(normalized.dependencyIds) ? normalized.dependencyIds : [],
      taskId
    ),
    subprojectId: typeof normalized.subprojectId === "string" ? normalized.subprojectId : "",
    parentTaskId:
      typeof normalized.parentTaskId === "string" && normalized.parentTaskId !== taskId
        ? normalized.parentTaskId
        : "",
    assigneeIds: Array.isArray(normalized.assigneeIds)
      ? uniqueIds(normalized.assigneeIds)
      : [],
    created_at: normalized.created_at || new Date(0).toISOString()
  };
}

function createSubproject(subproject, fallbackIndex = 0) {
  const normalized = subproject && typeof subproject === "object" ? subproject : {};

  return {
    id: typeof normalized.id === "string" ? normalized.id : "",
    name:
      typeof normalized.name === "string" && normalized.name.trim()
        ? normalized.name
        : "Nytt delprosjekt",
    description: typeof normalized.description === "string" ? normalized.description : "",
    orderIndex: Number.isFinite(normalized.orderIndex) ? normalized.orderIndex : fallbackIndex,
    created_at: normalized.created_at || new Date(0).toISOString()
  };
}

function createLedgerEntry(entry) {
  const normalized = entry && typeof entry === "object" ? entry : {};
  const rawAmount =
    typeof normalized.amount === "number" ? normalized.amount : Number(normalized.amount || 0);

  return {
    id: typeof normalized.id === "string" ? normalized.id : "",
    type: normalizeRole(
      normalized.type,
      ["advance_contribution", "settlement_transfer", "manual_adjustment"],
      "advance_contribution"
    ),
    memberId: typeof normalized.memberId === "string" ? normalized.memberId : "",
    counterpartyMemberId:
      typeof normalized.counterpartyMemberId === "string" ? normalized.counterpartyMemberId : "",
    amount: Number.isFinite(rawAmount) ? roundCurrency(Math.abs(rawAmount)) : 0,
    note: typeof normalized.note === "string" ? normalized.note : "",
    status: normalizeRole(normalized.status, ["approved", "pending_approval", "rejected"], "approved"),
    created_at: normalized.created_at || new Date(0).toISOString()
  };
}

function createSubmission(submission) {
  const normalized = submission && typeof submission === "object" ? submission : {};

  return {
    id: typeof normalized.id === "string" ? normalized.id : "",
    type: normalizeRole(
      normalized.type,
      ["receipt_upload", "manual_invoice", "advance_contribution"],
      "receipt_upload"
    ),
    title: typeof normalized.title === "string" ? normalized.title : "",
    submittedByPersonId:
      typeof normalized.submittedByPersonId === "string" ? normalized.submittedByPersonId : "",
    status: normalizeRole(
      normalized.status,
      SUBMISSION_STATUS_OPTIONS.map((option) => option.value),
      "pending_approval"
    ),
    note: typeof normalized.note === "string" ? normalized.note : "",
    storedImagePath:
      typeof normalized.storedImagePath === "string" ? normalized.storedImagePath : "",
    imageContentType:
      typeof normalized.imageContentType === "string" ? normalized.imageContentType : "",
    imageOriginalFilename:
      typeof normalized.imageOriginalFilename === "string" ? normalized.imageOriginalFilename : "",
    promotedJobId: typeof normalized.promotedJobId === "string" ? normalized.promotedJobId : "",
    promotedLedgerEntryId:
      typeof normalized.promotedLedgerEntryId === "string" ? normalized.promotedLedgerEntryId : "",
    promotedAt: typeof normalized.promotedAt === "string" ? normalized.promotedAt : "",
    approvalError: typeof normalized.approvalError === "string" ? normalized.approvalError : "",
    created_at: normalized.created_at || new Date(0).toISOString()
  };
}

function createFinanceMember(person) {
  return {
    id: person.id,
    name: person.name,
    created_at: person.created_at
  };
}

function createGuestPage(page, fallbackIndex = 0) {
  const normalized = page && typeof page === "object" ? page : {};

  return {
    id: typeof normalized.id === "string" ? normalized.id : "",
    slug:
      typeof normalized.slug === "string" && normalized.slug.trim()
        ? normalized.slug.trim()
        : "",
    title: typeof normalized.title === "string" && normalized.title.trim() ? normalized.title : "Ny side",
    menuLabel:
      typeof normalized.menuLabel === "string" && normalized.menuLabel.trim()
        ? normalized.menuLabel
        : typeof normalized.title === "string" && normalized.title.trim()
          ? normalized.title
          : "Ny side",
    content: typeof normalized.content === "string" ? normalized.content : "",
    visibility: normalizeRole(
      normalized.visibility,
      GUEST_PAGE_VISIBILITY_OPTIONS.map((option) => option.value),
      "open"
    ),
    fontPreset: normalizeRole(
      normalized.fontPreset,
      GUEST_PAGE_FONT_OPTIONS.map((option) => option.value),
      "clean"
    ),
    textSize: normalizeRole(
      normalized.textSize,
      GUEST_PAGE_TEXT_SIZE_OPTIONS.map((option) => option.value),
      "md"
    ),
    textWeight: normalizeRole(
      normalized.textWeight,
      GUEST_PAGE_TEXT_WEIGHT_OPTIONS.map((option) => option.value),
      "regular"
    ),
    showImageCaption: Boolean(normalized.showImageCaption),
    orderIndex: Number.isFinite(normalized.orderIndex) ? normalized.orderIndex : fallbackIndex,
    created_at: normalized.created_at || new Date(0).toISOString(),
    updated_at: normalized.updated_at || normalized.created_at || new Date(0).toISOString()
  };
}

function normalizeGuestNavigationOrder(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
        .filter(Boolean)
    )
  );
}

function buildDefaultGuestPage(source) {
  const overview = source?.overview && typeof source.overview === "object" ? source.overview : {};
  const lines = [];

  if (overview.description) {
    lines.push(String(overview.description).trim());
  }

  if (overview.practicalInfo) {
    lines.push(`Praktisk informasjon\n${String(overview.practicalInfo).trim()}`);
  }

  const facts = [
    overview.location ? `Sted: ${overview.location}` : "",
    overview.startsAt ? `Starter: ${overview.startsAt}` : "",
    overview.endsAt ? `Slutter: ${overview.endsAt}` : "",
    overview.dressCode ? `Dresscode: ${overview.dressCode}` : ""
  ].filter(Boolean);

  if (facts.length) {
    lines.push(facts.join("\n"));
  }

  return {
    id: DEFAULT_GUEST_PAGE_ID,
    slug: "velkommen",
    title: overview.title || source?.name || "Velkommen",
    menuLabel: "Velkommen",
    content: lines.join("\n\n").trim(),
    visibility: "open",
    fontPreset: "clean",
    textSize: "md",
    textWeight: "regular",
    showImageCaption: false,
    orderIndex: 0,
    created_at: source?.created_at || new Date(0).toISOString(),
    updated_at: source?.updated_at || source?.created_at || new Date(0).toISOString()
  };
}

export function ensureEventShape(event) {
  const source = event && typeof event === "object" ? event : {};
  const overviewSource = source.overview && typeof source.overview === "object" ? source.overview : {};
  const guestSiteSource =
    source.guestSite && typeof source.guestSite === "object" ? source.guestSite : {};
  const eventSlug =
    typeof source.slug === "string" && source.slug.trim()
      ? slugifySegment(source.slug, "arrangement")
      : slugifySegment(overviewSource.title || source.name, "arrangement");
  const peopleMap = new Map();
  const sourcePeople = Array.isArray(source.people) ? source.people : [];
  const sourceMembers = Array.isArray(source.members) ? source.members : [];
  const sourceRoles = Array.isArray(source.roles) ? source.roles : [];
  const defaultEventRoles = buildDefaultEventRoles();
  const roles =
    (sourceRoles.length ? sourceRoles : defaultEventRoles)
      .map((role, index) =>
        normalizeEventRole(
          role,
          role?.key && PERSON_TEMPLATES[role.key] ? PERSON_TEMPLATES[role.key] : PERSON_TEMPLATES.guest,
          index
        )
      )
      .sort((left, right) => left.orderIndex - right.orderIndex || left.name.localeCompare(right.name, "nb"));
  const roleMap = new Map(roles.map((role) => [role.id, role]));

  sourcePeople.forEach((person) => {
    const normalized = normalizePerson(person, "guest");

    if (!normalized.id) {
      return;
    }

    peopleMap.set(normalized.id, normalized);
  });

  sourceMembers.forEach((member) => {
    if (!member || typeof member !== "object" || typeof member.id !== "string") {
      return;
    }

    peopleMap.set(member.id, mergeLegacyMember(peopleMap.get(member.id), member));
  });

  const people = Array.from(peopleMap.values()).sort((left, right) => {
    const leftTime = new Date(left.created_at).getTime();
    const rightTime = new Date(right.created_at).getTime();
    return leftTime - rightTime || left.name.localeCompare(right.name, "nb");
  }).map((person) => attachRoleAccessToPerson(person, roleMap));
  const guestPages = Array.isArray(source.guestPages)
    ? source.guestPages.map((page, index) => createGuestPage(page, index))
    : [];
  const subprojects = Array.isArray(source.subprojects)
    ? source.subprojects.map((subproject, index) => createSubproject(subproject, index))
    : [];
  const normalizedGuestPages = guestPages.length
    ? [...guestPages].sort((left, right) => left.orderIndex - right.orderIndex)
    : [buildDefaultGuestPage(source)];
  const usedPageSlugs = new Set();
  const guestPagesWithSlugs = normalizedGuestPages.map((page, index) => ({
    ...page,
    slug: ensureUniqueSlug(page.slug || page.menuLabel || page.title, usedPageSlugs, index === 0 ? "velkommen" : "side")
  }));
  const planningSettings = normalizePlanningSettings(source.planningSettings);
  const normalizedTasks = buildTaskHierarchyDetails(
    Array.isArray(source.tasks) ? source.tasks.map((task, index) => createTask(task, index)) : [],
    subprojects
  );

  return {
    ...source,
    slug: eventSlug,
    overview: {
      ...DEFAULT_OVERVIEW,
      ...(source.overview && typeof source.overview === "object" ? source.overview : {})
    },
    guestSite: {
      ...DEFAULT_GUEST_SITE,
      ...guestSiteSource,
      introText:
        typeof guestSiteSource.introText === "string" ? guestSiteSource.introText : "",
      navigationLabel:
        typeof guestSiteSource.navigationLabel === "string" && guestSiteSource.navigationLabel.trim()
          ? guestSiteSource.navigationLabel.trim()
          : "Navigasjon",
      backgroundImageUrl:
        typeof guestSiteSource.backgroundImageUrl === "string"
          ? guestSiteSource.backgroundImageUrl.trim()
          : "",
      backgroundMode: normalizeGuestSiteBackgroundMode(guestSiteSource.backgroundMode),
      navigationOrder: normalizeGuestNavigationOrder(guestSiteSource.navigationOrder),
      agendaPage: normalizeGuestAgendaPage(guestSiteSource.agendaPage)
    },
    guestPages: guestPagesWithSlugs,
    roles,
    people,
    planningSettings,
    members: people
      .filter((person) => person.effectiveFinanceRole !== "none")
      .map((person) => createFinanceMember(person)),
    subprojects: [...subprojects].sort((left, right) => left.orderIndex - right.orderIndex),
    tasks: normalizedTasks,
    hospitalityPlan: normalizeHospitalityPlan(source.hospitalityPlan),
    financePlan: normalizeFinancePlan(source.financePlan),
    venuePlan: normalizeVenuePlan(source.venuePlan),
    ledgerEntries: Array.isArray(source.ledgerEntries)
      ? source.ledgerEntries.map(createLedgerEntry)
      : [],
    submissions: Array.isArray(source.submissions) ? source.submissions.map(createSubmission) : [],
    platformVersion: 2
  };
}

export function buildGuestSiteBasePath(eventOrSlug) {
  const eventSlug =
    typeof eventOrSlug === "string"
      ? slugifySegment(eventOrSlug, "arrangement")
      : slugifySegment(eventOrSlug?.slug || eventOrSlug?.overview?.title || eventOrSlug?.name, "arrangement");

  return `/gjest/${eventSlug}`;
}

export function buildGuestSitePagePath(eventOrSlug, pageOrSlug) {
  const basePath = buildGuestSiteBasePath(eventOrSlug);
  const pageSlug =
    typeof pageOrSlug === "string"
      ? slugifySegment(pageOrSlug, "side")
      : slugifySegment(pageOrSlug?.slug || pageOrSlug?.menuLabel || pageOrSlug?.title, "side");

  return `${basePath}/${pageSlug}`;
}

export function sortGuestSiteNavigationEntries(entries, navigationOrder = []) {
  if (!Array.isArray(entries) || entries.length <= 1) {
    return Array.isArray(entries) ? [...entries] : [];
  }

  const order = normalizeGuestNavigationOrder(navigationOrder);

  if (!order.length) {
    return [...entries];
  }

  const orderIndex = new Map(order.map((id, index) => [id, index]));

  return [...entries].sort((left, right) => {
    const leftRank = orderIndex.has(left.id) ? orderIndex.get(left.id) : Number.POSITIVE_INFINITY;
    const rightRank = orderIndex.has(right.id) ? orderIndex.get(right.id) : Number.POSITIVE_INFINITY;

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return 0;
  });
}

export function buildGuestSiteNavigationEntries(event) {
  const normalizedEvent = ensureEventShape(event);
  const basePath = buildGuestSiteBasePath(normalizedEvent);
  const guestPages = Array.isArray(normalizedEvent.guestPages) ? normalizedEvent.guestPages : [];
  const entries = guestPages.map((page, index) => ({
    ...page,
    kind: "content_page",
    path: index === 0 ? basePath : buildGuestSitePagePath(normalizedEvent, page)
  }));
  const guestSeatingPage = normalizedEvent.venuePlan?.guestSeatingPage || DEFAULT_GUEST_SEATING_PAGE;

  if (guestSeatingPage.isPublished) {
    const usedSlugs = new Set(guestPages.map((page) => page.slug));
    const seatingSlug = ensureUniqueSlug(
      guestSeatingPage.navigationLabel || DEFAULT_GUEST_SEATING_PAGE.navigationLabel,
      usedSlugs,
      "sitteplan"
    );

    entries.push({
      id: "guest-page-venue-seating",
      kind: "venue_seating",
      title: guestSeatingPage.navigationLabel || DEFAULT_GUEST_SEATING_PAGE.navigationLabel,
      menuLabel: guestSeatingPage.navigationLabel || DEFAULT_GUEST_SEATING_PAGE.navigationLabel,
      slug: seatingSlug,
      visibility: "open",
      path: buildGuestSitePagePath(normalizedEvent, seatingSlug)
    });
  }

  const guestAgendaPage = normalizedEvent.guestSite?.agendaPage || DEFAULT_GUEST_SITE.agendaPage;

  if (guestAgendaPage.isPublished) {
    const usedSlugs = new Set(entries.map((page) => page.slug).filter(Boolean));
    const agendaSlug = ensureUniqueSlug(
      guestAgendaPage.navigationLabel || DEFAULT_GUEST_SITE.agendaPage.navigationLabel,
      usedSlugs,
      "agenda"
    );

    entries.push({
      id: "guest-page-agenda",
      kind: "guest_agenda",
      title: guestAgendaPage.navigationLabel || DEFAULT_GUEST_SITE.agendaPage.navigationLabel,
      menuLabel: guestAgendaPage.navigationLabel || DEFAULT_GUEST_SITE.agendaPage.navigationLabel,
      slug: agendaSlug,
      visibility: "open",
      path: buildGuestSitePagePath(normalizedEvent, agendaSlug)
    });
  }

  return sortGuestSiteNavigationEntries(entries, normalizedEvent.guestSite?.navigationOrder);
}

export function buildViewerAccess(person) {
  if (!person) {
    return {
      key: "organizer-local",
      label: "Arrangor (lokal)",
      canViewGuest: true,
      canManageGuest: true,
      canViewProject: true,
      canManageProject: true,
      canUpdateAssignedTasks: true,
      canViewPlanning: true,
      canManagePlanning: true,
      canViewFinance: true,
      canManageFinance: true,
      canViewApprovals: true,
      canSelfRespondGuest: true,
      capabilities: normalizeCapabilities({
        canCreateEvents: true,
        canSubmitReceipts: true,
        canSubmitManualInvoices: true,
        canSendToAiDirectly: true
      })
    };
  }

  const planningRole = person.effectivePlanningRole || person.planningRole || "none";
  const projectRole = person.effectiveProjectRole || person.projectRole || "none";
  const financeRole = person.effectiveFinanceRole || person.financeRole || "none";
  const capabilities = normalizeCapabilities(person.effectiveCapabilities || person.capabilities);
  const planningManager = planningRole === "manager" || planningRole === "owner";
  const projectManager = projectRole === "manager" || projectRole === "owner";
  const financeManager = financeRole === "manager" || financeRole === "owner";

  return {
    key: person.id,
    label: person.name || "Bruker",
    canViewGuest: true,
    canManageGuest: planningManager,
    canViewProject: projectRole !== "none" || projectManager,
    canManageProject: projectManager,
    canUpdateAssignedTasks:
      projectRole === "helper" || projectRole === "manager" || projectRole === "owner",
    canViewPlanning: planningRole !== "none" || planningManager,
    canManagePlanning: planningManager,
    canViewFinance: financeRole !== "none" || financeManager,
    canManageFinance: financeManager,
    canViewApprovals: planningManager || financeManager,
    canSelfRespondGuest: true,
    capabilities
  };
}

export function isGuestAudiencePerson(person) {
  if (!person) {
    return false;
  }

  const planningRole = normalizeRole(
    person.effectivePlanningRole || person.planningRole,
    ["none", "viewer", "manager", "owner"],
    "none"
  );
  const projectRole = normalizeRole(
    person.effectiveProjectRole || person.projectRole,
    ["none", "helper", "manager", "owner"],
    "none"
  );
  const financeRole = normalizeRole(
    person.effectiveFinanceRole || person.financeRole,
    ["none", "member", "manager", "owner"],
    "none"
  );

  return (
    (planningRole === "none" || planningRole === "viewer") &&
    projectRole === "none" &&
    financeRole === "none"
  );
}

export function canViewerSeeGuestPage(page, viewerAccess, viewerPerson) {
  if (!page || !viewerAccess) {
    return false;
  }

  if (viewerAccess.canManageGuest) {
    return true;
  }

  const visibility = normalizeRole(
    page.visibility,
    GUEST_PAGE_VISIBILITY_OPTIONS.map((option) => option.value),
    "open"
  );

  if (visibility === "open") {
    return true;
  }

  return isGuestAudiencePerson(viewerPerson);
}

export function buildGuestSummary(event) {
  const normalized = ensureEventShape(event);
  const totals = {
    invited: normalized.people.length,
    accepted: 0,
    maybe: 0,
    declined: 0,
    pending: 0
  };

  normalized.people.forEach((person) => {
    if (person.rsvpStatus === "accepted") {
      totals.accepted += 1;
      return;
    }

    if (person.rsvpStatus === "maybe") {
      totals.maybe += 1;
      return;
    }

    if (person.rsvpStatus === "declined") {
      totals.declined += 1;
      return;
    }

    totals.pending += 1;
  });

  return totals;
}

export function buildProjectSummary(event) {
  return buildProjectDashboard(event).summary;
}

export function buildProjectMatrix(event, options = {}) {
  const normalized = ensureEventShape(event);
  const dashboard = buildProjectDashboard(normalized, options);
  const requestedTaskIds = Array.isArray(options.taskIds) ? new Set(options.taskIds) : null;
  const visibleTasks = requestedTaskIds
    ? dashboard.tasks.filter((task) => requestedTaskIds.has(task.id))
    : dashboard.tasks;
  const visibleTaskMap = new Map(visibleTasks.map((task) => [task.id, task]));
  const childMap = new Map(visibleTasks.map((task) => [task.id, []]));
  const rootTasks = [];

  visibleTasks.forEach((task) => {
    if (task.parentTaskId && visibleTaskMap.has(task.parentTaskId)) {
      childMap.get(task.parentTaskId).push(task);
      return;
    }

    rootTasks.push(task);
  });

  childMap.forEach((children) => {
    children.sort(compareTaskMoments);
  });

  const subprojectMap = new Map(
    normalized.subprojects.map((subproject) => [
      subproject.id,
      {
        id: subproject.id,
        name: subproject.name,
        description: subproject.description || "",
        rootTasks: [],
        taskCount: 0
      }
    ])
  );
  const unassignedColumn = {
    id: "__unassigned",
    name: "Uten delprosjekt",
    description: "Aktiviteter som ikke er koblet til noe delprosjekt enda.",
    rootTasks: [],
    taskCount: 0
  };

  function buildDescendantRows(parentTaskId, depth = 1) {
    const children = childMap.get(parentTaskId) || [];

    return children.flatMap((childTask) => [
      {
        ...childTask,
        matrixDepth: depth
      },
      ...buildDescendantRows(childTask.id, depth + 1)
    ]);
  }

  rootTasks
    .sort(compareTaskMoments)
    .forEach((rootTask) => {
      const descendantRows = buildDescendantRows(rootTask.id);
      const columnKey = rootTask.effectiveSubprojectId || "__unassigned";
      const column = columnKey === "__unassigned" ? unassignedColumn : subprojectMap.get(columnKey);

      if (!column) {
        unassignedColumn.rootTasks.push({
          ...rootTask,
          descendantRows
        });
        unassignedColumn.taskCount += 1 + descendantRows.length;
        return;
      }

      column.rootTasks.push({
        ...rootTask,
        descendantRows
      });
      column.taskCount += 1 + descendantRows.length;
    });

  const columns = [
    ...normalized.subprojects
      .map((subproject) => subprojectMap.get(subproject.id))
      .filter((column) => column && (column.rootTasks.length > 0 || normalized.subprojects.length > 0)),
    ...(unassignedColumn.rootTasks.length > 0 || normalized.subprojects.length === 0 ? [unassignedColumn] : [])
  ];

  return {
    columns,
    totalRootTasks: rootTasks.length,
    totalVisibleTasks: visibleTasks.length
  };
}

export function buildTaskAgenda(event) {
  const normalized = ensureEventShape(event);
  const planningSettings = normalized.planningSettings;
  const hierarchyTasks = buildTaskHierarchyDetails(sortTasksByAgenda(normalized.tasks), normalized.subprojects);
  const { orderedTasks, childMap } = orderTasksByHierarchy(hierarchyTasks);
  const orderedTaskMap = new Map(orderedTasks.map((task) => [task.id, task]));
  const taskNames = new Map(orderedTasks.map((task) => [task.id, task.title || "Aktivitet"]));
  const eventStartMs = parseDateTimeValue(normalized.overview.startsAt);
  const scheduled = [];
  const scheduledMap = new Map();
  const dependentsMap = new Map();
  const directChildSequenceMap = new Map();
  const bufferBeforeTaskId = new Map();
  const bufferAfterTaskId = new Map();
  let previousEndMs = eventStartMs;

  orderedTasks.forEach((task) => {
    if (!task.parentTaskId || !orderedTaskMap.has(task.parentTaskId)) {
      return;
    }

    if (!directChildSequenceMap.has(task.parentTaskId)) {
      directChildSequenceMap.set(task.parentTaskId, []);
    }

    directChildSequenceMap.get(task.parentTaskId).push(task.id);
  });

  directChildSequenceMap.forEach((childIds, parentTaskId) => {
    const parentTask = orderedTaskMap.get(parentTaskId);

    if (!parentTask || childIds.length === 0) {
      return;
    }

    const bufferConfig = resolveTaskBufferConfig(parentTask, planningSettings);
    const hasConfiguredBuffer = bufferConfig.availableMinutes > 0 || bufferConfig.transitionMinutes > 0;

    if (!hasConfiguredBuffer) {
      return;
    }

    const gapCount = Math.max(0, childIds.length - 1);
    const distributedAvailableMinutes =
      bufferConfig.availablePlacement === "distributed" && gapCount > 0
        ? distributeMinutes(bufferConfig.availableMinutes, gapCount)
        : [];
    const endAvailableMinutes =
      bufferConfig.availablePlacement === "end" || gapCount === 0
        ? bufferConfig.availableMinutes
        : 0;

    for (let index = 1; index < childIds.length; index += 1) {
      const previousTaskId = childIds[index - 1];
      const nextTaskId = childIds[index];
      const availableMinutes = distributedAvailableMinutes[index - 1] || 0;
      const totalMinutes = bufferConfig.transitionMinutes + availableMinutes;

      if (totalMinutes <= 0) {
        continue;
      }

      const descriptor = {
        parentTaskId,
        previousTaskId,
        nextTaskId,
        totalMinutes,
        availableMinutes,
        transitionMinutes: bufferConfig.transitionMinutes,
        label: bufferConfig.label,
        placement: "between_children"
      };

      bufferBeforeTaskId.set(nextTaskId, descriptor);
      bufferAfterTaskId.set(previousTaskId, descriptor);
    }

    if (endAvailableMinutes > 0) {
      const lastChildTaskId = childIds[childIds.length - 1];
      bufferAfterTaskId.set(lastChildTaskId, {
        parentTaskId,
        previousTaskId: lastChildTaskId,
        nextTaskId: "",
        totalMinutes: endAvailableMinutes,
        availableMinutes: endAvailableMinutes,
        transitionMinutes: 0,
        label: bufferConfig.label,
        placement: "end"
      });
    }
  });

  orderedTasks.forEach((task, index) => {
    const dependencyWarnings = [];
    let dependencyEndMs = null;
    let explicitDependencyEndMs = null;
    const parentTask =
      task.parentTaskId && scheduledMap.has(task.parentTaskId)
        ? scheduledMap.get(task.parentTaskId)
        : null;
    const parentAnchorStartMs =
      parentTask && parentTask.hasExplicitTimeAnchor && Number.isFinite(parentTask.scheduledStartMs)
        ? parentTask.scheduledStartMs
        : null;

    task.dependencyIds.forEach((dependencyId) => {
      const dependency = scheduledMap.get(dependencyId);

      if (!dependency) {
        dependencyWarnings.push(
          taskNames.has(dependencyId)
            ? `Avhenger av "${taskNames.get(dependencyId)}", men den ligger senere i agendaen. Dra den tidligere eller fjern koblingen.`
            : "Avhenger av en aktivitet som ikke lenger finnes."
        );
        return;
      }

      if (dependency.scheduledEndMs !== null) {
        explicitDependencyEndMs = Math.max(
          explicitDependencyEndMs || dependency.scheduledEndMs,
          dependency.scheduledEndMs
        );
      }
    });

    const bufferBefore = bufferBeforeTaskId.get(task.id);
    let bufferConstraintMs = null;

    if (bufferBefore && bufferBefore.previousTaskId) {
      const previousSiblingTask = scheduledMap.get(bufferBefore.previousTaskId);

      if (previousSiblingTask && Number.isFinite(previousSiblingTask.scheduledEndMs)) {
        bufferConstraintMs =
          previousSiblingTask.scheduledEndMs + bufferBefore.totalMinutes * 60 * 1000;
      }
    }

    if (explicitDependencyEndMs !== null) {
      dependencyEndMs = Math.max(dependencyEndMs || explicitDependencyEndMs, explicitDependencyEndMs);
    }

    if (bufferConstraintMs !== null) {
      dependencyEndMs = Math.max(dependencyEndMs || bufferConstraintMs, bufferConstraintMs);
    }

    const desiredStartMs = parseDateTimeValue(task.desiredStartAt);
    const isFixedTime = Boolean(task.isFixedTime);
    const baselineStartMs =
      parentAnchorStartMs ?? previousEndMs ?? eventStartMs ?? dependencyEndMs ?? desiredStartMs ?? null;
    let scheduledStartMs = baselineStartMs;

    if (dependencyEndMs !== null) {
      scheduledStartMs = Math.max(scheduledStartMs || dependencyEndMs, dependencyEndMs);
    }

    if (isFixedTime) {
      if (desiredStartMs === null) {
        dependencyWarnings.push(
          'Aktiviteten er markert som "kan ikke forskyves", men mangler onsket starttid.'
        );
      } else {
        scheduledStartMs = desiredStartMs;

        if (dependencyEndMs !== null && dependencyEndMs > desiredStartMs) {
          if (explicitDependencyEndMs !== null && explicitDependencyEndMs >= dependencyEndMs) {
            dependencyWarnings.push(
              `Fast start ${formatAgendaDateTime(task.desiredStartAt)} kolliderer med en avhengighet som varer til ${formatAgendaDateTime(
                toDateTimeLocalString(explicitDependencyEndMs)
              )}.`
            );
          } else if (bufferBefore && bufferConstraintMs !== null) {
            dependencyWarnings.push(
              `Fast start ${formatAgendaDateTime(task.desiredStartAt)} kolliderer med ${bufferBefore.label.toLowerCase()} etter "${taskNames.get(
                bufferBefore.previousTaskId
              ) || "forrige aktivitet"}".`
            );
          }
        }
      }
    } else if (desiredStartMs !== null) {
      if (dependencyEndMs === null) {
        scheduledStartMs = desiredStartMs;
      } else if (desiredStartMs >= dependencyEndMs) {
        scheduledStartMs = desiredStartMs;
      } else {
        scheduledStartMs = dependencyEndMs;

        if (explicitDependencyEndMs !== null && explicitDependencyEndMs >= dependencyEndMs) {
          dependencyWarnings.push(
            `Onsket start ${formatAgendaDateTime(task.desiredStartAt)} treffes ikke. Oppgaven starter ${formatAgendaDateTime(
              toDateTimeLocalString(scheduledStartMs)
            )} pa grunn av en avhengighet.`
          );
        } else if (bufferBefore && bufferConstraintMs !== null) {
          dependencyWarnings.push(
            `Onsket start ${formatAgendaDateTime(task.desiredStartAt)} treffes ikke. Oppgaven starter ${formatAgendaDateTime(
              toDateTimeLocalString(scheduledStartMs)
            )} for aa gi rom til ${bufferBefore.label.toLowerCase()} etter "${taskNames.get(
              bufferBefore.previousTaskId
            ) || "forrige aktivitet"}".`
          );
        }
      }
    }

    if (scheduledStartMs === null) {
      dependencyWarnings.push(
        "Mangler startanker. Sett arrangementstart eller en onsket starttid for aktiviteten."
      );
    }

    const scheduledEndMs =
      scheduledStartMs === null ? null : scheduledStartMs + task.durationMinutes * 60 * 1000;

    if (scheduledEndMs !== null) {
      const trailingBuffer = bufferAfterTaskId.get(task.id);
      const nextPreviousEndMs = Math.max(
        previousEndMs ?? scheduledEndMs,
        scheduledEndMs + (trailingBuffer?.totalMinutes || 0) * 60 * 1000
      );
      previousEndMs = nextPreviousEndMs;
    }

    const scheduledTask = {
      ...task,
      agendaPosition: index + 1,
      dependencyNames: task.dependencyIds
        .map((dependencyId) => taskNames.get(dependencyId))
        .filter(Boolean),
      warnings: dependencyWarnings,
      isFixedTime,
      hasExplicitTimeAnchor: isFixedTime || desiredStartMs !== null,
      bufferSummary: buildTaskBufferSummary({ ...task, planningSettings }),
      recoverySummary: buildTaskRecoverySummary({ ...task, planningSettings }),
      missesDesiredStart: dependencyWarnings.some((warning) => warning.includes("Onsket start")),
      scheduledStartAt: scheduledStartMs === null ? "" : toDateTimeLocalString(scheduledStartMs),
      scheduledEndAt: scheduledEndMs === null ? "" : toDateTimeLocalString(scheduledEndMs),
      scheduledStartMs,
      scheduledEndMs
    };

    scheduled.push(scheduledTask);
    scheduledMap.set(task.id, scheduledTask);

    task.dependencyIds.forEach((dependencyId) => {
      if (!dependentsMap.has(dependencyId)) {
        dependentsMap.set(dependencyId, []);
      }

      dependentsMap.get(dependencyId).push(task.id);
    });
  });

  for (let index = scheduled.length - 1; index >= 0; index -= 1) {
    const task = scheduled[index];
    const desiredStartMs = parseDateTimeValue(task.desiredStartAt);

    if (task.isFixedTime || desiredStartMs !== null) {
      continue;
    }

    const candidateEndTimes = [];
    const nextTask = scheduled[index + 1];
    const trailingBuffer = bufferAfterTaskId.get(task.id);
    const trailingBufferMs = (trailingBuffer?.totalMinutes || 0) * 60 * 1000;

    if (nextTask && Number.isFinite(nextTask.scheduledStartMs)) {
      candidateEndTimes.push(nextTask.scheduledStartMs - trailingBufferMs);
    }

    const dependentIds = dependentsMap.get(task.id) || [];

    dependentIds.forEach((dependentId) => {
      const dependentTask = scheduledMap.get(dependentId);

      if (dependentTask && Number.isFinite(dependentTask.scheduledStartMs)) {
        candidateEndTimes.push(dependentTask.scheduledStartMs - trailingBufferMs);
      }
    });

    if (candidateEndTimes.length === 0) {
      continue;
    }

    const latestEndMs = Math.min(...candidateEndTimes);
    const latestStartMs = latestEndMs - task.durationMinutes * 60 * 1000;

    if (!Number.isFinite(latestStartMs)) {
      continue;
    }

    if (task.scheduledStartMs === null || latestStartMs > task.scheduledStartMs) {
      task.scheduledStartMs = latestStartMs;
      task.scheduledEndMs = latestEndMs;
      task.scheduledStartAt = toDateTimeLocalString(latestStartMs);
      task.scheduledEndAt = toDateTimeLocalString(latestEndMs);
      task.warnings = task.warnings.filter(
        (warning) => warning !== "Mangler startanker. Sett arrangementstart eller en onsket starttid for aktiviteten."
      );
      scheduledMap.set(task.id, task);
    }
  }

  const generatedBuffers = [];
  const generatedBufferIds = new Set();

  bufferAfterTaskId.forEach((descriptor, taskId) => {
    const sourceTask = scheduledMap.get(taskId);

    if (!sourceTask || !Number.isFinite(sourceTask.scheduledEndMs) || descriptor.totalMinutes <= 0) {
      return;
    }

    const bufferId = `buffer-${descriptor.parentTaskId}-${descriptor.previousTaskId}-${descriptor.nextTaskId || "end"}`;

    if (generatedBufferIds.has(bufferId)) {
      return;
    }

    generatedBufferIds.add(bufferId);

    const startMs = sourceTask.scheduledEndMs;
    const endMs = startMs + descriptor.totalMinutes * 60 * 1000;

    generatedBuffers.push({
      id: bufferId,
      title: descriptor.label,
      label: descriptor.label,
      parentTaskId: descriptor.parentTaskId,
      sourceTaskId: descriptor.previousTaskId,
      nextTaskId: descriptor.nextTaskId,
      availableMinutes: descriptor.availableMinutes,
      transitionMinutes: descriptor.transitionMinutes,
      durationMinutes: descriptor.totalMinutes,
      placement: descriptor.placement,
      isGeneratedBuffer: true,
      isScheduled: true,
      scheduledStartMs: startMs,
      scheduledEndMs: endMs,
      scheduledStartAt: toDateTimeLocalString(startMs),
      scheduledEndAt: toDateTimeLocalString(endMs),
      timelineStartMs: startMs,
      timelineEndMs: endMs,
      timelineStartAt: toDateTimeLocalString(startMs),
      timelineEndAt: toDateTimeLocalString(endMs),
      timelineDurationMinutes: descriptor.totalMinutes
    });
  });

  const warningCount = scheduled.reduce((sum, task) => sum + task.warnings.length, 0);
  const unscheduledCount = scheduled.reduce(
    (sum, task) => sum + (task.scheduledStartMs === null || task.scheduledEndMs === null ? 1 : 0),
    0
  );
  const timelineWindowCache = new Map();

  function getTimelineWindow(taskId) {
    if (timelineWindowCache.has(taskId)) {
      return timelineWindowCache.get(taskId);
    }

    const task = scheduledMap.get(taskId);

    if (!task) {
      const emptyWindow = {
        startMs: null,
        endMs: null,
        startAt: "",
        endAt: "",
        durationMinutes: null
      };
      timelineWindowCache.set(taskId, emptyWindow);
      return emptyWindow;
    }

    const directChildren = (childMap.get(taskId) || [])
      .map((childTask) => getTimelineWindow(childTask.id))
      .filter((window) => Number.isFinite(window.startMs) && Number.isFinite(window.endMs));

    if (directChildren.length === 0) {
      const ownWindow = {
        startMs: Number.isFinite(task.scheduledStartMs) ? task.scheduledStartMs : null,
        endMs: Number.isFinite(task.scheduledEndMs) ? task.scheduledEndMs : null,
        startAt: task.scheduledStartAt || "",
        endAt: task.scheduledEndAt || "",
        durationMinutes: Number.isFinite(task.durationMinutes) ? task.durationMinutes : null
      };
      timelineWindowCache.set(taskId, ownWindow);
      return ownWindow;
    }

    if (task.hasExplicitTimeAnchor) {
      const anchoredWindow = {
        startMs: Number.isFinite(task.scheduledStartMs) ? task.scheduledStartMs : null,
        endMs: Number.isFinite(task.scheduledEndMs) ? task.scheduledEndMs : null,
        startAt: task.scheduledStartAt || "",
        endAt: task.scheduledEndAt || "",
        durationMinutes: Number.isFinite(task.durationMinutes) ? task.durationMinutes : null
      };
      timelineWindowCache.set(taskId, anchoredWindow);
      return anchoredWindow;
    }

    const startMs = Math.min(...directChildren.map((window) => window.startMs));
    const endMs = Math.max(...directChildren.map((window) => window.endMs));
    const groupedWindow = {
      startMs,
      endMs,
      startAt: toDateTimeLocalString(startMs),
      endAt: toDateTimeLocalString(endMs),
      durationMinutes: Math.max(0, Math.round((endMs - startMs) / (60 * 1000)))
    };
    timelineWindowCache.set(taskId, groupedWindow);
    return groupedWindow;
  }

  const scheduledWithTimeline = scheduled.map((task) => {
    const timelineWindow = task.hasChildren ? getTimelineWindow(task.id) : null;

    return {
      ...task,
      timelineStartMs:
        timelineWindow && Number.isFinite(timelineWindow.startMs)
          ? timelineWindow.startMs
          : task.scheduledStartMs,
      timelineEndMs:
        timelineWindow && Number.isFinite(timelineWindow.endMs)
          ? timelineWindow.endMs
          : task.scheduledEndMs,
      timelineStartAt:
        timelineWindow && timelineWindow.startAt ? timelineWindow.startAt : task.scheduledStartAt,
      timelineEndAt:
        timelineWindow && timelineWindow.endAt ? timelineWindow.endAt : task.scheduledEndAt,
      timelineDurationMinutes:
        timelineWindow && Number.isFinite(timelineWindow.durationMinutes)
          ? timelineWindow.durationMinutes
          : task.durationMinutes
    };
  });

  const agendaMoments = [...scheduledWithTimeline, ...generatedBuffers].sort(compareTaskMoments);
  const firstScheduled = agendaMoments.find((task) => task.scheduledStartAt);
  const lastScheduled = [...agendaMoments].reverse().find((task) => task.scheduledEndAt);
  const totalDurationMinutes = scheduledWithTimeline.reduce(
    (sum, task) => sum + (Number.isFinite(task.durationMinutes) ? task.durationMinutes : 0),
    0
  );
  const bufferDurationMinutes = generatedBuffers.reduce(
    (sum, item) => sum + (Number.isFinite(item.durationMinutes) ? item.durationMinutes : 0),
    0
  );

  return {
    tasks: scheduledWithTimeline,
    bufferItems: generatedBuffers.sort(compareTaskMoments),
    warningCount,
    unscheduledCount,
    totalDurationMinutes: totalDurationMinutes + bufferDurationMinutes,
    taskDurationMinutes: totalDurationMinutes,
    bufferDurationMinutes,
    startsAt: firstScheduled?.scheduledStartAt || "",
    endsAt: lastScheduled?.scheduledEndAt || "",
    hasEventStart: Boolean(normalized.overview.startsAt),
    eventStartsAt: normalized.overview.startsAt || ""
  };
}

export function buildAgendaHighlights(event) {
  const agenda = buildTaskAgenda(event);
  const visibleTasks = agenda.tasks.filter((task) => task.showOnAgenda);
  const scheduledTasks = visibleTasks
    .filter((task) => Number.isFinite(task.timelineStartMs ?? task.scheduledStartMs))
    .sort(compareTaskMoments)
    .map((task) => ({
      ...task,
      displayStartAt: task.timelineStartAt || task.scheduledStartAt || "",
      displayEndAt: task.timelineEndAt || task.scheduledEndAt || "",
      isScheduled: true
    }));
  const unscheduledTasks = visibleTasks
    .filter((task) => !Number.isFinite(task.timelineStartMs ?? task.scheduledStartMs))
    .sort(compareHierarchyDisplayOrder)
    .map((task) => ({
      ...task,
      displayStartAt: "",
      displayEndAt: "",
      isScheduled: false
    }));

  return {
    tasks: [...scheduledTasks, ...unscheduledTasks],
    total: visibleTasks.length,
    scheduledCount: scheduledTasks.length,
    unscheduledCount: unscheduledTasks.length
  };
}

export function buildPlanningAgenda(event) {
  const agenda = buildTaskAgenda(event);
  const visibleTasks = agenda.tasks.filter((task) => task.showOnAgenda);
  const items = [...visibleTasks, ...(agenda.bufferItems || [])].sort(compareTaskMoments);
  const scheduledItems = items.filter((item) =>
    Number.isFinite(item.timelineStartMs ?? item.scheduledStartMs)
  );
  const unscheduledItems = items.filter(
    (item) => !Number.isFinite(item.timelineStartMs ?? item.scheduledStartMs)
  );

  const mappedItems = [...scheduledItems, ...unscheduledItems].map((item) => ({
    ...item,
    displayStartAt: item.timelineStartAt || item.scheduledStartAt || "",
    displayEndAt: item.timelineEndAt || item.scheduledEndAt || "",
    isScheduled: Number.isFinite(item.timelineStartMs ?? item.scheduledStartMs),
    isGeneratedBuffer: Boolean(item.isGeneratedBuffer)
  }));

  return {
    items: mappedItems,
    tasks: mappedItems,
    total: items.length,
    taskCount: visibleTasks.length,
    bufferCount: Array.isArray(agenda.bufferItems) ? agenda.bufferItems.length : 0,
    unscheduledCount: unscheduledItems.length
  };
}

function normalizeLookupText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function countGuestsByRsvp(people) {
  return (Array.isArray(people) ? people : []).reduce(
    (summary, person) => {
      const status = person?.rsvpStatus || "pending";
      summary.total += 1;

      if (status === "accepted") {
        summary.accepted += 1;
      } else if (status === "maybe") {
        summary.maybe += 1;
      } else if (status === "declined") {
        summary.declined += 1;
      } else {
        summary.pending += 1;
      }

      return summary;
    },
    {
      total: 0,
      accepted: 0,
      maybe: 0,
      declined: 0,
      pending: 0
    }
  );
}

function buildDietaryGuestRows(people) {
  return (Array.isArray(people) ? people : [])
    .filter((person) => String(person?.allergies || "").trim() || String(person?.dietaryNotes || "").trim())
    .map((person) => ({
      id: person.id,
      name: person.name || "Ukjent gjest",
      allergies: String(person.allergies || "").trim(),
      dietaryNotes: String(person.dietaryNotes || "").trim(),
      seatingNote: String(person.seatingNote || "").trim()
    }))
    .sort((left, right) => left.name.localeCompare(right.name, "nb"));
}

function buildVenueSeatSummary(venuePlan) {
  const items = Array.isArray(venuePlan?.items) ? venuePlan.items : [];
  const seatableItems = items.filter((item) => Number(item?.seatCount || 0) > 0);
  const seatsTotal = seatableItems.reduce((sum, item) => sum + Number(item.seatCount || 0), 0);
  const assignedSeats = seatableItems.reduce(
    (sum, item) =>
      sum +
      (Array.isArray(item.seats) ? item.seats.filter((seat) => String(seat?.guestId || "").trim()).length : 0),
    0
  );

  return {
    tableCount: seatableItems.filter((item) => item.type === "round_table" || item.type === "long_table").length,
    seatableItemCount: seatableItems.length,
    seatsTotal,
    assignedSeats,
    unassignedSeats: Math.max(0, seatsTotal - assignedSeats),
    itemLabels: seatableItems
      .map((item) => ({
        id: item.id,
        label: item.label || "Uten navn",
        seatCount: Number(item.seatCount || 0)
      }))
      .sort((left, right) => left.label.localeCompare(right.label, "nb"))
  };
}

function buildServiceTimelineRows(event) {
  return buildPlanningAgenda(event).items
    .filter((item) => item.isScheduled)
    .map((item) => ({
      id: item.id,
      title: item.title,
      startAt: item.displayStartAt,
      endAt: item.displayEndAt,
      agendaComment: item.agendaComment || "",
      isGeneratedBuffer: Boolean(item.isGeneratedBuffer),
      category: item.category || "general"
    }));
}

export function buildHospitalityBriefs(event) {
  const normalized = ensureEventShape(event);
  const guestCounts = countGuestsByRsvp(normalized.people);
  const dietaryGuests = buildDietaryGuestRows(normalized.people);
  const seatingSummary = buildVenueSeatSummary(normalized.venuePlan);
  const serviceTimeline = buildServiceTimelineRows(normalized);

  return {
    guestCounts,
    dietaryGuests,
    seatingSummary,
    serviceTimeline,
    kitchen: normalized.hospitalityPlan.kitchen,
    service: normalized.hospitalityPlan.service,
    shared: normalized.hospitalityPlan.shared
  };
}

function calculateTaskProjectedEndMs(task, nowMs) {
  if (!task || task.isGeneratedBuffer) {
    return null;
  }

  const durationMs = Math.max(0, Number(task.durationMinutes || 0)) * 60 * 1000;
  const actualEndMs = parseDateTimeValue(task.actualEndAt);
  const actualStartMs = parseDateTimeValue(task.actualStartAt);

  if (Number.isFinite(actualEndMs)) {
    return actualEndMs;
  }

  if (Number.isFinite(actualStartMs)) {
    return actualStartMs + durationMs;
  }

  if (Number.isFinite(task.scheduledEndMs)) {
    return task.scheduledEndMs;
  }

  if (Number.isFinite(task.scheduledStartMs)) {
    return task.scheduledStartMs + durationMs;
  }

  return Number.isFinite(nowMs) ? nowMs + durationMs : null;
}

function getEffectiveLiveStatus(task) {
  if (!task || task.isGeneratedBuffer) {
    return "buffer";
  }

  const normalizedStatus = normalizeTaskLiveStatus(task.liveStatus);
  const actualStartMs = parseDateTimeValue(task.actualStartAt);
  const actualEndMs = parseDateTimeValue(task.actualEndAt);

  if (normalizedStatus === "skipped") {
    return "skipped";
  }

  if (Number.isFinite(actualEndMs) || normalizedStatus === "done") {
    return "done";
  }

  if (Number.isFinite(actualStartMs) || normalizedStatus === "in_progress") {
    return "in_progress";
  }

  return "planned";
}

function getRemainingTaskDurationMs(task, nowMs) {
  if (!task || task.isGeneratedBuffer) {
    return 0;
  }

  const durationMs = Math.max(0, Number(task.durationMinutes || 0)) * 60 * 1000;
  const effectiveStatus = getEffectiveLiveStatus(task);

  if (effectiveStatus === "done" || effectiveStatus === "skipped") {
    return 0;
  }

  if (effectiveStatus === "in_progress") {
    const actualStartMs = parseDateTimeValue(task.actualStartAt);

    if (!Number.isFinite(actualStartMs) || !Number.isFinite(nowMs)) {
      return durationMs;
    }

    return Math.max(0, durationMs - Math.max(0, nowMs - actualStartMs));
  }

  return durationMs;
}

function getRemainingBufferDurationMs(item, nowMs) {
  if (!item?.isGeneratedBuffer) {
    return 0;
  }

  const startMs = item.timelineStartMs ?? item.scheduledStartMs;
  const endMs = item.timelineEndMs ?? item.scheduledEndMs;

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return 0;
  }

  if (!Number.isFinite(nowMs) || nowMs <= startMs) {
    return Math.max(0, endMs - startMs);
  }

  if (nowMs >= endMs) {
    return 0;
  }

  return Math.max(0, endMs - nowMs);
}

function roundMinutes(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value / (60 * 1000));
}

function getRecoveryPriorityRank(priority) {
  if (priority === "optional") {
    return 0;
  }

  if (priority === "normal") {
    return 1;
  }

  return 2;
}

function buildRecoveryActionLabel(action) {
  if (action.type === "shorten") {
    return `Kort ned "${action.taskTitle}" med ${action.savedMinutes} min`;
  }

  return `Hopp over "${action.taskTitle}" og spar ${action.savedMinutes} min`;
}

function buildRecoveryActionDescription(action) {
  if (action.type === "shorten") {
    return `Behold minst ${action.minimumDurationMinutes} min pa "${action.taskTitle}".`;
  }

  return `"${action.taskTitle}" kan hoppes over uten aa bryte faste punkt.`;
}

function buildRecoveryStrategy(candidates, targetMinutes, strategy) {
  const sortedCandidates = [...candidates]
    .filter((candidate) => strategy.filter(candidate))
    .sort((left, right) => {
      const leftPriority = getRecoveryPriorityRank(left.priority);
      const rightPriority = getRecoveryPriorityRank(right.priority);
      const leftTypeWeight = left.type === "shorten" ? 0 : 1;
      const rightTypeWeight = right.type === "shorten" ? 0 : 1;

      return (
        leftPriority - rightPriority ||
        leftTypeWeight - rightTypeWeight ||
        right.savedMinutes - left.savedMinutes ||
        left.taskTitle.localeCompare(right.taskTitle, "nb")
      );
    });
  const selectedTaskIds = new Set();
  const actions = [];
  let savedMinutes = 0;

  sortedCandidates.forEach((candidate) => {
    if (savedMinutes >= targetMinutes) {
      return;
    }

    if (selectedTaskIds.has(candidate.taskId) || candidate.savedMinutes <= 0) {
      return;
    }

    selectedTaskIds.add(candidate.taskId);
    actions.push({
      ...candidate,
      label: buildRecoveryActionLabel(candidate),
      description: buildRecoveryActionDescription(candidate)
    });
    savedMinutes += candidate.savedMinutes;
  });

  if (!actions.length) {
    return null;
  }

  return {
    id: strategy.id,
    title: strategy.title,
    description: strategy.description,
    actions,
    savedMinutes,
    remainingMinutes: Math.max(0, targetMinutes - savedMinutes),
    coversTarget: savedMinutes >= targetMinutes
  };
}

function buildLiveRecoverySuggestions({
  items,
  currentAnchorIndex,
  nextFixedStartMs,
  nowMs,
  targetMinutes,
  planningSettings
}) {
  if (!targetMinutes || targetMinutes <= 0) {
    return {
      candidates: [],
      suggestions: []
    };
  }

  const windowItems = items.filter((item, index) => {
    if (index < currentAnchorIndex || item.isGeneratedBuffer) {
      return false;
    }

    if (item.liveStatus === "done" || item.liveStatus === "skipped") {
      return false;
    }

    if (!Number.isFinite(nextFixedStartMs)) {
      return true;
    }

    if (item.id === items[currentAnchorIndex]?.id) {
      return true;
    }

    const itemStartMs = item.scheduledStartMs ?? item.timelineStartMs;
    return !Number.isFinite(itemStartMs) || itemStartMs < nextFixedStartMs;
  });
  const candidates = [];

  windowItems.forEach((item) => {
    const recoveryConfig = resolveTaskRecoveryConfig(item, planningSettings);
    const remainingMinutes = Math.max(0, Math.ceil(getRemainingTaskDurationMs(item, nowMs) / (60 * 1000)));

    if (remainingMinutes <= 0) {
      return;
    }

    const actualStartMs = parseDateTimeValue(item.actualStartAt);
    const elapsedMinutes = Number.isFinite(actualStartMs) && Number.isFinite(nowMs)
      ? Math.max(0, Math.floor((nowMs - actualStartMs) / (60 * 1000)))
      : 0;
    const minimumRemainingMinutes = Math.max(
      0,
      recoveryConfig.minimumDurationMinutes - elapsedMinutes
    );

    if (recoveryConfig.canShorten) {
      const savedMinutes = Math.max(0, remainingMinutes - minimumRemainingMinutes);

      if (savedMinutes > 0) {
        candidates.push({
          taskId: item.id,
          taskTitle: item.title || "Aktivitet",
          type: "shorten",
          savedMinutes,
          priority: recoveryConfig.priority,
          minimumDurationMinutes: recoveryConfig.minimumDurationMinutes
        });
      }
    }

    if (recoveryConfig.canSkip && recoveryConfig.priority !== "critical") {
      candidates.push({
        taskId: item.id,
        taskTitle: item.title || "Aktivitet",
        type: "skip",
        savedMinutes: remainingMinutes,
        priority: recoveryConfig.priority,
        minimumDurationMinutes: recoveryConfig.minimumDurationMinutes
      });
    }
  });

  const strategies = [
    {
      id: "gentle",
      title: "Skansom innhenting",
      description: "Korter bare ned aktiviteter som allerede er merket som fleksible.",
      filter(candidate) {
        return candidate.type === "shorten";
      }
    },
    {
      id: "recommended",
      title: "Anbefalt innhenting",
      description: "Bruker forkorting forst, og hopper bare over valgfrie aktiviteter ved behov.",
      filter(candidate) {
        return candidate.type === "shorten" || candidate.priority === "optional";
      }
    },
    {
      id: "strong",
      title: "Hard innhenting",
      description: "Brukes hvis dere ma hente inn mye tid før neste faste punkt.",
      filter(candidate) {
        return candidate.priority !== "critical" || candidate.type === "shorten";
      }
    }
  ];
  const suggestions = strategies
    .map((strategy) => buildRecoveryStrategy(candidates, targetMinutes, strategy))
    .filter(Boolean)
    .filter((suggestion, index, source) => {
      return (
        index ===
        source.findIndex((entry) =>
          entry.actions.map((action) => `${action.type}:${action.taskId}`).join("|") ===
          suggestion.actions.map((action) => `${action.type}:${action.taskId}`).join("|")
        )
      );
    });

  return {
    candidates,
    suggestions
  };
}

export function buildLiveAgenda(event, options = {}) {
  const normalized = ensureEventShape(event);
  const agenda = buildTaskAgenda(normalized);
  const planningSettings = normalized.planningSettings;
  const nowMs =
    Number.isFinite(options.nowMs)
      ? options.nowMs
      : parseDateTimeValue(options.now) ?? Date.now();
  const items = [...agenda.tasks, ...(agenda.bufferItems || [])]
    .sort(compareTaskMoments)
    .map((item) => {
      const liveStatus = getEffectiveLiveStatus(item);
      const actualStartMs = parseDateTimeValue(item.actualStartAt);
      const actualEndMs = parseDateTimeValue(item.actualEndAt);
      const displayStartAt = item.timelineStartAt || item.scheduledStartAt || "";
      const displayEndAt = item.timelineEndAt || item.scheduledEndAt || "";
      const projectedEndMs = calculateTaskProjectedEndMs(item, nowMs);
      const projectedEndAt = Number.isFinite(projectedEndMs)
        ? toDateTimeLocalString(projectedEndMs)
        : "";
      const liveDeltaMinutes =
        !item.isGeneratedBuffer && Number.isFinite(item.scheduledEndMs) && Number.isFinite(projectedEndMs)
          ? roundMinutes(projectedEndMs - item.scheduledEndMs)
          : 0;

      return {
        ...item,
        liveStatus,
        actualStartMs,
        actualEndMs,
        projectedEndMs,
        projectedEndAt,
        liveDeltaMinutes,
        displayStartAt,
        displayEndAt,
        isScheduled: Number.isFinite(item.timelineStartMs ?? item.scheduledStartMs)
      };
    });
  const actionableItems = items.filter((item) => !item.isGeneratedBuffer);
  const activeTasks = actionableItems.filter((item) => item.liveStatus === "in_progress");
  const currentTask =
    [...activeTasks].sort((left, right) => {
      const leftStart = left.actualStartMs ?? left.scheduledStartMs ?? Number.MAX_SAFE_INTEGER;
      const rightStart = right.actualStartMs ?? right.scheduledStartMs ?? Number.MAX_SAFE_INTEGER;
      return leftStart - rightStart;
    })[0] || null;
  const nextTask = currentTask
    ? actionableItems.find(
        (item) =>
          item.id !== currentTask.id &&
          item.liveStatus !== "done" &&
          item.liveStatus !== "skipped" &&
          (item.scheduledStartMs ?? Number.MAX_SAFE_INTEGER) >=
            (currentTask.scheduledStartMs ?? Number.NEGATIVE_INFINITY)
      ) || null
    : actionableItems.find(
        (item) => item.liveStatus !== "done" && item.liveStatus !== "skipped"
      ) || null;
  const latestFinishedTask =
    [...actionableItems]
      .filter((item) => item.liveStatus === "done" || item.liveStatus === "skipped")
      .sort((left, right) => {
        const leftEnd = left.actualEndMs ?? left.scheduledEndMs ?? Number.NEGATIVE_INFINITY;
        const rightEnd = right.actualEndMs ?? right.scheduledEndMs ?? Number.NEGATIVE_INFINITY;
        return rightEnd - leftEnd;
      })[0] || null;
  const driftMinutes = currentTask
    ? currentTask.liveDeltaMinutes
    : latestFinishedTask?.liveDeltaMinutes || 0;
  const currentAnchorIndex =
    items.findIndex((item) => item.id === (currentTask?.id || nextTask?.id || "")) >= 0
      ? items.findIndex((item) => item.id === (currentTask?.id || nextTask?.id || ""))
      : 0;
  const nextFixedTask =
    actionableItems.find((item) => {
      if (!item.isFixedTime || item.liveStatus === "done" || item.liveStatus === "skipped") {
        return false;
      }

      if (currentTask && item.id === currentTask.id) {
        return false;
      }

      const scheduledStartMs = item.scheduledStartMs ?? item.timelineStartMs;
      return (
        Number.isFinite(scheduledStartMs) &&
        scheduledStartMs >=
          (currentTask?.scheduledStartMs ??
            nextTask?.scheduledStartMs ??
            Number.NEGATIVE_INFINITY)
      );
    }) || null;
  const nextFixedStartMs = nextFixedTask?.scheduledStartMs ?? nextFixedTask?.timelineStartMs ?? null;
  let requiredRemainingMs = 0;
  let plannedBufferRemainingMs = 0;

  items.forEach((item, index) => {
    if (index < currentAnchorIndex) {
      return;
    }

    if (nextFixedTask && item.id === nextFixedTask.id) {
      return;
    }

    const itemStartMs = item.scheduledStartMs ?? item.timelineStartMs;

    if (Number.isFinite(nextFixedStartMs) && Number.isFinite(itemStartMs) && itemStartMs >= nextFixedStartMs) {
      return;
    }

    if (item.isGeneratedBuffer) {
      plannedBufferRemainingMs += getRemainingBufferDurationMs(item, nowMs);
      return;
    }

    requiredRemainingMs += getRemainingTaskDurationMs(item, nowMs);
  });

  const availableBufferMs = Number.isFinite(nextFixedStartMs)
    ? nextFixedStartMs - nowMs - requiredRemainingMs
    : plannedBufferRemainingMs;
  const availableBufferMinutes = roundMinutes(availableBufferMs);
  const plannedBufferMinutes = roundMinutes(plannedBufferRemainingMs);
  const needsCatchUpMinutes = availableBufferMinutes < 0 ? Math.abs(availableBufferMinutes) : 0;
  const recoveryPlan = buildLiveRecoverySuggestions({
    items,
    currentAnchorIndex,
    nextFixedStartMs,
    nowMs,
    targetMinutes: needsCatchUpMinutes,
    planningSettings
  });
  const statusTone =
    driftMinutes > 0 && availableBufferMinutes < driftMinutes
      ? "danger"
      : driftMinutes > 0
        ? "warning"
        : "success";
  const currentTaskId = currentTask?.id || "";
  const nextTaskId = nextTask?.id || "";
  const mappedItems = items.map((item) => ({
    ...item,
    isCurrent: Boolean(currentTaskId && item.id === currentTaskId),
    isNext: Boolean(nextTaskId && item.id === nextTaskId),
    canStart: !item.isGeneratedBuffer && item.liveStatus === "planned",
    canComplete: !item.isGeneratedBuffer && item.liveStatus === "in_progress",
    canSkip:
      !item.isGeneratedBuffer && item.liveStatus !== "done" && item.liveStatus !== "skipped",
    canReset:
      !item.isGeneratedBuffer &&
      (item.liveStatus !== "planned" || item.actualStartAt || item.actualEndAt)
  }));

  return {
    items: mappedItems,
    nowAt: toDateTimeLocalString(nowMs),
    currentTask,
    nextTask,
    nextFixedTask,
    driftMinutes,
    availableBufferMinutes,
    plannedBufferMinutes,
    needsCatchUpMinutes,
    recoverySuggestions: recoveryPlan.suggestions,
    recoveryCandidateCount: recoveryPlan.candidates.length,
    statusTone,
    activeTaskCount: activeTasks.length,
    doneTaskCount: actionableItems.filter((item) => item.liveStatus === "done").length,
    skippedTaskCount: actionableItems.filter((item) => item.liveStatus === "skipped").length,
    remainingTaskCount: actionableItems.filter(
      (item) => item.liveStatus === "planned" || item.liveStatus === "in_progress"
    ).length,
    unscheduledCount: actionableItems.filter((item) => !item.isScheduled).length
  };
}

function chooseSwimlaneSlotMinutes(totalDurationMinutes) {
  if (!Number.isFinite(totalDurationMinutes) || totalDurationMinutes <= 0) {
    return 30;
  }

  if (totalDurationMinutes <= 360) {
    return 15;
  }

  if (totalDurationMinutes <= 960) {
    return 30;
  }

  return 60;
}

function roundDownToSlot(timestamp, slotMinutes) {
  if (!Number.isFinite(timestamp)) {
    return null;
  }

  const slotMs = slotMinutes * 60 * 1000;
  return Math.floor(timestamp / slotMs) * slotMs;
}

function roundUpToSlot(timestamp, slotMinutes) {
  if (!Number.isFinite(timestamp)) {
    return null;
  }

  const slotMs = slotMinutes * 60 * 1000;
  return Math.ceil(timestamp / slotMs) * slotMs;
}

function getTaskLaneMeta(task, peopleMap) {
  if (!Array.isArray(task.assigneeIds) || task.assigneeIds.length === 0) {
    return {
      id: "__unassigned",
      label: "Uten ansvarlig",
      kind: "unassigned"
    };
  }

  if (task.assigneeIds.length === 1) {
    const personName = peopleMap.get(task.assigneeIds[0]) || "Ukjent person";
    return {
      id: task.assigneeIds[0],
      label: personName,
      kind: "person"
    };
  }

  return {
    id: "__shared",
    label: "Delt ansvar",
    kind: "shared"
  };
}

export function buildTaskSwimlanes(event) {
  const normalized = ensureEventShape(event);
  const agenda = buildTaskAgenda(normalized);
  const peopleMap = new Map(normalized.people.map((person) => [person.id, person.name]));
  const slotMinutes = chooseSwimlaneSlotMinutes(agenda.totalDurationMinutes);
  const scheduledStarts = agenda.tasks
    .map((task) => task.scheduledStartMs)
    .filter((timestamp) => Number.isFinite(timestamp));
  const scheduledEnds = agenda.tasks
    .map((task) => task.scheduledEndMs)
    .filter((timestamp) => Number.isFinite(timestamp));
  const timelineStartMs =
    roundDownToSlot(
      scheduledStarts.length
        ? Math.min(...scheduledStarts)
        : parseDateTimeValue(normalized.overview.startsAt),
      slotMinutes
    ) ?? null;
  const timelineEndMs =
    roundUpToSlot(
      scheduledEnds.length
        ? Math.max(...scheduledEnds)
        : parseDateTimeValue(normalized.overview.endsAt),
      slotMinutes
    ) ?? null;
  const baseScheduledColumns =
    timelineStartMs !== null && timelineEndMs !== null
      ? Math.max(1, Math.ceil((timelineEndMs - timelineStartMs) / (slotMinutes * 60 * 1000)))
      : 0;
  let fallbackColumn = baseScheduledColumns;
  const laneOrder = [];
  const laneMap = new Map();
  const taskNodes = [];

  agenda.tasks.forEach((task, index) => {
    const laneMeta = getTaskLaneMeta(task, peopleMap);

    if (!laneMap.has(laneMeta.id)) {
      laneMap.set(laneMeta.id, {
        ...laneMeta,
        tasks: []
      });
      laneOrder.push(laneMeta.id);
    }

    let startColumn = fallbackColumn;
    const fallbackDurationMinutes = Number.isFinite(Number(task.durationMinutes))
      ? Number(task.durationMinutes)
      : DEFAULT_TASK_DURATION_MINUTES;
    let spanColumns = Math.max(
      1,
      Math.ceil(fallbackDurationMinutes / slotMinutes)
    );

    if (
      timelineStartMs !== null &&
      Number.isFinite(task.scheduledStartMs) &&
      Number.isFinite(task.scheduledEndMs)
    ) {
      startColumn = Math.max(
        0,
        Math.floor((task.scheduledStartMs - timelineStartMs) / (slotMinutes * 60 * 1000))
      );
      spanColumns = Math.max(
        1,
        Math.ceil((task.scheduledEndMs - task.scheduledStartMs) / (slotMinutes * 60 * 1000))
      );
    } else {
      fallbackColumn += spanColumns + 1;
    }

    const taskNode = {
      ...task,
      laneId: laneMeta.id,
      laneLabel: laneMeta.label,
      laneKind: laneMeta.kind,
      columnStart: startColumn,
      columnSpan: spanColumns,
      columnEnd: startColumn + spanColumns,
      isUnscheduled: !(Number.isFinite(task.scheduledStartMs) && Number.isFinite(task.scheduledEndMs)),
      orderIndex: index
    };

    laneMap.get(laneMeta.id).tasks.push(taskNode);
    taskNodes.push(taskNode);
  });

  const laneIndexMap = new Map(laneOrder.map((laneId, index) => [laneId, index]));
  const lanePriority = {
    person: 0,
    shared: 1,
    unassigned: 2
  };
  const sortedLaneIds = [...laneOrder].sort((leftId, rightId) => {
    const leftLane = laneMap.get(leftId);
    const rightLane = laneMap.get(rightId);
    const priorityDelta = (lanePriority[leftLane.kind] ?? 9) - (lanePriority[rightLane.kind] ?? 9);

    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    if (leftLane.kind === "person" && rightLane.kind === "person") {
      return leftLane.label.localeCompare(rightLane.label, "nb");
    }

    return (laneIndexMap.get(leftId) || 0) - (laneIndexMap.get(rightId) || 0);
  });

  const sortedLanes = sortedLaneIds.map((laneId, laneIndex) => ({
    ...laneMap.get(laneId),
    laneIndex,
    tasks: [...laneMap.get(laneId).tasks].sort((leftTask, rightTask) => {
      return leftTask.columnStart - rightTask.columnStart || leftTask.orderIndex - rightTask.orderIndex;
    })
  }));

  const taskMap = new Map(taskNodes.map((task) => [task.id, task]));
  const dependencyLinks = [];

  taskNodes.forEach((task) => {
    task.dependencyIds.forEach((dependencyId) => {
      const dependency = taskMap.get(dependencyId);

      if (!dependency) {
        return;
      }

      dependencyLinks.push({
        id: `${dependencyId}->${task.id}`,
        fromTaskId: dependencyId,
        toTaskId: task.id,
        fromLaneId: dependency.laneId,
        toLaneId: task.laneId
      });
    });
  });

  const totalColumns = Math.max(
    1,
    ...taskNodes.map((task) => task.columnEnd + (task.isUnscheduled ? 1 : 0)),
    baseScheduledColumns
  );
  const timeMarkers =
    timelineStartMs === null
      ? []
      : Array.from({ length: totalColumns }, (_, columnIndex) => ({
          columnIndex,
          dateTime: toDateTimeLocalString(timelineStartMs + columnIndex * slotMinutes * 60 * 1000),
          label: formatAgendaDateTime(
            toDateTimeLocalString(timelineStartMs + columnIndex * slotMinutes * 60 * 1000)
          )
        }));

  return {
    slotMinutes,
    timeMarkers,
    totalColumns,
    timelineStartMs,
    timelineEndMs,
    lanes: sortedLanes,
    dependencyLinks,
    tasks: taskNodes
  };
}

function createProjectTaskDescriptor(task, peopleMap, nowMs) {
  const dueDateMs = parseDateTimeValue(task.dueDate);
  const scheduledStartMs =
    Number.isFinite(task.timelineStartMs)
      ? task.timelineStartMs
      : Number.isFinite(task.scheduledStartMs)
        ? task.scheduledStartMs
        : parseDateTimeValue(task.timelineStartAt || task.scheduledStartAt);
  const scheduledEndMs =
    Number.isFinite(task.timelineEndMs)
      ? task.timelineEndMs
      : Number.isFinite(task.scheduledEndMs)
        ? task.scheduledEndMs
        : parseDateTimeValue(task.timelineEndAt || task.scheduledEndAt);
  const assigneeNames = task.assigneeIds.map((assigneeId) => peopleMap.get(assigneeId)).filter(Boolean);
  const isClosed = task.status === "done" || task.status === "canceled";
  const isOverdue = dueDateMs !== null && dueDateMs < nowMs && !isClosed;
  const isDueSoon =
    dueDateMs !== null &&
    dueDateMs >= nowMs &&
    dueDateMs <= nowMs + PROJECT_DUE_SOON_WINDOW_MS &&
    !isClosed;

  return {
    ...task,
    assigneeNames,
    assigneeLabel: assigneeNames.join(", ") || "Ingen ansvarlig",
    subprojectLabel: task.effectiveSubprojectName || "Uten delprosjekt",
    hierarchyShortLabel:
      task.parentTaskTitle && task.hierarchyDepth > 0
        ? `Under ${task.parentTaskTitle}`
        : task.hasChildren
          ? `${task.childTaskIds.length} underaktiviteter`
          : "",
    statusLabel: getTaskStatusLabel(task.status),
    dueDateMs,
    scheduledStartMs,
    scheduledEndMs,
    displayStartAt: task.timelineStartAt || task.scheduledStartAt || "",
    displayEndAt: task.timelineEndAt || task.scheduledEndAt || "",
    displayDurationMinutes:
      Number.isFinite(task.timelineDurationMinutes) ? task.timelineDurationMinutes : task.durationMinutes,
    isScheduled: Number.isFinite(scheduledStartMs) && Number.isFinite(scheduledEndMs),
    isOverdue,
    isDueSoon,
    hasWarnings: task.warnings.length > 0
  };
}

function createWorkloadRow(row, tasks) {
  const sortedTasks = [...tasks].sort(compareTaskMoments);
  const nextPlannedTask = sortedTasks.find(
    (task) => task.status !== "done" && task.status !== "canceled" && task.scheduledStartAt
  );
  const nextDueTask = sortedTasks.find(
    (task) => task.status !== "done" && task.status !== "canceled" && task.dueDate
  );

  return {
    ...row,
    tasks: sortedTasks,
    taskCount: sortedTasks.length,
    openTaskCount: sortedTasks.filter(
      (task) => task.status !== "done" && task.status !== "canceled"
    ).length,
    doneCount: sortedTasks.filter((task) => task.status === "done").length,
    blockedCount: sortedTasks.filter((task) => task.status === "blocked").length,
    warningCount: sortedTasks.filter((task) => task.hasWarnings).length,
    fixedTimeCount: sortedTasks.filter((task) => task.isFixedTime).length,
    overdueCount: sortedTasks.filter((task) => task.isOverdue).length,
    dueSoonCount: sortedTasks.filter((task) => task.isDueSoon).length,
    totalDurationMinutes: sortedTasks.reduce(
      (sum, task) => sum + (Number.isFinite(task.durationMinutes) ? task.durationMinutes : 0),
      0
    ),
    nextPlannedTaskAt: nextPlannedTask?.scheduledStartAt || "",
    nextDueDate: nextDueTask?.dueDate || ""
  };
}

export function buildProjectDashboard(event, options = {}) {
  const normalized = ensureEventShape(event);
  const agenda = buildTaskAgenda(normalized);
  const peopleMap = new Map(normalized.people.map((person) => [person.id, person.name]));
  const nowMs = parseDateTimeValue(options.now) ?? Date.now();
  const tasks = agenda.tasks
    .map((task) => createProjectTaskDescriptor(task, peopleMap, nowMs))
    .sort(compareTaskMoments);
  const board = TASK_STATUS_OPTIONS.map((option) => ({
    id: option.value,
    label: option.label,
    tasks: tasks.filter((task) => task.status === option.value)
  }));
  const focus = {
    blocked: tasks
      .filter((task) => task.status === "blocked" || task.hasWarnings)
      .sort(compareTaskMoments),
    overdue: tasks.filter((task) => task.isOverdue).sort(compareTaskMoments),
    dueSoon: tasks.filter((task) => task.isDueSoon).sort(compareTaskMoments),
    unassigned: tasks.filter((task) => task.assigneeIds.length === 0).sort(compareTaskMoments),
    fixedTime: tasks.filter((task) => task.isFixedTime).sort(compareTaskMoments),
    unscheduled: tasks.filter((task) => !task.isScheduled).sort(compareTaskMoments)
  };
  const summary = tasks.reduce(
    (current, task) => {
      current.total += 1;
      current.totalDurationMinutes += Number.isFinite(task.durationMinutes) ? task.durationMinutes : 0;

      if (task.status === "done") {
        current.done += 1;
      } else if (task.status === "in_progress") {
        current.inProgress += 1;
      } else if (task.status === "blocked") {
        current.blocked += 1;
      } else if (task.status === "todo") {
        current.todo += 1;
      } else if (task.status === "canceled") {
        current.canceled += 1;
      }

      if (task.assigneeIds.length === 0) {
        current.unassigned += 1;
      } else {
        current.assigned += 1;
      }

      if (task.status !== "done" && task.status !== "canceled") {
        current.open += 1;
      }

      if (task.isFixedTime) {
        current.fixedTime += 1;
      }

      if (task.showOnAgenda) {
        current.agendaVisible += 1;
      }

      if (task.isOverdue) {
        current.overdue += 1;
      }

      if (task.isDueSoon) {
        current.dueSoon += 1;
      }

      if (!task.isScheduled) {
        current.unscheduled += 1;
      }

      if (task.hasWarnings) {
        current.warningTasks += 1;
        current.agendaWarnings += task.warnings.length;
      }

      if (task.hasChildren) {
        current.parentTasks += 1;
      }

      if (task.hierarchyDepth > 0) {
        current.nestedTasks += 1;
      }

      return current;
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
      agendaVisible: 0,
      overdue: 0,
      dueSoon: 0,
      unscheduled: 0,
      warningTasks: 0,
      agendaWarnings: 0,
      totalDurationMinutes: 0,
      parentTasks: 0,
      nestedTasks: 0,
      subprojectCount: normalized.subprojects.length
    }
  );
  const workloadPeople = normalized.people.filter(
    (person) =>
      person.effectiveProjectRole !== "none" ||
      tasks.some((task) => task.assigneeIds.includes(person.id))
  );
  const workload = workloadPeople
    .map((person) =>
      createWorkloadRow(
        {
          id: person.id,
          label: person.name,
          kind: "person",
          role: person.effectiveProjectRole
        },
        tasks.filter((task) => task.assigneeIds.includes(person.id))
      )
    )
    .filter((row) => row.taskCount > 0 || row.role !== "none");

  if (focus.unassigned.length > 0) {
    workload.push(
      createWorkloadRow(
        {
          id: "__unassigned",
          label: "Uten ansvarlig",
          kind: "unassigned",
          role: "none"
        },
        focus.unassigned
      )
    );
  }

  workload.sort((left, right) => {
    const leftPriority = left.kind === "person" ? 0 : 1;
    const rightPriority = right.kind === "person" ? 0 : 1;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    if (left.taskCount !== right.taskCount) {
      return right.taskCount - left.taskCount;
    }

    const leftNextTime = parseDateTimeValue(left.nextPlannedTaskAt) ?? Number.MAX_SAFE_INTEGER;
    const rightNextTime = parseDateTimeValue(right.nextPlannedTaskAt) ?? Number.MAX_SAFE_INTEGER;

    if (leftNextTime !== rightNextTime) {
      return leftNextTime - rightNextTime;
    }

    return left.label.localeCompare(right.label, "nb");
  });

  return {
    agenda: {
      ...agenda,
      tasks
    },
    tasks,
    board,
    focus,
    workload,
    summary
  };
}

export function buildProjectHierarchy(event, options = {}) {
  const normalized = ensureEventShape(event);
  const dashboard = buildProjectDashboard(normalized, options);
  const peopleMap = new Map(normalized.people.map((person) => [person.id, person.name]));
  const scopedTaskIds = Array.isArray(options.taskIds)
    ? new Set(options.taskIds.filter((value) => typeof value === "string" && value))
    : null;
  const scopedTasks = scopedTaskIds
    ? dashboard.tasks.filter((task) => scopedTaskIds.has(task.id))
    : dashboard.tasks;
  const taskMap = new Map(
    scopedTasks.map((task) => [
      task.id,
      {
        ...task,
        children: []
      }
    ])
  );
  const roots = [];

  scopedTasks.forEach((task) => {
    const node = taskMap.get(task.id);

    if (!node) {
      return;
    }

    if (task.parentTaskId && taskMap.has(task.parentTaskId)) {
      taskMap.get(task.parentTaskId).children.push(node);
      return;
    }

    roots.push(node);
  });

  function buildNode(node) {
    const children = [...(node.children || [])].sort(compareHierarchyDisplayOrder).map(buildNode);
    const subtreeTaskCount =
      1 + children.reduce((sum, childNode) => sum + childNode.subtreeTaskCount, 0);
    const descendantCount = subtreeTaskCount - 1;
    const closedStatuses = new Set(["done", "canceled"]);
    const subtreeOpenCount =
      (closedStatuses.has(node.status) ? 0 : 1) +
      children.reduce((sum, childNode) => sum + childNode.subtreeOpenCount, 0);
    const subtreeDoneCount =
      (node.status === "done" ? 1 : 0) +
      children.reduce((sum, childNode) => sum + childNode.subtreeDoneCount, 0);
    const subtreeBlockedCount =
      (node.status === "blocked" ? 1 : 0) +
      children.reduce((sum, childNode) => sum + childNode.subtreeBlockedCount, 0);
    const subtreeWarningTaskCount =
      (node.hasWarnings ? 1 : 0) +
      children.reduce((sum, childNode) => sum + childNode.subtreeWarningTaskCount, 0);
    const subtreeWarningCount =
      (Array.isArray(node.warnings) ? node.warnings.length : 0) +
      children.reduce((sum, childNode) => sum + childNode.subtreeWarningCount, 0);
    const subtreeOverdueCount =
      (node.isOverdue ? 1 : 0) +
      children.reduce((sum, childNode) => sum + childNode.subtreeOverdueCount, 0);
    const subtreeFixedTimeCount =
      (node.isFixedTime ? 1 : 0) +
      children.reduce((sum, childNode) => sum + childNode.subtreeFixedTimeCount, 0);
    const subtreeAssigneeIds = Array.from(
      new Set([
        ...(Array.isArray(node.assigneeIds) ? node.assigneeIds : []),
        ...children.flatMap((childNode) => childNode.subtreeAssigneeIds)
      ])
    );
    const subtreeAssigneeNames = subtreeAssigneeIds
      .map((assigneeId) => peopleMap.get(assigneeId) || "")
      .filter(Boolean);
    const ownStartCandidate = Number.isFinite(node.timelineStartMs)
      ? node.timelineStartMs
      : Number.isFinite(node.scheduledStartMs)
        ? node.scheduledStartMs
        : null;
    const ownEndCandidate = Number.isFinite(node.timelineEndMs)
      ? node.timelineEndMs
      : Number.isFinite(node.scheduledEndMs)
        ? node.scheduledEndMs
        : null;
    const subtreeStartCandidates = node.hasExplicitTimeAnchor
      ? [ownStartCandidate].filter((value) => Number.isFinite(value))
      : [ownStartCandidate, ...children.map((childNode) => childNode.subtreeStartMs)].filter((value) =>
          Number.isFinite(value)
        );
    const subtreeEndCandidates = node.hasExplicitTimeAnchor
      ? [ownEndCandidate].filter((value) => Number.isFinite(value))
      : [ownEndCandidate, ...children.map((childNode) => childNode.subtreeEndMs)].filter((value) =>
          Number.isFinite(value)
        );
    const subtreeStartMs = subtreeStartCandidates.length ? Math.min(...subtreeStartCandidates) : null;
    const subtreeEndMs = subtreeEndCandidates.length ? Math.max(...subtreeEndCandidates) : null;
    const subtreeDurationMinutes =
      Number.isFinite(subtreeStartMs) && Number.isFinite(subtreeEndMs)
        ? Math.max(0, Math.round((subtreeEndMs - subtreeStartMs) / (60 * 1000)))
        : node.displayDurationMinutes;
    const progressPercent = subtreeTaskCount
      ? Math.round((subtreeDoneCount / subtreeTaskCount) * 100)
      : 0;

    return {
      ...node,
      children,
      descendantCount,
      subtreeTaskCount,
      subtreeOpenCount,
      subtreeDoneCount,
      subtreeBlockedCount,
      subtreeWarningTaskCount,
      subtreeWarningCount,
      subtreeOverdueCount,
      subtreeFixedTimeCount,
      subtreeAssigneeIds,
      subtreeAssigneeNames,
      subtreeAssigneeLabel: subtreeAssigneeNames.join(", ") || "Ingen ansvarlig",
      subtreeStartMs,
      subtreeEndMs,
      subtreeStartAt: Number.isFinite(subtreeStartMs) ? toDateTimeLocalString(subtreeStartMs) : "",
      subtreeEndAt: Number.isFinite(subtreeEndMs) ? toDateTimeLocalString(subtreeEndMs) : "",
      subtreeDurationMinutes,
      progressPercent,
      progressLabel: `${subtreeDoneCount}/${subtreeTaskCount} ferdig`
    };
  }

  const rootNodes = roots.sort(compareHierarchyDisplayOrder).map(buildNode);
  const groupMap = new Map(
    [
      ...normalized.subprojects.map((subproject) => [
        subproject.id,
        {
          id: subproject.id,
          name: subproject.name,
          description: subproject.description || "",
          rootNodes: [],
          taskCount: 0,
          warningCount: 0,
          openCount: 0
        }
      ]),
      [
        "__unassigned",
        {
          id: "__unassigned",
          name: "Uten delprosjekt",
          description: "",
          rootNodes: [],
          taskCount: 0,
          warningCount: 0,
          openCount: 0
        }
      ]
    ]
  );

  rootNodes.forEach((rootNode) => {
    const groupKey =
      rootNode.effectiveSubprojectId && groupMap.has(rootNode.effectiveSubprojectId)
        ? rootNode.effectiveSubprojectId
        : "__unassigned";
    const group = groupMap.get(groupKey);

    group.rootNodes.push(rootNode);
    group.taskCount += rootNode.subtreeTaskCount;
    group.warningCount += rootNode.subtreeWarningTaskCount;
    group.openCount += rootNode.subtreeOpenCount;
  });

  const groups = [
    ...normalized.subprojects
      .map((subproject) => groupMap.get(subproject.id))
      .filter((group) => group && group.rootNodes.length > 0),
    ...(groupMap.get("__unassigned")?.rootNodes.length ? [groupMap.get("__unassigned")] : [])
  ];

  return {
    groups,
    rootNodes,
    totalVisibleTasks: scopedTasks.length,
    totalRootNodes: rootNodes.length,
    summary: dashboard.summary
  };
}

export function buildApprovalSummary(event) {
  const normalized = ensureEventShape(event);

  return normalized.submissions.reduce(
    (summary, submission) => {
      summary.total += 1;

      if (submission.status === "pending_approval") {
        summary.pending += 1;
      } else if (submission.status === "approved" || submission.status === "processing_ai") {
        summary.approved += 1;
      } else if (submission.status === "rejected") {
        summary.rejected += 1;
      } else if (submission.status === "processed") {
        summary.processed += 1;
      }

      return summary;
    },
    {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      processed: 0
    }
  );
}

function mapMerchantCategoryToFinanceCategory(merchantCategory) {
  if (merchantCategory === "restaurant") {
    return "food_drink";
  }

  if (merchantCategory === "store") {
    return "logistics";
  }

  return "uncategorized";
}

function findMatchingSupplierForJob(job, suppliers) {
  const merchantName = normalizeLookupText(job?.result?.merchantName || job?.original_filename || "");

  if (!merchantName) {
    return null;
  }

  return (
    (Array.isArray(suppliers) ? suppliers : []).find((supplier) => {
      const supplierName = normalizeLookupText(supplier?.name || "");

      if (!supplierName) {
        return false;
      }

      return (
        merchantName === supplierName ||
        merchantName.includes(supplierName) ||
        supplierName.includes(merchantName)
      );
    }) || null
  );
}

function buildFinanceCategoryTotals(jobs, suppliers) {
  const totals = new Map(FINANCE_CATEGORY_OPTIONS.map((option) => [option.value, 0]));

  (Array.isArray(jobs) ? jobs : [])
    .filter((job) => job?.status === "completed" && job?.result)
    .forEach((job) => {
      const supplier = findMatchingSupplierForJob(job, suppliers);
      const categoryKey = supplier?.categoryKey || mapMerchantCategoryToFinanceCategory(job.result?.merchantCategory);
      const currentTotal = totals.get(categoryKey) || 0;
      totals.set(categoryKey, roundCurrency(currentTotal + normalizeCurrencyAmount(job.result?.grandTotal, 0)));
    });

  return totals;
}

export function buildFinanceControlRoom(event, jobs) {
  const normalized = ensureEventShape(event);
  const relevantJobs = Array.isArray(jobs)
    ? jobs.filter((job) => job?.event_id === normalized.id)
    : [];
  const approvedLedgerEntries = normalized.ledgerEntries.filter((entry) => entry.status === "approved");
  const categoryTotals = buildFinanceCategoryTotals(relevantJobs, normalized.financePlan.suppliers);
  const budgetRows = normalized.financePlan.budgetItems.map((item) => {
    const actualAmount = roundCurrency(categoryTotals.get(item.categoryKey) || 0);
    const plannedAmount = normalizeCurrencyAmount(item.plannedAmount, 0);

    return {
      ...item,
      actualAmount,
      varianceAmount: roundCurrency(plannedAmount - actualAmount)
    };
  });
  const unplannedActualTotal = roundCurrency(
    [...categoryTotals.entries()].reduce((sum, [categoryKey, amount]) => {
      if (budgetRows.some((row) => row.categoryKey === categoryKey)) {
        return sum;
      }

      return sum + amount;
    }, 0)
  );
  const supplierRows = normalized.financePlan.suppliers.map((supplier) => {
    const matchedJobs = relevantJobs.filter((job) => {
      if (job?.status !== "completed" || !job?.result) {
        return false;
      }

      const matchedSupplier = findMatchingSupplierForJob(job, [supplier]);
      return Boolean(matchedSupplier);
    });
    const actualAmount = roundCurrency(
      matchedJobs.reduce((sum, job) => sum + normalizeCurrencyAmount(job?.result?.grandTotal, 0), 0)
    );
    const agreedAmount = normalizeCurrencyAmount(supplier.agreedAmount, 0);
    const dueAtMs = parseDateTimeValue(supplier.paymentDueAt);

    return {
      ...supplier,
      actualAmount,
      agreedAmount,
      varianceAmount: roundCurrency(agreedAmount - actualAmount),
      matchedReceiptCount: matchedJobs.length,
      dueSoon:
        Number.isFinite(dueAtMs) &&
        dueAtMs >= Date.now() &&
        dueAtMs - Date.now() <= 7 * 24 * 60 * 60 * 1000 &&
        !["paid", "canceled"].includes(supplier.status)
    };
  });

  return {
    budgetRows,
    supplierRows,
    actualCategoryRows: FINANCE_CATEGORY_OPTIONS.map((option) => ({
      key: option.value,
      label: option.label,
      amount: roundCurrency(categoryTotals.get(option.value) || 0)
    })).filter((row) => row.amount > 0),
    approvedLedgerCount: approvedLedgerEntries.length,
    approvedAdvanceTotal: roundCurrency(
      approvedLedgerEntries
        .filter((entry) => entry.type === "advance_contribution")
        .reduce((sum, entry) => sum + normalizeCurrencyAmount(entry.amount, 0), 0)
    ),
    approvedSettlementTotal: roundCurrency(
      approvedLedgerEntries
        .filter((entry) => entry.type === "settlement_transfer")
        .reduce((sum, entry) => sum + normalizeCurrencyAmount(entry.amount, 0), 0)
    ),
    committedSupplierTotal: roundCurrency(
      supplierRows
        .filter((supplier) => !["canceled"].includes(supplier.status))
        .reduce((sum, supplier) => sum + normalizeCurrencyAmount(supplier.agreedAmount, 0), 0)
    ),
    unpaidSupplierCount: supplierRows.filter((supplier) => !["paid", "canceled"].includes(supplier.status)).length,
    dueSoonSupplierCount: supplierRows.filter((supplier) => supplier.dueSoon).length,
    unplannedActualTotal,
    localAiOps: normalized.financePlan.localAiOps
  };
}

export function buildEventFinanceSummary(event, jobs) {
  const normalized = ensureEventShape(event);
  const base = buildEventSettlement(normalized, jobs);
  const members = new Map(
    base.members.map((member) => [
      member.id,
      {
        ...member,
        receiptPaidTotal: roundCurrency(member.paidTotal),
        advanceTotal: 0,
        sentSettlementTotal: 0,
        receivedSettlementTotal: 0,
        adjustmentTotal: 0,
        totalContributed: roundCurrency(member.paidTotal),
        balanceBeforeSettlements: roundCurrency(member.paidTotal - member.usedTotal),
        remainingBalance: roundCurrency(member.paidTotal - member.usedTotal)
      }
    ])
  );

  let totalAdvances = 0;
  let totalAdjustments = 0;
  let totalSettlementTransfers = 0;
  let totalReceivedSettlements = 0;

  normalized.ledgerEntries
    .filter((entry) => entry.status === "approved")
    .forEach((entry) => {
      if (entry.type === "advance_contribution" && members.has(entry.memberId)) {
        const member = members.get(entry.memberId);
        member.advanceTotal = roundCurrency(member.advanceTotal + entry.amount);
        member.paidTotal = roundCurrency(member.paidTotal + entry.amount);
        member.totalContributed = roundCurrency(member.totalContributed + entry.amount);
        totalAdvances = roundCurrency(totalAdvances + entry.amount);
      }

      if (
        entry.type === "settlement_transfer" &&
        members.has(entry.memberId) &&
        members.has(entry.counterpartyMemberId)
      ) {
        const sender = members.get(entry.memberId);
        const receiver = members.get(entry.counterpartyMemberId);
        sender.sentSettlementTotal = roundCurrency(sender.sentSettlementTotal + entry.amount);
        receiver.receivedSettlementTotal = roundCurrency(
          receiver.receivedSettlementTotal + entry.amount
        );
        totalSettlementTransfers = roundCurrency(totalSettlementTransfers + entry.amount);
        totalReceivedSettlements = roundCurrency(totalReceivedSettlements + entry.amount);
      }

      if (entry.type === "manual_adjustment" && members.has(entry.memberId)) {
        const member = members.get(entry.memberId);
        member.adjustmentTotal = roundCurrency(member.adjustmentTotal + entry.amount);
        member.paidTotal = roundCurrency(member.paidTotal + entry.amount);
        member.totalContributed = roundCurrency(member.totalContributed + entry.amount);
        totalAdjustments = roundCurrency(totalAdjustments + entry.amount);
      }
    });

  const memberSummaries = normalized.members.map((member) => {
    const summary = members.get(member.id) || {
      id: member.id,
      name: member.name,
      paidTotal: 0,
      usedTotal: 0,
      balance: 0,
      paidReceiptCount: 0,
      receiptPaidTotal: 0,
      advanceTotal: 0,
      sentSettlementTotal: 0,
      receivedSettlementTotal: 0,
      adjustmentTotal: 0,
      totalContributed: 0,
      balanceBeforeSettlements: 0,
      remainingBalance: 0
    };

    summary.totalContributed = roundCurrency(
      summary.receiptPaidTotal + summary.advanceTotal + summary.adjustmentTotal
    );
    summary.balanceBeforeSettlements = roundCurrency(summary.paidTotal - summary.usedTotal);
    summary.remainingBalance = roundCurrency(
      summary.paidTotal +
        summary.sentSettlementTotal -
        summary.usedTotal -
        summary.receivedSettlementTotal
    );

    return summary;
  });

  return {
    ...base,
    totalContributed: roundCurrency(base.totalPaid + totalAdvances + totalAdjustments),
    totalAdvances,
    totalAdjustments,
    totalSettlementTransfers,
    totalReceivedSettlements,
    members: memberSummaries
  };
}

export function buildSettlementSuggestions(financeSummary) {
  const members = Array.isArray(financeSummary?.members) ? financeSummary.members : [];
  const debtors = members
    .filter((member) => typeof member.remainingBalance === "number" && member.remainingBalance < -0.009)
    .map((member) => ({
      id: member.id,
      name: member.name,
      amount: roundCurrency(Math.abs(member.remainingBalance))
    }))
    .sort((left, right) => right.amount - left.amount);
  const creditors = members
    .filter((member) => typeof member.remainingBalance === "number" && member.remainingBalance > 0.009)
    .map((member) => ({
      id: member.id,
      name: member.name,
      amount: roundCurrency(member.remainingBalance)
    }))
    .sort((left, right) => right.amount - left.amount);
  const suggestions = [];

  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = roundCurrency(Math.min(debtor.amount, creditor.amount));

    if (amount > 0.009) {
      suggestions.push({
        fromId: debtor.id,
        fromName: debtor.name,
        toId: creditor.id,
        toName: creditor.name,
        amount
      });
    }

    debtor.amount = roundCurrency(debtor.amount - amount);
    creditor.amount = roundCurrency(creditor.amount - amount);

    if (debtor.amount <= 0.009) {
      debtorIndex += 1;
    }

    if (creditor.amount <= 0.009) {
      creditorIndex += 1;
    }
  }

  const unmatchedOutgoing = debtors
    .filter((member) => member.amount > 0.009)
    .map((member) => ({
      id: member.id,
      name: member.name,
      amount: roundCurrency(member.amount)
    }));
  const unmatchedIncoming = creditors
    .filter((member) => member.amount > 0.009)
    .map((member) => ({
      id: member.id,
      name: member.name,
      amount: roundCurrency(member.amount)
    }));

  return {
    suggestions,
    unmatchedOutgoing,
    unmatchedIncoming,
    totalOutgoing: roundCurrency(suggestions.reduce((sum, entry) => sum + entry.amount, 0)),
    totalIncoming: roundCurrency(suggestions.reduce((sum, entry) => sum + entry.amount, 0)),
    alreadyBalanced: suggestions.length === 0 && unmatchedOutgoing.length === 0 && unmatchedIncoming.length === 0
  };
}
