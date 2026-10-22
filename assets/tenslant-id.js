/* Tenslant ID browser SDK. Serve this file from your own game or copy it into your project. */
(function (global) {
  'use strict';
  function base64url(bytes) { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, ''); }
  function randomString(bytes = 32) { const b = new Uint8Array(bytes); crypto.getRandomValues(b); return base64url(b); }
  async function digest(s) { return base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))); }
  function TenslantID(options) {
    if (!options || !options.apiBase || !options.clientId || !options.redirectUri) throw new Error('TenslantID requires apiBase, clientId, and redirectUri.');
    this.apiBase = options.apiBase.replace(/\/$/, ''); this.clientId = options.clientId; this.redirectUri = options.redirectUri;
    this.storageKey = 'tenslant_id_token_' + this.clientId; this.verifierKey = 'tenslant_id_verifier_' + this.clientId; this.stateKey = 'tenslant_id_state_' + this.clientId;
  }
  TenslantID.prototype.authorize = async function (scopes) {
    const verifier = randomString(48), state = randomString(24), challenge = await digest(verifier);
    sessionStorage.setItem(this.verifierKey, verifier); sessionStorage.setItem(this.stateKey, state);
    const u = new URL('/oauth/authorize', this.apiBase); u.searchParams.set('client_id', this.clientId); u.searchParams.set('redirect_uri', this.redirectUri); u.searchParams.set('code_challenge', challenge); u.searchParams.set('state', state); u.searchParams.set('scope', (scopes || ['profile', 'saves:read', 'saves:write']).join(' '));
    location.assign(u.toString());
  };
  TenslantID.prototype.handleCallback = async function () {
    const u = new URL(location.href), code = u.searchParams.get('code'), state = u.searchParams.get('state'), error = u.searchParams.get('error');
    if (error) { this._cleanUrl(u); throw new Error(error); }
    if (!code) return false;
    const expected = sessionStorage.getItem(this.stateKey), verifier = sessionStorage.getItem(this.verifierKey);
    if (!expected || !verifier || !state || state !== expected) { this._cleanUrl(u); throw new Error('OAuth state check failed. Please sign in again.'); }
    try {
      const r = await fetch(this.apiBase + '/api/oauth/token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: this.clientId, code, redirect_uri: this.redirectUri, code_verifier: verifier }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Token exchange failed.');
      sessionStorage.setItem(this.storageKey, d.access_token); return true;
    } finally { sessionStorage.removeItem(this.verifierKey); sessionStorage.removeItem(this.stateKey); this._cleanUrl(u); }
  };
  TenslantID.prototype._cleanUrl = function (u) { u.searchParams.delete('code'); u.searchParams.delete('state'); u.searchParams.delete('error'); history.replaceState({}, document.title, u.pathname + (u.search ? u.search : '') + u.hash); };
  TenslantID.prototype.logout = async function () { const token = sessionStorage.getItem(this.storageKey); if (token) { try { await fetch(this.apiBase + '/api/oauth/revoke', { method: 'POST', headers: { Authorization: 'Bearer ' + token } }); } catch {} } sessionStorage.removeItem(this.storageKey); };
  TenslantID.prototype._request = async function (path, options) { const token = sessionStorage.getItem(this.storageKey); if (!token) throw new Error('Not signed in with Tenslant ID. Call authorize() first.'); const headers = Object.assign({ Authorization: 'Bearer ' + token }, options && options.headers || {}); const r = await fetch(this.apiBase + path, Object.assign({}, options, { headers })); const d = await r.json(); if (!r.ok) { if (r.status === 401) sessionStorage.removeItem(this.storageKey); throw new Error(d.error || 'Tenslant ID request failed.'); } return d; };
  TenslantID.prototype.me = function () { return this._request('/api/oauth/userinfo', { method: 'GET' }); };
  TenslantID.prototype.loadAll = function () { return this._request('/api/games/' + encodeURIComponent(this.clientId) + '/saves', { method: 'GET' }); };
  TenslantID.prototype.load = function (key) { return this._request('/api/games/' + encodeURIComponent(this.clientId) + '/saves/' + encodeURIComponent(key), { method: 'GET' }); };
  TenslantID.prototype.save = function (key, data, expectedRevision) { const body = { data }; if (expectedRevision !== undefined) body.expectedRevision = expectedRevision; return this._request('/api/games/' + encodeURIComponent(this.clientId) + '/saves/' + encodeURIComponent(key), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); };
  TenslantID.prototype.deleteSave = function (key) { return this._request('/api/games/' + encodeURIComponent(this.clientId) + '/saves/' + encodeURIComponent(key), { method: 'DELETE' }); };
  TenslantID.prototype.achievements = function () { return this._request('/api/games/' + encodeURIComponent(this.clientId) + '/achievements', { method: 'GET' }); };
  TenslantID.prototype.unlockAchievement = function (id, title, metadata) { return this._request('/api/games/' + encodeURIComponent(this.clientId) + '/achievements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: id, title: title, metadata: metadata || {} }) }); };
  TenslantID.prototype.inventory = function () { return this._request('/api/games/' + encodeURIComponent(this.clientId) + '/inventory', { method: 'GET' }); };
  TenslantID.prototype.setItem = function (id, quantity, data) { return this._request('/api/games/' + encodeURIComponent(this.clientId) + '/inventory/' + encodeURIComponent(id), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quantity: quantity, data: data || {} }) }); };
  TenslantID.prototype.removeItem = function (id) { return this._request('/api/games/' + encodeURIComponent(this.clientId) + '/inventory/' + encodeURIComponent(id), { method: 'DELETE' }); };
  TenslantID.prototype.stats = function () { return this._request('/api/games/' + encodeURIComponent(this.clientId) + '/stats', { method: 'GET' }); };
  TenslantID.prototype.setStat = function (key, value) { return this._request('/api/games/' + encodeURIComponent(this.clientId) + '/stats/' + encodeURIComponent(key), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: value }) }); };
  TenslantID.prototype.friends = function () { return this._request('/api/friends', { method: 'GET' }); };
  TenslantID.prototype.addFriend = function (username) { return this._request('/api/friends', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: username }) }); };
  TenslantID.prototype.respondFriend = function (userId, action) { return this._request('/api/friends', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, action: action }) }); };
  TenslantID.prototype.removeFriend = function (userId) { return this._request('/api/friends/' + encodeURIComponent(userId), { method: 'DELETE' }); };
  TenslantID.prototype.notifications = function () { return this._request('/api/notifications', { method: 'GET' }); };
  TenslantID.prototype.notifySelf = function (title, message, data) { return this._request('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: title, message: message, data: data || {} }) }); };
  TenslantID.prototype.markNotificationRead = function (id) { return this._request('/api/notifications/' + encodeURIComponent(id) + '/read', { method: 'POST' }); };
  TenslantID.prototype.listRooms = function () { return this._request('/api/online/rooms', { method: 'GET' }); };
  TenslantID.prototype.createRoom = function (options) {
    options = options || {};
    return this._request('/api/online/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: options.name || 'Room', maxPlayers: options.maxPlayers || 8, visibility: options.visibility || 'public' }) });
  };
  TenslantID.prototype._connectRoomTicket = function (roomId, ticket, handlers) {
    handlers = handlers || {};
    const u = new URL('/api/online/rooms/' + encodeURIComponent(roomId) + '/ws', this.apiBase);
    u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
    u.searchParams.set('ticket', ticket);
    const socket = new WebSocket(u.toString());
    socket.addEventListener('open', function (event) { if (handlers.onOpen) handlers.onOpen(event, socket); });
    socket.addEventListener('message', function (event) {
      let data; try { data = JSON.parse(event.data); } catch { data = { type: 'raw', data: event.data }; }
      if (handlers.onMessage) handlers.onMessage(data, socket);
    });
    socket.addEventListener('close', function (event) { if (handlers.onClose) handlers.onClose(event, socket); });
    socket.addEventListener('error', function (event) { if (handlers.onError) handlers.onError(event, socket); });
    socket.sendEvent = function (event, data) { if (socket.readyState !== WebSocket.OPEN) throw new Error('Room socket is not connected.'); socket.send(JSON.stringify({ type: 'event', event: event, data: data === undefined ? null : data })); };
    return socket;
  };
  TenslantID.prototype.connectRoom = async function (roomId, handlers) {
    const result = await this._request('/api/online/rooms/' + encodeURIComponent(roomId) + '/ticket', { method: 'POST' });
    return { room: result.room || { id: roomId }, socket: this._connectRoomTicket(roomId, result.ticket, handlers) };
  };
  TenslantID.prototype.joinRoom = async function (code, handlers) {
    const result = await this._request('/api/online/rooms/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: code }) });
    return { room: result.room, socket: this._connectRoomTicket(result.room.id, result.ticket, handlers) };
  };
  TenslantID.prototype.closeRoom = function (roomId) { return this._request('/api/online/rooms/' + encodeURIComponent(roomId), { method: 'DELETE' }); };
  TenslantID.prototype.reportEvent = function (eventType, details) { return this._request('/api/anti-cheat/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event_type: eventType, details: details || {} }) }); };
  global.TenslantID = TenslantID;
})(window);
