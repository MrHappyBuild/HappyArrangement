import { NextResponse } from "next/server";

import { getEvent, getLocalJob, updateLocalJob } from "@/lib/local-store";
import { normalizeDistributionState } from "@/distribution-utils";
import { rebuildReceiptFromEditor } from "@/receipt-utils";

export const dynamic = "force-dynamic";

function notFound() {
  return NextResponse.json({ error: "Fant ikke analysen." }, { status: 404 });
}

export async function GET(_request, context) {
  const { jobId } = await context.params;
  const job = await getLocalJob(jobId);

  if (!job) {
    return notFound();
  }

  return NextResponse.json({ job });
}

export async function PATCH(request, context) {
  const { jobId } = await context.params;
  const existing = await getLocalJob(jobId);

  if (!existing) {
    return notFound();
  }

  let payload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Kunne ikke lese endringene." }, { status: 400 });
  }

  const hasResultUpdate = payload?.result && typeof payload.result === "object";
  const hasPaidByUpdate = Object.prototype.hasOwnProperty.call(payload ?? {}, "paidByMemberId");
  const hasDistributionUpdate = Object.prototype.hasOwnProperty.call(payload ?? {}, "distributionState");

  if (!hasResultUpdate && !hasPaidByUpdate && !hasDistributionUpdate) {
    return NextResponse.json({ error: "Mangler oppdatert analyse eller metadata." }, { status: 400 });
  }

  const event = existing.event_id ? await getEvent(existing.event_id) : null;
  const eventMembers = Array.isArray(event?.members) ? event.members : [];
  const normalizedResult = hasResultUpdate ? rebuildReceiptFromEditor(payload.result) : existing.result;
  let paidByMemberId = existing.paid_by_member_id ?? null;
  let distributionState = existing.distribution_state ?? null;

  if (hasPaidByUpdate) {
    if (payload.paidByMemberId == null || payload.paidByMemberId === "") {
      paidByMemberId = null;
    } else if (typeof payload.paidByMemberId === "string") {
      if (existing.event_id && !eventMembers.some((member) => member.id === payload.paidByMemberId)) {
        return NextResponse.json({ error: "Betaler må være et medlem i arrangementet." }, { status: 400 });
      }

      paidByMemberId = payload.paidByMemberId;
    } else {
      return NextResponse.json({ error: "Ugyldig betaler." }, { status: 400 });
    }
  }

  if (hasDistributionUpdate) {
    if (payload.distributionState == null) {
      distributionState = null;
    } else if (payload.distributionState && typeof payload.distributionState === "object") {
      distributionState = normalizeDistributionState(payload.distributionState, normalizedResult, eventMembers);
    } else {
      return NextResponse.json({ error: "Ugyldig fordeling." }, { status: 400 });
    }
  }

  const updatedJob = await updateLocalJob(jobId, (current) => ({
    ...current,
    ...(hasResultUpdate
      ? {
          status: "completed",
          error_message: null,
          result: normalizedResult,
          completed_at: current.completed_at ?? new Date().toISOString()
        }
      : {}),
    ...(hasPaidByUpdate ? { paid_by_member_id: paidByMemberId } : {}),
    ...(hasDistributionUpdate ? { distribution_state: distributionState } : {})
  }));

  return NextResponse.json({ job: updatedJob });
}
