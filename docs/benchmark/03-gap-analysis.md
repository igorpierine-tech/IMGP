# 03 — Gap Analysis e Priorização

**Raízes e Riquezas — Gestão Integrada de Projetos**
Data: 2026-11-08

---

## 1. Metodologia de Classificação

### Severidade (P0–P3)

| Nível | Descrição | Critério |
|---|---|---|
| **P0** | Bloqueante para SaaS | Sem isso, a plataforma não pode ser comercializada |
| **P1** | Crítico para competitividade | Funcionalidade esperada por 80%+ dos clientes-alvo |
| **P2** | Importante para diferenciação | Agrega valor e posiciona acima dos concorrentes |
| **P3** | Desejável / futuro | Nice-to-have, pode esperar versões futuras |

### RICE Score

`RICE = (Reach × Impact × Confidence) / Effort`

- **Reach**: % dos usuários impactados (0.1–1.0)
- **Impact**: Multiplicador de valor (0.25=mínimo, 0.5=baixo, 1=médio, 2=alto, 3=massivo)
- **Confidence**: Certeza da estimativa (0.5–1.0)
- **Effort**: Pessoa-semanas estimadas

---

## 2. Inventário de Gaps

### P0 — Bloqueantes para SaaS

| # | Gap | Categoria | Reach | Impact | Conf. | Effort (sem) | RICE | Descrição |
|---|---|---|---|---|---|---|---|---|
| G01 | **Self-service onboarding** | Multi-tenant | 1.0 | 3 | 0.9 | 3 | 0.90 | Registro de tenant, escolha de plano, setup automático sem intervenção manual |
| G02 | **Billing e subscription** | Comercial | 1.0 | 3 | 0.8 | 6 | 0.40 | Integração com gateway de pagamento (Stripe), gestão de assinaturas, faturas |
| G03 | **Exportação de dados** | Compliance | 0.9 | 2 | 0.9 | 2 | 0.81 | CSV, Excel, PDF para projetos, demandas, horas e relatórios |
| G04 | **LGPD / Termos de uso** | Legal | 1.0 | 2 | 0.9 | 2 | 0.90 | Consentimento, política de privacidade, direito ao esquecimento, DPA |
| G05 | **2FA / MFA** | Segurança | 0.8 | 2 | 0.9 | 2 | 0.72 | TOTP ou WebAuthn como segundo fator de autenticação |
| G06 | **Notificações** | UX | 1.0 | 2 | 0.9 | 3 | 0.60 | E-mail e in-app para aprovações, deadlines, atribuições, mudanças de status |
| G07 | **Testes automatizados** | Qualidade | 0.5 | 3 | 1.0 | 4 | 0.38 | Suite de testes unitários e de integração para APIs e lógica de negócio |

### P1 — Críticos para Competitividade

| # | Gap | Categoria | Reach | Impact | Conf. | Effort (sem) | RICE | Descrição |
|---|---|---|---|---|---|---|---|---|
| G08 | **Comentários e @menções** | Colaboração | 0.9 | 2 | 0.8 | 3 | 0.48 | Threads em projetos, tarefas e demandas com notificações |
| G09 | **Dependências de tarefas** | Planejamento | 0.7 | 2 | 0.9 | 3 | 0.42 | Finish-to-start, impact no Gantt, caminho crítico |
| G10 | **Dashboards avançados** | Relatórios | 0.8 | 2 | 0.8 | 4 | 0.32 | Gráficos (burndown, velocity, radar), filtros dinâmicos, drill-down |
| G11 | **Webhooks e eventos** | Integrações | 0.6 | 2 | 0.8 | 2 | 0.48 | Disparo de eventos para sistemas externos (Slack, Teams, n8n) |
| G12 | **CSRF protection** | Segurança | 1.0 | 1 | 0.9 | 1 | 0.90 | Token anti-CSRF em todos os forms server-side |
| G13 | **Rate limiting persistente** | Segurança | 0.8 | 1 | 0.9 | 1 | 0.72 | Usar Durable Objects ou D1 em vez de memória do Worker |
| G14 | **Migração de legacy UI** | Arquitetura | 0.5 | 2 | 0.7 | 12 | 0.058 | Converter vanilla JS para componentes React com testes |
| G15 | **Gestão de recursos / capacidade** | PMO | 0.6 | 2 | 0.7 | 4 | 0.21 | Alocação %, disponibilidade, heatmap de sobrecarga |

### P2 — Importantes para Diferenciação

| # | Gap | Categoria | Reach | Impact | Conf. | Effort (sem) | RICE | Descrição |
|---|---|---|---|---|---|---|---|---|
| G16 | **IA para análise de riscos** | IA | 0.5 | 2 | 0.6 | 6 | 0.10 | Previsão de atrasos, sugestão de replanejamento |
| G17 | **IA para priorização** | IA | 0.4 | 2 | 0.6 | 4 | 0.12 | Scoring automático WSJF/RICE baseado em dados de viabilidade |
| G18 | **Automações visuais** | Produtividade | 0.6 | 1 | 0.7 | 6 | 0.07 | Rules engine: "quando status mudar para X, notificar Y" |
| G19 | **Documentos anexos** | Colaboração | 0.7 | 1 | 0.8 | 3 | 0.19 | Upload de arquivos em projetos, demandas e tarefas |
| G20 | **App mobile / PWA** | Acessibilidade | 0.5 | 1 | 0.7 | 6 | 0.06 | Interface responsiva otimizada ou PWA instalável |
| G21 | **Relatório de ROI consolidado** | PMO | 0.4 | 2 | 0.7 | 3 | 0.19 | Dashboard de ROI por projeto/portfólio com dados de viabilidade |
| G22 | **Customização de campos** | Flexibilidade | 0.5 | 1 | 0.7 | 4 | 0.09 | Campos customizados por tenant em projetos e demandas |

### P3 — Desejáveis / Futuro

| # | Gap | Categoria | Reach | Impact | Conf. | Effort (sem) | RICE | Descrição |
|---|---|---|---|---|---|---|---|---|
| G23 | **Marketplace de integrações** | Ecossistema | 0.3 | 1 | 0.5 | 12 | 0.01 | Plataforma de conectores extensível |
| G24 | **White-label** | Comercial | 0.2 | 1 | 0.5 | 8 | 0.01 | Customização de marca por tenant |
| G25 | **IA conversacional** | IA | 0.3 | 1 | 0.5 | 8 | 0.02 | Assistente que responde perguntas sobre o portfólio |
| G26 | **Modo offline / PWA** | Resiliência | 0.2 | 0.5 | 0.5 | 6 | 0.01 | Funcionalidade básica offline com sync |
| G27 | **Gamificação** | Engajamento | 0.3 | 0.5 | 0.4 | 4 | 0.02 | Badges, streaks, leaderboard de entregas |
| G28 | **Multi-idioma** | Expansão | 0.3 | 1 | 0.6 | 4 | 0.05 | Suporte a EN, ES além de PT-BR |

---

## 3. Priorização Ordenada (RICE)

| Rank | ID | Gap | Severidade | RICE |
|---|---|---|---|---|
| 1 | G04 | LGPD / Termos de uso | P0 | 0.90 |
| 2 | G01 | Self-service onboarding | P0 | 0.90 |
| 3 | G12 | CSRF protection | P1 | 0.90 |
| 4 | G03 | Exportação de dados | P0 | 0.81 |
| 5 | G05 | 2FA / MFA | P0 | 0.72 |
| 6 | G13 | Rate limiting persistente | P1 | 0.72 |
| 7 | G06 | Notificações | P0 | 0.60 |
| 8 | G08 | Comentários e @menções | P1 | 0.48 |
| 9 | G11 | Webhooks e eventos | P1 | 0.48 |
| 10 | G09 | Dependências de tarefas | P1 | 0.42 |
| 11 | G02 | Billing e subscription | P0 | 0.40 |
| 12 | G07 | Testes automatizados | P0 | 0.38 |
| 13 | G10 | Dashboards avançados | P1 | 0.32 |
| 14 | G15 | Gestão de recursos | P1 | 0.21 |
| 15 | G19 | Documentos anexos | P2 | 0.19 |
| 16 | G21 | Relatório de ROI | P2 | 0.19 |
| 17 | G17 | IA para priorização | P2 | 0.12 |
| 18 | G16 | IA para análise de riscos | P2 | 0.10 |
| 19 | G22 | Customização de campos | P2 | 0.09 |
| 20 | G18 | Automações visuais | P2 | 0.07 |

---

## 4. Distribuição por Horizonte

| Horizonte | Gaps | Esforço total estimado |
|---|---|---|
| **H1 (0-3 meses)** — Fundação SaaS | G01, G02, G03, G04, G05, G06, G07, G12, G13 | ~24 pessoa-semanas |
| **H2 (3-6 meses)** — Competitividade | G08, G09, G10, G11, G15 | ~16 pessoa-semanas |
| **H3 (6-12 meses)** — Diferenciação | G14, G16, G17, G18, G19, G20, G21, G22 | ~43 pessoa-semanas |
| **H4 (12+ meses)** — Escala | G23, G24, G25, G26, G27, G28 | ~42 pessoa-semanas |

---

*Gap analysis baseada na inspeção do repositório e benchmarking de concorrentes realizado em 2026-11-08.*
