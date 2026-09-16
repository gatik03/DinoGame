# NEON RUNNER

A cyberpunk infinite runner game built with HTML5 Canvas, Node.js, and SQLite.

## Screenshots

Screenshots showcase the neon cyberpunk visuals — glowing neon outlines against a dark city skyline, dynamic particle trails, pulsing HUD elements, and vivid color contrasts of electric blue, hot pink, and acid green that define the game's aesthetic.

## Features

- Cyberpunk neon aesthetic with dynamic backgrounds
- Smooth 60fps gameplay with particle effects
- Dual jump, slide, and energy dash mechanics
- 4 powerup types: Shield, Magnet, Slow Motion, Score Multiplier
- 4 enemy types: Ground Drones, Flying Drones, Laser Barriers, Moving Blocks
- Boss battles every 5,000 points with multiple attack patterns
- Achievement system with 10 unlockable achievements
- Global leaderboard with player statistics
- Analytics tracking (jumps, dashes, obstacles avoided, playtime, death reason)
- Mobile touch controls
- Web Audio API sound system
- Day/night cycle environment
- Docker deployment ready

## Controls

| Key | Action |
|-----|--------|
| Space / Tap | Jump (double jump available) |
| Down Arrow | Slide under obstacles |
| Shift | Energy Dash (costs 30 energy) |
| P / Escape | Pause |

## Quick Start

```bash
# Clone and install
git clone <repo>
cd neon-runner
npm install

# Start server
npm start
# Open http://localhost:3000
```

## Docker Deployment

```bash
docker-compose up -d
```

Health check: http://localhost:3000/api/stats

## Architecture

```
neon-runner/
├── server.js           # Express app entry
├── database/db.js      # SQLite setup (better-sqlite3)
├── models/             # Data models (Player, Score, GameStats)
├── routes/             # API route handlers
├── middleware/         # Rate limiting, validation
├── public/             # Static frontend
│   ├── index.html
│   ├── css/main.css
│   └── js/
│       ├── config.js       # Game constants
│       ├── player.js       # Player physics & drawing
│       ├── obstacles.js    # Obstacle management
│       ├── powerups.js     # Powerup & token system
│       ├── boss.js         # Boss battles
│       ├── background.js   # Parallax environment
│       ├── particles.js    # Particle effects
│       ├── achievements.js # Achievement tracking
│       ├── audio.js        # Web Audio sound system
│       ├── ui.js           # Menus and HUD
│       ├── api.js          # Backend API client
│       └── game.js         # Main game loop
├── tests/              # Jest tests
├── Dockerfile
└── docker-compose.yml
```

## API Documentation

Base URL: `http://localhost:3000/api`

### POST /api/score

Submit a game score.

Request body:

```json
{
  "playerName": "PLAYER",
  "score": 5420,
  "stats": {
    "playtime_seconds": 65,
    "total_jumps": 42,
    "total_dashes": 18,
    "obstacles_avoided": 35,
    "death_reason": "ground_drone",
    "powerups_collected": 7
  }
}
```

Response:

```json
{
  "success": true,
  "playerId": 1,
  "rank": 3,
  "playerStats": {
    "high_score": 5420,
    "total_games": 4,
    "average_score": 2850.5
  }
}
```

### GET /api/leaderboard?limit=10

Returns top scores.

### GET /api/stats

Returns global game statistics.

### GET /api/players/:id

Returns player profile and score history.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3000 | Server port |
| NODE_ENV | development | Environment |
| DB_PATH | ./data/neon-runner.db | SQLite path |

## Testing

```bash
npm test
```

Tests cover: API endpoints, rate limiting, game physics, collision detection, achievements.

## Security

- Helmet.js security headers
- Rate limiting: 100 req/15min general, 10 req/15min for score submission
- Input validation and sanitization via express-validator
- No SQL injection possible (parameterized queries via better-sqlite3)

## Developer & Agent Guidelines

For code architecture details, design constraints, and testing procedures for AI agents or contributors, refer to [AGENTS.md](AGENTS.md).

## License

MIT
