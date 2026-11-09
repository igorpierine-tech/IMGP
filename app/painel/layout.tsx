import { requirePageUser } from "@/lib/server/authz";
import AppShell from "./app-shell";

export const dynamic = "force-dynamic";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser("/painel");
  return <AppShell user={user}>{children}</AppShell>;
}
