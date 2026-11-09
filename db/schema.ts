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

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  role: text("role", {
    enum: ["project_coordinator", "it_director", "project_analyst", "keyuser", "requester", "area_manager", "viewer"],
  }).notNull().default("keyuser"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  passwordHash: text("password_hash"),
  passwordSalt: text("password_salt"),
  passwordIterations: integer("password_iterations").notNull().default(210000),
  passwordSetAt: integer("password_set_at", { mode: "timestamp_ms" }),
  mustChangePassword: integer("must_change_password", { mode: "boolean" }).notNull().default(false),
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  lockedUntil: integer("locked_until", { mode: "timestamp_ms" }),
  invitedBy: text("invited_by"),
  totpSecret: text("totp_secret"),
  totpEnabled: integer("totp_enabled", { mode: "boolean" }).notNull().default(false),
  totpVerifiedAt: integer("totp_verified_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }).notNull().default(now),
});

export const userSessions = sqliteTable("user_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tenantId: text("tenant_id"),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }).notNull().default(now),
}, (table) => [
  index("user_sessions_user_expiry_idx").on(table.userId, table.expiresAt),
  index("user_sessions_tenant_idx").on(table.tenantId),
]);

export const projectPhases = sqliteTable("project_phases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectRef: text("project_ref").notNull(),
  projectName: text("project_name").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  sequence: integer("sequence").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdBy: text("created_by").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now),
}, (table) => [
  uniqueIndex("project_phases_project_name_idx").on(table.projectRef, table.name),
  index("project_phases_project_sequence_idx").on(table.projectRef, table.sequence),
]);

export const projectTypes = sqliteTable("project_types", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  description: text("description"),
  sequence: integer("sequence").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdBy: text("created_by").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now),
}, (table) => [index("project_types_active_sequence_idx").on(table.active, table.sequence)]);

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  source: text("source").notNull().default("platform"),
  externalId: text("external_id"),
  code: text("code"),
  name: text("name").notNull(),
  projectTypeId: integer("project_type_id").references(() => projectTypes.id, { onDelete: "set null" }),
  area: text("area"),
  managerName: text("manager_name"),
  managerUserId: text("manager_user_id").references(() => users.id),
  status: text("status").notNull().default("planning"),
  health: text("health", { enum: ["on_track", "attention", "late"] }).notNull().default("on_track"),
  progress: integer("progress").notNull().default(0),
  plannedStart: text("planned_start"),
  plannedEnd: text("planned_end"),
  actualStart: text("actual_start"),
  actualEnd: text("actual_end"),
  plannedHours: real("planned_hours").notNull().default(0),
  plannedCost: real("planned_cost").notNull().default(0),
  actualCost: real("actual_cost").notNull().default(0),
  projectPrioritized: integer("project_prioritized", { mode: "boolean" }).notNull().default(false),
  prioritizationDate: text("prioritization_date"),
  approvingDirector: text("approving_director"),
  rawJson: text("raw_json"),
  syncedAt: integer("synced_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now),
}, (table) => [
  uniqueIndex("projects_source_external_idx").on(table.source, table.externalId),
  index("projects_status_idx").on(table.status, table.health),
  index("projects_area_idx").on(table.area),
]);

export const sprints = sqliteTable("sprints", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  phaseId: integer("phase_id").references(() => projectPhases.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  objective: text("objective"),
  status: text("status").notNull().default("planned"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now),
}, (table) => [index("sprints_project_idx").on(table.projectId)]);

export const projectItems = sqliteTable("project_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  sprintId: integer("sprint_id").references(() => sprints.id, { onDelete: "set null" }),
  phaseId: integer("phase_id").references(() => projectPhases.id, { onDelete: "set null" }),
  parentId: integer("parent_id"),
  source: text("source").notNull().default("platform"),
  externalId: text("external_id"),
  kind: text("kind", { enum: ["milestone", "task", "subtask"] }).notNull(),
  name: text("name").notNull(),
  groupName: text("group_name"),
  status: text("status").notNull().default("planned"),
  health: text("health", { enum: ["on_track", "attention", "late"] }).notNull().default("on_track"),
  assignedUserId: text("assigned_user_id").references(() => users.id),
  assignedName: text("assigned_name"),
  plannedStart: text("planned_start"),
  plannedEnd: text("planned_end"),
  actualStart: text("actual_start"),
  actualEnd: text("actual_end"),
  plannedHours: real("planned_hours").notNull().default(0),
  rawJson: text("raw_json"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now),
}, (table) => [
  uniqueIndex("items_source_external_idx").on(table.source, table.externalId),
  index("items_project_kind_idx").on(table.projectId, table.kind),
  index("items_assignee_idx").on(table.assignedUserId),
]);

export const projectMembers = sqliteTable("project_members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  allocationPercent: integer("allocation_percent").notNull().default(0),
  roleName: text("role_name"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
}, (table) => [uniqueIndex("project_members_unique_idx").on(table.projectId, table.userId)]);

export const timeEntries = sqliteTable("time_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  itemId: integer("item_id").notNull().references(() => projectItems.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id),
  activity: text("activity"),
  status: text("status", { enum: ["running", "paused", "closed"] }).notNull().default("running"),
  startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
  endedAt: integer("ended_at", { mode: "timestamp_ms" }),
  pausedSeconds: integer("paused_seconds").notNull().default(0),
  totalMinutes: integer("total_minutes"),
  source: text("source").notNull().default("timer"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
}, (table) => [
  index("time_entries_user_status_idx").on(table.userId, table.status),
  index("time_entries_project_idx").on(table.projectId),
]);

export const demands = sqliteTable("demands", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  source: text("source").notNull().default("platform"),
  externalId: text("external_id"),
  name: text("name").notNull(),
  projectTypeId: integer("project_type_id").references(() => projectTypes.id, { onDelete: "set null" }),
  area: text("area").notNull(),
  requesterUserId: text("requester_user_id").references(() => users.id),
  requesterName: text("requester_name"),
  requesterEmail: text("requester_email"),
  sourceStatus: text("source_status"),
  sourceEntity: text("source_entity"),
  sourceCategory: text("source_category"),
  sourceOpenedAt: text("source_opened_at"),
  rawJson: text("raw_json"),
  requirementsJson: text("requirements_json"),
  stage: text("stage").notNull().default("Triagem"),
  objective: text("objective").notNull(),
  solution: text("solution").notNull().default(""),
  benefit: text("benefit").notNull().default(""),
  risk: text("risk").notNull().default(""),
  estimatedCost: real("estimated_cost").notNull().default(0),
  estimatedHours: real("estimated_hours").notNull().default(0),
  impact: text("impact").notNull().default("Médio"),
  projectPrioritized: integer("project_prioritized", { mode: "boolean" }).notNull().default(false),
  prioritizationDate: text("prioritization_date"),
  approvingDirector: text("approving_director"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now),
}, (table) => [
  uniqueIndex("demands_source_external_idx").on(table.source, table.externalId),
  index("demands_stage_updated_idx").on(table.stage, table.updatedAt),
  index("demands_requester_idx").on(table.requesterUserId),
]);

export const approvals = sqliteTable("approvals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  demandExternalId: text("demand_external_id").notNull(),
  sequence: integer("sequence").notNull(),
  approverRole: text("approver_role").notNull(),
  approverUserId: text("approver_user_id").references(() => users.id),
  decision: text("decision", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  justification: text("justification"),
  decidedAt: integer("decided_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
}, (table) => [uniqueIndex("approvals_demand_sequence_idx").on(table.demandExternalId, table.sequence)]);

export const tenantRoles = sqliteTable("tenant_roles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  builtIn: integer("built_in", { mode: "boolean" }).notNull().default(false),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now),
});

export const rolePermissions = sqliteTable("role_permissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  roleId: integer("role_id").notNull().references(() => tenantRoles.id, { onDelete: "cascade" }),
  moduleKey: text("module_key").notNull(),
  action: text("action").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
}, (table) => [
  uniqueIndex("role_permissions_unique_idx").on(table.roleId, table.moduleKey, table.action),
  index("role_permissions_role_idx").on(table.roleId),
]);

export const rateLimitEntries = sqliteTable("rate_limit_entries", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  windowStart: integer("window_start").notNull(),
  expiresAt: integer("expires_at").notNull(),
}, (table) => [
  index("rate_limit_expires_idx").on(table.expiresAt),
]);

export const userConsents = sqliteTable("user_consents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  consentType: text("consent_type").notNull(),
  version: text("version").notNull().default("1.0"),
  accepted: integer("accepted", { mode: "boolean" }).notNull().default(false),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  acceptedAt: integer("accepted_at", { mode: "timestamp_ms" }),
  revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
}, (table) => [
  uniqueIndex("user_consents_user_type_idx").on(table.userId, table.consentType),
]);

export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  read: integer("read", { mode: "boolean" }).notNull().default(false),
  readAt: integer("read_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
}, (table) => [
  index("notifications_user_read_idx").on(table.userId, table.read, table.createdAt),
]);

export const comments = sqliteTable("comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  parentId: integer("parent_id"),
  userId: text("user_id").notNull().references(() => users.id),
  body: text("body").notNull(),
  mentionsJson: text("mentions_json"),
  editedAt: integer("edited_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
}, (table) => [
  index("comments_entity_idx").on(table.entityType, table.entityId, table.createdAt),
  index("comments_user_idx").on(table.userId),
]);

export const webhooks = sqliteTable("webhooks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  url: text("url").notNull(),
  secret: text("secret").notNull(),
  eventsJson: text("events_json").notNull().default("[]"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdBy: text("created_by").references(() => users.id),
  lastTriggeredAt: integer("last_triggered_at", { mode: "timestamp_ms" }),
  failureCount: integer("failure_count").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now),
});

export const webhookDeliveries = sqliteTable("webhook_deliveries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  webhookId: integer("webhook_id").notNull().references(() => webhooks.id, { onDelete: "cascade" }),
  event: text("event").notNull(),
  payloadJson: text("payload_json").notNull(),
  responseStatus: integer("response_status"),
  responseBody: text("response_body"),
  durationMs: integer("duration_ms"),
  success: integer("success", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
}, (table) => [
  index("webhook_deliveries_webhook_idx").on(table.webhookId, table.createdAt),
]);

export const taskDependencies = sqliteTable("task_dependencies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  predecessorId: integer("predecessor_id").notNull().references(() => projectItems.id, { onDelete: "cascade" }),
  successorId: integer("successor_id").notNull().references(() => projectItems.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("finish_to_start"),
  lagDays: integer("lag_days").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
}, (table) => [
  uniqueIndex("task_deps_unique_idx").on(table.predecessorId, table.successorId),
  index("task_deps_successor_idx").on(table.successorId),
]);

export const customFieldDefinitions = sqliteTable("custom_field_definitions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  entityType: text("entity_type").notNull(),
  fieldKey: text("field_key").notNull(),
  label: text("label").notNull(),
  fieldType: text("field_type").notNull().default("text"),
  optionsJson: text("options_json"),
  required: integer("required", { mode: "boolean" }).notNull().default(false),
  sequence: integer("sequence").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdBy: text("created_by").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now),
}, (table) => [
  uniqueIndex("custom_field_defs_entity_key_idx").on(table.entityType, table.fieldKey),
]);

export const customFieldValues = sqliteTable("custom_field_values", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fieldId: integer("field_id").notNull().references(() => customFieldDefinitions.id, { onDelete: "cascade" }),
  entityId: integer("entity_id").notNull(),
  valueText: text("value_text"),
  valueNumber: real("value_number"),
  valueDate: text("value_date"),
  valueJson: text("value_json"),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now),
}, (table) => [
  uniqueIndex("custom_field_values_field_entity_idx").on(table.fieldId, table.entityId),
  index("custom_field_values_entity_idx").on(table.entityId),
]);

export const attachments = sqliteTable("attachments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  contentType: text("content_type").notNull(),
  storageKey: text("storage_key").notNull(),
  uploadedBy: text("uploaded_by").notNull().references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
}, (table) => [
  index("attachments_entity_idx").on(table.entityType, table.entityId),
  index("attachments_user_idx").on(table.uploadedBy),
]);

export const auditEvents = sqliteTable("audit_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  occurredAt: integer("occurred_at", { mode: "timestamp_ms" }).notNull().default(now),
  actorUserId: text("actor_user_id").references(() => users.id),
  actorEmail: text("actor_email"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  requestId: text("request_id"),
  beforeJson: text("before_json"),
  afterJson: text("after_json"),
  metadataJson: text("metadata_json"),
}, (table) => [
  index("audit_entity_idx").on(table.entityType, table.entityId),
  index("audit_actor_time_idx").on(table.actorUserId, table.occurredAt),
]);
