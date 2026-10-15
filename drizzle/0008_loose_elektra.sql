ALTER TABLE `registrations` ADD `paid_amount_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `registrations` ADD `extra_guests` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `walk_in_guests` ADD `paid_amount_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `walk_in_guests` ADD `extra_guests` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
DROP TRIGGER registration_capacity_insert;
--> statement-breakpoint
DROP TRIGGER registration_capacity_update;
--> statement-breakpoint
DROP TRIGGER event_capacity_update;
--> statement-breakpoint
DROP TRIGGER walk_in_capacity_insert;
--> statement-breakpoint
DROP TRIGGER walk_in_capacity_update;
--> statement-breakpoint
DROP VIEW confirmed_participants;
--> statement-breakpoint
CREATE VIEW confirmed_participants AS SELECT id,event_id,role,status,1+extra_guests AS seats FROM registrations WHERE status='confirmed' UNION ALL SELECT id,event_id,'guest',status,1+extra_guests FROM walk_in_guests WHERE status='confirmed';
--> statement-breakpoint
CREATE TRIGGER registration_capacity_insert BEFORE INSERT ON registrations BEGIN 
  SELECT CASE WHEN NEW.status = 'confirmed' AND (
    (SELECT COALESCE(sum(seats),0) FROM confirmed_participants WHERE event_id = NEW.event_id AND status = 'confirmed' AND id <> NEW.id)
      + NEW.extra_guests + 1 > (SELECT capacity FROM events WHERE id = NEW.event_id)
    OR ((SELECT meal_allocation FROM events WHERE id = NEW.event_id) IS NOT NULL AND
      (SELECT COALESCE(sum(seats),0) FROM confirmed_participants WHERE event_id = NEW.event_id AND status = 'confirmed' AND id <> NEW.id)
      + NEW.extra_guests + 1 > (SELECT meal_allocation FROM events WHERE id = NEW.event_id))
    OR (NEW.role IN ('chef','helper_chef') AND
      (SELECT count(*) FROM confirmed_participants WHERE event_id = NEW.event_id AND status = 'confirmed' AND role = NEW.role AND id <> NEW.id) >= 3)
  ) THEN RAISE(ABORT, 'registration_capacity_exceeded') END;
 END;
--> statement-breakpoint
CREATE TRIGGER registration_capacity_update BEFORE UPDATE OF status, role, event_id, extra_guests ON registrations BEGIN 
  SELECT CASE WHEN NEW.status = 'confirmed' AND (
    (SELECT COALESCE(sum(seats),0) FROM confirmed_participants WHERE event_id = NEW.event_id AND status = 'confirmed' AND id <> NEW.id)
      + NEW.extra_guests + 1 > (SELECT capacity FROM events WHERE id = NEW.event_id)
    OR ((SELECT meal_allocation FROM events WHERE id = NEW.event_id) IS NOT NULL AND
      (SELECT COALESCE(sum(seats),0) FROM confirmed_participants WHERE event_id = NEW.event_id AND status = 'confirmed' AND id <> NEW.id)
      + NEW.extra_guests + 1 > (SELECT meal_allocation FROM events WHERE id = NEW.event_id))
    OR (NEW.role IN ('chef','helper_chef') AND
      (SELECT count(*) FROM confirmed_participants WHERE event_id = NEW.event_id AND status = 'confirmed' AND role = NEW.role AND id <> NEW.id) >= 3)
  ) THEN RAISE(ABORT, 'registration_capacity_exceeded') END;
 END;
--> statement-breakpoint
CREATE TRIGGER event_capacity_update BEFORE UPDATE OF capacity, meal_allocation ON events BEGIN
  SELECT CASE WHEN NEW.capacity < (SELECT COALESCE(sum(seats),0) FROM confirmed_participants WHERE event_id = NEW.id AND status = 'confirmed')
    OR (NEW.meal_allocation IS NOT NULL AND NEW.meal_allocation < (SELECT COALESCE(sum(seats),0) FROM confirmed_participants WHERE event_id = NEW.id AND status = 'confirmed'))
  THEN RAISE(ABORT, 'event_capacity_below_confirmed') END;
END;

--> statement-breakpoint
CREATE TRIGGER walk_in_capacity_insert BEFORE INSERT ON walk_in_guests BEGIN
SELECT CASE WHEN NEW.status='confirmed' AND ((SELECT COALESCE(sum(seats),0) FROM confirmed_participants WHERE event_id=NEW.event_id AND id<>NEW.id)+NEW.extra_guests+1>(SELECT capacity FROM events WHERE id=NEW.event_id) OR (SELECT COALESCE(sum(seats),0) FROM confirmed_participants WHERE event_id=NEW.event_id AND id<>NEW.id)+NEW.extra_guests+1>(SELECT meal_allocation FROM events WHERE id=NEW.event_id)) THEN RAISE(ABORT,'walk_in_capacity_exceeded') END;
END;

--> statement-breakpoint
CREATE TRIGGER walk_in_capacity_update BEFORE UPDATE OF status,event_id,extra_guests ON walk_in_guests BEGIN
SELECT CASE WHEN NEW.status='confirmed' AND ((SELECT COALESCE(sum(seats),0) FROM confirmed_participants WHERE event_id=NEW.event_id AND id<>NEW.id)+NEW.extra_guests+1>(SELECT capacity FROM events WHERE id=NEW.event_id) OR (SELECT COALESCE(sum(seats),0) FROM confirmed_participants WHERE event_id=NEW.event_id AND id<>NEW.id)+NEW.extra_guests+1>(SELECT meal_allocation FROM events WHERE id=NEW.event_id)) THEN RAISE(ABORT,'walk_in_capacity_exceeded') END;
END;

--> statement-breakpoint
CREATE TRIGGER registrations_group_insert BEFORE INSERT ON registrations BEGIN SELECT CASE WHEN NEW.extra_guests<0 OR NEW.extra_guests>99 OR NEW.extra_guests<>CAST(NEW.extra_guests AS INTEGER) OR NEW.paid_amount_cents<0 OR NEW.paid_amount_cents<>CAST(NEW.paid_amount_cents AS INTEGER) THEN RAISE(ABORT,'invalid_group_or_payment') END; END;

--> statement-breakpoint
CREATE TRIGGER registrations_group_update BEFORE UPDATE ON registrations BEGIN SELECT CASE WHEN NEW.extra_guests<0 OR NEW.extra_guests>99 OR NEW.extra_guests<>CAST(NEW.extra_guests AS INTEGER) OR NEW.paid_amount_cents<0 OR NEW.paid_amount_cents<>CAST(NEW.paid_amount_cents AS INTEGER) THEN RAISE(ABORT,'invalid_group_or_payment') END; END;

--> statement-breakpoint
CREATE TRIGGER walk_in_guests_group_insert BEFORE INSERT ON walk_in_guests BEGIN SELECT CASE WHEN NEW.extra_guests<0 OR NEW.extra_guests>99 OR NEW.extra_guests<>CAST(NEW.extra_guests AS INTEGER) OR NEW.paid_amount_cents<0 OR NEW.paid_amount_cents<>CAST(NEW.paid_amount_cents AS INTEGER) THEN RAISE(ABORT,'invalid_group_or_payment') END; END;

--> statement-breakpoint
CREATE TRIGGER walk_in_guests_group_update BEFORE UPDATE ON walk_in_guests BEGIN SELECT CASE WHEN NEW.extra_guests<0 OR NEW.extra_guests>99 OR NEW.extra_guests<>CAST(NEW.extra_guests AS INTEGER) OR NEW.paid_amount_cents<0 OR NEW.paid_amount_cents<>CAST(NEW.paid_amount_cents AS INTEGER) THEN RAISE(ABORT,'invalid_group_or_payment') END; END;
