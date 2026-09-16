'use strict';

class BossManager {
  constructor() {
    this.boss = null;
    this.active = false;
    this.nextTriggerScore = CONFIG.GAME.BOSS_INTERVAL;
    this.defeated = 0;
    this.warningTimer = 0;
    this.showWarning = false;
    this.defeatFlash = 0;
  }

  reset() {
    this.boss = null;
    this.active = false;
    this.nextTriggerScore = CONFIG.GAME.BOSS_INTERVAL;
    this.defeated = 0;
    this.warningTimer = 0;
    this.showWarning = false;
    this.defeatFlash = 0;
  }

  checkTrigger(score) {
    if (!this.active && score >= this.nextTriggerScore) {
      this._trigger();
    }
  }

  _trigger() {
    this.active = true;
    this.showWarning = true;
    this.warningTimer = 120;
    const hp = 15 + this.defeated * 5;
    this.boss = {
      x: CONFIG.CANVAS.WIDTH + 100,
      y: CONFIG.CANVAS.GROUND_Y - 110,
      w: 90,
      h: 100,
      health: hp,
      maxHealth: hp,
      phase: 1,
      attackTimer: 0,
      attackInterval: 130,
      projectiles: [],
      bobTime: 0,
      hitFlash: 0,
      entering: true,
      targetX: CONFIG.CANVAS.WIDTH - 120,
      rotorAngle: 0,
      eyeColor: CONFIG.COLORS.NEON_RED,
      eyePulse: 0,
    };
    if (window.gameInstance && window.gameInstance.audio) {
      window.gameInstance.audio.playBossIntro();
    }
  }

  update(player, particles, powerupManager, audio, dt) {
    if (!this.active || !this.boss) return;
    const boss = this.boss;

    // Warning countdown
    if (this.showWarning) {
      this.warningTimer--;
      if (this.warningTimer <= 0) this.showWarning = false;
    }

    // Entrance movement
    if (boss.entering) {
      boss.x -= 4;
      if (boss.x <= boss.targetX) {
        boss.x = boss.targetX;
        boss.entering = false;
      }
    }

    // Boss bob
    boss.bobTime += 0.04;
    const displayY = boss.y + Math.sin(boss.bobTime) * 8;
    boss._drawY = displayY;
    boss.rotorAngle += 0.2;
    boss.eyePulse += 0.1;

    // Phase transitions
    const hp = boss.health;
    const pct = hp / boss.maxHealth;
    if (pct > 0.66) boss.phase = 1;
    else if (pct > 0.33) boss.phase = 2;
    else boss.phase = 3;

    boss.attackInterval = boss.phase === 1 ? 130 : boss.phase === 2 ? 90 : 60;

    // Attack
    if (!boss.entering) {
      boss.attackTimer++;
      if (boss.attackTimer >= boss.attackInterval) {
        boss.attackTimer = 0;
        this._fireAttack(boss, player);
      }
    }

    // Update projectiles
    for (let i = boss.projectiles.length - 1; i >= 0; i--) {
      const p = boss.projectiles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.trail.unshift({ x: p.x, y: p.y });
      if (p.trail.length > 8) p.trail.pop();

      // Player collision
      const ph = player.getHitbox();
      if (Utils.rectOverlap(ph.x, ph.y, ph.w, ph.h, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2)) {
        const died = player.hit();
        particles.emitBossHit(p.x, p.y);
        boss.projectiles.splice(i, 1);
        if (died && window.gameInstance) {
          window.gameInstance.deathReason = 'Boss projectile';
        }
        continue;
      }

      if (p.x < -20 || p.x > CONFIG.CANVAS.WIDTH + 20 || p.y < -20 || p.y > CONFIG.CANVAS.HEIGHT + 20) {
        boss.projectiles.splice(i, 1);
      }
    }

    // Hit flash decay
    if (boss.hitFlash > 0) boss.hitFlash--;
    if (this.defeatFlash > 0) this.defeatFlash--;
  }

  hitBoss(damage, particles) {
    if (!this.boss || !this.active) return false;
    this.boss.health -= damage;
    this.boss.hitFlash = 10;
    if (particles) particles.emitBossHit(
      this.boss.x + this.boss.w / 2,
      this.boss._drawY + this.boss.h / 2
    );
    if (window.gameInstance && window.gameInstance.audio) {
      window.gameInstance.audio.playBossHit();
    }

    if (this.boss.health <= 0) {
      this._defeatBoss(particles);
      return true;
    }
    return false;
  }

  _defeatBoss(particles) {
    if (!this.boss) return;
    const cx = this.boss.x + this.boss.w / 2;
    const cy = this.boss._drawY + this.boss.h / 2;

    if (particles) {
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          if (particles) particles.emitDeath(
            cx + Utils.randomBetween(-30, 30),
            cy + Utils.randomBetween(-30, 30)
          );
        }, i * 120);
      }
    }

    if (window.gameInstance && window.gameInstance.audio) {
      window.gameInstance.audio.playBossDefeat();
    }

    this.defeated++;
    this.defeatFlash = 60;
    this.active = false;
    this.boss = null;
    this.nextTriggerScore += CONFIG.GAME.BOSS_INTERVAL;

    // Score bonus
    if (window.gameInstance) {
      window.gameInstance.score += 1000;
      window.gameInstance.bossesDefeated++;
    }
  }

  _fireAttack(boss, player) {
    const targetY = player.y - player.height / 2;
    const bx = boss.x;
    const by = boss._drawY + boss.h / 2;

    switch (boss.phase) {
      case 1:
        boss.projectiles.push({ x: bx, y: targetY, vx: -8, vy: 0, r: 6, trail: [] });
        break;
      case 2:
        boss.projectiles.push({ x: bx, y: targetY - 20, vx: -8, vy: 0, r: 6, trail: [] });
        boss.projectiles.push({ x: bx, y: targetY + 20, vx: -8, vy: 0, r: 6, trail: [] });
        break;
      case 3:
        for (let i = -2; i <= 2; i++) {
          boss.projectiles.push({ x: bx, y: by, vx: -9, vy: i * 1.5, r: 5, trail: [] });
        }
        break;
    }
  }

  draw(ctx) {
    if (this.defeatFlash > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(255,100,0,${this.defeatFlash / 60 * 0.4})`;
      ctx.fillRect(0, 0, CONFIG.CANVAS.WIDTH, CONFIG.CANVAS.HEIGHT);
      ctx.restore();
    }

    if (!this.active || !this.boss) return;
    const boss = this.boss;
    const drawY = boss._drawY || boss.y;
    const cx = boss.x + boss.w / 2;
    const cy = drawY + boss.h / 2;

    ctx.save();

    // Warning flash
    if (this.showWarning) {
      const alpha = Math.sin(this.warningTimer * 0.15) * 0.5 + 0.5;
      ctx.fillStyle = `rgba(255,0,68,${alpha * 0.15})`;
      ctx.fillRect(0, 0, CONFIG.CANVAS.WIDTH, CONFIG.CANVAS.HEIGHT);

      ctx.font = '900 28px Orbitron, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = CONFIG.COLORS.NEON_RED;
      ctx.shadowColor = CONFIG.COLORS.NEON_RED;
      ctx.shadowBlur = 30;
      ctx.globalAlpha = alpha;
      ctx.fillText('⚠ BOSS INCOMING ⚠', CONFIG.CANVAS.WIDTH / 2, 60);
      ctx.globalAlpha = 1;
    }

    // Draw projectiles first (behind boss)
    for (const p of boss.projectiles) {
      // Trail
      for (let i = 0; i < p.trail.length; i++) {
        const t = p.trail[i];
        ctx.globalAlpha = (1 - i / p.trail.length) * 0.4;
        ctx.fillStyle = CONFIG.COLORS.NEON_RED;
        ctx.shadowColor = CONFIG.COLORS.NEON_RED;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(t.x, t.y, p.r * (1 - i / p.trail.length) * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Projectile
      ctx.fillStyle = CONFIG.COLORS.NEON_RED;
      ctx.shadowColor = CONFIG.COLORS.NEON_RED;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ff8888';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Hit flash overlay
    if (boss.hitFlash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${boss.hitFlash / 10 * 0.5})`;
      ctx.fillRect(boss.x, drawY, boss.w, boss.h);
    }

    // Boss body
    const phaseColor = boss.phase === 1 ? CONFIG.COLORS.NEON_ORANGE
                     : boss.phase === 2 ? CONFIG.COLORS.NEON_RED
                     : '#ff0000';

    ctx.shadowColor = phaseColor;
    ctx.shadowBlur = 24;
    ctx.fillStyle = '#0d0005';
    Utils.roundRect(ctx, boss.x + 4, drawY + 4, boss.w - 8, boss.h - 8, 6);
    ctx.fill();

    ctx.strokeStyle = phaseColor;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 18;
    Utils.roundRect(ctx, boss.x + 4, drawY + 4, boss.w - 8, boss.h - 8, 6);
    ctx.stroke();

    // Armor plates
    ctx.strokeStyle = `rgba(255,100,0,0.5)`;
    ctx.lineWidth = 1;
    ctx.shadowBlur = 4;
    for (let i = 0; i < 3; i++) {
      const px = boss.x + 10 + i * 24;
      ctx.strokeRect(px, drawY + 20, 18, 30);
    }

    // Rotors (4 corners)
    ctx.strokeStyle = phaseColor;
    ctx.shadowBlur = 8;
    ctx.lineWidth = 2;
    const rotorPositions = [
      [boss.x + 4, drawY + 4],
      [boss.x + boss.w - 4, drawY + 4],
      [boss.x + 4, drawY + boss.h - 4],
      [boss.x + boss.w - 4, drawY + boss.h - 4],
    ];
    rotorPositions.forEach(([rx, ry], idx) => {
      ctx.save();
      ctx.translate(rx, ry);
      ctx.rotate(boss.rotorAngle * (idx % 2 === 0 ? 1 : -1));
      ctx.beginPath();
      ctx.moveTo(-12, 0); ctx.lineTo(12, 0);
      ctx.moveTo(0, -12); ctx.lineTo(0, 12);
      ctx.stroke();
      ctx.restore();
    });

    // Eye(s)
    const eyePulse = Math.sin(boss.eyePulse) * 0.4 + 0.6;
    const eyeGlow = boss.phase === 3 ? 24 : 16;
    ctx.fillStyle = CONFIG.COLORS.NEON_RED;
    ctx.shadowColor = CONFIG.COLORS.NEON_RED;
    ctx.shadowBlur = eyeGlow * eyePulse;

    if (boss.phase < 3) {
      // Single eye
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Triple eyes
      [-22, 0, 22].forEach(dx => {
        ctx.beginPath();
        ctx.arc(cx + dx, cy, 7, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Health bar
    const barW = boss.w + 20;
    const barX = boss.x - 10;
    const barY = drawY - 20;
    const hpPct = boss.health / boss.maxHealth;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(barX, barY, barW, 8);

    const barColor = hpPct > 0.5 ? CONFIG.COLORS.NEON_GREEN : hpPct > 0.25 ? CONFIG.COLORS.NEON_YELLOW : CONFIG.COLORS.NEON_RED;
    ctx.fillStyle = barColor;
    ctx.shadowColor = barColor;
    ctx.shadowBlur = 8;
    ctx.fillRect(barX + 1, barY + 1, (barW - 2) * hpPct, 6);

    ctx.strokeStyle = phaseColor;
    ctx.lineWidth = 1;
    ctx.shadowBlur = 4;
    ctx.strokeRect(barX, barY, barW, 8);

    // "BOSS" label
    ctx.font = '700 9px Orbitron, monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = phaseColor;
    ctx.shadowBlur = 6;
    ctx.fillText('BOSS', cx, barY - 6);

    ctx.restore();
  }
}

window.BossManager = BossManager;
