/* ════════════════════════════════════════════════════════════════
   strohut
   Loaded after flash.js, which carries 黒閃 and the wheel.

   1. Sections arriving, and the layers that lean and drift
   2. Things you can hit
   3. The clock, what he has pushed, and what he is building
   4. Discord presence, via Lanyard
   ════════════════════════════════════════════════════════════════ */

const DISCORD_ID = '402858450926829568';
/* stillPlease, strikes and the wheel come from flash.js */

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



/* ───────────────────────── Lean and drift ──────────────────────── */

/* A page that only moves when it is clicked reads as a screenshot. The
   layers behind the header lean away from the pointer and lag behind the
   scroll, at different rates, so there is depth to look at while nothing
   is happening. Both are written to custom properties and let css do the
   easing — setting transforms per frame fights the transitions. */

const hero = document.querySelector('.hero');

if (hero && !stillPlease.matches && matchMedia('(pointer: fine)').matches) {
  let queued = false;
  let lx = 0;
  let ly = 0;

  addEventListener('pointermove', event => {
    lx = (event.clientX / innerWidth - .5) * 2;
    ly = (event.clientY / innerHeight - .5) * 2;
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      hero.style.setProperty('--lean-x', lx.toFixed(3));
      hero.style.setProperty('--lean-y', ly.toFixed(3));
      queued = false;
    });
  }, { passive: true });
}

const drifters = document.querySelectorAll('.band svg, svg.band, .flag svg, svg.flag');

if (drifters.length && !stillPlease.matches) {
  // one rate per drifter, none of them a multiple of another, so no two
  // ever move together for long enough to look like one layer
  const RATE = [.07, -.05, .04];
  let waiting = false;

  /* The wheel is the largest thing on the page and it was the only thing
     that did not answer to scrolling. It turns with the page now — which
     is what a wheel does when something rolls past it — on top of its own
     slow ratchet, so the two never line up into one obvious loop. */
  const wheelArt = document.querySelector('.wheel');

  const shift = () => {
    const y = scrollY;
    drifters.forEach((el, i) => el.style.setProperty('--drift', `${(y * RATE[i % RATE.length]).toFixed(1)}px`));
    if (wheelArt) wheelArt.style.setProperty('--roll', `${(y * .06).toFixed(2)}deg`);
    waiting = false;
  };

  addEventListener('scroll', () => {
    if (waiting) return;
    waiting = true;
    requestAnimationFrame(shift);
  }, { passive: true });

  shift();
}

/* ─────────────────────── Things you can hit ────────────────────── */

/* Every drawn thing on the page answers to a click, and each answers in
   the way that thing would: the wheel adapts a spoke, the cloud gets
   shoved, the flag swings, the stroke is pulled again. */

const STROKES = [
  "<path class=\"bs-body\" d=\"M12 44.8C20.9 43 47.6 36.6 65.5 34.1C83.3 31.5 101.1 30.6 118.9 29.6C136.7 28.6 154.5 28.7 172.4 28.1C190.2 27.5 208 26.4 225.8 26C243.6 25.6 261.5 25.6 279.3 25.6C297.1 25.6 314.9 26.2 332.7 26.3C350.5 26.4 368.4 26 386.2 26.3C404 26.6 421.8 27.6 439.6 28.2C457.5 28.7 475.3 29.1 493.1 29.5C510.9 30 528.7 30.5 546.5 30.8C564.4 31.1 582.2 31.1 600 31.3C617.8 31.5 635.6 31.5 653.5 32.1C671.3 32.6 689.1 34.1 706.9 34.6C724.7 35 742.5 34.3 760.4 34.7C778.2 35.1 796 36.5 813.8 37.1C831.6 37.8 849.5 38.3 867.3 38.6C885.1 38.8 902.9 38.4 920.7 38.5C938.5 38.7 956.4 39.4 974.2 39.6C992 39.8 1009.8 39.6 1027.6 39.8C1045.5 40 1063.3 40.7 1081.1 41C1098.9 41.3 1116.7 41.7 1134.5 41.7C1152.4 41.8 1179.1 41.3 1188 41.2L1188 41.9C1179.1 42.3 1152.4 43.6 1134.5 44.3C1116.7 45.1 1098.9 45.8 1081.1 46.4C1063.3 47 1045.5 47.4 1027.6 48.1C1009.8 48.8 992 49.9 974.2 50.5C956.4 51.2 938.5 51.3 920.7 52C902.9 52.7 885.1 54 867.3 54.8C849.5 55.6 831.6 56.2 813.8 56.9C796 57.6 778.2 58.4 760.4 59.1C742.5 59.9 724.7 60.7 706.9 61.2C689.1 61.8 671.3 61.9 653.5 62.4C635.6 63 617.8 64 600 64.7C582.2 65.3 564.4 65.9 546.5 66.3C528.7 66.7 510.9 66.6 493.1 66.9C475.3 67.2 457.5 67.7 439.6 68.1C421.8 68.4 404 69.2 386.2 69.1C368.4 69.1 350.5 68 332.7 68C314.9 67.9 297.1 68.9 279.3 68.8C261.5 68.8 243.6 68.2 225.8 67.7C208 67.1 190.2 66.5 172.4 65.5C154.5 64.5 136.7 63 118.9 61.6C101.1 60.2 83.3 59.7 65.5 57C47.6 54.3 20.9 47.3 12 45.4Z\"/><path class=\"bs-skip\" d=\"M630 27.6L943.8 28.1\" style=\"stroke-width:0.9\"/><path class=\"bs-skip\" d=\"M586.2 50.3L816.6 50.4\" style=\"stroke-width:3.2\"/><path class=\"bs-skip\" d=\"M995 33.9L1200 32.2\" style=\"stroke-width:1.9\"/><path class=\"bs-skip\" d=\"M1023.3 51.1L1200 50.5\" style=\"stroke-width:2.7\"/><path class=\"bs-skip\" d=\"M620.8 54.6L841.4 52.7\" style=\"stroke-width:2\"/><path class=\"bs-skip\" d=\"M1044.6 37.7L1200 36.2\" style=\"stroke-width:2.5\"/><path class=\"bs-skip\" d=\"M779.1 54.4L1056.9 52.6\" style=\"stroke-width:2.6\"/>",
  "<path class=\"bs-body\" d=\"M12 45C20.9 43.1 47.6 36.1 65.5 33.6C83.3 31.1 101.1 31.1 118.9 30.1C136.7 29 154.5 27.7 172.4 27.3C190.2 26.8 208 27.7 225.8 27.5C243.6 27.2 261.5 26 279.3 25.8C297.1 25.6 314.9 26.2 332.7 26.3C350.5 26.3 368.4 25.9 386.2 26.2C404 26.5 421.8 27.6 439.6 28.1C457.5 28.6 475.3 29 493.1 29.3C510.9 29.6 528.7 29.6 546.5 29.9C564.4 30.2 582.2 30.4 600 31C617.8 31.5 635.6 32.7 653.5 33.3C671.3 34 689.1 34.4 706.9 34.8C724.7 35.2 742.5 35.5 760.4 35.8C778.2 36 796 36 813.8 36.5C831.6 36.9 849.5 37.9 867.3 38.4C885.1 38.9 902.9 39.3 920.7 39.6C938.5 39.9 956.4 40.2 974.2 40.3C992 40.5 1009.8 40.3 1027.6 40.4C1045.5 40.5 1063.3 40.8 1081.1 41C1098.9 41.2 1116.7 41.2 1134.5 41.5C1152.4 41.8 1179.1 42.5 1188 42.7L1188 41.5C1179.1 41.9 1152.4 43.4 1134.5 44.1C1116.7 44.8 1098.9 44.9 1081.1 45.5C1063.3 46.1 1045.5 46.9 1027.6 47.6C1009.8 48.3 992 48.6 974.2 49.5C956.4 50.4 938.5 52.1 920.7 52.9C902.9 53.7 885.1 53.7 867.3 54.5C849.5 55.2 831.6 56.7 813.8 57.3C796 58 778.2 57.6 760.4 58.2C742.5 58.9 724.7 60.2 706.9 61C689.1 61.9 671.3 62.8 653.5 63.3C635.6 63.7 617.8 63.3 600 63.7C582.2 64.2 564.4 65.5 546.5 66C528.7 66.5 510.9 66.4 493.1 66.7C475.3 67 457.5 67.4 439.6 67.9C421.8 68.3 404 69.1 386.2 69.3C368.4 69.5 350.5 69.4 332.7 69.4C314.9 69.3 297.1 69.3 279.3 68.9C261.5 68.5 243.6 67.5 225.8 67C208 66.5 190.2 66.7 172.4 65.8C154.5 64.8 136.7 62.8 118.9 61.4C101.1 59.9 83.3 59.7 65.5 57.2C47.6 54.6 20.9 47.8 12 45.9Z\"/><path class=\"bs-skip\" d=\"M1006.6 53.8L1115.2 53\" style=\"stroke-width:3.1\"/><path class=\"bs-skip\" d=\"M733 33.9L881.1 33.3\" style=\"stroke-width:1.7\"/><path class=\"bs-skip\" d=\"M748.5 52.6L854.6 51.5\" style=\"stroke-width:1.4\"/><path class=\"bs-skip\" d=\"M949.7 42.8L1107.6 43\" style=\"stroke-width:2.6\"/><path class=\"bs-skip\" d=\"M642.4 47.4L927.4 48.4\" style=\"stroke-width:0.8\"/><path class=\"bs-skip\" d=\"M656.8 48.3L781 49\" style=\"stroke-width:1.4\"/><path class=\"bs-skip\" d=\"M556.3 21.8L823.4 19.9\" style=\"stroke-width:1.8\"/>",
  "<path class=\"bs-body\" d=\"M12 45.3C20.9 43.5 47.6 36.6 65.5 34.1C83.3 31.5 101.1 31.3 118.9 30.2C136.7 29.1 154.5 28 172.4 27.4C190.2 26.7 208 26.6 225.8 26.4C243.6 26.2 261.5 26.2 279.3 26.2C297.1 26.2 314.9 26.2 332.7 26.4C350.5 26.5 368.4 27.1 386.2 27.2C404 27.4 421.8 26.9 439.6 27.3C457.5 27.6 475.3 28.8 493.1 29.2C510.9 29.6 528.7 29.3 546.5 29.7C564.4 30.2 582.2 31.2 600 31.8C617.8 32.4 635.6 33 653.5 33.3C671.3 33.7 689.1 33.5 706.9 33.8C724.7 34.2 742.5 35.3 760.4 35.7C778.2 36.1 796 35.7 813.8 36.2C831.6 36.7 849.5 38.1 867.3 38.6C885.1 39.1 902.9 39 920.7 39.2C938.5 39.4 956.4 39.5 974.2 39.8C992 40.1 1009.8 41 1027.6 41.2C1045.5 41.5 1063.3 41.3 1081.1 41.2C1098.9 41.2 1116.7 40.9 1134.5 41.1C1152.4 41.2 1179.1 42 1188 42.2L1188 42.5C1179.1 42.8 1152.4 44 1134.5 44.6C1116.7 45.1 1098.9 45.2 1081.1 45.7C1063.3 46.2 1045.5 47 1027.6 47.6C1009.8 48.3 992 48.8 974.2 49.6C956.4 50.4 938.5 51.5 920.7 52.4C902.9 53.2 885.1 54.1 867.3 54.7C849.5 55.4 831.6 55.5 813.8 56.1C796 56.6 778.2 57.1 760.4 58C742.5 58.8 724.7 60.4 706.9 61.1C689.1 61.9 671.3 62 653.5 62.6C635.6 63.2 617.8 64.3 600 64.8C582.2 65.3 564.4 65.4 546.5 65.8C528.7 66.3 510.9 67.3 493.1 67.7C475.3 68.1 457.5 68.3 439.6 68.4C421.8 68.4 404 68.1 386.2 68.1C368.4 68.1 350.5 68.2 332.7 68.2C314.9 68.3 297.1 68.6 279.3 68.4C261.5 68.2 243.6 67.8 225.8 67.2C208 66.6 190.2 65.7 172.4 64.9C154.5 64.2 136.7 64.1 118.9 62.8C101.1 61.6 83.3 60.3 65.5 57.5C47.6 54.6 20.9 47.7 12 45.8Z\"/><path class=\"bs-skip\" d=\"M747.3 32.6L969 31.9\" style=\"stroke-width:1.5\"/><path class=\"bs-skip\" d=\"M977.3 54.4L1200 52.5\" style=\"stroke-width:3.1\"/><path class=\"bs-skip\" d=\"M821.6 55.3L990.6 55.5\" style=\"stroke-width:1.4\"/><path class=\"bs-skip\" d=\"M793.9 27.9L877.3 27.8\" style=\"stroke-width:0.9\"/><path class=\"bs-skip\" d=\"M801.9 21.1L1057.1 20.3\" style=\"stroke-width:3.1\"/><path class=\"bs-skip\" d=\"M682 31.3L776.5 32.2\" style=\"stroke-width:1.7\"/><path class=\"bs-skip\" d=\"M594.1 61.4L786.7 61.5\" style=\"stroke-width:2.3\"/>"
  ];

document.querySelectorAll('.band').forEach(band => {
  let shove = 0;
  band.addEventListener('click', () => {
    shove = (shove + 1) % 4;
    band.style.setProperty('--shove', shove);
    knock(band, 'is-struck');
  });
});

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

/* "Germany" says the same thing at four in the morning as it does at noon;
   the time says which one it is, and the reader can work out for
   themselves whether a message is going to be answered tonight. It used to
   spell that out as well, in the voice of a caption. It does not now.
   Intl does the timezone, so summer time is not something to maintain. */

const clock = document.getElementById('clock');

if (clock) {
  const face = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', hour12: false
  });

  const tick = () => { clock.textContent = face.format(new Date()); };

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

/* Sixty unauthenticated calls an hour are shared by everyone behind one
   address, so being refused is ordinary rather than exceptional — and two
   of the five regions on this page came from here. Whatever last came back
   is kept, and stands in when the next call is turned away. Every row
   carries its own timestamp, so a stale list ages honestly instead of
   claiming to be current. */
function fromGithub(key, url, shape) {
  return fetch(url)
    .then(r => (r.ok ? r.json() : null))
    .then(body => {
      const rows = Array.isArray(body) ? shape(body) : null;
      if (rows && rows.length) {
        stash(key, rows);
        return rows;
      }
      return unstash(key);
    })
    .catch(() => unstash(key));
}

if (pushBox && pushList) {
  fromGithub('strohut-pushes', `https://api.github.com/users/${GH_USER}/events/public?per_page=60`, events => {
    // one row per repo, carrying its most recent push
    const seen = new Map();
    for (const e of events) {
      if (!e || e.type !== 'PushEvent' || !e.repo || seen.has(e.repo.name)) continue;
      const commits = (e.payload && e.payload.commits) || [];
      seen.set(e.repo.name, {
        repo: e.repo.name,
        when: e.created_at,
        count: (e.payload && e.payload.size) || commits.length,
        last: commits.length ? String(commits[commits.length - 1].message).split('\n')[0] : ''
      });
      if (seen.size >= 5) break;
    }
    return [...seen.values()];
  }).then(rows => {
    if (!Array.isArray(rows) || !rows.length) return;
    pushList.replaceChildren(...rows.map((p, i) => pushRow(p, i)));
    pushBox.hidden = false;
    pushBox.classList.add('is-in');
  });
}

function pushRow(p, i) {
  const li = document.createElement('li');
  li.style.setProperty('--i', i);

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

/* ─────────────────────────── His repos ─────────────────────────── */

/* Commit messages say what changed this week; the repositories say what
   someone actually spends their time on. Forks are somebody else's work
   and archived ones are finished, so neither belongs here. */

const workBox = document.getElementById('work');
const workList = document.getElementById('work-list');

if (workBox && workList) {
  fromGithub('strohut-repos', `https://api.github.com/users/${GH_USER}/repos?sort=pushed&per_page=100`, repos =>
    // github answering with the right shape is not the same as github
    // answering with what was asked for, so the name is checked before it
    // is read rather than after it throws
    repos
      .filter(r => r && typeof r.name === 'string' && !r.fork && !r.archived
        && r.name.toLowerCase() !== `${GH_USER.toLowerCase()}.github.io`)
      .slice(0, 6)
      .map(r => ({
        name: r.name, url: r.html_url, what: r.description,
        lang: r.language, stars: r.stargazers_count, when: r.pushed_at
      }))
  ).then(rows => {
    if (!Array.isArray(rows) || !rows.length) return;
    workList.replaceChildren(...rows.map((repo, i) => workRow(repo, i)));
    workBox.hidden = false;
    workBox.classList.add('is-in');
  });
}

function workRow(repo, i) {
  const li = document.createElement('li');
  li.style.setProperty('--i', i);

  const link = document.createElement('a');
  link.className = 'work-name';
  link.href = repo.url;
  link.textContent = repo.name;
  li.append(link);

  if (repo.what) {
    const what = document.createElement('p');
    what.className = 'work-what';
    what.textContent = repo.what;
    li.append(what);
  }

  const meta = document.createElement('p');
  meta.className = 'work-meta';

  if (repo.lang) {
    const lang = document.createElement('span');
    lang.className = 'work-lang';
    lang.textContent = repo.lang;
    meta.append(lang);
  }

  if (repo.stars) {
    const stars = document.createElement('span');
    stars.textContent = `${repo.stars} star${repo.stars === 1 ? '' : 's'}`;
    meta.append(stars);
  }

  if (repo.when) {
    const when = document.createElement('span');
    when.textContent = ago(repo.when);
    meta.append(when);
  }

  if (meta.childElementCount) li.append(meta);
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
  seen: document.getElementById('track-seen'),
  bar: document.getElementById('track-bar'),
  fill: document.getElementById('track-fill'),
  link: document.getElementById('music-link')
};

/* The quiet state used to point at one track id that had been carried
   over from an older design — a favourite nobody had picked, sitting there
   claiming to be one. What the panel shows instead when nothing is playing
   is the last thing it actually caught him listening to, which is a true
   statement about a real song, and gets truer the more often you visit. */
const LAST_TRACK = 'strohut-track';

function stash(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* it just won't be there next time */
  }
}

function unstash(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

el.art.addEventListener('load', () => { el.art.hidden = false; });
el.art.addEventListener('error', () => { el.art.hidden = true; });

// The portrait only covers the empty ring once the picture has really
// loaded, so a blocked CDN leaves the ring rather than a broken image
const portrait = el.avatar.closest('.portrait');
const showPortrait = on => {
  el.avatar.hidden = !on;
  if (portrait) portrait.classList.toggle('is-empty', !on);
};
showPortrait(false);

el.avatar.addEventListener('load', () => showPortrait(true));
el.avatar.addEventListener('error', () => showPortrait(false));

const STATUS_TEXT = {
  online: 'online',
  idle: 'idle',
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
    showPortrait(false);
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
  if (track && track.song) {
    stash(LAST_TRACK, {
      song: track.song, artist: track.artist, id: track.track_id,
      art: track.album_art_url, at: Date.now()
    });
  }

  // nothing playing: fall back to the last one this page saw
  const seen = track ? null : unstash(LAST_TRACK);
  const show = track || seen;

  el.kicker.textContent = track ? 'now playing' : seen ? 'last played' : 'nothing playing';
  el.song.textContent = show ? show.song : 'nothing playing';
  el.artist.textContent = show ? show.artist || '' : '';
  el.artist.hidden = !el.artist.textContent;

  el.seen.textContent = seen && seen.at ? ago(seen.at) : '';
  el.seen.hidden = !el.seen.textContent;

  const id = show && (show.track_id || show.id);
  el.link.hidden = !id;
  if (id) el.link.href = `https://open.spotify.com/track/${id}`;

  const art = show && (show.album_art_url || show.art);
  if (art) {
    // re-assigning the same src restarts the fade, and presence updates
    // arrive far more often than the song changes
    if (el.art.src !== art) el.art.src = art;
    el.art.alt = `${(track && track.album) || show.song} cover`;
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

  /* The track comes from the same socket, so with that unreachable there
     is nothing to say about what is playing — and the panel used to sit on
     "checking…" for as long as the tab stayed open. If this page has caught
     something before, that still stands. If it never has, the region goes,
     which is the same rule the github ones follow. */
  const music = document.querySelector('.music');
  if (unstash(LAST_TRACK)) showTrack(null);
  else if (music) music.hidden = true;
}
