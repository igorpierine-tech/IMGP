-- Custom field definitions
CREATE TABLE IF NOT EXISTS custom_field_definitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text',
  options_json TEXT,
  required INTEGER NOT NULL DEFAULT 0,
  sequence INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT REFERENCES users(id),
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
CREATE UNIQUE INDEX custom_field_defs_entity_key_idx ON custom_field_definitions (entity_type, field_key);
--> statement-breakpoint

-- Custom field values
CREATE TABLE IF NOT EXISTS custom_field_values (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  field_id INTEGER NOT NULL REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
  entity_id INTEGER NOT NULL,
  value_text TEXT,
  value_number REAL,
  value_date TEXT,
  value_json TEXT,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
CREATE UNIQUE INDEX custom_field_values_field_entity_idx ON custom_field_values (field_id, entity_id);
--> statement-breakpoint
CREATE INDEX custom_field_values_entity_idx ON custom_field_values (entity_id);
--> statement-breakpoint

-- Attachments
CREATE TABLE IF NOT EXISTS attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  content_type TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  uploaded_by TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
CREATE INDEX attachments_entity_idx ON attachments (entity_type, entity_id);
--> statement-breakpoint
CREATE INDEX attachments_user_idx ON attachments (uploaded_by);
