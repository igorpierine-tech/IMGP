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
  kind: text("kind", { enum: ["epic", "milestone", "task", "subtask"] }).notNull(),
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

export const projectTemplates = sqliteTable("project_templates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  projectTypeId: integer("project_type_id").references(() => projectTypes.id, { onDelete: "set null" }),
  phasesJson: text("phases_json"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdBy: text("created_by").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now),
}, (table) => [
  index("project_templates_active_idx").on(table.active),
]);

export const templateItems = sqliteTable("template_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  templateId: integer("template_id").notNull().references(() => projectTemplates.id, { onDelete: "cascade" }),
  kind: text("kind").notNull().default("task"),
  name: text("name").notNull(),
  description: text("description"),
  relativeStartDays: integer("relative_start_days").notNull().default(0),
  durationDays: integer("duration_days").notNull().default(1),
  assignedRole: text("assigned_role"),
  parentRef: text("parent_ref"),
  itemRef: text("item_ref"),
  predecessorRefsJson: text("predecessor_refs_json"),
  sequence: integer("sequence").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
}, (table) => [
  index("template_items_template_idx").on(table.templateId, table.sequence),
]);

export const automationRules = sqliteTable("automation_rules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  triggerEvent: text("trigger_event").notNull(),
  triggerConditionsJson: text("trigger_conditions_json"),
  actionType: text("action_type").notNull(),
  actionConfigJson: text("action_config_json").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  executionCount: integer("execution_count").notNull().default(0),
  lastExecutedAt: integer("last_executed_at", { mode: "timestamp_ms" }),
  createdBy: text("created_by").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now),
}, (table) => [
  index("automation_rules_trigger_idx").on(table.triggerEvent, table.active),
]);

export const tags = sqliteTable("tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  color: text("color").notNull().default("#6b7280"),
  description: text("description"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
});

export const entityTags = sqliteTable("entity_tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tagId: integer("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  createdBy: text("created_by").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
}, (table) => [
  uniqueIndex("entity_tags_unique_idx").on(table.tagId, table.entityType, table.entityId),
  index("entity_tags_entity_idx").on(table.entityType, table.entityId),
]);

export const apiKeys = sqliteTable("api_keys", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull().unique(),
  keyPrefix: text("key_prefix").notNull(),
  scopesJson: text("scopes_json").notNull().default('["read"]'),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
  lastUsedAt: integer("last_used_at", { mode: "timestamp_ms" }),
  revoked: integer("revoked", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
}, (table) => [
  index("api_keys_user_idx").on(table.userId, table.revoked),
]);

export const favorites = sqliteTable("favorites", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
}, (table) => [
  uniqueIndex("favorites_unique_idx").on(table.userId, table.entityType, table.entityId),
  index("favorites_user_idx").on(table.userId),
]);

export const checklistItems = sqliteTable("checklist_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemId: integer("item_id").notNull().references(() => projectItems.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  checked: integer("checked", { mode: "boolean" }).notNull().default(false),
  sequence: integer("sequence").notNull().default(0),
  assignedUserId: text("assigned_user_id").references(() => users.id),
  dueDate: text("due_date"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now),
}, (table) => [
  index("checklist_items_item_idx").on(table.itemId, table.sequence),
]);

export const taskRecurrences = sqliteTable("task_recurrences", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sourceItemId: integer("source_item_id").notNull().references(() => projectItems.id, { onDelete: "cascade" }),
  frequency: text("frequency").notNull().default("weekly"),
  intervalValue: integer("interval_value").notNull().default(1),
  dayOfWeek: integer("day_of_week"),
  dayOfMonth: integer("day_of_month"),
  nextOccurrence: text("next_occurrence"),
  maxOccurrences: integer("max_occurrences"),
  occurrencesCreated: integer("occurrences_created").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdBy: text("created_by").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
}, (table) => [
  index("task_recurrences_active_idx").on(table.active, table.nextOccurrence),
]);

export const raciAssignments = sqliteTable("raci_assignments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  raciRole: text("raci_role").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
}, (table) => [
  uniqueIndex("raci_unique_idx").on(table.entityType, table.entityId, table.userId, table.raciRole),
  index("raci_entity_idx").on(table.entityType, table.entityId),
  index("raci_user_idx").on(table.userId),
]);

export const objectives = sqliteTable("objectives", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  ownerUserId: text("owner_user_id").references(() => users.id),
  period: text("period"),
  status: text("status").notNull().default("active"),
  progress: integer("progress").notNull().default(0),
  parentId: integer("parent_id"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now),
}, (table) => [
  index("objectives_status_idx").on(table.status),
  index("objectives_owner_idx").on(table.ownerUserId),
]);

export const keyResults = sqliteTable("key_results", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  objectiveId: integer("objective_id").notNull().references(() => objectives.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  metricType: text("metric_type").notNull().default("percentage"),
  targetValue: real("target_value").notNull().default(100),
  currentValue: real("current_value").notNull().default(0),
  unit: text("unit"),
  linkedProjectId: integer("linked_project_id").references(() => projects.id, { onDelete: "set null" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now),
}, (table) => [
  index("key_results_objective_idx").on(table.objectiveId),
]);

export const portfolios = sqliteTable("portfolios", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  ownerUserId: text("owner_user_id").references(() => users.id),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdBy: text("created_by").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now),
});

export const portfolioProjects = sqliteTable("portfolio_projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  portfolioId: integer("portfolio_id").notNull().references(() => portfolios.id, { onDelete: "cascade" }),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  strategicAlignment: text("strategic_alignment"),
  priority: integer("priority").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
}, (table) => [
  uniqueIndex("portfolio_projects_unique_idx").on(table.portfolioId, table.projectId),
]);

export const approvalChains = sqliteTable("approval_chains", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  entityType: text("entity_type").notNull(),
  stepsJson: text("steps_json").notNull(),
  escalationHours: integer("escalation_hours"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdBy: text("created_by").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now),
});

export const approvalRequests = sqliteTable("approval_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  chainId: integer("chain_id").notNull().references(() => approvalChains.id, { onDelete: "cascade" }),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  currentStep: integer("current_step").notNull().default(0),
  status: text("status").notNull().default("pending"),
  requestedBy: text("requested_by").notNull().references(() => users.id),
  completedAt: integer("completed_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
}, (table) => [
  index("approval_requests_status_idx").on(table.status, table.entityType),
]);

export const approvalStepsLog = sqliteTable("approval_steps_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  requestId: integer("request_id").notNull().references(() => approvalRequests.id, { onDelete: "cascade" }),
  stepIndex: integer("step_index").notNull(),
  approverUserId: text("approver_user_id").references(() => users.id),
  decision: text("decision").notNull().default("pending"),
  comment: text("comment"),
  decidedAt: integer("decided_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
}, (table) => [
  index("approval_steps_request_idx").on(table.requestId, table.stepIndex),
]);

export const userPreferences = sqliteTable("user_preferences", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now),
}, (table) => [
  uniqueIndex("user_preferences_unique_idx").on(table.userId, table.key),
]);

export const projectNotes = sqliteTable("project_notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  version: integer("version").notNull().default(1),
  createdBy: text("created_by").references(() => users.id),
  updatedBy: text("updated_by").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now),
}, (table) => [
  index("project_notes_project_idx").on(table.projectId),
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
