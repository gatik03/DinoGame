'use strict';

class Background {
  constructor() {
    this.groundOffset = 0;
    this.dayNightCycle = 0;
    this.cityLayers = [];
    this.neonSigns = [];
    this.stars = [];
    this.mountainOffset = 0;
  }

  init() {
    this._createCityLayers();
    this._createNeonSigns();
    this._createStars();
  }

  _createCityLayers() {
    // 3 parallax layers: far (slow), mid, near (fast)
    this.cityLayers = [
      this._buildingRow(18, 60, 130, 30, 80, 'rgba(8,8,25,1)', 1.0),
      this._buildingRow(14, 40, 100, 40, 100, 'rgba(10,8,28,1)', 1.8),
      this._buildingRow(10, 30, 80, 50, 120, 'rgba(12,10,32,1)', 2.8),
    ];
  }

  _buildingRow(count, minH, maxH, minW, maxW, color, scrollSpeed) {
    const buildings = [];
    let x = 0;
    for (let i = 0; i < count * 2; i++) {
      const w = Utils.randomInt(minW, maxW);
      const h = Utils.randomInt(minH, maxH);
      buildings.push({ x, w, h, color, scrollSpeed });
      x += w + Utils.randomInt(0, 15);
    }
    return { buildings, offset: 0, scrollSpeed, totalWidth: x };
  }

  _createNeonSigns() {
    const signTexts = ['NEON CITY', 'CYBER//RUN', 'SECTOR 7', 'DATA CORP', 'BYTE MART',
                       'GRID ZONE', 'AI LABS', 'NEURO NET', 'HACK PROOF', 'VOLT//X'];
    const colors = [CONFIG.COLORS.NEON_CYAN, CONFIG.COLORS.NEON_MAGENTA,
                    CONFIG.COLORS.NEON_GREEN, CONFIG.COLORS.NEON_ORANGE];

    for (let i = 0; i < 12; i++) {
      this.neonSigns.push({
        x: i * 200 + Utils.randomInt(0, 150),
        y: Utils.randomInt(CONFIG.CANVAS.GROUND_Y - 220, CONFIG.CANVAS.GROUND_Y - 140),
        text: Utils.randomChoice(signTexts),
        color: Utils.randomChoice(colors),
        scrollSpeed: Utils.randomBetween(1.5, 3.5),
        pulseTime: Math.random() * Math.PI * 2,
        width: 0,
      });
    }
  }

  _createStars() {
    for (let i = 0; i < 90; i++) {
      this.stars.push({
        x: Utils.randomInt(0, CONFIG.CANVAS.WIDTH),
        y: Utils.randomInt(0, CONFIG.CANVAS.GROUND_Y - 200),
        size: Utils.randomBetween(0.5, 2),
        twinkle: Math.random() * Math.PI * 2,
        speed: Utils.randomBetween(0.02, 0.08),
      });
    }
  }

  update(gameSpeed) {
    // Day/night cycle
    this.dayNightCycle += 0.0002;
    if (this.dayNightCycle > Math.PI * 2) this.dayNightCycle = 0;
    const nightFraction = (Math.cos(this.dayNightCycle) + 1) / 2;

    // Ground grid scroll
    this.groundOffset = (this.groundOffset + gameSpeed) % 40;

    // City layer scroll
    for (const layer of this.cityLayers) {
      layer.offset = (layer.offset + gameSpeed * (layer.scrollSpeed / 3)) % layer.totalWidth;
    }

    // Neon signs scroll
    for (const sign of this.neonSigns) {
      sign.x -= sign.scrollSpeed * (gameSpeed / 5);
      sign.pulseTime += 0.05;
      if (sign.x < -200) sign.x = CONFIG.CANVAS.WIDTH + 100;
    }

    // Stars twinkle
    for (const star of this.stars) {
      star.twinkle += star.speed;
    }
  }

  _getSkyGradient(ctx) {
    const nightFraction = (Math.cos(this.dayNightCycle) + 1) / 2;
    const topR = Math.floor(Utils.lerp(8, 15, 1 - nightFraction));
    const topG = Math.floor(Utils.lerp(6, 12, 1 - nightFraction));
    const topB = Math.floor(Utils.lerp(20, 35, 1 - nightFraction));
    const botR = Math.floor(Utils.lerp(10, 20, 1 - nightFraction));
    const botG = Math.floor(Utils.lerp(8, 15, 1 - nightFraction));
    const botB = Math.floor(Utils.lerp(28, 45, 1 - nightFraction));

    const grad = ctx.createLinearGradient(0, 0, 0, CONFIG.CANVAS.GROUND_Y);
    grad.addColorStop(0, `rgb(${topR},${topG},${topB})`);
    grad.addColorStop(1, `rgb(${botR},${botG},${botB})`);
    return grad;
  }

  draw(ctx) {
    const nightFraction = (Math.cos(this.dayNightCycle) + 1) / 2;
    const W = CONFIG.CANVAS.WIDTH;
    const H = CONFIG.CANVAS.HEIGHT;
    const GY = CONFIG.CANVAS.GROUND_Y;

    // Sky
    ctx.fillStyle = this._getSkyGradient(ctx);
    ctx.fillRect(0, 0, W, H);

    // Stars (more visible at night)
    if (nightFraction > 0.3) {
      ctx.save();
      for (const star of this.stars) {
        const twinkle = (Math.sin(star.twinkle) + 1) / 2;
        const alpha = nightFraction * (0.4 + twinkle * 0.6);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#e0e8ff';
        ctx.shadowColor = '#8888ff';
        ctx.shadowBlur = 3;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // City layers (far to near)
    for (let li = 0; li < this.cityLayers.length; li++) {
      const layer = this.cityLayers[li];
      const brightness = 0.3 + li * 0.25;
      ctx.save();

      for (const bld of layer.buildings) {
        const drawX = bld.x - layer.offset;
        const wrappedX = ((drawX % layer.totalWidth) + layer.totalWidth) % layer.totalWidth - layer.totalWidth * 0.1;

        if (wrappedX > W + 50) continue;

        const by = GY - bld.h;
        ctx.fillStyle = bld.color;
        ctx.fillRect(wrappedX, by, bld.w, bld.h);

        // Windows
        if (li >= 1) {
          const winCols = Math.floor(bld.w / 12);
          const winRows = Math.floor(bld.h / 16);
          for (let wr = 0; wr < winRows; wr++) {
            for (let wc = 0; wc < winCols; wc++) {
              const lit = (Math.sin(bld.x * 0.3 + wc * 7 + wr * 3) > 0.2);
              if (lit) {
                const wx = wrappedX + 4 + wc * 12;
                const wy = by + 6 + wr * 16;
                const winColor = wc % 3 === 0 ? `rgba(0,200,220,${0.5 * brightness})`
                  : wc % 3 === 1 ? `rgba(180,0,255,${0.4 * brightness})`
                  : `rgba(255,140,0,${0.3 * brightness})`;
                ctx.fillStyle = winColor;
                ctx.fillRect(wx, wy, 6, 8);
              }
            }
          }
        }

        // Building outlines for near layer
        if (li === 2) {
          const outlineColor = `rgba(0,220,255,${0.15})`;
          ctx.strokeStyle = outlineColor;
          ctx.lineWidth = 1;
          ctx.strokeRect(wrappedX, by, bld.w, bld.h);
        }
      }
      ctx.restore();
    }

    // Neon signs
    ctx.save();
    for (const sign of this.neonSigns) {
      const pulse = (Math.sin(sign.pulseTime) + 1) / 2;
      const alpha = 0.5 + pulse * 0.5;
      ctx.globalAlpha = alpha;
      ctx.font = '700 9px "Share Tech Mono", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = sign.color;
      ctx.shadowColor = sign.color;
      ctx.shadowBlur = 10 * pulse;
      ctx.fillText(sign.text, sign.x, sign.y);
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.restore();

    // Ground
    ctx.fillStyle = CONFIG.COLORS.GROUND;
    ctx.fillRect(0, GY, W, H - GY);

    // Horizon glow
    const horizonGrad = ctx.createLinearGradient(0, GY - 4, 0, GY + 8);
    horizonGrad.addColorStop(0, 'rgba(0,255,255,0.35)');
    horizonGrad.addColorStop(0.5, 'rgba(0,200,255,0.12)');
    horizonGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = horizonGrad;
    ctx.fillRect(0, GY - 4, W, 12);

    // Ground grid
    ctx.save();
    ctx.strokeStyle = CONFIG.COLORS.GRID_LINE;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.7;

    // Vertical grid lines scrolling
    const gridSpacing = 40;
    for (let gx = -(this.groundOffset % gridSpacing); gx <= W; gx += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(gx, GY);
      ctx.lineTo(gx, H);
      ctx.stroke();
    }

    // Horizontal lines
    for (let gy = GY; gy <= H; gy += 20) {
      ctx.globalAlpha = 0.3 * (1 - (gy - GY) / (H - GY));
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(W, gy);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

window.Background = Background;
