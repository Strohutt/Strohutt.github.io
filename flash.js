
const stillPlease = window.matchMedia('(prefers-reduced-motion: reduce)');



const curtain = document.getElementById('curtain');
const flare = document.getElementById('curtain-white');

if (curtain) {
  /* Keep the flash peak aligned with the final word reveal. */
  const CUT = 2250;        // the white is at its peak; take the drawing away
  const DONE = 2820;       // and the white is finished
  const SKIPS = ['pointerdown', 'keydown', 'wheel', 'touchstart'];

  let seen = true;
  try {
    seen = sessionStorage.getItem('strohut-seen') === '1';
    sessionStorage.setItem('strohut-seen', '1');
  } catch {
    // If storage is unavailable, show the intro for this load.
    seen = false;
  }

  let cutTimer = 0;
  let doneTimer = 0;
  let barred = false;

  const open = () => {
    document.documentElement.classList.remove('is-cast');
    if (!barred) return;
    barred = false;
    dispatchEvent(new Event('strohut:open'));
  };

  const lift = () => {
    if (curtain.classList.contains('is-done') && (!flare || flare.classList.contains('is-done'))) {
      open();
      return;
    }
    curtain.classList.add('is-done');
    if (flare) {
      flare.classList.add('is-done');
      flare.classList.remove('is-going');
    }
    open();
    clearTimeout(cutTimer);
    clearTimeout(doneTimer);
    for (const kind of SKIPS) removeEventListener(kind, lift);
  };

  const run = () => {
    clearTimeout(cutTimer);
    clearTimeout(doneTimer);
    barred = true;

    cutTimer = setTimeout(() => {
      curtain.classList.add('is-done');
      open();
    }, CUT);

    doneTimer = setTimeout(lift, DONE);
    for (const kind of SKIPS) addEventListener(kind, lift, { passive: true, once: true });
  };

  if (seen || stillPlease.matches) {
    curtain.classList.add('is-done');
    if (flare) flare.classList.add('is-done');
  } else {
    document.documentElement.classList.add('is-cast');
    run();
  }

  const again = document.getElementById('name-hit');
  if (again) {
    again.addEventListener('click', () => {
      if (stillPlease.matches) return;

      // Restart both intro animations from their initial state.
      for (const el of [curtain, flare]) {
        if (!el) continue;
        el.classList.add('is-done');
        el.classList.remove('is-going');
      }
      void curtain.offsetWidth;
      curtain.classList.remove('is-done');
      if (flare) {
        flare.classList.remove('is-done');
        flare.classList.add('is-going');
      }
      document.documentElement.classList.add('is-cast');
      run();
    });
  }
}

const strikes = document.getElementById('strikes');
const tally = document.getElementById('tally');
const sigil = document.querySelector('.hero');
const wheel = document.querySelector('.wheel');


const WIND_MIN = 560;       // ms for the ring to close — drawn per attempt,
const WIND_MAX = 760;       // so there is nothing to memorise
const WINDOW_AT = 0.86;     // where in the wind-up the middle of it sits
const WINDOW_BASE = 0.18;   // how much of the wind-up it stays open at first
const WINDOW_ROOF = 0.27;   // and it never gets wider than this
const LEARNS = 8;           // one per orb on the wheel
const WINDOW_STEP = (WINDOW_ROOF - WINDOW_BASE) / LEARNS;
const HOLD_LIMIT = 2200;    // holding past this is a miss, not a pause
const DOMAIN_AT = 5;        // in a row, and the field is yours
const DOMAIN_FOR = 7000;    // for this long

let streak = 0;
let charge = null;
let domainUntil = 0;
/* Build a fresh domain for each run. */
let spent = false;

/* Session storage is optional; reads and writes may fail. */
function readNum(key) {
  try {
    return Math.max(0, parseInt(sessionStorage.getItem(key), 10) || 0);
  } catch {
    return 0;
  }
}

function write(key, value) {
  try {
    sessionStorage.setItem(key, String(value));
  } catch {
  }
}

let adapted = readNum('strohut-adapt');   // where it points, either way
let turns = readNum('strohut-turns');     // how far it has been moved, ever
let learned = Math.min(LEARNS, readNum('strohut-learned'));
let awake = learned >= LEARNS;
let best = readNum('strohut-flash');
let total = readNum('strohut-landed');
let closest = readNum('strohut-closest');

function turn(by) {
  adapted += by;
  turns += Math.abs(by);
  write('strohut-adapt', adapted);
  write('strohut-turns', turns);
  if (wheel) wheel.style.setProperty('--adapt', adapted);
}

function learn() {
  if (learned >= LEARNS) return;
  learned += 1;
  write('strohut-learned', learned);
  show();
  if (learned >= LEARNS) woken(true);
}

function woken(loud) {
  awake = true;
  document.body.classList.add('is-awake');
  if (loud) aloud('All eight sparks. The window is as wide as it gets.');
  if (score.adaptSays) score.adaptSays.textContent = 'the sparks are all in you';
  if (!loud || !woke || stillPlease.matches) return;
  woke.hidden = false;
  woke.classList.remove('is-said');
  void woke.offsetWidth;
  woke.classList.add('is-said');
  clearTimeout(wokeTimer);
  wokeTimer = setTimeout(() => { woke.hidden = true; }, 2600);
}

function show() {
  if (wheel) wheel.style.setProperty('--learned', learned);
}

if (tally) document.getElementById('tally-best').textContent = best;
if (wheel && adapted) wheel.style.setProperty('--adapt', adapted);
show();

const woke = document.getElementById('woke');
let wokeTimer = 0;

const score = {
  best: document.getElementById('score-best'),
  adaptSays: document.querySelector('#score-adapt + span'),
  total: document.getElementById('score-total'),
  adapt: document.getElementById('score-adapt'),
  last: document.getElementById('score-last'),
  close: document.getElementById('score-close'),
  window: document.getElementById('score-window')
};

function post(cell, value, bump) {
  if (!cell || cell.textContent === String(value)) return;
  cell.textContent = value;
  if (!bump) return;
  cell.classList.remove('is-up');
  void cell.offsetWidth;
  cell.classList.add('is-up');
}

const scorePanel = document.querySelector('.score');

function heat() {
  if (scorePanel) scorePanel.style.setProperty('--streak', streak);
}

/* Keep rank thresholds in descending order. */
const GRADES = [
  { kanji: '特級', name: 'special grade',
    why: 'eight in a row, and inside five milliseconds',
    at: () => best >= 8 && closest && closest <= 5 },
  { kanji: '一級', name: 'grade one',
    why: 'all eight sparks',
    at: () => awake },
  { kanji: '準一級', name: 'semi-grade one',
    why: 'a domain of your own',
    at: () => best >= DOMAIN_AT },
  { kanji: '二級', name: 'grade two',
    why: 'three in a row',
    at: () => best >= 3 },
  { kanji: '三級', name: 'grade three',
    why: 'one landed',
    at: () => total >= 1 },
  { kanji: '四級', name: 'grade four',
    why: 'nothing landed yet',
    at: () => true }
];

const gradeBox = document.getElementById('grade');
const gradeMark = document.getElementById('grade-mark');
const gradeName = document.getElementById('grade-name');
const gradeWhy = document.getElementById('grade-why');
const gradeTake = document.getElementById('grade-take');
let held = '';

if (gradeTake) {
  let took = 0;
  gradeTake.addEventListener('click', async () => {
    const now = GRADES.find(g => g.at());
    const bits = [`${now.kanji} — ${now.name}`];
    if (total) bits.push(`${total} landed`);
    if (best > 1) bits.push(`best ${best} in a row`);
    if (closest) bits.push(`${closest} ms from the ring`);
    const line = `black flash · ${bits.join(' · ')} · strohutt.github.io`;
    try {
      await navigator.clipboard.writeText(line);
      gradeTake.textContent = 'copied';
      aloud('Copied, with the numbers that earned it.');
    } catch {
      gradeTake.textContent = 'the browser said no';
      aloud('The browser would not hand it over.');
    }
    clearTimeout(took);
    took = setTimeout(() => { gradeTake.textContent = 'take it with you'; }, 1800);
  });
}

function graded(loud) {
  if (!gradeBox) return;
  const now = GRADES.find(g => g.at());
  if (now.kanji === held) return;
  const first = held === '';
  held = now.kanji;

  const GLYPH = {
    '一': '#ch-一', '二': '#ch-二', '三': '#ch-三', '四': '#ch-四',
    '特': '#kj-特', '準': '#kj-準', '級': '#kj-級'
  };
  gradeMark.innerHTML = [...now.kanji]
    .map(ch => `<svg viewBox="0 0 1000 1000"><use href="${GLYPH[ch]}" /></svg>`).join('');
  gradeName.textContent = now.name;
  gradeWhy.textContent = now.why;
  gradeBox.dataset.grade = now.name.replace(/\s+/g, '-');
  if (gradeTake) gradeTake.hidden = now.name === 'grade four';

  if (first || !loud || stillPlease.matches) return;
  gradeBox.classList.remove('is-up');
  void gradeBox.offsetWidth;
  gradeBox.classList.add('is-up');
  const box = gradeMark.getBoundingClientRect();
  if (box.width) poke(box.left + box.width / 2, box.top + box.height / 2);
  aloud(`${now.name[0].toUpperCase()}${now.name.slice(1)} — ${now.why}.`, true);
}

function tell(bump) {
  post(score.best, best, bump);
  post(score.total, total, bump);
  post(score.adapt, `${learned} of ${LEARNS}`, bump);
  post(score.close, closest ? `${closest} ms` : '—', bump);
  graded(bump);
  heat();
  said();
  dispatchEvent(new Event('strohut:score'));
}

function said() {
  if (!score.window) return;
  const w = windowNow();
  score.window.textContent = `${Math.round(WIND_MIN * w)}–${Math.round(WIND_MAX * w)} ms`;
}

tell(false);
if (awake) woken(false);

const marks = document.getElementById('score-marks');
const MARK_KEEP = 12;
let brush = 0;

function slotFor(hit, ghost) {
  const slot = document.createElement('span');
  slot.className = `mark${ghost ? ' is-ghost' : ''}${hit ? ' is-hit' : ''}`;
  slot.innerHTML = `<svg viewBox="0 0 24 60"><use href="#tick-${1 + (brush++ % 5)}" /></svg>`;
  return slot;
}

if (marks) {
  marks.replaceChildren(...Array.from({ length: MARK_KEEP }, () => slotFor(false, true)));
}

function mark(hit) {
  if (!marks) return;
  if (marks.firstElementChild) marks.firstElementChild.remove();
  marks.append(slotFor(hit, false));
}

function windowNow() {
  return Math.min(WINDOW_ROOF, WINDOW_BASE + learned * WINDOW_STEP);
}

const opensAt = () => WINDOW_AT - windowNow() / 2;

const inDomain = () => performance.now() < domainUntil;

function windUp() {
  return WIND_MIN + Math.random() * (WIND_MAX - WIND_MIN);
}


function riftWalk(x, y, angle, reach) {
  const steps = 4 + Math.floor(Math.random() * 3);
  const pts = [[x, y]];
  let cx = x, cy = y, a = angle;
  for (let i = 0; i < steps; i++) {
    a += (Math.random() - .5) * (.45 + i * .3);
    const len = reach / steps * (.6 + Math.random() * .9);
    cx += Math.cos(a) * len;
    cy += Math.sin(a) * len;
    pts.push([cx, cy]);
  }
  return pts;
}

const at = p => `${Math.round(p[0])} ${Math.round(p[1])}`;

function riftShape(pts, wide) {
  const last = pts.length - 1;
  const left = [], right = [];
  for (let i = 0; i <= last; i++) {
    const t = i / last;
    const w = wide * Math.pow(1 - t, 1.1) + .6;
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(last, i + 1)];
    const a = Math.atan2(next[1] - prev[1], next[0] - prev[0]) + Math.PI / 2;
    left.push([pts[i][0] + Math.cos(a) * w, pts[i][1] + Math.sin(a) * w]);
    right.push([pts[i][0] - Math.cos(a) * w, pts[i][1] - Math.sin(a) * w]);
  }
  return `M${left.map(at).join('L')}L${right.reverse().map(at).join('L')}Z`;
}

function rift(x, y, streak) {
  const w = innerWidth, h = innerHeight;
  const far = Math.max(Math.hypot(x, y), Math.hypot(w - x, y),
    Math.hypot(x, h - y), Math.hypot(w - x, h - y));
  const arms = 5 + Math.min(4, streak);
  const turn = Math.random() * Math.PI * 2;

  let paint = '';
  for (let i = 0; i < arms; i++) {
    const a = turn + (i / arms) * Math.PI * 2 + (Math.random() - .5) * .7;
    const pts = riftWalk(x, y, a, far * (.45 + Math.random() * .75));
    const line = `M${pts.map(at).join('L')}`;
    paint += `<path class="rf-dark" d="${riftShape(pts, 10 + Math.random() * 8)}"/>` +
             `<path class="rf-glow" d="${line}" pathLength="1" style="--i:${i}"/>` +
             `<path class="rf-lit" d="${line}" pathLength="1" style="--i:${i}"/>`;
  }

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'rift');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.style.setProperty('--ox', `${Math.round(x)}px`);
  svg.style.setProperty('--oy', `${Math.round(y)}px`);
  svg.innerHTML = paint;
  return svg;
}

function strikeAt(x, y, kind) {
  if (!strikes) return;
  const stamp = document.createElement('div');
  stamp.className = `strike strike-${kind}`;
  stamp.style.left = `${x}px`;
  stamp.style.top = `${y}px`;

  if (kind === 'flash') {
    const which = 1 + Math.floor(Math.random() * 2);
    let shards = '';
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * 360 + (Math.random() - .5) * 26;
      shards += `<span class="shard" style="--a:${a.toFixed(0)}deg;` +
        `--d:${(5 + Math.random() * 9).toFixed(1)}rem;` +
        `--s:${(.4 + Math.random() * .9).toFixed(2)};` +
        `--t:${(Math.random() * 90).toFixed(0)}ms"></span>`;
    }
    stamp.innerHTML =
      `<span class="wave"></span><span class="wave wave-2"></span>` +
      `<svg class="bolt" viewBox="0 0 400 400"><use href="#flash-${which}" /></svg>` +
      shards;

    const split = rift(x, y, streak);
    strikes.append(split);
    setTimeout(() => split.remove(), 1200);
  }

  strikes.append(stamp);
  /* Remove the node only after its final animation ends. */
  const done = () => {
    if (!stamp.getAnimations({ subtree: true }).some(a => a.playState === 'running')) stamp.remove();
  };
  stamp.addEventListener('animationend', done);
  setTimeout(() => stamp.remove(), 1400);
}

/* CSS owns ring timing through custom properties. */
function openCharge(x, y, wind) {
  if (!strikes) return null;
  const ring = document.createElement('div');
  ring.className = 'charge';
  ring.style.left = `${x}px`;
  ring.style.top = `${y}px`;
  ring.style.setProperty('--wind', `${Math.round(wind)}ms`);
  ring.style.setProperty('--open-at', `${Math.round(wind * opensAt())}ms`);
  ring.style.setProperty('--span', `${Math.round(wind * windowNow())}ms`);

  const at = t => (1 - .4 * t) * 100;
  ring.style.setProperty('--gate-out', `${at(opensAt()).toFixed(1)}%`);
  ring.style.setProperty('--gate-in', `${at(opensAt() + windowNow()).toFixed(1)}%`);

  strikes.append(ring);
  return ring;
}

function shutCharge(hit) {
  document.body.classList.remove('is-charging');
  if (!charge) return;
  const { ring, timer } = charge;
  clearTimeout(timer);
  if (ring) {
    ring.classList.add(hit ? 'is-landed' : 'is-spent');
    ring.addEventListener('animationend', () => ring.remove(), { once: true });
    setTimeout(() => ring.remove(), 900);
  }
  charge = null;
}

function missed(how, off, dev) {
  if (!how) {
    say('');
    return;
  }

  spent = false;
  streak = 0;
  heat();

  if (tally) {
    tally.classList.remove('is-hot');
    document.getElementById('tally-streak').textContent = '0';
  }

  mark(false);
  keep(dev === undefined ? off : dev);
  const said = `${Math.max(1, Math.round(off))} ms ${how}`;
  tellLast(said);
  say(said);
  aloud(`Missed, ${said}.`);
}

function keep(dev) {
  const off = Math.abs(Math.round(dev));
  if (closest && off >= closest) return;
  closest = Math.max(1, off);
  write('strohut-closest', closest);
}

function tellLast(word) {
  if (score.last) score.last.textContent = word;
}

let sayTimer = null;

function say(word) {
  const hint = document.getElementById('tally-hint');
  if (!hint) return;
  clearTimeout(sayTimer);
  hint.textContent = word || '';
  hint.hidden = !word;
  if (word) sayTimer = setTimeout(() => { hint.hidden = true; }, 1600);
}

function aloud(what, andThen) {
  const said = document.getElementById('flash-said');
  if (!said) return;
  said.textContent = andThen && said.textContent ? `${said.textContent} ${what}` : what;
}

function landed(dev, sure) {
  streak += 1;
  total += 1;
  write('strohut-landed', total);

  if (streak > best) {
    best = streak;
    write('strohut-flash', best);
  }

  if (!sure) keep(dev);
  const off = Math.abs(Math.round(dev));
  const word = sure ? 'sure hit' : off <= 1 ? 'dead on' : `${off} ms ${dev < 0 ? 'early' : 'late'}`;

  say(word);
  aloud(`Landed, ${word}. ${streak} in a row.`);
  tellLast(word);
  mark(true);

  if (tally) {
    tally.hidden = false;
    tally.classList.toggle('is-hot', streak > 1);
    document.getElementById('tally-streak').textContent = streak;
    document.getElementById('tally-best').textContent = best;
  }

  turn(1);
  learn();
  tell(true);
  if (sigil) sigil.classList.add('is-adapted');

  document.querySelectorAll('.band, .flag, .brush, .score-sigil').forEach((el, i) => {
    setTimeout(() => knock(el, 'is-struck'), 60 + i * 70);
  });

  document.body.classList.remove('is-flashing');
  void document.body.offsetWidth;
  document.body.classList.add('is-flashing');

  if (streak >= DOMAIN_AT && !spent) cast();
}

function cast() {
  spent = true;
  domainUntil = performance.now() + DOMAIN_FOR;

  document.body.style.setProperty('--domain-for', `${DOMAIN_FOR}ms`);
  say('domain — sure hit');
  aloud(`Domain open for ${Math.round(DOMAIN_FOR / 1000)} seconds. Nothing misses in it.`);
  document.body.classList.remove('is-domain');
  void document.body.offsetWidth;
  document.body.classList.add('is-domain');

  clearTimeout(domainTimer);
  domainTimer = setTimeout(shut, DOMAIN_FOR);
  count();
}

function shut() {
  domainUntil = 0;
  clearTimeout(domainTimer);
  clearTimeout(countTimer);
  if (domainLeft) domainLeft.textContent = '';

  if (stillPlease.matches || !document.body.classList.contains('is-domain')) {
    document.body.classList.remove('is-domain');
    return;
  }
  document.body.classList.add('is-sealing');
  setTimeout(() => document.body.classList.remove('is-domain'), 200);
  setTimeout(() => document.body.classList.remove('is-sealing'), 620);
}

function count() {
  clearTimeout(countTimer);
  if (!inDomain()) return;
  const left = (domainUntil - performance.now()) / 1000;
  if (domainLeft) domainLeft.textContent = `${left.toFixed(1)}s`;
  countTimer = setTimeout(count, 100);
}

let domainTimer = 0;
let countTimer = 0;
const domainLeft = document.getElementById('domain-left');
// The 404 has no interactive field.
const arena = document.getElementById('flash-arena');

if (!stillPlease.matches) {
  const hold = (x, y) => {
    const at = performance.now();
    const wind = windUp();
    const ring = openCharge(x, y, wind);
    document.body.classList.add('is-charging');

    charge = {
      ring,
      at,
      wind,
      x,
      y,
      timer: setTimeout(() => {
        if (!charge) return;
        const { x: hx, y: hy, wind: hw } = charge;
        strikeAt(hx, hy, 'hit');
        shutCharge(false);
        missed('late', HOLD_LIMIT - hw * (WINDOW_AT + windowNow() / 2));
      }, HOLD_LIMIT)
    };
  };

  if (arena) arena.addEventListener('pointerdown', event => {
    if (event.button !== 0 || charge) return;
    hold(event.clientX, event.clientY);
    try { arena.setPointerCapture(event.pointerId); } catch { /* fine without it */ }
  });

  const release = event => {
    if (!charge) return;

    const held = performance.now() - charge.at;
    const span = charge.wind * windowNow();
    const open = charge.wind * opensAt();
    const shut = open + span;

    const sure = inDomain();
    const inside = sure || (held >= open && held <= shut);

    const dev = Math.round(held - (open + span / 2));

    const x = event && event.clientX != null ? event.clientX : charge.x;
    const y = event && event.clientY != null ? event.clientY : charge.y;

    strikeAt(x, y, inside ? 'flash' : 'hit');
    shutCharge(inside);

    if (inside) landed(dev, sure);
    else missed(held < open ? 'early' : 'late', Math.abs(dev), dev);
  };

  addEventListener('pointerup', release, { passive: true });

  let onKey = false;
  if (arena) {
    const isHold = key => key === ' ' || key === 'Spacebar' || key === 'Enter';

    arena.addEventListener('keydown', event => {
      if (!isHold(event.key)) return;
      // Suppress native button activation while timing the custom hold.
      event.preventDefault();
      if (event.repeat || onKey || charge) return;
      onKey = true;
      const box = arena.getBoundingClientRect();
      hold(box.left + box.width / 2, box.top + box.height / 2);
    });

    arena.addEventListener('keyup', event => {
      if (!isHold(event.key) || !onKey) return;
      onKey = false;
      release(null);
    });

    // Cancel keyboard holds when focus leaves the page.
    arena.addEventListener('blur', () => { onKey = false; });

    arena.addEventListener('click', event => event.preventDefault());

    let touchFrom = null;
    arena.addEventListener('touchstart', event => {
      touchFrom = [event.touches[0].clientX, event.touches[0].clientY];
    }, { passive: true });
    arena.addEventListener('touchmove', event => {
      if (!charge || !touchFrom) return;
      const dx = event.touches[0].clientX - touchFrom[0];
      const dy = event.touches[0].clientY - touchFrom[1];
      if (Math.hypot(dx, dy) < 14) event.preventDefault();
    }, { passive: false });
  }
  addEventListener('pointercancel', () => {
    if (!charge) return;
    shutCharge(false);
    missed('');
  }, { passive: true });

  addEventListener('blur', () => {
    if (!charge) return;
    shutCharge(false);
    missed('');
  });

  document.body.addEventListener('animationend', event => {
    if (event.animationName === 'room') document.body.classList.remove('is-flashing');
    /* A fallback closes the domain if a throttled tab delays the timer. */
    if (event.animationName === 'domain' && document.body.classList.contains('is-domain')) shut();
  });
}



function poke(x, y) {
  if (!strikes || stillPlease.matches) return;
  const mark = document.createElement('div');
  mark.className = 'poke';
  mark.style.left = `${x}px`;
  mark.style.top = `${y}px`;
  mark.innerHTML = '<span class="poke-ring"></span><span class="poke-tear"></span><span class="poke-tear poke-tear-2"></span>';
  strikes.append(mark);
  setTimeout(() => mark.remove(), 500);
}

function knock(el, cls) {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth;                       // restart the animation
  el.classList.add(cls);
}

const wheelHit = document.getElementById('wheel-hit');

if (wheelHit && wheel) {
  let drag = 0;                 // degrees away from the ratchet
  let spin = 0;                 // degrees per frame while it runs down
  let frame = 0;
  let grip = null;

  const paint = () => wheel.style.setProperty('--drag', `${drag.toFixed(2)}deg`);

  const angleAt = (x, y) => {
    const box = wheel.getBoundingClientRect();
    return Math.atan2(y - (box.top + box.height / 2), x - (box.left + box.width / 2)) * 180 / Math.PI;
  };

  function step(by) {
    turn(by);
    tell(true);
    knock(wheel, 'is-struck');
  }

  function settle() {
    frame = 0;
    wheel.classList.remove('is-spinning');
    const teeth = Math.round(drag / 45);
    drag = 0;
    paint();
    step(teeth);
  }

  function runDown() {
    spin *= .955;
    drag += spin;
    paint();
    if (Math.abs(spin) > .25) frame = requestAnimationFrame(runDown);
    else settle();
  }

  wheelHit.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    cancelAnimationFrame(frame);
    frame = 0;
    spin = 0;
    grip = { angle: angleAt(event.clientX, event.clientY), moved: 0, at: performance.now() };
    wheel.classList.add('is-spinning');
    wheelHit.setPointerCapture(event.pointerId);
  });

  wheelHit.addEventListener('pointermove', event => {
    if (!grip) return;

    const now = angleAt(event.clientX, event.clientY);
    // Unwrap atan2 across the half turn to avoid a false 360-degree flick.
    let by = now - grip.angle;
    if (by > 180) by -= 360;
    if (by < -180) by += 360;

    const gap = performance.now() - grip.at;
    grip.angle = now;
    grip.at = performance.now();
    grip.moved += Math.abs(by);

    drag += by;
    spin = gap > 0 ? by * (16 / gap) : by;
    paint();
  });

  const letGo = () => {
    if (!grip) return;
    const thrown = grip.moved > 6;
    grip = null;

    if (thrown) {
      runDown();
      return;
    }

    drag = 0;
    paint();
    wheel.classList.remove('is-spinning');
    step(1);
  };

  wheelHit.addEventListener('pointerup', letGo);

  /* Pointer cancellation must restore the wheel to a stable state. */
  const abandon = () => {
    if (!grip) return;
    grip = null;
    spin = 0;
    drag = 0;
    paint();
    wheel.classList.remove('is-spinning');
  };

  wheelHit.addEventListener('pointercancel', abandon);
  addEventListener('blur', abandon);

  wheelHit.addEventListener('click', event => {
    if (event.detail === 0) step(1);
  });

  addEventListener('strohut:struck', () => {
    if (grip) return;                        // it is being held; leave it alone
    cancelAnimationFrame(frame);
    frame = 0;
    spin = 0;
    drag = 0;
    paint();
    step(1);
  });
}


const lostPath = document.getElementById('lost-path');
const lostGuess = document.getElementById('lost-guess');

function lostSaid() {
  if (!lostPath) return;
  lostPath.hidden = true;
  lostPath.textContent = '';
  if (lostGuess) { lostGuess.hidden = true; lostGuess.textContent = ''; }

  /* decodeURI may throw on malformed input; keep the raw path then. */
  const raw = location.pathname + location.search;
  let path = raw;
  try { path = decodeURI(raw); } catch { /* show it as it came */ }
  path = path.replace(/\s+/g, ' ').trim();

  if (!path || path === '/' || /^\/404(\.html)?$/.test(path)) return;
  const shown = path.length > 64 ? `${path.slice(0, 63)}…` : path;
  lostPath.textContent = `nothing at ${shown}`;
  lostPath.hidden = false;

  if (!lostGuess) return;
  const PLACES = [
    [['likes', 'like', 'favourites', 'favorites', 'favourite', 'favorite'], 'favourites', '/#likes'],
    [['score', 'flash', 'blackflash', 'black'], 'the black flash', '/#score'],
    [['traced', 'tracing', 'wheel', 'staff', 'yeoui'], 'traced from', '/#traced'],
    [['bounty', 'wanted', 'berry', 'berries', 'poster'], 'the bounty', '/#bounty'],
    [['work', 'works', 'project', 'projects', 'portfolio'], 'work', '/work/'],
    [['now', 'status', 'presence', 'discord'], 'right now', '/#now']
  ];

  const edits = (a, b) => {
    if (Math.abs(a.length - b.length) > 2) return 3;
    const row = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      let corner = row[0];
      row[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const up = row[j];
        row[j] = Math.min(up + 1, row[j - 1] + 1, corner + (a[i - 1] === b[j - 1] ? 0 : 1));
        corner = up;
      }
    }
    return row[b.length];
  };

  const tokens = path.toLowerCase().replace(/\.[a-z0-9]+$/, '')
    .split(/[^a-z0-9]+/).filter(t => t.length >= 3 && t.length <= 24);

  let best = null;
  for (const t of tokens) {
    for (const [keys, label, href] of PLACES) {
      for (const k of keys) {
        const d = t === k ? 0 : edits(t, k);
        if (d <= (k.length >= 6 ? 2 : 1) && (!best || d < best[0])) best = [d, label, href];
      }
    }
  }
  if (!best) return;

  lostGuess.append('were you after ');
  const a = document.createElement('a');
  a.href = best[2];
  a.textContent = best[1];
  lostGuess.append(a, '?');
  lostGuess.hidden = false;
}

lostSaid();
