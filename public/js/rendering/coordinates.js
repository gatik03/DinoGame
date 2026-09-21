'use strict';

// One gameplay pixel becomes one hundredth of a Three.js world unit. The
// gameplay plane remains X/Y; Z is deliberately fixed for all game objects.
window.NEON_WORLD_SCALE = 0.01;

function getRenderViewport(viewportWidth, viewportHeight, logicalWidth, logicalHeight) {
  const width = Math.max(1, Number(viewportWidth) || logicalWidth);
  const height = Math.max(1, Number(viewportHeight) || logicalHeight);
  const scale = Math.min(width / logicalWidth, height / logicalHeight, 1);

  return {
    logicalWidth,
    logicalHeight,
    scale,
    width: Math.max(1, Math.round(logicalWidth * scale)),
    height: Math.max(1, Math.round(logicalHeight * scale)),
    dpr: Math.min(window.devicePixelRatio || 1, 2),
  };
}

function gameplayToWorld(x, y) {
  return {
    x: x * window.NEON_WORLD_SCALE,
    y: -y * window.NEON_WORLD_SCALE,
    z: 0,
  };
}

window.gameplayToWorld = gameplayToWorld;
window.getRenderViewport = getRenderViewport;
