CREATE TABLE `multipart_uploads` (
	`file_id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`r2_upload_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`is_deleted` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_multipart_uploads_session_id` ON `multipart_uploads` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_sessions_upload_complete_created_at` ON `sessions` (`upload_complete`,`created_at`);