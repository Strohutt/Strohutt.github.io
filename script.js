/* ════════════════════════════════════════════════════════════════
   strohut — the small stuff
   1. Light switch. Night is the default.
   2. Live Discord presence over the Lanyard socket.
   ════════════════════════════════════════════════════════════════ */

const DISCORD_ID = '402858450926829568';

/* ─────────────────────────── Light switch ──────────────────────── */

const lamp = document.querySelector('.lamp');
const root = document.documentElement;

// localStorage throws in browsers with strict settings, and that must
// not take the whole page down with it
const remember = {
  get() {
    try {
      return localStorage.getItem('strohut-theme');
    } catch {
      return null;
    }
  },
  set(value) {
    try {
      localStorage.setItem('strohut-theme', value);
    } catch {
      /* then it just won't stick */
    }
  }
};

// Dark unless this visitor has switched it off before
setTheme(remember.get() === 'day' ? 'day' : 'night');

lamp.addEventListener('click', () => {
  const next = root.dataset.theme === 'night' ? 'day' : 'night';
  setTheme(next);
  remember.set(next);
});

function setTheme(theme) {
  root.dataset.theme = theme;
  lamp.setAttribute('aria-pressed', String(theme === 'night'));
  document
    .querySelector('meta[name="theme-color"]')
    .setAttribute('content', theme === 'night' ? '#15171d' : '#f2ecdf');
}

/* ───────────────────────── Discord presence ────────────────────── */

const el = {
  panel: document.querySelector('.panel'),
  avatar: document.getElementById('dc-avatar'),
  dot: document.querySelector('.head-dot'),
  name: document.getElementById('dc-name'),
  state: document.getElementById('dc-state'),
  doing: document.getElementById('dc-doing'),
  quiet: document.getElementById('dc-quiet'),
  kicker: document.getElementById('music-kicker'),
  embed: document.getElementById('music-embed'),
  link: document.getElementById('music-link')
};

const frame = el.embed.querySelector('iframe');
const fallbackTrack = frame ? frame.src : '';

const STATUS_TEXT = {
  online: 'online',
  idle: 'away for a bit',
  dnd: 'do not disturb',
  offline: 'offline'
};

// Kept around so the elapsed time keeps ticking instead of freezing
let liveTimers = [];
let lastPresence = null;

connect();

function connect() {
  let socket;
  let heartbeat;

  try {
    socket = new WebSocket('wss://api.lanyard.rest/socket');
  } catch {
    fail();
    return;
  }

  socket.addEventListener('open', () => {
    socket.send(JSON.stringify({ op: 2, d: { subscribe_to_id: DISCORD_ID } }));
  });

  socket.addEventListener('message', event => {
    const { op, t, d } = JSON.parse(event.data);

    if (op === 1) {
      heartbeat = setInterval(() => socket.send(JSON.stringify({ op: 3 })), d.heartbeat_interval);
      return;
    }

    if (op === 0 && (t === 'INIT_STATE' || t === 'PRESENCE_UPDATE')) {
      render(d);
    }
  });

  socket.addEventListener('close', () => {
    clearInterval(heartbeat);
    // Try again after a pause, without hammering it
    setTimeout(connect, 12000);
  });

  socket.addEventListener('error', () => {
    if (!lastPresence) fail();
  });
}

function render(data) {
  if (!data || !data.discord_user) return;

  lastPresence = data;
  liveTimers.forEach(clearInterval);
  liveTimers = [];

  const user = data.discord_user;
  const status = data.discord_status || 'offline';

  el.panel.dataset.state = 'ready';
  el.name.textContent = user.display_name || user.global_name || user.username;
  el.avatar.alt = `Discord avatar of ${user.username}`;

  if (user.avatar) {
    const ext = user.avatar.startsWith('a_') ? 'gif' : 'png';
    el.avatar.src = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=128`;
  }

  // Careful: className is read-only on SVG elements
  el.dot.setAttribute('class', `head-dot is-${status}`);

  // A custom status (type 4) outranks everything else
  const custom = data.activities.find(a => a.type === 4);
  const customText = custom && [custom.emoji?.name, custom.state].filter(Boolean).join(' ');
  el.state.textContent = customText || STATUS_TEXT[status] || status;

  // Everything actually open: games, apps, streams — however many
  const doing = data.activities.filter(a => a.type !== 4 && a.name !== 'Spotify');
  el.doing.replaceChildren(...doing.map(activityRow));

  const spotify = data.listening_to_spotify ? data.spotify : null;
  showTrack(spotify);

  el.quiet.hidden = doing.length > 0 || Boolean(spotify) || Boolean(customText);
}

function activityRow(activity) {
  const li = document.createElement('li');

  // The border is drawn, not ruled, hence an SVG over the top
  const art = document.createElement('span');
  art.className = 'art';

  const url = artworkUrl(activity);
  if (url) {
    const img = document.createElement('img');
    img.src = url;
    img.alt = '';
    img.loading = 'lazy';
    art.append(img);
  } else {
    const letter = document.createElement('span');
    letter.className = 'art-letter';
    letter.textContent = activity.name.slice(0, 1).toUpperCase();
    letter.setAttribute('aria-hidden', 'true');
    art.append(letter);
  }

  art.insertAdjacentHTML(
    'beforeend',
    '<svg class="art-frame" viewBox="0 0 300 200" preserveAspectRatio="none" aria-hidden="true">' +
      '<use href="#frame" /></svg>'
  );
  li.append(art);

  const body = document.createElement('div');
  body.className = 'doing-body';

  const name = document.createElement('p');
  name.className = 'doing-name';
  name.textContent = activity.name;
  body.append(name);

  const detail = [activity.details, activity.state].filter(Boolean).join(' — ');
  if (detail) {
    const line = document.createElement('p');
    line.className = 'doing-line';
    line.textContent = detail;
    body.append(line);
  }

  const start = activity.timestamps?.start;
  if (start) {
    const time = document.createElement('p');
    time.className = 'doing-time';
    const tick = () => {
      time.textContent = `${elapsed(start)} in`;
    };
    tick();
    liveTimers.push(setInterval(tick, 1000));
    body.append(time);
  }

  li.append(body);
  return li;
}

function artworkUrl(activity) {
  const image = activity.assets?.large_image || activity.assets?.small_image;
  if (!image) return null;

  // Discord wraps third-party art as "mp:external/…"
  if (image.startsWith('mp:')) return `https://media.discordapp.net/${image.slice(3)}`;
  if (!activity.application_id) return null;

  return `https://cdn.discordapp.com/app-assets/${activity.application_id}/${image}.png`;
}

function elapsed(startMs) {
  const total = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = n => String(n).padStart(2, '0');

  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/* Whatever is playing goes in the frame. Otherwise fall back to the
   track sitting in the HTML. */
function showTrack(track) {
  if (!frame) return;

  const src = track
    ? `https://open.spotify.com/embed/track/${track.track_id}?utm_source=generator`
    : fallbackTrack;

  el.kicker.textContent = track ? 'playing right now' : 'stuck in my head';
  if (frame.src !== src) frame.src = src;

  if (el.link && track) {
    el.link.href = `https://open.spotify.com/track/${track.track_id}`;
  }
}

function fail() {
  el.panel.dataset.state = 'ready';
  el.name.textContent = 'Strohut';
  el.state.textContent = "can't reach Discord right now";
  el.quiet.hidden = true;
}
