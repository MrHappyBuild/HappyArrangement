import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { getLocalEnv } from "@/lib/env";
import { buildTaskAgenda } from "@/event-platform-utils";
import { analyzeReceiptWithOllama } from "@/lib/local-ai";
import {
  createLocalJob,
  createManualLocalJob,
  getEvent,
  readSubmissionReceiptMedia,
  updateEvent,
  updateLocalJob
} from "@/lib/local-store";
import { sha256 } from "@/lib/uploads";
import {
  buildManualInvoiceResultFromSubmission,
  deriveSubmissionStatusFromReceiptJob,
  shouldPromoteSubmission
} from "@/submission-utils";
import { normalizeVenuePlan } from "@/venue-layout-utils";
import {
  applyTaskRelationshipUpdates,
  deriveFollowingTaskIds
} from "@/task-dependency-utils";
import { applyTaskHierarchyUpdates, moveTaskSubtree } from "@/task-hierarchy-utils";

function errorResponse(message, status) {
  return NextResponse.json({ error: message }, { status });
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanIdList(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return Array.from(
    new Set(values.map((value) => cleanString(value)).filter(Boolean))
  );
}

function normalizeGuestPageVisibility(value) {
  return cleanString(value) === "guests" ? "guests" : "open";
}

function normalizeGuestPageFontPreset(value) {
  const normalized = cleanString(value);
  return ["clean", "editorial", "classic"].includes(normalized) ? normalized : "clean";
}

function normalizeGuestPageTextSize(value) {
  const normalized = cleanString(value);
  return ["sm", "md", "lg"].includes(normalized) ? normalized : "md";
}

function normalizeGuestPageTextWeight(value) {
  return cleanString(value) === "bold" ? "bold" : "regular";
}

function normalizeGuestPageShowImageCaption(value) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = cleanString(value).toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "on";
}

function normalizeGuestAgendaPageSettings(value, fallback = null) {
  const safeValue = value && typeof value === "object" ? value : {};
  const fallbackValue = fallback && typeof fallback === "object" ? fallback : {};

  return {
    isPublished:
      "isPublished" in safeValue
        ? normalizeBooleanInput(safeValue.isPublished)
        : normalizeBooleanInput(fallbackValue.isPublished),
    navigationLabel:
      cleanString(safeValue.navigationLabel) ||
      cleanString(fallbackValue.navigationLabel) ||
      "Agenda"
  };
}

function normalizeGuestSiteBackgroundMode(value, fallback = "shell") {
  const normalized = cleanString(value);

  if (normalized === "page") {
    return "page";
  }

  if (normalized === "shell") {
    return "shell";
  }

  return fallback === "page" ? "page" : "shell";
}

function normalizeBooleanInput(value) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = cleanString(value).toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "on";
}

function normalizeDuration(value, fallback = 60) {
  const numeric = typeof value === "number" ? value : Number.parseInt(String(value || ""), 10);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }

  return numeric;
}

function isEventMember(event, personId) {
  return !!personId && Array.isArray(event?.members) && event.members.some((member) => member.id === personId);
}

async function promoteReceiptSubmission(event, submission) {
  const storedMedia = await readSubmissionReceiptMedia(
    event.id,
    submission.id,
    submission.storedImagePath
  );

  if (!storedMedia?.buffer) {
    throw new Error("Fant ikke kvitteringsbildet for innsendingen.");
  }

  const paidByMemberId = isEventMember(event, submission.submittedByPersonId)
    ? submission.submittedByPersonId
    : null;
  const initialJob = await createLocalJob({
    fileName: submission.imageOriginalFilename || submission.title || "Kvittering",
    sanitized: {
      buffer: storedMedia.buffer,
      contentType: submission.imageContentType || storedMedia.contentType || "image/png",
      extension: "png",
      sha256: sha256(storedMedia.buffer)
    },
    eventId: event.id
  });

  const env = getLocalEnv();
  let promotedJob = initialJob;

  if (env.receiptProcessingMode === "queue") {
    promotedJob = await updateLocalJob(initialJob.id, () => ({
      status: "queued",
      error_message: null,
      completed_at: null,
      paid_by_member_id: paidByMemberId
    }));
  } else {
    try {
      const result = await analyzeReceiptWithOllama(storedMedia.buffer);
      promotedJob = await updateLocalJob(initialJob.id, () => ({
        status: "completed",
        result,
        error_message: null,
        completed_at: new Date().toISOString(),
        paid_by_member_id: paidByMemberId
      }));
    } catch (error) {
      promotedJob = await updateLocalJob(initialJob.id, () => ({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Ukjent analysefeil.",
        completed_at: new Date().toISOString(),
        paid_by_member_id: paidByMemberId
      }));
    }
  }

  return {
    job: promotedJob,
    submissionChanges: {
      status: deriveSubmissionStatusFromReceiptJob(promotedJob.status),
      promotedJobId: promotedJob.id,
      promotedAt: new Date().toISOString(),
      approvalError: promotedJob.status === "failed" ? promotedJob.error_message || "" : ""
    }
  };
}

async function promoteManualInvoiceSubmission(event, submission) {
  const paidByMemberId = isEventMember(event, submission.submittedByPersonId)
    ? submission.submittedByPersonId
    : null;
  const job = await createManualLocalJob({
    fileName: submission.title || "Manuell faktura",
    eventId: event.id,
    result: buildManualInvoiceResultFromSubmission(submission),
    paidByMemberId
  });

  return {
    job,
    submissionChanges: {
      status: "processed",
      promotedJobId: job.id,
      promotedAt: new Date().toISOString(),
      approvalError: ""
    }
  };
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

    if (action === "update_submission") {
      const submissionId = cleanString(payload?.submissionId);

      if (!submissionId) {
        return errorResponse("Mangler innsending.", 400);
      }

      const currentSubmission = Array.isArray(event.submissions)
        ? event.submissions.find((submission) => submission.id === submissionId)
        : null;

      if (!currentSubmission) {
        return errorResponse("Fant ikke innsendingen.", 404);
      }

      const requestedChanges =
        payload?.changes && typeof payload.changes === "object" ? payload.changes : {};
      const requestedStatus = cleanString(requestedChanges.status) || currentSubmission.status;
      let promotionResult = null;

      if (shouldPromoteSubmission(currentSubmission, requestedStatus)) {
        if (currentSubmission.type === "receipt_upload") {
          promotionResult = await promoteReceiptSubmission(event, currentSubmission);
        } else if (currentSubmission.type === "manual_invoice") {
          promotionResult = await promoteManualInvoiceSubmission(event, currentSubmission);
        }
      }

      const next = await updateEvent(params.eventId, (current) => ({
        ...current,
        submissions: (current.submissions || []).map((submission) =>
          submission.id === submissionId
            ? {
                ...submission,
                ...requestedChanges,
                ...(promotionResult?.submissionChanges || {})
              }
            : submission
        )
      }));

      return NextResponse.json({
        event: next,
        promotedJobId: promotionResult?.job?.id || null
      });
    }

    const next = await updateEvent(params.eventId, (current) => {
      if (action === "update_overview") {
        return {
          ...current,
          overview: {
            ...(current.overview || {}),
            ...(payload?.overview && typeof payload.overview === "object" ? payload.overview : {})
          },
          guestSite: {
            ...(current.guestSite && typeof current.guestSite === "object" ? current.guestSite : {}),
            agendaPage: normalizeGuestAgendaPageSettings(
              payload?.guestAgendaPage,
              current.guestSite?.agendaPage
            )
          }
        };
      }

      if (action === "update_guest_site") {
        return {
          ...current,
          guestSite: {
            ...(current.guestSite && typeof current.guestSite === "object"
              ? current.guestSite
              : {}),
            introText: cleanString(payload?.guestSite?.introText),
            navigationLabel: cleanString(payload?.guestSite?.navigationLabel) || "Navigasjon",
            backgroundImageUrl: cleanString(payload?.guestSite?.backgroundImageUrl),
            backgroundMode: normalizeGuestSiteBackgroundMode(
              payload?.guestSite?.backgroundMode,
              current.guestSite?.backgroundMode
            ),
            agendaPage: normalizeGuestAgendaPageSettings(
              payload?.guestSite?.agendaPage,
              current.guestSite?.agendaPage
            )
          }
        };
      }

      if (action === "add_guest_page") {
        const title = cleanString(payload?.page?.title);

        if (!title) {
          throw new Error("Skriv inn navn pa siden.");
        }

        const currentPages = Array.isArray(current.guestPages) ? current.guestPages : [];
        const createdAt = new Date().toISOString();

        return {
          ...current,
          guestPages: [
            ...currentPages,
            {
              id: crypto.randomUUID(),
              title,
              menuLabel: cleanString(payload?.page?.menuLabel) || title,
              content: cleanString(payload?.page?.content),
              visibility: normalizeGuestPageVisibility(payload?.page?.visibility),
              fontPreset: normalizeGuestPageFontPreset(payload?.page?.fontPreset),
              textSize: normalizeGuestPageTextSize(payload?.page?.textSize),
              textWeight: normalizeGuestPageTextWeight(payload?.page?.textWeight),
              showImageCaption: normalizeGuestPageShowImageCaption(
                payload?.page?.showImageCaption
              ),
              orderIndex: currentPages.length,
              created_at: createdAt,
              updated_at: createdAt
            }
          ]
        };
      }

      if (action === "update_guest_page") {
        const pageId = cleanString(payload?.pageId);

        if (!pageId) {
          throw new Error("Mangler side.");
        }

        return {
          ...current,
          guestPages: (current.guestPages || []).map((page) =>
            page.id === pageId
              ? {
                  ...page,
                  ...(payload?.changes && typeof payload.changes === "object" ? payload.changes : {}),
                  visibility: normalizeGuestPageVisibility(
                    payload?.changes && typeof payload.changes === "object"
                      ? payload.changes.visibility
                      : page.visibility
                  ),
                  fontPreset: normalizeGuestPageFontPreset(
                    payload?.changes && typeof payload.changes === "object"
                      ? payload.changes.fontPreset
                      : page.fontPreset
                  ),
                  textSize: normalizeGuestPageTextSize(
                    payload?.changes && typeof payload.changes === "object"
                      ? payload.changes.textSize
                      : page.textSize
                  ),
                  textWeight: normalizeGuestPageTextWeight(
                    payload?.changes && typeof payload.changes === "object"
                      ? payload.changes.textWeight
                      : page.textWeight
                  ),
                  showImageCaption: normalizeGuestPageShowImageCaption(
                    payload?.changes && typeof payload.changes === "object"
                      ? payload.changes.showImageCaption
                      : page.showImageCaption
                  ),
                  updated_at: new Date().toISOString()
                }
              : page
          )
        };
      }

      if (action === "delete_guest_page") {
        const pageId = cleanString(payload?.pageId);

        if (!pageId) {
          throw new Error("Mangler side som skal slettes.");
        }

        return {
          ...current,
          guestPages: (current.guestPages || [])
            .filter((page) => page.id !== pageId)
            .map((page, index) => ({
              ...page,
              orderIndex: index
            }))
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
              phone: cleanString(payload?.person?.phone),
              note: cleanString(payload?.person?.note),
              allergies: cleanString(payload?.person?.allergies),
              dietaryNotes: cleanString(payload?.person?.dietaryNotes),
              seatingNote: cleanString(payload?.person?.seatingNote),
              created_at: createdAt,
              invitedAt: payload?.person?.invitedAt || null,
              respondedAt: payload?.person?.respondedAt || null,
              rsvpStatus: cleanString(payload?.person?.rsvpStatus) || "pending",
              planningRole: cleanString(payload?.person?.planningRole) || "viewer",
              projectRole: cleanString(payload?.person?.projectRole) || "none",
              financeRole: cleanString(payload?.person?.financeRole) || "none",
              roleIds: cleanIdList(payload?.person?.roleIds),
              useDirectAccessOverrides: normalizeBooleanInput(
                payload?.person?.useDirectAccessOverrides
              ),
              capabilities:
                payload?.person?.capabilities && typeof payload.person.capabilities === "object"
                  ? payload.person.capabilities
                  : {}
            }
          ]
        };
      }

      if (action === "add_role") {
        const name = cleanString(payload?.role?.name);

        if (!name) {
          throw new Error("Skriv inn navn for rollen.");
        }

        const createdAt = new Date().toISOString();

        return {
          ...current,
          roles: [
            ...(Array.isArray(current.roles) ? current.roles : []),
            {
              id: crypto.randomUUID(),
              key: cleanString(payload?.role?.key),
              name,
              description: cleanString(payload?.role?.description),
              planningRole: cleanString(payload?.role?.planningRole) || "none",
              projectRole: cleanString(payload?.role?.projectRole) || "none",
              financeRole: cleanString(payload?.role?.financeRole) || "none",
              capabilities:
                payload?.role?.capabilities && typeof payload.role.capabilities === "object"
                  ? payload.role.capabilities
                  : {},
              created_at: createdAt
            }
          ]
        };
      }

      if (action === "update_venue_plan") {
        return {
          ...current,
          venuePlan: normalizeVenuePlan(payload?.venuePlan)
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
                  phone:
                    payload?.changes && typeof payload.changes === "object"
                      ? cleanString(payload.changes.phone)
                      : person.phone,
                  roleIds:
                    payload?.changes && typeof payload.changes === "object"
                      ? cleanIdList(payload.changes.roleIds)
                      : cleanIdList(person.roleIds),
                  useDirectAccessOverrides:
                    payload?.changes && typeof payload.changes === "object"
                      ? normalizeBooleanInput(payload.changes.useDirectAccessOverrides)
                      : normalizeBooleanInput(person.useDirectAccessOverrides),
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

      if (action === "update_role") {
        const roleId = cleanString(payload?.roleId);

        if (!roleId) {
          throw new Error("Mangler rolle.");
        }

        return {
          ...current,
          roles: (current.roles || []).map((role) =>
            role.id === roleId
              ? {
                  ...role,
                  ...(payload?.changes && typeof payload.changes === "object" ? payload.changes : {}),
                  name:
                    payload?.changes && typeof payload.changes === "object"
                      ? cleanString(payload.changes.name) || role.name
                      : role.name,
                  description:
                    payload?.changes && typeof payload.changes === "object"
                      ? cleanString(payload.changes.description)
                      : role.description,
                  capabilities:
                    payload?.changes?.capabilities &&
                    typeof payload.changes.capabilities === "object"
                      ? {
                          ...(role.capabilities || {}),
                          ...payload.changes.capabilities
                        }
                      : role.capabilities
                }
              : role
          )
        };
      }

      if (action === "add_task") {
        const title = cleanString(payload?.task?.title);
        const taskId = crypto.randomUUID();
        const baseTasks = [...(current.tasks || [])];
        const dependencyIds = cleanIdList(payload?.task?.dependencyIds);
        const followingTaskIds = cleanIdList(payload?.task?.followingTaskIds);
        const subprojectIds = (current.subprojects || []).map((subproject) => subproject.id);

        if (!title) {
          throw new Error("Skriv inn en oppgave.");
        }

        baseTasks.push({
          id: taskId,
          title,
          description: cleanString(payload?.task?.description),
          agendaComment: cleanString(payload?.task?.agendaComment),
          dueDate: cleanString(payload?.task?.dueDate),
          desiredStartAt: cleanString(payload?.task?.desiredStartAt),
          isFixedTime: normalizeBooleanInput(payload?.task?.isFixedTime),
          showOnAgenda: normalizeBooleanInput(payload?.task?.showOnAgenda),
          durationMinutes: normalizeDuration(payload?.task?.durationMinutes),
          status: cleanString(payload?.task?.status) || "todo",
          orderIndex: Array.isArray(current.tasks) ? current.tasks.length : 0,
          dependencyIds,
          subprojectId: cleanString(payload?.task?.subprojectId),
          parentTaskId: cleanString(payload?.task?.parentTaskId),
          assigneeIds: cleanIdList(payload?.task?.assigneeIds),
          created_at: new Date().toISOString()
        });

        const hierarchyTasks = applyTaskHierarchyUpdates(
          baseTasks,
          taskId,
          cleanString(payload?.task?.parentTaskId),
          cleanString(payload?.task?.subprojectId),
          subprojectIds
        );

        return {
          ...current,
          tasks: applyTaskRelationshipUpdates(
            hierarchyTasks,
            taskId,
            dependencyIds,
            followingTaskIds
          )
        };
      }

      if (action === "add_subproject") {
        const name = cleanString(payload?.subproject?.name);

        if (!name) {
          throw new Error("Skriv inn navn pa delprosjektet.");
        }

        return {
          ...current,
          subprojects: [
            ...(current.subprojects || []),
            {
              id: crypto.randomUUID(),
              name,
              description: cleanString(payload?.subproject?.description),
              orderIndex: Array.isArray(current.subprojects) ? current.subprojects.length : 0,
              created_at: new Date().toISOString()
            }
          ]
        };
      }

      if (action === "update_subproject") {
        const subprojectId = cleanString(payload?.subprojectId);

        if (!subprojectId) {
          throw new Error("Mangler delprosjekt.");
        }

        return {
          ...current,
          subprojects: (current.subprojects || []).map((subproject) =>
            subproject.id === subprojectId
              ? {
                  ...subproject,
                  ...(payload?.changes && typeof payload.changes === "object" ? payload.changes : {}),
                  name:
                    cleanString(payload?.changes?.name) || subproject.name,
                  description:
                    Object.prototype.hasOwnProperty.call(payload?.changes || {}, "description")
                      ? cleanString(payload?.changes?.description)
                      : subproject.description
                }
              : subproject
          )
        };
      }

      if (action === "delete_subproject") {
        const subprojectId = cleanString(payload?.subprojectId);

        if (!subprojectId) {
          throw new Error("Mangler delprosjekt som skal slettes.");
        }

        return {
          ...current,
          subprojects: (current.subprojects || [])
            .filter((subproject) => subproject.id !== subprojectId)
            .map((subproject, index) => ({
              ...subproject,
              orderIndex: index
            })),
          tasks: (current.tasks || []).map((task) =>
            cleanString(task?.subprojectId) === subprojectId
              ? {
                  ...task,
                  subprojectId: ""
                }
              : task
          )
        };
      }

      if (action === "update_task") {
        const taskId = cleanString(payload?.taskId);
        const currentTasks = current.tasks || [];
        const existingTask = currentTasks.find((task) => task.id === taskId);
        const rawChanges =
          payload?.changes && typeof payload.changes === "object" ? payload.changes : {};
        const hasDependencyIds = Object.prototype.hasOwnProperty.call(rawChanges, "dependencyIds");
        const hasFollowingTaskIds = Object.prototype.hasOwnProperty.call(rawChanges, "followingTaskIds");
        const {
          dependencyIds: _ignoredDependencyIds,
          followingTaskIds: _ignoredFollowingTaskIds,
          assigneeIds: _ignoredAssigneeIds,
          durationMinutes: _ignoredDurationMinutes,
          isFixedTime: _ignoredIsFixedTime,
          showOnAgenda: _ignoredShowOnAgenda,
          agendaComment: _ignoredAgendaComment,
          parentTaskId: _ignoredParentTaskId,
          subprojectId: _ignoredSubprojectId,
          ...directChanges
        } = rawChanges;

        if (!taskId) {
          throw new Error("Mangler oppgave.");
        }

        if (!existingTask) {
          throw new Error("Fant ikke oppgaven.");
        }

        const nextDependencyIds = hasDependencyIds
          ? cleanIdList(rawChanges.dependencyIds)
          : cleanIdList(existingTask.dependencyIds);
        const nextFollowingTaskIds = hasFollowingTaskIds
          ? cleanIdList(rawChanges.followingTaskIds)
          : deriveFollowingTaskIds(currentTasks, taskId);
        const baseTasks = currentTasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                ...directChanges,
                durationMinutes:
                  Object.prototype.hasOwnProperty.call(rawChanges, "durationMinutes")
                    ? normalizeDuration(rawChanges.durationMinutes, task.durationMinutes || 60)
                    : task.durationMinutes,
                isFixedTime:
                  Object.prototype.hasOwnProperty.call(rawChanges, "isFixedTime")
                    ? normalizeBooleanInput(rawChanges.isFixedTime)
                    : task.isFixedTime,
                showOnAgenda:
                  Object.prototype.hasOwnProperty.call(rawChanges, "showOnAgenda")
                    ? normalizeBooleanInput(rawChanges.showOnAgenda)
                    : task.showOnAgenda,
                agendaComment:
                  Object.prototype.hasOwnProperty.call(rawChanges, "agendaComment")
                    ? cleanString(rawChanges.agendaComment)
                    : task.agendaComment,
                dependencyIds: nextDependencyIds.filter((dependencyId) => dependencyId !== task.id),
                assigneeIds:
                  Object.prototype.hasOwnProperty.call(rawChanges, "assigneeIds")
                    ? cleanIdList(rawChanges.assigneeIds)
                    : task.assigneeIds
              }
            : task
        );
        const hierarchyTasks = applyTaskHierarchyUpdates(
          baseTasks,
          taskId,
          Object.prototype.hasOwnProperty.call(rawChanges, "parentTaskId")
            ? cleanString(rawChanges.parentTaskId)
            : cleanString(existingTask.parentTaskId),
          Object.prototype.hasOwnProperty.call(rawChanges, "subprojectId")
            ? cleanString(rawChanges.subprojectId)
            : cleanString(existingTask.subprojectId),
          (current.subprojects || []).map((subproject) => subproject.id)
        );

        return {
          ...current,
          tasks: applyTaskRelationshipUpdates(
            hierarchyTasks,
            taskId,
            nextDependencyIds,
            nextFollowingTaskIds
          )
        };
      }

      if (action === "reorder_tasks") {
        const orderedTaskIds = cleanIdList(payload?.taskIds);

        if (orderedTaskIds.length === 0) {
          throw new Error("Mangler ny rekkefolge pa oppgavene.");
        }

        const tasksById = new Map((current.tasks || []).map((task) => [task.id, task]));
        const reordered = orderedTaskIds
          .map((taskId) => tasksById.get(taskId))
          .filter(Boolean);
        const missingTasks = (current.tasks || []).filter((task) => !orderedTaskIds.includes(task.id));
        const nextTasks = [...reordered, ...missingTasks].map((task, index) => ({
          ...task,
          orderIndex: index
        }));

        return {
          ...current,
          tasks: nextTasks
        };
      }

      if (action === "move_task_tree") {
        const sourceTaskId = cleanString(payload?.sourceTaskId);
        const targetTaskId = cleanString(payload?.targetTaskId);
        const placement = cleanString(payload?.placement);

        if (!sourceTaskId || !targetTaskId) {
          throw new Error("Mangler oppgave som skal flyttes eller slippmal.");
        }

        return {
          ...current,
          tasks: moveTaskSubtree(
            current.tasks || [],
            sourceTaskId,
            targetTaskId,
            placement,
            current.subprojects || []
          )
        };
      }

      if (action === "scale_tasks") {
        const scopedTaskIds = cleanIdList(payload?.taskIds);
        const scopedTaskIdSet = scopedTaskIds.length > 0 ? new Set(scopedTaskIds) : null;
        const agenda = buildTaskAgenda(current);

        return {
          ...current,
          tasks: (current.tasks || []).map((task) => {
            if (
              !task ||
              typeof task !== "object" ||
              (scopedTaskIdSet && !scopedTaskIdSet.has(task.id)) ||
              normalizeBooleanInput(task.isFixedTime)
            ) {
              return task;
            }

            const agendaTask = agenda.tasks.find((candidate) => candidate.id === task.id);

            if (!agendaTask?.scheduledStartAt) {
              return task;
            }

            return {
              ...task,
              desiredStartAt: agendaTask.scheduledStartAt
            };
          })
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

      if (action === "delete_ledger_entry") {
        const entryId = cleanString(payload?.entryId);

        if (!entryId) {
          throw new Error("Mangler post som skal slettes.");
        }

        return {
          ...current,
          ledgerEntries: (current.ledgerEntries || []).filter((entry) => entry.id !== entryId)
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
