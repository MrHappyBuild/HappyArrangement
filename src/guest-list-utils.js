export const GUEST_LIST_FIELD_OPTIONS = [
  { key: "name", label: "Navn" },
  { key: "email", label: "E-post" },
  { key: "phone", label: "Mobilnummer" },
  { key: "rsvpStatus", label: "RSVP" },
  { key: "roleNames", label: "Roller" },
  { key: "note", label: "Notat" },
  { key: "allergies", label: "Allergier" },
  { key: "dietaryNotes", label: "Matpreferanser" },
  { key: "seatingNote", label: "Sitteinfo" }
];

export const DEFAULT_GUEST_EXPORT_FIELDS = [
  "name",
  "email",
  "phone",
  "rsvpStatus",
  "roleNames",
  "allergies",
  "dietaryNotes",
  "seatingNote"
];

const IMPORT_COLUMN_ALIASES = {
  name: ["name", "navn", "gjest", "fullt navn", "fulltnavn"],
  email: ["email", "e-post", "epost", "mail"],
  phone: ["phone", "mobil", "mobilnummer", "telefon", "telefonnummer"],
  rsvpStatus: ["rsvp", "rsvpstatus", "status", "svar"],
  roleNames: ["roller", "role", "roles", "rolerolle"],
  note: ["notat", "note", "merknad"],
  allergies: ["allergier", "allergi", "allergy", "allergies"],
  dietaryNotes: ["matpreferanser", "kostbehov", "dietary", "mat", "matbehov"],
  seatingNote: ["sitteinfo", "plassering", "seatingnote", "sitteplass"]
};

const RSVP_IMPORT_MAP = {
  accepted: "accepted",
  kommer: "accepted",
  ja: "accepted",
  yes: "accepted",
  maybe: "maybe",
  kanskje: "maybe",
  pending: "pending",
  venter: "pending",
  usikker: "pending",
  "ikke svart": "pending",
  declined: "declined",
  nei: "declined",
  "kommer ikke": "declined",
  no: "declined"
};

const RSVP_EXPORT_MAP = {
  accepted: "Kommer",
  maybe: "Kanskje",
  declined: "Kommer ikke",
  pending: "Ikke svart"
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

function detectDelimiter(text) {
  const firstLine = String(text || "")
    .split(/\r?\n/)
    .find((line) => line.trim());

  if (!firstLine) {
    return ";";
  }

  const delimiters = [";", "\t", ","];
  return delimiters
    .map((delimiter) => ({
      delimiter,
      score: firstLine.split(delimiter).length
    }))
    .sort((left, right) => right.score - left.score)[0].delimiter;
}

export function parseDelimitedTable(text) {
  const source = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const delimiter = detectDelimiter(source);
  const rows = [];
  let currentRow = [];
  let currentValue = "";
  let insideQuotes = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const nextCharacter = source[index + 1];

    if (character === "\"") {
      if (insideQuotes && nextCharacter === "\"") {
        currentValue += "\"";
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (character === delimiter && !insideQuotes) {
      currentRow.push(currentValue);
      currentValue = "";
      continue;
    }

    if (character === "\n" && !insideQuotes) {
      currentRow.push(currentValue);
      rows.push(currentRow);
      currentRow = [];
      currentValue = "";
      continue;
    }

    currentValue += character;
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue);
    rows.push(currentRow);
  }

  return rows
    .map((row) => row.map((cell) => String(cell || "").trim()))
    .filter((row) => row.some((cell) => cell));
}

function findImportColumnIndex(headers, canonicalKey) {
  const aliases = IMPORT_COLUMN_ALIASES[canonicalKey] || [canonicalKey];
  return headers.findIndex((header) => aliases.includes(normalizeKey(header)));
}

function splitRoleNames(value) {
  return String(value || "")
    .split(/[;,/]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function buildGuestImportTemplateTable() {
  const headers = GUEST_LIST_FIELD_OPTIONS.map((field) => field.label);
  const exampleRow = [
    "Ola Nordmann",
    "ola@example.no",
    "+47 900 00 000",
    "Kommer",
    "Gjest",
    "Toastmaster under middagen",
    "Ingen",
    "Vegetar",
    "Bor sitte narmt familien"
  ];

  return [headers, exampleRow];
}

export function buildGuestImportTemplateCsv() {
  const rows = buildGuestImportTemplateTable();

  return rows
    .map((row) => row.map((value) => escapeCsvValue(value, ";")).join(";"))
    .join("\n");
}

export function buildGuestExportTable(people, roles, fieldKeys = DEFAULT_GUEST_EXPORT_FIELDS) {
  const activeFields = GUEST_LIST_FIELD_OPTIONS.filter((field) => fieldKeys.includes(field.key));
  const roleMap = new Map((Array.isArray(roles) ? roles : []).map((role) => [role.id, role.name]));
  const rows = [activeFields.map((field) => field.label)];

  (Array.isArray(people) ? people : []).forEach((person) => {
    const roleNames = (Array.isArray(person.roleIds) ? person.roleIds : [])
      .map((roleId) => roleMap.get(roleId))
      .filter(Boolean)
      .join(", ");
    const values = activeFields.map((field) => {
      if (field.key === "roleNames") {
        return roleNames;
      }

      if (field.key === "rsvpStatus") {
        return RSVP_EXPORT_MAP[person.rsvpStatus] || RSVP_EXPORT_MAP.pending;
      }

      return person[field.key] || "";
    });

    rows.push(values);
  });

  return rows;
}

export function buildGuestExportCsv(people, roles, fieldKeys = DEFAULT_GUEST_EXPORT_FIELDS) {
  const rows = buildGuestExportTable(people, roles, fieldKeys);

  return rows
    .map((row) => row.map((value) => escapeCsvValue(value, ";")).join(";"))
    .join("\n");
}

export function parseGuestImportRows(rows, roles = []) {
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
    name: findImportColumnIndex(headerRow, "name"),
    email: findImportColumnIndex(headerRow, "email"),
    phone: findImportColumnIndex(headerRow, "phone"),
    rsvpStatus: findImportColumnIndex(headerRow, "rsvpStatus"),
    roleNames: findImportColumnIndex(headerRow, "roleNames"),
    note: findImportColumnIndex(headerRow, "note"),
    allergies: findImportColumnIndex(headerRow, "allergies"),
    dietaryNotes: findImportColumnIndex(headerRow, "dietaryNotes"),
    seatingNote: findImportColumnIndex(headerRow, "seatingNote")
  };
  const roleByName = new Map(
    (Array.isArray(roles) ? roles : []).map((role) => [normalizeKey(role.name), role.id])
  );
  const errors = [];
  const importedRows = dataRows
    .map((row, rowIndex) => {
      const getValue = (key) => {
        const index = headerIndexes[key];
        return index >= 0 ? String(row[index] || "").trim() : "";
      };
      const name = getValue("name");

      if (!name) {
        errors.push(`Rad ${rowIndex + 2} mangler navn.`);
        return null;
      }

      const unresolvedRoles = [];
      const roleIds = splitRoleNames(getValue("roleNames")).reduce((accumulator, roleName) => {
        const roleId = roleByName.get(normalizeKey(roleName));

        if (roleId) {
          accumulator.push(roleId);
        } else {
          unresolvedRoles.push(roleName);
        }

        return accumulator;
      }, []);

      if (unresolvedRoles.length > 0) {
        errors.push(
          `Rad ${rowIndex + 2} har ukjente roller: ${unresolvedRoles.join(", ")}.`
        );
      }

      return {
        name,
        email: getValue("email"),
        phone: getValue("phone"),
        rsvpStatus: RSVP_IMPORT_MAP[normalizeKey(getValue("rsvpStatus"))] || "pending",
        note: getValue("note"),
        allergies: getValue("allergies"),
        dietaryNotes: getValue("dietaryNotes"),
        seatingNote: getValue("seatingNote"),
        roleIds
      };
    })
    .filter(Boolean);

  return {
    rows: importedRows,
    errors,
    matchedExistingCount: 0,
    newCount: importedRows.length
  };
}

export function parseGuestImportText(text, roles = []) {
  const rows = parseDelimitedTable(text);
  return parseGuestImportRows(rows, roles);
}

export function buildGuestExportFilename(format = "csv") {
  const normalizedFormat = String(format || "csv").toLowerCase();
  const extension = normalizedFormat === "xlsx" ? "xlsx" : normalizedFormat === "pdf" ? "pdf" : "csv";
  return `gjesteliste-eksport.${extension}`;
}

export function buildGuestTemplateFilename(format = "csv") {
  const normalizedFormat = String(format || "csv").toLowerCase();
  const extension = normalizedFormat === "xlsx" ? "xlsx" : "csv";
  return `gjesteliste-mal.${extension}`;
}

export function buildGuestExportPdfLines(people, roles, fieldKeys = DEFAULT_GUEST_EXPORT_FIELDS) {
  const rows = buildGuestExportTable(people, roles, fieldKeys);
  const [headerRow = [], ...dataRows] = rows;
  const lines = [];

  lines.push(`Gjestelisteeksport`);
  lines.push(`Felter: ${headerRow.join(" · ")}`);
  lines.push("");

  dataRows.forEach((row, index) => {
    lines.push(`${index + 1}. ${row[0] || "Uten navn"}`);

    headerRow.slice(1).forEach((header, headerIndex) => {
      const value = row[headerIndex + 1];
      if (value) {
        lines.push(`   ${header}: ${value}`);
      }
    });

    lines.push("");
  });

  return lines;
}
