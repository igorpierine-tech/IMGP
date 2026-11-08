CREATE TABLE `project_phases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_ref` text NOT NULL,
	`project_name` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`sequence` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_by` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_phases_project_name_idx` ON `project_phases` (`project_ref`,`name`);--> statement-breakpoint
CREATE INDEX `project_phases_project_sequence_idx` ON `project_phases` (`project_ref`,`sequence`);--> statement-breakpoint
CREATE TABLE `user_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`last_seen_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_sessions_user_expiry_idx` ON `user_sessions` (`user_id`,`expires_at`);--> statement-breakpoint
ALTER TABLE `project_items` ADD `phase_id` integer REFERENCES project_phases(id);--> statement-breakpoint
ALTER TABLE `sprints` ADD `phase_id` integer REFERENCES project_phases(id);--> statement-breakpoint
ALTER TABLE `users` ADD `password_hash` text;--> statement-breakpoint
ALTER TABLE `users` ADD `password_salt` text;--> statement-breakpoint
ALTER TABLE `users` ADD `password_iterations` integer DEFAULT 210000 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `password_set_at` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `must_change_password` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `failed_login_attempts` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `locked_until` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `invited_by` text;