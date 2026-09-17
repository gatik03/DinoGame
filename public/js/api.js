'use strict';

const AUTH_STORAGE_KEY = 'neonRunnerAuthToken';
function safeStorage() { try { return window.localStorage; } catch (_) { return null; } }

class LeaderboardStore {
  constructor(api) { this.api = api; this.state = { entries: [], page: 1, pageSize: 10, total: 0, loading: false, error: null }; this.listeners = new Set(); this.timer = null; }
  getState() { return { ...this.state, entries: [...this.state.entries] }; }
  subscribe(listener) { this.listeners.add(listener); listener(this.getState()); return () => this.listeners.delete(listener); }
  _emit() { const state = this.getState(); this.listeners.forEach((listener) => listener(state)); }
  async refresh(page = this.state.page, pageSize = this.state.pageSize) {
    this.state = { ...this.state, loading: true, error: null, page, pageSize }; this._emit();
    try { const data = await this.api.getLeaderboard(page, pageSize); if (!data) throw new Error('Leaderboard unavailable'); this.state = { ...this.state, ...data, entries: data.entries || [], loading: false, error: null }; }
    catch (error) { this.state = { ...this.state, loading: false, error: error.message || 'Leaderboard unavailable' }; }
    this._emit(); return this.getState();
  }
  startPolling(intervalMs = 30000) { this.stopPolling(); this.timer = window.setInterval(() => this.refresh(), intervalMs); return () => this.stopPolling(); }
  stopPolling() { if (this.timer) window.clearInterval(this.timer); this.timer = null; }
}

window.API = {
  BASE_URL: '',
  getToken() { return safeStorage()?.getItem(AUTH_STORAGE_KEY) || null; },
  setToken(token) { safeStorage()?.setItem(AUTH_STORAGE_KEY, token); },
  clearToken() { safeStorage()?.removeItem(AUTH_STORAGE_KEY); window.dispatchEvent(new CustomEvent('authchange', { detail: null })); },
  async request(path, options = {}) {
    const headers = { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) };
    const token = this.getToken(); if (token) headers.Authorization = `Bearer ${token}`;
    let response; try { response = await fetch(`${this.BASE_URL}${path}`, { ...options, headers }); } catch (_) { throw new Error('Network connection failed'); }
    const body = await response.json().catch(() => ({}));
    if (response.status === 401) this.clearToken();
    if (!response.ok) { const error = new Error(body.error || 'Request failed'); error.status = response.status; throw error; }
    return body;
  },
  async createGameSession() { try { return await this.request('/api/game-sessions', { method: 'POST' }); } catch (_) { console.warn('Game session creation failed'); return null; } },
  async finishGameSession(session, score, durationMs, displayName) { if (!session?.id || !session.sessionToken) return null; try { return await this.request(`/api/game-sessions/${session.id}/finish`, { method: 'POST', body: JSON.stringify({ sessionToken: session.sessionToken, score: Math.floor(score), durationMs, displayName }) }); } catch (error) { return error.status ? { success: false, status: error.status, error: error.message } : null; } },
  async submitScore(playerName, score, stats) { try { return await this.request('/api/score', { method: 'POST', body: JSON.stringify({ playerName, score: Math.floor(score), stats }) }); } catch (error) { return { success: false, status: error.status || 0, error: error.message }; } },
  async register(displayName, email, password) { const data = await this.request('/api/users/register', { method: 'POST', body: JSON.stringify({ displayName, email, password }) }); this.setToken(data.token); window.dispatchEvent(new CustomEvent('authchange', { detail: data.user })); return data; },
  async login(email, password) { const data = await this.request('/api/users/login', { method: 'POST', body: JSON.stringify({ email, password }) }); this.setToken(data.token); window.dispatchEvent(new CustomEvent('authchange', { detail: data.user })); return data; },
  async currentUser() { return (await this.request('/api/users/me')).user; },
  async userScores() { return (await this.request('/api/users/me/scores')).scores || []; },
  async logout() { try { await this.request('/api/users/logout', { method: 'POST' }); } finally { this.clearToken(); } },
  async getLeaderboard(page = 1, pageSize = 10) { return this.request(`/api/leaderboard?page=${Math.max(1, page)}&pageSize=${Math.min(50, Math.max(1, pageSize))}`); },
  async getStats() { try { return await this.request('/api/stats'); } catch (_) { return null; } },
};

window.leaderboardStore = new LeaderboardStore(window.API);
