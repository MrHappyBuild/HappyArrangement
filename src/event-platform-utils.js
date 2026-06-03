import { buildEventSettlement } from "./event-settlement-utils.js";
import { roundCurrency } from "./receipt-utils.js";

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

function normalizeRole(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function normalizeCapabilities(input) {
  return {
    ...DEFAULT_CAPABILITIES,
    ...(input && typeof input === "object" ? input : {})
  };
}

function normalizePerson(person, fallbackTemplateKey = "guest") {
  const template = PERSON_TEMPLATES[fallbackTemplateKey] || PERSON_TEMPLATES.guest;
  const normalized = person && typeof person === "object" ? person : {};

  return {
    id: typeof normalized.id === "string" ? normalized.id : "",
    name: typeof normalized.name === "string" ? normalized.name : "",
    email: typeof normalized.email === "string" ? normalized.email : "",
    note: typeof normalized.note === "string" ? normalized.note : "",
    created_at: normalized.created_at || new Date(0).toISOString(),
    invitedAt: normalized.invitedAt || null,
    respondedAt: normalized.respondedAt || null,
    rsvpStatus: normalizeRole(normalized.rsvpStatus, RSVP_OPTIONS.map((option) => option.value), "pending"),
    planningRole: normalizeRole(normalized.planningRole, ["none", "viewer", "manager", "owner"], template.planningRole),
    projectRole: normalizeRole(normalized.projectRole, ["none", "helper", "manager", "owner"], template.projectRole),
    financeRole: normalizeRole(normalized.financeRole, ["none", "member", "manager", "owner"], template.financeRole),
    capabilities: normalizeCapabilities({
      ...template.capabilities,
      ...(normalized.capabilities && typeof normalized.capabilities === "object"
        ? normalized.capabilities
        : {})
    })
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

function createTask(task) {
  const normalized = task && typeof task === "object" ? task : {};

  return {
    id: typeof normalized.id === "string" ? normalized.id : "",
    title: typeof normalized.title === "string" ? normalized.title : "",
    description: typeof normalized.description === "string" ? normalized.description : "",
    status: normalizeRole(
      normalized.status,
      TASK_STATUS_OPTIONS.map((option) => option.value),
      "todo"
    ),
    dueDate: typeof normalized.dueDate === "string" ? normalized.dueDate : "",
    assigneeIds: Array.isArray(normalized.assigneeIds)
      ? normalized.assigneeIds.filter((assigneeId) => typeof assigneeId === "string")
      : [],
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

export function ensureEventShape(event) {
  const source = event && typeof event === "object" ? event : {};
  const peopleMap = new Map();
  const sourcePeople = Array.isArray(source.people) ? source.people : [];
  const sourceMembers = Array.isArray(source.members) ? source.members : [];

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
  });

  return {
    ...source,
    overview: {
      ...DEFAULT_OVERVIEW,
      ...(source.overview && typeof source.overview === "object" ? source.overview : {})
    },
    people,
    members: people
      .filter((person) => person.financeRole !== "none")
      .map((person) => createFinanceMember(person)),
    tasks: Array.isArray(source.tasks) ? source.tasks.map(createTask) : [],
    ledgerEntries: Array.isArray(source.ledgerEntries)
      ? source.ledgerEntries.map(createLedgerEntry)
      : [],
    submissions: Array.isArray(source.submissions) ? source.submissions.map(createSubmission) : [],
    platformVersion: 2
  };
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
      canSelfRespondGuest: true
    };
  }

  const planningManager = person.planningRole === "manager" || person.planningRole === "owner";
  const projectManager = person.projectRole === "manager" || person.projectRole === "owner";
  const financeManager = person.financeRole === "manager" || person.financeRole === "owner";

  return {
    key: person.id,
    label: person.name || "Bruker",
    canViewGuest: true,
    canManageGuest: planningManager,
    canViewProject: person.projectRole !== "none" || projectManager,
    canManageProject: projectManager,
    canUpdateAssignedTasks:
      person.projectRole === "helper" || person.projectRole === "manager" || person.projectRole === "owner",
    canViewPlanning: person.planningRole !== "none" || planningManager,
    canManagePlanning: planningManager,
    canViewFinance: person.financeRole !== "none" || financeManager,
    canManageFinance: financeManager,
    canViewApprovals: planningManager || financeManager,
    canSelfRespondGuest: true
  };
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
  const normalized = ensureEventShape(event);

  return normalized.tasks.reduce(
    (summary, task) => {
      summary.total += 1;

      if (task.status === "done") {
        summary.done += 1;
      } else if (task.status === "in_progress") {
        summary.inProgress += 1;
      } else if (task.status === "blocked") {
        summary.blocked += 1;
      } else if (task.status === "todo") {
        summary.todo += 1;
      }

      return summary;
    },
    {
      total: 0,
      todo: 0,
      inProgress: 0,
      blocked: 0,
      done: 0
    }
  );
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
        advanceTotal: 0,
        sentSettlementTotal: 0,
        receivedSettlementTotal: 0,
        adjustmentTotal: 0,
        balanceBeforeSettlements: roundCurrency(member.paidTotal - member.usedTotal),
        remainingBalance: roundCurrency(member.paidTotal - member.usedTotal)
      }
    ])
  );

  let totalAdvances = 0;
  let totalSettlementTransfers = 0;
  let totalReceivedSettlements = 0;

  normalized.ledgerEntries
    .filter((entry) => entry.status === "approved")
    .forEach((entry) => {
      if (entry.type === "advance_contribution" && members.has(entry.memberId)) {
        const member = members.get(entry.memberId);
        member.advanceTotal = roundCurrency(member.advanceTotal + entry.amount);
        member.paidTotal = roundCurrency(member.paidTotal + entry.amount);
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
      advanceTotal: 0,
      sentSettlementTotal: 0,
      receivedSettlementTotal: 0,
      adjustmentTotal: 0,
      balanceBeforeSettlements: 0,
      remainingBalance: 0
    };

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
    totalAdvances,
    totalSettlementTransfers,
    totalReceivedSettlements,
    members: memberSummaries
  };
}
