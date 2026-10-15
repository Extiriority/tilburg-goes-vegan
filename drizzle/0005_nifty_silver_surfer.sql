CREATE TABLE `admin_login_limits` (
	`id` integer PRIMARY KEY NOT NULL,
	`window_start` integer NOT NULL,
	`attempts` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `admin_write_receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`applied` integer NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT "admin_write_applied" CHECK("admin_write_receipts"."applied"=1)
);
--> statement-breakpoint
ALTER TABLE `recipes` ADD `version` integer DEFAULT 0 NOT NULL;