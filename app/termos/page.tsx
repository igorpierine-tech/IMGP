export default function TermsPage() {
  return (
    <main className="login-page">
      <section className="login-card" style={{ maxWidth: "720px" }}>
        <h1>Termos de Uso</h1>
        <p><em>Última atualização: Novembro 2026</em></p>

        <h2>1. Aceitação</h2>
        <p>Ao acessar e utilizar a plataforma Raízes e Riquezas - Gestão Integrada de Projetos (&quot;IMGP&quot;), você concorda com estes termos.</p>

        <h2>2. Serviço</h2>
        <p>A IMGP é uma plataforma SaaS de gestão de projetos multi-tenant. Cada organização (tenant) opera em um ambiente isolado com seus próprios dados.</p>

        <h2>3. Responsabilidades do Usuário</h2>
        <ul>
          <li>Manter a confidencialidade das suas credenciais de acesso.</li>
          <li>Não compartilhar dados do workspace com terceiros não autorizados.</li>
          <li>Utilizar a plataforma de acordo com a legislação vigente.</li>
        </ul>

        <h2>4. Propriedade dos Dados</h2>
        <p>Os dados inseridos na plataforma pertencem à organização contratante. A Raízes e Riquezas não utiliza os dados dos clientes para fins comerciais próprios.</p>

        <h2>5. Período de Teste</h2>
        <p>Novos workspaces recebem 30 dias de teste gratuito. Após esse período, é necessário contratar um plano para continuar utilizando o serviço.</p>

        <h2>6. Cancelamento</h2>
        <p>O cancelamento pode ser feito a qualquer momento pelo portal de billing. Dados são retidos por 90 dias após o cancelamento e podem ser exportados pelo administrador antes da exclusão.</p>

        <h2>7. Limitação de Responsabilidade</h2>
        <p>A plataforma é fornecida &quot;como está&quot;. A Raízes e Riquezas não se responsabiliza por perdas decorrentes de falhas técnicas, indisponibilidade temporária ou uso indevido pelo usuário.</p>
      </section>
    </main>
  );
}
