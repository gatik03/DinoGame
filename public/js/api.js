'use strict';

window.API = {
  BASE_URL: '',

  async submitScore(playerName, score, stats) {
    try {
      const res = await fetch(`${this.BASE_URL}/api/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName, score: Math.floor(score), stats }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.warn('Score submit failed:', err);
        return null;
      }
      return await res.json();
    } catch (e) {
      console.warn('Score submit error:', e);
      return null;
    }
  },

  async getLeaderboard(limit = 10) {
    try {
      const res = await fetch(`${this.BASE_URL}/api/leaderboard?limit=${limit}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.scores || [];
    } catch (e) {
      console.warn('Leaderboard fetch error:', e);
      return [];
    }
  },

  async getStats() {
    try {
      const res = await fetch(`${this.BASE_URL}/api/stats`);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.warn('Stats fetch error:', e);
      return null;
    }
  },
};
