'use strict';

class UI {
  constructor() {
    this.screen = 'menu';
    this.leaderboardData = [];
    this.leaderboardLoading = false;
    this.menuBlink = 0;
    this.scoreAnimValue = 0;
    this.scoreAnimTarget = 0;
    this.soundOn = true;
    this.musicOn = true;
    this.selectedMenuItem = 0;

    // Button hit regions (set during draw)
    this._buttons = {};
  }

  setScreen(name) {
    this.screen = name;
    this._buttons = {};
    if (name === 'leaderboard') this._loadLeaderboard();
  }

  async _loadLeaderboard() {
    this.leaderboardLoading = true;
    this.leaderboardData = await window.API.getLeaderboard(10);
    this.leaderboardLoading = false;
  }

  update(gs) {
    this.menuBlink = (this.menuBlink + 1) % 60;
    if (this.screen === 'gameover') {
      this.scoreAnimTarget = gs.score || 0;
      if (this.scoreAnimValue < this.scoreAnimTarget) {
        this.scoreAnimValue = Math.min(this.scoreAnimTarget, this.scoreAnimValue + Math.max(1, (this.scoreAnimTarget - this.scoreAnimValue) * 0.05));
      }
    }
  }

  draw(ctx, gs) {
    switch (this.screen) {
      case 'menu':     this._drawMenu(ctx, gs);    break;
      case 'playing':  this._drawHUD(ctx, gs);     break;
      case 'paused':   this._drawPause(ctx, gs);   break;
      case 'gameover': this._drawGameOver(ctx, gs); break;
      case 'settings': this._drawSettings(ctx, gs); break;
      case 'leaderboard': this._drawLeaderboard(ctx, gs); break;
    }
  }

  _drawHUD(ctx, gs) {
    const W = CONFIG.CANVAS.WIDTH;
    ctx.save();

    // Score - top center
    ctx.font = '900 18px Orbitron, monospace';
    ctx.fillStyle = CONFIG.COLORS.NEON_CYAN;
    ctx.shadowColor = CONFIG.COLORS.NEON_CYAN;
    ctx.shadowBlur = 14;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(Utils.formatScore(gs.score), W / 2, 10);

    // High score - smaller, right
    ctx.font = '700 10px Orbitron, monospace';
    ctx.fillStyle = 'rgba(0,255,255,0.6)';
    ctx.shadowBlur = 6;
    ctx.textAlign = 'right';
    ctx.fillText(`BEST ${Utils.formatScore(gs.highScore)}`, W - 12, 12);

    // Energy bar - bottom left
    const barX = 14, barY = CONFIG.CANVAS.HEIGHT - 22, barW = 90, barH = 8;
    ctx.font = '700 7px Orbitron, monospace';
    ctx.fillStyle = CONFIG.COLORS.NEON_CYAN;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 4;
    ctx.fillText('NRG', barX, barY - 8);

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(barX, barY, barW, barH);

    const energyPct = gs.energy / CONFIG.PLAYER.ENERGY_MAX;
    const energyColor = energyPct > 0.5 ? CONFIG.COLORS.NEON_CYAN : energyPct > 0.25 ? CONFIG.COLORS.NEON_YELLOW : CONFIG.COLORS.NEON_RED;
    const energyGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    energyGrad.addColorStop(0, energyColor);
    energyGrad.addColorStop(1, CONFIG.COLORS.NEON_MAGENTA);
    ctx.fillStyle = energyGrad;
    ctx.shadowColor = energyColor;
    ctx.shadowBlur = 8;
    ctx.fillRect(barX + 1, barY + 1, (barW - 2) * energyPct, barH - 2);

    ctx.strokeStyle = energyColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    // Active powerup icons
    const effects = gs.activeEffects || {};
    const timers = gs.effectTimers || {};
    const pwTypes = ['shield', 'magnet', 'slow', 'multiplier'];
    const pwColors = {
      shield: CONFIG.COLORS.NEON_GREEN,
      magnet: CONFIG.COLORS.NEON_YELLOW,
      slow: CONFIG.COLORS.NEON_PURPLE,
      multiplier: CONFIG.COLORS.NEON_ORANGE,
    };
    const pwLabels = { shield: 'S', magnet: 'M', slow: '%', multiplier: '2x' };

    let pwX = 14;
    const pwY = CONFIG.CANVAS.HEIGHT - 44;
    for (const type of pwTypes) {
      if (effects[type]) {
        const remaining = timers[type] / CONFIG.POWERUP_DURATION[type];
        const color = pwColors[type];

        // Circle timer
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pwX + 10, pwY + 10, 10, -Math.PI / 2, -Math.PI / 2 + remaining * Math.PI * 2);
        ctx.stroke();

        // Background circle
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(pwX + 10, pwY + 10, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Label
        ctx.font = `700 ${type === 'multiplier' ? 7 : 9}px Orbitron, monospace`;
        ctx.fillStyle = color;
        ctx.shadowBlur = 6;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pwLabels[type], pwX + 10, pwY + 11);

        pwX += 26;
      }
    }

    // Boss health bar (if boss active)
    if (gs.bossActive && gs.boss) {
      const bossBarW = 300;
      const bossBarX = (W - bossBarW) / 2;
      const bossBarY = 10;
      const hpPct = gs.boss.health / gs.boss.maxHealth;
      const bossColor = hpPct > 0.5 ? CONFIG.COLORS.NEON_GREEN : hpPct > 0.25 ? CONFIG.COLORS.NEON_YELLOW : CONFIG.COLORS.NEON_RED;

      ctx.font = '700 8px Orbitron, monospace';
      ctx.fillStyle = CONFIG.COLORS.NEON_RED;
      ctx.shadowColor = CONFIG.COLORS.NEON_RED;
      ctx.shadowBlur = 8;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('BOSS', W / 2, bossBarY - 2);

      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(bossBarX, bossBarY, bossBarW, 10);

      ctx.fillStyle = bossColor;
      ctx.shadowColor = bossColor;
      ctx.shadowBlur = 10;
      ctx.fillRect(bossBarX + 1, bossBarY + 1, (bossBarW - 2) * hpPct, 8);

      ctx.strokeStyle = CONFIG.COLORS.NEON_RED;
      ctx.lineWidth = 1;
      ctx.shadowBlur = 4;
      ctx.strokeRect(bossBarX, bossBarY, bossBarW, 10);
    }

    // Multiplier indicator
    if (effects.multiplier) {
      ctx.font = '900 12px Orbitron, monospace';
      ctx.fillStyle = CONFIG.COLORS.NEON_ORANGE;
      ctx.shadowColor = CONFIG.COLORS.NEON_ORANGE;
      ctx.shadowBlur = 10;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('×2', W - 40, 32);
    }

    ctx.restore();
  }

  _drawMenu(ctx, gs) {
    const W = CONFIG.CANVAS.WIDTH;
    const H = CONFIG.CANVAS.HEIGHT;
    ctx.save();

    // Dark overlay
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, W, H);

    // Title
    ctx.font = '900 46px Orbitron, monospace';
    ctx.fillStyle = CONFIG.COLORS.NEON_CYAN;
    ctx.shadowColor = CONFIG.COLORS.NEON_CYAN;
    ctx.shadowBlur = 30;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('NEON', W / 2, H / 2 - 62);
    ctx.shadowBlur = 25;
    ctx.fillStyle = CONFIG.COLORS.NEON_MAGENTA;
    ctx.shadowColor = CONFIG.COLORS.NEON_MAGENTA;
    ctx.fillText('RUNNER', W / 2, H / 2 - 18);

    // Subtitle
    ctx.font = '700 10px "Share Tech Mono", monospace';
    ctx.fillStyle = 'rgba(200,200,255,0.7)';
    ctx.shadowBlur = 4;
    ctx.fillText('CYBERPUNK INFINITE RUNNER', W / 2, H / 2 + 10);

    // Controls hint
    ctx.font = '700 9px "Share Tech Mono", monospace';
    ctx.fillStyle = 'rgba(0,255,255,0.5)';
    ctx.shadowBlur = 0;
    ctx.fillText('SPACE: Jump   DOWN: Slide   SHIFT: Dash', W / 2, H / 2 + 28);

    // Start prompt (blinking)
    if (this.menuBlink < 40) {
      ctx.font = '700 13px Orbitron, monospace';
      ctx.fillStyle = CONFIG.COLORS.NEON_CYAN;
      ctx.shadowColor = CONFIG.COLORS.NEON_CYAN;
      ctx.shadowBlur = 12;
      ctx.fillText('PRESS SPACE TO START', W / 2, H / 2 + 52);
    }

    // High score
    if (gs.highScore > 0) {
      ctx.font = '700 10px Orbitron, monospace';
      ctx.fillStyle = CONFIG.COLORS.NEON_YELLOW;
      ctx.shadowColor = CONFIG.COLORS.NEON_YELLOW;
      ctx.shadowBlur = 8;
      ctx.fillText(`BEST: ${Utils.formatScore(gs.highScore)}`, W / 2, H / 2 + 72);
    }

    // Menu buttons
    const btnW = 100, btnH = 22, gap = 12;
    const totalW = btnW * 3 + gap * 2;
    const startX = (W - totalW) / 2;
    const btnY = H - 38;
    const labels = ['SETTINGS', 'LEADERBOARD', 'CREDITS'];
    const ids = ['settings', 'leaderboard', 'credits'];

    for (let i = 0; i < 3; i++) {
      const bx = startX + i * (btnW + gap);
      this._buttons[ids[i]] = { x: bx, y: btnY, w: btnW, h: btnH };
      ctx.strokeStyle = 'rgba(0,255,255,0.4)';
      ctx.lineWidth = 1;
      ctx.shadowBlur = 4;
      ctx.shadowColor = CONFIG.COLORS.NEON_CYAN;
      ctx.strokeRect(bx, btnY, btnW, btnH);
      ctx.font = '700 8px Orbitron, monospace';
      ctx.fillStyle = 'rgba(0,255,255,0.7)';
      ctx.shadowBlur = 4;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labels[i], bx + btnW / 2, btnY + btnH / 2);
    }

    ctx.restore();
  }

  _drawPause(ctx, gs) {
    const W = CONFIG.CANVAS.WIDTH;
    const H = CONFIG.CANVAS.HEIGHT;
    ctx.save();

    ctx.fillStyle = 'rgba(0,0,12,0.75)';
    ctx.fillRect(0, 0, W, H);

    ctx.font = '900 32px Orbitron, monospace';
    ctx.fillStyle = CONFIG.COLORS.NEON_CYAN;
    ctx.shadowColor = CONFIG.COLORS.NEON_CYAN;
    ctx.shadowBlur = 24;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PAUSED', W / 2, H / 2 - 40);

    const menuItems = ['RESUME', 'SETTINGS', 'MAIN MENU'];
    const menuIds = ['resume', 'settings', 'mainmenu'];
    menuItems.forEach((label, i) => {
      const my = H / 2 - 4 + i * 28;
      this._buttons[menuIds[i]] = { x: W / 2 - 70, y: my - 12, w: 140, h: 22 };
      ctx.font = `700 11px Orbitron, monospace`;
      ctx.fillStyle = CONFIG.COLORS.NEON_CYAN;
      ctx.shadowColor = CONFIG.COLORS.NEON_CYAN;
      ctx.shadowBlur = 8;
      ctx.fillText(label, W / 2, my);
    });

    ctx.restore();
  }

  _drawGameOver(ctx, gs) {
    const W = CONFIG.CANVAS.WIDTH;
    const H = CONFIG.CANVAS.HEIGHT;
    ctx.save();

    ctx.fillStyle = 'rgba(0,0,12,0.8)';
    ctx.fillRect(0, 0, W, H);

    // Game Over title
    ctx.font = '900 36px Orbitron, monospace';
    ctx.fillStyle = CONFIG.COLORS.NEON_RED;
    ctx.shadowColor = CONFIG.COLORS.NEON_RED;
    ctx.shadowBlur = 28;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GAME OVER', W / 2, H / 2 - 68);

    // Score
    ctx.font = '700 22px Orbitron, monospace';
    ctx.fillStyle = CONFIG.COLORS.NEON_YELLOW;
    ctx.shadowColor = CONFIG.COLORS.NEON_YELLOW;
    ctx.shadowBlur = 16;
    ctx.fillText(Utils.formatScore(this.scoreAnimValue), W / 2, H / 2 - 38);

    // New high score
    if (gs.score >= gs.highScore && gs.score > 0) {
      ctx.font = '700 10px Orbitron, monospace';
      ctx.fillStyle = CONFIG.COLORS.NEON_GREEN;
      ctx.shadowColor = CONFIG.COLORS.NEON_GREEN;
      ctx.shadowBlur = 10;
      ctx.fillText('NEW HIGH SCORE!', W / 2, H / 2 - 20);
    }

    // Death reason
    if (gs.deathReason) {
      ctx.font = '10px "Share Tech Mono", monospace';
      ctx.fillStyle = 'rgba(200,150,150,0.8)';
      ctx.shadowBlur = 0;
      ctx.fillText(`Eliminated by: ${gs.deathReason}`, W / 2, H / 2 - 4);
    }

    // Buttons
    const btns = [
      { id: 'savescore', label: 'SAVE SCORE', x: W / 2 - 130, color: CONFIG.COLORS.NEON_GREEN },
      { id: 'playagain', label: 'PLAY AGAIN', x: W / 2 - 10, color: CONFIG.COLORS.NEON_CYAN },
      { id: 'mainmenu',  label: 'MAIN MENU',  x: W / 2 + 110, color: CONFIG.COLORS.NEON_MAGENTA },
    ];
    const btnW = 110, btnH = 22, btnY = H / 2 + 20;

    for (const btn of btns) {
      const bx = btn.x - btnW / 2;
      this._buttons[btn.id] = { x: bx, y: btnY, w: btnW, h: btnH };
      ctx.strokeStyle = btn.color;
      ctx.shadowColor = btn.color;
      ctx.shadowBlur = 8;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx, btnY, btnW, btnH);
      ctx.font = '700 9px Orbitron, monospace';
      ctx.fillStyle = btn.color;
      ctx.shadowBlur = 6;
      ctx.fillText(btn.label, btn.x, btnY + btnH / 2);
    }

    // Stats
    ctx.font = '9px "Share Tech Mono", monospace';
    ctx.fillStyle = 'rgba(150,200,255,0.7)';
    ctx.shadowBlur = 0;
    const stats = [
      `Jumps: ${gs.totalJumps || 0}`,
      `Dashes: ${gs.totalDashes || 0}`,
      `Tokens: ${gs.tokensCollected || 0}`,
    ];
    stats.forEach((s, i) => {
      ctx.fillText(s, W / 2 + (i - 1) * 110, H / 2 + 54);
    });

    ctx.restore();
  }

  _drawSettings(ctx, gs) {
    const W = CONFIG.CANVAS.WIDTH;
    const H = CONFIG.CANVAS.HEIGHT;
    ctx.save();

    ctx.fillStyle = 'rgba(0,0,12,0.82)';
    ctx.fillRect(0, 0, W, H);

    ctx.font = '900 22px Orbitron, monospace';
    ctx.fillStyle = CONFIG.COLORS.NEON_CYAN;
    ctx.shadowColor = CONFIG.COLORS.NEON_CYAN;
    ctx.shadowBlur = 18;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SETTINGS', W / 2, H / 2 - 60);

    const rows = [
      { id: 'toggleSound', label: 'SOUND', value: this.soundOn },
      { id: 'toggleMusic', label: 'MUSIC', value: this.musicOn },
    ];

    rows.forEach((row, i) => {
      const ry = H / 2 - 20 + i * 36;
      ctx.font = '700 11px Orbitron, monospace';
      ctx.fillStyle = CONFIG.COLORS.NEON_WHITE;
      ctx.shadowBlur = 4;
      ctx.textAlign = 'right';
      ctx.fillText(row.label, W / 2 - 10, ry);

      const toggleX = W / 2 + 10;
      const toggleW = 50, toggleH = 20;
      this._buttons[row.id] = { x: toggleX, y: ry - 10, w: toggleW, h: toggleH };

      const toggleColor = row.value ? CONFIG.COLORS.NEON_GREEN : 'rgba(100,100,100,0.8)';
      ctx.fillStyle = row.value ? 'rgba(0,255,100,0.15)' : 'rgba(50,50,50,0.4)';
      ctx.shadowColor = toggleColor;
      ctx.shadowBlur = row.value ? 10 : 2;
      Utils.roundRect(ctx, toggleX, ry - 10, toggleW, toggleH, 10);
      ctx.fill();
      ctx.strokeStyle = toggleColor;
      ctx.lineWidth = 1.5;
      Utils.roundRect(ctx, toggleX, ry - 10, toggleW, toggleH, 10);
      ctx.stroke();

      // Toggle knob
      const knobX = row.value ? toggleX + toggleW - 14 : toggleX + 4;
      ctx.fillStyle = toggleColor;
      ctx.shadowColor = toggleColor;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(knobX + 6, ry, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '700 9px Orbitron, monospace';
      ctx.fillStyle = toggleColor;
      ctx.textAlign = 'left';
      ctx.fillText(row.value ? 'ON' : 'OFF', toggleX + toggleW + 8, ry);
    });

    // Back button
    const backY = H / 2 + 40;
    this._buttons['back'] = { x: W / 2 - 50, y: backY - 12, w: 100, h: 22 };
    ctx.strokeStyle = CONFIG.COLORS.NEON_MAGENTA;
    ctx.shadowColor = CONFIG.COLORS.NEON_MAGENTA;
    ctx.shadowBlur = 8;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(W / 2 - 50, backY - 12, 100, 22);
    ctx.font = '700 10px Orbitron, monospace';
    ctx.fillStyle = CONFIG.COLORS.NEON_MAGENTA;
    ctx.shadowBlur = 6;
    ctx.textAlign = 'center';
    ctx.fillText('BACK', W / 2, backY);

    ctx.restore();
  }

  _drawLeaderboard(ctx, gs) {
    const W = CONFIG.CANVAS.WIDTH;
    const H = CONFIG.CANVAS.HEIGHT;
    ctx.save();

    ctx.fillStyle = 'rgba(0,0,12,0.85)';
    ctx.fillRect(0, 0, W, H);

    ctx.font = '900 20px Orbitron, monospace';
    ctx.fillStyle = CONFIG.COLORS.NEON_CYAN;
    ctx.shadowColor = CONFIG.COLORS.NEON_CYAN;
    ctx.shadowBlur = 18;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('LEADERBOARD', W / 2, 28);

    if (this.leaderboardLoading) {
      ctx.font = '12px "Share Tech Mono", monospace';
      ctx.fillStyle = 'rgba(0,255,255,0.6)';
      ctx.shadowBlur = 0;
      ctx.fillText('LOADING...', W / 2, H / 2);
    } else if (!this.leaderboardData || this.leaderboardData.length === 0) {
      ctx.font = '11px "Share Tech Mono", monospace';
      ctx.fillStyle = 'rgba(150,150,200,0.7)';
      ctx.shadowBlur = 0;
      ctx.fillText('NO SCORES YET — BE THE FIRST!', W / 2, H / 2);
    } else {
      const colW = [40, 220, 120, 160];
      const headers = ['#', 'PLAYER', 'SCORE', 'DATE'];
      const startY = 54;
      const rowH = 18;

      // Header
      ctx.font = '700 8px Orbitron, monospace';
      ctx.fillStyle = 'rgba(0,255,255,0.5)';
      ctx.shadowBlur = 4;
      let hx = 60;
      headers.forEach((h, i) => {
        ctx.textAlign = i === 0 ? 'center' : 'left';
        ctx.fillText(h, hx + (i === 0 ? colW[i] / 2 : 0), startY);
        hx += colW[i];
      });

      // Rows
      this.leaderboardData.forEach((entry, idx) => {
        const ry = startY + 14 + idx * rowH;
        const rankColor = idx === 0 ? CONFIG.COLORS.NEON_YELLOW : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : 'rgba(200,200,255,0.7)';

        ctx.font = `700 9px Orbitron, monospace`;
        ctx.fillStyle = rankColor;
        ctx.shadowColor = rankColor;
        ctx.shadowBlur = idx < 3 ? 8 : 2;

        let rx = 60;
        const cols = [
          { text: String(idx + 1), align: 'center', w: colW[0] },
          { text: (entry.player_name || '').substring(0, 16), align: 'left', w: colW[1] },
          { text: Utils.formatScore(entry.score), align: 'left', w: colW[2] },
          { text: entry.created_at ? new Date(entry.created_at).toLocaleDateString() : '', align: 'left', w: colW[3] },
        ];
        cols.forEach(col => {
          ctx.textAlign = col.align;
          ctx.textBaseline = 'middle';
          ctx.fillText(col.text, col.align === 'center' ? rx + col.w / 2 : rx, ry);
          rx += col.w;
        });
      });
    }

    // Back
    const backY = H - 26;
    this._buttons['back'] = { x: W / 2 - 50, y: backY - 10, w: 100, h: 20 };
    ctx.strokeStyle = CONFIG.COLORS.NEON_MAGENTA;
    ctx.shadowColor = CONFIG.COLORS.NEON_MAGENTA;
    ctx.shadowBlur = 6;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(W / 2 - 50, backY - 10, 100, 20);
    ctx.font = '700 9px Orbitron, monospace';
    ctx.fillStyle = CONFIG.COLORS.NEON_MAGENTA;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BACK', W / 2, backY);

    ctx.restore();
  }

  getClickTarget(x, y) {
    for (const [id, btn] of Object.entries(this._buttons)) {
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        return id;
      }
    }
    return null;
  }
}

window.UI = UI;
