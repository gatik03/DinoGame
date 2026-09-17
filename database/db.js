const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(DATA_DIR, 'neon-runner.db');

const configuredDir = path.dirname(DB_PATH);
if (!fs.existsSync(configuredDir)) fs.mkdirSync(configuredDir, { recursive: true });

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      total_games INTEGER DEFAULT 0,
      total_score INTEGER DEFAULT 0,
      high_score INTEGER DEFAULT 0,
      best_run_date DATETIME,
      average_score REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER,
      player_name TEXT NOT NULL,
      score INTEGER NOT NULL,
      playtime_seconds INTEGER DEFAULT 0,
      total_jumps INTEGER DEFAULT 0,
      total_dashes INTEGER DEFAULT 0,
      obstacles_avoided INTEGER DEFAULT 0,
      death_reason TEXT,
      powerups_collected INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (player_id) REFERENCES players(id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      display_name TEXT NOT NULL,
      email TEXT UNIQUE,
      password_hash TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS game_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      session_token_hash TEXT NOT NULL UNIQUE,
      started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'finished', 'rejected')),
      initial_speed REAL NOT NULL DEFAULT 5,
      final_score INTEGER,
      duration_ms INTEGER,
      validation_status TEXT NOT NULL DEFAULT 'valid' CHECK (validation_status IN ('valid', 'suspicious', 'rejected')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS auth_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS game_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total_games INTEGER DEFAULT 0,
      total_score INTEGER DEFAULT 0,
      total_playtime INTEGER DEFAULT 0,
      total_jumps INTEGER DEFAULT 0,
      total_dashes INTEGER DEFAULT 0,
      obstacles_avoided INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Add session/validation fields to databases created by earlier versions.
  const columns = db.prepare('PRAGMA table_info(scores)').all().map((column) => column.name);
  const migrations = [
    ['game_session_id', 'INTEGER'],
    ['user_id', 'INTEGER'],
    ['duration_ms', 'INTEGER DEFAULT 0'],
    ['validation_status', "TEXT NOT NULL DEFAULT 'valid'"],
    ['suspicious', 'INTEGER NOT NULL DEFAULT 0'],
  ];
  for (const [name, definition] of migrations) {
    if (!columns.includes(name)) db.exec(`ALTER TABLE scores ADD COLUMN ${name} ${definition}`);
  }

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_scores_score_created ON scores (score DESC, created_at ASC, id ASC);
    CREATE INDEX IF NOT EXISTS idx_scores_player_id ON scores (player_id);
    CREATE INDEX IF NOT EXISTS idx_scores_user_id ON scores (user_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_scores_one_per_session ON scores (game_session_id) WHERE game_session_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON game_sessions (user_id);
    CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON game_sessions (status);
    CREATE INDEX IF NOT EXISTS idx_game_sessions_token_hash ON game_sessions (session_token_hash);
    CREATE INDEX IF NOT EXISTS idx_auth_tokens_hash ON auth_tokens (token_hash);
  `);

  // Insert initial game_stats row if none exists
  const existing = db.prepare('SELECT id FROM game_stats LIMIT 1').get();
  if (!existing) {
    db.prepare(`
      INSERT INTO game_stats (total_games, total_score, total_playtime, total_jumps, total_dashes, obstacles_avoided)
      VALUES (0, 0, 0, 0, 0, 0)
    `).run();
  }
}

module.exports = { db, initDatabase };
