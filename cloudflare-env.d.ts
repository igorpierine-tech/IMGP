declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    MASTER_DB?: D1Database;
    BUCKET?: R2Bucket;
    DATA_BACKEND?: "d1" | "supabase";
    SUPABASE_URL?: string;
    SUPABASE_PUBLISHABLE_KEY?: string;
    SUPABASE_SECRET_KEY?: string;
    MASTER_BOOTSTRAP_TOKEN?: string;
    MASTER_BOOTSTRAP_EMAIL?: string;
    JWT_SECRET?: string;
  }
}

