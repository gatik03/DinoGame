'use strict';

// One gameplay pixel becomes one hundredth of a Three.js world unit. The
// gameplay plane remains X/Y; Z is deliberately fixed for all game objects.
window.NEON_WORLD_SCALE = 0.01;

function gameplayToWorld(x, y) {
  return {
    x: x * window.NEON_WORLD_SCALE,
    y: -y * window.NEON_WORLD_SCALE,
    z: 0,
  };
}

window.gameplayToWorld = gameplayToWorld;
