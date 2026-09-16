'use strict';

class Player {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = CONFIG.PLAYER.X;
    this.y = CONFIG.CANVAS.GROUND_Y;
    this.vy = 0;
    this.width = CONFIG.PLAYER.WIDTH;
    this.height = CONFIG.PLAYER.HEIGHT;
    this.state = 'running';
    this.jumpCount = 0;
    this.onGround = true;
    this.energy = CONFIG.PLAYER.ENERGY_MAX;
    this.dashCooldown = 0;
    this.dashTimer = 0;
    this.isDashing = false;
    this.slideTimer = 0;
    this.isSliding = false;
    this.animFrame = 0;
    this.animTimer = 0;
    this.legOffset = 0;
    this.blinkTimer = 0;
    this.invincible = false;
    this.invincibleTimer = 0;
    this.shield = false;
    this.dashFlash = 0;
    this.ghostX = [this.x, this.x, this.x];
    this.dead = false;
    this.deathTimer = 0;
  }

  update(gameSpeed) {
    if (this.dead) {
      this.deathTimer++;
      return;
    }

    // Gravity
    if (!this.onGround) {
      this.vy += CONFIG.PHYSICS.GRAVITY;
      if (this.vy > CONFIG.PHYSICS.MAX_FALL_SPEED) {
        this.vy = CONFIG.PHYSICS.MAX_FALL_SPEED;
      }
    }

    // Vertical movement
    this.y += this.vy;

    // Land on ground
    if (this.y >= CONFIG.CANVAS.GROUND_Y) {
      this.y = CONFIG.CANVAS.GROUND_Y;
      this.vy = 0;
      this.onGround = true;
      this.jumpCount = 0;
      if (this.isDashing) {
        this.isDashing = false;
        this.dashTimer = 0;
      }
      if (!this.isSliding) {
        this.state = 'running';
      }
    }

    // Slide timer
    if (this.isSliding) {
      this.slideTimer--;
      if (this.slideTimer <= 0) {
        this.isSliding = false;
        if (this.onGround) this.state = 'running';
      }
    }

    // Dash timer
    if (this.isDashing) {
      this.dashTimer--;
      if (this.dashTimer <= 0) {
        this.isDashing = false;
      }
    }

    // Dash cooldown
    if (this.dashCooldown > 0) this.dashCooldown--;

    // Energy regen
    if (!this.isDashing && this.energy < CONFIG.PLAYER.ENERGY_MAX) {
      this.energy = Math.min(CONFIG.PLAYER.ENERGY_MAX, this.energy + CONFIG.PLAYER.ENERGY_REGEN);
    }

    // Invincibility timer
    if (this.invincible) {
      this.invincibleTimer--;
      this.blinkTimer++;
      if (this.invincibleTimer <= 0) {
        this.invincible = false;
        this.blinkTimer = 0;
      }
    }

    // Ghost trail positions for dash
    this.ghostX[2] = this.ghostX[1];
    this.ghostX[1] = this.ghostX[0];
    this.ghostX[0] = this.x;

    // Running animation
    if (this.onGround && !this.isSliding) {
      this.animTimer++;
      if (this.animTimer >= 5) {
        this.animTimer = 0;
        this.animFrame = (this.animFrame + 1) % 8;
      }
      this.legOffset = Math.sin(this.animFrame * Math.PI / 4) * 6;
    }

    // Dash flash decay
    if (this.dashFlash > 0) this.dashFlash--;
  }

  jump() {
    if (this.dead) return false;
    if (this.jumpCount < 2) {
      if (this.jumpCount === 0) {
        this.vy = CONFIG.PHYSICS.JUMP_FORCE;
      } else {
        this.vy = CONFIG.PHYSICS.DOUBLE_JUMP_FORCE;
      }
      this.onGround = false;
      this.jumpCount++;
      this.isSliding = false;
      this.slideTimer = 0;
      this.state = 'jumping';
      return true;
    }
    return false;
  }

  slide() {
    if (this.dead || !this.onGround || this.isSliding) return false;
    this.isSliding = true;
    this.slideTimer = 50;
    this.state = 'sliding';
    return true;
  }

  dash() {
    if (this.dead || this.isDashing || this.dashCooldown > 0) return false;
    if (this.energy < CONFIG.PLAYER.ENERGY_DASH_COST) return false;
    this.isDashing = true;
    this.dashTimer = CONFIG.PLAYER.DASH_DURATION;
    this.dashCooldown = CONFIG.PLAYER.DASH_COOLDOWN;
    this.energy -= CONFIG.PLAYER.ENERGY_DASH_COST;
    this.dashFlash = 12;
    this.state = 'dashing';
    return true;
  }

  activateShield() {
    this.shield = true;
  }

  deactivateShield() {
    this.shield = false;
  }

  hit() {
    if (this.dead) return false;
    if (this.invincible) return false;
    if (this.shield) {
      this.deactivateShield();
      this.invincible = true;
      this.invincibleTimer = 90;
      return false;
    }
    this.dead = true;
    this.state = 'dead';
    return true;
  }

  getHitbox() {
    const h = this.isSliding ? CONFIG.PLAYER.SLIDE_HEIGHT : this.height;
    return {
      x: this.x - this.width / 2,
      y: this.y - h,
      w: this.width,
      h: h,
    };
  }

  draw(ctx, particles) {
    if (this.dead) return;
    if (this.invincible && this.blinkTimer % 6 < 3) return;

    const hb = this.getHitbox();
    const cx = this.x;

    ctx.save();

    // Dash ghost trail
    if (this.isDashing) {
      for (let g = 1; g <= 2; g++) {
        const alpha = g === 1 ? 0.35 : 0.15;
        const gx = cx - g * 18;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = CONFIG.COLORS.NEON_CYAN;
        ctx.shadowColor = CONFIG.COLORS.NEON_CYAN;
        ctx.shadowBlur = 8;
        const gH = this.isSliding ? CONFIG.PLAYER.SLIDE_HEIGHT : this.height;
        ctx.fillRect(gx - this.width / 2, this.y - gH, this.width, gH);
      }
      ctx.globalAlpha = 1;
    }

    const glowColor = this.dashFlash > 0 ? CONFIG.COLORS.NEON_MAGENTA : CONFIG.COLORS.NEON_CYAN;
    ctx.shadowBlur = 16;
    ctx.shadowColor = glowColor;

    if (this.isSliding) {
      // Sliding: flattened body
      const slideH = CONFIG.PLAYER.SLIDE_HEIGHT;
      ctx.fillStyle = CONFIG.COLORS.PLAYER_BODY;
      Utils.roundRect(ctx, hb.x + 2, hb.y + 2, hb.w - 4, slideH - 4, 4);
      ctx.fill();

      // Visor strip
      ctx.fillStyle = CONFIG.COLORS.NEON_CYAN;
      ctx.shadowColor = CONFIG.COLORS.NEON_CYAN;
      ctx.shadowBlur = 10;
      ctx.fillRect(hb.x + 6, hb.y + 4, hb.w - 12, 6);
    } else {
      // Legs
      const legY = hb.y + hb.h * 0.62;
      const legH1 = 14 + this.legOffset;
      const legH2 = 14 - this.legOffset;
      ctx.fillStyle = CONFIG.COLORS.PLAYER_BODY;
      ctx.shadowBlur = 8;
      // Left leg
      ctx.fillRect(hb.x + 3, legY, 8, Math.max(4, legH1));
      // Right leg
      ctx.fillRect(hb.x + hb.w - 11, legY, 8, Math.max(4, legH2));

      // Torso
      ctx.shadowBlur = 16;
      ctx.shadowColor = glowColor;
      ctx.fillStyle = CONFIG.COLORS.PLAYER_BODY;
      Utils.roundRect(ctx, hb.x + 2, hb.y + 2, hb.w - 4, hb.h * 0.58, 3);
      ctx.fill();

      // Accent stripe on torso
      ctx.fillStyle = CONFIG.COLORS.PLAYER_ACCENT;
      ctx.shadowColor = CONFIG.COLORS.NEON_MAGENTA;
      ctx.shadowBlur = 8;
      ctx.fillRect(hb.x + 6, hb.y + 8, 4, hb.h * 0.3);

      // Head
      const headCY = hb.y - 6;
      ctx.fillStyle = CONFIG.COLORS.PLAYER_BODY;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(cx, headCY, 9, 0, Math.PI * 2);
      ctx.fill();

      // Visor
      ctx.fillStyle = CONFIG.COLORS.NEON_CYAN;
      ctx.shadowColor = CONFIG.COLORS.NEON_CYAN;
      ctx.shadowBlur = 12;
      ctx.fillRect(cx - 6, headCY - 4, 13, 5);
    }

    // Shield bubble
    if (this.shield) {
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = CONFIG.COLORS.NEON_GREEN;
      ctx.shadowColor = CONFIG.COLORS.NEON_GREEN;
      ctx.shadowBlur = 20;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, this.y - this.height / 2, this.width, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = CONFIG.COLORS.NEON_GREEN;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    // Player trail particles
    if (particles && !this.isSliding) {
      particles.emitPlayerTrail(cx, this.y);
    }
  }
}

window.Player = Player;
