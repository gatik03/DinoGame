'use strict';

window.API = {
  BASE_URL: '',

  async createGameSession() {
    try {
      const res = await fetch(`${this.BASE_URL}/api/game-sessions`, { method: 'POST' });
      return res.ok ? await res.json() : null;
    } catch (e) {
      console.warn('Game session creation failed:', e);
      return null;
    }
  },

  async finishGameSession(session, score, durationMs, displayName) {
    if (!session?.id || !session.sessionToken) return null;
    try {
      const res = await fetch(`${this.BASE_URL}/api/game-sessions/${session.id}/finish`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken: session.sessionToken, score: Math.floor(score), durationMs, displayName }),
      });
      return res.ok ? await res.json() : { success: false, status: res.status };
    } catch (e) {
      console.warn('Game session finish failed:', e);
      return null;
    }
  },

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
      return data.entries || data.scores || [];
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
