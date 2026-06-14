CREATE TABLE `links` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`domain` text DEFAULT '' NOT NULL,
	`url` text NOT NULL,
	`comment` text DEFAULT '' NOT NULL,
	`config` text DEFAULT '{}' NOT NULL,
	`expires_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`is_deleted` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_links_slug_domain` ON `links` (`slug`,`domain`);