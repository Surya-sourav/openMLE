CREATE TABLE `connections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`connector` text NOT NULL,
	`type` text NOT NULL,
	`creds` text,
	`isdefault` integer,
	`isValid` integer,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE INDEX `connections_connector` ON `connections` (`connector`);
--> statement-breakpoint
CREATE INDEX `idx_connections_default` ON `connections` (`isdefault`);
--> statement-breakpoint
CREATE INDEX `idx_connections_valid` ON `connections` (`isValid`);
