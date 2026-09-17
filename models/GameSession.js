const crypto = require('crypto');
const { db } = require('../database/db');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

class GameSession {
  static create(userId = null) {
    const token = crypto.randomBytes(32).toString('hex');
    const result = db.prepare(`
      INSERT INTO game_sessions (user_id, session_token_hash, initial_speed)
      VALUES (?, ?, ?)
    `).run(userId, hashToken(token), 5);
    return { id: Number(result.lastInsertRowid), token };
  }

  static find(id, token) {
    if (!Number.isInteger(Number(id)) || typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token)) return null;
    return db.prepare(`
      SELECT * FROM game_sessions
      WHERE id = ? AND session_token_hash = ?
    `).get(Number(id), hashToken(token));
  }

  static elapsedMs(session) {
    const startedAt = Date.parse(`${session.started_at.replace(' ', 'T')}Z`);
    return Number.isFinite(startedAt) ? Math.max(0, Date.now() - startedAt) : 0;
  }

  static findById(id) {
    return db.prepare('SELECT * FROM game_sessions WHERE id = ?').get(Number(id));
  }

  static finish(id, data) {
    const result = db.prepare(`
      UPDATE game_sessions SET
        ended_at = CURRENT_TIMESTAMP,
        status = ?,
        final_score = ?,
        duration_ms = ?,
        validation_status = ?
      WHERE id = ? AND status = 'active'
    `).run(data.status, data.score, data.durationMs, data.validationStatus, Number(id));
    return result.changes === 1 ? this.findById(id) : null;
  }
}

module.exports = { GameSession, hashToken };
