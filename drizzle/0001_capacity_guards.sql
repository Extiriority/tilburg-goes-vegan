CREATE TRIGGER registration_capacity_insert BEFORE INSERT ON registrations BEGIN 
  SELECT CASE WHEN NEW.status = 'confirmed' AND (
    (SELECT count(*) FROM registrations WHERE event_id = NEW.event_id AND status = 'confirmed' AND id <> NEW.id)
      >= (SELECT capacity FROM events WHERE id = NEW.event_id)
    OR ((SELECT meal_allocation FROM events WHERE id = NEW.event_id) IS NOT NULL AND
      (SELECT count(*) FROM registrations WHERE event_id = NEW.event_id AND status = 'confirmed' AND id <> NEW.id)
      >= (SELECT meal_allocation FROM events WHERE id = NEW.event_id))
    OR (NEW.role IN ('chef','helper_chef') AND
      (SELECT count(*) FROM registrations WHERE event_id = NEW.event_id AND status = 'confirmed' AND role = NEW.role AND id <> NEW.id) >= 3)
  ) THEN RAISE(ABORT, 'registration_capacity_exceeded') END;
 END;
--> statement-breakpoint
CREATE TRIGGER registration_capacity_update BEFORE UPDATE OF status, role, event_id ON registrations BEGIN 
  SELECT CASE WHEN NEW.status = 'confirmed' AND (
    (SELECT count(*) FROM registrations WHERE event_id = NEW.event_id AND status = 'confirmed' AND id <> NEW.id)
      >= (SELECT capacity FROM events WHERE id = NEW.event_id)
    OR ((SELECT meal_allocation FROM events WHERE id = NEW.event_id) IS NOT NULL AND
      (SELECT count(*) FROM registrations WHERE event_id = NEW.event_id AND status = 'confirmed' AND id <> NEW.id)
      >= (SELECT meal_allocation FROM events WHERE id = NEW.event_id))
    OR (NEW.role IN ('chef','helper_chef') AND
      (SELECT count(*) FROM registrations WHERE event_id = NEW.event_id AND status = 'confirmed' AND role = NEW.role AND id <> NEW.id) >= 3)
  ) THEN RAISE(ABORT, 'registration_capacity_exceeded') END;
 END;
--> statement-breakpoint
CREATE TRIGGER event_capacity_update BEFORE UPDATE OF capacity, meal_allocation ON events BEGIN
  SELECT CASE WHEN NEW.capacity < (SELECT count(*) FROM registrations WHERE event_id = NEW.id AND status = 'confirmed')
    OR (NEW.meal_allocation IS NOT NULL AND NEW.meal_allocation < (SELECT count(*) FROM registrations WHERE event_id = NEW.id AND status = 'confirmed'))
  THEN RAISE(ABORT, 'event_capacity_below_confirmed') END;
END;
