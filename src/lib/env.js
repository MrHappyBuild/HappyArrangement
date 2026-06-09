export function getLocalEnv() {
  const hasSupabaseConfig = Boolean(
    (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const requestedProcessingMode = process.env.RECEIPT_PROCESSING_MODE || "";
  const receiptProcessingMode =
    requestedProcessingMode === "inline" || requestedProcessingMode === "queue"
      ? requestedProcessingMode
      : hasSupabaseConfig
        ? "queue"
        : "inline";

  return {
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
    ollamaModel: process.env.OLLAMA_MODEL || "qwen2.5vl:3b",
    receiptMaxFileBytes: Number(process.env.RECEIPT_MAX_FILE_BYTES) || 10 * 1024 * 1024,
    localDataDir: process.env.LOCAL_DATA_DIR || "local-data",
    receiptProcessingMode
  };
}
