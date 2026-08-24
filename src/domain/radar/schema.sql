-- RADAR · SQLCipher v1 · device-local only
-- Key lives in Keychain / Keystore, never in this file.

PRAGMA cipher_memory_security = ON;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS kv (
  k TEXT PRIMARY KEY,
  v BLOB NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS identity (
  id TEXT PRIMARY KEY,
  x25519_sk_wrapped BLOB NOT NULL,
  x25519_pk BLOB NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS entitlements (
  product_id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  granted_at INTEGER NOT NULL,
  expires_at INTEGER,
  raw_jws BLOB
);

CREATE TABLE IF NOT EXISTS decks (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  locale TEXT NOT NULL,
  title TEXT NOT NULL,
  is_base INTEGER NOT NULL DEFAULT 1,
  payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('solo', 'passplay', 'room')),
  locale TEXT NOT NULL DEFAULT 'es',
  cycle_step TEXT NOT NULL CHECK (cycle_step IN ('rev', 'aco', 'deb', 'acc', 'rec')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  closed_at INTEGER,
  room_id TEXT,
  title TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS seats (
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  seat INTEGER NOT NULL CHECK (seat BETWEEN 0 AND 5),
  display_name TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL,
  is_local INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (session_id, seat)
);

CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  deck_id TEXT NOT NULL,
  card_key TEXT NOT NULL,
  lane TEXT NOT NULL CHECK (lane IN ('deck', 'hand', 'do', 'later', 'talk', 'drop')),
  seat INTEGER,
  sort_key REAL NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS cards_session_lane ON cards(session_id, lane, sort_key);

CREATE TABLE IF NOT EXISTS agreements (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  due_at INTEGER,
  calendar_event_id TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  kind TEXT NOT NULL,
  detail_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS selfradar_sessions (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  week_from TEXT NOT NULL,
  week_to TEXT NOT NULL,
  scores_json TEXT NOT NULL,
  notes_json TEXT NOT NULL
);
