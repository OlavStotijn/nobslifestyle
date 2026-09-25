-- NoBSLifestyle.com — full D1 schema (fresh-install reference).
-- Applied via `npm run db:migrate:local` / `db:migrate:remote`.
-- Weight is always stored canonically in kg; `weight_unit` is display-only.

-- ============================================================
-- Auth (Phase 0)
-- ============================================================

CREATE TABLE users (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  email              TEXT    NOT NULL UNIQUE,
  password_hash      TEXT    NOT NULL,
  display_name       TEXT    NOT NULL,
  username           TEXT    UNIQUE,
  avatar_r2_key      TEXT,
  weight_unit        TEXT    NOT NULL DEFAULT 'kg' CHECK (weight_unit IN ('kg','lb')),
  default_landing_page TEXT  NOT NULL DEFAULT 'summary',
  token_version      INTEGER NOT NULL DEFAULT 1,
  email_verified_at  TEXT,
  created_at         TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at         TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_users_username ON users (username);

CREATE TABLE password_reset_tokens (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT    NOT NULL UNIQUE,
  expires_at  TEXT    NOT NULL,
  used_at     TEXT,
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_prt_user ON password_reset_tokens (user_id);

CREATE TABLE email_verification_tokens (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT    NOT NULL UNIQUE,
  expires_at  TEXT    NOT NULL,
  used_at     TEXT,
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_evt_user ON email_verification_tokens (user_id);

-- ============================================================
-- Nutrition profile (Phase 1)
-- ============================================================

CREATE TABLE user_nutrition_profile (
  user_id                  INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  sex                      TEXT    NOT NULL CHECK (sex IN ('male','female')),
  birth_date               TEXT    NOT NULL,
  height_cm                REAL    NOT NULL,
  weight_kg                REAL    NOT NULL,
  activity_level           TEXT    NOT NULL CHECK (activity_level IN ('sedentary','light','moderate','active','very_active')),
  goal                     TEXT    NOT NULL CHECK (goal IN ('lose','maintain','gain')),
  bmr_kcal                 REAL    NOT NULL,
  tdee_kcal                REAL    NOT NULL,
  target_kcal              REAL    NOT NULL,
  target_protein_g         REAL    NOT NULL,
  target_carbs_g           REAL    NOT NULL,
  target_fat_g             REAL    NOT NULL,
  timezone                 TEXT    NOT NULL DEFAULT 'Europe/Amsterdam',
  breakfast_end_time       TEXT    NOT NULL DEFAULT '11:00',
  lunch_end_time           TEXT    NOT NULL DEFAULT '16:00',
  dinner_end_time          TEXT    NOT NULL DEFAULT '21:00',
  onboarding_completed_at  TEXT,
  updated_at               TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- ============================================================
-- Food tracking (Phase 2 / 3)
-- ============================================================

CREATE TABLE food_items (
  id                       INTEGER PRIMARY KEY AUTOINCREMENT,
  barcode                  TEXT    UNIQUE,
  name                     TEXT    NOT NULL,
  brand                    TEXT,
  source                   TEXT    NOT NULL CHECK (source IN ('off','manual','ocr','user')),
  serving_size_g           REAL,
  calories_kcal_per_100g   REAL    NOT NULL,
  protein_g_per_100g       REAL    NOT NULL DEFAULT 0,
  carbs_g_per_100g         REAL    NOT NULL DEFAULT 0,
  fat_g_per_100g           REAL    NOT NULL DEFAULT 0,
  fiber_g_per_100g         REAL,
  sugar_g_per_100g         REAL,
  sodium_mg_per_100g       REAL,
  image_url                TEXT,
  off_last_synced_at       TEXT,
  created_by_user_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at               TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at               TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_food_items_name ON food_items (name COLLATE NOCASE);

CREATE TABLE food_logs (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  food_item_id       INTEGER NOT NULL REFERENCES food_items(id) ON DELETE RESTRICT,
  quantity_g         REAL    NOT NULL,
  calories_kcal      REAL    NOT NULL,
  protein_g          REAL    NOT NULL,
  carbs_g            REAL    NOT NULL,
  fat_g              REAL    NOT NULL,
  meal_type          TEXT    NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
  meal_type_auto     INTEGER NOT NULL DEFAULT 1,
  logged_at          TEXT    NOT NULL,
  logged_date_local  TEXT    NOT NULL,
  source             TEXT    NOT NULL CHECK (source IN ('search','barcode','photo_ocr','manual','quick_repeat')),
  created_at         TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at         TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_food_logs_user_date ON food_logs (user_id, logged_date_local);
CREATE INDEX idx_food_logs_food_item ON food_logs (food_item_id);

-- ============================================================
-- Workouts (Phase 4 / 5)
-- ============================================================

CREATE TABLE exercises (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_user_id  INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name           TEXT    NOT NULL,
  category       TEXT,
  equipment      TEXT,
  image_r2_key   TEXT,
  created_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_exercises_owner ON exercises (owner_user_id);
CREATE INDEX idx_exercises_name ON exercises (name COLLATE NOCASE);

CREATE TABLE workout_schemas (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT    NOT NULL,
  description  TEXT,
  archived_at  TEXT,
  created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_schemas_user ON workout_schemas (user_id, archived_at);

CREATE TABLE schema_exercises (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  schema_id         INTEGER NOT NULL REFERENCES workout_schemas(id) ON DELETE CASCADE,
  exercise_id       INTEGER NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  target_sets       INTEGER NOT NULL,
  target_reps_min   INTEGER NOT NULL,
  target_reps_max   INTEGER NOT NULL,
  target_weight_kg  REAL    NOT NULL,
  notes             TEXT
);
CREATE INDEX idx_schema_exercises_schema ON schema_exercises (schema_id, sort_order);

CREATE TABLE training_sessions (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id                INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  schema_id              INTEGER NOT NULL REFERENCES workout_schemas(id) ON DELETE RESTRICT,
  schema_name_snapshot   TEXT    NOT NULL,
  started_at             TEXT    NOT NULL,
  finished_at            TEXT,
  rating                 INTEGER CHECK (rating BETWEEN 1 AND 5),
  notes                  TEXT,
  progress_summary       TEXT,
  created_at             TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at             TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_sessions_user_started ON training_sessions (user_id, started_at DESC);
CREATE INDEX idx_sessions_schema ON training_sessions (schema_id);

CREATE TABLE session_exercises (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id          INTEGER NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  exercise_id         INTEGER NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
  schema_exercise_id  INTEGER REFERENCES schema_exercises(id) ON DELETE SET NULL,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  target_sets         INTEGER NOT NULL,
  target_reps_min     INTEGER NOT NULL,
  target_reps_max     INTEGER NOT NULL,
  target_weight_kg    REAL    NOT NULL
);
CREATE INDEX idx_session_exercises_session ON session_exercises (session_id, sort_order);
CREATE INDEX idx_session_exercises_exercise ON session_exercises (exercise_id);

CREATE TABLE session_sets (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  session_exercise_id    INTEGER NOT NULL REFERENCES session_exercises(id) ON DELETE CASCADE,
  set_number             INTEGER NOT NULL,
  reps                   INTEGER NOT NULL,
  weight_kg              REAL    NOT NULL,
  weight_change_applied  TEXT    NOT NULL DEFAULT 'none' CHECK (weight_change_applied IN ('none','session_only','permanent')),
  created_at             TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_session_sets_exercise ON session_sets (session_exercise_id, set_number);

-- ============================================================
-- Social (Phase 6)
-- ============================================================

CREATE TABLE friendships (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  requester_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status        TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','blocked')),
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  responded_at  TEXT,
  UNIQUE (requester_id, addressee_id)
);
CREATE INDEX idx_friendships_addressee ON friendships (addressee_id, status);
CREATE INDEX idx_friendships_requester ON friendships (requester_id, status);

CREATE TABLE posts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id  INTEGER NOT NULL UNIQUE REFERENCES training_sessions(id) ON DELETE CASCADE,
  caption     TEXT,
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_posts_user_created ON posts (user_id, created_at DESC);

CREATE TABLE post_likes (
  post_id     INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (post_id, user_id)
);

-- ============================================================
-- Progress photos (Phase 7)
-- ============================================================

CREATE TABLE progress_photos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  r2_key      TEXT    NOT NULL,
  taken_at    TEXT    NOT NULL,
  weight_kg   REAL,
  notes       TEXT,
  visibility  TEXT    NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','friends')),
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_progress_photos_user ON progress_photos (user_id, taken_at DESC);
