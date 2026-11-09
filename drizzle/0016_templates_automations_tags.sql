-- Project templates
CREATE TABLE IF NOT EXISTS project_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  project_type_id INTEGER REFERENCES project_types(id) ON DELETE SET NULL,
  phases_json TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT REFERENCES users(id),
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
CREATE INDEX project_templates_active_idx ON project_templates (active);
--> statement-breakpoint

-- Template items (tasks/milestones within a template)
CREATE TABLE IF NOT EXISTS template_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL REFERENCES project_templates(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'task',
  name TEXT NOT NULL,
  description TEXT,
  relative_start_days INTEGER NOT NULL DEFAULT 0,
  duration_days INTEGER NOT NULL DEFAULT 1,
  assigned_role TEXT,
  parent_ref TEXT,
  item_ref TEXT,
  predecessor_refs_json TEXT,
  sequence INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
CREATE INDEX template_items_template_idx ON template_items (template_id, sequence);
--> statement-breakpoint

-- Automation rules
CREATE TABLE IF NOT EXISTS automation_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  trigger_event TEXT NOT NULL,
  trigger_conditions_json TEXT,
  action_type TEXT NOT NULL,
  action_config_json TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  execution_count INTEGER NOT NULL DEFAULT 0,
  last_executed_at INTEGER,
  created_by TEXT REFERENCES users(id),
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
CREATE INDEX automation_rules_trigger_idx ON automation_rules (trigger_event, active);
--> statement-breakpoint

-- Tags
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6b7280',
  description TEXT,
  created_by TEXT REFERENCES users(id),
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
CREATE UNIQUE INDEX tags_name_idx ON tags (name);
--> statement-breakpoint

-- Entity-tag junction
CREATE TABLE IF NOT EXISTS entity_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  created_by TEXT REFERENCES users(id),
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
CREATE UNIQUE INDEX entity_tags_unique_idx ON entity_tags (tag_id, entity_type, entity_id);
--> statement-breakpoint
CREATE INDEX entity_tags_entity_idx ON entity_tags (entity_type, entity_id);
--> statement-breakpoint

-- API Keys
CREATE TABLE IF NOT EXISTS api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  scopes_json TEXT NOT NULL DEFAULT '["read"]',
  expires_at INTEGER,
  last_used_at INTEGER,
  revoked INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
CREATE INDEX api_keys_user_idx ON api_keys (user_id, revoked);
--> statement-breakpoint
CREATE UNIQUE INDEX api_keys_hash_idx ON api_keys (key_hash);
--> statement-breakpoint

-- Favorites
CREATE TABLE IF NOT EXISTS favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
CREATE UNIQUE INDEX favorites_unique_idx ON favorites (user_id, entity_type, entity_id);
--> statement-breakpoint
CREATE INDEX favorites_user_idx ON favorites (user_id);
