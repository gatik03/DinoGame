const express = require('express');
const router = express.Router();
const Score = require('../models/Score');
const Player = require('../models/Player');
const { validateLeaderboardQuery, handleValidationErrors } = require('../middleware/validator');

router.get('/', validateLeaderboardQuery, handleValidationErrors, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const scores = Score.getTopScores(limit);
    const players = Player.getAll();

    return res.json({
      scores,
      total_players: players.length,
    });
  } catch (err) {
    console.error('Leaderboard error:', err);
    return res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

module.exports = router;
