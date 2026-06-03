import test from "node:test";
import assert from "node:assert/strict";

import { assertSafeOllamaBaseUrl, getLocalAiHealth } from "../src/lib/local-ai.js";

test("assertSafeOllamaBaseUrl accepts localhost addresses", () => {
  assert.equal(assertSafeOllamaBaseUrl("http://127.0.0.1:11434").hostname, "127.0.0.1");
  assert.equal(assertSafeOllamaBaseUrl("http://localhost:11434").hostname, "localhost");
});

test("assertSafeOllamaBaseUrl rejects remote hosts", () => {
  assert.throws(
    () => assertSafeOllamaBaseUrl("http://192.168.1.20:11434"),
    /OLLAMA_BASE_URL må peke til localhost/
  );
  assert.throws(
    () => assertSafeOllamaBaseUrl("https://example.com"),
    /OLLAMA_BASE_URL må peke til localhost/
  );
});

test("getLocalAiHealth reports ready when the configured model exists", async () => {
  const originalFetch = global.fetch;
  const originalModel = process.env.OLLAMA_MODEL;
  const originalBaseUrl = process.env.OLLAMA_BASE_URL;

  process.env.OLLAMA_MODEL = "qwen2.5vl:3b";
  process.env.OLLAMA_BASE_URL = "http://127.0.0.1:11434";
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      models: [{ name: "qwen2.5vl:3b" }]
    })
  });

  try {
    const health = await getLocalAiHealth();
    assert.equal(health.ready, true);
    assert.equal(health.reachable, true);
    assert.match(health.message, /klar med modellen/i);
  } finally {
    global.fetch = originalFetch;

    if (originalModel === undefined) {
      delete process.env.OLLAMA_MODEL;
    } else {
      process.env.OLLAMA_MODEL = originalModel;
    }

    if (originalBaseUrl === undefined) {
      delete process.env.OLLAMA_BASE_URL;
    } else {
      process.env.OLLAMA_BASE_URL = originalBaseUrl;
    }
  }
});

test("getLocalAiHealth reports missing model when Ollama is reachable", async () => {
  const originalFetch = global.fetch;
  const originalModel = process.env.OLLAMA_MODEL;
  const originalBaseUrl = process.env.OLLAMA_BASE_URL;

  process.env.OLLAMA_MODEL = "qwen2.5vl:3b";
  process.env.OLLAMA_BASE_URL = "http://127.0.0.1:11434";
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      models: [{ name: "llava:7b" }]
    })
  });

  try {
    const health = await getLocalAiHealth();
    assert.equal(health.ready, false);
    assert.equal(health.reachable, true);
    assert.match(health.message, /ikke installert ennå/i);
  } finally {
    global.fetch = originalFetch;

    if (originalModel === undefined) {
      delete process.env.OLLAMA_MODEL;
    } else {
      process.env.OLLAMA_MODEL = originalModel;
    }

    if (originalBaseUrl === undefined) {
      delete process.env.OLLAMA_BASE_URL;
    } else {
      process.env.OLLAMA_BASE_URL = originalBaseUrl;
    }
  }
});
