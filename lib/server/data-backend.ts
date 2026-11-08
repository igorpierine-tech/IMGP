import { env } from "cloudflare:workers";

export type DataBackend = "d1" | "supabase";

export function configuredDataBackend(): DataBackend {
  return env.DATA_BACKEND === "supabase" ? "supabase" : "d1";
}

export function supabaseEnvironment() {
  return {
    url: env.SUPABASE_URL?.trim() ?? "",
    publishableKey: env.SUPABASE_PUBLISHABLE_KEY?.trim() ?? "",
    secretKey: env.SUPABASE_SECRET_KEY?.trim() ?? "",
  };
}

export function isSupabaseConfigured() {
  const configuration = supabaseEnvironment();
  return Boolean(configuration.url && configuration.publishableKey && configuration.secretKey);
}

export function assertSupabaseConfigured() {
  const configuration = supabaseEnvironment();
  if (!configuration.url || !configuration.secretKey) {
    throw new Error("Supabase ainda nao configurado. Defina SUPABASE_URL e SUPABASE_SECRET_KEY no ambiente seguro.");
  }
  return configuration;
}
