/* ════════════════════════════════════════════════════════════════
   strohut
   1. Sections arriving as you scroll
   2. Black flash, and the wheel that adapts to it
   3. Things you can hit
   4. The clock, and what he has pushed
   5. Discord presence, via Lanyard
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
const DOMAIN_AT = 5;

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

  // a long streak stops being a counter and takes the room
  if (streak >= DOMAIN_AT) {
    document.body.classList.remove('is-domain');
    void document.body.offsetWidth;
    document.body.classList.add('is-domain');
  }
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
    if (event.animationName === 'domain') document.body.classList.remove('is-domain');
  });
}


/* ─────────────────────── Things you can hit ────────────────────── */

/* Every drawn thing on the page answers to a click, and each answers in
   the way that thing would: the wheel adapts a spoke, the cloud gets
   shoved, the flag swings, the stroke is pulled again. */

const STROKES = [
  "<path class=\"bs-body\" d=\"M12 44.8C20.91 43.02 47.64 36.61 65.45 34.07C83.27 31.54 101.09 30.61 118.91 29.61C136.73 28.61 154.55 28.65 172.36 28.05C190.18 27.45 208 26.42 225.82 26.01C243.64 25.6 261.45 25.55 279.27 25.6C297.09 25.64 314.91 26.17 332.73 26.28C350.55 26.4 368.36 25.97 386.18 26.28C404 26.6 421.82 27.62 439.64 28.16C457.45 28.7 475.27 29.08 493.09 29.52C510.91 29.96 528.73 30.51 546.55 30.8C564.36 31.1 582.18 31.09 600 31.3C617.82 31.51 635.64 31.52 653.45 32.07C671.27 32.61 689.09 34.12 706.91 34.57C724.73 35.01 742.55 34.29 760.36 34.72C778.18 35.15 796 36.5 813.82 37.14C831.64 37.79 849.45 38.33 867.27 38.57C885.09 38.8 902.91 38.37 920.73 38.55C938.55 38.72 956.36 39.42 974.18 39.64C992 39.85 1009.82 39.59 1027.64 39.82C1045.45 40.04 1063.27 40.66 1081.09 40.98C1098.91 41.29 1116.73 41.67 1134.55 41.71C1152.36 41.75 1179.09 41.31 1188 41.24L1188 41.87C1179.09 42.28 1152.36 43.56 1134.55 44.31C1116.73 45.07 1098.91 45.77 1081.09 46.4C1063.27 47.02 1045.45 47.38 1027.64 48.06C1009.82 48.75 992 49.86 974.18 50.51C956.36 51.17 938.55 51.27 920.73 51.99C902.91 52.7 885.09 53.96 867.27 54.79C849.45 55.61 831.64 56.2 813.82 56.92C796 57.65 778.18 58.42 760.36 59.14C742.55 59.86 724.73 60.68 706.91 61.23C689.09 61.78 671.27 61.86 653.45 62.44C635.64 63.01 617.82 64.04 600 64.69C582.18 65.33 564.36 65.93 546.55 66.29C528.73 66.66 510.91 66.59 493.09 66.88C475.27 67.18 457.45 67.7 439.64 68.07C421.82 68.45 404 69.16 386.18 69.14C368.36 69.12 350.55 68.01 332.73 67.96C314.91 67.9 297.09 68.86 279.27 68.81C261.45 68.76 243.64 68.22 225.82 67.67C208 67.12 190.18 66.52 172.36 65.5C154.55 64.49 136.73 63 118.91 61.58C101.09 60.16 83.27 59.67 65.45 56.97C47.64 54.27 20.91 47.31 12 45.38Z\"/><path class=\"bs-skip\" d=\"M630.02 27.58L943.79 28.07\" style=\"stroke-width:0.9\"/><path class=\"bs-skip\" d=\"M586.22 50.31L816.64 50.42\" style=\"stroke-width:3.18\"/><path class=\"bs-skip\" d=\"M995.01 33.85L1200 32.16\" style=\"stroke-width:1.92\"/><path class=\"bs-skip\" d=\"M1023.32 51.07L1200 50.51\" style=\"stroke-width:2.68\"/><path class=\"bs-skip\" d=\"M620.85 54.62L841.42 52.72\" style=\"stroke-width:1.96\"/><path class=\"bs-skip\" d=\"M1044.59 37.71L1200 36.16\" style=\"stroke-width:2.52\"/><path class=\"bs-skip\" d=\"M779.11 54.37L1056.89 52.61\" style=\"stroke-width:2.64\"/>",
  "<path class=\"bs-body\" d=\"M12 45C20.91 43.1 47.64 36.1 65.45 33.61C83.27 31.13 101.09 31.14 118.91 30.09C136.73 29.03 154.55 27.72 172.36 27.28C190.18 26.85 208 27.71 225.82 27.46C243.64 27.21 261.45 25.99 279.27 25.79C297.09 25.59 314.91 26.19 332.73 26.26C350.55 26.34 368.36 25.92 386.18 26.23C404 26.54 421.82 27.61 439.64 28.12C457.45 28.63 475.27 29.01 493.09 29.3C510.91 29.6 528.73 29.62 546.55 29.9C564.36 30.18 582.18 30.4 600 30.97C617.82 31.55 635.64 32.69 653.45 33.33C671.27 33.97 689.09 34.42 706.91 34.82C724.73 35.23 742.55 35.5 760.36 35.77C778.18 36.05 796 36.03 813.82 36.46C831.64 36.9 849.45 37.86 867.27 38.38C885.09 38.9 902.91 39.27 920.73 39.6C938.55 39.93 956.36 40.21 974.18 40.34C992 40.47 1009.82 40.28 1027.64 40.38C1045.45 40.48 1063.27 40.78 1081.09 40.97C1098.91 41.16 1116.73 41.23 1134.55 41.52C1152.36 41.82 1179.09 42.53 1188 42.73L1188 41.5C1179.09 41.93 1152.36 43.43 1134.55 44.11C1116.73 44.78 1098.91 44.95 1081.09 45.53C1063.27 46.12 1045.45 46.95 1027.64 47.62C1009.82 48.28 992 48.64 974.18 49.53C956.36 50.41 938.55 52.11 920.73 52.93C902.91 53.75 885.09 53.71 867.27 54.45C849.45 55.19 831.64 56.71 813.82 57.34C796 57.98 778.18 57.63 760.36 58.24C742.55 58.86 724.73 60.19 706.91 61.03C689.09 61.87 671.27 62.81 653.45 63.26C635.64 63.71 617.82 63.29 600 63.75C582.18 64.21 564.36 65.52 546.55 66.02C528.73 66.51 510.91 66.41 493.09 66.71C475.27 67.02 457.45 67.44 439.64 67.87C421.82 68.3 404 69.05 386.18 69.3C368.36 69.55 350.55 69.43 332.73 69.36C314.91 69.29 297.09 69.28 279.27 68.88C261.45 68.49 243.64 67.51 225.82 66.99C208 66.47 190.18 66.69 172.36 65.76C154.55 64.82 136.73 62.81 118.91 61.38C101.09 59.94 83.27 59.73 65.45 57.16C47.64 54.58 20.91 47.8 12 45.93Z\"/><path class=\"bs-skip\" d=\"M1006.59 53.78L1115.18 52.99\" style=\"stroke-width:3.09\"/><path class=\"bs-skip\" d=\"M733.03 33.86L881.1 33.32\" style=\"stroke-width:1.68\"/><path class=\"bs-skip\" d=\"M748.5 52.56L854.63 51.54\" style=\"stroke-width:1.41\"/><path class=\"bs-skip\" d=\"M949.65 42.75L1107.62 43.01\" style=\"stroke-width:2.56\"/><path class=\"bs-skip\" d=\"M642.42 47.43L927.39 48.44\" style=\"stroke-width:0.83\"/><path class=\"bs-skip\" d=\"M656.76 48.28L780.97 48.96\" style=\"stroke-width:1.45\"/><path class=\"bs-skip\" d=\"M556.26 21.78L823.4 19.85\" style=\"stroke-width:1.83\"/>",
  "<path class=\"bs-body\" d=\"M12 45.33C20.91 43.45 47.64 36.57 65.45 34.05C83.27 31.53 101.09 31.33 118.91 30.21C136.73 29.1 154.55 27.99 172.36 27.36C190.18 26.73 208 26.62 225.82 26.44C243.64 26.25 261.45 26.25 279.27 26.23C297.09 26.22 314.91 26.2 332.73 26.36C350.55 26.52 368.36 27.07 386.18 27.22C404 27.37 421.82 26.92 439.64 27.26C457.45 27.59 475.27 28.81 493.09 29.22C510.91 29.63 528.73 29.3 546.55 29.73C564.36 30.16 582.18 31.22 600 31.82C617.82 32.42 635.64 33 653.45 33.34C671.27 33.68 689.09 33.45 706.91 33.85C724.73 34.25 742.55 35.33 760.36 35.72C778.18 36.11 796 35.71 813.82 36.18C831.64 36.66 849.45 38.07 867.27 38.57C885.09 39.07 902.91 39 920.73 39.21C938.55 39.41 956.36 39.47 974.18 39.81C992 40.15 1009.82 41 1027.64 41.24C1045.45 41.48 1063.27 41.26 1081.09 41.24C1098.91 41.21 1116.73 40.92 1134.55 41.08C1152.36 41.24 1179.09 42.01 1188 42.19L1188 42.5C1179.09 42.84 1152.36 44.03 1134.55 44.55C1116.73 45.08 1098.91 45.15 1081.09 45.67C1063.27 46.18 1045.45 46.97 1027.64 47.63C1009.82 48.29 992 48.83 974.18 49.63C956.36 50.42 938.55 51.53 920.73 52.39C902.91 53.24 885.09 54.13 867.27 54.75C849.45 55.36 831.64 55.54 813.82 56.08C796 56.62 778.18 57.12 760.36 57.97C742.55 58.81 724.73 60.35 706.91 61.12C689.09 61.89 671.27 61.98 653.45 62.59C635.64 63.2 617.82 64.26 600 64.8C582.18 65.34 564.36 65.37 546.55 65.85C528.73 66.33 510.91 67.27 493.09 67.69C475.27 68.11 457.45 68.29 439.64 68.36C421.82 68.44 404 68.15 386.18 68.13C368.36 68.1 350.55 68.18 332.73 68.22C314.91 68.27 297.09 68.55 279.27 68.39C261.45 68.22 243.64 67.8 225.82 67.22C208 66.64 190.18 65.66 172.36 64.93C154.55 64.2 136.73 64.08 118.91 62.84C101.09 61.59 83.27 60.32 65.45 57.48C47.64 54.64 20.91 47.74 12 45.79Z\"/><path class=\"bs-skip\" d=\"M747.26 32.59L969 31.9\" style=\"stroke-width:1.5\"/><path class=\"bs-skip\" d=\"M977.35 54.41L1200 52.52\" style=\"stroke-width:3.12\"/><path class=\"bs-skip\" d=\"M821.61 55.33L990.62 55.52\" style=\"stroke-width:1.42\"/><path class=\"bs-skip\" d=\"M793.93 27.86L877.32 27.77\" style=\"stroke-width:0.86\"/><path class=\"bs-skip\" d=\"M801.94 21.1L1057.05 20.33\" style=\"stroke-width:3.13\"/><path class=\"bs-skip\" d=\"M681.98 31.3L776.47 32.23\" style=\"stroke-width:1.66\"/><path class=\"bs-skip\" d=\"M594.05 61.35L786.72 61.53\" style=\"stroke-width:2.28\"/>"
  ];

function knock(el, cls) {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth;                       // restart the animation
  el.classList.add(cls);
}

const wheelHit = document.getElementById('wheel-hit');
if (wheelHit) {
  wheelHit.addEventListener('click', () => {
    adapted += 1;
    wheel.style.setProperty('--adapt', adapted);
    knock(wheelHit, 'is-struck');
  });
}

const cloudHit = document.getElementById('cloud-hit');
if (cloudHit) {
  let shove = 0;
  cloudHit.addEventListener('click', () => {
    shove = (shove + 1) % 4;
    cloudHit.style.setProperty('--shove', shove);
    knock(cloudHit, 'is-struck');
  });
}

const flagHit = document.getElementById('flag-hit');
if (flagHit) flagHit.addEventListener('click', () => knock(flagHit, 'is-struck'));

const nameHit = document.getElementById('name-hit');
const brushSvg = document.getElementById('brush');
if (nameHit && brushSvg) {
  let pull = 0;
  nameHit.addEventListener('click', () => {
    pull = (pull + 1) % STROKES.length;
    brushSvg.innerHTML = STROKES[pull];
    knock(brushSvg, 'is-struck');
  });
}


/* ──────────────────────── Time where he is ─────────────────────── */

/* A homepage that says "Germany" says the same thing at four in the
   morning as at noon. This says which one it is, and lets the visitor
   work out for themselves whether a message is going to be answered.
   Intl does the timezone, so summer time is not something to maintain. */

const clock = document.getElementById('clock');

if (clock) {
  const face = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', hour12: false
  });
  const hourOf = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin', hour: 'numeric', hour12: false
  });

  const readOut = h =>
    h < 5 ? 'probably asleep'
      : h < 9 ? 'probably still asleep'
        : h < 12 ? 'awake, allegedly'
          : h < 18 ? 'around'
            : h < 23 ? 'around' : 'up too late';

  const tick = () => {
    const now = new Date();
    const h = parseInt(hourOf.format(now), 10);
    clock.textContent = `${face.format(now)} — ${readOut(h)}`;
  };

  tick();
  setInterval(tick, 20000);
}


/* ─────────────────────── What he has pushed ────────────────────── */

/* The public events feed needs no key and no auth. If it is rate limited
   or unreachable the panel stays hidden rather than showing an apology —
   a section that only ever explains its own failure is not worth a
   heading. */

const GH_USER = 'Strohutt';
const pushBox = document.getElementById('pushes');
const pushList = document.getElementById('push-list');

function ago(iso) {
  const secs = Math.max(0, (Date.now() - new Date(iso)) / 1000);
  const [n, unit] = secs < 3600 ? [secs / 60, 'minute']
    : secs < 86400 ? [secs / 3600, 'hour']
      : secs < 2592000 ? [secs / 86400, 'day']
        : [secs / 2592000, 'month'];
  const v = Math.max(1, Math.floor(n));
  return `${v} ${unit}${v === 1 ? '' : 's'} ago`;
}

if (pushBox && pushList) {
  fetch(`https://api.github.com/users/${GH_USER}/events/public?per_page=60`)
    .then(r => (r.ok ? r.json() : null))
    .then(events => {
      if (!Array.isArray(events)) return;

      // one row per repo, carrying its most recent push
      const seen = new Map();
      for (const e of events) {
        if (e.type !== 'PushEvent' || !e.repo || seen.has(e.repo.name)) continue;
        const commits = (e.payload && e.payload.commits) || [];
        seen.set(e.repo.name, {
          repo: e.repo.name,
          when: e.created_at,
          count: (e.payload && e.payload.size) || commits.length,
          last: commits.length ? commits[commits.length - 1].message.split('\n')[0] : ''
        });
        if (seen.size >= 5) break;
      }
      if (!seen.size) return;

      pushList.replaceChildren(...[...seen.values()].map(pushRow));
      pushBox.hidden = false;
      pushBox.classList.add('is-in');
    })
    .catch(() => {
      /* stays hidden */
    });
}

function pushRow(p) {
  const li = document.createElement('li');

  const link = document.createElement('a');
  link.className = 'push-repo';
  link.href = `https://github.com/${p.repo}`;
  link.textContent = p.repo.replace(`${GH_USER}/`, '');
  li.append(link);

  if (p.last) {
    const msg = document.createElement('p');
    msg.className = 'push-msg';
    msg.textContent = p.last;
    li.append(msg);
  }

  const meta = document.createElement('p');
  meta.className = 'push-meta';
  meta.textContent = `${p.count} commit${p.count === 1 ? '' : 's'} · ${ago(p.when)}`;
  li.append(meta);

  return li;
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
  art: document.getElementById('track-art'),
  song: document.getElementById('track-song'),
  artist: document.getElementById('track-artist'),
  bar: document.getElementById('track-bar'),
  fill: document.getElementById('track-fill'),
  link: document.getElementById('music-link')
};

const PINNED = {
  song: 'nothing playing',
  artist: '',
  url: el.link ? el.link.href : ''
};

/* The pinned track is a bare id in the markup, so the quiet state had
   nothing to call it. Spotify's oembed endpoint needs no key and no auth
   and hands back the title; if it is blocked or slow the panel keeps the
   wording it already had. */
if (PINNED.url) {
  fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(PINNED.url)}`)
    .then(r => (r.ok ? r.json() : null))
    .then(data => {
      if (!data || !data.title) return;
      PINNED.artist = data.title;
      // only take effect if nothing has started playing in the meantime
      if (!lastPresence || !lastPresence.listening_to_spotify) showTrack(null);
    })
    .catch(() => {
      /* the wording it already has is true either way */
    });
}

el.art.addEventListener('load', () => { el.art.hidden = false; });
el.art.addEventListener('error', () => { el.art.hidden = true; });

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

/* Drawn here rather than dropped in as Spotify's own player, which was
   the one thing on the page in somebody else's visual language. */
function showTrack(track) {
  el.kicker.textContent = track ? 'playing right now' : 'stuck in my head';
  el.song.textContent = track ? track.song : PINNED.song;
  el.artist.textContent = track ? track.artist : PINNED.artist;
  el.artist.hidden = !el.artist.textContent;
  el.link.href = track ? `https://open.spotify.com/track/${track.track_id}` : PINNED.url;
  el.link.textContent = 'open in spotify';

  if (track && track.album_art_url) {
    // re-assigning the same src restarts the fade, and presence updates
    // arrive far more often than the song changes
    if (el.art.src !== track.album_art_url) el.art.src = track.album_art_url;
    el.art.alt = `${track.album || track.song} cover`;
  } else {
    el.art.hidden = true;
    el.art.removeAttribute('src');
  }

  const span = track && track.timestamps
    && track.timestamps.end - track.timestamps.start;

  if (!span || span <= 0) {
    el.bar.hidden = true;
    return;
  }

  el.bar.hidden = false;
  const tick = () => {
    const gone = (Date.now() - track.timestamps.start) / span;
    el.fill.style.width = `${Math.min(100, Math.max(0, gone * 100)).toFixed(2)}%`;
  };
  tick();
  liveTimers.push(setInterval(tick, 1000));
}

function fail() {
  el.slab.dataset.state = 'ready';
  el.name.textContent = 'Strohut';
  el.state.textContent = "can't reach discord right now";
  el.quiet.hidden = true;
}
