const { db } = require('../database/db');

class Score {
  static create(data) {
    const { player_id, user_id = null, player_name, score, playtime_seconds = 0, total_jumps = 0,
      total_dashes = 0, obstacles_avoided = 0, death_reason = null, powerups_collected = 0,
      game_session_id = null, duration_ms = playtime_seconds * 1000,
      validation_status = 'valid', suspicious = 0 } = data;

    const result = db.prepare(`
      INSERT INTO scores
        (player_id, player_name, score, playtime_seconds, total_jumps, total_dashes,
        obstacles_avoided, death_reason, powerups_collected, game_session_id, user_id,
         duration_ms, validation_status, suspicious)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(player_id, player_name, score, playtime_seconds, total_jumps,
           total_dashes, obstacles_avoided, death_reason, powerups_collected,
           game_session_id, user_id, duration_ms, validation_status, suspicious);

    return { id: result.lastInsertRowid, ...data, game_session_id, user_id, duration_ms, validation_status, suspicious };
  }

  static getTopScores(limit = 10) {
    return db.prepare(`
      SELECT player_name, score, created_at,
             ROW_NUMBER() OVER (ORDER BY score DESC, created_at ASC, id ASC) as rank
      FROM scores WHERE validation_status = 'valid'
      ORDER BY score DESC, created_at ASC, id ASC
      LIMIT ?
    `).all(limit);
  }

  static getLeaderboard(page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;
    const entries = db.prepare(`
      SELECT player_name AS displayName, score, created_at AS createdAt,
             ROW_NUMBER() OVER (ORDER BY score DESC, created_at ASC, id ASC) AS rank
      FROM scores WHERE validation_status = 'valid'
      ORDER BY score DESC, created_at ASC, id ASC LIMIT ? OFFSET ?
    `).all(pageSize, offset);
    const total = db.prepare("SELECT COUNT(*) AS count FROM scores WHERE validation_status = 'valid'").get().count;
    return { entries, total };
  }

  static getPlayerScores(playerId, limit = 10) {
    return db.prepare(`
      SELECT * FROM scores WHERE player_id = ?
      ORDER BY score DESC LIMIT ?
    `).all(playerId, limit);
  }

  static getUserScores(userId, limit = 20) {
    return db.prepare('SELECT * FROM scores WHERE user_id = ? ORDER BY score DESC, created_at ASC LIMIT ?')
      .all(userId, limit);
  }

  static getPlayerRank(score) {
    const row = db.prepare('SELECT COUNT(*) as cnt FROM scores WHERE score > ?').get(score);
    return (row?.cnt ?? 0) + 1;
  }
}

module.exports = Score;
