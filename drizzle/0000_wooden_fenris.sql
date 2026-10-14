CREATE TABLE `admin_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`admin_id` text NOT NULL,
	`session_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`admin_id`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_sessions_session_hash_unique` ON `admin_sessions` (`session_hash`);--> statement-breakpoint
CREATE TABLE `admin_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_users_email_unique` ON `admin_users` (`email`);--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`admin_id` text,
	`event_id` text,
	`action` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`admin_id`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `dish_media` (
	`dish_id` text NOT NULL,
	`media_id` text NOT NULL,
	`position` integer NOT NULL,
	`is_cover` integer DEFAULT false NOT NULL,
	PRIMARY KEY(`dish_id`, `media_id`),
	FOREIGN KEY (`dish_id`) REFERENCES `dishes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `media_assets`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "dish_media_values" CHECK("dish_media"."position" >= 0 AND "dish_media"."is_cover" IN (0,1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dish_media_order` ON `dish_media` (`dish_id`,`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `dish_cover` ON `dish_media` (`dish_id`) WHERE "dish_media"."is_cover" = 1;--> statement-breakpoint
CREATE TABLE `dishes` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`recipe_id` text,
	`published_at` integer NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `email_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`outbox_id` text NOT NULL,
	`attempted_at` integer NOT NULL,
	`outcome_code` text NOT NULL,
	FOREIGN KEY (`outbox_id`) REFERENCES `email_outbox`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `email_outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`idempotency_key` text NOT NULL,
	`event_id` text,
	`registration_id` text,
	`recipient` text,
	`template` text NOT NULL,
	`locale` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`next_attempt_at` integer NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`lease_until` integer,
	`sent_at` integer,
	`purge_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "outbox_values" CHECK("email_outbox"."locale" IN ('en','nl') AND "email_outbox"."status" IN ('pending','sending','sent','failed','purged') AND "email_outbox"."attempts" >= 0 AND (("email_outbox"."status" = 'purged' AND "email_outbox"."recipient" IS NULL) OR ("email_outbox"."status" <> 'purged' AND "email_outbox"."recipient" IS NOT NULL)))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `email_outbox_idempotency_key_unique` ON `email_outbox` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `outbox_due` ON `email_outbox` (`status`,`next_attempt_at`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`occurrence_key` text NOT NULL,
	`slug` text NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`timezone` text DEFAULT 'Europe/Amsterdam' NOT NULL,
	`venue_id` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`capacity` integer NOT NULL,
	`registration_cutoff` integer NOT NULL,
	`meal_allocation` integer,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "event_values" CHECK("events"."capacity" > 0 AND "events"."ends_at" > "events"."starts_at" AND "events"."registration_cutoff" < "events"."starts_at" AND "events"."timezone" = 'Europe/Amsterdam' AND "events"."status" IN ('scheduled','cancelled') AND ("events"."meal_allocation" IS NULL OR ("events"."meal_allocation" >= 0 AND "events"."meal_allocation" <= "events"."capacity")))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `events_occurrence_key_unique` ON `events` (`occurrence_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `events_slug_unique` ON `events` (`slug`);--> statement-breakpoint
CREATE INDEX `events_starts_status` ON `events` (`starts_at`,`status`);--> statement-breakpoint
CREATE TABLE `media_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`r2_key` text NOT NULL,
	`mime_type` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`alt_text` text NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT "image_dimensions" CHECK("media_assets"."width" > 0 AND "media_assets"."height" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `media_assets_r2_key_unique` ON `media_assets` (`r2_key`);--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`admin_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`admin_id`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `password_reset_tokens_token_hash_unique` ON `password_reset_tokens` (`token_hash`);--> statement-breakpoint
CREATE TABLE `privacy_cleanup_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`cutoff` integer NOT NULL,
	`kind` text NOT NULL,
	`affected_rows` integer NOT NULL,
	`completed_at` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "cleanup_kind" CHECK("privacy_cleanup_runs"."kind" IN ('dietary','identity') AND "privacy_cleanup_runs"."affected_rows" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cleanup_once` ON `privacy_cleanup_runs` (`event_id`,`kind`);--> statement-breakpoint
CREATE TABLE `recipe_ingredients` (
	`id` text PRIMARY KEY NOT NULL,
	`recipe_id` text NOT NULL,
	`quantity` text NOT NULL,
	`ingredient` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "ingredient_order" CHECK("recipe_ingredients"."position" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ingredient_position` ON `recipe_ingredients` (`recipe_id`,`position`);--> statement-breakpoint
CREATE TABLE `recipe_media` (
	`recipe_id` text NOT NULL,
	`media_id` text NOT NULL,
	`position` integer NOT NULL,
	`is_cover` integer DEFAULT false NOT NULL,
	PRIMARY KEY(`recipe_id`, `media_id`),
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `media_assets`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "recipe_media_values" CHECK("recipe_media"."position" >= 0 AND "recipe_media"."is_cover" IN (0,1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `recipe_media_order` ON `recipe_media` (`recipe_id`,`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `recipe_cover` ON `recipe_media` (`recipe_id`) WHERE "recipe_media"."is_cover" = 1;--> statement-breakpoint
CREATE TABLE `recipe_steps` (
	`id` text PRIMARY KEY NOT NULL,
	`recipe_id` text NOT NULL,
	`instruction` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "step_order" CHECK("recipe_steps"."position" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `step_position` ON `recipe_steps` (`recipe_id`,`position`);--> statement-breakpoint
CREATE TABLE `recipes` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`category` text NOT NULL,
	`chef_credit` text,
	`created_at` integer NOT NULL,
	`published_at` integer NOT NULL,
	CONSTRAINT "recipe_category" CHECK("recipes"."category" IN ('starter','main','dessert'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `recipes_slug_unique` ON `recipes` (`slug`);--> statement-breakpoint
CREATE TABLE `registration_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`registration_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`revoked_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `registration_tokens_token_hash_unique` ON `registration_tokens` (`token_hash`);--> statement-breakpoint
CREATE TABLE `registrations` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`email_normalized` text,
	`full_name` text,
	`role` text NOT NULL,
	`status` text NOT NULL,
	`language` text NOT NULL,
	`dietary_notes` text,
	`dietary_consent_at` integer,
	`comments` text,
	`anonymized_at` integer,
	`version` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "registration_enums" CHECK("registrations"."role" IN ('guest','helper_chef','chef') AND "registrations"."status" IN ('confirmed','undecided','waiting_list','cancelled') AND "registrations"."language" IN ('en','nl')),
	CONSTRAINT "normalized_email" CHECK("registrations"."email_normalized" IS NULL OR ("registrations"."email_normalized" = lower(trim("registrations"."email_normalized")) AND length("registrations"."email_normalized") > 0)),
	CONSTRAINT "identity_or_anonymous" CHECK(("registrations"."anonymized_at" IS NULL AND "registrations"."email_normalized" IS NOT NULL AND "registrations"."full_name" IS NOT NULL AND length(trim("registrations"."full_name")) > 0) OR ("registrations"."anonymized_at" IS NOT NULL AND "registrations"."email_normalized" IS NULL AND "registrations"."full_name" IS NULL AND "registrations"."comments" IS NULL AND "registrations"."dietary_notes" IS NULL AND "registrations"."dietary_consent_at" IS NULL)),
	CONSTRAINT "dietary_consent" CHECK("registrations"."dietary_notes" IS NULL OR "registrations"."dietary_consent_at" IS NOT NULL)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `active_event_email` ON `registrations` (`event_id`,`email_normalized`) WHERE "registrations"."status" <> 'cancelled' AND "registrations"."email_normalized" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `registrations_event_status_created` ON `registrations` (`event_id`,`status`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `registrations_event_email` ON `registrations` (`event_id`,`email_normalized`);--> statement-breakpoint
CREATE TABLE `scheduled_job_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`idempotency_key` text NOT NULL,
	`event_id` text,
	`operation` text NOT NULL,
	`due_at` integer NOT NULL,
	`completed_at` integer,
	`lease_until` integer,
	`attempts` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scheduled_job_runs_idempotency_key_unique` ON `scheduled_job_runs` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `jobs_due` ON `scheduled_job_runs` (`completed_at`,`due_at`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`default_venue_id` text,
	`default_capacity` integer,
	`organizer_email` text,
	`additional_recipients` text,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`default_venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "singleton_settings" CHECK("settings"."id" = 1),
	CONSTRAINT "positive_default_capacity" CHECK("settings"."default_capacity" IS NULL OR "settings"."default_capacity" > 0)
);
--> statement-breakpoint
CREATE TABLE `venues` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`address` text NOT NULL,
	`created_at` integer NOT NULL
);
