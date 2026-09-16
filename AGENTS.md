# Developer & Agent Guidelines — Neon Runner (dinogame)

## Project Overview
**Neon Runner** is a cyberpunk-themed 2D infinite runner game built with HTML5 Canvas, Node.js (Express), and an embedded SQLite database (`better-sqlite3`). It includes physics-based player movement, obstacle spawning, boss encounters, particle systems, Web Audio effects, powerups, rate-limited REST APIs, global high-score leaderboards, and Docker containerization.

## Architecture & Directory Structure
- `server.js`: Express application configuration, rate limiters, static file serving, and API route mounts.
- `database/db.js`: SQLite connection via `better-sqlite3`, WAL mode pragmas, and automated schema creation (`players`, `scores`, `game_stats`).
- `models/`: Database query abstractions:
  - `Player.js`: Player lookup, creation, and stat calculations.
  - `Score.js`: Score recording and leaderboard retrieval.
  - `GameStats.js`: Global aggregates (total jumps, dashes, obstacles avoided, etc.).
- `routes/`: Express endpoint definitions:
  - `scores.js`: Score submission (`POST /api/score`).
  - `leaderboard.js`: High-score ranking (`GET /api/leaderboard`).
  - `players.js`: Profile and history (`GET /api/players/:id`).
  - `stats.js`: System and game aggregate stats (`GET /api/stats`).
- `middleware/`:
  - `rateLimiter.js`: Global rate limiting (100 req/15min) and score submission rate limiter (10 req/15min).
  - `validator.js`: Express-validator schemas for query params and payloads.
- `public/`: Frontend client assets:
  - `index.html`: Canvas container and UI overlays.
  - `css/main.css`: Cyberpunk styling and animations.
  - `js/`: Modular game engine:
    - `game.js`: Main loop, state machine, and canvas rendering.
    - `player.js`: Player physics, gravity, jumping, sliding, and dashing.
    - `obstacles.js`: Obstacle spawning, hitbox math, and collision detection.
    - `powerups.js`: Shields, magnets, slow-mo, score multipliers.
    - `boss.js`: Boss attack patterns and health logic.
    - `background.js`: Multi-layered parallax scrolling.
    - `particles.js`: Particle emitter for dashes, sparks, and explosions.
    - `audio.js`: Synthesized Web Audio API sound effects.
    - `achievements.js`: Client-side achievement unlocks.
    - `ui.js`: HUD updates and menu transitions.
    - `api.js`: Fetch client communicating with backend endpoints.
- `tests/`:
  - `api.test.js`: Supertest integration tests for backend API routes.
  - `game.test.js`: Jest unit tests for game logic, math, and achievements.
- `Dockerfile` & `docker-compose.yml`: Containerized setup with volume mounting for persistent SQLite storage.
- `DOCKER_HANDBOOK.md`: Comprehensive reference guide on containerizing and orchestrating the game.

## Running & Testing
- Install dependencies: `npm install`
- Start server: `npm start` (defaults to port 3000)
- Dev server with auto-reload: `npm run dev`
- Run test suite: `npm test`
- Docker run: `docker compose up -d`

## Environment Configuration
- Uses `.env.example` as a template:
  - `PORT`: Port for the Express server (default `3000`).
  - `NODE_ENV`: `development` or `production`.
  - `DB_PATH`: SQLite database file path (default `./data/neon-runner.db`).

## Important Constraints for AI Agents
1. **SQLite Concurrency & WAL Mode**: SQLite runs in WAL mode (`db.pragma('journal_mode = WAL')`). Do not commit database journal files (`.db-wal`, `.db-shm`) or `.db` files to git.
2. **Deterministic Physics**: Physics formulas in `player.js` and `obstacles.js` are matched by unit tests in `tests/game.test.js`. If you change jump velocities, collision bounding boxes, or gravity constants, run `npm test` to ensure tests remain valid.
3. **API Rate Limiting**: The score submission endpoint is strictly rate-limited (10 requests per 15 minutes per IP). Keep this in mind when writing integration tests or automated test runners.
4. **No External Frontend Frameworks**: The frontend is vanilla ES6 modules with native canvas rendering. Do not bundle heavy frontend frameworks unless specifically requested.
