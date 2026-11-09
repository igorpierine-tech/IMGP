export default function PrivacyPage() {
  return (
    <main className="login-page">
      <section className="login-card" style={{ maxWidth: "720px" }}>
        <h1>Política de Privacidade</h1>
        <p><em>Última atualização: Novembro 2026 — Em conformidade com a LGPD (Lei 13.709/2018)</em></p>

        <h2>1. Dados Coletados</h2>
        <ul>
          <li><strong>Dados de cadastro:</strong> nome, e-mail corporativo, organização.</li>
          <li><strong>Dados de uso:</strong> logs de acesso, endereço IP, user-agent do navegador.</li>
          <li><strong>Dados de projetos:</strong> informações inseridas pelo usuário dentro da plataforma.</li>
        </ul>

        <h2>2. Finalidade do Tratamento</h2>
        <ul>
          <li>Autenticação e controle de acesso.</li>
          <li>Funcionamento da plataforma de gestão de projetos.</li>
          <li>Auditoria de segurança e conformidade.</li>
          <li>Comunicações sobre o serviço.</li>
        </ul>

        <h2>3. Base Legal (LGPD Art. 7°)</h2>
        <p>O tratamento de dados é realizado com base no consentimento do titular (Art. 7°, I) e na execução do contrato de serviço (Art. 7°, V).</p>

        <h2>4. Compartilhamento</h2>
        <p>Dados não são compartilhados com terceiros, exceto:</p>
        <ul>
          <li>Processadores de pagamento (Stripe) para cobrança do serviço.</li>
          <li>Provedores de infraestrutura (Cloudflare) para hospedagem.</li>
          <li>Cumprimento de ordem judicial ou requisição legal.</li>
        </ul>

        <h2>5. Armazenamento</h2>
        <p>Os dados são armazenados em bancos de dados isolados por tenant (database-per-tenant), criptografados em repouso na infraestrutura Cloudflare.</p>

        <h2>6. Direitos do Titular</h2>
        <p>Conforme a LGPD, você pode:</p>
        <ul>
          <li>Confirmar a existência de tratamento de dados.</li>
          <li>Acessar seus dados pessoais.</li>
          <li>Corrigir dados incompletos ou desatualizados.</li>
          <li>Solicitar a portabilidade dos dados (exportação CSV/JSON).</li>
          <li>Solicitar a eliminação de dados pessoais.</li>
          <li>Revogar o consentimento a qualquer momento.</li>
        </ul>

        <h2>7. Retenção</h2>
        <p>Dados são mantidos enquanto a conta estiver ativa. Após cancelamento, os dados são retidos por 90 dias e então eliminados permanentemente.</p>

        <h2>8. Contato do Encarregado (DPO)</h2>
        <p>Para exercer seus direitos ou dúvidas sobre privacidade, entre em contato pelo e-mail do encarregado de dados informado no painel administrativo da sua organização.</p>
      </section>
    </main>
  );
}
