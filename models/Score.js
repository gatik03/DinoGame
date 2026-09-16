const { db } = require('../database/db');

class Score {
  static create(data) {
    const { player_id, player_name, score, playtime_seconds = 0, total_jumps = 0,
      total_dashes = 0, obstacles_avoided = 0, death_reason = null, powerups_collected = 0 } = data;

    const result = db.prepare(`
      INSERT INTO scores
        (player_id, player_name, score, playtime_seconds, total_jumps, total_dashes,
         obstacles_avoided, death_reason, powerups_collected)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(player_id, player_name, score, playtime_seconds, total_jumps,
           total_dashes, obstacles_avoided, death_reason, powerups_collected);

    return { id: result.lastInsertRowid, ...data };
  }

  static getTopScores(limit = 10) {
    return db.prepare(`
      SELECT player_name, score, created_at,
             ROW_NUMBER() OVER (ORDER BY score DESC) as rank
      FROM scores
      ORDER BY score DESC
      LIMIT ?
    `).all(limit);
  }

  static getPlayerScores(playerId, limit = 10) {
    return db.prepare(`
      SELECT * FROM scores WHERE player_id = ?
      ORDER BY score DESC LIMIT ?
    `).all(playerId, limit);
  }

  static getPlayerRank(score) {
    const row = db.prepare('SELECT COUNT(*) as cnt FROM scores WHERE score > ?').get(score);
    return (row?.cnt ?? 0) + 1;
  }
}

module.exports = Score;
