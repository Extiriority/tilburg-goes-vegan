CREATE TABLE `gathering_dietary` (
	`event_id` text PRIMARY KEY NOT NULL,
	`notes` text,
	`version` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
