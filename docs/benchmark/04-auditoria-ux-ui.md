# 04 — Auditoria de UX/UI

**Raízes e Riquezas — Gestão Integrada de Projetos**
Data: 2026-11-08

---

## 1. Resumo Executivo

A interface atual opera em dois paradigmas distintos:
- **Pages Next.js (React)**: Login, alterar senha, workspaces — design limpo, responsivo, padrão moderno
- **Legacy UI (Vanilla JS)**: Toda a aplicação principal — SPA renderizada via `innerHTML`, sem componentes, sem state management

A prioridade da auditoria UX/UI é avaliar a experiência do usuário final nos fluxos críticos e identificar oportunidades de melhoria sem alterar código funcional.

---

## 2. Análise de Navegação

### 2.1 Estrutura de Navegação

```
Sidebar (9 itens)
├── Portfólio          → Visão geral dos projetos
├── Dashboards         → Indicadores
├── Projeto            → Espaço individual do projeto
├── Demandas           → Viabilidade e requisitos
├── Aprovações         → Fluxo de aprovação
├── Gantt              → Cronograma global/individual
├── Kanban             → Quadro de execução
├── Comparativo        → Planejado × Realizado
├── Recursos           → Tempo e alocação
└── Administração*     → Usuários e tipos (*só coord/dir)
```

### 2.2 Pontos Positivos

- Menu lateral persistente com ícones e labels claros
- Topbar com indicação de tenant/workspace
- Avatar e logout acessíveis
- Menu responsivo com hamburger para mobile
- Transição entre views é instantânea (client-side render)

### 2.3 Pontos de Melhoria

| Item | Severidade | Descrição |
|---|---|---|
| Sem breadcrumbs | Média | Usuário perde referência ao navegar entre projeto → tarefas → sprint |
| Sem deep-linking | Alta | URLs não refletem a view atual (sempre `/legacy`); impossível compartilhar link para uma tarefa |
| Sem busca global | Alta | Não há como buscar projetos, tarefas ou demandas de um campo centralizado |
| Ícones Unicode | Baixa | Ícones do menu são caracteres Unicode (▦, ☷, ⇥) — inconsistentes entre OS |
| Sem indicador de loading | Média | Ações de API (salvar, deletar) não mostram feedback de carregamento |
| Sem confirmação de ações destrutivas | Média | Não há modal de confirmação para ações como exclusão |

---

## 3. Análise Visual

### 3.1 Design System

| Aspecto | Estado Atual | Recomendação |
|---|---|---|
| **Paleta de cores** | Azul primário (#1d4ed8), badges coloridas (red/amber/blue), fundo branco | Definir tokens de cor em design system formal |
| **Tipografia** | System font stack (Helvetica, Arial, sans-serif) | Adotar família tipográfica consistente (Inter, Geist) |
| **Espaçamento** | Variável — mix de inline styles e CSS classes | Padronizar grid de 4/8px |
| **Componentes** | Sem biblioteca — HTML direto via string templates | Migrar para componentes React reutilizáveis |
| **Ícones** | Caracteres Unicode no menu, sem biblioteca de ícones | Adotar Lucide React (já no package.json) |
| **Dark mode** | Não suportado | Implementar com CSS variables e `next-themes` (já instalado) |
| **Responsividade** | CSS dedicado (`responsive.css`) com breakpoints | Funcional mas com tabelas que precisam scroll horizontal |

### 3.2 Componentes Visuais Existentes

| Componente | Implementação | Qualidade |
|---|---|---|
| Badges de status | CSS class `.badge` + variantes (red/amber/blue) | Boa — visualmente claro |
| Progress bar | CSS `.progress` com `<i>` interno | Boa — funcional |
| Stat cards | `.stat` container com label/valor/footer | Boa — informativo |
| Tabelas | `<table class="responsive-table">` com data-labels | Boa — responsiva |
| Modal/Dialog | `<dialog>` nativo com `.app-dialog` | Funcional — precisa de polish |
| Toast | Div temporária com `role="status"` | Funcional — precisa de acessibilidade |
| Formulários | `.login-form` / `.formgrid` | Boa — layout clean |

---

## 4. Fluxos Críticos

### 4.1 Fluxo de Login

```
/login → [E-mail + Senha] → POST /api/auth/login → 302 /legacy
                          → [Microsoft] → /auth/start → Entra ID → /auth/callback → /legacy
```

**Avaliação**: Bom. Design limpo, mensagens de erro visíveis, modo setup para primeiro acesso. Falta indicador de loading no submit e feedback de campo inválido inline.

### 4.2 Fluxo de Demandas (viabilidade)

```
Menu "Demandas" → Lista filtrada → [+ Nova demanda] → Modal com título
→ Detalhe com 4 blocos (A-D) → Campos condicionais → [Salvar]
→ Fluxo de aprovações → Decisão do gestor
```

**Avaliação**: Excelente estrutura funcional. O formulário de requisitos em 4 blocos é o ponto mais forte da UX. Melhorias:
- Adicionar autosave ou warning de dados não salvos
- Progresso visual (stepper) dos blocos de requisitos
- Validação inline dos campos obrigatórios

### 4.3 Fluxo de Gantt

```
Menu "Gantt" → Toggle Global/Individual → Seleção de projeto
→ Agrupamento por fases/sprints → Expand/collapse → Click em tarefa → Modal de edição
```

**Avaliação**: Funcional e informativo. O baseline visual é um diferencial. Melhorias:
- Drag & drop para replanejamento de datas
- Zoom temporal (semana/mês/trimestre)
- Dependências visuais entre barras

### 4.4 Fluxo de Kanban

```
Menu "Kanban" → Filtro por projeto → 4 colunas (A fazer → Concluído)
→ Drag & drop entre colunas → Select de status → Modal de edição
```

**Avaliação**: Bom. Drag & drop nativo funciona. Melhorias:
- WIP limits configuráveis
- Swimlanes por responsável ou sprint
- Quick-add card inline

---

## 5. Acessibilidade (a11y)

| Critério | Estado | Nota |
|---|---|---|
| **Semântica HTML** | Parcial | `<nav>`, `<main>`, `<dialog>` usados corretamente; `<aside>` para sidebar |
| **ARIA labels** | Parcial | Botões e selects têm `aria-label`; faltam em links e cards |
| **Contraste** | Adequado | Paleta azul/branco com contraste suficiente na maioria dos textos |
| **Teclado** | Limitado | Navigation por tab não está estruturada; dialog não trap focus |
| **Screen reader** | Parcial | Toast tem `role="status"`; tabelas responsivas com `data-label` |
| **Texto alternativo** | Ausente | Ícones decorativos têm `aria-hidden="true"` (correto) |
| **Skip to content** | Ausente | Não há link de skip navigation |
| **Focus visible** | Parcial | Browser default, sem estilo customizado |

**Score WCAG estimado**: Nível A parcial, Nível AA não atingido.

---

## 6. Performance Percebida

| Aspecto | Avaliação | Impacto |
|---|---|---|
| **First paint** | Rápido — SSR do Next.js | Positivo |
| **Data loading** | Todo o workspace carregado no bootstrap (window.*) | Negativo para datasets grandes |
| **Navegação** | Instantânea (client-side render) | Positivo |
| **Salvamento** | Fetch assíncrono com toast | Positivo |
| **Tabelas grandes** | Sem paginação ou virtualização | Negativo para 100+ projetos |

---

## 7. Recomendações Prioritárias

| # | Recomendação | Esforço | Impacto UX |
|---|---|---|---|
| 1 | Implementar deep-linking (URLs por view/projeto/tarefa) | Médio | Alto |
| 2 | Adicionar busca global com atalho de teclado (⌘K) | Médio | Alto |
| 3 | Substituir ícones Unicode por Lucide React | Baixo | Médio |
| 4 | Adicionar loading states (skeleton/spinner) em ações de API | Baixo | Médio |
| 5 | Implementar paginação em tabelas | Médio | Alto (escala) |
| 6 | Adicionar confirmação para ações destrutivas | Baixo | Médio |
| 7 | Stepper visual no formulário de requisitos (blocos A-D) | Baixo | Médio |
| 8 | Breadcrumbs na navegação de projeto | Baixo | Médio |
| 9 | Dark mode (usar `next-themes` já instalado) | Médio | Baixo |
| 10 | Migrar menu para componentes React com Lucide icons | Médio | Médio |

---

*Auditoria baseada em inspeção de código e análise estrutural da interface. Testes com usuários reais são recomendados para validar as prioridades.*
