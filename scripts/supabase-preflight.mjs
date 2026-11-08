import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL?.trim();
const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();

if (!url || !secretKey) {
  console.error("Defina SUPABASE_URL e SUPABASE_SECRET_KEY antes de executar o preflight.");
  process.exit(1);
}

const client = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
});

const [{ error: databaseError }, { data: users, error: authError }] = await Promise.all([
  client.from("project_types").select("id", { count: "exact", head: true }),
  client.auth.admin.listUsers({ page: 1, perPage: 1 }),
]);

if (databaseError || authError) {
  console.error("Preflight do Supabase falhou.");
  if (databaseError) console.error(`Banco: ${databaseError.message}`);
  if (authError) console.error(`Auth: ${authError.message}`);
  process.exit(1);
}

console.log(`Supabase acessivel. Auth respondeu com ${users.users.length} usuario(s) na amostra.`);
