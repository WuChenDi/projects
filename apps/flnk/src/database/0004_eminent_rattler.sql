DROP INDEX "account_user_id_idx";--> statement-breakpoint
DROP INDEX "uniq_launchpads_slug";--> statement-breakpoint
DROP INDEX "uniq_links_slug_domain";--> statement-breakpoint
DROP INDEX "idx_links_expires_at";--> statement-breakpoint
DROP INDEX "idx_links_created_at";--> statement-breakpoint
DROP INDEX "session_token_unique";--> statement-breakpoint
DROP INDEX "session_user_id_idx";--> statement-breakpoint
DROP INDEX "uniq_tags_name";--> statement-breakpoint
DROP INDEX "user_email_unique";--> statement-breakpoint
DROP INDEX "verification_identifier_idx";--> statement-breakpoint
ALTER TABLE `launchpads` ALTER COLUMN "config" TO "config" text NOT NULL DEFAULT '{"profile":{},"theme":{"preset":"default","primaryColor":"#4f46e5","buttonShape":"rounded","buttonFill":"solid","buttonShadow":"soft","background":{"type":"gradient","from":"#e0e7ff","to":"#a5b4fc","dir":"b"}},"blocks":[]}';--> statement-breakpoint
CREATE INDEX `account_user_id_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_launchpads_slug` ON `launchpads` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_links_slug_domain` ON `links` (`slug`,`domain`);--> statement-breakpoint
CREATE INDEX `idx_links_expires_at` ON `links` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_links_created_at` ON `links` (`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_user_id_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_tags_name` ON `tags` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);