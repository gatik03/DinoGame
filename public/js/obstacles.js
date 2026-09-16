'use strict';

class ObstacleManager {
  constructor() {
    this.obstacles = [];
    this.spawnTimer = 0;
    this.spawnInterval = 110;
    this.lastObstacleRightEdge = 0;
  }

  reset() {
    this.obstacles = [];
    this.spawnTimer = 0;
    this.lastObstacleRightEdge = 0;
  }

  _getDifficulty(score) {
    let level = CONFIG.DIFFICULTY[0];
    for (const d of CONFIG.DIFFICULTY) {
      if (score >= d.minScore) level = d;
      else break;
    }
    return level;
  }

  _spawnObstacle(gameSpeed, score) {
    const diff = this._getDifficulty(score);
    const type = Utils.randomChoice(diff.types);
    const startX = CONFIG.CANVAS.WIDTH + 60;

    // Ensure minimum gap from last obstacle
    if (startX < this.lastObstacleRightEdge + diff.minGap) return;

    let obs;
    switch (type) {
      case 'ground':
        obs = this._makeGroundDrone(startX, gameSpeed);
        break;
      case 'flying':
        obs = this._makeFlyingDrone(startX, gameSpeed);
        break;
      case 'block':
        obs = this._makeMovingBlock(startX, gameSpeed);
        break;
      case 'laser':
        obs = this._makeLaserBarrier(startX);
        break;
      default:
        obs = this._makeGroundDrone(startX, gameSpeed);
    }

    if (obs) {
      this.obstacles.push(obs);
      this.lastObstacleRightEdge = startX + (obs.w || 12) + 20;
    }
  }

  _makeGroundDrone(x, speed) {
    return {
      type: 'ground',
      x,
      y: CONFIG.CANVAS.GROUND_Y - 28,
      w: 38,
      h: 28,
      vx: -speed,
      bobTime: Math.random() * Math.PI * 2,
      rotorAngle: 0,
      baseY: CONFIG.CANVAS.GROUND_Y - 28,
    };
  }

  _makeFlyingDrone(x, speed) {
    const baseY = Utils.randomBetween(CONFIG.CANVAS.GROUND_Y - 160, CONFIG.CANVAS.GROUND_Y - 90);
    return {
      type: 'flying',
      x,
      y: baseY,
      w: 34,
      h: 22,
      vx: -speed,
      baseY,
      oscTime: Math.random() * Math.PI * 2,
      oscAmp: Utils.randomBetween(12, 22),
      oscSpeed: Utils.randomBetween(0.03, 0.06),
      rotorAngle: 0,
    };
  }

  _makeMovingBlock(x, speed) {
    const h = Utils.randomInt(30, 60);
    return {
      type: 'block',
      x,
      y: CONFIG.CANVAS.GROUND_Y - h,
      w: Utils.randomInt(22, 42),
      h,
      vx: -speed * 1.2,
      circuitTime: 0,
    };
  }

  _makeLaserBarrier(x) {
    const gapH = Utils.randomInt(70, 95);
    const gapY = Utils.randomBetween(30, CONFIG.CANVAS.GROUND_Y - gapH - 30);
    return {
      type: 'laser',
      x,
      y: 0,
      w: 10,
      h: CONFIG.CANVAS.HEIGHT,
      vx: -6,
      gapY,
      gapH,
      pulseTime: 0,
    };
  }

  update(gameSpeed, score, dt) {
    const diff = this._getDifficulty(score);
    this.spawnInterval = diff.spawnInterval;

    this.spawnTimer++;
    if (this.spawnTimer >= this.spawnInterval + Utils.randomInt(-10, 10)) {
      this._spawnObstacle(gameSpeed, score);
      this.spawnTimer = 0;
    }

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x += obs.vx;

      if (obs.type === 'ground') {
        obs.bobTime += 0.08;
        obs.y = obs.baseY + Math.sin(obs.bobTime) * 4;
        obs.rotorAngle += 0.3;
      } else if (obs.type === 'flying') {
        obs.oscTime += obs.oscSpeed;
        obs.y = obs.baseY + Math.sin(obs.oscTime) * obs.oscAmp;
        obs.rotorAngle += 0.35;
      } else if (obs.type === 'laser') {
        obs.pulseTime += 0.1;
      } else if (obs.type === 'block') {
        obs.circuitTime += 0.05;
      }

      if (obs.x + (obs.w || 10) < -20) {
        this.obstacles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    for (const obs of this.obstacles) {
      ctx.save();
      switch (obs.type) {
        case 'ground': this._drawGroundDrone(ctx, obs); break;
        case 'flying': this._drawFlyingDrone(ctx, obs); break;
        case 'block': this._drawMovingBlock(ctx, obs); break;
        case 'laser': this._drawLaserBarrier(ctx, obs); break;
      }
      ctx.restore();
    }
  }

  _drawGroundDrone(ctx, obs) {
    const cx = obs.x + obs.w / 2;
    const cy = obs.y + obs.h / 2;

    // Rotors
    ctx.strokeStyle = CONFIG.COLORS.NEON_ORANGE;
    ctx.shadowColor = CONFIG.COLORS.NEON_ORANGE;
    ctx.shadowBlur = 8;
    ctx.lineWidth = 2;
    for (let i = 0; i < 2; i++) {
      const rx = obs.x + 6 + i * (obs.w - 12);
      ctx.save();
      ctx.translate(rx, obs.y - 4);
      ctx.rotate(obs.rotorAngle * (i === 0 ? 1 : -1));
      ctx.beginPath();
      ctx.moveTo(-8, 0); ctx.lineTo(8, 0);
      ctx.moveTo(0, -8); ctx.lineTo(0, 8);
      ctx.stroke();
      ctx.restore();
    }

    // Body
    ctx.fillStyle = '#1a0a00';
    ctx.shadowColor = CONFIG.COLORS.NEON_ORANGE;
    ctx.shadowBlur = 14;
    Utils.roundRect(ctx, obs.x, obs.y, obs.w, obs.h, 4);
    ctx.fill();

    // Outline
    ctx.strokeStyle = CONFIG.COLORS.NEON_ORANGE;
    ctx.lineWidth = 1.5;
    Utils.roundRect(ctx, obs.x, obs.y, obs.w, obs.h, 4);
    ctx.stroke();

    // Eye
    ctx.fillStyle = CONFIG.COLORS.NEON_RED;
    ctx.shadowColor = CONFIG.COLORS.NEON_RED;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();

    // Laser beam from eye
    ctx.strokeStyle = `rgba(255,0,68,0.3)`;
    ctx.shadowBlur = 4;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy);
    ctx.lineTo(obs.x - 60, cy);
    ctx.stroke();
  }

  _drawFlyingDrone(ctx, obs) {
    const cx = obs.x + obs.w / 2;
    const cy = obs.y + obs.h / 2;

    // Wing rotors
    ctx.strokeStyle = CONFIG.COLORS.NEON_MAGENTA;
    ctx.shadowColor = CONFIG.COLORS.NEON_MAGENTA;
    ctx.shadowBlur = 8;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 2; i++) {
      const wx = obs.x + i * obs.w;
      const wy = obs.y;
      ctx.save();
      ctx.translate(wx, wy);
      ctx.rotate(obs.rotorAngle * (i === 0 ? 1 : -1));
      ctx.beginPath();
      ctx.moveTo(-9, 0); ctx.lineTo(9, 0);
      ctx.stroke();
      ctx.restore();
    }

    // Body (diamond shape)
    ctx.fillStyle = '#110016';
    ctx.shadowColor = CONFIG.COLORS.NEON_MAGENTA;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(cx, obs.y);
    ctx.lineTo(obs.x + obs.w, cy);
    ctx.lineTo(cx, obs.y + obs.h);
    ctx.lineTo(obs.x, cy);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = CONFIG.COLORS.NEON_MAGENTA;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Core glow
    ctx.fillStyle = CONFIG.COLORS.NEON_MAGENTA;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawMovingBlock(ctx, obs) {
    // Body
    ctx.fillStyle = '#0d001a';
    ctx.shadowColor = CONFIG.COLORS.NEON_RED;
    ctx.shadowBlur = 12;
    ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
    ctx.strokeStyle = CONFIG.COLORS.NEON_RED;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);

    // Circuit pattern
    ctx.strokeStyle = `rgba(255,0,68,0.4)`;
    ctx.lineWidth = 1;
    ctx.shadowBlur = 4;
    const t = Math.sin(obs.circuitTime) * 0.5 + 0.5;
    const cx = obs.x + obs.w / 2;
    ctx.beginPath();
    ctx.moveTo(obs.x + 4, obs.y + obs.h / 2);
    ctx.lineTo(cx, obs.y + obs.h / 2);
    ctx.lineTo(cx, obs.y + 6);
    ctx.stroke();

    // Pulsing dot
    ctx.fillStyle = CONFIG.COLORS.NEON_RED;
    ctx.globalAlpha = 0.5 + t * 0.5;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(cx, obs.y + 6, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  _drawLaserBarrier(ctx, obs) {
    const pulse = Math.sin(obs.pulseTime) * 0.3 + 0.7;

    ctx.shadowColor = CONFIG.COLORS.NEON_RED;
    ctx.shadowBlur = 20 * pulse;

    // Top section
    ctx.fillStyle = `rgba(255,0,68,${0.7 * pulse})`;
    ctx.fillRect(obs.x - 2, 0, obs.w + 4, obs.gapY);

    // Bottom section
    const botY = obs.gapY + obs.gapH;
    ctx.fillRect(obs.x - 2, botY, obs.w + 4, CONFIG.CANVAS.HEIGHT - botY);

    // Bright core
    ctx.fillStyle = `rgba(255,100,120,${pulse})`;
    ctx.fillRect(obs.x + 1, 0, obs.w - 2, obs.gapY);
    ctx.fillRect(obs.x + 1, botY, obs.w - 2, CONFIG.CANVAS.HEIGHT - botY);

    // Gap warning lines
    ctx.strokeStyle = `rgba(255,0,68,${0.4 * pulse})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    for (let dy = 0; dy < obs.gapH; dy += 10) {
      ctx.beginPath();
      ctx.moveTo(obs.x - 20, obs.gapY + dy);
      ctx.lineTo(obs.x, obs.gapY + dy);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  getHitboxes() {
    const boxes = [];
    for (const obs of this.obstacles) {
      if (obs.type === 'laser') {
        if (obs.gapY > 0) {
          boxes.push({ x: obs.x, y: 0, w: obs.w, h: obs.gapY, type: 'laser_barrier' });
        }
        const botY = obs.gapY + obs.gapH;
        if (botY < CONFIG.CANVAS.GROUND_Y + 10) {
          boxes.push({ x: obs.x, y: botY, w: obs.w, h: CONFIG.CANVAS.GROUND_Y - botY + 10, type: 'laser_barrier' });
        }
      } else {
        boxes.push({ x: obs.x, y: obs.y, w: obs.w, h: obs.h, type: obs.type + '_drone' });
      }
    }
    return boxes;
  }
}

window.ObstacleManager = ObstacleManager;
