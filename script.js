/* ════════════════════════════════════════════════════════════════
   strohut — Kleinkram
   1. Lichtschalter (hell / dunkel)
   2. Discord-Präsenz live über den Lanyard-Socket
   ════════════════════════════════════════════════════════════════ */

const DISCORD_ID = '402858450926829568';

/* ─────────────────────────── Lichtschalter ─────────────────────── */

const lamp = document.querySelector('.lamp');
const root = document.documentElement;

// localStorage wirft in manchen Browsern mit strengen Einstellungen —
// das darf nicht die ganze Seite mitnehmen
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
      /* dann halt nicht */
    }
  }
};

const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

setTheme(remember.get() || (prefersDark.matches ? 'night' : 'day'));

lamp.addEventListener('click', () => {
  const next = root.dataset.theme === 'night' ? 'day' : 'night';
  setTheme(next);
  remember.set(next);
});

// Systemwechsel nur übernehmen, solange nichts von Hand gewählt wurde
prefersDark.addEventListener('change', event => {
  if (!remember.get()) setTheme(event.matches ? 'night' : 'day');
});

function setTheme(theme) {
  root.dataset.theme = theme;
  lamp.setAttribute('aria-pressed', String(theme === 'night'));
  document
    .querySelector('meta[name="theme-color"]')
    .setAttribute('content', theme === 'night' ? '#171a20' : '#f2ecdf');
}

/* ──────────────────────── Discord-Präsenz ──────────────────────── */

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
  idle: 'kurz weg',
  dnd: 'bitte nicht stören',
  offline: 'offline'
};

// Läuft weiter, damit die Spielzeit tickt statt einzufrieren
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
    // Nach kurzer Pause neu versuchen, aber nicht in Dauerschleife rennen
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
  el.avatar.alt = `Discord-Bild von ${user.username}`;

  if (user.avatar) {
    const ext = user.avatar.startsWith('a_') ? 'gif' : 'png';
    el.avatar.src = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=128`;
  }

  // Achtung: className ist an SVG-Elementen nicht beschreibbar
  el.dot.setAttribute('class', `head-dot is-${status}`);

  // Eigener Status („Custom Status“, Typ 4) steht über allem anderen
  const custom = data.activities.find(a => a.type === 4);
  const customText = custom && [custom.emoji?.name, custom.state].filter(Boolean).join(' ');
  el.state.textContent = customText || STATUS_TEXT[status] || status;

  // Alles was er tatsächlich macht: Spiele, Programme, Streams
  const doing = data.activities.filter(a => a.type !== 4 && a.name !== 'Spotify');
  el.doing.replaceChildren(...doing.map(activityRow));

  const spotify = data.listening_to_spotify ? data.spotify : null;
  showTrack(spotify);

  el.quiet.hidden = doing.length > 0 || Boolean(spotify) || Boolean(customText);
}

function activityRow(activity) {
  const li = document.createElement('li');

  // Rahmen ist gezeichnet, nicht gezogen — deshalb ein SVG darüber
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
      time.textContent = `${elapsed(start)} dabei`;
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

  // Discord verpackt fremde Bilder als „mp:external/…“
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

/* Läuft grad was, kommt das ins Fenster. Sonst zurück auf den
   Track, der im HTML steht. */
function showTrack(track) {
  if (!frame) return;

  const src = track
    ? `https://open.spotify.com/embed/track/${track.track_id}?utm_source=generator`
    : fallbackTrack;

  el.kicker.textContent = track ? 'läuft grad' : 'letzter ohrwurm';
  if (frame.src !== src) frame.src = src;

  if (el.link && track) {
    el.link.href = `https://open.spotify.com/track/${track.track_id}`;
  }
}

function fail() {
  el.panel.dataset.state = 'ready';
  el.name.textContent = 'Strohut';
  el.state.textContent = 'Status grad nicht abrufbar';
  el.quiet.hidden = true;
}
