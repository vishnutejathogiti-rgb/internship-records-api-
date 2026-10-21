-- SQLite schema. The application also creates this table automatically on startup.
CREATE TABLE IF NOT EXISTS internships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 2 AND 120),
  company TEXT NOT NULL CHECK(length(trim(company)) BETWEEN 2 AND 120),
  location TEXT NOT NULL CHECK(length(trim(location)) BETWEEN 2 AND 120),
  mode TEXT NOT NULL CHECK(mode IN ('onsite', 'remote', 'hybrid')),
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'completed', 'cancelled')),
  start_date TEXT NOT NULL,
  end_date TEXT,
  stipend INTEGER NOT NULL DEFAULT 0 CHECK(stipend >= 0),
  description TEXT NOT NULL DEFAULT '',
  application_url TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
