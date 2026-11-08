import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server/authz";
import { getMasterDb } from "@/db";
import { tenants, tenantUsers } from "@/db/master-schema";
import { appPath } from "@/lib/app-path";

export const dynamic = "force-dynamic";

export default async function WorkspacesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?return_to=/workspaces");

  let available: { id: string; slug: string; name: string; status: string }[] = [];

  try {
    const masterDb = getMasterDb();
    const memberships = await masterDb
      .select({ tenantId: tenantUsers.tenantId })
      .from(tenantUsers)
      .where(eq(tenantUsers.email, user.email));

    if (memberships.length > 0) {
      const tenantIds = memberships.map((m) => m.tenantId);
      const rows = await masterDb
        .select({ id: tenants.id, slug: tenants.slug, name: tenants.name, status: tenants.status })
        .from(tenants);
      available = rows.filter(
        (t) => tenantIds.includes(t.id) && t.status !== "cancelled",
      );
    }
  } catch {
    // Master DB may not be configured in legacy single-tenant mode
  }

  if (available.length === 1) {
    redirect(`/t/${available[0].slug}/legacy`);
  }

  return (
    <main className="login-page">
      <section className="login-brand" aria-label="Raízes e Riquezas">
        <div className="login-brand-mark" aria-hidden="true">RR</div>
        <div>
          <strong>RAÍZES E RIQUEZAS</strong>
          <span>Gestão Integrada de Projetos</span>
        </div>
      </section>

      <section className="login-card" style={{ maxWidth: 520 }}>
        <div className="login-eyebrow">WORKSPACES</div>
        <h1>Selecione um workspace</h1>
        <p>Olá, {user.displayName}. Escolha o workspace que deseja acessar.</p>

        {available.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
            {available.map((t) => (
              <a
                key={t.id}
                href={appPath(`/t/${t.slug}/legacy`)}
                style={{
                  display: "block",
                  padding: "14px 18px",
                  border: "1px solid #d0d5dd",
                  borderRadius: 8,
                  textDecoration: "none",
                  color: "inherit",
                  transition: "border-color .15s",
                }}
              >
                <strong>{t.name}</strong>
                <br />
                <span style={{ fontSize: 13, opacity: 0.7 }}>{t.slug} · {t.status === "trial" ? "Período de teste" : "Ativo"}</span>
              </a>
            ))}
          </div>
        ) : (
          <div style={{ marginTop: 16 }}>
            <p style={{ opacity: 0.7 }}>Nenhum workspace disponível para sua conta.</p>
            <a
              href={appPath("/legacy")}
              style={{ display: "inline-block", marginTop: 12, padding: "10px 20px", background: "#1d4ed8", color: "#fff", borderRadius: 6, textDecoration: "none" }}
            >
              Acessar modo legado
            </a>
          </div>
        )}
      </section>

      <footer className="login-footer">
        <a href={appPath("/legacy")} style={{ color: "inherit", textDecoration: "underline" }}>
          Acessar sem workspace (modo legado)
        </a>
      </footer>
    </main>
  );
}
