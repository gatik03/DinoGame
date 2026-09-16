const express = require('express');
const router = express.Router();
const Player = require('../models/Player');
const Score = require('../models/Score');
const { validatePlayerId, handleValidationErrors } = require('../middleware/validator');

router.get('/:id', validatePlayerId, handleValidationErrors, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const player = Player.findById(id);

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const scores = Score.getPlayerScores(id, 10);

    return res.json({
      player,
      scores,
    });
  } catch (err) {
    console.error('Player fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch player' });
  }
});

module.exports = router;
