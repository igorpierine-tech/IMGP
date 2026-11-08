import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { assertSupabaseConfigured } from "./data-backend";

let adminClient: SupabaseClient | undefined;

/** Cliente administrativo exclusivo do servidor. */
export function getSupabaseAdmin(): SupabaseClient {
  if (adminClient) return adminClient;
  const configuration = assertSupabaseConfigured();
  adminClient = createClient(configuration.url, configuration.secretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
  return adminClient;
}
