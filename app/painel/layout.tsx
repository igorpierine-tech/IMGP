import { requirePageUser } from "@/lib/server/authz";
import AppShell from "./app-shell";
import { ToastProvider } from "./components/toast";

export const dynamic = "force-dynamic";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser("/painel");
  return (
    <ToastProvider>
      <AppShell user={user}>{children}</AppShell>
    </ToastProvider>
  );
}
