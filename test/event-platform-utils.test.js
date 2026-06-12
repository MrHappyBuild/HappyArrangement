import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAgendaHighlights,
  buildEventFinanceSummary,
  buildGuestSiteBasePath,
  buildGuestSiteNavigationEntries,
  buildGuestSitePagePath,
  buildProjectDashboard,
  buildProjectHierarchy,
  buildProjectMatrix,
  buildProjectSummary,
  buildSettlementSuggestions,
  buildTaskSwimlanes,
  buildTaskAgenda,
  buildViewerAccess,
  canViewerSeeGuestPage,
  ensureEventShape
} from "../src/event-platform-utils.js";

test("ensureEventShape upgrades legacy finance members into shared people structure", () => {
  const event = ensureEventShape({
    id: "event-1",
    name: "Helgetur",
    members: [{ id: "member-1", name: "Ola", created_at: "2026-06-01T10:00:00.000Z" }]
  });

  assert.equal(event.people.length, 1);
  assert.equal(event.people[0].name, "Ola");
  assert.equal(event.people[0].financeRole, "member");
  assert.equal(event.members.length, 1);
  assert.equal(event.members[0].id, "member-1");
  assert.equal(event.platformVersion, 2);
});

test("ensureEventShape creates a default guest page when none exists", () => {
  const event = ensureEventShape({
    id: "event-pages",
    name: "Sommerfest",
    overview: {
      title: "Sommerfest 2026",
      description: "Velkommen til sommerfest.",
      practicalInfo: "Ta med jakke."
    }
  });

  assert.equal(event.guestPages.length, 1);
  assert.equal(event.guestPages[0].menuLabel, "Velkommen");
  assert.equal(event.guestPages[0].visibility, "open");
  assert.equal(event.guestPages[0].fontPreset, "clean");
  assert.equal(event.guestPages[0].textSize, "md");
  assert.equal(event.guestPages[0].textWeight, "regular");
  assert.equal(event.guestPages[0].showImageCaption, false);
  assert.equal(event.guestSite.introText, "");
  assert.equal(event.guestSite.navigationLabel, "Navigasjon");
  assert.equal(event.guestSite.agendaPage.isPublished, false);
  assert.equal(event.guestSite.agendaPage.navigationLabel, "Agenda");
  assert.equal(event.slug, "sommerfest-2026");
  assert.equal(event.guestPages[0].slug, "velkommen");
  assert.match(event.guestPages[0].content, /Velkommen til sommerfest/);
});

test("ensureEventShape creates unique guest page slugs and public paths", () => {
  const event = ensureEventShape({
    id: "event-public-pages",
    name: "Bryllup Ole og Kari",
    guestPages: [
      {
        id: "page-1",
        title: "Program",
        menuLabel: "Program"
      },
      {
        id: "page-2",
        title: "Program",
        menuLabel: "Program"
      }
    ]
  });

  assert.equal(event.slug, "bryllup-ole-og-kari");
  assert.equal(event.guestPages[0].slug, "program");
  assert.equal(event.guestPages[1].slug, "program-2");
  assert.equal(buildGuestSiteBasePath(event), "/gjest/bryllup-ole-og-kari");
  assert.equal(
    buildGuestSitePagePath(event, event.guestPages[1]),
    "/gjest/bryllup-ole-og-kari/program-2"
  );
});

test("buildGuestSiteNavigationEntries appends a published seating plan page", () => {
  const event = ensureEventShape({
    id: "event-seating-page",
    name: "Bryllup Ole og Kari",
    guestPages: [
      {
        id: "page-1",
        title: "Velkommen",
        menuLabel: "Velkommen"
      }
    ],
    venuePlan: {
      guestSeatingPage: {
        isPublished: true,
        navigationLabel: "Bordplassering"
      }
    }
  });

  const entries = buildGuestSiteNavigationEntries(event);
  const seatingPage = entries.find((entry) => entry.kind === "venue_seating");

  assert.equal(entries.length, 2);
  assert.ok(seatingPage);
  assert.equal(seatingPage.menuLabel, "Bordplassering");
  assert.equal(seatingPage.path, "/gjest/bryllup-ole-og-kari/bordplassering");
});

test("buildGuestSiteNavigationEntries appends a published agenda page", () => {
  const event = ensureEventShape({
    id: "event-agenda-page",
    name: "Bryllup Ole og Kari",
    guestPages: [
      {
        id: "page-1",
        title: "Velkommen",
        menuLabel: "Velkommen"
      }
    ],
    guestSite: {
      agendaPage: {
        isPublished: true,
        navigationLabel: "Program"
      }
    }
  });

  const entries = buildGuestSiteNavigationEntries(event);
  const agendaPage = entries.find((entry) => entry.kind === "guest_agenda");

  assert.equal(entries.length, 2);
  assert.ok(agendaPage);
  assert.equal(agendaPage.menuLabel, "Program");
  assert.equal(agendaPage.path, "/gjest/bryllup-ole-og-kari/program");
});

test("buildGuestSiteNavigationEntries respects saved navigation order across content and generated pages", () => {
  const event = ensureEventShape({
    id: "event-nav-order",
    name: "Bryllup Ole og Kari",
    guestSite: {
      navigationOrder: [
        "guest-page-agenda",
        "page-2",
        "guest-page-venue-seating",
        "page-1"
      ],
      agendaPage: {
        isPublished: true,
        navigationLabel: "Agenda"
      }
    },
    guestPages: [
      {
        id: "page-1",
        title: "Velkommen",
        menuLabel: "Velkommen"
      },
      {
        id: "page-2",
        title: "Praktisk informasjon",
        menuLabel: "Praktisk informasjon"
      }
    ],
    venuePlan: {
      guestSeatingPage: {
        isPublished: true,
        navigationLabel: "Sitteplan"
      }
    }
  });

  const entries = buildGuestSiteNavigationEntries(event);

  assert.deepEqual(
    entries.map((entry) => entry.id),
    ["guest-page-agenda", "page-2", "guest-page-venue-seating", "page-1"]
  );
});

test("ensureEventShape keeps guest allergies and creates a normalized venue plan", () => {
  const event = ensureEventShape({
    id: "event-venue",
    name: "Bryllup",
    venuePlan: {
      guestSeatingPage: {
        isPublished: true,
        navigationLabel: "Bordoversikt",
        guestNameDisplay: "hidden",
        showItemLabels: false,
        showSeatLabels: false
      }
    },
    people: [
      {
        id: "guest-1",
        name: "Anna",
        allergies: "Notter",
        dietaryNotes: "Vegetar",
        seatingNote: "Bor sitte narmt familien"
      }
    ]
  });

  assert.equal(event.people[0].allergies, "Notter");
  assert.equal(event.people[0].dietaryNotes, "Vegetar");
  assert.equal(event.people[0].seatingNote, "Bor sitte narmt familien");
  assert.equal(event.venuePlan.room.name, "Hovedsal");
  assert.equal(event.venuePlan.guestSeatingPage.isPublished, true);
  assert.equal(event.venuePlan.guestSeatingPage.navigationLabel, "Bordoversikt");
  assert.equal(event.venuePlan.guestSeatingPage.guestNameDisplay, "hidden");
  assert.equal(event.venuePlan.guestSeatingPage.showItemLabels, false);
  assert.equal(event.venuePlan.guestSeatingPage.showSeatLabels, false);
  assert.deepEqual(event.venuePlan.items, []);
});

test("ensureEventShape preserves phone numbers and merges multiple assigned roles", () => {
  const event = ensureEventShape({
    id: "event-roles",
    name: "Bryllup",
    roles: [
      {
        id: "role-host",
        name: "Vertskap",
        planningRole: "manager",
        projectRole: "helper",
        financeRole: "none",
        capabilities: {
          canCreateEvents: false,
          canSubmitReceipts: false,
          canSubmitManualInvoices: false,
          canSendToAiDirectly: false
        }
      },
      {
        id: "role-finance",
        name: "Regnskap",
        planningRole: "none",
        projectRole: "none",
        financeRole: "manager",
        capabilities: {
          canCreateEvents: false,
          canSubmitReceipts: true,
          canSubmitManualInvoices: true,
          canSendToAiDirectly: true
        }
      }
    ],
    people: [
      {
        id: "person-1",
        name: "Anna",
        phone: "+47 900 00 000",
        roleIds: ["role-host", "role-finance"],
        planningRole: "none",
        projectRole: "none",
        financeRole: "none",
        useDirectAccessOverrides: false
      }
    ]
  });

  assert.equal(event.people[0].phone, "+47 900 00 000");
  assert.equal(event.people[0].assignedRoles.length, 2);
  assert.equal(event.people[0].effectivePlanningRole, "manager");
  assert.equal(event.people[0].effectiveProjectRole, "helper");
  assert.equal(event.people[0].effectiveFinanceRole, "manager");
  assert.equal(event.people[0].effectiveCapabilities.canSendToAiDirectly, true);
  assert.equal(event.members.length, 1);
});

test("ensureEventShape migrates matching legacy access into role assignments", () => {
  const event = ensureEventShape({
    id: "event-legacy-role",
    name: "Middag",
    people: [
      {
        id: "person-legacy",
        name: "Ola",
        planningRole: "viewer",
        projectRole: "none",
        financeRole: "member"
      }
    ]
  });

  assert.ok(event.people[0].roleIds.length >= 1);
  assert.equal(event.people[0].useDirectAccessOverrides, false);
  assert.equal(event.people[0].effectiveFinanceRole, "member");
});

test("ensureEventShape normalizes guest page design settings", () => {
  const event = ensureEventShape({
    id: "event-pages-design",
    name: "Sommerfest",
    guestSite: {
      introText: "Alt dere trenger å vite før dagen.",
      navigationLabel: "Menyvalg",
      backgroundImageUrl: "/api/events/event-pages-design/guest-media/bg-1",
      backgroundMode: "page",
      navigationOrder: ["page-2", "page-1", "page-2", ""],
      agendaPage: {
        isPublished: true,
        navigationLabel: "Program"
      }
    },
    guestPages: [
      {
        id: "page-1",
        title: "Info",
        menuLabel: "Info",
        visibility: "open",
        fontPreset: "editorial",
        textSize: "lg",
        textWeight: "bold",
        showImageCaption: true
      },
      {
        id: "page-2",
        title: "Legacy",
        menuLabel: "Legacy",
        visibility: "wat",
        fontPreset: "ukjent",
        textSize: "huge",
        textWeight: "heavy",
        showImageCaption: 0
      }
    ]
  });

  assert.equal(event.guestPages[0].fontPreset, "editorial");
  assert.equal(event.guestPages[0].textSize, "lg");
  assert.equal(event.guestPages[0].textWeight, "bold");
  assert.equal(event.guestPages[0].showImageCaption, true);
  assert.equal(event.guestPages[1].visibility, "open");
  assert.equal(event.guestPages[1].fontPreset, "clean");
  assert.equal(event.guestPages[1].textSize, "md");
  assert.equal(event.guestPages[1].textWeight, "regular");
  assert.equal(event.guestPages[1].showImageCaption, false);
  assert.equal(event.guestSite.introText, "Alt dere trenger å vite før dagen.");
  assert.equal(event.guestSite.navigationLabel, "Menyvalg");
  assert.equal(
    event.guestSite.backgroundImageUrl,
    "/api/events/event-pages-design/guest-media/bg-1"
  );
  assert.equal(event.guestSite.backgroundMode, "page");
  assert.deepEqual(event.guestSite.navigationOrder, ["page-2", "page-1"]);
  assert.equal(event.guestSite.agendaPage.isPublished, true);
  assert.equal(event.guestSite.agendaPage.navigationLabel, "Program");
});

test("canViewerSeeGuestPage hides guest-only pages from finance members", () => {
  const event = ensureEventShape({
    id: "event-pages-2",
    name: "Helg",
    guestPages: [
      {
        id: "page-open",
        title: "Program",
        menuLabel: "Program",
        visibility: "open"
      },
      {
        id: "page-guests",
        title: "Romfordeling",
        menuLabel: "Romfordeling",
        visibility: "guests"
      }
    ],
    people: [
      {
        id: "guest-1",
        name: "Gjest",
        planningRole: "viewer",
        projectRole: "none",
        financeRole: "none"
      },
      {
        id: "finance-1",
        name: "Fakturamedlem",
        planningRole: "viewer",
        projectRole: "none",
        financeRole: "member"
      }
    ]
  });

  const guestPerson = event.people.find((person) => person.id === "guest-1");
  const financePerson = event.people.find((person) => person.id === "finance-1");
  const openPage = event.guestPages.find((page) => page.id === "page-open");
  const guestOnlyPage = event.guestPages.find((page) => page.id === "page-guests");

  assert.equal(canViewerSeeGuestPage(openPage, buildViewerAccess(guestPerson), guestPerson), true);
  assert.equal(canViewerSeeGuestPage(guestOnlyPage, buildViewerAccess(guestPerson), guestPerson), true);
  assert.equal(
    canViewerSeeGuestPage(guestOnlyPage, buildViewerAccess(financePerson), financePerson),
    false
  );
  assert.equal(
    canViewerSeeGuestPage(guestOnlyPage, buildViewerAccess(null), null),
    true
  );
});

test("buildViewerAccess uses effective access from assigned roles", () => {
  const event = ensureEventShape({
    id: "event-viewer-role",
    name: "Weekend",
    roles: [
      {
        id: "role-planner",
        name: "Planlegger",
        planningRole: "manager",
        projectRole: "manager",
        financeRole: "none",
        capabilities: {
          canCreateEvents: false,
          canSubmitReceipts: false,
          canSubmitManualInvoices: false,
          canSendToAiDirectly: false
        }
      }
    ],
    people: [
      {
        id: "planner-1",
        name: "Kari",
        roleIds: ["role-planner"],
        planningRole: "none",
        projectRole: "none",
        financeRole: "none",
        useDirectAccessOverrides: false
      }
    ]
  });

  const access = buildViewerAccess(event.people[0]);

  assert.equal(access.canManageGuest, true);
  assert.equal(access.canManageProject, true);
  assert.equal(access.canViewFinance, false);
});

test("ensureEventShape keeps receipt submission attachment metadata", () => {
  const event = ensureEventShape({
    id: "event-submissions",
    name: "Tur",
    submissions: [
      {
        id: "submission-1",
        type: "receipt_upload",
        title: "Kvittering",
        submittedByPersonId: "person-1",
        storedImagePath: "/tmp/submission.png",
        imageContentType: "image/png",
        imageOriginalFilename: "kvittering.png"
      }
    ]
  });

  assert.equal(event.submissions[0].storedImagePath, "/tmp/submission.png");
  assert.equal(event.submissions[0].imageContentType, "image/png");
  assert.equal(event.submissions[0].imageOriginalFilename, "kvittering.png");
});

test("buildEventFinanceSummary includes advances and settlement transfers in member balances", () => {
  const event = ensureEventShape({
    id: "event-1",
    name: "Middag",
    members: [
      { id: "member-1", name: "Ola", created_at: "2026-06-01T10:00:00.000Z" },
      { id: "member-2", name: "Kari", created_at: "2026-06-01T10:05:00.000Z" }
    ],
    ledgerEntries: [
      {
        id: "ledger-1",
        type: "advance_contribution",
        memberId: "member-1",
        amount: 100,
        status: "approved",
        created_at: "2026-06-01T11:00:00.000Z"
      },
      {
        id: "ledger-2",
        type: "settlement_transfer",
        memberId: "member-2",
        counterpartyMemberId: "member-1",
        amount: 50,
        status: "approved",
        created_at: "2026-06-01T12:00:00.000Z"
      }
    ]
  });
  const jobs = [
    {
      id: "job-1",
      event_id: "event-1",
      status: "completed",
      paid_by_member_id: "member-1",
      result: {
        grandTotal: 200,
        items: [
          { name: "Burger", quantity: 2, unitPrice: 100, lineTotal: 200 }
        ]
      },
      distribution_state: {
        participants: [
          { id: "member-1", name: "Ola" },
          { id: "member-2", name: "Kari" }
        ],
        activeParticipantId: "member-1",
        entries: [
          {
            id: "entry-0",
            assignments: [
              {
                id: "assignment-1",
                participantId: "member-1",
                type: "whole",
                label: "Burger",
                quantity: 1,
                amount: 100
              },
              {
                id: "assignment-2",
                participantId: "member-2",
                type: "whole",
                label: "Burger",
                quantity: 1,
                amount: 100
              }
            ]
          }
        ]
      }
    }
  ];

  const summary = buildEventFinanceSummary(event, jobs);
  const ola = summary.members.find((member) => member.id === "member-1");
  const kari = summary.members.find((member) => member.id === "member-2");

  assert.equal(summary.totalAdvances, 100);
  assert.equal(summary.totalSettlementTransfers, 50);
  assert.equal(summary.totalContributed, 300);
  assert.equal(ola.receiptPaidTotal, 200);
  assert.equal(ola.advanceTotal, 100);
  assert.equal(ola.totalContributed, 300);
  assert.equal(ola.paidTotal, 300);
  assert.equal(ola.balanceBeforeSettlements, 200);
  assert.equal(ola.receivedSettlementTotal, 50);
  assert.equal(ola.remainingBalance, 150);
  assert.equal(kari.usedTotal, 100);
  assert.equal(kari.sentSettlementTotal, 50);
  assert.equal(kari.remainingBalance, -50);
});

test("buildSettlementSuggestions proposes who should pay whom based on remaining balances", () => {
  const plan = buildSettlementSuggestions({
    members: [
      { id: "a", name: "Person A", remainingBalance: 1500 },
      { id: "b", name: "Person B", remainingBalance: 500 },
      { id: "c", name: "Person C", remainingBalance: -1000 },
      { id: "d", name: "Person D", remainingBalance: -1000 }
    ]
  });

  assert.equal(plan.alreadyBalanced, false);
  assert.equal(plan.suggestions.length, 3);
  assert.deepEqual(
    plan.suggestions.map((entry) => ({
      from: entry.fromName,
      to: entry.toName,
      amount: entry.amount
    })),
    [
      { from: "Person C", to: "Person A", amount: 1000 },
      { from: "Person D", to: "Person A", amount: 500 },
      { from: "Person D", to: "Person B", amount: 500 }
    ]
  );
});

test("buildTaskAgenda calculates start and end times from event start, duration and dependencies", () => {
  const event = ensureEventShape({
    id: "event-2",
    name: "Bryllup",
    overview: {
      startsAt: "2026-06-20T15:00"
    },
    tasks: [
      {
        id: "task-1",
        title: "Rigge lokale",
        durationMinutes: 45,
        orderIndex: 0,
        created_at: "2026-06-01T10:00:00.000Z"
      },
      {
        id: "task-2",
        title: "Middag",
        durationMinutes: 90,
        desiredStartAt: "2026-06-20T15:30",
        dependencyIds: ["task-1"],
        orderIndex: 1,
        created_at: "2026-06-01T10:05:00.000Z"
      },
      {
        id: "task-3",
        title: "Tale",
        durationMinutes: 20,
        desiredStartAt: "2026-06-20T17:30",
        orderIndex: 2,
        created_at: "2026-06-01T10:10:00.000Z"
      }
    ]
  });

  const agenda = buildTaskAgenda(event);

  assert.equal(agenda.startsAt, "2026-06-20T15:00");
  assert.equal(agenda.endsAt, "2026-06-20T17:50");
  assert.equal(agenda.tasks[0].scheduledStartAt, "2026-06-20T15:00");
  assert.equal(agenda.tasks[0].scheduledEndAt, "2026-06-20T15:45");
  assert.equal(agenda.tasks[1].scheduledStartAt, "2026-06-20T15:45");
  assert.equal(agenda.tasks[1].scheduledEndAt, "2026-06-20T17:15");
  assert.equal(agenda.tasks[1].warnings.length, 1);
  assert.match(agenda.tasks[1].warnings[0], /Onsket start/);
  assert.equal(agenda.tasks[2].scheduledStartAt, "2026-06-20T17:30");
  assert.equal(agenda.tasks[2].scheduledEndAt, "2026-06-20T17:50");
});

test("buildTaskAgenda warns when a task depends on a later task in the list", () => {
  const event = ensureEventShape({
    id: "event-3",
    name: "Festival",
    overview: {
      startsAt: "2026-07-01T12:00"
    },
    tasks: [
      {
        id: "task-a",
        title: "Sceneoppsett",
        durationMinutes: 60,
        dependencyIds: ["task-b"],
        orderIndex: 0,
        created_at: "2026-06-01T10:00:00.000Z"
      },
      {
        id: "task-b",
        title: "Lydsjekk",
        durationMinutes: 30,
        orderIndex: 1,
        created_at: "2026-06-01T10:10:00.000Z"
      }
    ]
  });

  const agenda = buildTaskAgenda(event);

  assert.equal(agenda.warningCount, 1);
  assert.match(agenda.tasks[0].warnings[0], /ligger senere i agendaen/);
});

test("buildTaskAgenda keeps fixed-time tasks at desired start and warns on collisions", () => {
  const agenda = buildTaskAgenda({
    id: "event-fixed-task",
    name: "Bryllup",
    overview: {
      startsAt: "2026-06-10T10:00"
    },
    tasks: [
      {
        id: "task-1",
        title: "Transport til kirken",
        durationMinutes: 120,
        orderIndex: 0
      },
      {
        id: "task-2",
        title: "Kirken",
        durationMinutes: 30,
        desiredStartAt: "2026-06-10T11:00",
        isFixedTime: true,
        orderIndex: 1
      },
      {
        id: "task-3",
        title: "Fotografering",
        durationMinutes: 30,
        orderIndex: 2
      }
    ]
  });

  assert.equal(agenda.tasks[0].scheduledStartAt, "2026-06-10T10:00");
  assert.equal(agenda.tasks[0].scheduledEndAt, "2026-06-10T12:00");
  assert.equal(agenda.tasks[1].scheduledStartAt, "2026-06-10T11:00");
  assert.equal(agenda.tasks[1].scheduledEndAt, "2026-06-10T11:30");
  assert.equal(agenda.tasks[1].isFixedTime, true);
  assert.match(agenda.tasks[1].warnings[0], /Fast start/);
  assert.equal(agenda.tasks[2].scheduledStartAt, "2026-06-10T12:00");
});

test("buildTaskAgenda keeps desired start for independent tasks even when another task is earlier in the list", () => {
  const agenda = buildTaskAgenda({
    id: "event-independent-desired-start",
    name: "Bryllup",
    overview: {
      startsAt: "2026-06-10T10:00"
    },
    tasks: [
      {
        id: "task-1",
        title: "Foto",
        durationMinutes: 120,
        orderIndex: 0
      },
      {
        id: "task-2",
        title: "Velkomstdrinker",
        durationMinutes: 15,
        desiredStartAt: "2026-06-10T10:30",
        orderIndex: 1
      }
    ]
  });

  assert.equal(agenda.tasks[0].scheduledStartAt, "2026-06-10T10:00");
  assert.equal(agenda.tasks[0].scheduledEndAt, "2026-06-10T12:00");
  assert.equal(agenda.tasks[1].scheduledStartAt, "2026-06-10T10:30");
  assert.equal(agenda.tasks[1].scheduledEndAt, "2026-06-10T10:45");
  assert.equal(agenda.tasks[1].warnings.length, 0);
});

test("buildTaskAgenda backfills tasks before a later fixed task", () => {
  const agenda = buildTaskAgenda({
    id: "event-backward-agenda",
    name: "Bryllup",
    tasks: [
      {
        id: "task-1",
        title: "Transport til kirken",
        durationMinutes: 45,
        orderIndex: 0
      },
      {
        id: "task-2",
        title: "Kirken",
        durationMinutes: 30,
        desiredStartAt: "2026-06-10T13:00",
        isFixedTime: true,
        dependencyIds: ["task-1"],
        orderIndex: 1
      }
    ]
  });

  assert.equal(agenda.tasks[0].scheduledStartAt, "2026-06-10T12:15");
  assert.equal(agenda.tasks[0].scheduledEndAt, "2026-06-10T13:00");
  assert.equal(agenda.tasks[0].warnings.length, 0);
  assert.equal(agenda.tasks[1].scheduledStartAt, "2026-06-10T13:00");
  assert.equal(agenda.unscheduledCount, 0);
});

test("buildTaskAgenda keeps an anchored parent task on its own fixed time even with children", () => {
  const agenda = buildTaskAgenda({
    id: "event-fixed-parent",
    name: "Bryllup",
    overview: {
      startsAt: "2026-07-20T14:15"
    },
    tasks: [
      {
        id: "task-1",
        title: "Vielse",
        durationMinutes: 45,
        desiredStartAt: "2026-07-20T14:15",
        isFixedTime: true,
        orderIndex: 0
      },
      {
        id: "task-2",
        title: "Bilder av brudeparet",
        durationMinutes: 90,
        dependencyIds: ["task-1"],
        orderIndex: 1
      },
      {
        id: "task-parent",
        title: "Velkomstdrinker",
        durationMinutes: 5,
        desiredStartAt: "2026-06-20T16:00",
        isFixedTime: true,
        orderIndex: 2
      },
      {
        id: "task-child",
        title: "Introdusere leker og velkomstdrinker",
        parentTaskId: "task-parent",
        durationMinutes: 15,
        desiredStartAt: "2026-06-20T16:00",
        orderIndex: 3
      }
    ]
  });

  assert.equal(agenda.tasks[2].scheduledStartAt, "2026-06-20T16:00");
  assert.equal(agenda.tasks[2].timelineStartAt, "2026-06-20T16:00");
  assert.equal(agenda.tasks[2].timelineEndAt, "2026-06-20T16:05");
  assert.match(agenda.tasks[2].warnings[0], /Bilder av brudeparet/);
});

test("buildTaskAgenda groups underaktiviteter under forelderen og viser samlet tidsrom", () => {
  const agenda = buildTaskAgenda({
    id: "event-hierarchy-agenda",
    name: "Bryllup",
    overview: {
      startsAt: "2026-06-10T12:00"
    },
    tasks: [
      {
        id: "task-parent",
        title: "Velkomstdrink",
        orderIndex: 0,
        durationMinutes: 30
      },
      {
        id: "task-child-1",
        title: "Musikk start",
        parentTaskId: "task-parent",
        orderIndex: 1,
        durationMinutes: 20
      },
      {
        id: "task-child-2",
        title: "Servere snacks",
        parentTaskId: "task-parent",
        orderIndex: 2,
        durationMinutes: 40
      },
      {
        id: "task-after",
        title: "Middag",
        orderIndex: 3,
        durationMinutes: 60
      }
    ]
  });

  assert.deepEqual(
    agenda.tasks.map((task) => task.id),
    ["task-parent", "task-child-1", "task-child-2", "task-after"]
  );
  assert.equal(agenda.tasks[0].timelineStartAt, "2026-06-10T12:30");
  assert.equal(agenda.tasks[0].timelineEndAt, "2026-06-10T13:30");
  assert.equal(agenda.tasks[0].timelineDurationMinutes, 60);
  assert.equal(agenda.tasks[3].scheduledStartAt, "2026-06-10T13:30");
});

test("buildAgendaHighlights returns only marked tasks sorted by start time", () => {
  const highlights = buildAgendaHighlights({
    id: "event-agenda-highlights",
    name: "Sommerfest",
    overview: {
      startsAt: "2026-06-10T12:00"
    },
    tasks: [
      {
        id: "task-1",
        title: "Lunsj",
        durationMinutes: 60,
        showOnAgenda: true,
        orderIndex: 0
      },
      {
        id: "task-2",
        title: "Rigging",
        durationMinutes: 30,
        orderIndex: 1
      },
      {
        id: "task-3",
        title: "Tale",
        durationMinutes: 20,
        desiredStartAt: "2026-06-10T15:00",
        isFixedTime: true,
        showOnAgenda: true,
        agendaComment: "Mor holder tale for brudeparet",
        orderIndex: 2
      },
      {
        id: "task-4",
        title: "Overraskelse",
        durationMinutes: 10,
        showOnAgenda: true,
        orderIndex: 3
      }
    ]
  });

  assert.equal(highlights.total, 3);
  assert.equal(highlights.scheduledCount, 3);
  assert.equal(highlights.unscheduledCount, 0);
  assert.deepEqual(
    highlights.tasks.map((task) => task.title),
    ["Lunsj", "Tale", "Overraskelse"]
  );
  assert.equal(highlights.tasks[0].displayStartAt, "2026-06-10T13:30");
  assert.equal(highlights.tasks[1].agendaComment, "Mor holder tale for brudeparet");
});

test("buildTaskSwimlanes groups tasks by responsible lane and keeps dependency links", () => {
  const swimlanes = buildTaskSwimlanes({
    id: "event-swimlanes",
    name: "Festival",
    overview: {
      startsAt: "2026-06-10T12:00"
    },
    people: [
      {
        id: "person-a",
        name: "Anna",
        planningRole: "viewer",
        projectRole: "helper",
        financeRole: "none"
      },
      {
        id: "person-b",
        name: "Bertil",
        planningRole: "viewer",
        projectRole: "helper",
        financeRole: "none"
      }
    ],
    tasks: [
      {
        id: "task-1",
        title: "Rigge lokale",
        durationMinutes: 60,
        assigneeIds: ["person-a"],
        dependencyIds: [],
        orderIndex: 0
      },
      {
        id: "task-2",
        title: "Test lyd",
        durationMinutes: 30,
        assigneeIds: ["person-b"],
        dependencyIds: ["task-1"],
        orderIndex: 1
      },
      {
        id: "task-3",
        title: "Felles briefing",
        durationMinutes: 30,
        assigneeIds: ["person-a", "person-b"],
        dependencyIds: ["task-2"],
        orderIndex: 2
      }
    ]
  });

  assert.equal(swimlanes.lanes.length, 3);
  assert.equal(swimlanes.lanes[0].label, "Anna");
  assert.equal(swimlanes.lanes[1].label, "Bertil");
  assert.equal(swimlanes.lanes[2].label, "Delt ansvar");
  assert.equal(swimlanes.dependencyLinks.length, 2);
  assert.equal(swimlanes.tasks[0].columnStart, 0);
  assert.equal(swimlanes.tasks[1].columnStart >= swimlanes.tasks[0].columnEnd, true);
  assert.equal(swimlanes.tasks[2].laneKind, "shared");
});

test("buildProjectDashboard creates board, focus lists and workload rows for event planning", () => {
  const dashboard = buildProjectDashboard(
    {
      id: "event-project-dashboard",
      name: "Helgearrangement",
      overview: {
        startsAt: "2026-06-20T10:00"
      },
      people: [
        {
          id: "person-a",
          name: "Anna",
          planningRole: "viewer",
          projectRole: "manager",
          financeRole: "none"
        },
        {
          id: "person-b",
          name: "Bertil",
          planningRole: "viewer",
          projectRole: "helper",
          financeRole: "none"
        }
      ],
      tasks: [
        {
          id: "task-1",
          title: "Rigge scene",
          status: "in_progress",
          durationMinutes: 90,
          assigneeIds: ["person-a"],
          dueDate: "2026-06-20T12:00",
          orderIndex: 0
        },
        {
          id: "task-2",
          title: "Kirke",
          status: "todo",
          durationMinutes: 30,
          desiredStartAt: "2026-06-20T13:00",
          isFixedTime: true,
          assigneeIds: ["person-b"],
          orderIndex: 1
        },
        {
          id: "task-3",
          title: "Navneskilt",
          status: "blocked",
          durationMinutes: 45,
          dueDate: "2026-06-19T18:00",
          orderIndex: 2
        }
      ]
    },
    {
      now: "2026-06-20T09:00"
    }
  );

  assert.equal(dashboard.summary.total, 3);
  assert.equal(dashboard.summary.inProgress, 1);
  assert.equal(dashboard.summary.fixedTime, 1);
  assert.equal(dashboard.summary.agendaVisible, 0);
  assert.equal(dashboard.summary.unassigned, 1);
  assert.equal(dashboard.summary.overdue, 1);
  assert.equal(dashboard.summary.dueSoon, 1);
  assert.equal(dashboard.board.find((column) => column.id === "blocked").tasks.length, 1);
  assert.equal(dashboard.focus.fixedTime[0].title, "Kirke");
  assert.equal(dashboard.focus.unassigned[0].title, "Navneskilt");
  assert.equal(dashboard.workload[0].label, "Anna");
  assert.equal(dashboard.workload[0].taskCount, 1);
  assert.equal(
    dashboard.workload.find((row) => row.id === "__unassigned").taskCount,
    1
  );
});

test("buildProjectDashboard keeps subproject and hierarchy labels on tasks", () => {
  const dashboard = buildProjectDashboard({
    id: "event-project-structure",
    name: "Bryllup",
    subprojects: [
      {
        id: "subproject-program",
        name: "Program"
      }
    ],
    tasks: [
      {
        id: "task-parent",
        title: "Taler",
        subprojectId: "subproject-program",
        orderIndex: 0
      },
      {
        id: "task-child",
        title: "Tale fra mor",
        parentTaskId: "task-parent",
        orderIndex: 1
      }
    ]
  });

  const parentTask = dashboard.tasks.find((task) => task.id === "task-parent");
  const childTask = dashboard.tasks.find((task) => task.id === "task-child");

  assert.equal(dashboard.summary.subprojectCount, 1);
  assert.equal(parentTask.subprojectLabel, "Program");
  assert.equal(parentTask.hasChildren, true);
  assert.equal(childTask.parentTaskTitle, "Taler");
  assert.equal(childTask.hierarchyDepth, 1);
  assert.equal(childTask.subprojectLabel, "Program");
  assert.equal(childTask.hierarchyShortLabel, "Under Taler");
});

test("buildProjectMatrix groups root tasks by subproject and nests visible underactivities", () => {
  const matrix = buildProjectMatrix({
    id: "event-project-matrix",
    name: "Bryllup",
    subprojects: [
      {
        id: "subproject-program",
        name: "Program"
      }
    ],
    tasks: [
      {
        id: "task-parent",
        title: "Taler",
        subprojectId: "subproject-program",
        orderIndex: 0
      },
      {
        id: "task-child",
        title: "Tale fra mor",
        parentTaskId: "task-parent",
        orderIndex: 1
      },
      {
        id: "task-unassigned",
        title: "Taxi hjem",
        orderIndex: 2
      }
    ]
  });

  const programColumn = matrix.columns.find((column) => column.id === "subproject-program");
  const unassignedColumn = matrix.columns.find((column) => column.id === "__unassigned");

  assert.equal(programColumn.rootTasks.length, 1);
  assert.equal(programColumn.rootTasks[0].title, "Taler");
  assert.equal(programColumn.rootTasks[0].descendantRows.length, 1);
  assert.equal(programColumn.rootTasks[0].descendantRows[0].title, "Tale fra mor");
  assert.equal(programColumn.rootTasks[0].descendantRows[0].matrixDepth, 1);
  assert.equal(unassignedColumn.rootTasks.length, 1);
  assert.equal(unassignedColumn.rootTasks[0].title, "Taxi hjem");
});

test("buildProjectHierarchy groups roots by subproject and aggregates subtree progress", () => {
  const hierarchy = buildProjectHierarchy({
    id: "event-project-hierarchy",
    name: "Bryllup",
    people: [
      {
        id: "person-mor",
        name: "Mor"
      },
      {
        id: "person-toastmaster",
        name: "Toastmaster"
      }
    ],
    overview: {
      startsAt: "2026-06-20T14:00"
    },
    subprojects: [
      {
        id: "subproject-program",
        name: "Program"
      }
    ],
    tasks: [
      {
        id: "task-parent",
        title: "Taler",
        subprojectId: "subproject-program",
        durationMinutes: 15,
        orderIndex: 0
      },
      {
        id: "task-child-a",
        title: "Tale fra mor",
        parentTaskId: "task-parent",
        assigneeIds: ["person-mor"],
        status: "done",
        durationMinutes: 10,
        orderIndex: 1
      },
      {
        id: "task-child-b",
        title: "Toastmaster intro",
        parentTaskId: "task-parent",
        assigneeIds: ["person-toastmaster"],
        status: "blocked",
        durationMinutes: 5,
        orderIndex: 2
      }
    ]
  });

  assert.equal(hierarchy.groups.length, 1);
  assert.equal(hierarchy.totalRootNodes, 1);
  const programGroup = hierarchy.groups[0];
  const parentNode = programGroup.rootNodes[0];

  assert.equal(programGroup.id, "subproject-program");
  assert.equal(programGroup.taskCount, 3);
  assert.equal(parentNode.title, "Taler");
  assert.equal(parentNode.children.length, 2);
  assert.equal(parentNode.descendantCount, 2);
  assert.equal(parentNode.subtreeTaskCount, 3);
  assert.equal(parentNode.subtreeDoneCount, 1);
  assert.equal(parentNode.subtreeBlockedCount, 1);
  assert.equal(parentNode.progressLabel, "1/3 ferdig");
  assert.equal(parentNode.subtreeAssigneeLabel, "Mor, Toastmaster");
});

test("buildProjectHierarchy keeps anchored parent timing instead of stretching it across children", () => {
  const hierarchy = buildProjectHierarchy({
    id: "event-project-hierarchy-fixed-parent",
    name: "Bryllup",
    overview: {
      startsAt: "2026-07-20T14:15"
    },
    tasks: [
      {
        id: "task-1",
        title: "Vielse",
        durationMinutes: 45,
        desiredStartAt: "2026-07-20T14:15",
        isFixedTime: true,
        orderIndex: 0
      },
      {
        id: "task-2",
        title: "Bilder av brudeparet",
        durationMinutes: 90,
        dependencyIds: ["task-1"],
        orderIndex: 1
      },
      {
        id: "task-parent",
        title: "Velkomstdrinker",
        durationMinutes: 5,
        desiredStartAt: "2026-06-20T16:00",
        isFixedTime: true,
        orderIndex: 2
      },
      {
        id: "task-child",
        title: "Introdusere leker og velkomstdrinker",
        parentTaskId: "task-parent",
        durationMinutes: 15,
        desiredStartAt: "2026-06-20T16:00",
        orderIndex: 3
      }
    ]
  });

  const velkomstNode = hierarchy.groups[0].rootNodes.find((node) => node.id === "task-parent");

  assert.equal(velkomstNode.subtreeStartAt, "2026-06-20T16:00");
  assert.equal(velkomstNode.subtreeEndAt, "2026-06-20T16:05");
  assert.equal(velkomstNode.subtreeDurationMinutes, 5);
});

test("buildProjectSummary includes extended planning health metrics", () => {
  const summary = buildProjectSummary(
    {
      id: "event-project-summary",
      name: "Sommerfest",
      overview: {
        startsAt: "2026-06-20T10:00"
      },
      tasks: [
        {
          id: "task-a",
          title: "Lydsjekk",
          status: "todo",
          durationMinutes: 30,
          orderIndex: 0
        },
        {
          id: "task-b",
          title: "Kirke",
          status: "done",
          durationMinutes: 20,
          desiredStartAt: "2026-06-20T11:00",
          isFixedTime: true,
          assigneeIds: ["person-a"],
          orderIndex: 1
        }
      ]
    },
    {
      now: "2026-06-20T09:00"
    }
  );

  assert.equal(summary.total, 2);
  assert.equal(summary.done, 1);
  assert.equal(summary.todo, 1);
  assert.equal(summary.fixedTime, 1);
  assert.equal(summary.assigned, 1);
  assert.equal(summary.unassigned, 1);
  assert.equal(summary.totalDurationMinutes, 50);
});
