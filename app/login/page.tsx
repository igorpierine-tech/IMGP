import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server/authz";
import { entraConfiguration, safeReturnPath } from "@/lib/server/entra-auth";
import { appPath } from "@/lib/app-path";
import { getCsrfToken } from "@/lib/server/csrf";

type LoginPageProps = {
  searchParams: Promise<{ return_to?: string; error?: string; setup?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();
  if (user) redirect("/painel");
  const params = await searchParams;
  const returnTo = safeReturnPath(params.return_to);
  const config = entraConfiguration();
  const setupMode = params.setup === "1";
  const csrfToken = await getCsrfToken();

  return (
    <main className="login-page">
      <section className="login-brand" aria-label="Raízes e Riquezas">
        <div className="login-brand-mark" aria-hidden="true">RR</div>
        <div>
          <strong>RAÍZES E RIQUEZAS</strong>
          <span>Gestão Integrada de Projetos</span>
        </div>
      </section>

      <section className="login-card">
        <div className="login-eyebrow">{setupMode ? "PRIMEIRO ACESSO" : "ACESSO CORPORATIVO"}</div>
        <h1>{setupMode ? "Criar conta do coordenador" : "Gestão de projetos"}</h1>
        <p>{setupMode ? "Informe o token de ativação e defina a conta inicial que administrará a plataforma." : "Entre com seu e-mail corporativo e senha para acessar os projetos."}</p>

        {params.error ? <div className="login-error" role="alert">{params.error}</div> : null}
        {setupMode ? (
          <form className="login-form" action={appPath("/api/auth/bootstrap")} method="post">
            <input type="hidden" name="_csrf" value={csrfToken} />
            <label>Token de ativação<input name="setupToken" type="password" autoComplete="off" required /></label>
            <label>Nome completo<input name="displayName" autoComplete="name" required /></label>
            <label>E-mail corporativo<input name="email" type="email" autoComplete="email" required /></label>
            <label>Senha<input name="password" type="password" autoComplete="new-password" minLength={10} required /></label>
            <label>Confirmar senha<input name="confirmation" type="password" autoComplete="new-password" minLength={10} required /></label>
            <button className="local-login" type="submit">Criar conta e entrar</button>
          </form>
        ) : (
          <>
            <form className="login-form" action={appPath("/api/auth/login")} method="post">
              <input type="hidden" name="_csrf" value={csrfToken} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <label>E-mail corporativo<input name="email" type="email" autoComplete="username" required /></label>
              <label>Senha<input name="password" type="password" autoComplete="current-password" required /></label>
              <button className="local-login" type="submit">Entrar</button>
            </form>
            {config.configured ? <><div className="login-divider"><span>ou</span></div><a className="microsoft-login" href={appPath(`/auth/start?return_to=${encodeURIComponent(returnTo)}`)}><span className="microsoft-mark" aria-hidden="true"><i /><i /><i /><i /></span>Entrar com Microsoft</a></> : null}
          </>
        )}

        <div className="login-security">
          <span aria-hidden="true">✓</span>
          <p><strong>Acesso protegido</strong><br />As senhas são armazenadas somente como hash criptográfico e as sessões expiram automaticamente.</p>
        </div>
      </section>

      <footer className="login-footer">Uso restrito a usuários autorizados da Raízes e Riquezas.</footer>
    </main>
  );
}
