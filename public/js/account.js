'use strict';

class AccountUI {
  constructor() { this.user = null; this.panel = null; this.leaderboardPanel = null; }
  init() {
    this.panel = document.getElementById('account-panel');
    this.leaderboardPanel = document.getElementById('leaderboard-panel');
    document.getElementById('accountNav')?.addEventListener('click', () => this.openAccount());
    document.getElementById('leaderboardNav')?.addEventListener('click', () => this.openLeaderboard());
    document.getElementById('closeAccount')?.addEventListener('click', () => this.close(this.panel));
    document.getElementById('closeLeaderboard')?.addEventListener('click', () => this.close(this.leaderboardPanel));
    document.getElementById('loginForm')?.addEventListener('submit', (e) => this.submitAuth(e, 'login'));
    document.getElementById('registerForm')?.addEventListener('submit', (e) => this.submitAuth(e, 'register'));
    document.getElementById('logoutBtn')?.addEventListener('click', () => this.logout());
    document.getElementById('leaderboardPrev')?.addEventListener('click', () => this.changePage(-1));
    document.getElementById('leaderboardNext')?.addEventListener('click', () => this.changePage(1));
    document.getElementById('leaderboardRetry')?.addEventListener('click', () => window.leaderboardStore.refresh());
    window.addEventListener('authchange', (e) => this.setUser(e.detail));
    this.restore();
  }
  async restore() { if (!window.API.getToken()) return this.render(); try { this.setUser(await window.API.currentUser()); } catch (_) { window.API.clearToken(); } }
  setUser(user) { this.user = user || null; this.render(); }
  render() {
    const badge = document.getElementById('authStatus'); if (badge) badge.textContent = this.user ? `// ${this.user.display_name}` : '// GUEST MODE';
    const loggedIn = Boolean(this.user);
    document.getElementById('authForms')?.classList.toggle('hidden', loggedIn);
    document.getElementById('profileView')?.classList.toggle('hidden', !loggedIn);
    if (loggedIn) { const name = document.getElementById('profileName'); if (name) name.textContent = this.user.display_name; }
  }
  openAccount() { this.render(); this.panel?.classList.add('visible'); if (this.user) this.loadScores(); }
  close(panel) { panel?.classList.remove('visible'); if (panel === this.leaderboardPanel) window.leaderboardStore.stopPolling(); }
  setMessage(id, message, error = false) { const el = document.getElementById(id); if (el) { el.textContent = message || ''; el.classList.toggle('error', error); } }
  async submitAuth(event, mode) {
    event.preventDefault(); const form = event.currentTarget; const button = form.querySelector('button[type=submit]');
    const data = new FormData(form); this.setMessage('authMessage', 'CONNECTING…'); if (button) button.disabled = true;
    try { const result = mode === 'login' ? await window.API.login(data.get('email'), data.get('password')) : await window.API.register(data.get('displayName'), data.get('email'), data.get('password')); this.setUser(result.user); form.reset(); this.setMessage('authMessage', `ONLINE AS ${result.user.display_name}`); }
    catch (error) { this.setMessage('authMessage', error.message, true); }
    finally { if (button) button.disabled = false; }
  }
  async logout() { try { await window.API.logout(); } finally { this.setUser(null); this.setMessage('authMessage', 'SIGNED OUT — GUEST MODE'); } }
  async loadScores() {
    const target = document.getElementById('personalScores'); if (!target) return;
    target.textContent = 'SYNCING RUN HISTORY…';
    try {
      const scores = await window.API.userScores(); target.replaceChildren();
      if (!scores.length) { target.textContent = 'NO RUNS SAVED YET.'; return; }
      const best = Math.max(...scores.map((score) => Number(score.score) || 0));
      const summary = document.createElement('p'); summary.textContent = `BEST ${best.toLocaleString()} // ${scores.length} SAVED RUN${scores.length === 1 ? '' : 'S'}`; target.appendChild(summary);
      scores.slice(0, 5).forEach((score) => { const row = document.createElement('p'); row.textContent = `${Number(score.score || 0).toLocaleString()}  ·  ${score.created_at ? new Date(score.created_at).toLocaleDateString() : '—'}`; target.appendChild(row); });
    } catch (error) { target.textContent = error.message || 'RUN HISTORY UNAVAILABLE.'; }
  }
  openLeaderboard() { this.leaderboardPanel?.classList.add('visible'); window.leaderboardStore.refresh(1, 10); window.leaderboardStore.startPolling(); }
  async changePage(delta) { const state = window.leaderboardStore.getState(); const max = Math.max(1, Math.ceil(state.total / state.pageSize)); const page = Math.min(max, Math.max(1, state.page + delta)); if (page !== state.page) await window.leaderboardStore.refresh(page, state.pageSize); }
  renderLeaderboard(state) {
    const body = document.getElementById('leaderboardBody'); const status = document.getElementById('leaderboardStatus'); if (!body || !status) return;
    status.textContent = state.loading ? 'SYNCING…' : state.error ? state.error : state.total ? `PAGE ${state.page} // ${Math.ceil(state.total / state.pageSize)}${state.myRank ? ` // YOUR RANK #${state.myRank}` : ''}` : 'NO SCORES YET — BE FIRST';
    body.replaceChildren();
    state.entries.forEach((entry) => { const row = document.createElement('div'); row.className = 'leaderboard-row'; [entry.rank, entry.displayName || 'GUEST', Number(entry.score || 0).toLocaleString(), entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : '—'].forEach((value) => { const cell = document.createElement('span'); cell.textContent = String(value); row.appendChild(cell); }); body.appendChild(row); });
    document.getElementById('leaderboardPrev').disabled = state.loading || state.page <= 1;
    document.getElementById('leaderboardNext').disabled = state.loading || state.page >= Math.max(1, Math.ceil(state.total / state.pageSize));
    document.getElementById('leaderboardRetry').classList.toggle('hidden', !state.error);
  }
}

window.AccountUI = AccountUI;
window.accountUI = new AccountUI();
document.addEventListener('DOMContentLoaded', () => { window.accountUI.init(); window.leaderboardStore.subscribe((state) => window.accountUI.renderLeaderboard(state)); });
