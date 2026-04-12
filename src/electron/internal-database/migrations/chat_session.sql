CREATE TABLE `chat-sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`created_at` integer,
	`updated_at` integer
);