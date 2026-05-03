CREATE TABLE `links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`url` text NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer,
	`hash` text NOT NULL,
	`short_code` text NOT NULL,
	`domain` text NOT NULL,
	`attribute` blob,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`is_deleted` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `links_hash` ON `links` (`hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `links_short_code_domain` ON `links` (`short_code`,`domain`);--> statement-breakpoint
CREATE TABLE `pages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`template` text NOT NULL,
	`data` blob NOT NULL,
	`expires_at` integer,
	`hash` text NOT NULL,
	`attribute` blob,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`is_deleted` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pages_hash` ON `pages` (`hash`);