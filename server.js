const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');

const { initDatabase } = require('./database/db');
const { generalLimiter, scoreLimiter } = require('./middleware/rateLimiter');

const scoresRouter = require('./routes/scores');
const leaderboardRouter = require('./routes/leaderboard');
const statsRouter = require('./routes/stats');
const playersRouter = require('./routes/players');
const gameSessionsRouter = require('./routes/gameSessions');
const usersRouter = require('./routes/users');

// Initialize database before anything else
initDatabase();

const app = express();

// ── Security & utility middleware ──────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      // The import map is static and explicitly hash-approved; all other
      // executable code is served from this origin.
      scriptSrc: ["'self'", "'sha256-lmhS+hS+/jvBzpQH7kzsIdRYKltDJFkeWCHqEdv5wtA='"],
    },
  },
}));
app.use(cors());
app.use(compression());
app.use(morgan('combined'));

// ── Body parsing ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false }));

// ── Rate limiting ──────────────────────────────────────────────────────────────
app.use(generalLimiter);

// ── Static files ───────────────────────────────────────────────────────────────
// Serve installed Three.js modules locally; model loading remains independent
// and can safely fall back when its loader/assets are unavailable.
app.use('/vendor/three/build', express.static(path.join(__dirname, 'node_modules/three/build')));
app.use('/vendor/three/examples', express.static(path.join(__dirname, 'node_modules/three/examples')));
app.use(express.static(path.join(__dirname, 'public')));

// ── API Routes ─────────────────────────────────────────────────────────────────
// Score submission gets its own, stricter rate limiter
app.use('/api/score', scoreLimiter, scoresRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/stats', statsRouter);
app.use('/api/players', playersRouter);
app.use('/api/game-sessions', gameSessionsRouter);
app.use('/api/users', usersRouter);

// ── Health check ───────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 404 handler for unknown API paths ─────────────────────────────────────────
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found.`,
  });
});

// ── Fallback: serve index.html for SPA routes ──────────────────────────────────
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).json({ success: false, error: 'Not found.' });
    }
  });
});

// ── Global error handling middleware ───────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack || err);
  res.status(err.status || 500).json({
    success: false,
    error:
      process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred.'
        : err.message || 'An unexpected error occurred.',
  });
});

// ── Start server ───────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Neon Runner server running on port ${PORT}`);
    console.log(`Game: http://localhost:${PORT}`);
  });
}

module.exports = app;
