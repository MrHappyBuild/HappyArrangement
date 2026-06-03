import { normalizeDistributionState, summarizeDistribution } from "./distribution-utils.js";
import { buildEventSettlement } from "./event-settlement-utils.js";
import { roundCurrency, roundQuantity } from "./receipt-utils.js";

function sanitizeLineItem(item, index) {
  return {
    name: typeof item?.name === "string" && item.name.trim() ? item.name.trim() : `Vare ${index + 1}`,
    quantity: roundQuantity(item?.quantity ?? 0),
    unitPrice: roundCurrency(item?.unitPrice ?? 0),
    lineTotal: roundCurrency(item?.lineTotal ?? 0),
    rawLine: item?.rawLine || ""
  };
}

function summarizeJobDistribution(job, members) {
  if (!job?.distribution_state || !job?.result) {
    return {
      distributedTotal: 0,
      unassignedTotal: roundCurrency(job?.result?.grandTotal ?? 0),
      distribution: null,
      summary: null
    };
  }

  const distribution = normalizeDistributionState(job.distribution_state, job.result, members);
  const summary = summarizeDistribution(distribution);
  const distributedTotal = roundCurrency(
    summary.participants.reduce((sum, participant) => sum + (participant.total ?? 0), 0)
  );
  const unassignedTotal = roundCurrency(Math.max(0, (job.result?.grandTotal ?? 0) - distributedTotal));

  return {
    distributedTotal,
    unassignedTotal,
    distribution,
    summary
  };
}

export function createEventExportPayload(event, jobs) {
  const members = Array.isArray(event?.members)
    ? event.members.map((member) => ({
        id: member.id,
        name: member.name
      }))
    : [];
  const relevantJobs = Array.isArray(jobs)
    ? jobs.filter((job) => job?.status === "completed" && job?.result && job?.event_id === event?.id)
    : [];
  const memberNames = new Map(members.map((member) => [member.id, member.name]));
  const summary = buildEventSettlement(
    {
      id: event?.id ?? null,
      name: event?.name ?? "Arrangement",
      members
    },
    relevantJobs
  );
  const memberDetails = new Map(
    summary.members.map((member) => [
      member.id,
      {
        ...member,
        receiptSummaries: [],
        lineAssignments: []
      }
    ])
  );

  const receipts = relevantJobs.map((job) => {
    const result = job.result || {};
    const lineItems = (result.lineItems || result.items || []).map(sanitizeLineItem);
    const { distributedTotal, unassignedTotal, distribution, summary: distributionSummary } =
      summarizeJobDistribution(job, members);
    const receipt = {
      id: job.id,
      title: job.original_filename || "Uten filnavn",
      createdAt: job.created_at || null,
      merchantName: result.merchantName || "",
      receiptDate: result.receiptDate || "",
      receiptTime: result.receiptTime || "",
      currency: result.currency || "NOK",
      subtotal: result.subtotal ?? null,
      taxTotal: result.taxTotal ?? null,
      grandTotal: roundCurrency(result.grandTotal ?? 0),
      itemsTotal: roundCurrency(result?.totals?.itemsTotal ?? 0),
      difference: roundCurrency(result?.totals?.difference ?? 0),
      paidByMemberId: job.paid_by_member_id || null,
      paidByMemberName: memberNames.get(job.paid_by_member_id) || "",
      distributedTotal,
      unassignedTotal,
      lineItems
    };

    const participantMap = new Map(
      (distributionSummary?.participants || []).map((participant) => [participant.id, participant])
    );
    const entryMap = new Map((distribution?.entries || []).map((entry) => [entry.id, entry]));

    memberDetails.forEach((member) => {
      const paidAmount = member.id === receipt.paidByMemberId ? receipt.grandTotal : 0;
      const participant = participantMap.get(member.id);
      const usedAmount = roundCurrency(participant?.total ?? 0);

      if (paidAmount > 0 || usedAmount > 0) {
        member.receiptSummaries.push({
          receiptId: receipt.id,
          receiptTitle: receipt.title,
          merchantName: receipt.merchantName,
          receiptDate: receipt.receiptDate,
          receiptTime: receipt.receiptTime,
          paidByMemberName: receipt.paidByMemberName,
          receiptTotal: receipt.grandTotal,
          memberUsedTotal: usedAmount,
          memberPaidTotal: paidAmount,
          role:
            paidAmount > 0 && usedAmount > 0
              ? "Betalt og brukt"
              : paidAmount > 0
                ? "Betalt"
                : "Brukt"
        });
      }

      if (!participant?.assignments?.length) {
        return;
      }

      participant.assignments.forEach((assignment) => {
        const entry = entryMap.get(assignment.entryId) || {};

        member.lineAssignments.push({
          receiptId: receipt.id,
          receiptTitle: receipt.title,
          merchantName: receipt.merchantName,
          receiptDate: receipt.receiptDate,
          receiptTime: receipt.receiptTime,
          paidByMemberName: receipt.paidByMemberName,
          itemName: assignment.label || entry.name || "Vare",
          type: assignment.type,
          quantity: roundQuantity(assignment.quantity ?? 0),
          percent: assignment.percent ?? null,
          amount: roundCurrency(assignment.amount ?? 0),
          unitPrice: roundCurrency(entry.unitPrice ?? 0),
          lineTotal: roundCurrency(entry.lineTotal ?? 0)
        });
      });
    });

    return receipt;
  });

  const detailedMembers = summary.members.map(
    (member) =>
      memberDetails.get(member.id) || {
        ...member,
        receiptSummaries: [],
        lineAssignments: []
      }
  );

  return {
    eventId: event?.id ?? null,
    eventName: event?.name ?? "Arrangement",
    members,
    summary: {
      ...summary,
      members: detailedMembers
    },
    receipts
  };
}
