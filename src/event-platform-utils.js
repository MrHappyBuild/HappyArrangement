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

const DEFAULT_TASK_DURATION_MINUTES = 60;
const DEFAULT_GUEST_PAGE_ID = "guest-page-default";
const PROJECT_DUE_SOON_WINDOW_MS = 48 * 60 * 60 * 1000;

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

    const dependencies = (Array.isArray(task.dependencyIds) ? task.dependencyIds : [])
      .map((dependencyId) => taskMap.get(dependencyId))
      .filter(Boolean)
      .sort(compareTaskSequence);

    dependencies.forEach((dependencyTask) => visit(dependencyTask));

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
    durationMinutes: normalizeTaskDuration(normalized.durationMinutes),
    orderIndex: Number.isFinite(normalized.orderIndex) ? normalized.orderIndex : fallbackIndex,
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
    members: people
      .filter((person) => person.effectiveFinanceRole !== "none")
      .map((person) => createFinanceMember(person)),
    subprojects: [...subprojects].sort((left, right) => left.orderIndex - right.orderIndex),
    tasks: normalizedTasks,
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
  const hierarchyTasks = buildTaskHierarchyDetails(sortTasksByAgenda(normalized.tasks), normalized.subprojects);
  const { orderedTasks, childMap } = orderTasksByHierarchy(hierarchyTasks);
  const taskNames = new Map(orderedTasks.map((task) => [task.id, task.title || "Aktivitet"]));
  const eventStartMs = parseDateTimeValue(normalized.overview.startsAt);
  const scheduled = [];
  const scheduledMap = new Map();
  const dependentsMap = new Map();
  let previousEndMs = eventStartMs;
  let previousBlockingTask = null;

  orderedTasks.forEach((task, index) => {
    const dependencyWarnings = [];
    let dependencyEndMs = null;
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
        dependencyEndMs = Math.max(dependencyEndMs || dependency.scheduledEndMs, dependency.scheduledEndMs);
      }
    });

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
          dependencyWarnings.push(
            `Fast start ${formatAgendaDateTime(task.desiredStartAt)} kolliderer med en avhengighet som varer til ${formatAgendaDateTime(
              toDateTimeLocalString(dependencyEndMs)
            )}.`
          );
        }

      }
    } else if (desiredStartMs !== null) {
      if (dependencyEndMs === null) {
        scheduledStartMs = desiredStartMs;
      } else if (desiredStartMs >= dependencyEndMs) {
        scheduledStartMs = desiredStartMs;
      } else {
        scheduledStartMs = dependencyEndMs;
        dependencyWarnings.push(
          `Onsket start ${formatAgendaDateTime(task.desiredStartAt)} treffes ikke. Oppgaven starter ${formatAgendaDateTime(
            toDateTimeLocalString(scheduledStartMs)
          )}.`
        );
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
      const nextPreviousEndMs = Math.max(previousEndMs ?? scheduledEndMs, scheduledEndMs);

      if (nextPreviousEndMs !== previousEndMs || previousBlockingTask === null) {
        previousBlockingTask = task;
      }

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

    if (nextTask && Number.isFinite(nextTask.scheduledStartMs)) {
      candidateEndTimes.push(nextTask.scheduledStartMs);
    }

    const dependentIds = dependentsMap.get(task.id) || [];

    dependentIds.forEach((dependentId) => {
      const dependentTask = scheduledMap.get(dependentId);

      if (dependentTask && Number.isFinite(dependentTask.scheduledStartMs)) {
        candidateEndTimes.push(dependentTask.scheduledStartMs);
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

  const firstScheduled = scheduledWithTimeline.find((task) => task.scheduledStartAt);
  const lastScheduled = [...scheduledWithTimeline].reverse().find((task) => task.scheduledEndAt);
  const totalDurationMinutes = scheduledWithTimeline.reduce(
    (sum, task) => sum + (Number.isFinite(task.durationMinutes) ? task.durationMinutes : 0),
    0
  );

  return {
    tasks: scheduledWithTimeline,
    warningCount,
    unscheduledCount,
    totalDurationMinutes,
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
