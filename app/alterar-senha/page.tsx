import { requirePageUser } from "@/lib/server/authz";
import { appPath } from "@/lib/app-path";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function ChangePasswordPage({ searchParams }: Props) {
  const user = await requirePageUser("/alterar-senha");
  const { error } = await searchParams;
  return <main className="login-page">
    <section className="login-brand" aria-label="Raízes e Riquezas"><div className="login-brand-mark">RR</div><div><strong>RAÍZES E RIQUEZAS</strong><span>Gestão Integrada de Projetos</span></div></section>
    <section className="login-card">
      <div className="login-eyebrow">SEGURANÇA DA CONTA</div>
      <h1>Alterar senha</h1>
      <p>{user.displayName}, defina sua senha pessoal para continuar.</p>
      {error ? <div className="login-error" role="alert">{error}</div> : null}
      <form className="login-form" action={appPath("/api/auth/change-password")} method="post">
        <label>Senha atual<input name="currentPassword" type="password" autoComplete="current-password" required /></label>
        <label>Nova senha<input name="password" type="password" autoComplete="new-password" minLength={10} required /></label>
        <label>Confirmar nova senha<input name="confirmation" type="password" autoComplete="new-password" minLength={10} required /></label>
        <button className="local-login" type="submit">Salvar nova senha</button>
      </form>
    </section>
    <footer className="login-footer">Uso restrito a usuários autorizados da Raízes e Riquezas.</footer>
  </main>;
}
