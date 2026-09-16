const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'neon-runner.db');

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
