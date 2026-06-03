import { roundCurrency, roundQuantity } from "./receipt-utils.js";

function createId(prefix) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createEntry(item, index) {
  return {
    id: `entry-${index}`,
    name: item?.name || `Vare ${index + 1}`,
    quantity: item?.quantity ?? 1,
    unitPrice: item?.unitPrice ?? 0,
    lineTotal: item?.lineTotal ?? 0,
    remainingQuantity: item?.quantity ?? 1,
    remainingTotal: item?.lineTotal ?? 0,
    assignments: []
  };
}

function cloneAssignment(assignment) {
  return {
    id: assignment.id,
    participantId: assignment.participantId,
    type: assignment.type,
    label: assignment.label,
    quantity: assignment.quantity,
    amount: assignment.amount,
    percent: assignment.percent ?? null
  };
}

function cloneEntry(entry) {
  return {
    ...entry,
    assignments: Array.isArray(entry.assignments) ? entry.assignments.map(cloneAssignment) : []
  };
}

function cloneParticipant(participant) {
  return {
    id: participant.id,
    name: participant.name
  };
}

function sanitizeAssignment(assignment, participantIds) {
  if (!assignment || typeof assignment !== "object") {
    return null;
  }

  if (!participantIds.has(assignment.participantId)) {
    return null;
  }

  const amount = toPositiveNumber(assignment.amount);
  const quantity = toPositiveNumber(assignment.quantity);

  if (!amount || !quantity) {
    return null;
  }

  return {
    id: typeof assignment.id === "string" ? assignment.id : createId("assignment"),
    participantId: assignment.participantId,
    type: assignment.type === "split" ? "split" : "whole",
    label: typeof assignment.label === "string" && assignment.label.trim() ? assignment.label : "Vare",
    quantity,
    amount,
    percent: toPositiveNumber(assignment.percent)
  };
}

function toPositiveNumber(value) {
  const parsed = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function roundPercent(value) {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

function deriveTotalsFromAssignments(entry) {
  const assignedQuantity = roundQuantity(
    entry.assignments.reduce((sum, assignment) => sum + (assignment.quantity ?? 0), 0)
  );
  const assignedAmount = roundCurrency(
    entry.assignments.reduce((sum, assignment) => sum + (assignment.amount ?? 0), 0)
  );

  return {
    remainingQuantity: roundQuantity(Math.max(0, (entry.quantity ?? 0) - assignedQuantity)),
    remainingTotal: roundCurrency(Math.max(0, (entry.lineTotal ?? 0) - assignedAmount))
  };
}

export function createDistributionState(result, members = []) {
  const sourceItems = Array.isArray(result?.items)
    ? result.items
    : Array.isArray(result?.lineItems)
      ? result.lineItems
      : [];
  const participants =
    Array.isArray(members) && members.length > 0
      ? members.map((member) => ({
          id: member.id,
          name: member.name
        }))
      : [{ id: "participant-meg", name: "Meg" }];

  return {
    participants,
    activeParticipantId: participants[0]?.id || "participant-meg",
    entries: sourceItems.map(createEntry)
  };
}

export function normalizeDistributionState(state, result, members = []) {
  const base = createDistributionState(result, members);

  if (!state || typeof state !== "object") {
    return base;
  }

  const participantsById = new Map(base.participants.map((participant) => [participant.id, participant]));
  const savedParticipants = Array.isArray(state.participants) ? state.participants : [];

  savedParticipants.forEach((participant) => {
    if (
      participant &&
      typeof participant.id === "string" &&
      typeof participant.name === "string" &&
      participant.name.trim() &&
      !participantsById.has(participant.id)
    ) {
      participantsById.set(participant.id, {
        id: participant.id,
        name: participant.name.trim()
      });
    }
  });

  const participants = Array.from(participantsById.values()).map(cloneParticipant);
  const participantIds = new Set(participants.map((participant) => participant.id));
  const savedEntries = Array.isArray(state.entries) ? state.entries : [];

  const entries = base.entries.map((entry, index) => {
    const savedEntry =
      savedEntries.find((candidate) => candidate?.id === entry.id) ?? savedEntries[index] ?? null;
    const assignments = Array.isArray(savedEntry?.assignments)
      ? savedEntry.assignments
          .map((assignment) => sanitizeAssignment(assignment, participantIds))
          .filter(Boolean)
      : [];

    const next = {
      ...cloneEntry(entry),
      assignments
    };

    return {
      ...next,
      ...deriveTotalsFromAssignments(next)
    };
  });

  const activeParticipantId = participantIds.has(state.activeParticipantId)
    ? state.activeParticipantId
    : participants[0]?.id || "participant-meg";

  return {
    participants,
    activeParticipantId,
    entries
  };
}

export function addParticipant(state, name) {
  const cleaned = typeof name === "string" ? name.trim() : "";

  if (!cleaned) {
    return state;
  }

  const participant = {
    id: createId("participant"),
    name: cleaned
  };

  return {
    ...state,
    participants: [...state.participants.map(cloneParticipant), participant],
    activeParticipantId: participant.id
  };
}

export function renameParticipant(state, participantId, name) {
  return {
    ...state,
    participants: state.participants.map((participant) =>
      participant.id === participantId ? { ...participant, name } : cloneParticipant(participant)
    )
  };
}

export function setActiveParticipant(state, participantId) {
  return {
    ...state,
    activeParticipantId: participantId
  };
}

export function assignWholeItem(state, { entryId, participantId, quantity }) {
  const requestedQuantity = toPositiveNumber(quantity);

  if (!participantId || !requestedQuantity) {
    return state;
  }

  return {
    ...state,
    entries: state.entries.map((entry) => {
      if (entry.id !== entryId) {
        return cloneEntry(entry);
      }

      if (requestedQuantity > entry.remainingQuantity + 0.0001) {
        return cloneEntry(entry);
      }

      const amount = roundCurrency(requestedQuantity * (entry.unitPrice ?? 0));
      const next = cloneEntry(entry);
      next.assignments.push({
        id: createId("assignment"),
        participantId,
        type: "whole",
        label: entry.name,
        quantity: requestedQuantity,
        amount,
        percent: null
      });

      return {
        ...next,
        ...deriveTotalsFromAssignments(next)
      };
    })
  };
}

export function splitEntryByPercent(state, { entryId, shares }) {
  const normalizedShares = Array.isArray(shares)
    ? shares
        .map((share) => ({
          participantId: share.participantId,
          percent: toPositiveNumber(share.percent)
        }))
        .filter((share) => share.participantId && share.percent)
    : [];

  if (normalizedShares.length === 0) {
    return state;
  }

  const totalPercent = roundPercent(
    normalizedShares.reduce((sum, share) => sum + (share.percent ?? 0), 0)
  );

  if (totalPercent > 100.001) {
    return state;
  }

  return {
    ...state,
    entries: state.entries.map((entry) => {
      if (entry.id !== entryId || entry.remainingTotal <= 0) {
        return cloneEntry(entry);
      }

      const next = cloneEntry(entry);
      let assignedAmount = 0;
      let assignedQuantity = 0;

      normalizedShares.forEach((share, index) => {
        const isLast = index === normalizedShares.length - 1;
        const quantityPortion = isLast
          ? roundQuantity((entry.remainingQuantity * totalPercent) / 100 - assignedQuantity)
          : roundQuantity((entry.remainingQuantity * share.percent) / 100);
        const rawAmount = roundCurrency((entry.remainingTotal * share.percent) / 100);
        const amountPortion = isLast
          ? roundCurrency((entry.remainingTotal * totalPercent) / 100 - assignedAmount)
          : rawAmount;

        assignedAmount = roundCurrency(assignedAmount + amountPortion);
        assignedQuantity = roundQuantity(assignedQuantity + quantityPortion);

        next.assignments.push({
          id: createId("assignment"),
          participantId: share.participantId,
          type: "split",
          label: entry.name,
          quantity: quantityPortion,
          amount: amountPortion,
          percent: share.percent
        });
      });

      return {
        ...next,
        remainingQuantity: roundQuantity(Math.max(0, entry.remainingQuantity - assignedQuantity)),
        remainingTotal: roundCurrency(
          Math.max(0, entry.remainingTotal - roundCurrency((entry.remainingTotal * totalPercent) / 100))
        )
      };
    })
  };
}

function buildEqualShares(participantIds) {
  const uniqueIds = Array.from(
    new Set(Array.isArray(participantIds) ? participantIds.filter((id) => typeof id === "string" && id) : [])
  );

  if (uniqueIds.length === 0) {
    return [];
  }

  const evenPercent = roundPercent(100 / uniqueIds.length);
  let assignedPercent = 0;

  return uniqueIds.map((participantId, index) => {
    const isLast = index === uniqueIds.length - 1;
    const percent = isLast ? roundPercent(100 - assignedPercent) : evenPercent;
    assignedPercent = roundPercent(assignedPercent + percent);

    return {
      participantId,
      percent
    };
  });
}

export function splitEntryEqually(state, { entryId, participantIds }) {
  const shares = buildEqualShares(participantIds);

  if (shares.length === 0) {
    return state;
  }

  return splitEntryByPercent(state, { entryId, shares });
}

export function splitAllEntriesEqually(state, { participantIds }) {
  const shares = buildEqualShares(participantIds);

  if (shares.length === 0) {
    return state;
  }

  return state.entries.reduce((current, entry) => {
    if (entry.remainingTotal <= 0.001) {
      return current;
    }

    return splitEntryByPercent(current, {
      entryId: entry.id,
      shares
    });
  }, state);
}

export function removeAssignment(state, { entryId, assignmentId }) {
  return {
    ...state,
    entries: state.entries.map((entry) => {
      if (entry.id !== entryId) {
        return cloneEntry(entry);
      }

      const next = cloneEntry(entry);
      next.assignments = next.assignments.filter((assignment) => assignment.id !== assignmentId);

      return {
        ...next,
        ...deriveTotalsFromAssignments(next)
      };
    })
  };
}

export function summarizeDistribution(state) {
  const participants = state.participants.map((participant) => {
    const assignments = [];

    state.entries.forEach((entry) => {
      entry.assignments.forEach((assignment) => {
        if (assignment.participantId !== participant.id) {
          return;
        }

        assignments.push({
          ...assignment,
          entryId: entry.id
        });
      });
    });

    const total = roundCurrency(assignments.reduce((sum, assignment) => sum + assignment.amount, 0));

    return {
      ...participant,
      assignments,
      total
    };
  });

  const remainingEntries = state.entries.filter((entry) => entry.remainingTotal > 0.001);
  const remainingTotal = roundCurrency(
    remainingEntries.reduce((sum, entry) => sum + entry.remainingTotal, 0)
  );

  return {
    participants,
    remainingEntries,
    remainingTotal
  };
}
