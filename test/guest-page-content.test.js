import assert from "node:assert/strict";
import test from "node:test";

import { parseGuestPageContent, parseGuestPageInlineContent } from "../src/guest-page-content.js";

test("parseGuestPageContent supports uploaded images and simple link markdown", () => {
  const blocks = parseGuestPageContent(`
# Velkommen

![Kart](/api/events/event-1/guest-media/media-1)

Se [programmet](https://example.com/program).
`);

  assert.equal(blocks.length, 3);
  assert.equal(blocks[0].type, "heading");
  assert.equal(blocks[1].type, "image");
  assert.equal(blocks[1].src, "/api/events/event-1/guest-media/media-1");
  assert.equal(blocks[2].type, "paragraph");
  assert.equal(blocks[2].parts[1].type, "link");
  assert.equal(blocks[2].parts[1].href, "https://example.com/program");
});

test("parseGuestPageInlineContent treats unsafe javascript links as plain text", () => {
  const parts = parseGuestPageInlineContent("[Farlig](javascript:evil)");

  assert.equal(parts.length, 1);
  assert.equal(parts[0].type, "text");
  assert.match(parts[0].text, /javascript:evil/);
});

test("parseGuestPageInlineContent supports inline text styles on selected text", () => {
  const parts = parseGuestPageInlineContent(
    "Velkommen [style font=editorial size=lg weight=bold]fine folk[/style] hit."
  );

  assert.equal(parts.length, 3);
  assert.equal(parts[1].type, "styled");
  assert.equal(parts[1].styles.fontPreset, "editorial");
  assert.equal(parts[1].styles.textSize, "lg");
  assert.equal(parts[1].styles.textWeight, "bold");
  assert.equal(parts[1].parts[0].type, "text");
  assert.equal(parts[1].parts[0].text, "fine folk");
});

test("parseGuestPageInlineContent supports links inside styled inline text", () => {
  const parts = parseGuestPageInlineContent(
    "[style weight=bold]Les [programmet](https://example.com/program)[/style]"
  );

  assert.equal(parts.length, 1);
  assert.equal(parts[0].type, "styled");
  assert.equal(parts[0].parts[1].type, "link");
  assert.equal(parts[0].parts[1].href, "https://example.com/program");
});

test("parseGuestPageContent tolerates incomplete image markup while editing", () => {
  const blocks = parseGuestPageContent("![Halvferdig](/api/events/test/guest-media");

  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].type, "paragraph");
});

test("parseGuestPageInlineContent tolerates incomplete style markup while editing", () => {
  const parts = parseGuestPageInlineContent("[style weight=bold]Halvferdig");

  assert.equal(parts.length, 1);
  assert.equal(parts[0].type, "text");
  assert.match(parts[0].text, /Halvferdig/);
});

test("parseGuestPageContent converts common HTML into readable guest content", () => {
  const blocks = parseGuestPageContent(`
<h1>Program</h1>
<p>Velkommen til <strong>helgen</strong><br>Se <a href="https://example.com/info">info</a>.</p>
<ul><li>Oppmote 12:00</li><li>Middag 19:00</li></ul>
`);

  assert.equal(blocks.length, 3);
  assert.equal(blocks[0].type, "heading");
  assert.equal(blocks[0].parts[0].text, "Program");
  assert.equal(blocks[1].type, "paragraph");
  assert.match(blocks[1].parts[0].text, /Velkommen til helgen/);
  assert.equal(blocks[1].parts[1].type, "link");
  assert.equal(blocks[1].parts[1].href, "https://example.com/info");
  assert.equal(blocks[2].type, "list");
  assert.equal(blocks[2].items.length, 2);
});

test("parseGuestPageContent converts image html and decodes entities", () => {
  const blocks = parseGuestPageContent(
    `<p>Hei &amp; velkommen</p><img src="/api/events/event-1/guest-media/media-2" alt="Kart &amp; parkering">`
  );

  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].type, "paragraph");
  assert.equal(blocks[0].parts[0].text, "Hei & velkommen");
  assert.equal(blocks[1].type, "image");
  assert.equal(blocks[1].src, "/api/events/event-1/guest-media/media-2");
  assert.equal(blocks[1].alt, "Kart & parkering");
});
