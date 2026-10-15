ALTER TABLE `registrations` ADD `chef_cost_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `registrations` ADD `chef_reimbursed_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `registrations` ADD `chef_cost_recorded_at` integer;
--> statement-breakpoint
CREATE TRIGGER registration_chef_cost_insert BEFORE INSERT ON registrations BEGIN SELECT CASE WHEN NEW.chef_cost_cents<0 OR NEW.chef_reimbursed_cents<0 OR NEW.chef_cost_cents<>CAST(NEW.chef_cost_cents AS INTEGER) OR NEW.chef_reimbursed_cents<>CAST(NEW.chef_reimbursed_cents AS INTEGER) THEN RAISE(ABORT,'invalid_chef_cost') END; END;

--> statement-breakpoint
CREATE TRIGGER registration_chef_cost_update BEFORE UPDATE ON registrations BEGIN SELECT CASE WHEN NEW.chef_cost_cents<0 OR NEW.chef_reimbursed_cents<0 OR NEW.chef_cost_cents<>CAST(NEW.chef_cost_cents AS INTEGER) OR NEW.chef_reimbursed_cents<>CAST(NEW.chef_reimbursed_cents AS INTEGER) THEN RAISE(ABORT,'invalid_chef_cost') END; END;
