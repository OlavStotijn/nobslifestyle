-- Schemas can be shared to friends (visible on your profile, copyable into
-- their own schemas), same private/friends visibility model as progress photos.
ALTER TABLE workout_schemas ADD COLUMN visibility TEXT NOT NULL DEFAULT 'private';
