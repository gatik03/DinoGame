'use strict';

window.Utils = {
  lerp(a, b, t) {
    return a + (b - a) * t;
  },

  clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
  },

  randomBetween(min, max) {
    return Math.random() * (max - min) + min;
  },

  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  },

  distanceSq(ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    return dx * dx + dy * dy;
  },

  rectOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    const margin = 4;
    return (
      ax + margin < bx + bw - margin &&
      ax + aw - margin > bx + margin &&
      ay + margin < by + bh - margin &&
      ay + ah - margin > by + margin
    );
  },

  drawNeonText(ctx, text, x, y, size, color, shadowColor) {
    ctx.save();
    ctx.font = `900 ${size}px 'Orbitron', monospace`;
    ctx.fillStyle = color;
    ctx.shadowColor = shadowColor || color;
    ctx.shadowBlur = 18;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
    ctx.shadowBlur = 32;
    ctx.globalAlpha = 0.4;
    ctx.fillText(text, x, y);
    ctx.restore();
  },

  drawNeonTextLeft(ctx, text, x, y, size, color) {
    ctx.save();
    ctx.font = `700 ${size}px 'Orbitron', monospace`;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
    ctx.restore();
  },

  drawNeonRect(ctx, x, y, w, h, color, glowSize) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = glowSize || 12;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  },

  drawFilledNeonRect(ctx, x, y, w, h, fillColor, glowColor, glowSize) {
    ctx.save();
    ctx.fillStyle = fillColor;
    ctx.shadowColor = glowColor || fillColor;
    ctx.shadowBlur = glowSize || 12;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  },

  drawNeonCircle(ctx, x, y, r, color, glowSize) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = glowSize || 12;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },

  drawFilledCircle(ctx, x, y, r, color, glowSize) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = glowSize || 10;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  formatScore(score) {
    return String(Math.floor(score)).padStart(6, '0');
  },

  formatTime(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  },

  easeInOut(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  },

  roundRect(ctx, x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },
};
