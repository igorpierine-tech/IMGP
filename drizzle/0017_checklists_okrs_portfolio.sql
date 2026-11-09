-- Checklists (inline subtasks within a task)
CREATE TABLE IF NOT EXISTS checklist_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL REFERENCES project_items(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  checked INTEGER NOT NULL DEFAULT 0,
  sequence INTEGER NOT NULL DEFAULT 0,
  assigned_user_id TEXT REFERENCES users(id),
  due_date TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
CREATE INDEX checklist_items_item_idx ON checklist_items (item_id, sequence);
--> statement-breakpoint

-- Task recurrence rules
CREATE TABLE IF NOT EXISTS task_recurrences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_item_id INTEGER NOT NULL REFERENCES project_items(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL DEFAULT 'weekly',
  interval_value INTEGER NOT NULL DEFAULT 1,
  day_of_week INTEGER,
  day_of_month INTEGER,
  next_occurrence TEXT,
  max_occurrences INTEGER,
  occurrences_created INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT REFERENCES users(id),
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
CREATE INDEX task_recurrences_active_idx ON task_recurrences (active, next_occurrence);
--> statement-breakpoint

-- RACI matrix entries
CREATE TABLE IF NOT EXISTS raci_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  raci_role TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
CREATE UNIQUE INDEX raci_unique_idx ON raci_assignments (entity_type, entity_id, user_id, raci_role);
--> statement-breakpoint
CREATE INDEX raci_entity_idx ON raci_assignments (entity_type, entity_id);
--> statement-breakpoint
CREATE INDEX raci_user_idx ON raci_assignments (user_id);
--> statement-breakpoint

-- OKRs (Objectives and Key Results)
CREATE TABLE IF NOT EXISTS objectives (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  owner_user_id TEXT REFERENCES users(id),
  period TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  progress INTEGER NOT NULL DEFAULT 0,
  parent_id INTEGER REFERENCES objectives(id) ON DELETE SET NULL,
  created_by TEXT REFERENCES users(id),
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
CREATE INDEX objectives_status_idx ON objectives (status);
--> statement-breakpoint
CREATE INDEX objectives_owner_idx ON objectives (owner_user_id);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS key_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  objective_id INTEGER NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  metric_type TEXT NOT NULL DEFAULT 'percentage',
  target_value REAL NOT NULL DEFAULT 100,
  current_value REAL NOT NULL DEFAULT 0,
  unit TEXT,
  linked_project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
CREATE INDEX key_results_objective_idx ON key_results (objective_id);
--> statement-breakpoint

-- Portfolios
CREATE TABLE IF NOT EXISTS portfolios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  owner_user_id TEXT REFERENCES users(id),
  active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT REFERENCES users(id),
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS portfolio_projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  portfolio_id INTEGER NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  strategic_alignment TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
CREATE UNIQUE INDEX portfolio_projects_unique_idx ON portfolio_projects (portfolio_id, project_id);
--> statement-breakpoint

-- Approval chains
CREATE TABLE IF NOT EXISTS approval_chains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  steps_json TEXT NOT NULL,
  escalation_hours INTEGER,
  active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT REFERENCES users(id),
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS approval_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chain_id INTEGER NOT NULL REFERENCES approval_chains(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  current_step INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_by TEXT NOT NULL REFERENCES users(id),
  completed_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
CREATE INDEX approval_requests_status_idx ON approval_requests (status, entity_type);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS approval_steps_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
  step_index INTEGER NOT NULL,
  approver_user_id TEXT REFERENCES users(id),
  decision TEXT NOT NULL DEFAULT 'pending',
  comment TEXT,
  decided_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
CREATE INDEX approval_steps_request_idx ON approval_steps_log (request_id, step_index);
--> statement-breakpoint

-- User preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
CREATE UNIQUE INDEX user_preferences_unique_idx ON user_preferences (user_id, key);
--> statement-breakpoint

-- Project notes / wiki
CREATE TABLE IF NOT EXISTS project_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT REFERENCES users(id),
  updated_by TEXT REFERENCES users(id),
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
CREATE INDEX project_notes_project_idx ON project_notes (project_id);
