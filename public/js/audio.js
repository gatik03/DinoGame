'use strict';

class AudioSystem {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.muted = false;
    this.musicEnabled = true;
    this.musicInterval = null;
    this.musicOscillators = [];
    this.initialized = false;
  }

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.7;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.8;
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.25;
      this.musicGain.connect(this.masterGain);

      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not available:', e);
    }
  }

  unlock() {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  _playTone(frequency, type, duration, volume, startDelay = 0, freqEnd = null) {
    if (!this.initialized || this.muted || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.type = type;
      const start = this.ctx.currentTime + startDelay;
      osc.frequency.setValueAtTime(frequency, start);
      if (freqEnd !== null) {
        osc.frequency.linearRampToValueAtTime(freqEnd, start + duration);
      }
      gain.gain.setValueAtTime(volume, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      osc.start(start);
      osc.stop(start + duration + 0.02);
    } catch (e) {}
  }

  playJump() {
    this._playTone(180, 'sine', 0.12, 0.35, 0, 300);
  }

  playDoubleJump() {
    this._playTone(300, 'sine', 0.1, 0.4, 0, 480);
    this._playTone(420, 'sine', 0.08, 0.25, 0.05, 560);
  }

  playDash() {
    this._playTone(80, 'sawtooth', 0.1, 0.4, 0, 40);
    this._playTone(200, 'sine', 0.08, 0.25, 0.03, 100);
  }

  playDeath() {
    this._playTone(220, 'sawtooth', 0.15, 0.5);
    this._playTone(180, 'sawtooth', 0.3, 0.4, 0.1, 50);
    this._playTone(60, 'square', 0.5, 0.3, 0.2, 30);
  }

  playPickup() {
    this._playTone(880, 'sine', 0.06, 0.3);
    this._playTone(1100, 'sine', 0.06, 0.2, 0.04);
  }

  playShieldActivate() {
    this._playTone(330, 'triangle', 0.12, 0.4, 0, 440);
    this._playTone(440, 'triangle', 0.12, 0.3, 0.06, 550);
  }

  playShieldHit() {
    this._playTone(200, 'square', 0.1, 0.5, 0, 180);
  }

  playBossIntro() {
    this._playTone(55, 'square', 0.6, 0.7, 0, 45);
    this._playTone(80, 'sawtooth', 0.4, 0.5, 0.3, 60);
  }

  playBossHit() {
    this._playTone(110, 'sawtooth', 0.12, 0.4, 0, 80);
  }

  playBossDefeat() {
    for (let i = 0; i < 6; i++) {
      this._playTone(200 + i * 80, 'sine', 0.15, 0.35, i * 0.08);
    }
  }

  playAchievement() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => this._playTone(f, 'sine', 0.12, 0.3, i * 0.1));
  }

  playPause() {
    this._playTone(440, 'sine', 0.08, 0.3);
    this._playTone(330, 'sine', 0.08, 0.25, 0.1);
  }

  startMusic() {
    if (!this.musicEnabled || !this.initialized || !this.ctx) return;
    this.stopMusic();

    const notes = [55, 55, 65, 55, 73, 55, 82, 73];
    let beat = 0;
    const bpm = 128;
    const interval = (60 / bpm) * 1000 * 0.5;

    this.musicInterval = setInterval(() => {
      if (!this.musicEnabled || this.muted) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.type = 'sine';
        osc.frequency.value = notes[beat % notes.length];
        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + 0.22);
        beat++;

        if (beat % 4 === 0) {
          const hiOsc = this.ctx.createOscillator();
          const hiGain = this.ctx.createGain();
          hiOsc.connect(hiGain);
          hiGain.connect(this.musicGain);
          hiOsc.type = 'square';
          hiOsc.frequency.value = 220;
          hiGain.gain.setValueAtTime(0.15, this.ctx.currentTime);
          hiGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
          hiOsc.start(this.ctx.currentTime);
          hiOsc.stop(this.ctx.currentTime + 0.1);
        }
      } catch (e) {}
    }, interval);
  }

  stopMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.masterGain) {
      this.masterGain.gain.value = muted ? 0 : 0.7;
    }
    if (muted) this.stopMusic();
    else if (this.musicEnabled) this.startMusic();
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = enabled;
    if (!enabled) this.stopMusic();
  }
}

window.AudioSystem = AudioSystem;
