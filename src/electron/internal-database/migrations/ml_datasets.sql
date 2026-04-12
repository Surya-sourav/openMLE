CREATE TABLE `ml_datasets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`original_name` text NOT NULL,
	`file_path` text NOT NULL,
	`file_size` integer,
	`mime_type` text,
	`row_count` integer,
	`col_count` integer,
	`columns_json` text,
	`inferred_task` text,
	`created_at` integer
);
