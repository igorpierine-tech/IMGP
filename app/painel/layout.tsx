import { requirePageUser } from "@/lib/server/authz";
import AppShell from "./app-shell";
import { ToastProvider } from "./components/toast";
import { I18nProvider } from "./components/i18n";
import { OfflineBanner } from "./components/error-boundary";

export const dynamic = "force-dynamic";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser("/painel");
  return (
    <I18nProvider>
      <ToastProvider>
        <AppShell user={user}>{children}</AppShell>
        <OfflineBanner />
      </ToastProvider>
    </I18nProvider>
  );
}
