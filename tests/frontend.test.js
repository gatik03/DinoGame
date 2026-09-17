'use strict';

const fs = require('fs');
const vm = require('vm');
const path = require('path');

function loadBrowserModule(file, window, document) {
  const context = vm.createContext({ window, document, console, CustomEvent: function CustomEvent(type, init) { this.type = type; this.detail = init?.detail; } });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
  return window;
}

describe('account and leaderboard frontend foundation', () => {
  test('leaderboard store exposes refreshable provider-neutral state', async () => {
    const listeners = [];
    const storage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
    const window = { localStorage: storage, dispatchEvent: () => {}, setInterval, clearInterval };
    const document = { addEventListener: () => {} };
    loadBrowserModule('public/js/api.js', window, document);
    window.API.getLeaderboard = jest.fn().mockResolvedValue({ entries: [{ rank: 1, displayName: 'RUNNER', score: 42 }], page: 1, pageSize: 10, total: 1 });
    window.leaderboardStore.subscribe((state) => listeners.push(state));
    await window.leaderboardStore.refresh();
    expect(window.API.getLeaderboard).toHaveBeenCalledWith(1, 10);
    expect(window.leaderboardStore.getState().entries[0].score).toBe(42);
    expect(listeners.at(-1).loading).toBe(false);
  });

  test('leaderboard rendering uses text nodes for untrusted display names', () => {
    const elements = {};
    const element = () => ({ textContent: '', disabled: false, classList: { toggle: () => {} }, replaceChildren() { this.children = []; }, appendChild(child) { this.children.push(child); } });
    ['leaderboardBody', 'leaderboardStatus', 'leaderboardRetry', 'leaderboardPrev', 'leaderboardNext'].forEach((id) => { elements[id] = element(); });
    const window = { localStorage: { getItem: () => null }, addEventListener: () => {}, setInterval, clearInterval, leaderboardStore: { subscribe: () => {}, stopPolling: () => {}, refresh: () => {}, getState: () => ({}) } };
    const document = { addEventListener: () => {}, getElementById: (id) => elements[id], createElement: () => ({ textContent: '', className: '', children: [], appendChild(child) { this.children.push(child); } }) };
    loadBrowserModule('public/js/account.js', window, document);
    window.accountUI.renderLeaderboard({ loading: false, error: null, entries: [{ rank: 1, displayName: '<img src=x onerror=alert(1)>', score: 5, createdAt: '' }], page: 1, pageSize: 10, total: 1 });
    expect(elements.leaderboardBody.children[0].children[1].textContent).toContain('<img');
  });
});
