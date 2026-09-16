'use strict';

class AchievementSystem {
  constructor() {
    this.achievements = [
      { id: 'first_run',   name: 'First Steps',    desc: 'Complete your first run',       target: 1,    icon: '🏃', type: 'games',   unlocked: false },
      { id: 'score_1k',    name: 'Neon Rookie',    desc: 'Score 1,000 points',            target: 1000, icon: '⭐', type: 'score',   unlocked: false },
      { id: 'score_5k',    name: 'Neon Warrior',   desc: 'Score 5,000 points',            target: 5000, icon: '🌟', type: 'score',   unlocked: false },
      { id: 'score_10k',   name: 'Neon Legend',    desc: 'Score 10,000 points',           target: 10000,icon: '💫', type: 'score',   unlocked: false },
      { id: 'jump_100',    name: 'Parkour Master', desc: 'Jump 100 times',                target: 100,  icon: '⬆', type: 'jumps',   unlocked: false },
      { id: 'dash_50',     name: 'Speed Demon',    desc: 'Dash 50 times',                 target: 50,   icon: '💨', type: 'dashes',  unlocked: false },
      { id: 'boss_kill',   name: 'Drone Slayer',   desc: 'Defeat your first boss',        target: 1,    icon: '💀', type: 'bosses',  unlocked: false },
      { id: 'collect_50',  name: 'Token Hunter',   desc: 'Collect 50 tokens',             target: 50,   icon: '🪙', type: 'tokens',  unlocked: false },
      { id: 'survive_2min',name: 'Endurance',      desc: 'Survive for 2 minutes',         target: 120,  icon: '⏱', type: 'playtime',unlocked: false },
      { id: 'no_hit_1k',  name: 'Untouchable',    desc: 'Reach 1,000 without being hit', target: 1000, icon: '🛡', type: 'noHitScore',unlocked: false },
    ];
    this.notifications = [];
    this.sessionStats = { games: 0, jumps: 0, dashes: 0, tokens: 0, bosses: 0 };
  }

  load() {
    try {
      const saved = JSON.parse(localStorage.getItem('neonRunnerAchievements') || '{}');
      for (const ach of this.achievements) {
        if (saved[ach.id]) ach.unlocked = true;
      }
    } catch (e) {}
  }

  save() {
    try {
      const data = {};
      for (const ach of this.achievements) {
        if (ach.unlocked) data[ach.id] = true;
      }
      localStorage.setItem('neonRunnerAchievements', JSON.stringify(data));
    } catch (e) {}
  }

  check(stats) {
    const { score = 0, jumps = 0, dashes = 0, tokensCollected = 0,
            playtime = 0, bossesDefeated = 0, noHitScore = 0, gamesPlayed = 0 } = stats;

    const valueMap = {
      score, jumps, dashes, tokens: tokensCollected,
      playtime, bosses: bossesDefeated, noHitScore, games: gamesPlayed,
    };

    for (const ach of this.achievements) {
      if (ach.unlocked) continue;
      const val = valueMap[ach.type] || 0;
      if (val >= ach.target) {
        ach.unlocked = true;
        this._notify(ach);
        this.save();
        if (window.gameInstance && window.gameInstance.audio) {
          window.gameInstance.audio.playAchievement();
        }
      }
    }
  }

  _notify(ach) {
    this.notifications.push({
      ach,
      timer: 240,
      maxTimer: 240,
      slideIn: 0,
    });
  }

  update() {
    for (let i = this.notifications.length - 1; i >= 0; i--) {
      const n = this.notifications[i];
      n.timer--;
      if (n.slideIn < 1) n.slideIn = Math.min(1, n.slideIn + 0.08);
      if (n.timer <= 0) {
        this.notifications.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    if (this.notifications.length === 0) return;
    ctx.save();

    const W = 220;
    const H = 52;
    const margin = 12;

    this.notifications.forEach((n, idx) => {
      const slideX = Utils.lerp(CONFIG.CANVAS.WIDTH + W, CONFIG.CANVAS.WIDTH - W - margin, Utils.easeInOut(n.slideIn));
      const fadeOut = n.timer < 40 ? n.timer / 40 : 1;
      const y = margin + idx * (H + 6);

      ctx.globalAlpha = fadeOut;

      // Background
      ctx.fillStyle = 'rgba(4,4,16,0.92)';
      ctx.shadowColor = CONFIG.COLORS.NEON_CYAN;
      ctx.shadowBlur = 14;
      Utils.roundRect(ctx, slideX, y, W, H, 4);
      ctx.fill();

      ctx.strokeStyle = CONFIG.COLORS.NEON_CYAN;
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 6;
      Utils.roundRect(ctx, slideX, y, W, H, 4);
      ctx.stroke();

      // Title
      ctx.font = '700 8px Orbitron, monospace';
      ctx.fillStyle = CONFIG.COLORS.NEON_CYAN;
      ctx.shadowColor = CONFIG.COLORS.NEON_CYAN;
      ctx.shadowBlur = 8;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('ACHIEVEMENT UNLOCKED', slideX + 10, y + 8);

      // Name
      ctx.font = '700 11px Orbitron, monospace';
      ctx.fillStyle = '#fff';
      ctx.shadowBlur = 4;
      ctx.fillText(`${n.ach.icon} ${n.ach.name}`, slideX + 10, y + 22);

      // Desc
      ctx.font = '10px "Share Tech Mono", monospace';
      ctx.fillStyle = 'rgba(200,230,255,0.8)';
      ctx.shadowBlur = 0;
      ctx.fillText(n.ach.desc, slideX + 10, y + 38);

      ctx.globalAlpha = 1;
    });

    ctx.restore();
  }

  getUnlocked() {
    return this.achievements.filter(a => a.unlocked);
  }
}

window.AchievementSystem = AchievementSystem;
