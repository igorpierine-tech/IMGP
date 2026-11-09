# 07 — Estratégia de Diferenciação

**Raízes e Riquezas — Gestão Integrada de Projetos**
Data: 2026-11-08

---

## 1. Posicionamento Estratégico

### 1.1 Declaração de Posicionamento

> **Raízes e Riquezas** é a plataforma de gestão integrada de projetos para PMOs de empresas de médio porte no agronegócio e indústria, que precisam de governança sobre o portfólio de projetos de TI — da demanda de viabilidade ao acompanhamento de entrega — sem a complexidade e o custo das ferramentas enterprise.

### 1.2 Público-Alvo Primário

| Segmento | Perfil | Dor principal |
|---|---|---|
| **PMO de TI no agronegócio** | 5-50 projetos simultâneos, equipe de 10-100 pessoas | Demandas chegam sem processo, priorização é política, não há visibilidade de portfólio |
| **PMO de TI na indústria** | Projetos de automação, ERP, integração | Gestão dividida entre planilhas, e-mail e GLPI/ServiceDesk |
| **Consultorias de gestão de projetos** | Atendem múltiplos clientes com PMO terceirizado | Precisam de multi-tenant com visão consolidada por cliente |

### 1.3 Público-Alvo Secundário

| Segmento | Perfil |
|---|---|
| Cooperativas agroindustriais | TI centralizada com múltiplas unidades |
| Empresas de médio porte em transformação digital | Primeiro PMO estruturado |
| Governança de projetos em holdins familiares | Diretoria quer visibilidade sem operar a ferramenta |

---

## 2. Pilares de Diferenciação

### 2.1 Pilar 1: Gestão de Viabilidade Integrada

**O que é**: Formulário estruturado de viabilidade em 4 blocos (Identificação, Problema, Requisitos, Benefícios) com 30+ campos, fluxo de aprovação multi-etapa e cálculo de benefícios baseado em dados reais.

**Por que é único**: Nenhum concorrente oferece nativamente um intake de demandas com formulário de requisitos estruturado vinculado a fluxo de aprovação e análise de viabilidade (ROI/benefício). Em ferramentas como Jira, Monday.com ou Asana, isso requer múltiplos plugins/automações ou construção manual.

**Como ampliar**:
- [ ] Scoring automático de viabilidade (WSJF/RICE) baseado nos campos preenchidos
- [ ] Dashboard de funil de demandas com conversão por estágio
- [ ] Comparativo automático: custo estimado × benefício projetado × ROI
- [ ] Templates de requisitos por tipo de demanda (automação, relatório, integração)
- [ ] Benchmark: tempo médio de aprovação, taxa de rejeição por área

### 2.2 Pilar 2: PMO Híbrido (Waterfall + Agile)

**O que é**: Visão unificada que combina Gantt com baseline (waterfall), Kanban com drag-and-drop (agile) e sprints — tudo no mesmo projeto, sem configuração.

**Por que é único**: A maioria dos concorrentes é predominantemente agile (Jira, Linear, ClickUp) ou predominantemente waterfall (MS Project, Smartsheet). Raízes e Riquezas oferece ambos nativamente, integrados com portfólio e apontamento de horas.

**Como ampliar**:
- [ ] Dependências no Gantt com caminho crítico
- [ ] Burndown chart por sprint integrado ao Gantt
- [ ] Replanejamento visual (drag barras no Gantt)
- [ ] Configuração de metodologia por projeto (waterfall puro, agile puro, híbrido)
- [ ] Comparativo planejado × realizado com análise de desvio

### 2.3 Pilar 3: Governança Executiva de Portfólio

**O que é**: Visão consolidada do portfólio com priorização registrada (diretor aprovador + data), status de saúde (RAG), e importação de dados de sistemas externos.

**Por que é único**: A priorização com registro de governança (quem aprovou, quando) é rara em ferramentas de PM. A importação automática de dados externos permite consolidar projetos de múltiplas fontes sem migração forçada.

**Como ampliar**:
- [ ] Dashboard executivo: radar de saúde, heatmap de riscos, funil de demandas
- [ ] Relatório de portfólio em PDF com branding do tenant
- [ ] Score de maturidade por projeto (indicadores automáticos)
- [ ] Alerta automático de projetos em risco (threshold configurável)
- [ ] Painel do diretor: visão read-only com KPIs do portfólio

### 2.4 Pilar 4: Custo de Infraestrutura Near-Zero

**O que é**: Cloudflare Workers + D1 = edge computing com cold start em milissegundos, banco SQLite por tenant sem servidor, custo marginal por tenant próximo de zero.

**Por que é único**: Concorrentes SaaS operam em infraestrutura cloud tradicional (AWS/GCP) com custos fixos elevados. O modelo Cloudflare permite oferecer planos mais acessíveis e escalar sem saltos de custo.

**Como ampliar**:
- [ ] Plano gratuito sustentável (free tier com limites generosos)
- [ ] Preço agressivo: R$ 29/user/mês vs USD 10+/user/mês dos concorrentes
- [ ] Backup automático por tenant sem custo adicional
- [ ] Custom domains sem custo adicional

### 2.5 Pilar 5: IA Aplicada a PMO (futuro)

**O que é**: Inteligência artificial aplicada especificamente à gestão de portfólio de projetos — não genérica, mas treinada nos padrões do PMO.

**Roadmap de IA**:

| Feature | Dados de entrada | Saída | Horizonte |
|---|---|---|---|
| Scoring de viabilidade | Campos do formulário de requisitos | Score 0-100 + justificativa | H2 |
| Previsão de atraso | Histórico de progresso × baseline | % probabilidade + causa provável | H3 |
| Sugestão de priorização | Portfólio + demandas + capacidade | Ranking WSJF sugerido | H3 |
| Resumo executivo | Dados do portfólio | Texto para relatório semanal | H2 |
| Análise de riscos | Status, desvios, dependências | Mapa de riscos automático | H3 |
| Assistente PMO | Dados da plataforma | Respostas sobre portfólio | H4 |

---

## 3. Estratégia Competitiva

### 3.1 Contra Jira

| Aspecto | Jira | Raízes e Riquezas | Vantagem R&R |
|---|---|---|---|
| Viabilidade | Não nativo | Nativo (4 blocos) | Elimina plugins |
| Portfólio | Premium ($15/user) | Incluído | Custo menor |
| Público | Desenvolvedores | PMO/gestão | Foco diferente |
| Complexidade | Alta (schemes, workflows) | Baixa (pronto para uso) | Time-to-value |

### 3.2 Contra Monday.com

| Aspecto | Monday.com | Raízes e Riquezas | Vantagem R&R |
|---|---|---|---|
| Customização | Colunas flexíveis | Formulários estruturados | Governança > flexibilidade |
| Intake | Forms genéricos | Viabilidade estruturada | Processo de PM |
| Preço (BRL) | ~R$ 60/user/mês | ~R$ 29/user/mês | 50% mais barato |
| Público | Generalista | PMO verticalizado | Especialização |

### 3.3 Contra Smartsheet

| Aspecto | Smartsheet | Raízes e Riquezas | Vantagem R&R |
|---|---|---|---|
| Paradigma | Planilha | Aplicação PM | UX orientada a PM |
| Aprovações | Automações custom | Fluxo nativo | Out-of-the-box |
| Multi-tenant | Não nativo | Nativo (DB isolado) | SaaS nativo |
| Custo infra | Alto (por sheet) | Near-zero (Workers+D1) | Escalabilidade |

---

## 4. Go-to-Market

### 4.1 Canais

| Canal | Tática | Prioridade |
|---|---|---|
| **Content marketing** | Blog sobre PMO, viabilidade, governança | Alta |
| **LinkedIn** | Casos de uso em agro/indústria | Alta |
| **Parcerias** | Consultorias de PM, Agro-tech | Média |
| **Eventos** | Congressos de TI do agronegócio | Média |
| **PLG (Product-Led Growth)** | Free trial 14 dias, self-service | Alta |

### 4.2 Mensagem-Chave

> "Da demanda ao resultado — a primeira plataforma de PMO que conecta viabilidade, aprovação, execução e ROI em um fluxo integrado."

### 4.3 Métricas de Sucesso (12 meses)

| Métrica | Meta |
|---|---|
| Tenants ativos | 50 |
| Usuários ativos mensais | 500 |
| MRR (receita recorrente mensal) | R$ 15.000 |
| Churn mensal | < 5% |
| NPS | > 40 |
| Tempo médio de onboarding | < 30 min |

---

*Estratégia de diferenciação baseada na análise de benchmarking e nos diferenciais identificados na plataforma em 2026-11-08.*
