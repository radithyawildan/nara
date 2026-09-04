import "server-only";

import { createClient } from "@supabase/supabase-js";

function getProjectUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured.");
  }

  return url;
}

function getPublicKey() {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!key) {
    throw new Error("A Supabase publishable/anon key is not configured.");
  }

  return key;
}

function getAdminKey() {
  const key =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!key) {
    throw new Error(
      "A server-only Supabase secret/service-role key is required for account administration.",
    );
  }

  return key;
}

export function getSupabaseAdminClient() {
  return createClient(getProjectUrl(), getAdminKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export function createSupabaseCredentialVerifier() {
  return createClient(getProjectUrl(), getPublicKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
