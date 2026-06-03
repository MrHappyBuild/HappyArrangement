import test from "node:test";
import assert from "node:assert/strict";

import { assertAllowedFileType } from "../src/lib/uploads.js";

test("assertAllowedFileType accepts safe image types", () => {
  assert.doesNotThrow(() => assertAllowedFileType("image/jpeg"));
  assert.doesNotThrow(() => assertAllowedFileType("image/png"));
  assert.doesNotThrow(() => assertAllowedFileType("image/webp"));
});

test("assertAllowedFileType rejects unsupported uploads", () => {
  assert.throws(() => assertAllowedFileType("image/heic"), /Bare JPEG, PNG eller WebP/);
  assert.throws(() => assertAllowedFileType("application/pdf"), /Bare JPEG, PNG eller WebP/);
});
