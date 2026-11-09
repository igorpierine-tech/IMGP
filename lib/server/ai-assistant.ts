import OpenAI from "openai";
import { eq, desc, asc, sql, count, and } from "drizzle-orm";
import { projects, projectItems, demands, auditEvents } from "../../db/schema";
import type { ApiContext } from "./api-context";

const MODEL = "gpt-4o";

type Message = { role: "user" | "assistant"; content: string };

function getOpenAIKey(): string | null {
  try {
    return (globalThis as Record<string, unknown>).OPENAI_API_KEY as string | undefined ?? null;
  } catch {
    return null;
  }
}

const tools: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "listar_projetos",
      description: "Lista todos os projetos com nome, status, saúde, progresso e área. Use quando o usuário perguntar sobre projetos.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filtrar por status: planning, in_progress, completed, cancelled" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_metricas",
      description: "Retorna métricas e KPIs do dashboard: total de projetos, tarefas, demandas, horas apontadas.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_tarefas",
      description: "Lista tarefas de um projeto específico. Retorna nome, status, saúde, responsável.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "number", description: "ID do projeto" },
          status: { type: "string", description: "Filtrar por status: planned, in_progress, blocked, review, done" },
        },
        required: ["projectId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_demandas",
      description: "Lista demandas (solicitações). Retorna nome, área, estágio, impacto.",
      parameters: {
        type: "object",
        properties: {
          stage: { type: "string", description: "Filtrar por estágio: Triagem, Em Análise, Aprovada, Rejeitada, Concluída" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "criar_tarefa",
      description: "Cria uma nova tarefa em um projeto. Requer nome e projeto.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "number", description: "ID do projeto" },
          name: { type: "string", description: "Nome da tarefa" },
          status: { type: "string", description: "Status inicial: planned, in_progress, blocked, review, done", default: "planned" },
        },
        required: ["projectId", "name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "atualizar_status_tarefa",
      description: "Atualiza o status de uma tarefa existente.",
      parameters: {
        type: "object",
        properties: {
          taskId: { type: "number", description: "ID da tarefa" },
          status: { type: "string", description: "Novo status: planned, in_progress, blocked, review, done" },
        },
        required: ["taskId", "status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "criar_demanda",
      description: "Cria uma nova demanda/solicitação.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Título da demanda" },
          area: { type: "string", description: "Área: TI, Operações, RH, Financeiro, Comercial, Jurídico, Marketing" },
          impact: { type: "string", description: "Impacto: Baixo, Médio, Alto" },
          description: { type: "string", description: "Descrição da demanda" },
        },
        required: ["name", "area", "impact"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_atividade_recente",
      description: "Retorna as atividades mais recentes do sistema (audit log).",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Quantidade de registros (máx 20)", default: 10 },
        },
        required: [],
      },
    },
  },
];

async function executeTool(
  name: string,
  input: Record<string, unknown>,
  ctx: ApiContext,
): Promise<string> {
  const db = ctx.db;

  switch (name) {
    case "listar_projetos": {
      let query = db.select({
        id: projects.id, name: projects.name, status: projects.status,
        health: projects.health, progress: projects.progress, area: projects.area,
      }).from(projects);
      if (input.status) {
        query = query.where(eq(projects.status, input.status as string)) as typeof query;
      }
      const rows = await query.orderBy(desc(projects.updatedAt)).limit(20);
      if (!rows.length) return "Nenhum projeto encontrado.";
      return JSON.stringify(rows);
    }

    case "buscar_metricas": {
      const [pStats] = await db.select({
        total: count(),
        planning: count(sql`CASE WHEN ${projects.status} = 'planning' THEN 1 END`),
        inProgress: count(sql`CASE WHEN ${projects.status} = 'in_progress' THEN 1 END`),
        completed: count(sql`CASE WHEN ${projects.status} = 'completed' THEN 1 END`),
      }).from(projects);
      const [tStats] = await db.select({
        total: count(),
        done: count(sql`CASE WHEN ${projectItems.status} = 'done' THEN 1 END`),
        blocked: count(sql`CASE WHEN ${projectItems.status} = 'blocked' THEN 1 END`),
        overdue: count(sql`CASE WHEN ${projectItems.plannedEnd} < date('now') AND ${projectItems.status} != 'done' THEN 1 END`),
      }).from(projectItems);
      const [dStats] = await db.select({
        total: count(),
        triagem: count(sql`CASE WHEN ${demands.stage} = 'Triagem' THEN 1 END`),
        aprovada: count(sql`CASE WHEN ${demands.stage} = 'Aprovada' THEN 1 END`),
      }).from(demands);
      return JSON.stringify({ projetos: pStats, tarefas: tStats, demandas: dStats });
    }

    case "listar_tarefas": {
      const projectId = input.projectId as number;
      const conditions = [eq(projectItems.projectId, projectId)];
      if (input.status) conditions.push(eq(projectItems.status, input.status as string));
      const rows = await db.select({
        id: projectItems.id, name: projectItems.name, status: projectItems.status,
        health: projectItems.health, assignedName: projectItems.assignedName,
      }).from(projectItems).where(and(...conditions)).orderBy(asc(projectItems.name)).limit(50);
      if (!rows.length) return "Nenhuma tarefa encontrada para este projeto.";
      return JSON.stringify(rows);
    }

    case "listar_demandas": {
      let query = db.select({
        id: demands.id, name: demands.name, area: demands.area,
        stage: demands.stage, impact: demands.impact,
      }).from(demands);
      if (input.stage) {
        query = query.where(eq(demands.stage, input.stage as string)) as typeof query;
      }
      const rows = await query.orderBy(desc(demands.createdAt)).limit(20);
      if (!rows.length) return "Nenhuma demanda encontrada.";
      return JSON.stringify(rows);
    }

    case "criar_tarefa": {
      const [created] = await db.insert(projectItems).values({
        projectId: input.projectId as number,
        name: input.name as string,
        status: (input.status as string) || "planned",
        health: "on_track",
        kind: "task",
      }).returning({ id: projectItems.id, name: projectItems.name, status: projectItems.status });
      return `Tarefa criada com sucesso: "${created.name}" (ID: ${created.id})`;
    }

    case "atualizar_status_tarefa": {
      const [updated] = await db.update(projectItems)
        .set({ status: input.status as string })
        .where(eq(projectItems.id, input.taskId as number))
        .returning({ id: projectItems.id, name: projectItems.name, status: projectItems.status });
      if (!updated) return "Tarefa não encontrada.";
      return `Status da tarefa "${updated.name}" atualizado para: ${updated.status}`;
    }

    case "criar_demanda": {
      const [created] = await db.insert(demands).values({
        name: input.name as string,
        area: input.area as string,
        impact: input.impact as string,
        objective: (input.description as string) || "",
        stage: "Triagem",
        requesterUserId: ctx.user.id,
      }).returning({ id: demands.id, name: demands.name, stage: demands.stage });
      return `Demanda criada com sucesso: "${created.name}" (ID: ${created.id})`;
    }

    case "buscar_atividade_recente": {
      const lim = Math.min((input.limit as number) || 10, 20);
      const rows = await db.select({
        action: auditEvents.action, entityType: auditEvents.entityType,
        actorEmail: auditEvents.actorEmail, occurredAt: auditEvents.occurredAt,
      }).from(auditEvents).orderBy(desc(auditEvents.occurredAt)).limit(lim);
      if (!rows.length) return "Nenhuma atividade recente.";
      return JSON.stringify(rows);
    }

    default:
      return `Ferramenta desconhecida: ${name}`;
  }
}

const SYSTEM_PROMPT = `Você é o assistente de IA do "Raízes e Riquezas — Gestão Integrada de Projetos" (IMGP).

Seu papel:
- Responder perguntas sobre projetos, tarefas, demandas e métricas da plataforma
- Executar ações como criar tarefas, atualizar status, criar demandas
- Ser proativo em oferecer insights sobre o que os dados mostram
- Sempre responder em português brasileiro

Regras:
- Use as ferramentas disponíveis para consultar dados reais antes de responder
- Nunca invente dados — sempre consulte primeiro
- Ao criar itens, confirme os detalhes antes de executar se estiverem incompletos
- Formate respostas de forma concisa e clara
- Use emojis com moderação para tornar respostas mais visuais
- Quando listar dados, use formatação organizada

Contexto da plataforma:
- Projetos têm status: planning (Planejamento), in_progress (Em progresso), completed (Concluído), cancelled (Cancelado)
- Projetos têm saúde: on_track (No prazo), attention (Atenção), late (Atrasado)
- Tarefas ficam em colunas Kanban: planned, in_progress, blocked, review, done
- Demandas passam por estágios: Triagem → Em Análise → Aprovada/Rejeitada → Concluída`;

export async function chat(
  messages: Message[],
  ctx: ApiContext,
): Promise<string> {
  const apiKey = getOpenAIKey();
  if (!apiKey) {
    return "O assistente de IA não está configurado. Peça ao administrador para configurar a variável OPENAI_API_KEY.";
  }

  const client = new OpenAI({ apiKey });

  const apiMessages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  let response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 4096,
    tools,
    messages: apiMessages,
  });

  const maxIterations = 5;
  let iteration = 0;

  while (
    response.choices[0]?.finish_reason === "tool_calls" &&
    iteration < maxIterations
  ) {
    iteration++;

    const assistantMessage = response.choices[0].message;
    apiMessages.push(assistantMessage);

    const toolCalls = (assistantMessage.tool_calls ?? []).filter(
      (tc): tc is OpenAI.ChatCompletionMessageFunctionToolCall => tc.type === "function",
    );
    for (const toolCall of toolCalls) {
      let result: string;
      try {
        const input = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
        result = await executeTool(toolCall.function.name, input, ctx);
      } catch (err: unknown) {
        result = err instanceof Error ? err.message : "Erro interno";
      }
      apiMessages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: result,
      });
    }

    response = await client.chat.completions.create({
      model: MODEL,
      max_tokens: 4096,
      tools,
      messages: apiMessages,
    });
  }

  return response.choices[0]?.message?.content || "Não consegui gerar uma resposta.";
}
