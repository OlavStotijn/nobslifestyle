-- Distance display unit (km/mi), same pattern as the existing weight_unit
-- column. Validated in the route handler, not a CHECK constraint, for the
-- same ALTER TABLE compatibility reasons as migration 002.
ALTER TABLE users ADD COLUMN distance_unit TEXT NOT NULL DEFAULT 'km';
