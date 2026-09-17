const request = require('supertest');
const path = require('path');

// Use a test database so we don't pollute production data
process.env.DB_PATH = path.join(__dirname, '..', 'data', 'test-neon-runner.db');
process.env.NODE_ENV = 'test';
// Bypass rate limiting for most tests (rate-limit describe re-enables it)
process.env.SKIP_RATE_LIMIT = 'true';

const app = require('../server');
const { db } = require('../database/db');

const validScorePayload = {
  playerName: 'TestPlayer',
  score: 1000,
  stats: {
    playtime_seconds: 30,
    total_jumps: 10,
    total_dashes: 5,
    obstacles_avoided: 8,
    death_reason: 'ground_drone',
    powerups_collected: 2,
  },
};

afterAll(() => {
  // Clean up test database entries created during tests
  try {
    db.exec('DELETE FROM scores WHERE player_name LIKE "TEST%"');
    db.exec('DELETE FROM players WHERE name LIKE "TEST%"');
  } catch (e) {}
});

// ─── POST /api/score ─────────────────────────────────────────────────────────

describe('POST /api/score', () => {
  test('returns 400 when playerName is missing', async () => {
    const res = await request(app).post('/api/score').send({ score: 500 });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  test('returns 400 when score is negative', async () => {
    const res = await request(app)
      .post('/api/score')
      .send({ playerName: 'TestA', score: -1 });
    expect(res.status).toBe(400);
  });

  test('returns 400 when playerName exceeds 20 characters', async () => {
    const res = await request(app)
      .post('/api/score')
      .send({ playerName: 'A'.repeat(21), score: 100 });
    expect(res.status).toBe(400);
  });

  test('returns 200 with valid data and success:true with playerId', async () => {
    const res = await request(app).post('/api/score').send(validScorePayload);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.playerId).toBeDefined();
    expect(typeof res.body.playerId).toBe('number');
    expect(res.body.rank).toBeGreaterThanOrEqual(1);
    expect(res.body.playerStats).toBeDefined();
    expect(typeof res.body.playerStats.high_score).toBe('number');
    expect(typeof res.body.playerStats.total_games).toBe('number');
    expect(typeof res.body.playerStats.average_score).toBe('number');
  });

  test('submitting again for same player updates their stats', async () => {
    // First submission already done above, submit higher score
    const second = await request(app).post('/api/score').send({
      ...validScorePayload,
      score: 2000,
    });
    expect(second.status).toBe(200);
    expect(second.body.success).toBe(true);
    expect(second.body.playerStats.high_score).toBe(2000);
    expect(second.body.playerStats.total_games).toBeGreaterThanOrEqual(2);
  });

  test('returns 400 when playerName contains special characters', async () => {
    const res = await request(app)
      .post('/api/score')
      .send({ playerName: '<script>', score: 100 });
    expect(res.status).toBe(400);
  });
});

// ─── GET /api/leaderboard ─────────────────────────────────────────────────────

describe('GET /api/leaderboard', () => {
  beforeAll(async () => {
    // Seed a known high-score entry for ordering tests
    await request(app)
      .post('/api/score')
      .send({ playerName: 'TestLB', score: 9999, stats: {} });
  });

  test('returns 200 with scores array', async () => {
    const res = await request(app).get('/api/leaderboard');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.scores)).toBe(true);
  });

  test('scores are ordered by score descending', async () => {
    const res = await request(app).get('/api/leaderboard?limit=50');
    expect(res.status).toBe(200);
    const scores = res.body.scores;
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i - 1].score).toBeGreaterThanOrEqual(scores[i].score);
    }
  });

  test('respects limit param — default is 10', async () => {
    const res = await request(app).get('/api/leaderboard');
    expect(res.status).toBe(200);
    expect(res.body.scores.length).toBeLessThanOrEqual(10);
  });

  test('respects limit param when explicitly set', async () => {
    const res = await request(app).get('/api/leaderboard?limit=2');
    expect(res.status).toBe(200);
    expect(res.body.scores.length).toBeLessThanOrEqual(2);
  });

  test('returns 400 if limit exceeds 50', async () => {
    const res = await request(app).get('/api/leaderboard?limit=51');
    expect(res.status).toBe(400);
  });

  test('returns total_players count', async () => {
    const res = await request(app).get('/api/leaderboard');
    expect(typeof res.body.total_players).toBe('number');
    expect(res.body.total_players).toBeGreaterThanOrEqual(0);
  });
});

// ─── GET /api/stats ──────────────────────────────────────────────────────────

describe('GET /api/stats', () => {
  test('returns 200', async () => {
    const res = await request(app).get('/api/stats');
    expect(res.status).toBe(200);
  });

  test('response has total_games, total_score, total_playtime properties', async () => {
    const res = await request(app).get('/api/stats');
    expect(typeof res.body.total_games).toBe('number');
    expect(typeof res.body.total_score).toBe('number');
    expect(typeof res.body.total_playtime).toBe('number');
  });

  test('response has average_score property', async () => {
    const res = await request(app).get('/api/stats');
    expect(typeof res.body.average_score).toBe('number');
  });

  test('total_games is non-negative', async () => {
    const res = await request(app).get('/api/stats');
    expect(res.body.total_games).toBeGreaterThanOrEqual(0);
  });
});

// ─── GET /api/players/:id ────────────────────────────────────────────────────

describe('GET /api/players/:id', () => {
  let createdPlayerId;

  beforeAll(async () => {
    const res = await request(app).post('/api/score').send({
      playerName: 'TestPROFILE',
      score: 3000,
      stats: {
        playtime_seconds: 45,
        total_jumps: 20,
        total_dashes: 8,
        obstacles_avoided: 15,
        death_reason: 'flying_drone',
        powerups_collected: 3,
      },
    });
    createdPlayerId = res.body.playerId;
  });

  test('returns 404 for non-existent player ID', async () => {
    const res = await request(app).get('/api/players/999999');
    expect(res.status).toBe(404);
  });

  test('returns 200 with player data after submitting a score', async () => {
    const res = await request(app).get(`/api/players/${createdPlayerId}`);
    expect(res.status).toBe(200);
    expect(res.body.player).toBeDefined();
    expect(res.body.player.id).toBe(createdPlayerId);
  });

  test('response includes scores array', async () => {
    const res = await request(app).get(`/api/players/${createdPlayerId}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.scores)).toBe(true);
    expect(res.body.scores.length).toBeGreaterThan(0);
  });

  test('returns 400 for non-numeric player id', async () => {
    const res = await request(app).get('/api/players/abc');
    expect(res.status).toBe(400);
  });

  test('returns 400 for player id of zero', async () => {
    const res = await request(app).get('/api/players/0');
    expect(res.status).toBe(400);
  });
});

// ─── Game sessions, accounts, and paginated leaderboard ──────────────────────

describe('Game sessions and account foundation', () => {
  test('creates and finishes a guest session once', async () => {
    const created = await request(app).post('/api/game-sessions').send({});
    expect(created.status).toBe(201);
    expect(created.body.sessionToken).toMatch(/^[a-f0-9]{64}$/);

    const finished = await request(app).post(`/api/game-sessions/${created.body.id}/finish`).send({
      sessionToken: created.body.sessionToken,
      score: 100,
      durationMs: 10000,
      displayName: 'Guest Tester',
    });
    expect(finished.status).toBe(200);
    expect(finished.body.validationStatus).toBe('valid');

    const duplicate = await request(app).post(`/api/game-sessions/${created.body.id}/finish`).send({
      sessionToken: created.body.sessionToken, score: 100, durationMs: 10000,
    });
    expect(duplicate.status).toBe(409);
  });

  test('rejects unknown sessions, invalid scores, and implausible durations', async () => {
    const unknown = await request(app).post('/api/game-sessions/999999/finish').send({
      sessionToken: 'a'.repeat(64), score: 1, durationMs: 1000,
    });
    expect(unknown.status).toBe(404);

    const malformed = await request(app).post('/api/game-sessions/999999/finish').send({
      sessionToken: { token: 'not-a-token' }, score: 1, durationMs: 1000,
    });
    expect(malformed.status).toBe(404);

    const created = await request(app).post('/api/game-sessions').send({});
    const negative = await request(app).post(`/api/game-sessions/${created.body.id}/finish`).send({
      sessionToken: created.body.sessionToken, score: -1, durationMs: 10000,
    });
    expect(negative.status).toBe(400);

    const short = await request(app).post(`/api/game-sessions/${created.body.id}/finish`).send({
      sessionToken: created.body.sessionToken, score: 1, durationMs: 10,
    });
    expect(short.status).toBe(400);

    const fabricatedDuration = await request(app).post(`/api/game-sessions/${created.body.id}/finish`).send({
      sessionToken: created.body.sessionToken, score: 1, durationMs: 60 * 60 * 1000,
    });
    expect(fabricatedDuration.status).toBe(400);
  });

  test('supports account registration, login, ownership, and private scores', async () => {
    const email = `phase3-${Date.now()}@example.test`;
    const registered = await request(app).post('/api/users/register').send({
      displayName: 'Account Tester', email, password: 'secure-pass-123',
    });
    expect(registered.status).toBe(201);
    expect(registered.body.user.email).toBe(email);

    const login = await request(app).post('/api/users/login').send({ email, password: 'secure-pass-123' });
    expect(login.status).toBe(200);
    const token = login.body.token;
    const session = await request(app).post('/api/game-sessions').set('Authorization', `Bearer ${token}`);
    expect(session.status).toBe(201);

    const ownership = await request(app)
      .post(`/api/game-sessions/${session.body.id}/finish`)
      .send({ sessionToken: session.body.sessionToken, score: 100, durationMs: 10000, displayName: 'Account Tester' });
    expect(ownership.status).toBe(403);

    const finished = await request(app)
      .post(`/api/game-sessions/${session.body.id}/finish`)
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionToken: session.body.sessionToken, score: 100, durationMs: 10000, displayName: 'Account Tester' });
    expect(finished.status).toBe(200);

    const me = await request(app).get('/api/users/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(email);
    const scores = await request(app).get('/api/users/me/scores').set('Authorization', `Bearer ${token}`);
    expect(scores.status).toBe(200);
    expect(Array.isArray(scores.body.scores)).toBe(true);
    expect(scores.body.scores).toHaveLength(1);
  });

  test('leaderboard exposes stable paginated entries without emails', async () => {
    const res = await request(app).get('/api/leaderboard?page=1&pageSize=2');
    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(2);
    expect(Array.isArray(res.body.entries)).toBe(true);
    expect(res.body.entries.length).toBeLessThanOrEqual(2);
    expect(res.body.entries[0]).not.toHaveProperty('email');
  });
});

// ─── Rate limiting ────────────────────────────────────────────────────────────

describe('Rate limiting on POST /api/score', () => {
  beforeAll(() => { process.env.SKIP_RATE_LIMIT = 'false'; });
  afterAll(() => { process.env.SKIP_RATE_LIMIT = 'true'; });

  test('after 10 rapid POST /api/score requests gets 429', async () => {
    // The scoreLimiter allows max 10 per 15-min window.
    // Make 11 requests quickly and expect the last to be rate-limited.
    // Note: previous test suite calls may have already consumed some quota
    // so we fire 15 requests to be sure we hit the 429.
    const results = [];
    for (let i = 0; i < 15; i++) {
      const res = await request(app)
        .post('/api/score')
        .send({ playerName: `RateTest`, score: i * 10, stats: {} });
      results.push(res.status);
    }
    expect(results).toContain(429);
  }, 30000); // allow 30s for sequential requests
});
