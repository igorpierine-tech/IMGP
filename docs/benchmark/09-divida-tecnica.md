# 09 — Análise de Dívida Técnica

**Raízes e Riquezas — Gestão Integrada de Projetos**
Data: 2026-11-08

---

## 1. Resumo

A plataforma apresenta uma base técnica sólida (Next.js 16, Cloudflare Workers, Drizzle ORM, TypeScript) com decisões arquiteturais acertadas, mas carrega dívida técnica concentrada em três áreas: UI legada em vanilla JS, ausência de testes automatizados e código morto de alternativas descartadas.

---

## 2. Inventário de Dívida Técnica

### DT-01: UI Legacy Monolítica (Severidade: Alta)

**Descrição**: A interface principal (~2000+ linhas de JS vanilla) opera via string templates com `innerHTML`, sem componentes, sem state management, sem bundling e sem type-checking.

**Arquivos afetados**:
- `public/legacy/app.js` (~750 linhas)
- `public/legacy/portfolio.js` (~600 linhas)
- `public/legacy/project-workspace.js` (~500 linhas)
- `public/legacy/dashboards.js` (~400 linhas)
- `public/legacy/time-tracking.js` (~200 linhas)
- `public/legacy/status-visuals.js` (~150 linhas)
- `public/legacy/roi.js` (~100 linhas)
- `public/legacy/foundation-client.js` (~100 linhas)
- `public/legacy/multi-select.js` (~80 linhas)

**Impactos**:
- Sem type-checking: erros só aparecem em runtime
- Sem testes: impossível validar regressões automaticamente
- Sem modularidade: mudança em uma view pode afetar outras
- Sem tree-shaking: todo o JS é carregado mesmo para features não usadas
- XSS potencial: `innerHTML` com dados de API (mitigado parcialmente por `esc()`)
- Sem hot-reload em dev: mudanças requerem refresh manual

**Plano de mitigação**:
1. **Curto prazo**: Manter legacy, adicionar TypeScript `.d.ts` para interfaces globais
2. **Médio prazo**: Migração incremental por módulo (portfólio → React primeiro)
3. **Longo prazo**: Eliminar todos os arquivos legacy e a rota `/legacy`

**Esforço estimado**: 12 pessoa-semanas para migração completa

---

### DT-02: Ausência de Testes Automatizados (Severidade: Alta)

**Descrição**: Vitest está configurado (`package.json` → `"test": "vitest run"`) mas não há arquivos de teste no repositório. Nenhuma cobertura de regressão para 20+ endpoints de API, lógica de autenticação, RBAC ou operações de negócio.

**Impactos**:
- Risco de regressão a cada mudança
- Sem confidence para refactoring
- Sem CI/CD automatizado
- Sem validação de segurança (auth bypass, RBAC enforcement)

**Plano de mitigação**:
1. **Imediato**: Testes para auth (login, 2FA, RBAC, JWT)
2. **Sprint seguinte**: Testes para CRUD (projects, demands, users)
3. **Contínuo**: Cobertura mínima de 80% para novos endpoints
4. **CI**: GitHub Actions com `vitest run` em cada PR

**Esforço estimado**: 4 pessoa-semanas para cobertura inicial (auth + CRUD)

---

### DT-03: Dados de Demonstração Hardcoded (Severidade: Média)

**Descrição**: `app.js` contém arrays `projects` e `tasks` com dados fictícios de demonstração que são sobrescritos pelo `portfolio.js` quando dados reais existem. Esta coexistência causa confusão.

**Linhas afetadas**: `app.js:11-12` (arrays `projects` e `tasks`)

**Impacto**: Confuso para desenvolvedores; dados demo podem aparecer brevemente no render inicial.

**Plano**: Remover dados demo e inicializar com arrays vazios; mostrar empty state quando não há dados.

**Esforço**: 0.5 dia

---

### DT-04: Código Morto — Supabase (Severidade: Baixa)

**Descrição**: O projeto contém um data backend alternativo para Supabase que não é utilizado:
- `lib/server/data-backend.ts` — toggle `DATA_BACKEND` entre d1 e supabase
- `lib/server/supabase.ts` (se existir)
- `@supabase/ssr` e `@supabase/supabase-js` no `package.json`
- Diretório `supabase/` (se existir)

**Impacto**: Aumenta tamanho do bundle, confunde novos desenvolvedores, dependências desnecessárias.

**Plano**: Remover quando houver certeza de que D1 é o backend definitivo.

**Esforço**: 0.5 dia

---

### DT-05: vinext Beta (Severidade: Média)

**Descrição**: `vinext@1.0.0-beta.5` é a bridge entre Vite e Next.js. Como software beta, pode ter breaking changes, bugs não documentados e risco de abandono.

**Impacto**:
- Atualizações de Next.js podem quebrar a bridge
- Documentação limitada
- Comunidade pequena

**Mitigação**:
- Monitorar releases do vinext
- Manter versão fixada no `package.json`
- Considerar migração para Next.js nativo se vinext não atingir 1.0 estável

---

### DT-06: Rate Limiting In-Memory (Severidade: Média)

**Descrição**: `rate-limit.ts` usa `Map<string, BucketEntry>` na memória do Worker. Cloudflare Workers têm múltiplas instâncias; o rate limit não é compartilhado entre elas. Um deploy reseta todos os contadores.

**Impacto**:
- Rate limit efetivo é por instância do Worker, não global
- Atacante pode distribuir requests entre instâncias

**Plano**: Migrar para Cloudflare Durable Objects (contador compartilhado) ou D1 (com cleanup periódico).

**Esforço**: 1 semana

---

### DT-07: Bootstrap de Dados no Render (Severidade: Média)

**Descrição**: As páginas `legacy/page.tsx` e `t/[slug]/legacy/page.tsx` carregam **todos** os dados do workspace via `loadWorkspaceData()` e os injetam como `window.*` no HTML. Para tenants com centenas de projetos e milhares de tarefas, isso pode:
- Aumentar significativamente o TTFB (time to first byte)
- Consumir memória no cliente
- Impedir paginação

**Plano**:
1. Curto prazo: Paginação server-side nos endpoints de API
2. Médio prazo: Lazy loading de dados por módulo (carregar demandas apenas quando navegar para "Demandas")
3. Longo prazo: React components com SWR/React Query

**Esforço**: 2 semanas (paginação) + parte da migração React

---

### DT-08: CSS Global sem Módulos (Severidade: Baixa)

**Descrição**: 8 arquivos CSS globais carregados via `<link>` no legacy page:
- `style.css`, `project-workspace.css`, `portfolio.css`, `time-tracking.css`
- `status-visuals.css`, `dashboards.css`, `multi-select.css`, `responsive.css`

Todos operam no escopo global, com risco de colisão de seletores.

**Plano**: Será resolvido naturalmente com a migração para React (CSS Modules ou Tailwind).

---

### DT-09: Fallback de Tenant DB Inseguro (Severidade: Alta)

**Descrição**: Em `tenant-context.ts:85-91`, se o binding específico do tenant não existe, o sistema usa `env.DB` (binding padrão). Isso pode fazer com que um tenant acesse dados de outro tenant (ou dados sem tenant).

```typescript
if (!tenantBinding) {
  const defaultBinding = env.DB;
  if (!defaultBinding) {
    throw new HttpError(500, "Banco de dados do tenant não disponível.");
  }
  return { tenant, db: getTenantDb(defaultBinding) };
}
```

**Plano**: Remover o fallback. Se `tenantBinding` não existe, retornar erro 500.

**Esforço**: 0.5 dia

---

### DT-10: Sem Validação tenant-user (Severidade: Alta)

**Descrição**: As APIs de tenant não verificam se o usuário autenticado pertence ao tenant da requisição. A tabela `tenantUsers` existe no Master DB mas não é consultada na cadeia de autenticação.

**Plano**: Adicionar validação em `getApiContext()` — checar `tenantUsers` no Master DB.

**Esforço**: 1 dia

---

## 3. Priorização

| Rank | ID | Item | Severidade | Esforço | Impacto |
|---|---|---|---|---|---|
| 1 | DT-09 | Fallback tenant DB inseguro | Alta | 0.5 dia | Segurança |
| 2 | DT-10 | Sem validação tenant-user | Alta | 1 dia | Segurança |
| 3 | DT-02 | Sem testes automatizados | Alta | 4 semanas | Qualidade |
| 4 | DT-06 | Rate limiting in-memory | Média | 1 semana | Segurança |
| 5 | DT-03 | Dados demo hardcoded | Média | 0.5 dia | Clareza |
| 6 | DT-07 | Bootstrap de dados no render | Média | 2 semanas | Performance |
| 7 | DT-01 | UI legacy monolítica | Alta | 12 semanas | Manutenção |
| 8 | DT-05 | vinext beta | Média | Monitorar | Risco |
| 9 | DT-04 | Código morto Supabase | Baixa | 0.5 dia | Limpeza |
| 10 | DT-08 | CSS global | Baixa | — | Migração React |

---

## 4. Quick Wins (< 1 dia cada)

- [ ] Remover fallback `env.DB` em `tenant-context.ts`
- [ ] Remover dados demo em `app.js` (arrays projects/tasks)
- [ ] Adicionar `Content-Type` validation em endpoints que aceitam JSON
- [ ] Remover dependências Supabase do `package.json` (se confirmado D1)

---

*Análise baseada em inspeção direta do código-fonte em 2026-11-08. Estimativas de esforço assumem 1 desenvolvedor senior full-time.*
