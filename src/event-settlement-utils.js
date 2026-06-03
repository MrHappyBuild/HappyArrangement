import { normalizeDistributionState, summarizeDistribution } from "./distribution-utils.js";
import { roundCurrency } from "./receipt-utils.js";

function createMemberSummary(member) {
  return {
    id: member.id,
    name: member.name,
    paidTotal: 0,
    usedTotal: 0,
    balance: 0,
    paidReceiptCount: 0
  };
}

export function buildEventSettlement(event, jobs) {
  const members = Array.isArray(event?.members) ? event.members : [];
  const relevantJobs = Array.isArray(jobs)
    ? jobs.filter((job) => job?.status === "completed" && job?.result && job?.event_id === event?.id)
    : [];
  const memberMap = new Map(members.map((member) => [member.id, createMemberSummary(member)]));
  let totalSpent = 0;
  let totalPaid = 0;
  let totalUsed = 0;
  let unassignedTotal = 0;
  let missingPayerCount = 0;

  relevantJobs.forEach((job) => {
    const grandTotal = roundCurrency(job.result?.grandTotal ?? 0);
    totalSpent = roundCurrency(totalSpent + grandTotal);

    if (job.paid_by_member_id && memberMap.has(job.paid_by_member_id)) {
      const payer = memberMap.get(job.paid_by_member_id);
      payer.paidTotal = roundCurrency(payer.paidTotal + grandTotal);
      payer.paidReceiptCount += 1;
      totalPaid = roundCurrency(totalPaid + grandTotal);
    } else {
      missingPayerCount += 1;
    }

    if (job.distribution_state) {
      const distribution = normalizeDistributionState(job.distribution_state, job.result, members);
      const summary = summarizeDistribution(distribution);
      const distributedAmount = roundCurrency(
        summary.participants.reduce((sum, participant) => sum + participant.total, 0)
      );

      summary.participants.forEach((participant) => {
        const member = memberMap.get(participant.id);

        if (!member) {
          return;
        }

        member.usedTotal = roundCurrency(member.usedTotal + participant.total);
      });

      totalUsed = roundCurrency(totalUsed + distributedAmount);
      unassignedTotal = roundCurrency(unassignedTotal + Math.max(0, grandTotal - distributedAmount));
    } else {
      unassignedTotal = roundCurrency(unassignedTotal + grandTotal);
    }
  });

  const membersSummary = members.map((member) => {
    const summary = memberMap.get(member.id) || createMemberSummary(member);

    return {
      ...summary,
      balance: roundCurrency(summary.paidTotal - summary.usedTotal)
    };
  });

  return {
    eventId: event?.id ?? null,
    eventName: event?.name ?? "Arrangement",
    receiptCount: relevantJobs.length,
    totalSpent,
    totalPaid,
    totalUsed,
    unassignedTotal,
    missingPayerCount,
    members: membersSummary
  };
}
