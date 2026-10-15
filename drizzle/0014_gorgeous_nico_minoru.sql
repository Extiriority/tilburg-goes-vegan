-- Retained migration history for the reverted feature; 0015 removes this field.
ALTER TABLE `registrations` ADD `photo_consent_at` integer;
