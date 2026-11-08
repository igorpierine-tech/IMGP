CREATE TABLE `plans` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`max_users` integer DEFAULT 10 NOT NULL,
	`price_monthly` real DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plans_name_unique` ON `plans` (`name`);
--> statement-breakpoint
CREATE TABLE `plan_modules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`plan_id` integer NOT NULL REFERENCES `plans`(`id`) ON DELETE cascade,
	`module_key` text NOT NULL,
	`actions_json` text DEFAULT '["read"]' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plan_modules_plan_module_idx` ON `plan_modules` (`plan_id`,`module_key`);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'trial' NOT NULL,
	`plan_id` integer REFERENCES `plans`(`id`) ON DELETE set null,
	`domain` text,
	`db_file_name` text NOT NULL,
	`settings_json` text,
	`max_users` integer DEFAULT 10 NOT NULL,
	`trial_ends_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tenants_slug_unique` ON `tenants` (`slug`);
--> statement-breakpoint
CREATE INDEX `tenants_status_idx` ON `tenants` (`status`);
--> statement-breakpoint
CREATE UNIQUE INDEX `tenants_domain_idx` ON `tenants` (`domain`);
--> statement-breakpoint
CREATE TABLE `master_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`role` text DEFAULT 'support' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`password_hash` text,
	`password_salt` text,
	`password_iterations` integer DEFAULT 210000 NOT NULL,
	`must_change_password` integer DEFAULT false NOT NULL,
	`failed_login_attempts` integer DEFAULT 0 NOT NULL,
	`locked_until` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`last_seen_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `master_users_email_unique` ON `master_users` (`email`);
--> statement-breakpoint
CREATE TABLE `master_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL REFERENCES `master_users`(`id`) ON DELETE cascade,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `master_sessions_user_expiry_idx` ON `master_sessions` (`user_id`,`expires_at`);
--> statement-breakpoint
CREATE TABLE `tenant_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL REFERENCES `tenants`(`id`) ON DELETE cascade,
	`email` text NOT NULL,
	`external_user_id` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tenant_users_tenant_email_idx` ON `tenant_users` (`tenant_id`,`email`);
--> statement-breakpoint
CREATE INDEX `tenant_users_email_idx` ON `tenant_users` (`email`);
--> statement-breakpoint
CREATE TABLE `master_audit_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`occurred_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`actor_user_id` text,
	`actor_email` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`before_json` text,
	`after_json` text,
	`metadata_json` text
);
--> statement-breakpoint
CREATE INDEX `master_audit_entity_idx` ON `master_audit_events` (`entity_type`,`entity_id`);
--> statement-breakpoint
CREATE INDEX `master_audit_actor_time_idx` ON `master_audit_events` (`actor_user_id`,`occurred_at`);
