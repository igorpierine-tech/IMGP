import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server/authz";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let hasMasterDb = false;
  try {
    const { env } = (await import("cloudflare:workers")) as { env: Cloudflare.Env };
    hasMasterDb = !!env.MASTER_DB;
  } catch {
    // cloudflare:workers not available
  }

  redirect(hasMasterDb ? "/workspaces" : "/painel");
}
