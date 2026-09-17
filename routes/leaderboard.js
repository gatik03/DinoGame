const express = require('express');
const router = express.Router();
const Score = require('../models/Score');
const Player = require('../models/Player');
const { validateLeaderboardQuery, handleValidationErrors } = require('../middleware/validator');
const { optionalAuth } = require('../middleware/auth');

router.get('/', optionalAuth, validateLeaderboardQuery, handleValidationErrors, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize) || limit));
    const leaderboard = Score.getLeaderboard(page, pageSize);
    const scores = Score.getTopScores(limit);
    const players = Player.getAll();

    return res.json({
      scores,
      total_players: players.length,
      entries: leaderboard.entries,
      page,
      pageSize,
      total: leaderboard.total,
      myRank: req.user ? Score.getUserRank(req.user.id) : null,
    });
  } catch (err) {
    console.error('Leaderboard error:', err);
    return res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

module.exports = router;
