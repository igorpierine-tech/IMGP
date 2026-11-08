export const MODULE_KEYS = [
  "projects",
  "demands",
  "time_tracking",
  "sprints",
  "phases",
  "users",
  "audit",
  "approvals",
  "dashboard",
  "project_types",
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export const ACTIONS = [
  "read",
  "create",
  "update",
  "delete",
  "export",
  "approve",
  "prioritize",
] as const;

export type Action = (typeof ACTIONS)[number];

export type Permission = `${ModuleKey}:${Action}`;

export const DEFAULT_ROLES: Record<string, { name: string; description: string; permissions: Permission[] }> = {
  project_coordinator: {
    name: "Coordenador de Projetos",
    description: "Acesso completo a todos os módulos",
    permissions: [
      "projects:read", "projects:create", "projects:update", "projects:delete", "projects:export", "projects:prioritize",
      "demands:read", "demands:create", "demands:update", "demands:delete", "demands:export", "demands:approve", "demands:prioritize",
      "time_tracking:read", "time_tracking:create", "time_tracking:update", "time_tracking:delete", "time_tracking:export",
      "sprints:read", "sprints:create", "sprints:update", "sprints:delete",
      "phases:read", "phases:create", "phases:update", "phases:delete",
      "users:read", "users:create", "users:update", "users:delete",
      "audit:read", "audit:export",
      "approvals:read", "approvals:create", "approvals:update",
      "dashboard:read",
      "project_types:read", "project_types:create", "project_types:update", "project_types:delete",
    ],
  },
  it_director: {
    name: "Diretor de TI",
    description: "Acesso completo com foco em governança",
    permissions: [
      "projects:read", "projects:create", "projects:update", "projects:delete", "projects:export", "projects:prioritize",
      "demands:read", "demands:create", "demands:update", "demands:delete", "demands:export", "demands:approve", "demands:prioritize",
      "time_tracking:read", "time_tracking:export",
      "sprints:read", "sprints:create", "sprints:update", "sprints:delete",
      "phases:read", "phases:create", "phases:update", "phases:delete",
      "users:read", "users:create", "users:update", "users:delete",
      "audit:read", "audit:export",
      "approvals:read", "approvals:create", "approvals:update",
      "dashboard:read",
      "project_types:read", "project_types:create", "project_types:update", "project_types:delete",
    ],
  },
  project_analyst: {
    name: "Analista de Projetos",
    description: "Gestão operacional de projetos e itens",
    permissions: [
      "projects:read", "projects:create", "projects:update", "projects:export",
      "demands:read", "demands:create", "demands:update", "demands:export",
      "time_tracking:read", "time_tracking:create", "time_tracking:update", "time_tracking:delete", "time_tracking:export",
      "sprints:read", "sprints:create", "sprints:update", "sprints:delete",
      "phases:read", "phases:create", "phases:update", "phases:delete",
      "approvals:read",
      "dashboard:read",
      "project_types:read",
    ],
  },
  keyuser: {
    name: "Keyuser",
    description: "Colaborador chave com acesso amplo de leitura e edição limitada",
    permissions: [
      "projects:read",
      "demands:read", "demands:create", "demands:update",
      "time_tracking:read", "time_tracking:create", "time_tracking:update",
      "sprints:read",
      "phases:read",
      "approvals:read",
      "dashboard:read",
      "project_types:read",
    ],
  },
  requester: {
    name: "Solicitante",
    description: "Pode criar e acompanhar demandas",
    permissions: [
      "projects:read",
      "demands:read", "demands:create", "demands:update",
      "dashboard:read",
    ],
  },
  area_manager: {
    name: "Gestor de Área",
    description: "Aprovação e priorização de demandas da sua área",
    permissions: [
      "projects:read",
      "demands:read", "demands:update", "demands:approve", "demands:prioritize",
      "approvals:read", "approvals:update",
      "dashboard:read",
    ],
  },
  viewer: {
    name: "Visualizador",
    description: "Acesso somente leitura",
    permissions: [
      "projects:read",
      "demands:read",
      "dashboard:read",
    ],
  },
};
