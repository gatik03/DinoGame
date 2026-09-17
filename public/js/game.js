'use strict';

function isDashKey(event) {
  return event.key === 'Shift' || event.code === 'ShiftLeft' || event.code === 'ShiftRight';
}

class Game {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.state = 'menu';
    this.rafHandle = null;
    this.lastTime = 0;

    this.player = null;
    this.obstacleManager = null;
    this.powerupManager = null;
    this.bossManager = null;
    this.background = null;
    this.particles = null;
    this.achievements = null;
    this.audio = null;
    this.ui = null;
    this.visualRenderer = null;
    this.gameSession = null;
    this.gameSessionPromise = null;

    this.score = 0;
    this.highScore = 0;
    this.frameCount = 0;
    this.gameSpeed = CONFIG.GAME.INITIAL_SPEED;

    this.totalJumps = 0;
    this.totalDashes = 0;
    this.obstaclesAvoided = 0;
    this.tokensCollected = 0;
    this.startTime = 0;
    this.deathReason = '';
    this.bossesDefeated = 0;
    this.gamesPlayed = 0;
    this.noHitScore = 0;
    this.gotHit = false;

    this.keys = {};
    this._nameInputShown = false;

    window.mobileInput = {
      jumpPress:  (e) => { e.preventDefault(); this._tryJump(); },
      slideStart: (e) => { e.preventDefault(); this._trySlide(); },
      slideEnd:   (e) => { e.preventDefault(); },
      dashPress:  (e) => { e.preventDefault(); this._tryDash(); },
    };
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  init(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) { console.error('Canvas not found:', canvasId); return; }

    this._resizeCanvas();
    this.ctx = this.canvas.getContext('2d');
    this.visualRenderer = new NeonRenderer(this.canvas);

    this.audio           = new AudioSystem();
    this.particles       = new ParticleSystem();
    this.player          = new Player();
    this.obstacleManager = new ObstacleManager();
    this.powerupManager  = new PowerupManager();
    this.bossManager     = new BossManager();
    this.background      = new Background();
    this.achievements    = new AchievementSystem();
    this.ui              = new UI();

    this.audio.init();
    this.background.init();
    this.achievements.load();
    this.highScore = parseInt(localStorage.getItem('neonRunnerHighScore') || '0', 10);

    this._setupInput();
    this._setupNameInput();
    window.addEventListener('resize', () => this._resizeCanvas());

    this.ui.setScreen('menu');
    this._loop(0);
  }

  _resizeCanvas() {
    const maxW = CONFIG.CANVAS.WIDTH;
    const maxH = CONFIG.CANVAS.HEIGHT;
    const scale = Math.min(window.innerWidth / maxW, window.innerHeight / maxH, 1);
    this.canvas.width  = Math.floor(maxW * scale);
    this.canvas.height = maxH;
    if (this.canvas.width < maxW) {
      this.canvas.style.width  = `${this.canvas.width}px`;
      this.canvas.style.height = `${this.canvas.height}px`;
    } else {
      this.canvas.style.width  = `${maxW}px`;
      this.canvas.style.height = `${maxH}px`;
    }
    this._scale = scale;
    if (this.visualRenderer) this.visualRenderer.resize(maxW, maxH);
  }

  // ─── Input ────────────────────────────────────────────────────────────────

  _setupInput() {
    document.addEventListener('keydown', (e) => {
      const keyId = e.code || e.key;
      if (this.keys[keyId] || e.repeat) return;
      this.keys[keyId] = true;
      this.audio.unlock();

      if (isDashKey(e)) {
        e.preventDefault();
        if (this.state === 'playing') this._tryDash();
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (this.state === 'menu' || this.state === 'gameover') {
            this._startGame();
          } else if (this.state === 'playing') {
            this._tryJump();
          } else if (this.state === 'paused') {
            this._resume();
          }
          break;
        case 'ArrowDown':
        case 'KeyS':
          e.preventDefault();
          if (this.state === 'playing') this._trySlide();
          break;
        case 'KeyP':
        case 'Escape':
          e.preventDefault();
          if (this.state === 'playing') this._pause();
          else if (this.state === 'paused') this._resume();
          break;
      }
    });

    document.addEventListener('keyup', (e) => {
      this.keys[e.code || e.key] = false;
    });

    this.canvas.addEventListener('click', (e) => {
      this.audio.unlock();
      const rect = this.canvas.getBoundingClientRect();
      const scale = CONFIG.CANVAS.WIDTH / rect.width;
      this._handleClick((e.clientX - rect.left) * scale, (e.clientY - rect.top) * scale);
    });

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.audio.unlock();
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const scale = CONFIG.CANVAS.WIDTH / rect.width;
      this._handleClick((touch.clientX - rect.left) * scale, (touch.clientY - rect.top) * scale);
    }, { passive: false });
  }

  _handleClick(x, y) {
    const target = this.ui.getClickTarget(x, y);

    switch (this.ui.screen) {
      case 'menu':
        if (!target || target === 'play') { this._startGame(); break; }
        if (target === 'settings')        { this.ui.setScreen('settings'); break; }
        if (target === 'leaderboard')     { this.ui.setScreen('leaderboard'); break; }
        // Click anywhere on menu outside buttons also starts
        if (!['settings', 'leaderboard', 'credits'].includes(target)) {
          this._startGame();
        }
        break;
      case 'paused':
        if (target === 'resume')   { this._resume(); break; }
        if (target === 'settings') { this.ui.setScreen('settings'); break; }
        if (target === 'mainmenu') { this._goToMenu(); break; }
        break;
      case 'gameover':
        if (target === 'savescore') { this._showNameInput(); break; }
        if (target === 'playagain') { this._startGame(); break; }
        if (target === 'mainmenu')  { this._goToMenu(); break; }
        break;
      case 'settings':
        if (target === 'toggleSound') {
          this.ui.soundOn = !this.ui.soundOn;
          this.audio.setMuted(!this.ui.soundOn);
        } else if (target === 'toggleMusic') {
          this.ui.musicOn = !this.ui.musicOn;
          this.audio.setMusicEnabled(this.ui.musicOn);
        } else if (target === 'back') {
          if (this.state === 'paused') this.ui.setScreen('paused');
          else this.ui.setScreen('menu');
        }
        break;
      case 'leaderboard':
        if (target === 'back') this.ui.setScreen('menu');
        break;
    }
  }

  _setupNameInput() {
    const overlay   = document.getElementById('name-input-overlay');
    const input     = document.getElementById('playerName');
    const submitBtn = document.getElementById('submitScoreBtn');
    const skipBtn   = document.getElementById('skipSubmitBtn');

    if (!overlay) return;

    submitBtn.addEventListener('click', async () => {
      const name = (input.value || '').trim().toUpperCase() || 'PLAYER';
      await this._submitScore(name);
      this._hideNameInput();
    });

    skipBtn.addEventListener('click', () => this._hideNameInput());

    input.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        const name = (input.value || '').trim().toUpperCase() || 'PLAYER';
        await this._submitScore(name);
        this._hideNameInput();
      }
    });
  }

  _showNameInput() {
    const overlay      = document.getElementById('name-input-overlay');
    const scoreDisplay = document.getElementById('final-score-display');
    const input        = document.getElementById('playerName');
    if (!overlay) return;
    if (scoreDisplay) scoreDisplay.textContent = Utils.formatScore(this.score);
    overlay.style.display = 'flex';
    overlay.classList.add('visible');
    if (input) { input.value = ''; setTimeout(() => input.focus(), 50); }
    this._nameInputShown = true;
  }

  _hideNameInput() {
    const overlay = document.getElementById('name-input-overlay');
    if (overlay) {
      overlay.style.display = 'none';
      overlay.classList.remove('visible');
    }
    this._nameInputShown = false;
  }

  async _submitScore(name) {
    const stats = {
      playtime_seconds:  Math.floor((Date.now() - this.startTime) / 1000),
      total_jumps:       this.totalJumps,
      total_dashes:      this.totalDashes,
      obstacles_avoided: this.obstaclesAvoided,
      death_reason:      this.deathReason || 'unknown',
      powerups_collected: this.powerupManager ? this.powerupManager.totalCollected : 0,
    };
    let result;
    if (this.gameSession) {
      const sessionResult = await window.API.finishGameSession(
        this.gameSession,
        Math.floor(this.score),
        Math.max(1000, Date.now() - this.startTime),
        name,
      );
      // Only fall back when the session request failed at the transport layer.
      // HTTP validation/conflict responses must not create a second score.
      result = sessionResult === null
        ? await window.API.submitScore(name, Math.floor(this.score), stats)
        : sessionResult;
    } else {
      result = await window.API.submitScore(name, Math.floor(this.score), stats);
    }
    if (result && result.success) {
      console.log(`Score saved! Rank #${result.rank}`);
    }
  }

  // ─── Game Flow ────────────────────────────────────────────────────────────

  _startGame() {
    this._hideNameInput();
    this.score      = 0;
    this.frameCount = 0;
    this.gameSpeed  = CONFIG.GAME.INITIAL_SPEED;
    this.totalJumps = 0;
    this.totalDashes = 0;
    this.obstaclesAvoided = 0;
    this.tokensCollected  = 0;
    this.deathReason      = '';
    this.bossesDefeated   = 0;
    this.gotHit           = false;
    this.noHitScore       = 0;
    this.startTime        = Date.now();
    this.gameSession = null;
    this.gameSessionPromise = window.API.createGameSession()
      .then((session) => { this.gameSession = session; return session; });

    this.player.reset();
    this.obstacleManager.reset();
    this.powerupManager.reset();
    this.bossManager.reset();
    this.particles.clear();

    this.state = 'playing';
    this.ui.setScreen('playing');
    this.ui.scoreAnimValue = 0;
    this.audio.startMusic();
  }

  _pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.audio.stopMusic();
    this.audio.playPause();
    this.ui.setScreen('paused');
  }

  _resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.ui.setScreen('playing');
    this.audio.startMusic();
  }

  _goToMenu() {
    this.state = 'menu';
    this.audio.stopMusic();
    this.ui.setScreen('menu');
    this._hideNameInput();
  }

  _triggerDeath(reason) {
    this.state = 'gameover';
    this.deathReason = reason;
    this.gotHit = true;
    this.audio.stopMusic();
    this.audio.playDeath();
    this.particles.emitDeath(this.player.x, this.player.y - this.player.height / 2);
    this.gamesPlayed++;

    this.achievements.check({
      score:           Math.floor(this.score),
      jumps:           this.totalJumps,
      dashes:          this.totalDashes,
      tokensCollected: this.tokensCollected,
      playtime:        (Date.now() - this.startTime) / 1000,
      bossesDefeated:  this.bossesDefeated,
      noHitScore:      this.noHitScore,
      gamesPlayed:     this.gamesPlayed,
    });

    this.ui.setScreen('gameover');
    this.ui.scoreAnimValue = 0;
  }

  // ─── Player Actions ───────────────────────────────────────────────────────

  _tryJump() {
    if (this.state !== 'playing' || this.player.dead) return;
    const prevCount = this.player.jumpCount;
    const jumped = this.player.jump();
    if (jumped) {
      this.totalJumps++;
      this.particles.emitJump(this.player.x, this.player.y);
      if (prevCount === 0) this.audio.playJump();
      else this.audio.playDoubleJump();
    }
  }

  _trySlide() {
    if (this.state !== 'playing' || this.player.dead) return;
    this.player.slide();
  }

  _tryDash() {
    if (this.state !== 'playing' || this.player.dead) return;
    const dashed = this.player.dash();
    if (dashed) {
      this.totalDashes++;
      this.particles.emitDash(this.player.x, this.player.y - this.player.height / 2);
      this.audio.playDash();
    }
  }

  // ─── Collision ────────────────────────────────────────────────────────────

  _checkCollisions() {
    if (this.player.dead) return;

    const ph = this.player.getHitbox();

    for (const box of this.obstacleManager.getHitboxes()) {
      if (Utils.rectOverlap(ph.x, ph.y, ph.w, ph.h, box.x, box.y, box.w, box.h)) {
        const died = this.player.hit();
        if (died) {
          this._triggerDeath(box.type.replace(/_/g, ' '));
          return;
        } else {
          this.audio.playShieldHit();
          this.gotHit = true;
        }
      }
    }

    // Mark obstacles that passed the player as avoided
    for (const obs of this.obstacleManager.obstacles) {
      if (!obs._counted && obs.x + (obs.w || 12) < this.player.x - this.player.width) {
        obs._counted = true;
        this.obstaclesAvoided++;
      }
    }
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  _update(dt) {
    if (this.state !== 'playing') return;

    this.frameCount++;

    this.gameSpeed = Math.min(
      CONFIG.GAME.MAX_SPEED,
      CONFIG.GAME.INITIAL_SPEED + this.frameCount * CONFIG.GAME.SPEED_INCREMENT
    );

    const effectiveSpeed = this.gameSpeed * this.powerupManager.getSpeedMultiplier();

    // Score
    this.score += CONFIG.SCORE.PER_FRAME * this.powerupManager.getScoreMultiplier();
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('neonRunnerHighScore', String(Math.floor(this.highScore)));
    }

    if (!this.gotHit) this.noHitScore = Math.floor(this.score);

    this.background.update(effectiveSpeed);
    this.player.update(effectiveSpeed);
    this.obstacleManager.update(effectiveSpeed, Math.floor(this.score), dt);
    this.powerupManager.update(effectiveSpeed, dt, this.player, this.particles, Math.floor(this.score));
    this.bossManager.update(this.player, this.particles, this.powerupManager, this.audio, dt);
    this.particles.update();
    this.achievements.update();

    this._checkCollisions();
    this.bossManager.checkTrigger(Math.floor(this.score));

    // Periodic achievement checks
    if (this.frameCount % 90 === 0) {
      this.achievements.check({
        score:           Math.floor(this.score),
        jumps:           this.totalJumps,
        dashes:          this.totalDashes,
        tokensCollected: this.tokensCollected,
        playtime:        (Date.now() - this.startTime) / 1000,
        bossesDefeated:  this.bossesDefeated,
        noHitScore:      this.noHitScore,
        gamesPlayed:     this.gamesPlayed,
      });
    }
  }

  // ─── Draw ─────────────────────────────────────────────────────────────────

  _getGameState() {
    return {
      score:           Math.floor(this.score),
      highScore:       Math.floor(this.highScore),
      energy:          this.player ? this.player.energy : 0,
      activeEffects:   this.powerupManager ? this.powerupManager.activeEffects : {},
      effectTimers:    this.powerupManager ? this.powerupManager.effectTimers : {},
      bossActive:      this.bossManager ? this.bossManager.active : false,
      boss:            this.bossManager ? this.bossManager.boss : null,
      state:           this.state,
      deathReason:     this.deathReason,
      totalJumps:      this.totalJumps,
      totalDashes:     this.totalDashes,
      tokensCollected: this.tokensCollected,
    };
  }

  _getRenderState() {
    return {
      player: {
        x: this.player.x,
        y: this.player.y,
        width: this.player.width,
        height: this.player.height,
        state: this.player.state,
      },
      obstacles: this.obstacleManager.obstacles.map((obstacle) => ({
        id: obstacle.id,
        x: obstacle.x,
        y: obstacle.y,
        width: obstacle.w || 10,
        height: obstacle.h || 10,
        type: obstacle.type,
      })),
      score: Math.floor(this.score),
      speed: this.gameSpeed,
      gameState: this.state,
    };
  }

  _draw() {
    const ctx = this.ctx;
    const W = CONFIG.CANVAS.WIDTH;
    const H = CONFIG.CANVAS.HEIGHT;

    // Scale ctx to fit canvas element width
    ctx.save();
    if (this.canvas.width < W) {
      ctx.scale(this.canvas.width / W, 1);
    }

    ctx.clearRect(0, 0, W, H);

    this.background.draw(ctx);

    if (this.state !== 'menu') {
      if (!this.visualRenderer?.enabled) this.obstacleManager.draw(ctx);
      else this.obstacleManager.drawLaser(ctx);
      this.powerupManager.draw(ctx);
      this.bossManager.draw(ctx);
      if (!this.visualRenderer?.enabled) this.player.draw(ctx, this.particles);
      this.particles.draw(ctx);
      this.achievements.draw(ctx);
    }

    this.visualRenderer?.render(this._getRenderState());

    const gs = this._getGameState();
    this.ui.update(gs);
    this.ui.draw(ctx, gs);

    ctx.restore();
  }

  // ─── Loop ─────────────────────────────────────────────────────────────────

  _loop(timestamp) {
    const dt = Math.min(timestamp - (this.lastTime || timestamp), 50);
    this.lastTime = timestamp;
    this._update(dt);
    this._draw();
    this.rafHandle = requestAnimationFrame((t) => this._loop(t));
  }
}

// Bootstrap
document.addEventListener('DOMContentLoaded', () => {
  window.gameInstance = new Game();
  window.gameInstance.init('gameCanvas');
});

window.isDashKey = isDashKey;
