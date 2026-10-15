ALTER TABLE `recipes` ADD `notes` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `recipes` ADD `youtube_video_id` text;--> statement-breakpoint
ALTER TABLE `recipes` ADD `serving_grams` integer;--> statement-breakpoint
ALTER TABLE `recipes` ADD `calories_kcal` integer;