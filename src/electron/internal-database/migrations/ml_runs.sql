CREATE TABLE `ml_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL REFERENCES `ml_projects`(`id`) ON DELETE CASCADE,
	`stage` text NOT NULL DEFAULT 'eda',
	`status` text NOT NULL DEFAULT 'pending',
	`eda_result_json` text,
	`plan_json` text,
	`plan_approved` integer,
	`code_path` text,
	`model_path` text,
	`eval_json` text,
	`report_path` text,
	`error_message` text,
	`started_at` integer,
	`completed_at` integer,
	`created_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_ml_runs_project` ON `ml_runs` (`project_id`);
--> statement-breakpoint
CREATE INDEX `idx_ml_runs_status` ON `ml_runs` (`status`);
