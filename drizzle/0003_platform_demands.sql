CREATE TABLE `demands` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source` text DEFAULT 'platform' NOT NULL,
	`external_id` text,
	`name` text NOT NULL,
	`area` text NOT NULL,
	`requester_user_id` text,
	`requester_name` text,
	`requester_email` text,
	`stage` text DEFAULT 'Triagem' NOT NULL,
	`objective` text NOT NULL,
	`solution` text DEFAULT '' NOT NULL,
	`benefit` text DEFAULT '' NOT NULL,
	`risk` text DEFAULT '' NOT NULL,
	`estimated_cost` real DEFAULT 0 NOT NULL,
	`estimated_hours` real DEFAULT 0 NOT NULL,
	`impact` text DEFAULT 'Médio' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`requester_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `demands_source_external_idx` ON `demands` (`source`,`external_id`);
--> statement-breakpoint
CREATE INDEX `demands_stage_updated_idx` ON `demands` (`stage`,`updated_at`);
--> statement-breakpoint
CREATE INDEX `demands_requester_idx` ON `demands` (`requester_user_id`);
