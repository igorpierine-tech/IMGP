# 01 — Inventário Funcional e Arquitetura da Plataforma

**Raízes e Riquezas — Gestão Integrada de Projetos**
Data da auditoria: 2026-11-08

---

## 1. Visão Geral da Arquitetura

### Stack Tecnológico

| Camada | Tecnologia | Versão |
|---|---|---|
| Framework frontend | Next.js (App Router) | 16.4.2 |
| Build/Dev | Vite + vinext (Vite-Next bridge) | 8.0.13 / 1.0.0-beta.5 |
| Runtime | Cloudflare Workers (via Wrangler) | 4.92.0 |
| Banco de dados | Cloudflare D1 (SQLite) | — |
| ORM | Drizzle ORM | 0.45.2 |
| UI Components | Radix UI + shadcn/react + Tailwind CSS | 1.6.7 / 0.3.0 / 4.2.1 |
| Linguagem | TypeScript | 5.9.3 |
| React | React 19 | 19.2.6 |
| Testes | Vitest | 5.1.0 |
| Validação | Zod | 3.25.76 |

### Padrão Arquitetural

```
┌──────────────────────────────────────────────────────────┐
│                  Cloudflare Workers Runtime               │
│  ┌─────────────────┐  ┌─────────────────────────────┐    │
│  │  Next.js 16 SSR │  │   API Routes (/api/*)       │    │
│  │  (App Router)   │  │   REST JSON endpoints       │    │
│  └────────┬────────┘  └──────────────┬──────────────┘    │
│           │                          │                    │
│  ┌────────┴──────────────────────────┴──────────────┐    │
│  │            Server-Side Libraries                  │    │
│  │  authz · jwt · password-auth · entra-auth         │    │
│  │  tenant-context · rate-limit · audit · modules    │    │
│  └────────┬──────────────────────────┬──────────────┘    │
│           │                          │                    │
│  ┌────────▼────────┐      ┌─────────▼──────────┐        │
│  │   Master DB     │      │    Tenant DB       │        │
│  │   (env.MASTER_  │      │    (env.DB ou       │        │
│  │    DB)          │      │     TENANT_<ID>)    │        │
│  └─────────────────┘      └────────────────────┘        │
└──────────────────────────────────────────────────────────┘
         ▲                          ▲
         │                          │
    Drizzle ORM               Drizzle ORM
    master-schema.ts          schema.ts
```

### Topologia de Deploy

- **Produção**: Cloudflare Workers (edge)
- **Alternativa**: Railway (via `start:railway` script)
- **Dev local**: Vite dev server na porta 5173 com `@cloudflare/vite-plugin`
- **basePath**: `/Projetos` (hardcoded em `lib/app-path.ts`)
- **Supabase**: Backend alternativo configurável via `DATA_BACKEND` env var (código presente mas não é o padrão)

---

## 2. Modelo de Dados

### 2.1 Master Database (7 tabelas)

Governa a camada multi-tenant: tenants, planos, módulos, usuários master e sessões.

| Tabela | Colunas-chave | Propósito |
|---|---|---|
| `tenants` | id (UUID), slug (unique), name, status (active/suspended/trial/cancelled), planId FK, domain, dbFileName, maxUsers, trialEndsAt | Cadastro de organizações |
| `plans` | id (int), name (unique), maxUsers, priceMonthly, active | Planos de assinatura |
| `planModules` | planId FK, moduleKey, actionsJson (default `["read"]`) | Módulos habilitados por plano |
| `masterUsers` | id (UUID), email (unique), displayName, role (super_admin/support), password fields, lockout fields | Administradores da plataforma |
| `masterSessions` | id (hash SHA-256), userId FK, expiresAt | Sessões do painel master |
| `tenantUsers` | tenantId FK, email, externalUserId, active | Vínculo usuário-tenant |
| `masterAuditEvents` | actor fields, action, entity fields, before/after JSON | Log de auditoria master |

### 2.2 Tenant Database (13 tabelas)

Cada tenant possui um banco D1 isolado com o schema completo de gestão de projetos.

| Tabela | Colunas-chave | Propósito |
|---|---|---|
| `users` | id (UUID), email, displayName, role (7 roles), password hash/salt/iterations, lockout fields, mustChangePassword | Usuários do tenant |
| `userSessions` | id (hash), userId FK, tenantId, expiresAt | Sessões de autenticação |
| `projects` | id (int), source, externalId, code, name, projectTypeId FK, area, managerName/UserId, status, health, progress, dates, hours/cost, prioritization fields, rawJson, syncedAt | Projetos (nativos + importados) |
| `projectItems` | id (int), projectId FK, sprintId FK, phaseId FK, parentId, source, externalId, kind (milestone/task/subtask), name, status, health, assignee, dates, plannedHours, rawJson | Tarefas e marcos |
| `projectPhases` | projectRef, projectName, name, description, sequence, active | Fases dos projetos |
| `projectTypes` | name (unique), description, sequence, active | Tipos de projeto |
| `sprints` | projectId FK, phaseId FK, name, objective, status, dates | Sprints |
| `projectMembers` | projectId FK, userId FK, allocationPercent, roleName | Alocação de recursos |
| `timeEntries` | projectId FK, itemId FK, userId FK, activity, status (running/paused/closed), timestamps, pausedSeconds, totalMinutes, source | Apontamento de horas |
| `demands` | source, externalId, name, projectTypeId FK, area, requester fields, requirementsJson, stage, objective/solution/benefit/risk, cost/hours/impact, prioritization fields | Demandas de viabilidade |
| `approvals` | demandExternalId, sequence, approverRole, approverUserId FK, decision (pending/approved/rejected), justification | Fluxo de aprovações |
| `tenantRoles` | key (unique), name, description, builtIn, active | Papéis RBAC customizáveis |
| `rolePermissions` | roleId FK, moduleKey, action | Permissões granulares |
| `auditEvents` | occurredAt, actorUserId FK, actorEmail, action, entityType, entityId, before/after/metadataJson | Log de auditoria |

---

## 3. Sistema de Autenticação e Autorização

### 3.1 Autenticação Dual

| Método | Implementação | Detalhes |
|---|---|---|
| **Local (senha)** | PBKDF2-SHA256, 100.000 iterações, salt 16 bytes | Sessão via cookie `imgp_session`, token SHA-256 hash, 8h TTL. Bloqueio após 5 tentativas por 15 min. |
| **Microsoft Entra ID** | OIDC Authorization Code + PKCE (S256) | Cookie `bj_session` com AES-GCM encryption. Validação RS256 com JWKS endpoint. Tenant ID enforcement. |
| **JWT Bearer** | HMAC-SHA256 via `/api/auth/token` | Claims: sub, email, name, role, tid, ts. Expiração 8h. Requer JWT_SECRET ≥ 32 chars. |

### 3.2 RBAC — 7 Papéis com 70 Permissões

| Papel | Descrição | Permissões |
|---|---|---|
| `project_coordinator` | Acesso completo a todos os módulos | 36 permissões (todas) |
| `it_director` | Governança e gestão completa | 34 permissões (sem time_tracking:create/update/delete) |
| `project_analyst` | Gestão operacional de projetos | 23 permissões |
| `keyuser` | Colaborador chave, edição limitada | 12 permissões |
| `requester` | Criar e acompanhar demandas | 5 permissões |
| `area_manager` | Aprovação e priorização de demandas | 8 permissões |
| `viewer` | Somente leitura | 3 permissões |

**10 módulos**: projects, demands, time_tracking, sprints, phases, users, audit, approvals, dashboard, project_types

**7 ações**: read, create, update, delete, export, approve, prioritize

### 3.3 Cadeia de Autenticação (API)

```
Request → JWT Bearer? → Password Session? → Entra ID Session?
              ↓               ↓                    ↓
         verifyJwt()    validateSession()    getEntraUser()
              ↓               ↓                    ↓
         CurrentUser    CurrentUser           CurrentUser
```

---

## 4. Inventário de API (20 Endpoints)

### 4.1 Autenticação

| Método | Rota | Função |
|---|---|---|
| POST | `/api/auth/login` | Login com e-mail/senha (form-encoded) |
| GET/POST | `/api/auth/logout` | Encerrar sessão |
| POST | `/api/auth/bootstrap` | Primeiro acesso: criar coordenador |
| POST | `/api/auth/change-password` | Alterar senha autenticado |
| POST | `/api/auth/token` | Gerar JWT Bearer token |
| GET | `/auth/start` | Iniciar fluxo Entra ID OIDC |
| GET | `/auth/callback` | Callback do Entra ID |

### 4.2 CRUD de Negócio

| Método | Rota | Função |
|---|---|---|
| GET | `/api/projects` | Listar projetos |
| POST | `/api/projects` | Criar projeto |
| PATCH | `/api/projects` | Atualizar projeto |
| GET | `/api/demands` | Listar demandas |
| POST | `/api/demands` | Criar demanda (com requirementsJson) |
| PATCH | `/api/demands` | Atualizar demanda |
| GET | `/api/users` | Listar usuários |
| POST | `/api/users` | Criar usuário |
| PATCH | `/api/users` | Atualizar usuário |
| GET | `/api/audit` | Consultar log de auditoria |
| GET | `/api/phases` | Listar fases |
| POST | `/api/phases` | Criar fase |
| PATCH | `/api/phases` | Atualizar fase |
| GET | `/api/project-types` | Listar tipos |
| POST | `/api/project-types` | Criar tipo |
| PATCH | `/api/project-types` | Atualizar tipo |
| GET | `/api/time-entries` | Listar apontamentos |
| POST | `/api/time-entries` | Start/pause/close timer |
| POST | `/api/project-items` | Criar item de projeto |
| PATCH | `/api/project-items` | Atualizar item |
| POST | `/api/sprints` | Criar sprint |
| PATCH | `/api/sprints` | Atualizar sprint |

### 4.3 Fundação e Status

| Método | Rota | Função |
|---|---|---|
| GET | `/api/status` | Health check + estatísticas DB |

### 4.4 Master API (Multi-tenant)

| Método | Rota | Função |
|---|---|---|
| POST | `/api/master/bootstrap` | Bootstrap do super_admin |
| POST | `/api/master/login` | Login master |
| POST | `/api/master/logout` | Logout master |
| GET | `/api/master/plans` | Listar planos |
| POST | `/api/master/plans` | Criar plano + módulos |
| PATCH | `/api/master/plans` | Atualizar plano |
| GET | `/api/master/tenants` | Listar tenants |
| POST | `/api/master/tenants` | Criar tenant (inicializa DB) |
| PATCH | `/api/master/tenants` | Atualizar tenant |

---

## 5. Inventário Funcional (UI)

### 5.1 Páginas Next.js (App Router)

| Rota | Tipo | Descrição |
|---|---|---|
| `/` | SSR | Redirect → `/workspaces` (multi-tenant) ou `/legacy` (single) |
| `/login` | SSR | Login dual (senha + Entra ID) com setup mode |
| `/alterar-senha` | SSR | Formulário de alteração de senha |
| `/legacy` | SSR + Legacy JS | Workspace single-tenant com UI vanilla JS |
| `/workspaces` | SSR | Seletor de workspace multi-tenant |
| `/t/[slug]` | SSR | Redirect → `/t/[slug]/legacy` |
| `/t/[slug]/legacy` | SSR + Legacy JS | Workspace multi-tenant com UI vanilla JS |
| `/foundation` | SSR | Página de administração (componente React) |

### 5.2 Módulos Legacy (Vanilla JS)

A interface principal é construída com 9 arquivos JavaScript vanilla injetados via `<Script>`:

| Arquivo | Linhas (~) | Funcionalidades |
|---|---|---|
| `app.js` | ~750 | Core: navegação SPA, render(), Kanban DnD, Gantt, modal, CRUD de tarefas/usuários/tipos, portfólio, demandas com levantamento de requisitos, aprovações, comparativo planejado×realizado, administração |
| `portfolio.js` | ~600 | Importação de dados externos, portfólio avançado com filtros multi-select, resumo de projeto externo, persistência de items/sprints/fases |
| `project-workspace.js` | ~500 (est.) | Espaço do projeto individual, gestão de sprints, fases, membros |
| `dashboards.js` | ~400 (est.) | Indicadores, gráficos de portfólio, radar de saúde |
| `time-tracking.js` | ~200 | Cronômetro start/pause/close, listagem de apontamentos |
| `status-visuals.js` | ~150 | Badges visuais de status, semáforos de saúde |
| `roi.js` | ~100 (est.) | Cálculos de ROI de projetos |
| `foundation-client.js` | ~100 (est.) | Cliente da página de fundação/administração |
| `multi-select.js` | ~80 (est.) | Componente de multi-select dropdown |

### 5.3 Módulos Funcionais Implementados

| # | Módulo | Status | Observações |
|---|---|---|---|
| 1 | **Portfólio de projetos** | Funcional | Listagem, filtros, busca, cards estatísticos |
| 2 | **Gantt (global e individual)** | Funcional | Timeline visual, agrupamento por fases/sprints, baseline |
| 3 | **Kanban de execução** | Funcional | Drag & drop, mudança de status, filtro por projeto |
| 4 | **Demandas de viabilidade** | Funcional | CRUD completo, formulário de requisitos em 4 blocos (A-D), campos condicionais |
| 5 | **Fluxo de aprovações** | Funcional | Multi-etapa com aprovador, decisão, justificativa |
| 6 | **Apontamento de horas** | Funcional | Timer start/pause/close, listagem, relatórios |
| 7 | **Comparativo planejado × realizado** | Funcional | Desvio de horas, progresso vs baseline |
| 8 | **Dashboards** | Funcional | Indicadores consolidados do portfólio |
| 9 | **Administração de usuários** | Funcional | CRUD, papéis, senha temporária, ativação/desativação |
| 10 | **Administração de tipos de projeto** | Funcional | CRUD com ordenação e ativação |
| 11 | **Gestão de fases** | Funcional | CRUD vinculado a projetos |
| 12 | **Gestão de sprints** | Funcional | Criação, vínculo a fases, datas |
| 13 | **Importação de dados externos** | Funcional | Portfólio, tarefas, usuários de sistemas externos |
| 14 | **Multi-tenant (workspaces)** | Funcional | Seletor, resolução por slug/header/subdomain, DB isolado |
| 15 | **Auditoria** | Funcional | Log de eventos com before/after |
| 16 | **Login dual** | Funcional | Senha local + Microsoft Entra ID OIDC |
| 17 | **Bootstrap** | Funcional | Primeiro acesso com token de ativação |
| 18 | **Priorização de projetos** | Parcial | Registro manual (diretor, data), sem algoritmo automatizado |

---

## 6. Segurança — Avaliação Inicial

### Pontos Fortes

- PBKDF2 com 100.000 iterações (acima da recomendação mínima de 600.000 do OWASP 2023, mas dentro do limite de Cloudflare Workers)
- Cookies HttpOnly, Secure, SameSite=Lax
- Sessions com hash SHA-256 (token nunca armazenado em texto)
- Entra ID: PKCE S256, nonce validation, timing-safe comparison, token signature verification via JWKS
- Rate limiting: 120 req/min por IP/tenant
- Account lockout: 5 tentativas → 15 min
- XSS protection no `safeJson()` (escape de `<`, `>`, `&`)
- Audit trail com before/after em todas as operações CRUD
- `safeReturnPath()` previne open redirect

### Pontos de Atenção

| Item | Severidade | Descrição |
|---|---|---|
| Rate limiting in-memory | Média | Não persiste entre reinícios do Worker; resetado a cada deploy |
| Sem CSRF token | Média | Forms usam POST mas sem token anti-CSRF explícito (SameSite=Lax mitiga parcialmente) |
| Bootstrap token em env var | Baixa | `AUTH_BOOTSTRAP_TOKEN` deve ser rotacionado após primeiro uso |
| Fallback `env.DB` | Baixa | Se binding específico do tenant não existe, cai no DB padrão — pode misturar dados |
| Sem validação de Content-Type | Baixa | Alguns endpoints aceitam qualquer body sem checar header |

---

## 7. Dívida Técnica — Resumo

| Área | Descrição | Impacto |
|---|---|---|
| **Legacy UI monolítica** | ~2000+ linhas de JS vanilla em `app.js`, `portfolio.js` sem bundling, minificação ou testes | Alto — manutenção difícil, sem cobertura de testes |
| **Dados hardcoded no frontend** | `app.js` contém arrays `projects` e `tasks` de demonstração que são sobrescritos pelo portfolio.js | Médio — confuso para novos desenvolvedores |
| **Supabase code path** | `data-backend.ts` e `supabase.ts` presentes mas não utilizados | Baixo — código morto |
| **vinext beta** | `vinext@1.0.0-beta.5` como bridge Vite-Next.js | Médio — dependência em software beta |
| **Sem testes automatizados** | Vitest configurado mas sem arquivos de teste visíveis | Alto — sem cobertura de regressão |
| **CSS não modular** | 8 arquivos CSS globais para o legacy UI | Médio — conflitos potenciais |
| **Sem i18n** | Strings PT-BR hardcoded em todo o código | Médio — barreira para internacionalização |
| **Migrações Drizzle** | Nomes de arquivos de migração contêm referências históricas | Baixo — cosmético |

---

## 8. Dependências Críticas

| Dependência | Versão | Risco |
|---|---|---|
| `next` | 16.4.2 | Baixo — versão recente |
| `drizzle-orm` | 0.45.2 | Baixo — ativamente mantido |
| `vinext` | 1.0.0-beta.5 | **Alto** — beta, sem garantia de estabilidade |
| `wrangler` | 4.92.0 | Baixo — versão recente |
| `@cloudflare/vite-plugin` | 1.37.1 | Médio — acoplamento ao ecossistema Cloudflare |
| `react` | 19.2.6 | Baixo — versão estável |
| `zod` | 3.25.76 | Baixo — biblioteca madura |

---

*Documento gerado a partir de inspeção direta do repositório em 2026-11-08.*
