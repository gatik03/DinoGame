const { db } = require('../database/db');

class Player {
  static create(name) {
    db.prepare('INSERT OR IGNORE INTO players (name) VALUES (?)').run(name);
    return this.findByName(name);
  }

  static findById(id) {
    return db.prepare('SELECT * FROM players WHERE id = ?').get(id);
  }

  static findByName(name) {
    return db.prepare('SELECT * FROM players WHERE name = ?').get(name);
  }

  static updateStats(id, score) {
    const player = this.findById(id);
    if (!player) return null;

    const newTotalGames = player.total_games + 1;
    const newTotalScore = player.total_score + score;
    const newAverage = newTotalScore / newTotalGames;
    const isNewHigh = score > player.high_score;

    db.prepare(`
      UPDATE players SET
        total_games = ?,
        total_score = ?,
        average_score = ?,
        high_score = CASE WHEN ? > high_score THEN ? ELSE high_score END,
        best_run_date = CASE WHEN ? > high_score THEN CURRENT_TIMESTAMP ELSE best_run_date END
      WHERE id = ?
    `).run(newTotalGames, newTotalScore, newAverage, score, score, score, id);

    return this.findById(id);
  }

  static getAll() {
    return db.prepare('SELECT * FROM players ORDER BY high_score DESC LIMIT 100').all();
  }
}

module.exports = Player;
