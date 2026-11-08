import { sql } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const now = sql`(unixepoch() * 1000)`;

export const tenants = sqliteTable("tenants", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  status: text("status", {
    enum: ["active", "suspended", "trial", "cancelled"],
  }).notNull().default("trial"),
  planId: integer("plan_id").references(() => plans.id, { onDelete: "set null" }),
  domain: text("domain"),
  dbFileName: text("db_file_name").notNull(),
  settingsJson: text("settings_json"),
  maxUsers: integer("max_users").notNull().default(10),
  trialEndsAt: integer("trial_ends_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now),
}, (table) => [
  index("tenants_status_idx").on(table.status),
  uniqueIndex("tenants_domain_idx").on(table.domain),
]);

export const plans = sqliteTable("plans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  description: text("description"),
  maxUsers: integer("max_users").notNull().default(10),
  priceMonthly: real("price_monthly").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now),
});

export const planModules = sqliteTable("plan_modules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  planId: integer("plan_id").notNull().references(() => plans.id, { onDelete: "cascade" }),
  moduleKey: text("module_key").notNull(),
  actionsJson: text("actions_json").notNull().default('["read"]'),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
}, (table) => [
  uniqueIndex("plan_modules_plan_module_idx").on(table.planId, table.moduleKey),
]);

export const masterUsers = sqliteTable("master_users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  role: text("role", {
    enum: ["super_admin", "support"],
  }).notNull().default("support"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  passwordHash: text("password_hash"),
  passwordSalt: text("password_salt"),
  passwordIterations: integer("password_iterations").notNull().default(210000),
  mustChangePassword: integer("must_change_password", { mode: "boolean" }).notNull().default(false),
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  lockedUntil: integer("locked_until", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }).notNull().default(now),
});

export const masterSessions = sqliteTable("master_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => masterUsers.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
}, (table) => [
  index("master_sessions_user_expiry_idx").on(table.userId, table.expiresAt),
]);

export const tenantUsers = sqliteTable("tenant_users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  externalUserId: text("external_user_id").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
}, (table) => [
  uniqueIndex("tenant_users_tenant_email_idx").on(table.tenantId, table.email),
  index("tenant_users_email_idx").on(table.email),
]);

export const masterAuditEvents = sqliteTable("master_audit_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  occurredAt: integer("occurred_at", { mode: "timestamp_ms" }).notNull().default(now),
  actorUserId: text("actor_user_id"),
  actorEmail: text("actor_email"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  beforeJson: text("before_json"),
  afterJson: text("after_json"),
  metadataJson: text("metadata_json"),
}, (table) => [
  index("master_audit_entity_idx").on(table.entityType, table.entityId),
  index("master_audit_actor_time_idx").on(table.actorUserId, table.occurredAt),
]);
