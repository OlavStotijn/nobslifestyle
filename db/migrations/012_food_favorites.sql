CREATE TABLE food_favorites (
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  food_item_id  INTEGER NOT NULL REFERENCES food_items(id) ON DELETE CASCADE,
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (user_id, food_item_id)
);
