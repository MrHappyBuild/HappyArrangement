export function getLocalEnv() {
  return {
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
    ollamaModel: process.env.OLLAMA_MODEL || "qwen2.5vl:3b",
    receiptMaxFileBytes: Number(process.env.RECEIPT_MAX_FILE_BYTES) || 10 * 1024 * 1024,
    localDataDir: process.env.LOCAL_DATA_DIR || "local-data"
  };
}
