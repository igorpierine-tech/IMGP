ALTER TABLE `demands` ADD `project_prioritized` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `demands` ADD `prioritization_date` text;
--> statement-breakpoint
ALTER TABLE `demands` ADD `approving_director` text;
