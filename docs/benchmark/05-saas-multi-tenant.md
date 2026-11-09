# 05 — Auditoria SaaS e Multi-Tenant

**Raízes e Riquezas — Gestão Integrada de Projetos**
Data: 2026-11-08

---

## 1. Modelo Multi-Tenant Atual

### 1.1 Arquitetura de Isolamento

```
┌─────────────────────────────────────────────┐
│              Master Database (D1)            │
│  tenants │ plans │ planModules │ masterUsers │
│  masterSessions │ tenantUsers │ masterAudit │
└─────────────────┬───────────────────────────┘
                  │
        ┌─────────┼─────────┐
        ▼         ▼         ▼
   ┌─────────┐ ┌─────────┐ ┌─────────┐
   │Tenant A │ │Tenant B │ │Tenant C │
   │  (D1)   │ │  (D1)   │ │  (D1)   │
   │ 13 tabs │ │ 13 tabs │ │ 13 tabs │
   └─────────┘ └─────────┘ └─────────┘
```

**Tipo de isolamento**: Database-per-tenant (banco D1/SQLite separado por organização).

**Vantagens**:
- Isolamento real de dados (impossível cross-tenant leak por query)
- Backup e restore individual por tenant
- Performance previsível (sem noisy neighbor no DB)
- Migração/exclusão de tenant = deletar um banco

**Riscos atuais**:
- Fallback para `env.DB` quando binding do tenant não existe — pode causar data leak
- Sem quota de storage por tenant
- Sem métricas de uso por tenant

### 1.2 Resolução de Tenant

A resolução ocorre em `tenant-context.ts` com três estratégias em cascata:

| Prioridade | Método | Exemplo |
|---|---|---|
| 1 | Header `x-tenant-slug` | API calls do frontend |
| 2 | Path `/t/{slug}/...` | URLs multi-tenant |
| 3 | Subdomain | `acme.raizeseriquezas.com` |

### 1.3 Binding do Banco

```
Nome do binding: TENANT_{ID_COM_UNDERSCORES_MAIÚSCULAS}
Fallback: env.DB (binding padrão)
```

A criação do tenant (`POST /api/master/tenants`) executa:
1. Inserção na tabela `tenants` do Master DB
2. Inicialização do schema RBAC no tenant DB (`initializeTenantDb`)
3. Seed dos 7 papéis padrão com suas permissões

---

## 2. Avaliação de Prontidão SaaS

### 2.1 Checklist de Comercialização

| Requisito | Status | Detalhes |
|---|---|---|
| **Self-service signup** | Não implementado | Bootstrap requer token manual |
| **Planos e preços** | Schema existe, sem UI | Tabelas `plans` e `planModules` criadas |
| **Billing/pagamento** | Não implementado | Sem integração com gateway |
| **Trial automático** | Schema suporta | Campo `trialEndsAt` na tabela `tenants` |
| **Upgrade/downgrade** | Não implementado | `planId` FK existe mas sem fluxo |
| **Cancelamento** | Parcial | Status `cancelled` existe, sem fluxo self-service |
| **Onboarding guiado** | Não implementado | Sem wizard de setup inicial |
| **Usage metering** | Não implementado | Sem contagem de usuários, storage, API calls |
| **Limites por plano** | Parcial | `maxUsers` existe, sem enforcement runtime |
| **Custom domain** | Schema suporta | Campo `domain` na tabela `tenants` |

### 2.2 Score de Prontidão

| Dimensão | Score (0-10) | Justificativa |
|---|---|---|
| Isolamento de dados | **9** | Database-per-tenant é o padrão gold |
| Schema multi-tenant | **7** | Completo mas com gaps de enforcement |
| Autenticação | **8** | Dual auth (senha + OIDC), master separado |
| Autorização (RBAC) | **8** | 7 roles, 70 permissões, module:action granular |
| Self-service | **2** | Apenas bootstrap manual |
| Billing | **1** | Apenas schema, sem implementação |
| Onboarding | **2** | Nenhum fluxo guiado |
| Metering/Limits | **2** | maxUsers existe, sem enforcement |
| **Média** | **4.9** | |

---

## 3. RBAC — Análise de Profundidade

### 3.1 Modelo Atual

```
User → Role (1:1) → TenantRole → RolePermissions → {moduleKey:action}
```

**Pontos fortes**:
- Permissões granulares por módulo e ação (10 módulos × 7 ações)
- Papéis customizáveis por tenant (não apenas os 7 built-in)
- Seed automático de papéis na criação do tenant
- Fallback inteligente: permissões RBAC > role-based check

**Gaps**:
| Gap | Impacto | Recomendação |
|---|---|---|
| Role único por usuário (1:1) | Não suporta múltiplos papéis | Avaliar se necessário para o público-alvo |
| Sem permissões por projeto | Alto | Usuário vê todos os projetos do tenant |
| Sem hierarquia de papéis | Baixo | Não há herança de permissões |
| Sem permissões de campo | Baixo | Não oculta campos individuais por role |
| Sem row-level security | Médio | Demandas visíveis para todos |

### 3.2 Permissões por Módulo

| Módulo | read | create | update | delete | export | approve | prioritize |
|---|---|---|---|---|---|---|---|
| projects | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| demands | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| time_tracking | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| sprints | ✓ | ✓ | ✓ | ✓ | — | — | — |
| phases | ✓ | ✓ | ✓ | ✓ | — | — | — |
| users | ✓ | ✓ | ✓ | ✓ | — | — | — |
| audit | ✓ | — | — | — | ✓ | — | — |
| approvals | ✓ | ✓ | ✓ | — | — | — | — |
| dashboard | ✓ | — | — | — | — | — | — |
| project_types | ✓ | ✓ | ✓ | ✓ | — | — | — |

---

## 4. Análise de Segurança Multi-Tenant

### 4.1 Pontos Fortes

| Item | Avaliação |
|---|---|
| Isolamento de banco | Excelente — D1 separado impossibilita cross-tenant queries |
| Sessões separadas | Bom — `imgp_master_session` vs `imgp_session` vs `bj_session` |
| Audit trail | Bom — Eventos com tenant context em ambos os bancos |
| Rate limiting por tenant | Bom — Key inclui `tenant:{slug}:{ip}` |
| Tenant status enforcement | Bom — `cancelled` e `suspended` bloqueiam acesso |

### 4.2 Pontos de Atenção

| Item | Severidade | Descrição | Mitigação |
|---|---|---|---|
| Fallback `env.DB` | **Alta** | Se binding não existe, usa DB padrão | Remover fallback; retornar 500 se binding ausente |
| Sem validação tenant-user | **Alta** | API não verifica se o usuário pertence ao tenant | Checar `tenantUsers` em cada request autenticado |
| Master API sem rate limit diferenciado | Média | Mesma janela de 120/min para master e tenant | Rate limit mais restritivo para master API |
| Sem encryption at rest | Baixa | D1 armazena dados em texto (padrão Cloudflare) | Cloudflare gerencia encryption na infra |
| Session sharing | Média | Sessão `imgp_session` válida em qualquer tenant | Vincular session ao tenant específico |

---

## 5. Plano de Módulos por Plano

### 5.1 Estrutura Existente (schema)

```sql
planModules: {planId, moduleKey, actionsJson}
-- actionsJson default: '["read"]'
```

### 5.2 Sugestão de Tiers Comerciais

| Módulo | Free/Trial | Starter | Professional | Enterprise |
|---|---|---|---|---|
| projects | read | CRUD | CRUD + export | Full |
| demands | read | CRUD | CRUD + approve | Full |
| time_tracking | — | read | CRUD | Full + export |
| sprints | — | CRUD | CRUD | Full |
| phases | — | read | CRUD | Full |
| users | — | 5 max | 25 max | Ilimitado |
| audit | — | — | read | Full + export |
| approvals | — | — | CRUD | Full |
| dashboard | read | read | read | Full |
| project_types | — | read | CRUD | Full |
| **Preço sugerido** | **R$ 0** | **R$ 29/user/mês** | **R$ 59/user/mês** | **Sob consulta** |

---

## 6. Roadmap de Prontidão SaaS

### Fase 1: Fundação (semanas 1-4)

- [ ] Remover fallback `env.DB` — retornar erro se binding do tenant não existe
- [ ] Validar pertencimento usuário-tenant em cada request API
- [ ] Vincular sessão ao tenant (impedir cross-tenant session)
- [ ] Implementar enforcement de `maxUsers` na criação de usuário
- [ ] Implementar enforcement de `planModules` nos endpoints RBAC
- [ ] CSRF tokens em forms server-side
- [ ] LGPD: termos de uso, consentimento, política de privacidade

### Fase 2: Self-Service (semanas 5-8)

- [ ] Fluxo de signup: nome/email/senha → criar tenant + trial 14 dias
- [ ] Wizard de onboarding: perfil, convite de equipe, primeiro projeto
- [ ] Página de planos e comparação
- [ ] Integração Stripe: checkout, portal do cliente, webhooks
- [ ] Notificações por e-mail (boas-vindas, trial expirando, fatura)

### Fase 3: Operação (semanas 9-12)

- [ ] Dashboard admin com métricas por tenant (usuários, projetos, storage)
- [ ] Cancelamento self-service com período de retenção
- [ ] Exportação de dados (compliance LGPD)
- [ ] Logs centralizados para suporte

---

*Auditoria baseada em inspeção direta do código-fonte e schema do banco de dados em 2026-11-08.*
