const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const configuredPath = process.env.DATABASE_PATH || './data/internships.db';
const dbPath = path.resolve(configuredPath);
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

db.exec(`
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
`);

module.exports = db;
