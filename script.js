/* ════════════════════════════════════════════════════════════════
   strohut
   1. Sections arriving as you scroll
   2. Black flash, and the wheel that adapts to it
   3. Discord presence, via Lanyard
   ════════════════════════════════════════════════════════════════ */

const DISCORD_ID = '402858450926829568';
const root = document.documentElement;
const stillPlease = window.matchMedia('(prefers-reduced-motion: reduce)');

/* ───────────────────────── Arriving ────────────────────────────── */

const sections = document.querySelectorAll('.reveal');

if (stillPlease.matches || !('IntersectionObserver' in window)) {
  sections.forEach(s => s.classList.add('is-in'));
} else {
  const watcher = new IntersectionObserver((entries, self) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      self.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.1 });

  sections.forEach(s => watcher.observe(s));
}


/* ─────────────────────── 黒閃 / black flash ────────────────────── */

/* Hit the page and you land a strike. Most are nothing. A black flash
   is a hair's breadth of timing, and once someone lands one they tend
   to land the next — so the odds climb with the streak and reset when
   you miss. Every one that lands turns Mahoraga's wheel a spoke on. */
const strikes = document.getElementById('strikes');
const tally = document.getElementById('tally');
const sigil = document.querySelector('.hero');
const wheel = document.querySelector('.wheel');

const BASE_ODDS = 0.13;
const ODDS_STEP = 0.12;
const ODDS_CAP = 0.55;

let streak = 0;
let adapted = 0;

function readBest() {
  try {
    return Math.max(0, parseInt(localStorage.getItem('strohut-flash'), 10) || 0);
  } catch {
    return 0;
  }
}

let best = readBest();
document.getElementById('tally-best').textContent = best;

// Anything you can actually operate is off limits, or the flash would
// fire on top of every link and button press
const OFF_LIMITS = 'a, button, input, iframe, .tally';

function strikeAt(x, y, kind) {
  const mark = document.createElement('div');
  mark.className = `strike strike-${kind}`;
  mark.style.left = `${x}px`;
  mark.style.top = `${y}px`;

  if (kind === 'flash') {
    const which = 1 + Math.floor(Math.random() * 2);
    mark.innerHTML =
      `<svg viewBox="0 0 400 400"><use href="#flash-${which}" /></svg>`;
  }

  strikes.append(mark);
  mark.addEventListener('animationend', () => mark.remove(), { once: true });
}

function landed() {
  streak += 1;
  adapted += 1;

  if (streak > best) {
    best = streak;
    try {
      localStorage.setItem('strohut-flash', String(best));
    } catch {
      /* it just won't survive a reload */
    }
  }

  tally.hidden = false;
  tally.classList.toggle('is-hot', streak > 1);
  document.getElementById('tally-streak').textContent = streak;
  document.getElementById('tally-best').textContent = best;

  // the wheel takes the hit and turns
  wheel.style.setProperty('--adapt', adapted);
  sigil.classList.add('is-adapted');

  document.body.classList.remove('is-flashing');
  void document.body.offsetWidth;
  document.body.classList.add('is-flashing');
}

if (!stillPlease.matches) {
  document.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    if (event.target.closest(OFF_LIMITS)) return;

    const odds = Math.min(ODDS_CAP, BASE_ODDS + streak * ODDS_STEP);

    if (Math.random() < odds) {
      strikeAt(event.clientX, event.clientY, 'flash');
      landed();
    } else {
      strikeAt(event.clientX, event.clientY, 'hit');
      streak = 0;
      tally.classList.remove('is-hot');
      document.getElementById('tally-streak').textContent = '0';
    }
  });

  document.body.addEventListener('animationend', event => {
    if (event.animationName === 'room') document.body.classList.remove('is-flashing');
  });
}

/* ────────────────────── Discord presence ───────────────────────── */

const el = {
  slab: document.querySelector('.now .slab'),
  avatar: document.getElementById('dc-avatar'),
  dot: document.getElementById('dc-dot'),
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
const fallbackLink = el.link ? el.link.href : '';

// The portrait only covers the empty ring once the picture has really
// loaded, so a blocked CDN leaves the ring rather than a broken image
el.avatar.addEventListener('load', () => { el.avatar.hidden = false; });
el.avatar.addEventListener('error', () => { el.avatar.hidden = true; });

const STATUS_TEXT = {
  online: 'online',
  idle: 'away for a bit',
  dnd: 'do not disturb',
  offline: 'offline'
};

let liveTimers = [];
let lastPresence = null;

// First fill from REST so the panel is populated straight away; the
// socket takes over from there and anything it delivered wins
fetch(`https://api.lanyard.rest/v1/users/${DISCORD_ID}`)
  .then(response => response.json())
  .then(body => {
    if (body.success && !lastPresence) render(body.data);
  })
  .catch(() => {
    /* the socket gets its turn either way */
  });

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

    if (op === 0 && (t === 'INIT_STATE' || t === 'PRESENCE_UPDATE')) render(d);
  });

  socket.addEventListener('close', () => {
    clearInterval(heartbeat);
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

  el.slab.dataset.state = 'ready';
  el.name.textContent = user.display_name || user.global_name || user.username;
  el.avatar.alt = `${user.username} on Discord`;

  if (user.avatar) {
    const ext = user.avatar.startsWith('a_') ? 'gif' : 'png';
    const url = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=256`;
    // re-assigning the same src restarts an animated avatar from frame
    // one, and presence updates arrive on every song change
    if (el.avatar.src !== url) el.avatar.src = url;
  } else {
    el.avatar.hidden = true;
    el.avatar.removeAttribute('src');
  }

  el.dot.className = `dot is-${status}`;

  // a custom status outranks everything else
  const custom = data.activities.find(a => a.type === 4);
  const customText = custom && [custom.emoji?.name, custom.state].filter(Boolean).join(' ');
  el.state.textContent = customText || STATUS_TEXT[status] || status;

  const doing = data.activities.filter(a => a.type !== 4 && a.name !== 'Spotify');
  el.doing.replaceChildren(...doing.map(activityRow));

  const spotify = data.listening_to_spotify ? data.spotify : null;
  showTrack(spotify);

  el.quiet.hidden = doing.length > 0 || Boolean(spotify) || Boolean(customText);
}

function activityRow(activity) {
  const li = document.createElement('li');
  const url = artworkUrl(activity);

  if (url) {
    const img = document.createElement('img');
    img.src = url;
    img.alt = '';
    img.loading = 'lazy';
    li.append(img);
  } else {
    const box = document.createElement('span');
    box.className = 'no-art';
    box.textContent = activity.name.slice(0, 1).toUpperCase();
    box.setAttribute('aria-hidden', 'true');
    li.append(box);
  }

  const body = document.createElement('div');

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
    const tick = () => { time.textContent = `${elapsed(start)} in`; };
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
  const pad2 = n => String(n).padStart(2, '0');

  return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${pad2(m)}:${pad2(s)}`;
}

function showTrack(track) {
  if (!frame) return;

  const src = track
    ? `https://open.spotify.com/embed/track/${track.track_id}?utm_source=generator`
    : fallbackTrack;

  el.kicker.textContent = track ? 'playing right now' : 'stuck in my head';
  if (frame.src !== src) frame.src = src;

  if (el.link) {
    el.link.href = track
      ? `https://open.spotify.com/track/${track.track_id}`
      : fallbackLink;
  }
}

function fail() {
  el.slab.dataset.state = 'ready';
  el.name.textContent = 'Strohut';
  el.state.textContent = "can't reach discord right now";
  el.quiet.hidden = true;
}
