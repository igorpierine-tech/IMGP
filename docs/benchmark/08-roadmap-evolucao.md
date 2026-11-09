# 08 — Roadmap de Evolução

**Raízes e Riquezas — Gestão Integrada de Projetos**
Data: 2026-11-08

---

## 1. Visão Geral dos Horizontes

```
H1 (0-3 meses)     H2 (3-6 meses)      H3 (6-12 meses)     H4 (12+ meses)
Fundação SaaS       Competitividade      Diferenciação        Escala
━━━━━━━━━━━━━━━━━  ━━━━━━━━━━━━━━━━━━  ━━━━━━━━━━━━━━━━━━  ━━━━━━━━━━━━━━
Segurança           Colaboração          IA aplicada          Marketplace
Self-service        Integrações          UI moderna           Multi-idioma
Compliance          Relatórios           Mobile               White-label
Billing             Planejamento         Automações           Offline
Testes              Recursos             Customização         Gamificação
```

---

## 2. Horizonte 1 — Fundação SaaS (Semanas 1-12)

### Objetivo
Tornar a plataforma comercializável como SaaS multi-tenant.

### Sprint 1-2: Segurança e Compliance

| Item | Esforço | Dependência | Gap |
|---|---|---|---|
| CSRF tokens em todos os forms | 3 dias | — | G12 |
| Rate limiting persistente (Durable Objects ou D1) | 3 dias | — | G13 |
| Remover fallback `env.DB` | 1 dia | — | G05-saas |
| Validar pertencimento usuário-tenant em APIs | 2 dias | — | G05-saas |
| Vincular sessão ao tenant | 1 dia | — | G05-saas |
| 2FA/TOTP | 5 dias | — | G05 |
| LGPD: termos, consentimento, política | 3 dias | — | G04 |

### Sprint 3-4: Self-Service e Billing

| Item | Esforço | Dependência | Gap |
|---|---|---|---|
| Fluxo de signup (tenant + user + trial) | 5 dias | Sprint 1-2 | G01 |
| Wizard de onboarding (3 etapas) | 3 dias | Signup | G01 |
| Página de planos | 2 dias | — | G02 |
| Integração Stripe Checkout | 5 dias | Planos | G02 |
| Portal do cliente Stripe (upgrade/cancel) | 3 dias | Stripe | G02 |
| Webhooks Stripe (payment_succeeded, subscription_canceled) | 2 dias | Stripe | G02 |

### Sprint 5-6: Qualidade e Exportação

| Item | Esforço | Dependência | Gap |
|---|---|---|---|
| Suite de testes: API auth (login, 2FA, RBAC) | 5 dias | Sprint 1-2 | G07 |
| Suite de testes: CRUD (projects, demands, users) | 5 dias | — | G07 |
| Exportação CSV (projetos, demandas, horas) | 3 dias | — | G03 |
| Exportação Excel (portfólio, demandas) | 3 dias | CSV | G03 |
| Exportação PDF (ficha de demanda) | 3 dias | — | G03 |
| Notificações in-app (bell icon + dropdown) | 5 dias | — | G06 |
| Notificações e-mail (aprovações, prazos) | 5 dias | In-app | G06 |

### Entregáveis do H1
- [ ] Plataforma acessível via signup self-service com trial de 14 dias
- [ ] Billing integrado com Stripe
- [ ] 2FA habilitado
- [ ] Exportação de dados em 3 formatos
- [ ] Notificações para aprovações e prazos
- [ ] 80%+ de cobertura de testes nas APIs

---

## 3. Horizonte 2 — Competitividade (Semanas 13-24)

### Objetivo
Atingir paridade funcional nos gaps críticos para reter clientes.

### Sprint 7-8: Colaboração

| Item | Esforço | Dependência | Gap |
|---|---|---|---|
| Comentários em projetos, tarefas e demandas | 5 dias | Notificações | G08 |
| @menções com autocomplete | 3 dias | Comentários | G08 |
| Notificações de comentários e menções | 2 dias | Comentários + Notif. | G08 |
| Upload de arquivos (R2 storage) | 5 dias | — | G19 |

### Sprint 9-10: Planejamento Avançado

| Item | Esforço | Dependência | Gap |
|---|---|---|---|
| Dependências finish-to-start (modelo + API) | 3 dias | — | G09 |
| Linhas de dependência no Gantt (SVG) | 5 dias | Dependências API | G09 |
| Cálculo de caminho crítico | 3 dias | Dependências | G09 |
| Gestão de capacidade/recursos | 5 dias | — | G15 |
| Heatmap de alocação por pessoa | 3 dias | Capacidade | G15 |

### Sprint 11-12: Relatórios e Integrações

| Item | Esforço | Dependência | Gap |
|---|---|---|---|
| Dashboards avançados (recharts) | 8 dias | — | G10 |
| Burndown, velocity, radar de riscos | 5 dias | Dashboards | G10 |
| Webhooks de saída (HMAC signed) | 3 dias | — | G11 |
| UI de gerenciamento de webhooks | 2 dias | Webhooks | G11 |
| Integração Slack (notificações) | 3 dias | Webhooks | G11 |

### Entregáveis do H2
- [ ] Sistema de comentários com @menções
- [ ] Dependências de tarefas no Gantt
- [ ] Dashboards com 8+ tipos de gráfico
- [ ] Webhooks para integração externa
- [ ] Gestão de capacidade da equipe

---

## 4. Horizonte 3 — Diferenciação (Semanas 25-48)

### Objetivo
Construir os diferenciais competitivos que justificam a escolha sobre concorrentes.

### Bloco A: IA Aplicada (semanas 25-32)

| Item | Esforço | Gap |
|---|---|---|
| IA: scoring automático de viabilidade (WSJF) | 2 semanas | G17 |
| IA: resumo executivo semanal do portfólio | 1 semana | G16 |
| IA: previsão de atraso por análise de tendência | 2 semanas | G16 |
| IA: sugestão de priorização de demandas | 1 semana | G17 |

### Bloco B: UI Moderna (semanas 33-44)

| Item | Esforço | Gap |
|---|---|---|
| Migração incremental: menu + sidebar → React | 2 semanas | G14 |
| Migração: portfólio → React + recharts | 2 semanas | G14 |
| Migração: demandas → React + forms | 2 semanas | G14 |
| Migração: Gantt → React + SVG | 3 semanas | G14 |
| Migração: Kanban → React + DnD Kit | 2 semanas | G14 |
| Deep-linking (URLs por view/projeto/tarefa) | 1 semana | G14 |
| Busca global (⌘K) | 1 semana | G14 |
| Dark mode | 1 semana | — |

### Bloco C: Expansão (semanas 40-48)

| Item | Esforço | Gap |
|---|---|---|
| PWA (manifest, service worker, offline read) | 2 semanas | G20 |
| Automações visuais (rules engine) | 3 semanas | G18 |
| Campos customizados por tenant | 2 semanas | G22 |
| ROI consolidado por portfólio | 1 semana | G21 |

### Entregáveis do H3
- [ ] IA integrada para viabilidade, previsão e priorização
- [ ] Interface 100% React com design system moderno
- [ ] Deep-linking e busca global
- [ ] PWA instalável
- [ ] Automações configuráveis

---

## 5. Horizonte 4 — Escala (12+ meses)

### Objetivo
Expandir mercado e construir ecossistema.

| Item | Esforço | Gap |
|---|---|---|
| Marketplace de integrações | 3 meses | G23 |
| White-label por tenant | 2 meses | G24 |
| Multi-idioma (EN, ES) | 1 mês | G28 |
| IA conversacional (assistente PMO) | 2 meses | G25 |
| Modo offline com sync | 2 meses | G26 |
| Gamificação (badges, streaks) | 1 mês | G27 |
| API pública documentada (OpenAPI) | 1 mês | — |
| SSO SAML genérico (além de Entra ID) | 2 semanas | — |

---

## 6. Dependências Críticas

```
CSRF + Rate limit ──→ Signup ──→ Billing ──→ Launch
                       ↓
               Notificações ──→ Comentários ──→ @menções
                       ↓
                  Exportação ──→ PDF de demanda
                       
Dependências ──→ Gantt avançado ──→ Caminho crítico
                       ↓
               Dashboards ──→ IA de riscos
                       
                 Webhooks ──→ Slack/Teams ──→ Automações
                       
         Migração React ──→ Deep-linking ──→ PWA ──→ Mobile
```

---

## 7. Estimativas Consolidadas

| Horizonte | Duração | Esforço (pessoa-semanas) | Time mínimo |
|---|---|---|---|
| H1: Fundação | 12 semanas | 24 | 2 devs full-time |
| H2: Competitividade | 12 semanas | 20 | 2 devs full-time |
| H3: Diferenciação | 24 semanas | 30 | 2-3 devs full-time |
| H4: Escala | 24+ semanas | 42 | 3+ devs full-time |
| **Total** | **~18 meses** | **~116 pessoa-semanas** | |

---

## 8. Marcos de Validação

| Marco | Semana | Critério de sucesso |
|---|---|---|
| **Alpha SaaS** | 6 | 10 beta-testers usando signup + trial |
| **Beta pública** | 12 | 3 clientes pagantes (Starter) |
| **v1.0 Launch** | 18 | 10+ tenants ativos, MRR > R$ 5.000 |
| **v1.5 PMO** | 30 | Gantt com dependências, dashboards, IA scoring |
| **v2.0 Platform** | 48 | UI React, PWA, automações, 50+ tenants |
| **v3.0 Ecosystem** | 72+ | Marketplace, white-label, 200+ tenants |

---

*Roadmap baseado na análise de gaps, benchmarking e estratégia de diferenciação. Estimativas são indicativas e devem ser refinadas com planejamento detalhado de sprints.*
