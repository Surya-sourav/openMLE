CREATE TABLE `messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` integer NOT NULL,
	`request` text NOT NULL,
	`response` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`session_id`) REFERENCES `chat-sessions`(`id`) ON UPDATE no action ON DELETE cascade
);