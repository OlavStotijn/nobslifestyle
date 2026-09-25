-- A saved meal is a named bundle of food items+quantities that can be
-- logged all at once (e.g. "My breakfast"), instead of searching each item
-- individually every time.
CREATE TABLE saved_meals (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT    NOT NULL,
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_saved_meals_user ON saved_meals (user_id);

CREATE TABLE saved_meal_items (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  saved_meal_id  INTEGER NOT NULL REFERENCES saved_meals(id) ON DELETE CASCADE,
  food_item_id   INTEGER NOT NULL REFERENCES food_items(id) ON DELETE RESTRICT,
  quantity_g     REAL    NOT NULL
);
CREATE INDEX idx_saved_meal_items_meal ON saved_meal_items (saved_meal_id);
