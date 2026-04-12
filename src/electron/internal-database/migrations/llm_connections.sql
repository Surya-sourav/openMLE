CREATE TABLE `llmconnections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`provider` text NOT NULL,
	`key` text NOT NULL,
	`model` text NOT NULL,
	`is_default` integer,
	`created_at` integer,
	`updated_at` integer
);
