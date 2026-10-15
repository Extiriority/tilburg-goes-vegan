ALTER TABLE `walk_in_guests` ADD `role` text DEFAULT 'guest' NOT NULL;--> statement-breakpoint
ALTER TABLE `walk_in_guests` ADD `chef_cost_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `walk_in_guests` ADD `chef_reimbursed_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `walk_in_guests` ADD `chef_cost_recorded_at` integer;--> statement-breakpoint
DROP VIEW confirmed_participants;
--> statement-breakpoint
CREATE VIEW confirmed_participants AS SELECT id,event_id,role,status,1+extra_guests AS seats FROM registrations WHERE status='confirmed' UNION ALL SELECT id,event_id,role,status,1+extra_guests FROM walk_in_guests WHERE status='confirmed';
--> statement-breakpoint
CREATE TRIGGER walk_in_role_insert BEFORE INSERT ON walk_in_guests BEGIN
 SELECT CASE WHEN NEW.role NOT IN ('guest','helper_chef','chef') OR (NEW.status='confirmed' AND NEW.role IN ('chef','helper_chef') AND (SELECT count(*) FROM confirmed_participants WHERE event_id=NEW.event_id AND role=NEW.role AND id<>NEW.id)>=3) THEN RAISE(ABORT,'walk_in_role_limit') END;
 SELECT CASE WHEN NEW.chef_cost_cents<0 OR NEW.chef_reimbursed_cents<0 OR NEW.chef_cost_cents<>CAST(NEW.chef_cost_cents AS INTEGER) OR NEW.chef_reimbursed_cents<>CAST(NEW.chef_reimbursed_cents AS INTEGER) THEN RAISE(ABORT,'invalid_chef_cost') END;
END;
--> statement-breakpoint
CREATE TRIGGER walk_in_role_update BEFORE UPDATE ON walk_in_guests BEGIN
 SELECT CASE WHEN NEW.role NOT IN ('guest','helper_chef','chef') OR (NEW.status='confirmed' AND NEW.role IN ('chef','helper_chef') AND (SELECT count(*) FROM confirmed_participants WHERE event_id=NEW.event_id AND role=NEW.role AND id<>NEW.id)>=3) THEN RAISE(ABORT,'walk_in_role_limit') END;
 SELECT CASE WHEN NEW.chef_cost_cents<0 OR NEW.chef_reimbursed_cents<0 OR NEW.chef_cost_cents<>CAST(NEW.chef_cost_cents AS INTEGER) OR NEW.chef_reimbursed_cents<>CAST(NEW.chef_reimbursed_cents AS INTEGER) THEN RAISE(ABORT,'invalid_chef_cost') END;
END;
