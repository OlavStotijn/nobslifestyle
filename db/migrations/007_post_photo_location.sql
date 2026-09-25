-- Optional photo + free-text location on a post. When a photo is present,
-- the feed renders a 2-slide carousel (photo, then the workout/run stats
-- card) instead of just the stats card.
ALTER TABLE posts ADD COLUMN photo_r2_key TEXT;
ALTER TABLE posts ADD COLUMN location TEXT;
