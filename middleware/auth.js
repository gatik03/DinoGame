const crypto = require('crypto');
const { db } = require('../database/db');
const User = require('../models/User');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function issueToken(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare(`INSERT INTO auth_tokens (user_id, token_hash, expires_at) VALUES (?, ?, datetime('now', '+30 days'))`)
    .run(userId, hashToken(token));
  return token;
}

function optionalAuth(req, _res, next) {
  const header = req.get('authorization') || '';
  const match = header.match(/^Bearer\s+([a-f0-9]{64})$/i);
  req.user = null;
  if (match) {
    const row = db.prepare(`
      SELECT u.* FROM auth_tokens t JOIN users u ON u.id = t.user_id
      WHERE t.token_hash = ? AND t.expires_at > CURRENT_TIMESTAMP
    `).get(hashToken(match[1]));
    if (row) req.user = row;
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  next();
}

module.exports = { issueToken, optionalAuth, requireAuth };
