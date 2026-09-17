const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Score = require('../models/Score');
const { issueToken, optionalAuth, requireAuth } = require('../middleware/auth');
const crypto = require('crypto');

router.post('/register', (req, res) => {
  const displayName = String(req.body.displayName || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!/^[a-zA-Z0-9 _-]{1,20}$/.test(displayName) || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8 || password.length > 128) {
    return res.status(400).json({ error: 'Display name, email, and an 8-128 character password are required' });
  }
  try {
    const user = User.create({ displayName, email, password });
    return res.status(201).json({ user, token: issueToken(user.id) });
  } catch (err) {
    if (String(err.code).includes('SQLITE_CONSTRAINT')) return res.status(409).json({ error: 'Email is already registered' });
    console.error('User registration error:', err);
    return res.status(500).json({ error: 'Failed to create account' });
  }
});

router.post('/login', (req, res) => {
  const user = User.findByEmail(String(req.body.email || '').trim().toLowerCase());
  if (!user || !User.verifyPassword(user, String(req.body.password || ''))) return res.status(401).json({ error: 'Invalid credentials' });
  return res.json({ user: User.findById(user.id), token: issueToken(user.id) });
});

router.get('/me', optionalAuth, requireAuth, (req, res) => res.json({ user: User.findById(req.user.id) }));

router.post('/logout', optionalAuth, requireAuth, (req, res) => {
  const match = (req.get('authorization') || '').match(/^Bearer\s+([a-f0-9]{64})$/i);
  if (match) {
    const tokenHash = crypto.createHash('sha256').update(match[1]).digest('hex');
    const { db } = require('../database/db');
    db.prepare('DELETE FROM auth_tokens WHERE token_hash = ?').run(tokenHash);
  }
  return res.json({ success: true });
});

router.get('/me/scores', optionalAuth, requireAuth, (req, res) => {
  return res.json({ scores: Score.getUserScores(req.user.id) });
});

module.exports = router;
