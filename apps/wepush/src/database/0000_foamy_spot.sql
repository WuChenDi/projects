CREATE TABLE `custom_dates` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`keyword` text NOT NULL,
	`date` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`is_deleted` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_custom_dates_user_id` ON `custom_dates` (`user_id`);--> statement-breakpoint
CREATE TABLE `festivals` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`date` text NOT NULL,
	`is_lunar` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`is_deleted` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_festivals_user_id` ON `festivals` (`user_id`);--> statement-breakpoint
CREATE TABLE `global_config` (
	`id` integer PRIMARY KEY NOT NULL,
	`wechat_app_id` text DEFAULT '' NOT NULL,
	`wechat_app_secret` text DEFAULT '' NOT NULL,
	`default_wechat_template_id` text DEFAULT '' NOT NULL,
	`max_push_one_minute` integer DEFAULT 5 NOT NULL,
	`sleep_time` integer DEFAULT 65000 NOT NULL,
	`api_timeout` integer DEFAULT 10000 NOT NULL,
	`max_retries` integer DEFAULT 3 NOT NULL,
	`retry_delay` integer DEFAULT 2000 NOT NULL,
	`push_api_token` text DEFAULT '' NOT NULL,
	`cron_enabled` integer DEFAULT false NOT NULL,
	`cron_user_ids` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`is_deleted` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `push_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`trigger` text NOT NULL,
	`status` text NOT NULL,
	`total_count` integer DEFAULT 0 NOT NULL,
	`success_count` integer DEFAULT 0 NOT NULL,
	`failed_count` integer DEFAULT 0 NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`is_deleted` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_push_batches_started_at` ON `push_batches` (`started_at`);--> statement-breakpoint
CREATE TABLE `push_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_id` text NOT NULL,
	`user_id` text NOT NULL,
	`template_code` text NOT NULL,
	`status` text NOT NULL,
	`rendered_title` text DEFAULT '' NOT NULL,
	`rendered_desc` text DEFAULT '' NOT NULL,
	`variable_snapshot` text DEFAULT '{}' NOT NULL,
	`error_message` text,
	`error_payload` text,
	`sent_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`is_deleted` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`batch_id`) REFERENCES `push_batches`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_push_logs_batch_id` ON `push_logs` (`batch_id`);--> statement-breakpoint
CREATE INDEX `idx_push_logs_user_id` ON `push_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_push_logs_sent_at` ON `push_logs` (`sent_at`);--> statement-breakpoint
CREATE TABLE `templates` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`desc` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`is_deleted` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `templates_code_unique` ON `templates` (`code`);--> statement-breakpoint
CREATE INDEX `idx_templates_code` ON `templates` (`code`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`wechat_open_id` text DEFAULT '' NOT NULL,
	`wechat_template_id` text DEFAULT '' NOT NULL,
	`template_code` text DEFAULT '' NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`weather_city_code` text DEFAULT '' NOT NULL,
	`horoscope_date` text,
	`show_color` integer DEFAULT true NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`is_deleted` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_users_template_code` ON `users` (`template_code`);