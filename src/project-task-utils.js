import { parseDelimitedTable } from "./guest-list-utils.js";
import {
  TASK_BUFFER_PLACEMENT_OPTIONS,
  TASK_CATEGORY_OPTIONS,
  TASK_RECOVERY_PRIORITY_OPTIONS
} from "./event-platform-utils.js";

export const PROJECT_TASK_IMPORT_COLUMNS = [
  { key: "referenceCode", label: "Aktivitetskode" },
  { key: "title", label: "Tittel" },
  { key: "description", label: "Beskrivelse" },
  { key: "status", label: "Status" },
  { key: "category", label: "Kategori" },
  { key: "assigneeNames", label: "Ansvarlige" },
  { key: "durationMinutes", label: "Varighet (min)" },
  { key: "desiredStartAt", label: "Onsket start" },
  { key: "dueDate", label: "Frist" },
  { key: "isFixedTime", label: "Fast tidspunkt" },
  { key: "showOnAgenda", label: "Vises pa agenda" },
  { key: "agendaComment", label: "Agenda-kommentar" },
  { key: "toastmasterNotes", label: "Toastmaster-notat / manus" },
  { key: "useCategoryBufferDefaults", label: "Bruk kategoriens bufferstandard" },
  { key: "bufferAvailableMinutes", label: "Tilgjengelig buffer (min)" },
  { key: "bufferAvailablePlacement", label: "Bufferplassering" },
  { key: "bufferTransitionMinutes", label: "Fast mellomrom (min)" },
  { key: "bufferLabel", label: "Navn pa bufferpunkt" },
  { key: "useCategoryRecoveryDefaults", label: "Bruk kategoriens live-standard" },
  { key: "recoveryCanShorten", label: "Kan kortes ned live" },
  { key: "recoveryMinimumDurationMinutes", label: "Minimumsvarighet (min)" },
  { key: "recoveryCanSkip", label: "Kan hoppes over live" },
  { key: "recoveryPriority", label: "Innhentingsprioritet" },
  { key: "parentReference", label: "Overkode" },
  { key: "dependencyReferences", label: "Avhenger av" }
];

export const PROJECT_TASK_FIELD_OPTIONS = [
  { key: "referenceCode", label: "Aktivitetskode" },
  { key: "title", label: "Tittel" },
  { key: "status", label: "Status" },
  { key: "category", label: "Kategori" },
  { key: "assigneeNames", label: "Ansvarlige" },
  { key: "durationMinutes", label: "Varighet (min)" },
  { key: "desiredStartAt", label: "Onsket start" },
  { key: "scheduledStartAt", label: "Planlagt start" },
  { key: "scheduledEndAt", label: "Planlagt slutt" },
  { key: "dueDate", label: "Frist" },
  { key: "isFixedTime", label: "Fast tidspunkt" },
  { key: "showOnAgenda", label: "Vises pa agenda" },
  { key: "agendaComment", label: "Agenda-kommentar" },
  { key: "toastmasterNotes", label: "Toastmaster-notat / manus" },
  { key: "useCategoryBufferDefaults", label: "Bruk kategoriens bufferstandard" },
  { key: "bufferAvailableMinutes", label: "Tilgjengelig buffer (min)" },
  { key: "bufferAvailablePlacement", label: "Bufferplassering" },
  { key: "bufferTransitionMinutes", label: "Fast mellomrom (min)" },
  { key: "bufferLabel", label: "Navn pa bufferpunkt" },
  { key: "useCategoryRecoveryDefaults", label: "Bruk kategoriens live-standard" },
  { key: "recoveryCanShorten", label: "Kan kortes ned live" },
  { key: "recoveryMinimumDurationMinutes", label: "Minimumsvarighet (min)" },
  { key: "recoveryCanSkip", label: "Kan hoppes over live" },
  { key: "recoveryPriority", label: "Innhentingsprioritet" },
  { key: "parentReference", label: "Overkode" },
  { key: "dependencyReferences", label: "Avhenger av" },
  { key: "description", label: "Beskrivelse" }
];

export const DEFAULT_PROJECT_TASK_EXPORT_FIELDS = [
  "referenceCode",
  "title",
  "status",
  "category",
  "assigneeNames",
  "durationMinutes",
  "desiredStartAt",
  "scheduledStartAt",
  "scheduledEndAt",
  "dueDate",
  "isFixedTime",
  "showOnAgenda",
  "useCategoryBufferDefaults",
  "bufferAvailableMinutes",
  "bufferAvailablePlacement",
  "bufferTransitionMinutes",
  "bufferLabel",
  "useCategoryRecoveryDefaults",
  "recoveryCanShorten",
  "recoveryMinimumDurationMinutes",
  "recoveryCanSkip",
  "recoveryPriority",
  "parentReference",
  "dependencyReferences",
  "agendaComment",
  "toastmasterNotes"
];

const IMPORT_COLUMN_ALIASES = {
  referenceCode: ["aktivitetskode", "kode", "taskcode", "reference", "ref", "id"],
  title: ["tittel", "aktivitet", "task", "name", "navn"],
  description: ["beskrivelse", "description", "notat", "note"],
  status: ["status"],
  category: ["kategori", "category", "type"],
  assigneeNames: ["ansvarlige", "ansvarlig", "assignees", "owner", "eier"],
  durationMinutes: ["varighet", "varighet (min)", "duration", "durationminutes", "minutter"],
  desiredStartAt: ["onsket start", "ønsket start", "desiredstart", "startonske", "start"],
  dueDate: ["frist", "duedate", "forfallsdato", "deadline"],
  isFixedTime: ["fast tidspunkt", "kan ikke forskyves", "fixedtime", "lockedtime"],
  showOnAgenda: ["vises pa agenda", "vises på agenda", "showonagenda", "agenda"],
  agendaComment: ["agenda-kommentar", "agendakommentar", "agendacomment", "kommentar"],
  toastmasterNotes: [
    "toastmaster-notat / manus",
    "toastmaster-notat",
    "toastmasternotat",
    "manus",
    "script",
    "run of show notes"
  ],
  useCategoryBufferDefaults: [
    "bruk kategoriens bufferstandard",
    "bruk kategoristandard",
    "use category defaults",
    "usecategorybufferdefaults"
  ],
  bufferAvailableMinutes: [
    "tilgjengelig buffer (min)",
    "tilgjengelig buffer",
    "available buffer",
    "bufferavailableminutes"
  ],
  bufferAvailablePlacement: [
    "bufferplassering",
    "buffer placement",
    "bufferavailableplacement"
  ],
  bufferTransitionMinutes: [
    "fast mellomrom (min)",
    "fast mellomrom",
    "transition minutes",
    "buffertransitionminutes"
  ],
  bufferLabel: ["navn pa bufferpunkt", "navn på bufferpunkt", "buffer label", "bufferlabel"],
  useCategoryRecoveryDefaults: [
    "bruk kategoriens live-standard",
    "bruk live-standard",
    "use category live defaults",
    "usecategoryrecoverydefaults"
  ],
  recoveryCanShorten: [
    "kan kortes ned live",
    "kan kortes ned",
    "recoverycanshorten",
    "shorten live"
  ],
  recoveryMinimumDurationMinutes: [
    "minimumsvarighet (min)",
    "minimumsvarighet",
    "minimum duration",
    "recoveryminimumdurationminutes"
  ],
  recoveryCanSkip: [
    "kan hoppes over live",
    "kan hoppes over",
    "recoverycanskip",
    "skip live"
  ],
  recoveryPriority: [
    "innhentingsprioritet",
    "recovery priority",
    "recoverypriority",
    "prioritet"
  ],
  parentReference: ["overkode", "parent", "parentref", "parentreference", "overoppgave"],
  dependencyReferences: [
    "avhenger av",
    "dependency",
    "dependencies",
    "dependencyrefs",
    "predecessors",
    "forgjengere"
  ]
};

const TASK_STATUS_IMPORT_MAP = {
  "ikke startet": "todo",
  todo: "todo",
  planlagt: "todo",
  pagar: "in_progress",
  "pa gar": "in_progress",
  "pågår": "in_progress",
  "på gar": "in_progress",
  inprogress: "in_progress",
  "in progress": "in_progress",
  venter: "blocked",
  blokkert: "blocked",
  blocked: "blocked",
  ferdig: "done",
  done: "done",
  fullfort: "done",
  "fullført": "done",
  avlyst: "canceled",
  canceled: "canceled",
  cancelled: "canceled"
};

const TASK_STATUS_EXPORT_MAP = {
  todo: "Ikke startet",
  in_progress: "Pagar",
  blocked: "Venter",
  done: "Ferdig",
  canceled: "Avlyst"
};
const TASK_CATEGORY_EXPORT_MAP = Object.fromEntries(
  TASK_CATEGORY_OPTIONS.map((option) => [option.value, option.label])
);
const TASK_CATEGORY_IMPORT_MAP = TASK_CATEGORY_OPTIONS.reduce((currentMap, option) => {
  currentMap[normalizeKey(option.value)] = option.value;
  currentMap[normalizeKey(option.label)] = option.value;
  return currentMap;
}, {});
const BUFFER_PLACEMENT_EXPORT_MAP = Object.fromEntries(
  TASK_BUFFER_PLACEMENT_OPTIONS.map((option) => [option.value, option.label])
);
const BUFFER_PLACEMENT_IMPORT_MAP = TASK_BUFFER_PLACEMENT_OPTIONS.reduce((currentMap, option) => {
  currentMap[normalizeKey(option.value)] = option.value;
  currentMap[normalizeKey(option.label)] = option.value;
  return currentMap;
}, {});
const RECOVERY_PRIORITY_EXPORT_MAP = Object.fromEntries(
  TASK_RECOVERY_PRIORITY_OPTIONS.map((option) => [option.value, option.label])
);
const RECOVERY_PRIORITY_IMPORT_MAP = TASK_RECOVERY_PRIORITY_OPTIONS.reduce((currentMap, option) => {
  currentMap[normalizeKey(option.value)] = option.value;
  currentMap[normalizeKey(option.label)] = option.value;
  return currentMap;
}, {});

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function escapeCsvValue(value, delimiter) {
  const source = String(value ?? "");

  if (source.includes("\"") || source.includes("\n") || source.includes("\r") || source.includes(delimiter)) {
    return `"${source.replace(/"/g, "\"\"")}"`;
  }

  return source;
}

function splitListValue(value) {
  return String(value || "")
    .split(/[;,|/]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseBooleanToken(value) {
  const normalized = normalizeKey(value);
  return ["1", "true", "ja", "yes", "on"].includes(normalized);
}

function parseDuration(value, fallback = 60) {
  const numeric = typeof value === "number" ? value : Number.parseInt(String(value || ""), 10);

  if (!Number.isFinite(numeric) || numeric < 0) {
    return fallback;
  }

  return numeric;
}

function formatBooleanLabel(value) {
  return value ? "Ja" : "Nei";
}

function parseTaskCategory(value) {
  return TASK_CATEGORY_IMPORT_MAP[normalizeKey(value)] || "general";
}

function parseTaskBufferPlacement(value) {
  return BUFFER_PLACEMENT_IMPORT_MAP[normalizeKey(value)] || "end";
}

function parseRecoveryPriority(value) {
  return RECOVERY_PRIORITY_IMPORT_MAP[normalizeKey(value)] || "normal";
}

function buildTaskReference(task, fallbackIndex = 0) {
  const reference = String(task?.referenceCode || "").trim();

  if (reference) {
    return reference;
  }

  const taskId = String(task?.id || "").trim();
  if (taskId) {
    return taskId;
  }

  return `TASK-${fallbackIndex + 1}`;
}

function findImportColumnIndex(headers, canonicalKey) {
  const aliases = IMPORT_COLUMN_ALIASES[canonicalKey] || [canonicalKey];
  return headers.findIndex((header) => aliases.includes(normalizeKey(header)));
}

function resolvePersonId(people, token) {
  const normalizedToken = normalizeKey(token);

  if (!normalizedToken) {
    return "";
  }

  const phoneToken = String(token || "").replace(/\s+/g, "");
  const safePeople = Array.isArray(people) ? people : [];

  const exactMatch = safePeople.find((person) => {
    const personId = normalizeKey(person?.id);
    const personName = normalizeKey(person?.name);
    const personEmail = normalizeKey(person?.email);
    const personPhone = String(person?.phone || "").replace(/\s+/g, "");

    return (
      personId === normalizedToken ||
      personName === normalizedToken ||
      personEmail === normalizedToken ||
      (phoneToken && personPhone === phoneToken)
    );
  });

  return exactMatch?.id || "";
}

function buildTaskExportRows(tasks, people, fieldKeys = DEFAULT_PROJECT_TASK_EXPORT_FIELDS) {
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const safePeople = Array.isArray(people) ? people : [];
  const peopleMap = new Map(safePeople.map((person) => [person.id, person.name]));
  const taskMap = new Map(safeTasks.map((task, index) => [task.id, { ...task, exportRef: buildTaskReference(task, index) }]));
  const activeFields = PROJECT_TASK_FIELD_OPTIONS.filter((field) => fieldKeys.includes(field.key));
  const headerRow = activeFields.map((field) => field.label);
  const rows = [headerRow];

  safeTasks.forEach((task, index) => {
    const exportRef = buildTaskReference(task, index);
    const parentTask = task.parentTaskId ? taskMap.get(task.parentTaskId) : null;
    const dependencyReferences = (Array.isArray(task.dependencyIds) ? task.dependencyIds : [])
      .map((dependencyId) => taskMap.get(dependencyId)?.exportRef || "")
      .filter(Boolean)
      .join(" | ");
    const assigneeNames = (Array.isArray(task.assigneeIds) ? task.assigneeIds : [])
      .map((assigneeId) => peopleMap.get(assigneeId) || "")
      .filter(Boolean)
      .join("; ");

    const valuesByKey = {
      referenceCode: exportRef,
      title: task.title || "",
      description: task.description || "",
      status: TASK_STATUS_EXPORT_MAP[task.status] || TASK_STATUS_EXPORT_MAP.todo,
      category: TASK_CATEGORY_EXPORT_MAP[task.category] || TASK_CATEGORY_EXPORT_MAP.general,
      assigneeNames,
      durationMinutes: String(task.durationMinutes ?? ""),
      desiredStartAt: task.desiredStartAt || "",
      scheduledStartAt: task.displayStartAt || task.scheduledStartAt || "",
      scheduledEndAt: task.displayEndAt || task.scheduledEndAt || "",
      dueDate: task.dueDate || "",
      isFixedTime: formatBooleanLabel(Boolean(task.isFixedTime)),
      showOnAgenda: formatBooleanLabel(Boolean(task.showOnAgenda)),
      agendaComment: task.agendaComment || "",
      toastmasterNotes: task.toastmasterNotes || "",
      useCategoryBufferDefaults: formatBooleanLabel(task.useCategoryBufferDefaults !== false),
      bufferAvailableMinutes: String(task.bufferConfig?.availableMinutes ?? ""),
      bufferAvailablePlacement:
        BUFFER_PLACEMENT_EXPORT_MAP[task.bufferConfig?.availablePlacement] || "",
      bufferTransitionMinutes: String(task.bufferConfig?.transitionMinutes ?? ""),
      bufferLabel: task.bufferConfig?.label || "",
      useCategoryRecoveryDefaults: formatBooleanLabel(task.useCategoryRecoveryDefaults !== false),
      recoveryCanShorten: formatBooleanLabel(Boolean(task.recoveryConfig?.canShorten)),
      recoveryMinimumDurationMinutes: String(task.recoveryConfig?.minimumDurationMinutes ?? ""),
      recoveryCanSkip: formatBooleanLabel(Boolean(task.recoveryConfig?.canSkip)),
      recoveryPriority:
        RECOVERY_PRIORITY_EXPORT_MAP[task.recoveryConfig?.priority] || RECOVERY_PRIORITY_EXPORT_MAP.normal,
      parentReference: parentTask?.exportRef || "",
      dependencyReferences,
      parentTitle: parentTask?.title || ""
    };

    rows.push(activeFields.map((field) => valuesByKey[field.key] || ""));
  });

  return rows;
}

export function buildProjectTaskImportTemplateTable() {
  const headers = PROJECT_TASK_IMPORT_COLUMNS.map((column) => column.label);
  const exampleRows = [
    [
      "VELKOMST",
      "Velkomstdrinker",
      "Samle gjestene ute og starte mingling",
      "Ikke startet",
      "Mingling",
      "Ida; Aki",
      "0",
      "2026-07-20T16:00",
      "",
      "Ja",
      "Ja",
      "Starter ute ved inngangen",
      "Hils velkommen og pek gjestene mot hagen",
      "Ja",
      "15",
      "Legg pa slutten",
      "0",
      "Buffer",
      "Ja",
      "Ja",
      "10",
      "Nei",
      "Valgfri",
      "",
      ""
    ],
    [
      "LEKER",
      "Introdusere leker og velkomstdrinker",
      "Kort introduksjon for gjestene",
      "Ikke startet",
      "Underholdning",
      "Ida",
      "15",
      "",
      "",
      "Nei",
      "Ja",
      "Hold mikrofon klar",
      "Presenter lekene kort og send videre til Ida",
      "Nei",
      "5",
      "Fordel mellom underoppgavene",
      "2",
      "Pause",
      "Nei",
      "Ja",
      "5",
      "Ja",
      "Valgfri",
      "VELKOMST",
      ""
    ],
    [
      "BRUDENSTALE",
      "Brudens tale",
      "Klart etter pause",
      "Ikke startet",
      "Taler",
      "Toastmaster",
      "20",
      "",
      "",
      "Nei",
      "Ja",
      "",
      "Gi toastmaster beskjed naar pausen er over",
      "Ja",
      "10",
      "Fordel mellom underoppgavene",
      "2",
      "Pause",
      "Ja",
      "Ja",
      "3",
      "Nei",
      "Vanlig",
      "",
      "PAUSE-TALE"
    ]
  ];

  return [headers, ...exampleRows];
}

export function buildProjectTaskImportTemplateCsv() {
  return buildProjectTaskImportTemplateTable()
    .map((row) => row.map((value) => escapeCsvValue(value, ";")).join(";"))
    .join("\n");
}

export function buildProjectTaskExportTable(
  tasks,
  people,
  fieldKeys = DEFAULT_PROJECT_TASK_EXPORT_FIELDS
) {
  return buildTaskExportRows(tasks, people, fieldKeys);
}

export function buildProjectTaskExportCsv(
  tasks,
  people,
  fieldKeys = DEFAULT_PROJECT_TASK_EXPORT_FIELDS
) {
  return buildProjectTaskExportTable(tasks, people, fieldKeys)
    .map((row) => row.map((value) => escapeCsvValue(value, ";")).join(";"))
    .join("\n");
}

export function buildProjectTaskExportPdfLines(
  tasks,
  people,
  fieldKeys = DEFAULT_PROJECT_TASK_EXPORT_FIELDS
) {
  const rows = buildProjectTaskExportTable(tasks, people, fieldKeys);
  const [headerRow = [], ...dataRows] = rows;
  const lines = [];

  lines.push("Prosjektoppgaver");
  lines.push(`Felter: ${headerRow.join(" · ")}`);
  lines.push("");

  dataRows.forEach((row, index) => {
    lines.push(`${index + 1}. ${row[1] || row[0] || "Uten tittel"}`);

    headerRow.forEach((header, headerIndex) => {
      const value = row[headerIndex];

      if (value) {
        lines.push(`   ${header}: ${value}`);
      }
    });

    lines.push("");
  });

  return lines;
}

export function buildProjectTaskExportFilename(format = "xlsx") {
  const normalizedFormat = String(format || "xlsx").toLowerCase();
  const extension =
    normalizedFormat === "pdf" ? "pdf" : normalizedFormat === "csv" ? "csv" : "xlsx";
  return `prosjektoppgaver-eksport.${extension}`;
}

export function buildProjectTaskTemplateFilename(format = "xlsx") {
  const normalizedFormat = String(format || "xlsx").toLowerCase();
  const extension = normalizedFormat === "csv" ? "csv" : "xlsx";
  return `prosjektoppgaver-mal.${extension}`;
}

export function matchImportedProjectTask(existingTasks, importedTask) {
  const safeTasks = Array.isArray(existingTasks) ? existingTasks : [];
  const referenceCode = normalizeKey(importedTask?.referenceCode);

  if (referenceCode) {
    const matchByCode = safeTasks.find((task) => {
      return (
        normalizeKey(task?.referenceCode) === referenceCode ||
        normalizeKey(task?.id) === referenceCode
      );
    });

    if (matchByCode) {
      return matchByCode;
    }
  }

  const title = normalizeKey(importedTask?.title);

  if (!title) {
    return null;
  }

  const exactTitleMatches = safeTasks.filter((task) => normalizeKey(task?.title) === title);
  return exactTitleMatches.length === 1 ? exactTitleMatches[0] : null;
}

export function parseProjectTaskImportRows(rows, people = [], existingTasks = []) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      rows: [],
      errors: ["Filen ser tom ut."],
      matchedExistingCount: 0,
      newCount: 0
    };
  }

  const normalizedRows = rows
    .map((row) => (Array.isArray(row) ? row.map((cell) => String(cell || "").trim()) : []))
    .filter((row) => row.some((cell) => cell));

  if (normalizedRows.length === 0) {
    return {
      rows: [],
      errors: ["Filen ser tom ut."],
      matchedExistingCount: 0,
      newCount: 0
    };
  }

  const [headerRow, ...dataRows] = normalizedRows;
  const headerIndexes = {
    referenceCode: findImportColumnIndex(headerRow, "referenceCode"),
    title: findImportColumnIndex(headerRow, "title"),
    description: findImportColumnIndex(headerRow, "description"),
    status: findImportColumnIndex(headerRow, "status"),
    category: findImportColumnIndex(headerRow, "category"),
    assigneeNames: findImportColumnIndex(headerRow, "assigneeNames"),
    durationMinutes: findImportColumnIndex(headerRow, "durationMinutes"),
    desiredStartAt: findImportColumnIndex(headerRow, "desiredStartAt"),
    dueDate: findImportColumnIndex(headerRow, "dueDate"),
    isFixedTime: findImportColumnIndex(headerRow, "isFixedTime"),
    showOnAgenda: findImportColumnIndex(headerRow, "showOnAgenda"),
    agendaComment: findImportColumnIndex(headerRow, "agendaComment"),
    toastmasterNotes: findImportColumnIndex(headerRow, "toastmasterNotes"),
    useCategoryBufferDefaults: findImportColumnIndex(headerRow, "useCategoryBufferDefaults"),
    bufferAvailableMinutes: findImportColumnIndex(headerRow, "bufferAvailableMinutes"),
    bufferAvailablePlacement: findImportColumnIndex(headerRow, "bufferAvailablePlacement"),
    bufferTransitionMinutes: findImportColumnIndex(headerRow, "bufferTransitionMinutes"),
    bufferLabel: findImportColumnIndex(headerRow, "bufferLabel"),
    useCategoryRecoveryDefaults: findImportColumnIndex(headerRow, "useCategoryRecoveryDefaults"),
    recoveryCanShorten: findImportColumnIndex(headerRow, "recoveryCanShorten"),
    recoveryMinimumDurationMinutes: findImportColumnIndex(headerRow, "recoveryMinimumDurationMinutes"),
    recoveryCanSkip: findImportColumnIndex(headerRow, "recoveryCanSkip"),
    recoveryPriority: findImportColumnIndex(headerRow, "recoveryPriority"),
    parentReference: findImportColumnIndex(headerRow, "parentReference"),
    dependencyReferences: findImportColumnIndex(headerRow, "dependencyReferences")
  };
  const errors = [];
  const importedRows = dataRows
    .map((row, rowIndex) => {
      const getValue = (key) => {
        const index = headerIndexes[key];
        return index >= 0 ? String(row[index] || "").trim() : "";
      };
      const title = getValue("title");

      if (!title) {
        errors.push(`Rad ${rowIndex + 2} mangler tittel.`);
        return null;
      }

      const unresolvedAssignees = [];
      const assigneeIds = splitListValue(getValue("assigneeNames")).reduce((ids, token) => {
        const personId = resolvePersonId(people, token);

        if (personId) {
          ids.push(personId);
        } else {
          unresolvedAssignees.push(token);
        }

        return ids;
      }, []);

      if (unresolvedAssignees.length > 0) {
        errors.push(
          `Rad ${rowIndex + 2} har ukjente ansvarlige: ${unresolvedAssignees.join(", ")}.`
        );
      }

      return {
        referenceCode: getValue("referenceCode"),
        title,
        description: getValue("description"),
        status: TASK_STATUS_IMPORT_MAP[normalizeKey(getValue("status"))] || "todo",
        category: parseTaskCategory(getValue("category")),
        assigneeIds: [...new Set(assigneeIds)],
        durationMinutes: parseDuration(getValue("durationMinutes"), 60),
        desiredStartAt: getValue("desiredStartAt"),
        dueDate: getValue("dueDate"),
        isFixedTime: parseBooleanToken(getValue("isFixedTime")),
        showOnAgenda: parseBooleanToken(getValue("showOnAgenda")),
        agendaComment: getValue("agendaComment"),
        toastmasterNotes: getValue("toastmasterNotes"),
        useCategoryBufferDefaults: parseBooleanToken(getValue("useCategoryBufferDefaults")),
        bufferConfig: {
          availableMinutes: parseDuration(getValue("bufferAvailableMinutes"), 0),
          availablePlacement: parseTaskBufferPlacement(getValue("bufferAvailablePlacement")),
          transitionMinutes: parseDuration(getValue("bufferTransitionMinutes"), 0),
          label: getValue("bufferLabel") || "Buffer"
        },
        useCategoryRecoveryDefaults: parseBooleanToken(getValue("useCategoryRecoveryDefaults")),
        recoveryConfig: {
          canShorten: parseBooleanToken(getValue("recoveryCanShorten")),
          minimumDurationMinutes: parseDuration(getValue("recoveryMinimumDurationMinutes"), 0),
          canSkip: parseBooleanToken(getValue("recoveryCanSkip")),
          priority: parseRecoveryPriority(getValue("recoveryPriority"))
        },
        parentReference: getValue("parentReference"),
        dependencyReferences: splitListValue(getValue("dependencyReferences"))
      };
    })
    .filter(Boolean);

  const matchedExistingCount = importedRows.filter((row) =>
    Boolean(matchImportedProjectTask(existingTasks, row))
  ).length;

  return {
    rows: importedRows,
    errors,
    matchedExistingCount,
    newCount: Math.max(importedRows.length - matchedExistingCount, 0)
  };
}

export function parseProjectTaskImportText(text, people = [], existingTasks = []) {
  const rows = parseDelimitedTable(text);
  return parseProjectTaskImportRows(rows, people, existingTasks);
}
