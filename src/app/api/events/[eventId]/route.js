import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { getEvent, updateEvent } from "@/lib/local-store";

function errorResponse(message, status) {
  return NextResponse.json({ error: message }, { status });
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(_request, context) {
  try {
    const params = await context.params;
    const event = await getEvent(params.eventId);

    if (!event) {
      return errorResponse("Fant ikke arrangementet.", 404);
    }

    return NextResponse.json({ event });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Kunne ikke hente arrangementet.",
      500
    );
  }
}

export async function PATCH(request, context) {
  try {
    const params = await context.params;
    const event = await getEvent(params.eventId);

    if (!event) {
      return errorResponse("Fant ikke arrangementet.", 404);
    }

    const payload = await request.json();
    const action = cleanString(payload?.action);

    if (!action) {
      return errorResponse("Mangler handling.", 400);
    }

    const next = await updateEvent(params.eventId, (current) => {
      if (action === "update_overview") {
        return {
          ...current,
          overview: {
            ...(current.overview || {}),
            ...(payload?.overview && typeof payload.overview === "object" ? payload.overview : {})
          }
        };
      }

      if (action === "add_person") {
        const name = cleanString(payload?.person?.name);

        if (!name) {
          throw new Error("Skriv inn navn for personen.");
        }

        const createdAt = new Date().toISOString();

        return {
          ...current,
          people: [
            ...(Array.isArray(current.people) ? current.people : []),
            {
              id: crypto.randomUUID(),
              name,
              email: cleanString(payload?.person?.email),
              note: cleanString(payload?.person?.note),
              created_at: createdAt,
              invitedAt: payload?.person?.invitedAt || null,
              respondedAt: payload?.person?.respondedAt || null,
              rsvpStatus: cleanString(payload?.person?.rsvpStatus) || "pending",
              planningRole: cleanString(payload?.person?.planningRole) || "viewer",
              projectRole: cleanString(payload?.person?.projectRole) || "none",
              financeRole: cleanString(payload?.person?.financeRole) || "none",
              capabilities:
                payload?.person?.capabilities && typeof payload.person.capabilities === "object"
                  ? payload.person.capabilities
                  : {}
            }
          ]
        };
      }

      if (action === "update_person") {
        const personId = cleanString(payload?.personId);

        if (!personId) {
          throw new Error("Mangler person.");
        }

        return {
          ...current,
          people: (current.people || []).map((person) =>
            person.id === personId
              ? {
                  ...person,
                  ...(payload?.changes && typeof payload.changes === "object" ? payload.changes : {}),
                  capabilities:
                    payload?.changes?.capabilities &&
                    typeof payload.changes.capabilities === "object"
                      ? {
                          ...(person.capabilities || {}),
                          ...payload.changes.capabilities
                        }
                      : person.capabilities
                }
              : person
          )
        };
      }

      if (action === "add_task") {
        const title = cleanString(payload?.task?.title);

        if (!title) {
          throw new Error("Skriv inn en oppgave.");
        }

        return {
          ...current,
          tasks: [
            ...(current.tasks || []),
            {
              id: crypto.randomUUID(),
              title,
              description: cleanString(payload?.task?.description),
              dueDate: cleanString(payload?.task?.dueDate),
              status: cleanString(payload?.task?.status) || "todo",
              assigneeIds: Array.isArray(payload?.task?.assigneeIds)
                ? payload.task.assigneeIds.filter((assigneeId) => typeof assigneeId === "string")
                : [],
              created_at: new Date().toISOString()
            }
          ]
        };
      }

      if (action === "update_task") {
        const taskId = cleanString(payload?.taskId);

        if (!taskId) {
          throw new Error("Mangler oppgave.");
        }

        return {
          ...current,
          tasks: (current.tasks || []).map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  ...(payload?.changes && typeof payload.changes === "object" ? payload.changes : {})
                }
              : task
          )
        };
      }

      if (action === "add_ledger_entry") {
        const memberId = cleanString(payload?.entry?.memberId);
        const amount =
          typeof payload?.entry?.amount === "number"
            ? payload.entry.amount
            : Number(payload?.entry?.amount || 0);

        if (!memberId || !Number.isFinite(amount) || amount <= 0) {
          throw new Error("Velg medlem og skriv inn et gyldig belop.");
        }

        return {
          ...current,
          ledgerEntries: [
            ...(current.ledgerEntries || []),
            {
              id: crypto.randomUUID(),
              type: cleanString(payload?.entry?.type) || "advance_contribution",
              memberId,
              counterpartyMemberId: cleanString(payload?.entry?.counterpartyMemberId),
              amount,
              note: cleanString(payload?.entry?.note),
              status: cleanString(payload?.entry?.status) || "approved",
              created_at: new Date().toISOString()
            }
          ]
        };
      }

      if (action === "update_ledger_entry") {
        const entryId = cleanString(payload?.entryId);

        if (!entryId) {
          throw new Error("Mangler post.");
        }

        return {
          ...current,
          ledgerEntries: (current.ledgerEntries || []).map((entry) =>
            entry.id === entryId
              ? {
                  ...entry,
                  ...(payload?.changes && typeof payload.changes === "object" ? payload.changes : {})
                }
              : entry
          )
        };
      }

      if (action === "add_submission") {
        const title = cleanString(payload?.submission?.title);
        const submittedByPersonId = cleanString(payload?.submission?.submittedByPersonId);

        if (!title || !submittedByPersonId) {
          throw new Error("Mangler tittel eller innsender.");
        }

        return {
          ...current,
          submissions: [
            ...(current.submissions || []),
            {
              id: crypto.randomUUID(),
              type: cleanString(payload?.submission?.type) || "receipt_upload",
              title,
              submittedByPersonId,
              status: cleanString(payload?.submission?.status) || "pending_approval",
              note: cleanString(payload?.submission?.note),
              created_at: new Date().toISOString()
            }
          ]
        };
      }

      if (action === "update_submission") {
        const submissionId = cleanString(payload?.submissionId);

        if (!submissionId) {
          throw new Error("Mangler innsending.");
        }

        return {
          ...current,
          submissions: (current.submissions || []).map((submission) =>
            submission.id === submissionId
              ? {
                  ...submission,
                  ...(payload?.changes && typeof payload.changes === "object"
                    ? payload.changes
                    : {})
                }
              : submission
          )
        };
      }

      throw new Error("Ukjent handling.");
    });

    return NextResponse.json({ event: next });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Kunne ikke oppdatere arrangementet.",
      400
    );
  }
}
