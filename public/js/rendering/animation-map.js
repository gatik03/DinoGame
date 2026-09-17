'use strict';

function playerStateToAnimation(state) {
  const animations = {
    idle: 'idle',
    running: 'run',
    jumping: 'jump',
    falling: 'fall',
    sliding: 'duck',
    dashing: 'roll',
    dead: 'death',
  };
  return animations[state] || 'run';
}

window.playerStateToAnimation = playerStateToAnimation;
