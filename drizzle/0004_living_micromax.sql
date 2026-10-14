CREATE TABLE `registration_mutations` (
	`id` text PRIMARY KEY NOT NULL,
	`registration_id` text NOT NULL,
	`version` integer NOT NULL,
	`action` text NOT NULL,
	`applied` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "mutation_applied" CHECK("registration_mutations"."applied"=1),
	CONSTRAINT "mutation_values" CHECK("registration_mutations"."version">0 AND "registration_mutations"."action" IN ('cancel','confirm','details'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mutation_version` ON `registration_mutations` (`registration_id`,`version`);