CREATE TABLE `seo_metadata` (
	`page` text NOT NULL,
	`locale` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	PRIMARY KEY(`page`, `locale`)
);
--> statement-breakpoint
ALTER TABLE `recipes` ADD `meta_description` text;