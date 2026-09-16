const express = require('express');
const router = express.Router();
const GameStats = require('../models/GameStats');

router.get('/', (req, res) => {
  try {
    const stats = GameStats.get();
    if (!stats) {
      return res.json({
        total_games: 0, total_score: 0, total_playtime: 0,
        total_jumps: 0, total_dashes: 0, obstacles_avoided: 0,
        average_score: 0, updated_at: new Date().toISOString(),
      });
    }
    const average_score = stats.total_games > 0
      ? Math.round(stats.total_score / stats.total_games)
      : 0;
    return res.json({ ...stats, average_score });
  } catch (err) {
    console.error('Stats error:', err);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
