-- tcalc: dev config, dev sessions, visit log, event log. No user accounts.
CREATE TABLE config (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE INDEX sessions_expires ON sessions(expires_at);
CREATE TABLE visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  ip TEXT NOT NULL,
  country TEXT,
  city TEXT,
  ua TEXT,
  path TEXT NOT NULL
);
CREATE INDEX visits_ts ON visits(ts DESC);
CREATE INDEX visits_ip ON visits(ip, ts DESC);
CREATE TABLE events (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, level TEXT NOT NULL, msg TEXT NOT NULL);
CREATE INDEX events_ts ON events(ts DESC);
