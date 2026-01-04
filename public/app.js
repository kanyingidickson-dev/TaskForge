const $ = (id) => document.getElementById(id);

function setOut(value) {
  $('out').textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

function appendActivity(line) {
  const el = $('activity');
  const next = `${new Date().toISOString()} ${line}\n`;
  if (el.textContent === 'Not connected.' || el.textContent === 'Disconnected.') {
    el.textContent = next;
    return;
  }
  el.textContent = next + el.textContent;
}

function setActivity(value) {
  $('activity').textContent = value;
}

const storage = {
  getAccessToken() {
    return localStorage.getItem('taskforge.accessToken') || '';
  },
  setAccessToken(token) {
    localStorage.setItem('taskforge.accessToken', token);
  },
  getRefreshToken() {
    return localStorage.getItem('taskforge.refreshToken') || '';
  },
  setRefreshToken(token) {
    localStorage.setItem('taskforge.refreshToken', token);
  },
  clear() {
    localStorage.removeItem('taskforge.accessToken');
    localStorage.removeItem('taskforge.refreshToken');
  },
};

async function api(path, { method = 'GET', body } = {}) {
  const headers = {};

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const token = storage.getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const err = json || { error: { code: 'HTTP_ERROR', message: text || res.statusText } };
    const message = err && err.error ? `${err.error.code}: ${err.error.message}` : `HTTP ${res.status}`;
    const enriched = { status: res.status, message, response: err };
    throw enriched;
  }

  return json;
}

let ws;

function wsUrl(token) {
  const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${scheme}://${location.host}/realtime?token=${encodeURIComponent(token)}`;
}

function ensureTeamIdSelected() {
  const teamId = $('teamId').value.trim();
  if (!teamId) {
    throw new Error('Select a teamId first');
  }
  return teamId;
}

function bind() {
  $('btnClear').addEventListener('click', () => {
    storage.clear();
    setOut('Cleared localStorage tokens.');
  });

  $('btnLogout').addEventListener('click', async () => {
    try {
      const refreshToken = storage.getRefreshToken();
      if (refreshToken) {
        await api('/auth/logout', { method: 'POST', body: { refreshToken } });
      }
    } catch (e) {
      setOut(e);
    } finally {
      storage.clear();
      setOut('Logged out and cleared tokens.');
    }
  });

  $('btnRegister').addEventListener('click', async () => {
    try {
      const body = {
        email: $('email').value.trim(),
        name: $('name').value.trim() || 'Dev User',
        password: $('password').value,
      };

      const result = await api('/auth/register', { method: 'POST', body });
      storage.setAccessToken(result.accessToken);
      storage.setRefreshToken(result.refreshToken);
      setOut(result);
    } catch (e) {
      setOut(e);
    }
  });

  $('btnLogin').addEventListener('click', async () => {
    try {
      const body = {
        email: $('email').value.trim(),
        password: $('password').value,
      };

      const result = await api('/auth/login', { method: 'POST', body });
      storage.setAccessToken(result.accessToken);
      storage.setRefreshToken(result.refreshToken);
      setOut(result);
    } catch (e) {
      setOut(e);
    }
  });

  $('btnMe').addEventListener('click', async () => {
    try {
      const result = await api('/me');
      setOut(result);
    } catch (e) {
      setOut(e);
    }
  });

  $('btnTeams').addEventListener('click', async () => {
    try {
      const result = await api('/teams');
      setOut(result);
      const first = result && result.teams && result.teams[0] && result.teams[0].team;
      if (first && first.id && !$('teamId').value) {
        $('teamId').value = first.id;
        $('wsTeamId').value = first.id;
      }
    } catch (e) {
      setOut(e);
    }
  });

  $('btnCreateTeam').addEventListener('click', async () => {
    try {
      const result = await api('/teams', {
        method: 'POST',
        body: { name: $('teamName').value.trim() || 'My Team' },
      });
      setOut(result);
      if (result && result.team && result.team.id) {
        $('teamId').value = result.team.id;
        $('wsTeamId').value = result.team.id;
      }
    } catch (e) {
      setOut(e);
    }
  });

  $('btnSelectTeam').addEventListener('click', () => {
    try {
      const teamId = ensureTeamIdSelected();
      $('wsTeamId').value = teamId;
      setOut({ selectedTeamId: teamId });
    } catch (e) {
      setOut({ error: { code: 'NO_TEAM', message: e.message } });
    }
  });

  $('btnCreateTask').addEventListener('click', async () => {
    try {
      const teamId = ensureTeamIdSelected();
      const body = {
        title: $('taskTitle').value.trim() || 'Ship realtime demo',
        priority: $('taskPriority').value,
        status: $('taskStatus').value,
      };
      const result = await api(`/teams/${teamId}/tasks`, { method: 'POST', body });
      setOut(result);
    } catch (e) {
      setOut(e);
    }
  });

  $('btnListTasks').addEventListener('click', async () => {
    try {
      const teamId = ensureTeamIdSelected();
      const result = await api(`/teams/${teamId}/tasks`);
      setOut(result);
    } catch (e) {
      setOut(e);
    }
  });

  $('btnWsConnect').addEventListener('click', () => {
    try {
      const token = storage.getAccessToken();
      if (!token) {
        setOut({ error: { code: 'NO_TOKEN', message: 'Login first to get an access token' } });
        return;
      }

      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        setOut('WebSocket already connected/connecting.');
        return;
      }

      setActivity('Connecting...');
      ws = new WebSocket(wsUrl(token));

      ws.onopen = () => {
        appendActivity('connected');
      };

      ws.onmessage = (event) => {
        appendActivity(event.data);
      };

      ws.onclose = () => {
        appendActivity('disconnected');
      };

      ws.onerror = () => {
        appendActivity('error');
      };

      setOut({ ws: 'connecting' });
    } catch (e) {
      setOut({ error: { code: 'WS_ERROR', message: e.message } });
    }
  });

  $('btnWsClose').addEventListener('click', () => {
    if (!ws) {
      setOut('WebSocket not created.');
      return;
    }
    ws.close();
    setActivity('Disconnected.');
    setOut({ ws: 'closed' });
  });

  $('btnSubscribe').addEventListener('click', () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setOut('WebSocket not connected.');
      return;
    }
    const teamId = $('wsTeamId').value.trim();
    if (!teamId) {
      setOut('Provide a teamId to subscribe.');
      return;
    }
    ws.send(JSON.stringify({ type: 'subscribe', teamId }));
    setOut({ subscribe: teamId });
  });

  $('btnUnsubscribe').addEventListener('click', () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setOut('WebSocket not connected.');
      return;
    }
    const teamId = $('wsTeamId').value.trim();
    if (!teamId) {
      setOut('Provide a teamId to unsubscribe.');
      return;
    }
    ws.send(JSON.stringify({ type: 'unsubscribe', teamId }));
    setOut({ unsubscribe: teamId });
  });
}

function initFromStorage() {
  const token = storage.getAccessToken();
  if (!token) return;
  setOut({ token: 'loaded from localStorage', hint: 'Use Get /me or List teams.' });
}

bind();
initFromStorage();
