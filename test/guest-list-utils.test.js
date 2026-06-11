import test from "node:test";
import assert from "node:assert/strict";

import {
  buildGuestExportCsv,
  buildGuestImportTemplateCsv,
  parseDelimitedTable,
  parseGuestImportText
} from "../src/guest-list-utils.js";

test("parseDelimitedTable reads quoted semicolon csv rows", () => {
  const rows = parseDelimitedTable('Navn;Notat\n"Ola; Nordmann";"Bor ved scenen"');

  assert.deepEqual(rows, [
    ["Navn", "Notat"],
    ["Ola; Nordmann", "Bor ved scenen"]
  ]);
});

test("buildGuestExportCsv serializes selected guest fields", () => {
  const csv = buildGuestExportCsv(
    [
      {
        name: "Anna Example",
        email: "anna@example.no",
        phone: "+47 900 00 000",
        rsvpStatus: "accepted",
        roleIds: ["role-1"],
        allergies: "Notter"
      }
    ],
    [{ id: "role-1", name: "Toastmaster" }],
    ["name", "email", "rsvpStatus", "roleNames", "allergies"]
  );

  assert.match(csv, /Navn;E-post;RSVP;Roller;Allergier/);
  assert.match(csv, /Anna Example;anna@example\.no;Kommer;Toastmaster;Notter/);
});

test("buildGuestImportTemplateCsv includes headers and example row", () => {
  const csv = buildGuestImportTemplateCsv();

  assert.match(csv, /Navn;E-post;Mobilnummer;RSVP;Roller/);
  assert.match(csv, /Ola Nordmann;ola@example\.no/);
});

test("parseGuestImportText maps rows and resolves roles", () => {
  const result = parseGuestImportText(
    "Navn;E-post;Mobilnummer;RSVP;Roller;Allergier\nOla Nordmann;ola@example.no;+47 900 00 000;Kommer;Toastmaster;Laktose",
    [{ id: "role-1", name: "Toastmaster" }]
  );

  assert.equal(result.errors.length, 0);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].name, "Ola Nordmann");
  assert.equal(result.rows[0].rsvpStatus, "accepted");
  assert.deepEqual(result.rows[0].roleIds, ["role-1"]);
});

test("parseGuestImportText reports missing names and unknown roles", () => {
  const result = parseGuestImportText(
    "Navn;Roller\n;Toastmaster\nKari;Ukjent rolle",
    [{ id: "role-1", name: "Toastmaster" }]
  );

  assert.equal(result.rows.length, 1);
  assert.match(result.errors[0], /mangler navn/i);
  assert.match(result.errors[1], /ukjente roller/i);
});
