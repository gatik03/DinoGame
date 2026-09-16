'use strict';

class PowerupManager {
  constructor() {
    this.tokens = [];
    this.powerupItems = [];
    this.tokenTimer = 0;
    this.powerupTimer = 0;
    this.activeEffects = { shield: false, magnet: false, slow: false, multiplier: false };
    this.effectTimers = { shield: 0, magnet: 0, slow: 0, multiplier: 0 };
    this.totalCollected = 0;
  }

  reset() {
    this.tokens = [];
    this.powerupItems = [];
    this.tokenTimer = 0;
    this.powerupTimer = 0;
    this.activeEffects = { shield: false, magnet: false, slow: false, multiplier: false };
    this.effectTimers = { shield: 0, magnet: 0, slow: 0, multiplier: 0 };
    this.totalCollected = 0;
  }

  _spawnToken(gameSpeed) {
    this.tokens.push({
      x: CONFIG.CANVAS.WIDTH + 30,
      y: Utils.randomBetween(CONFIG.CANVAS.GROUND_Y - 140, CONFIG.CANVAS.GROUND_Y - 30),
      r: 9,
      vx: -gameSpeed,
      pulseTime: Math.random() * Math.PI * 2,
    });
  }

  _spawnPowerup(gameSpeed) {
    const types = ['shield', 'magnet', 'slow', 'multiplier'];
    const type = Utils.randomChoice(types);
    this.powerupItems.push({
      x: CONFIG.CANVAS.WIDTH + 30,
      y: Utils.randomBetween(CONFIG.CANVAS.GROUND_Y - 150, CONFIG.CANVAS.GROUND_Y - 50),
      r: 14,
      vx: -gameSpeed * 0.85,
      type,
      pulseTime: Math.random() * Math.PI * 2,
    });
  }

  _typeColor(type) {
    switch (type) {
      case 'shield':     return CONFIG.COLORS.NEON_GREEN;
      case 'magnet':     return CONFIG.COLORS.NEON_YELLOW;
      case 'slow':       return CONFIG.COLORS.NEON_PURPLE;
      case 'multiplier': return CONFIG.COLORS.NEON_ORANGE;
      default:           return CONFIG.COLORS.NEON_CYAN;
    }
  }

  _typeLabel(type) {
    switch (type) {
      case 'shield':     return 'S';
      case 'magnet':     return 'M';
      case 'slow':       return '%';
      case 'multiplier': return '2x';
      default:           return '?';
    }
  }

  update(gameSpeed, dt, player, particles, score) {
    // Token spawning (more frequent at higher scores)
    const tokenInterval = Math.max(60, 120 - Math.floor(score / 200));
    this.tokenTimer++;
    if (this.tokenTimer >= tokenInterval + Utils.randomInt(-15, 15)) {
      this._spawnToken(gameSpeed);
      this.tokenTimer = 0;
    }

    // Powerup spawning every ~450 frames with randomness
    this.powerupTimer++;
    if (this.powerupTimer >= 450 + Utils.randomInt(-80, 80)) {
      this._spawnPowerup(gameSpeed);
      this.powerupTimer = 0;
    }

    const playerHb = player.getHitbox();

    // Update tokens
    for (let i = this.tokens.length - 1; i >= 0; i--) {
      const t = this.tokens[i];
      t.pulseTime += 0.08;

      // Magnet attraction
      if (this.activeEffects.magnet) {
        const dx = player.x - t.x;
        const dy = (player.y - player.height / 2) - t.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 180) {
          const force = 7 / Math.max(dist, 10);
          t.vx += dx * force;
          t.vy = (t.vy || 0) + dy * force;
        }
      }

      t.x += t.vx;
      t.y += (t.vy || 0);
      if (t.vy) t.vy *= 0.9;

      // Collection check
      if (Utils.rectOverlap(playerHb.x, playerHb.y, playerHb.w, playerHb.h, t.x - t.r, t.y - t.r, t.r * 2, t.r * 2)) {
        particles.emitPickup(t.x, t.y, CONFIG.COLORS.NEON_YELLOW);
        if (window.gameInstance && window.gameInstance.audio) window.gameInstance.audio.playPickup();
        this.tokens.splice(i, 1);
        this.totalCollected++;
        if (window.gameInstance) window.gameInstance.tokensCollected++;
        continue;
      }

      if (t.x + t.r < -10) this.tokens.splice(i, 1);
    }

    // Update powerup items
    for (let i = this.powerupItems.length - 1; i >= 0; i--) {
      const p = this.powerupItems[i];
      p.pulseTime += 0.07;
      p.x += p.vx;

      if (Utils.rectOverlap(playerHb.x, playerHb.y, playerHb.w, playerHb.h, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2)) {
        this._activateEffect(p.type, player, particles);
        if (window.gameInstance && window.gameInstance.audio) window.gameInstance.audio.playShieldActivate();
        this.powerupItems.splice(i, 1);
        continue;
      }

      if (p.x + p.r < -10) this.powerupItems.splice(i, 1);
    }

    // Tick effect timers
    for (const type of Object.keys(this.activeEffects)) {
      if (this.activeEffects[type]) {
        this.effectTimers[type] -= dt;
        if (this.effectTimers[type] <= 0) {
          this._deactivateEffect(type, player);
        }
      }
    }
  }

  _activateEffect(type, player, particles) {
    this.activeEffects[type] = true;
    this.effectTimers[type] = CONFIG.POWERUP_DURATION[type];
    if (type === 'shield') player.activateShield();
    if (particles) particles.emit(player.x, player.y - player.height / 2, {
      count: 12, color: this._typeColor(type), speed: 4, life: 30, size: 3,
    });
  }

  _deactivateEffect(type, player) {
    this.activeEffects[type] = false;
    this.effectTimers[type] = 0;
    if (type === 'shield') player.deactivateShield();
  }

  activateEffect(type, player) {
    this._activateEffect(type, player, null);
  }

  getSpeedMultiplier() {
    return this.activeEffects.slow ? 0.5 : 1.0;
  }

  getScoreMultiplier() {
    return this.activeEffects.multiplier ? 2.0 : 1.0;
  }

  draw(ctx) {
    ctx.save();

    // Draw tokens
    for (const t of this.tokens) {
      const pulse = Math.sin(t.pulseTime) * 0.3 + 0.7;
      ctx.shadowColor = CONFIG.COLORS.NEON_YELLOW;
      ctx.shadowBlur = 12 * pulse;
      ctx.fillStyle = CONFIG.COLORS.NEON_YELLOW;
      ctx.globalAlpha = 0.15 * pulse;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r + 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = CONFIG.COLORS.NEON_YELLOW;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      ctx.fill();
      // Coin symbol
      ctx.fillStyle = '#1a1400';
      ctx.shadowBlur = 0;
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', t.x, t.y + 1);
    }

    // Draw powerup items
    for (const p of this.powerupItems) {
      const color = this._typeColor(p.type);
      const pulse = Math.sin(p.pulseTime) * 0.35 + 0.65;

      // Outer glow
      ctx.globalAlpha = 0.18 * pulse;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Body
      ctx.fillStyle = '#050512';
      ctx.shadowColor = color;
      ctx.shadowBlur = 16 * pulse;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();

      // Border
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 8;
      ctx.stroke();

      // Label
      ctx.fillStyle = color;
      ctx.shadowBlur = 10;
      ctx.font = `bold ${p.type === 'multiplier' ? 9 : 11}px 'Orbitron', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this._typeLabel(p.type), p.x, p.y + 1);
    }

    ctx.restore();
  }
}

window.PowerupManager = PowerupManager;
