'use strict';

class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  emit(x, y, opts = {}) {
    const count = opts.count || 5;
    const color = opts.color || CONFIG.COLORS.NEON_CYAN;
    const speed = opts.speed || 3;
    const spread = opts.spread !== undefined ? opts.spread : Math.PI * 2;
    const life = opts.life || 40;
    const size = opts.size || 3;
    const baseVx = opts.vx || 0;
    const baseVy = opts.vy || 0;
    const baseAngle = opts.angle !== undefined ? opts.angle : -Math.PI / 2;

    for (let i = 0; i < count; i++) {
      const angle = baseAngle + (Math.random() - 0.5) * spread;
      const s = speed * (0.5 + Math.random() * 0.8);
      this.particles.push({
        x,
        y,
        vx: baseVx + Math.cos(angle) * s,
        vy: baseVy + Math.sin(angle) * s,
        life,
        maxLife: life,
        color,
        size: size * (0.6 + Math.random() * 0.8),
        gravity: opts.gravity !== undefined ? opts.gravity : 0.1,
        fade: opts.fade !== undefined ? opts.fade : true,
      });
    }
  }

  emitPlayerTrail(x, y) {
    if (Math.random() > 0.4) return;
    this.particles.push({
      x: x - 8 + Math.random() * 6,
      y: y + 10 + Math.random() * 8,
      vx: -1 - Math.random(),
      vy: (Math.random() - 0.5) * 0.5,
      life: 14,
      maxLife: 14,
      color: Math.random() > 0.5 ? CONFIG.COLORS.NEON_CYAN : CONFIG.COLORS.NEON_MAGENTA,
      size: 1.5 + Math.random() * 1.5,
      gravity: 0,
      fade: true,
    });
  }

  emitDash(x, y) {
    for (let i = 0; i < 10; i++) {
      const angle = (Math.random() - 0.5) * Math.PI * 0.6 + Math.PI;
      const s = 4 + Math.random() * 6;
      this.particles.push({
        x: x - 10 + Math.random() * 20,
        y: y - 10 + Math.random() * 20,
        vx: Math.cos(angle) * s,
        vy: Math.sin(angle) * s,
        life: 20,
        maxLife: 20,
        color: i % 2 === 0 ? CONFIG.COLORS.NEON_CYAN : CONFIG.COLORS.NEON_MAGENTA,
        size: 2 + Math.random() * 3,
        gravity: 0,
        fade: true,
      });
    }
  }

  emitJump(x, y) {
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y,
        vx: (Math.random() - 0.5) * 2,
        vy: 1 + Math.random() * 2,
        life: 18,
        maxLife: 18,
        color: CONFIG.COLORS.NEON_CYAN,
        size: 2 + Math.random() * 2,
        gravity: 0.05,
        fade: true,
      });
    }
  }

  emitDeath(x, y) {
    const colors = [
      CONFIG.COLORS.NEON_CYAN, CONFIG.COLORS.NEON_MAGENTA,
      CONFIG.COLORS.NEON_ORANGE, CONFIG.COLORS.NEON_RED,
      CONFIG.COLORS.NEON_YELLOW,
    ];
    for (let i = 0; i < 28; i++) {
      const angle = (i / 28) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const s = 3 + Math.random() * 7;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * s,
        vy: Math.sin(angle) * s - 1,
        life: 45 + Math.random() * 30,
        maxLife: 75,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2.5 + Math.random() * 4,
        gravity: 0.2,
        fade: true,
      });
    }
  }

  emitPickup(x, y, color) {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const s = 2 + Math.random() * 3;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * s,
        vy: Math.sin(angle) * s - 1,
        life: 24,
        maxLife: 24,
        color: color || CONFIG.COLORS.NEON_YELLOW,
        size: 2 + Math.random() * 2,
        gravity: 0.05,
        fade: true,
      });
    }
  }

  emitBossHit(x, y) {
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const s = 3 + Math.random() * 5;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 30,
        y: y + (Math.random() - 0.5) * 30,
        vx: Math.cos(angle) * s,
        vy: Math.sin(angle) * s,
        life: 20,
        maxLife: 20,
        color: Math.random() > 0.5 ? CONFIG.COLORS.NEON_RED : CONFIG.COLORS.NEON_ORANGE,
        size: 3 + Math.random() * 4,
        gravity: 0.15,
        fade: true,
      });
    }
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.97;
      p.life--;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    ctx.save();
    for (const p of this.particles) {
      const alpha = p.fade ? p.life / p.maxLife : 1;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  clear() {
    this.particles = [];
  }
}

window.ParticleSystem = ParticleSystem;
