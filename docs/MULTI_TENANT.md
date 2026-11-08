# Arquitetura Multi-Tenant — Raízes e Riquezas

## Visão Geral

O sistema opera em dois modos:

- **Legado (single-tenant):** Banco único (`env.DB`), sem resolução de tenant. Rota `/legacy`.
- **Multi-tenant (SaaS):** Master DB (`env.MASTER_DB`) + banco isolado por tenant. Rota `/t/{slug}/legacy`.

A presença de `env.MASTER_DB` ativa o modo multi-tenant. Sem ele, o sistema funciona em modo legado automaticamente.

## Resolução de Tenant

A função `extractTenantSlug(request)` resolve o tenant por ordem de prioridade:

1. Header `x-tenant-slug` (usado pelo fetch wrapper do frontend)
2. Path URL: `/Projetos/t/{slug}/...`
3. Subdomínio: `{slug}.example.com` (ignora `www` e `localhost`)

Se nenhum slug for encontrado, o sistema opera em modo legado.

## Banco de Dados

### Master DB

Tabelas em `db/master-schema.ts`:

| Tabela | Finalidade |
|---|---|
| `tenants` | Cadastro de tenants (slug, nome, status, plano) |
| `plans` | Planos de assinatura |
| `plan_modules` | Módulos incluídos em cada plano |
| `master_users` | Usuários administrativos da plataforma |
| `master_sessions` | Sessões dos administradores |
| `tenant_users` | Vínculo usuário ↔ tenant (por email) |
| `master_audit_events` | Log de auditoria da plataforma |

### Tenant DB

Cada tenant usa um binding D1 nomeado `TENANT_{UUID}` (com hífens substituídos por underscores). Se o binding específico não existir, o sistema usa `env.DB` como fallback (modo local/desenvolvimento).

Tabelas RBAC criadas em `lib/server/tenant-init.ts`:

- `tenant_roles` — Papéis com campo `built_in`
- `role_permissions` — Permissões por módulo/ação (`module_key` + `action`)

### Seed de Papéis

Ao criar um tenant (`POST /api/master/tenants`), o sistema automaticamente:

1. Cria as tabelas RBAC no banco do tenant
2. Insere os 7 papéis padrão definidos em `lib/server/modules.ts`

## Autenticação

### Dual Auth

- **Microsoft Entra ID:** OIDC/PKCE com cookies AES-GCM
- **Local:** PBKDF2 SHA-256 (100k iterações) com lockout (5 tentativas → 15min bloqueio)

### JWT Bearer Token

Endpoint: `POST /api/auth/token`

Parâmetros: `email`, `password`, `tenantSlug` (opcional)

Claims do token:
- `sub` — ID do usuário
- `email`, `name`, `role` — dados do perfil
- `tid` — ID do tenant (se tenantSlug fornecido)
- `ts` — slug do tenant
- `iat`, `exp` — timestamps (validade: 8h)

Assinatura: HMAC-SHA256 via Web Crypto API (`JWT_SECRET`, mínimo 32 caracteres).

## RBAC

### Módulos

`projects`, `demands`, `time_tracking`, `sprints`, `phases`, `users`, `audit`, `approvals`, `dashboard`, `project_types`

### Ações

`read`, `create`, `update`, `delete`, `export`, `approve`, `prioritize`

### Papéis Padrão

| Papel | Descrição |
|---|---|
| `admin` | Acesso total |
| `director` | Gerenciamento executivo |
| `coordinator` | Coordenação de projetos |
| `analyst` | Análise e relatórios |
| `developer` | Operações de desenvolvimento |
| `viewer` | Apenas leitura |
| `external` | Acesso externo limitado |

## Rate Limiting

Implementado em `lib/server/rate-limit.ts` com sliding window in-memory.

- **Limite padrão:** 120 requisições por minuto por IP por tenant
- **Chave:** `tenant:{slug}:{ip}` ou `global:{ip}`
- **Headers de resposta:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- **Integração:** Verificado em `getApiContext()` antes da autenticação

O rate limiter é per-isolate (reseta em cold starts do Cloudflare Workers), adequado para proteção contra abuso. Para limites persistentes, migrar para Cloudflare Rate Limiting API.

## Rotas Principais

| Rota | Tipo | Descrição |
|---|---|---|
| `/` | Page | Redireciona para `/workspaces` ou `/legacy` |
| `/workspaces` | Page | Seletor de workspace |
| `/legacy` | Page | Workspace legado (single-tenant) |
| `/t/{slug}/legacy` | Page | Workspace do tenant |
| `/api/auth/token` | API | Emissão de JWT |
| `/api/master/tenants` | API | CRUD de tenants |

## Frontend Multi-Tenant

O frontend legacy (`public/legacy/app.js`) adapta-se ao contexto:

1. **Fetch wrapper:** Injeta `x-tenant-slug` em todas as chamadas `/api/`
2. **Topbar:** Exibe nome do tenant em vez do título genérico
3. **Dados:** `window.tenantSlug` e `window.tenantInfo` injetados via SSR

## Fluxo de Transição

```
Requisição → extractTenantSlug()
  ├── slug encontrado → resolveTenant() → getTenantDb() → contexto multi-tenant
  └── sem slug → getDb() → modo legado (single-tenant)
```

O `getApiContext(request)` implementa esse fallback, garantindo retrocompatibilidade total.

## Testes

Executar com `npm test`. Os testes verificam:

- **Rate limiting:** Limites por janela, reset, isolamento entre tenants
- **Isolamento de tenant:** Resolução de slug por header/path/subdomínio, separação entre tenants, ausência de vazamento entre requisições
