const crypto = require('crypto');
const { db } = require('../database/db');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, expected] = stored.split(':');
  const actual = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}

class User {
  static create({ displayName, email, password }) {
    const result = db.prepare(`
      INSERT INTO users (display_name, email, password_hash) VALUES (?, ?, ?)
    `).run(displayName, email || null, password ? hashPassword(password) : null);
    return this.findById(result.lastInsertRowid);
  }

  static findById(id) {
    return db.prepare('SELECT id, display_name, email, created_at, updated_at FROM users WHERE id = ?').get(Number(id));
  }

  static findByEmail(email) {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  }

  static verifyPassword(user, password) {
    return verifyPassword(password, user?.password_hash);
  }
}

module.exports = User;
