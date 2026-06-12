import { parseDelimitedTable } from "./guest-list-utils.js";

export const PROJECT_TASK_IMPORT_COLUMNS = [
  { key: "referenceCode", label: "Aktivitetskode" },
  { key: "title", label: "Tittel" },
  { key: "description", label: "Beskrivelse" },
  { key: "status", label: "Status" },
  { key: "assigneeNames", label: "Ansvarlige" },
  { key: "durationMinutes", label: "Varighet (min)" },
  { key: "desiredStartAt", label: "Onsket start" },
  { key: "dueDate", label: "Frist" },
  { key: "isFixedTime", label: "Fast tidspunkt" },
  { key: "showOnAgenda", label: "Vises pa agenda" },
  { key: "agendaComment", label: "Agenda-kommentar" },
  { key: "parentReference", label: "Overkode" },
  { key: "dependencyReferences", label: "Avhenger av" }
];

export const PROJECT_TASK_FIELD_OPTIONS = [
  { key: "referenceCode", label: "Aktivitetskode" },
  { key: "title", label: "Tittel" },
  { key: "status", label: "Status" },
  { key: "assigneeNames", label: "Ansvarlige" },
  { key: "durationMinutes", label: "Varighet (min)" },
  { key: "desiredStartAt", label: "Onsket start" },
  { key: "scheduledStartAt", label: "Planlagt start" },
  { key: "scheduledEndAt", label: "Planlagt slutt" },
  { key: "dueDate", label: "Frist" },
  { key: "isFixedTime", label: "Fast tidspunkt" },
  { key: "showOnAgenda", label: "Vises pa agenda" },
  { key: "agendaComment", label: "Agenda-kommentar" },
  { key: "parentReference", label: "Overkode" },
  { key: "dependencyReferences", label: "Avhenger av" },
  { key: "description", label: "Beskrivelse" }
];

export const DEFAULT_PROJECT_TASK_EXPORT_FIELDS = [
  "referenceCode",
  "title",
  "status",
  "assigneeNames",
  "durationMinutes",
  "desiredStartAt",
  "scheduledStartAt",
  "scheduledEndAt",
  "dueDate",
  "isFixedTime",
  "showOnAgenda",
  "parentReference",
  "dependencyReferences",
  "agendaComment"
];

const IMPORT_COLUMN_ALIASES = {
  referenceCode: ["aktivitetskode", "kode", "taskcode", "reference", "ref", "id"],
  title: ["tittel", "aktivitet", "task", "name", "navn"],
  description: ["beskrivelse", "description", "notat", "note"],
  status: ["status"],
  assigneeNames: ["ansvarlige", "ansvarlig", "assignees", "owner", "eier"],
  durationMinutes: ["varighet", "varighet (min)", "duration", "durationminutes", "minutter"],
  desiredStartAt: ["onsket start", "ønsket start", "desiredstart", "startonske", "start"],
  dueDate: ["frist", "duedate", "forfallsdato", "deadline"],
  isFixedTime: ["fast tidspunkt", "kan ikke forskyves", "fixedtime", "lockedtime"],
  showOnAgenda: ["vises pa agenda", "vises på agenda", "showonagenda", "agenda"],
  agendaComment: ["agenda-kommentar", "agendakommentar", "agendacomment", "kommentar"],
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
      assigneeNames,
      durationMinutes: String(task.durationMinutes ?? ""),
      desiredStartAt: task.desiredStartAt || "",
      scheduledStartAt: task.displayStartAt || task.scheduledStartAt || "",
      scheduledEndAt: task.displayEndAt || task.scheduledEndAt || "",
      dueDate: task.dueDate || "",
      isFixedTime: formatBooleanLabel(Boolean(task.isFixedTime)),
      showOnAgenda: formatBooleanLabel(Boolean(task.showOnAgenda)),
      agendaComment: task.agendaComment || "",
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
      "Ida; Aki",
      "0",
      "2026-07-20T16:00",
      "",
      "Ja",
      "Ja",
      "Starter ute ved inngangen",
      "",
      ""
    ],
    [
      "LEKER",
      "Introdusere leker og velkomstdrinker",
      "Kort introduksjon for gjestene",
      "Ikke startet",
      "Ida",
      "15",
      "",
      "",
      "Nei",
      "Ja",
      "Hold mikrofon klar",
      "VELKOMST",
      ""
    ],
    [
      "BRUDENSTALE",
      "Brudens tale",
      "Klart etter pause",
      "Ikke startet",
      "Toastmaster",
      "20",
      "",
      "",
      "Nei",
      "Ja",
      "",
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
    assigneeNames: findImportColumnIndex(headerRow, "assigneeNames"),
    durationMinutes: findImportColumnIndex(headerRow, "durationMinutes"),
    desiredStartAt: findImportColumnIndex(headerRow, "desiredStartAt"),
    dueDate: findImportColumnIndex(headerRow, "dueDate"),
    isFixedTime: findImportColumnIndex(headerRow, "isFixedTime"),
    showOnAgenda: findImportColumnIndex(headerRow, "showOnAgenda"),
    agendaComment: findImportColumnIndex(headerRow, "agendaComment"),
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
        assigneeIds: [...new Set(assigneeIds)],
        durationMinutes: parseDuration(getValue("durationMinutes"), 60),
        desiredStartAt: getValue("desiredStartAt"),
        dueDate: getValue("dueDate"),
        isFixedTime: parseBooleanToken(getValue("isFixedTime")),
        showOnAgenda: parseBooleanToken(getValue("showOnAgenda")),
        agendaComment: getValue("agendaComment"),
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
