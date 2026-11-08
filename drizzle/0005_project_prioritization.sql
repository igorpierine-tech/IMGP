ALTER TABLE `projects` ADD `project_prioritized` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `projects` ADD `prioritization_date` text;
--> statement-breakpoint
ALTER TABLE `projects` ADD `approving_director` text;
