# 06 — Especificações de Melhorias

**Raízes e Riquezas — Gestão Integrada de Projetos**
Data: 2026-11-08

---

## Escopo

Especificações funcionais detalhadas para as melhorias prioritárias identificadas no gap analysis (documento 03). Cada especificação inclui: objetivo, escopo, modelo de dados, endpoints, UI, critérios de aceite e estimativa.

---

## M01 — Self-Service Onboarding

**Gap**: G01 | **Severidade**: P0 | **Esforço**: 3 semanas

### Objetivo
Permitir que novos clientes criem uma conta, escolham um plano e acessem a plataforma sem intervenção manual.

### Fluxo
```
Landing page → [Criar conta gratuita]
→ Form: nome, e-mail, senha, nome da organização
→ Criação do tenant (status: trial, trialEndsAt: +14 dias)
→ Criação do usuário como project_coordinator
→ Seed de roles e permissões
→ Redirect para /t/{slug}/legacy
→ Wizard de onboarding (3 passos):
  1. Completar perfil da organização
  2. Convidar membros da equipe
  3. Criar primeiro projeto ou importar dados
```

### Modelo de Dados
- Nenhuma alteração no schema — usar tabelas existentes (`tenants`, `users`, `tenantUsers`)
- Novo campo opcional: `tenants.onboardingCompletedAt` (integer, timestamp)

### Endpoints
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/signup` | Criar conta: tenant + user + session |
| PATCH | `/api/onboarding` | Marcar etapas do wizard como concluídas |

### Critérios de Aceite
- [ ] Usuário cria conta sem token de bootstrap
- [ ] Tenant é criado com status `trial` e expiração de 14 dias
- [ ] Wizard aparece no primeiro acesso e pode ser pulado
- [ ] E-mail de boas-vindas é enviado (quando notificações implementadas)
- [ ] Slug é derivado do nome da organização (slugify, unique)
- [ ] Validação: e-mail não pode estar em uso em outro tenant

---

## M02 — Exportação de Dados (CSV/Excel/PDF)

**Gap**: G03 | **Severidade**: P0 | **Esforço**: 2 semanas

### Objetivo
Permitir exportação dos dados da plataforma em formatos padrão para análise externa e compliance LGPD.

### Escopo de Exportação

| Entidade | CSV | Excel | PDF |
|---|---|---|---|
| Projetos (portfólio) | ✓ | ✓ | ✓ |
| Tarefas de um projeto | ✓ | ✓ | — |
| Demandas | ✓ | ✓ | ✓ (ficha) |
| Apontamento de horas | ✓ | ✓ | — |
| Usuários | ✓ | — | — |
| Auditoria | ✓ | — | — |

### Endpoints
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/export/{entity}?format={csv\|xlsx\|pdf}` | Exportação com filtros |

### Implementação
- CSV: gerado server-side com streaming (sem biblioteca)
- Excel: usar `xlsx` ou `exceljs` como dependência
- PDF: usar `@react-pdf/renderer` ou HTML-to-PDF via Workers
- Permissão: requer ação `export` no módulo correspondente
- Headers: `Content-Disposition: attachment; filename=...`

### Critérios de Aceite
- [ ] Botão "Exportar" visível nas telas de portfólio, demandas e horas
- [ ] Respeita filtros ativos na UI
- [ ] Nomes de colunas em português
- [ ] Datas formatadas como dd/mm/yyyy
- [ ] Valores monetários formatados como R$ #.###,##

---

## M03 — 2FA / MFA (TOTP)

**Gap**: G05 | **Severidade**: P0 | **Esforço**: 2 semanas

### Objetivo
Adicionar segundo fator de autenticação via TOTP (Google Authenticator, Authy).

### Fluxo de Ativação
```
Configurações do perfil → [Ativar 2FA]
→ Gerar secret TOTP (base32)
→ Exibir QR code (otpauth:// URI)
→ Usuário escaneia e insere código de verificação
→ Salvar secret criptografado no perfil
→ Gerar 8 recovery codes (hash SHA-256)
```

### Fluxo de Login com 2FA
```
E-mail + Senha → Validação OK
→ Se 2FA ativo: redirect para /login/2fa
→ Input de 6 dígitos TOTP
→ Validação com janela de ±1 período (30s)
→ Se recovery code: consumir e autenticar
→ Criar sessão
```

### Modelo de Dados
- `users.totpSecret` (text, nullable, encrypted)
- `users.totpEnabledAt` (integer, nullable)
- `users.recoveryCodes` (text, nullable, JSON array de hashes)

### Endpoints
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/2fa/setup` | Gerar secret e QR code |
| POST | `/api/auth/2fa/verify` | Verificar código e ativar |
| POST | `/api/auth/2fa/disable` | Desativar (requer senha) |
| POST | `/api/auth/2fa/challenge` | Verificar código no login |

### Critérios de Aceite
- [ ] QR code renderizado como SVG inline (sem dependência externa)
- [ ] Recovery codes exibidos uma única vez e copiáveis
- [ ] Janela TOTP de ±30 segundos
- [ ] Rate limit de 5 tentativas por desafio 2FA
- [ ] Admin pode resetar 2FA de um usuário

---

## M04 — Notificações (E-mail + In-App)

**Gap**: G06 | **Severidade**: P0 | **Esforço**: 3 semanas

### Objetivo
Sistema de notificações para manter usuários informados sobre eventos relevantes.

### Tipos de Notificação

| Evento | E-mail | In-App | Destinatário |
|---|---|---|---|
| Nova demanda atribuída | ✓ | ✓ | Aprovador |
| Aprovação pendente | ✓ | ✓ | Gestor de área |
| Demanda aprovada/rejeitada | ✓ | ✓ | Solicitante |
| Tarefa atribuída | — | ✓ | Responsável |
| Prazo próximo (3 dias) | ✓ | ✓ | Responsável |
| Prazo vencido | ✓ | ✓ | Responsável + coordenador |
| Novo usuário convidado | ✓ | — | Usuário convidado |
| Trial expirando (3 dias) | ✓ | ✓ | Coordenador |

### Modelo de Dados
```
notifications (tenant DB):
  id integer PK
  userId text FK → users.id
  type text (demand_assigned, approval_pending, ...)
  title text
  body text
  entityType text (demand, project, task)
  entityId text
  readAt integer nullable
  createdAt integer
```

### Endpoints
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/notifications` | Listar notificações do usuário |
| PATCH | `/api/notifications` | Marcar como lida |
| GET | `/api/notifications/count` | Contador de não-lidas (polling) |

### E-mail
- Usar Cloudflare Email Workers ou Resend API
- Templates em HTML com branding Raízes e Riquezas
- Preferências de e-mail configuráveis pelo usuário

---

## M05 — Comentários e @Menções

**Gap**: G08 | **Severidade**: P1 | **Esforço**: 3 semanas

### Objetivo
Permitir discussão contextual em projetos, tarefas e demandas.

### Modelo de Dados
```
comments (tenant DB):
  id integer PK
  entityType text (project, task, demand, sprint)
  entityId integer
  parentId integer nullable (para threads)
  authorUserId text FK → users.id
  body text
  mentionedUserIds text (JSON array)
  createdAt integer
  updatedAt integer
  deletedAt integer nullable
```

### Funcionalidades
- Threads aninhadas (1 nível de resposta)
- @menção com autocomplete de usuários do tenant
- Notificação para usuários mencionados
- Markdown básico (negrito, itálico, listas, links)
- Permissão: `{module}:read` para ler, `{module}:update` para comentar

---

## M06 — Dependências de Tarefas

**Gap**: G09 | **Severidade**: P1 | **Esforço**: 3 semanas

### Objetivo
Implementar dependências finish-to-start entre tarefas com impacto visual no Gantt.

### Modelo de Dados
```
taskDependencies (tenant DB):
  id integer PK
  predecessorId integer FK → projectItems.id
  successorId integer FK → projectItems.id
  type text DEFAULT 'FS' (FS, FF, SS, SF)
  lagDays integer DEFAULT 0
  createdAt integer
```

### Funcionalidades
- Linhas de conexão no Gantt (SVG paths)
- Cálculo de caminho crítico (CPM)
- Alerta quando predecessor atrasa
- UI: drag-and-drop de seta entre barras do Gantt
- API: CRUD via `/api/task-dependencies`

---

## M07 — Dashboards Avançados

**Gap**: G10 | **Severidade**: P1 | **Esforço**: 4 semanas

### Objetivo
Dashboards interativos com gráficos visuais para acompanhamento executivo.

### Widgets Planejados

| Widget | Tipo | Dados |
|---|---|---|
| Saúde do portfólio | Donut chart | % projetos por status |
| Burndown de sprint | Line chart | Tarefas restantes × tempo |
| Velocidade da equipe | Bar chart | Story points por sprint |
| Radar de riscos | Radar chart | Dimensões: prazo, custo, escopo, qualidade |
| Heatmap de alocação | Heatmap | Horas por pessoa × semana |
| Funil de demandas | Funnel chart | Demandas por estágio |
| ROI projetado | KPI cards | ROI por projeto e portfólio |
| Timeline de entregas | Timeline | Próximos marcos e milestones |

### Implementação
- Usar `recharts` (já no package.json) para gráficos React
- Componente `<DashboardWidget>` com configuração por tipo
- Dados: endpoints existentes + novos endpoints de agregação
- Filtros: período, área, responsável, tipo de projeto

---

## M08 — Webhooks e Eventos

**Gap**: G11 | **Severidade**: P1 | **Esforço**: 2 semanas

### Objetivo
Permitir integração com sistemas externos via webhooks HTTP.

### Modelo de Dados
```
webhooks (tenant DB):
  id integer PK
  url text
  secret text (HMAC signing key)
  events text (JSON array: ["project.created", "demand.approved", ...])
  active integer DEFAULT true
  lastDeliveryAt integer nullable
  lastStatus integer nullable
  createdAt integer
```

### Eventos Disponíveis
- `project.created`, `project.updated`, `project.deleted`
- `demand.created`, `demand.updated`, `demand.approved`, `demand.rejected`
- `task.created`, `task.updated`, `task.completed`
- `sprint.created`, `sprint.completed`
- `time_entry.closed`

### Implementação
- Payload JSON assinado com HMAC-SHA256 (header `X-Webhook-Signature`)
- Retry: 3 tentativas com backoff exponencial (1s, 10s, 60s)
- Log de entregas com status e response body
- UI de administração para gerenciar webhooks do tenant

---

*Especificações funcionais para as 8 melhorias de maior prioridade. Cada especificação deve ser validada com stakeholders antes da implementação.*
