/* ════════════════════════════════════════════════════════════════
   strohut — the small stuff
   1. Light switch. Night is the default.
   2. Sections inking in as you scroll, and a pokeable hat.
   3. Live Discord presence over the Lanyard socket.
   ════════════════════════════════════════════════════════════════ */

const DISCORD_ID = '402858450926829568';

const stillPlease = window.matchMedia('(prefers-reduced-motion: reduce)');

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
  document.dispatchEvent(new CustomEvent('inkchange'));
}

/* ──────────────────── Inking in, and the hat ───────────────────── */

// Sections fade up once, then the observer lets go of them
const sections = document.querySelectorAll('.reveal');

if (stillPlease.matches || !('IntersectionObserver' in window)) {
  sections.forEach(s => s.classList.add('is-in'));
} else {
  const watcher = new IntersectionObserver(
    (entries, self) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        self.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.12 }
  );
  sections.forEach(s => watcher.observe(s));
}

/* Depth by parallax: the cover is stacked layers, and they move by
   different amounts. Pointer gives the tilt, scroll gives the drift.
   One rAF per frame, and two custom properties the CSS reads. */
const hero = document.querySelector('.hero');
let pointerX = 0;
let pointerY = 0;
let drift = 0;
let queued = false;

function paintDepth() {
  queued = false;
  hero.style.setProperty('--px', pointerX.toFixed(3));
  hero.style.setProperty('--py', pointerY.toFixed(3));
  hero.style.setProperty('--drift', drift.toFixed(3));
}

function queueDepth() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(paintDepth);
}

if (!stillPlease.matches) {
  // Fine pointers only. On a touchscreen there is nothing to track.
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    window.addEventListener('pointermove', event => {
      pointerX = (event.clientX / window.innerWidth - 0.5) * 2;
      pointerY = (event.clientY / window.innerHeight - 0.5) * 2;
      queueDepth();
    }, { passive: true });
  }

  window.addEventListener('scroll', () => {
    // only while the cover is still on screen
    const past = Math.min(1, window.scrollY / Math.max(1, window.innerHeight));
    drift = past;
    queueDepth();
  }, { passive: true });
}

// Poking the hat makes it wobble and throw sparkles
const hatHit = document.querySelector('.hat-hit');

hatHit.addEventListener('click', () => {
  if (stillPlease.matches) return;
  hatHit.classList.remove('is-poked');
  // reflow, otherwise a second click inside the animation does nothing
  void hatHit.offsetWidth;
  hatHit.classList.add('is-poked');
});

hatHit.addEventListener('animationend', event => {
  // the third sparkle lands last, well after the hat itself settles
  if (event.target.classList.contains('pop-3')) {
    hatHit.classList.remove('is-poked');
  }
});

/* ───────────────────────────── Doodle box ──────────────────────── */

const pad = document.getElementById('doodle-pad');

if (pad) {
  const ctx = pad.getContext('2d');
  const wrap = pad.parentElement;
  const PENS = { ink: '--ink', red: '--red', straw: '--straw' };

  let pen = 'ink';
  let strokes = [];
  let current = null;

  try {
    const saved = JSON.parse(localStorage.getItem('strohut-doodle'));
    if (saved && Array.isArray(saved.strokes)) strokes = saved.strokes;
  } catch {
    /* fresh sheet then */
  }

  function inkOf(name) {
    return getComputedStyle(root).getPropertyValue(PENS[name] || '--ink').trim();
  }

  function drawStroke(s) {
    ctx.strokeStyle = inkOf(s.c);
    ctx.lineWidth = 2.6 * (window.devicePixelRatio || 1);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    s.pts.forEach(([x, y], i) => {
      if (i === 0) ctx.moveTo(x * pad.width, y * pad.height);
      else ctx.lineTo(x * pad.width, y * pad.height);
    });
    ctx.stroke();
  }

  function redraw() {
    ctx.clearRect(0, 0, pad.width, pad.height);
    strokes.forEach(drawStroke);
    if (current) drawStroke(current);
  }

  function fit() {
    const dpr = window.devicePixelRatio || 1;
    const box = wrap.getBoundingClientRect();
    pad.width = Math.round(box.width * dpr);
    pad.height = Math.round(box.height * dpr);
    redraw();
  }

  function save() {
    // oldest strokes fall off the sheet before storage fills up
    let total = strokes.reduce((n, s) => n + s.pts.length, 0);
    while (total > 20000 && strokes.length > 1) {
      total -= strokes.shift().pts.length;
    }
    try {
      localStorage.setItem('strohut-doodle', JSON.stringify({ strokes }));
    } catch {
      /* it just won't survive a reload */
    }
  }

  function at(event) {
    const box = pad.getBoundingClientRect();
    return [
      Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)),
      Math.min(1, Math.max(0, (event.clientY - box.top) / box.height))
    ];
  }

  pad.addEventListener('pointerdown', event => {
    event.preventDefault();
    pad.setPointerCapture(event.pointerId);
    const start = at(event);
    // the second point makes a lone tap show up as a dot
    current = { c: pen, pts: [start, [start[0] + 0.0005, start[1]]] };
    redraw();
  });

  pad.addEventListener('pointermove', event => {
    if (!current) return;
    const prev = current.pts[current.pts.length - 1];
    const next = at(event);
    current.pts.push(next);
    ctx.strokeStyle = inkOf(current.c);
    ctx.lineWidth = 2.6 * (window.devicePixelRatio || 1);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(prev[0] * pad.width, prev[1] * pad.height);
    ctx.lineTo(next[0] * pad.width, next[1] * pad.height);
    ctx.stroke();
  });

  function penUp() {
    if (!current) return;
    strokes.push(current);
    current = null;
    save();
  }

  pad.addEventListener('pointerup', penUp);
  pad.addEventListener('pointercancel', penUp);

  document.querySelectorAll('.pen').forEach(button => {
    button.addEventListener('click', () => {
      pen = button.dataset.pen;
      document.querySelectorAll('.pen').forEach(b =>
        b.setAttribute('aria-pressed', String(b === button)));
    });
  });

  document.querySelector('.wipe').addEventListener('click', () => {
    strokes = [];
    current = null;
    save();
    redraw();
  });

  // theme flips re-ink every stroke in the new palette
  document.addEventListener('inkchange', redraw);

  let resizeQueued = false;
  window.addEventListener('resize', () => {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(() => {
      resizeQueued = false;
      fit();
    });
  });

  fit();
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
const fallbackLink = el.link ? el.link.href : '';

// The drawn face sits underneath; the photo only covers it once it
// has actually loaded, so a blocked CDN never leaves a broken image
el.avatar.addEventListener('load', () => {
  el.avatar.hidden = false;
});
el.avatar.addEventListener('error', () => {
  el.avatar.hidden = true;
});

const STATUS_TEXT = {
  online: 'online',
  idle: 'away for a bit',
  dnd: 'do not disturb',
  offline: 'offline'
};

// Kept around so the elapsed time keeps ticking instead of freezing
let liveTimers = [];
let lastPresence = null;

// First paint from the REST API, so the panel fills the moment the page
// opens even if the socket takes a while. The socket then keeps it live,
// and anything it has already delivered wins over a slow REST reply.
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

  if (el.link) {
    el.link.href = track
      ? `https://open.spotify.com/track/${track.track_id}`
      : fallbackLink;
  }
}

function fail() {
  el.panel.dataset.state = 'ready';
  el.name.textContent = 'Strohut';
  el.state.textContent = "can't reach Discord right now";
  el.quiet.hidden = true;
}
