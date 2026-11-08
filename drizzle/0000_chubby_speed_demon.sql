CREATE TABLE `approvals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`demand_external_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`approver_role` text NOT NULL,
	`approver_user_id` text,
	`decision` text DEFAULT 'pending' NOT NULL,
	`justification` text,
	`decided_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`approver_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `approvals_demand_sequence_idx` ON `approvals` (`demand_external_id`,`sequence`);--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`occurred_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`actor_user_id` text,
	`actor_email` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`request_id` text,
	`before_json` text,
	`after_json` text,
	`metadata_json` text,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `audit_entity_idx` ON `audit_events` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `audit_actor_time_idx` ON `audit_events` (`actor_user_id`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `integration_connections` (
	`provider` text PRIMARY KEY NOT NULL,
	`base_url` text,
	`status` text DEFAULT 'not_configured' NOT NULL,
	`last_checked_at` integer,
	`last_success_at` integer,
	`last_error` text,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `project_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`sprint_id` integer,
	`parent_id` integer,
	`source` text DEFAULT 'platform' NOT NULL,
	`external_id` text,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`group_name` text,
	`status` text DEFAULT 'planned' NOT NULL,
	`health` text DEFAULT 'on_track' NOT NULL,
	`assigned_user_id` text,
	`assigned_name` text,
	`planned_start` text,
	`planned_end` text,
	`actual_start` text,
	`actual_end` text,
	`planned_hours` real DEFAULT 0 NOT NULL,
	`raw_json` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sprint_id`) REFERENCES `sprints`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`assigned_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `items_source_external_idx` ON `project_items` (`source`,`external_id`);--> statement-breakpoint
CREATE INDEX `items_project_kind_idx` ON `project_items` (`project_id`,`kind`);--> statement-breakpoint
CREATE INDEX `items_assignee_idx` ON `project_items` (`assigned_user_id`);--> statement-breakpoint
CREATE TABLE `project_members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`allocation_percent` integer DEFAULT 0 NOT NULL,
	`role_name` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_members_unique_idx` ON `project_members` (`project_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source` text DEFAULT 'platform' NOT NULL,
	`external_id` text,
	`code` text,
	`name` text NOT NULL,
	`area` text,
	`manager_name` text,
	`manager_user_id` text,
	`status` text DEFAULT 'planning' NOT NULL,
	`health` text DEFAULT 'on_track' NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`planned_start` text,
	`planned_end` text,
	`actual_start` text,
	`actual_end` text,
	`planned_hours` real DEFAULT 0 NOT NULL,
	`planned_cost` real DEFAULT 0 NOT NULL,
	`actual_cost` real DEFAULT 0 NOT NULL,
	`raw_json` text,
	`synced_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`manager_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_source_external_idx` ON `projects` (`source`,`external_id`);--> statement-breakpoint
CREATE INDEX `projects_status_idx` ON `projects` (`status`,`health`);--> statement-breakpoint
CREATE INDEX `projects_area_idx` ON `projects` (`area`);--> statement-breakpoint
CREATE TABLE `sprints` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`name` text NOT NULL,
	`objective` text,
	`status` text DEFAULT 'planned' NOT NULL,
	`start_date` text,
	`end_date` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sprints_project_idx` ON `sprints` (`project_id`);--> statement-breakpoint
CREATE TABLE `sync_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`provider` text NOT NULL,
	`direction` text DEFAULT 'inbound' NOT NULL,
	`status` text NOT NULL,
	`started_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`finished_at` integer,
	`read_count` integer DEFAULT 0 NOT NULL,
	`written_count` integer DEFAULT 0 NOT NULL,
	`error_count` integer DEFAULT 0 NOT NULL,
	`error_message` text,
	`triggered_by` text,
	FOREIGN KEY (`triggered_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sync_runs_provider_started_idx` ON `sync_runs` (`provider`,`started_at`);--> statement-breakpoint
CREATE TABLE `time_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`item_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`activity` text,
	`status` text DEFAULT 'running' NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`paused_seconds` integer DEFAULT 0 NOT NULL,
	`total_minutes` integer,
	`source` text DEFAULT 'timer' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `project_items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `time_entries_user_status_idx` ON `time_entries` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `time_entries_project_idx` ON `time_entries` (`project_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`role` text DEFAULT 'keyuser' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`last_seen_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);