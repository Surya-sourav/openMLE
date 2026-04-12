CREATE TABLE `ml_run_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run_id` integer NOT NULL REFERENCES `ml_runs`(`id`) ON DELETE CASCADE,
	`level` text DEFAULT 'info',
	`message` text NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_ml_run_logs_run` ON `ml_run_logs` (`run_id`);
