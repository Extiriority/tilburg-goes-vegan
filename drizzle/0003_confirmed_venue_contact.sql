INSERT INTO venues (id, name, address, created_at) VALUES ('tgv-v39', 'V39', 'Veemarktstraat 39, 5038 CT Tilburg', CAST(strftime('%s', 'now') AS INTEGER) * 1000) ON CONFLICT(id) DO NOTHING;
--> statement-breakpoint
UPDATE settings SET default_venue_id=COALESCE(default_venue_id, 'tgv-v39'), organizer_email=COALESCE(organizer_email, 'tilburg@goesvegan.nl'), updated_at=CAST(strftime('%s', 'now') AS INTEGER) * 1000 WHERE id=1;
