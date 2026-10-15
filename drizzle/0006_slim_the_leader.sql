CREATE TABLE `registration_no_shows` (
	`registration_id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `walk_in_guests` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`full_name` text NOT NULL,
	`status` text NOT NULL,
	`comments` text,
	`limits_overridden` integer DEFAULT false NOT NULL,
	`override_reason` text,
	`version` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "walk_in_values" CHECK(length(trim("walk_in_guests"."full_name"))>0 AND "walk_in_guests"."status" IN ('confirmed','cancelled','no_show') AND "walk_in_guests"."limits_overridden" IN (0,1) AND ("walk_in_guests"."limits_overridden"=0 OR ("walk_in_guests"."override_reason" IS NOT NULL AND length(trim("walk_in_guests"."override_reason"))>0)))
);
--> statement-breakpoint
CREATE INDEX `walk_ins_event_status` ON `walk_in_guests` (`event_id`,`status`);
--> statement-breakpoint
CREATE VIEW confirmed_participants AS SELECT id,event_id,role,status FROM registrations WHERE status='confirmed' UNION ALL SELECT id,event_id,'guest' AS role,status FROM walk_in_guests WHERE status='confirmed';
--> statement-breakpoint
DROP TRIGGER registration_capacity_insert;
--> statement-breakpoint
DROP TRIGGER registration_capacity_update;
--> statement-breakpoint
DROP TRIGGER event_capacity_update;
--> statement-breakpoint
CREATE TRIGGER registration_capacity_insert BEFORE INSERT ON registrations BEGIN 
  SELECT CASE WHEN NEW.status = 'confirmed' AND (
    (SELECT count(*) FROM confirmed_participants WHERE event_id = NEW.event_id AND status = 'confirmed' AND id <> NEW.id)
      >= (SELECT capacity FROM events WHERE id = NEW.event_id)
    OR ((SELECT meal_allocation FROM events WHERE id = NEW.event_id) IS NOT NULL AND
      (SELECT count(*) FROM confirmed_participants WHERE event_id = NEW.event_id AND status = 'confirmed' AND id <> NEW.id)
      >= (SELECT meal_allocation FROM events WHERE id = NEW.event_id))
    OR (NEW.role IN ('chef','helper_chef') AND
      (SELECT count(*) FROM confirmed_participants WHERE event_id = NEW.event_id AND status = 'confirmed' AND role = NEW.role AND id <> NEW.id) >= 3)
  ) THEN RAISE(ABORT, 'registration_capacity_exceeded') END;
 END;
--> statement-breakpoint
CREATE TRIGGER registration_capacity_update BEFORE UPDATE OF status, role, event_id ON registrations BEGIN 
  SELECT CASE WHEN NEW.status = 'confirmed' AND (
    (SELECT count(*) FROM confirmed_participants WHERE event_id = NEW.event_id AND status = 'confirmed' AND id <> NEW.id)
      >= (SELECT capacity FROM events WHERE id = NEW.event_id)
    OR ((SELECT meal_allocation FROM events WHERE id = NEW.event_id) IS NOT NULL AND
      (SELECT count(*) FROM confirmed_participants WHERE event_id = NEW.event_id AND status = 'confirmed' AND id <> NEW.id)
      >= (SELECT meal_allocation FROM events WHERE id = NEW.event_id))
    OR (NEW.role IN ('chef','helper_chef') AND
      (SELECT count(*) FROM confirmed_participants WHERE event_id = NEW.event_id AND status = 'confirmed' AND role = NEW.role AND id <> NEW.id) >= 3)
  ) THEN RAISE(ABORT, 'registration_capacity_exceeded') END;
 END;
--> statement-breakpoint
CREATE TRIGGER event_capacity_update BEFORE UPDATE OF capacity, meal_allocation ON events BEGIN
  SELECT CASE WHEN NEW.capacity < (SELECT count(*) FROM confirmed_participants WHERE event_id = NEW.id AND status = 'confirmed')
    OR (NEW.meal_allocation IS NOT NULL AND NEW.meal_allocation < (SELECT count(*) FROM confirmed_participants WHERE event_id = NEW.id AND status = 'confirmed'))
  THEN RAISE(ABORT, 'event_capacity_below_confirmed') END;
END;

--> statement-breakpoint
CREATE TRIGGER walk_in_capacity_insert BEFORE INSERT ON walk_in_guests BEGIN
SELECT CASE WHEN NEW.status='confirmed' AND ((SELECT count(*) FROM confirmed_participants WHERE event_id=NEW.event_id AND id<>NEW.id)>=(SELECT capacity FROM events WHERE id=NEW.event_id) OR (SELECT count(*) FROM confirmed_participants WHERE event_id=NEW.event_id AND id<>NEW.id)>=(SELECT meal_allocation FROM events WHERE id=NEW.event_id)) THEN RAISE(ABORT,'walk_in_capacity_exceeded') END;
END;

--> statement-breakpoint
CREATE TRIGGER walk_in_capacity_update BEFORE UPDATE OF status,event_id ON walk_in_guests BEGIN
SELECT CASE WHEN NEW.status='confirmed' AND ((SELECT count(*) FROM confirmed_participants WHERE event_id=NEW.event_id AND id<>NEW.id)>=(SELECT capacity FROM events WHERE id=NEW.event_id) OR (SELECT count(*) FROM confirmed_participants WHERE event_id=NEW.event_id AND id<>NEW.id)>=(SELECT meal_allocation FROM events WHERE id=NEW.event_id)) THEN RAISE(ABORT,'walk_in_capacity_exceeded') END;
END;
