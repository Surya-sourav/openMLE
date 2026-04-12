CREATE TABLE `ml_projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`dataset_id` text NOT NULL,
	`goal` text NOT NULL,
	`status` text NOT NULL DEFAULT 'idle',
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_ml_projects_dataset` ON `ml_projects` (`dataset_id`);
--> statement-breakpoint
CREATE INDEX `idx_ml_projects_status` ON `ml_projects` (`status`);
