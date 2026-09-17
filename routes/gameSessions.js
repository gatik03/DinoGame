const express = require('express');
const router = express.Router();
const { GameSession } = require('../models/GameSession');
const Score = require('../models/Score');
const GameStats = require('../models/GameStats');
const { db } = require('../database/db');
const { optionalAuth } = require('../middleware/auth');

const MAX_SCORE_PER_SECOND = 30;
const getToken = (req) => req.body?.sessionToken || req.get('x-session-token');

router.post('/', optionalAuth, (req, res) => {
  try {
    const session = GameSession.create(req.user?.id || null);
    return res.status(201).json({ id: session.id, sessionToken: session.token, status: 'active' });
  } catch (err) {
    console.error('Session creation error:', err);
    return res.status(500).json({ error: 'Failed to create game session' });
  }
});

router.post('/:id/finish', optionalAuth, (req, res) => {
  const session = GameSession.find(req.params.id, getToken(req));
  if (!session) return res.status(404).json({ error: 'Game session not found' });
  if (session.user_id && session.user_id !== req.user?.id) return res.status(403).json({ error: 'Game session ownership mismatch' });
  if (session.status !== 'active') return res.status(409).json({ error: 'Game session already finished' });

  const score = Number(req.body.score);
  const durationMs = Number(req.body.durationMs);
  if (!Number.isFinite(score) || score < 0 || score > 9999999) return res.status(400).json({ error: 'Score must be a valid non-negative number' });
  if (!Number.isFinite(durationMs) || durationMs < 1000 || durationMs > 24 * 60 * 60 * 1000) return res.status(400).json({ error: 'Duration is not plausible' });
  const maxReportedDuration = GameSession.elapsedMs(session) + 60 * 1000;
  if (durationMs > maxReportedDuration) return res.status(400).json({ error: 'Duration exceeds the server-tracked session age' });

  const suspicious = score > Math.max(30, Math.ceil(durationMs / 1000) * MAX_SCORE_PER_SECOND);
  const validationStatus = suspicious ? 'suspicious' : 'valid';
  let finished;
  try {
    db.transaction(() => {
      finished = GameSession.finish(session.id, {
        status: 'finished', score: Math.floor(score), durationMs: Math.floor(durationMs), validationStatus,
      });
      if (!finished) throw new Error('Game session already finished');

      Score.create({
        player_id: null,
        user_id: session.user_id,
        player_name: (req.body.displayName || 'GUEST').toString().trim().slice(0, 20).toUpperCase() || 'GUEST',
        score: Math.floor(score), playtime_seconds: Math.floor(durationMs / 1000),
        game_session_id: session.id, duration_ms: Math.floor(durationMs), validation_status: validationStatus,
        suspicious: suspicious ? 1 : 0,
      });
      GameStats.update({ score: Math.floor(score), playtime_seconds: Math.floor(durationMs / 1000) });
    })();
  } catch (err) {
    if (err.message === 'Game session already finished') return res.status(409).json({ error: err.message });
    console.error('Game session finish error:', err);
    return res.status(500).json({ error: 'Failed to finish game session' });
  }
  return res.json({ success: true, validationStatus, session: finished });
});

module.exports = router;
