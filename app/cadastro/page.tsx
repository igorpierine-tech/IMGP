import { appPath } from "@/lib/app-path";
import { getCsrfToken } from "@/lib/server/csrf";

export default async function SignupPage() {
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
        <div className="login-eyebrow">NOVO WORKSPACE</div>
        <h1>Crie sua conta</h1>
        <p>Comece gratuitamente com 30 dias de teste. Sem cartão de crédito.</p>

        <form className="login-form" id="signup-form">
          <input type="hidden" name="_csrf" value={csrfToken} />
          <label>Nome da organização<input name="orgName" type="text" required autoComplete="organization" /></label>
          <label>Slug do workspace<input name="slug" type="text" required pattern="[a-z0-9][a-z0-9-]*[a-z0-9]" placeholder="minha-empresa" /></label>
          <label>Seu nome completo<input name="displayName" type="text" required autoComplete="name" /></label>
          <label>E-mail corporativo<input name="email" type="email" required autoComplete="email" /></label>
          <label>Senha (mín. 10 caracteres)<input name="password" type="password" required minLength={10} autoComplete="new-password" /></label>
          <label>Confirmar senha<input name="confirmation" type="password" required minLength={10} autoComplete="new-password" /></label>
          <button className="local-login" type="submit">Criar workspace</button>
        </form>

        <p style={{ textAlign: "center", marginTop: "1rem", fontSize: "0.85rem" }}>
          Já tem uma conta? <a href={appPath("/login")}>Entrar</a>
        </p>

        <div className="login-security">
          <span aria-hidden="true">&#10003;</span>
          <p><strong>Teste gratuito</strong><br />30 dias completos sem compromisso. Seus dados permanecem seguros e privados.</p>
        </div>
      </section>

      <footer className="login-footer">
        Ao criar sua conta, você concorda com os <a href={appPath("/termos")}>Termos de Uso</a> e a <a href={appPath("/privacidade")}>Política de Privacidade</a>.
      </footer>

      <script dangerouslySetInnerHTML={{ __html: `
        document.getElementById('signup-form').addEventListener('submit', async function(e) {
          e.preventDefault();
          var f = new FormData(this);
          if (f.get('password') !== f.get('confirmation')) {
            alert('As senhas não coincidem.');
            return;
          }
          var btn = this.querySelector('button[type=submit]');
          btn.disabled = true;
          btn.textContent = 'Criando...';
          try {
            var resp = await fetch('${appPath("/api/onboarding")}', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orgName: f.get('orgName'),
                slug: f.get('slug'),
                displayName: f.get('displayName'),
                email: f.get('email'),
                password: f.get('password'),
              }),
            });
            var data = await resp.json();
            if (!resp.ok) { alert(data.error || 'Erro ao criar workspace.'); return; }
            window.location.href = data.redirectTo || '/login';
          } catch(err) {
            alert('Erro de conexão.');
          } finally {
            btn.disabled = false;
            btn.textContent = 'Criar workspace';
          }
        });
      ` }} />
    </main>
  );
}
