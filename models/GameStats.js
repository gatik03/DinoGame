const { db } = require('../database/db');

class GameStats {
  static get() {
    return db.prepare('SELECT * FROM game_stats LIMIT 1').get();
  }

  static update(data) {
    const { playtime_seconds = 0, total_jumps = 0, total_dashes = 0,
      obstacles_avoided = 0, score = 0 } = data;

    db.prepare(`
      UPDATE game_stats SET
        total_games = total_games + 1,
        total_score = total_score + ?,
        total_playtime = total_playtime + ?,
        total_jumps = total_jumps + ?,
        total_dashes = total_dashes + ?,
        obstacles_avoided = obstacles_avoided + ?,
        updated_at = CURRENT_TIMESTAMP
    `).run(score, playtime_seconds, total_jumps, total_dashes, obstacles_avoided);
  }
}

module.exports = GameStats;
