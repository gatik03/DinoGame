const express = require('express');
const router = express.Router();
const Player = require('../models/Player');
const Score = require('../models/Score');
const GameStats = require('../models/GameStats');
const { scoreLimiter } = require('../middleware/rateLimiter');
const { validateScore, handleValidationErrors } = require('../middleware/validator');

router.post('/', scoreLimiter, validateScore, handleValidationErrors, (req, res) => {
  try {
    const { playerName, score, stats = {} } = req.body;
    const sanitizedName = playerName.trim().toUpperCase();

    // Find or create player
    const player = Player.create(sanitizedName);
    if (!player) {
      return res.status(500).json({ error: 'Failed to create or find player' });
    }

    // Create score record
    const scoreRecord = Score.create({
      player_id: player.id,
      player_name: sanitizedName,
      score: Math.floor(score),
      playtime_seconds: Math.floor(stats.playtime_seconds || 0),
      total_jumps: Math.floor(stats.total_jumps || 0),
      total_dashes: Math.floor(stats.total_dashes || 0),
      obstacles_avoided: Math.floor(stats.obstacles_avoided || 0),
      death_reason: stats.death_reason || null,
      powerups_collected: Math.floor(stats.powerups_collected || 0),
    });

    // Update player aggregate stats
    const updatedPlayer = Player.updateStats(player.id, Math.floor(score));

    // Update global game stats
    GameStats.update({
      score: Math.floor(score),
      playtime_seconds: Math.floor(stats.playtime_seconds || 0),
      total_jumps: Math.floor(stats.total_jumps || 0),
      total_dashes: Math.floor(stats.total_dashes || 0),
      obstacles_avoided: Math.floor(stats.obstacles_avoided || 0),
    });

    // Get rank
    const rank = Score.getPlayerRank(Math.floor(score));

    return res.json({
      success: true,
      playerId: player.id,
      rank,
      playerStats: {
        high_score: updatedPlayer.high_score,
        total_games: updatedPlayer.total_games,
        average_score: Math.round(updatedPlayer.average_score),
      },
    });
  } catch (err) {
    console.error('Score submission error:', err);
    return res.status(500).json({ error: 'Failed to save score' });
  }
});

module.exports = router;
