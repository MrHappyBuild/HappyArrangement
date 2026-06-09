import { createClient } from "@supabase/supabase-js";

let supabaseAdmin = null;

export function getSupabaseEnv() {
  return {
    url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    mediaBucket: process.env.SUPABASE_MEDIA_BUCKET || "receipt-images",
    defaultOwnerUserId: process.env.SUPABASE_DEFAULT_OWNER_USER_ID || ""
  };
}

export function isSupabaseConfigured() {
  const { url, serviceRoleKey } = getSupabaseEnv();
  return Boolean(url && serviceRoleKey);
}

export function getSupabaseAdmin() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase er ikke konfigurert i miljovariablene.");
  }

  if (!supabaseAdmin) {
    const { url, serviceRoleKey } = getSupabaseEnv();
    supabaseAdmin = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  return supabaseAdmin;
}
