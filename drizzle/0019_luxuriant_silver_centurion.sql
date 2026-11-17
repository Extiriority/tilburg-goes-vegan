CREATE TABLE `announcements` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`published_at` integer,
	`updated_at` integer NOT NULL,
	`version` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `announcements_published` ON `announcements` (`published_at`);