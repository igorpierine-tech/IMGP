ALTER TABLE user_sessions ADD COLUMN tenant_id TEXT;
--> statement-breakpoint
CREATE INDEX user_sessions_tenant_idx ON user_sessions (tenant_id);
