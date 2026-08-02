/* ════════════════════════════════════════════════════════════════
   黒閃 — shared by the front page and the 404, because both are worth
   hitting. Everything guards on its element being present, so a page
   carrying only some of the markup still works.
   ════════════════════════════════════════════════════════════════ */

const stillPlease = window.matchMedia('(prefers-reduced-motion: reduce)');

/* ─────────────────────────── 無量空処 ──────────────────────────── */

/* The barrier goes up once when you arrive, and then it is gone. Not on
   every page in a session, not for anybody who has asked their machine to
   stop moving things, and never for longer than it takes — any key, any
   click, any scroll takes it down early, and a timer takes it down even if
   nothing else fires at all.

   A loading screen that cannot be got rid of is a loading screen that
   somebody leaves.

   The white is a layer of its own above the curtain rather than a child of
   it: the curtain is taken away while the screen is white, so the page
   arrives out of the white instead of cross-fading with it — and nothing
   with a changing opacity is left sitting above the drawing, which is what
   was stopping any of it from being composited. */

const curtain = document.getElementById('curtain');
const flare = document.getElementById('curtain-white');

if (curtain) {
  /* The white starts at 1.8s and runs for 0.95, so it is at its peak at
     about 2.25. The drawing goes then — not before the sequence under it
     has finished, which is 1.71s for the last word to land. */
  const CUT = 2250;        // the white is at its peak; take the drawing away
  const DONE = 2820;       // and the white is finished
  const SKIPS = ['pointerdown', 'keydown', 'wheel', 'touchstart'];

  let seen = true;
  try {
    seen = sessionStorage.getItem('strohut-seen') === '1';
    sessionStorage.setItem('strohut-seen', '1');
  } catch {
    // no session storage: show it, once, and let the reload be the cost
    seen = false;
  }

  let cutTimer = 0;
  let doneTimer = 0;
  let barred = false;

  /* Everything the page does when it arrives — the stroke inking itself
     in, the regions assembling a part at a time — used to happen while
     this was still over the top of it, and the page came out of the white
     already built. It waits for this instead, so the barrier lifts on a
     page that then puts itself together in front of you.

     Said once per showing whichever way the barrier went, because the
     thing on the other end has no way of telling a timer running out from
     somebody clicking through it. */
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

    // the drawing goes while the screen is white
    cutTimer = setTimeout(() => {
      curtain.classList.add('is-done');
      open();
    }, CUT);

    // and this is the one that has to happen whatever else did not
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

  /* Once is a loading screen. Being able to set it off again is the thing
     he asked for — so the name is the control: it already redraws the
     stroke under itself, and pressing the biggest word on the page is
     about as deliberate as a click gets. */
  const again = document.getElementById('name-hit');
  if (again) {
    again.addEventListener('click', () => {
      if (stillPlease.matches) return;

      // both have to be started again from nothing, or a second showing is
      // a class change on something that already finished
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

/* A black flash is cursed energy landing inside a millionth of a second
   of the hit. Rolling dice on every click was a slot machine wearing its
   name — you were not doing anything, you were pulling a lever.

   So it is timing. Hold, and a ring closes on the pointer. Let go while
   it is inside the window and it lands. The window opens late and stays
   open briefly, so early is a miss and so is waiting.

   Two things were wrong with the first pass at it.

   The wind-up was a fixed 620ms, so after five attempts you were not
   reacting to anything — you were counting, and the ring was decoration.
   It is a different length every time now, drawn fresh per attempt, and
   the ring is the only thing that tells you where you are. The spread is
   narrow enough that the ring reads the same from one go to the next.

   The window sits in the middle of where it opens rather than starting
   there, so it can grow without ever running past the ring closing —
   which is what the old one did the moment it got any wider.

   And it grows. Landing one used to make the next one harder, which is
   backwards: in the source, somebody who has landed one is blessed by
   the sparks and the next come easier. That is also the kinder rule.
   Eight of them and the window is half again what it started at. */

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
/* One domain per run. Without this, a streak that has been past five once
   re-opens it on every hit after that — the run never comes down and the
   thing you paid for is free from then on. Broken by a miss, like the run
   itself, so a second one has to be built rather than waited for. */
let spent = false;

/* Kept for the visit and no longer. A record that survives the browser
   being closed is a record somebody has to live with — come back in a
   month and the first thing the page tells you is a number you cannot
   remember setting. Session storage is exactly the right shelf: it holds
   while the tab is open, through every reload and every page in it, and
   it is gone when the tab is.

   Storage is not always there to be written to — private windows and a
   full quota both throw — and none of this is worth losing the page over,
   so every read falls back to zero and every write is allowed to fail. */
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
    /* it just starts over next time */
  }
}

/* What the sparks have blessed, kept. That is what makes this more than
   one trick repeated: the window does not open because you are on a run,
   it opens because one has landed, and a miss does not take it back.

   Eight orbs on the wheel, eight of them, and the eighth leaves the
   window half again what it started at. So the drawing is the curve —
   there is nothing else to read it off, and nothing to explain. */
let adapted = readNum('strohut-adapt');   // where it points, either way
let turns = readNum('strohut-turns');     // how far it has been moved, ever
let learned = Math.min(LEARNS, readNum('strohut-learned'));
/* Eight sparks in, and it is done: the window is at its widest and the
   field can be opened more than once in a run. Nothing else on this
   page has an end, and a counter quietly reaching its top is not one —
   so it is said out loud, once, the moment the eighth lands. */
let awake = learned >= LEARNS;
let best = readNum('strohut-flash');
let total = readNum('strohut-landed');
/* The closest anybody has come to the middle of the window, ever. A
   streak says how many; this says how well, and it is the only number
   here that does not go up. */
let closest = readNum('strohut-closest');

/* Every turn goes through here — a landed flash, a press, a throw running
   down — so there is one place that knows where the wheel is. */
function turn(by) {
  adapted += by;
  turns += Math.abs(by);
  write('strohut-adapt', adapted);
  write('strohut-turns', turns);
  if (wheel) wheel.style.setProperty('--adapt', adapted);
}

/* One more spark in you. Only a landed flash counts — pressing the wheel
   or throwing it moves it without anything being learned, which is the
   difference between turning a wheel and landing something on it. */
function learn() {
  if (learned >= LEARNS) return;
  learned += 1;
  write('strohut-learned', learned);
  show();
  if (learned >= LEARNS) woken(true);
}

/* said on arrival too, quietly, so a reload does not undo it */
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

/* The score panel. The corner tally comes and goes with a run; this is
   what is left over afterwards, and it is the only part of the page that
   is about the person reading it rather than the one who wrote it. */
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

/* The sigil behind the panel burns with the run. Written as a number
   rather than a class so the drawing can be a fraction of it — a class per
   step would be eight classes to say one thing. */
const scorePanel = document.querySelector('.score');

function heat() {
  if (scorePanel) scorePanel.style.setProperty('--streak', streak);
}

/* ── 等級 ──────────────────────────────────────────────────────
   Eight sparks was the whole of it and then there was nothing left to
   be: a counter that fills up and stops. Sorcerers are graded in the
   source, so this is graded the same way.

   Every step is a thing somebody did rather than a number that went up
   on its own, and each one is a different thing — land at all, hold a
   run, hold a run long enough to open a domain, finish the wheel, and
   then be genuinely accurate rather than merely persistent. The last one
   is the only one that asks for both.

   Highest first, so the first that answers is the answer. */
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

/* A rank that only exists in one tab is a rank nobody hears about. One
   line, composed from the live figures at the moment of pressing, handed
   to the clipboard and to nobody else — the page keeps nothing and sends
   nothing, and what happens to the line after that is the visitor's
   business. */
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
      // no clipboard here — the one honest thing to say is that
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

  /* Drawn rather than set: these characters live in three different CJK
     subsets and setting them in the font would pull all three onto the
     wire for four marks.

     The numerals already exist as the chapter set, under ch- rather than
     kj- — and a use pointing at a symbol that is not there is not an
     error anywhere, it is an empty box exactly the size of the missing
     character. 四級 spent a while reading as 級 because of it. */
  const GLYPH = {
    '一': '#ch-一', '二': '#ch-二', '三': '#ch-三', '四': '#ch-四',
    '特': '#kj-特', '準': '#kj-準', '級': '#kj-級'
  };
  gradeMark.innerHTML = [...now.kanji]
    .map(ch => `<svg viewBox="0 0 1000 1000"><use href="${GLYPH[ch]}" /></svg>`).join('');
  gradeName.textContent = now.name;
  gradeWhy.textContent = now.why;
  gradeBox.dataset.grade = now.name.replace(/\s+/g, '-');
  // the bottom rank is the state of having none — nothing to take yet
  if (gradeTake) gradeTake.hidden = now.name === 'grade four';

  // going up is worth a moment; arriving already there is not
  if (first || !loud || stillPlease.matches) return;
  gradeBox.classList.remove('is-up');
  void gradeBox.offsetWidth;
  gradeBox.classList.add('is-up');
  // and it marks itself, the same mark the staff leaves on what it hits
  const box = gradeMark.getBoundingClientRect();
  if (box.width) poke(box.left + box.width / 2, box.top + box.height / 2);
  // it lands at the end of a sentence about the landing, so it starts one
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
  /* Last, once everything above has been written, so a listener reads
     the state this tell produced rather than the one before it. The log
     at the foot of the page lives in the other file, which has no way of
     knowing when a flash lands — and it names the rank, which graded()
     has only just decided. */
  dispatchEvent(new Event('strohut:score'));
}

/* How long the window is open for, right now. It is a fraction of the
   wind-up and the wind-up is drawn fresh each time, so the honest answer
   is a range rather than a number. Watching it close is the only way the
   run getting harder is visible anywhere but in the ring itself. */
function said() {
  if (!score.window) return;
  const w = windowNow();
  score.window.textContent = `${Math.round(WIND_MIN * w)}–${Math.round(WIND_MAX * w)} ms`;
}

tell(false);
if (awake) woken(false);

/* The row of tally marks. A number tells you how you have done; twelve
   marks tell you how the last two minutes went, which is the thing you
   are actually trying to change while you are playing.

   The row starts full of unstruck marks rather than empty. An empty row
   is a gap in the panel that has to be reserved anyway, and it says
   nothing; twelve faint marks say how many it remembers. */
const marks = document.getElementById('score-marks');
const MARK_KEEP = 12;
let brush = 0;

// five brushes taken in turn, so a run of misses is not one shape stamped
// out twelve times
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
  // the row is a fixed twelve, so one falls off the left as one lands on
  // the right and the panel never changes height
  if (marks.firstElementChild) marks.firstElementChild.remove();
  marks.append(slotFor(hit, false));
}

/* How much of the wind-up the window stays open for. It follows what has
   landed rather than the run in front of you: a streak that reset the
   difficulty meant the game was only ever different at the end of a good
   run and back to the start the moment it broke. */
function windowNow() {
  return Math.min(WINDOW_ROOF, WINDOW_BASE + learned * WINDOW_STEP);
}

// where it opens and where it shuts, as fractions of the wind-up
const opensAt = () => WINDOW_AT - windowNow() / 2;

const inDomain = () => performance.now() < domainUntil;

// a fresh wind-up per attempt is the whole reason the ring has to be
// watched rather than counted through
function windUp() {
  return WIND_MIN + Math.random() * (WIND_MAX - WIND_MIN);
}

/* ── what a black flash actually looks like ───────────────────────
   It is not a bolt drawn over the page. Every account of it says the
   same thing: cursed energy landing inside a millionth of a second of
   the hit, and what that does is distort the space it happens in. The
   energy flashes black — black is the whole name — and whoever lands
   one is blessed by the sparks afterwards.

   So the moment is built out of four things that arrive together and
   leave at different speeds:

     the rift    space splitting away from the point of impact, drawn
                 on in sixty milliseconds and gone in half a second
     the bolt    the black shape itself, red only at its edge
     the wave    two rings leaving the point, one black, one red
     the sparks  shards thrown outward, the ones that do the blessing

   Everything is one node with a class, animated in css and removed on
   the last animation that ends. Nothing here runs a frame in script. */

// a jagged run of points walking outward from the point of impact
function riftWalk(x, y, angle, reach) {
  const steps = 4 + Math.floor(Math.random() * 3);
  const pts = [[x, y]];
  let cx = x, cy = y, a = angle;
  for (let i = 0; i < steps; i++) {
    // the further out it gets, the more it is allowed to wander
    a += (Math.random() - .5) * (.45 + i * .3);
    const len = reach / steps * (.6 + Math.random() * .9);
    cx += Math.cos(a) * len;
    cy += Math.sin(a) * len;
    pts.push([cx, cy]);
  }
  return pts;
}

const at = p => `${Math.round(p[0])} ${Math.round(p[1])}`;

/* A crack is wide where it was struck and closes to nothing at its end.
   An even-width stroke cannot do that — it stops dead, with a round cap
   sitting in the middle of the page — so the black is a filled shape
   walked out and back along the same points, narrowing as it goes. It is
   how every other drawing on this page is built for the same reason. */
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
  // the reach is however far the far corner is, so it always leaves the screen
  const far = Math.max(Math.hypot(x, y), Math.hypot(w - x, y),
    Math.hypot(x, h - y), Math.hypot(w - x, h - y));
  const arms = 5 + Math.min(4, streak);
  const turn = Math.random() * Math.PI * 2;

  let paint = '';
  for (let i = 0; i < arms; i++) {
    // spread rather than scattered: an even fan, jittered, so nothing
    // ever comes out as two cracks lying on top of each other
    const a = turn + (i / arms) * Math.PI * 2 + (Math.random() - .5) * .7;
    const pts = riftWalk(x, y, a, far * (.45 + Math.random() * .75));
    const line = `M${pts.map(at).join('L')}`;
    /* Three drawings of one crack. On a page this dark the black is
       invisible against the paper it is on — what carries it is the
       light coming through, so the black is the width of the gap and
       the bright part is a hairline down the middle of it. The black
       still does its work wherever the crack runs over something that
       was drawn: it takes a bite out of it. */
    paint += `<path class="rf-dark" d="${riftShape(pts, 10 + Math.random() * 8)}"/>` +
             `<path class="rf-glow" d="${line}" pathLength="1" style="--i:${i}"/>` +
             `<path class="rf-lit" d="${line}" pathLength="1" style="--i:${i}"/>`;
  }

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'rift');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('aria-hidden', 'true');
  /* the whole sheet of cracks races out of the point it was struck at,
     which is one composited transform rather than a dash animation on
     every arm — and it is what makes them arrive rather than appear */
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
    /* every shard carries its own direction and reach, so the throw is
       different each time without a second element having to exist */
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
  /* several animations end at different times inside this one node, so
     the last one out takes it — not the first */
  const done = () => {
    if (!stamp.getAnimations({ subtree: true }).some(a => a.playState === 'running')) stamp.remove();
  };
  stamp.addEventListener('animationend', done);
  setTimeout(() => stamp.remove(), 1400);
}

/* the ring that shows the window. it carries its own timing as custom
   properties so css runs the animation and js never touches a frame. */
function openCharge(x, y, wind) {
  if (!strikes) return null;
  const ring = document.createElement('div');
  ring.className = 'charge';
  ring.style.left = `${x}px`;
  ring.style.top = `${y}px`;
  ring.style.setProperty('--wind', `${Math.round(wind)}ms`);
  ring.style.setProperty('--open-at', `${Math.round(wind * opensAt())}ms`);
  ring.style.setProperty('--span', `${Math.round(wind * windowNow())}ms`);

  /* Where the window will be, drawn before it opens. The ring closes
     from full size to .6 of it linearly, so a moment in the wind-up is a
     radius — and the window is a band between two of them. Painting that
     band lets somebody aim at a place instead of reacting to a colour,
     which is the difference between the second attempt and the tenth.
     The band is in the box's own percentages so it costs one gradient. */
  /* closest-side runs to half the box, and so does the circle: a ring at
     scale s has radius s of that half — s of 100%, not s of 50%. */
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

/* A miss that tells you nothing is a miss you cannot learn from, so it
   says which side of the window you were on. */
function missed(how, off, dev) {
  streak = 0;
  spent = false;
  heat();

  if (tally) {
    tally.classList.remove('is-hot');
    document.getElementById('tally-streak').textContent = '0';
  }

  /* A cancelled hold is not an attempt. It leaves no mark, and it leaves
     the last real reading alone — scrolling away mid-charge should not
     wipe the number you were trying to beat. */
  if (!how) {
    say('');
    return;
  }

  mark(false);
  // a miss is still a reading, so it counts toward the closest you have been
  keep(dev === undefined ? off : dev);
  const said = `${Math.max(1, Math.round(off))} ms ${how}`;
  tellLast(said);
  say(said);
  aloud(`Missed, ${said}.`);
}

/* The best anybody has done at this, kept whether the attempt landed or
   not — being two milliseconds out on a miss is a better piece of timing
   than being twenty out on a hit, and the number should say so. */
function keep(dev) {
  const off = Math.abs(Math.round(dev));
  if (closest && off >= closest) return;
  closest = Math.max(1, off);
  write('strohut-closest', closest);
}

// the corner tally goes away after a second and a half; this is the same
// reading, kept where it can still be read afterwards
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

/* The same thing out loud, which is a different sentence: "9 ms late" is
   a reading beside a word that says whether it landed, and read on its
   own it is only a number. Said once per release — the three readings in
   the panel all change at once and none of them is worth interrupting
   anybody for on its own.

   A rank arrives on the back of a landing rather than on its own, so it
   is added to what that landing already said instead of replacing it.
   Two announcements a frame apart and the first one is never read. */
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

  /* How far off the middle you were. Inside a domain the hit was given to
     you, so the timing behind it is not a reading anybody earned and it
     does not go in the record. */
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

  // the wheel takes the hit, turns, and keeps what it learned from it
  turn(1);
  learn();
  tell(true);
  if (sigil) sigil.classList.add('is-adapted');

  /* Landing one used to move the wheel and nothing else, which made the
     rest of the page a backdrop it happened in front of. It goes through
     everything drawn on the page instead, one after another, so a hit is
     something the whole thing feels. */
  document.querySelectorAll('.band, .flag, .brush, .score-sigil').forEach((el, i) => {
    setTimeout(() => knock(el, 'is-struck'), 60 + i * 70);
  });

  document.body.classList.remove('is-flashing');
  void document.body.offsetWidth;
  document.body.classList.add('is-flashing');

  // five in a row and the field is yours for a while
  if (streak >= DOMAIN_AT && (!spent || awake)) cast();
}

/* 領域展開. A flash over the page was the whole of it before, which is a
   thing that happens to you rather than a thing you did — and it left the
   one technique on the page that everybody knows the name of doing less
   than the wheel does.

   It is a state now. For seven seconds the space is yours and a release
   lands whatever the timing was, which is what a domain is for. The wheel
   learns from every one of those, so the seven seconds are bought with
   however much harder the rest of it gets afterwards. That trade is the
   only reason to think about whether to spend them. */
function cast() {
  spent = true;
  domainUntil = performance.now() + DOMAIN_FOR;

  // the drawing stands for exactly as long as the rule does, and the
  // length is written down once
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

  /* The door closes the way it opened. Dropping the class snaps the
     whole palette back in one frame, which reads as the power being cut
     rather than the technique ending — so the veil pulses once more and
     the colours turn back underneath it, at its peak, where the change
     cannot be seen happening. */
  if (stillPlease.matches || !document.body.classList.contains('is-domain')) {
    document.body.classList.remove('is-domain');
    return;
  }
  document.body.classList.add('is-sealing');
  setTimeout(() => document.body.classList.remove('is-domain'), 200);
  setTimeout(() => document.body.classList.remove('is-sealing'), 620);
}

/* A domain nobody can see the end of is a domain nobody spends. */
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
// the 404 has no field, so there is nothing to play there
const arena = document.getElementById('flash-arena');

if (!stillPlease.matches) {
  /* Winding one up, wherever the press came from. It was written into the
     pointer handler and could only ever be reached by one, which left the
     one thing on this page you can get better at unreachable without a
     mouse. */
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
      // holding forever is not a pause, it is a miss
      timer: setTimeout(() => {
        if (!charge) return;
        // shutCharge clears the charge, so anything still needed off it
        // has to come off it first
        const { x: hx, y: hy, wind: hw } = charge;
        strikeAt(hx, hy, 'hit');
        shutCharge(false);
        missed('late', HOLD_LIMIT - hw * (WINDOW_AT + windowNow() / 2));
      }, HOLD_LIMIT)
    };
  };

  /* Only the field takes a hold. This used to be on the window, which
     put the game underneath every paragraph, link and drawing on the
     page — and made a stray press on a phone into a broken run. */
  if (arena) arena.addEventListener('pointerdown', event => {
    if (event.button !== 0 || charge) return;
    hold(event.clientX, event.clientY);
    /* the release is what is being timed, and a hand that has drifted
       off the field by then has still let go — so the field keeps the
       pointer until it does */
    try { arena.setPointerCapture(event.pointerId); } catch { /* fine without it */ }
  });

  const release = event => {
    if (!charge) return;

    const held = performance.now() - charge.at;
    const span = charge.wind * windowNow();
    const open = charge.wind * opensAt();
    const shut = open + span;

    /* A domain is a guaranteed hit inside the space it encloses. That is
       what the technique is for, and it is the only reason anybody pays
       what it costs to open one — so inside it, a release lands whatever
       the timing was. The wheel still learns from every one of them, which
       is the price. */
    const sure = inDomain();
    const inside = sure || (held >= open && held <= shut);

    /* How far off the middle of the window you actually were. The old
       reading was the distance outside it, which is nothing at all when
       you are inside — so a landed flash said "landed" and told you
       nothing about how well. This one is the same number whether you
       made it or not, and it is the number worth chasing. */
    const dev = Math.round(held - (open + span / 2));

    // the pointer may have travelled since it went down
    const x = event && event.clientX != null ? event.clientX : charge.x;
    const y = event && event.clientY != null ? event.clientY : charge.y;

    strikeAt(x, y, inside ? 'flash' : 'hit');
    shutCharge(inside);

    if (inside) landed(dev, sure);
    else missed(held < open ? 'early' : 'late', Math.abs(dev), dev);
  };

  addEventListener('pointerup', release, { passive: true });

  /* The same attempt without a pointer. The field is a button, so
     holding a key on it while it has the focus is the same press —
     space and enter both, which is what every button on the web does.
     Space is left alone everywhere else on the page, because space is
     how a keyboard scrolls.

     A held key repeats, and every repeat after the first is the same
     press still going on rather than a new one. */
  let onKey = false;
  if (arena) {
    const isHold = key => key === ' ' || key === 'Spacebar' || key === 'Enter';

    arena.addEventListener('keydown', event => {
      if (!isHold(event.key)) return;
      // a button scrolls the page on space and fires on enter; neither is
      // this, and both would happen underneath it
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

    // a key let go somewhere the page cannot hear it leaves the ring hanging
    arena.addEventListener('blur', () => { onKey = false; });

    /* Enter fires a button's click on the way down and space on the way
       up, and this is neither — without swallowing it, a click runs on
       top of every held key. */
    arena.addEventListener('click', event => event.preventDefault());
  }
  addEventListener('pointercancel', () => {
    if (!charge) return;
    shutCharge(false);
    missed('');
  }, { passive: true });

  // a drag that leaves the window would otherwise leave the ring hanging
  addEventListener('blur', () => {
    if (!charge) return;
    shutCharge(false);
    missed('');
  });

  document.body.addEventListener('animationend', event => {
    if (event.animationName === 'room') document.body.classList.remove('is-flashing');
    /* the timer owns the exit; this is the failsafe for a throttled tab
       where the timeout never came back, and it goes through the same
       door so the closing looks the same */
    if (event.animationName === 'domain' && document.body.classList.contains('is-domain')) shut();
  });
}


/* ─────────────────── the one control both pages share ──────────── */

/* A contact mark: a ring snapping open and two short tears. Paper-white —
   red belongs to the stroke and the flash and nothing else. The staff
   leaves one wherever the pole crossed something, and the rank leaves one
   on itself when it goes up. */
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
  /* A press moves the wheel one tooth. Taking hold of it and throwing it
     spins it down through however many teeth the throw was worth, and it
     clicks into the nearest one when it stops — a ratchet, not a dial.

     --drag carries the free rotation while it is moving; on settling it is
     folded into --adapt so there is only ever one source of truth for
     where the wheel is pointing. */
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
    // below a quarter of a degree a frame it is not moving, it is drifting
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
    // atan2 wraps at the half turn; without unwrapping, crossing it reads
    // as a 360 degree flick in the wrong direction
    let by = now - grip.angle;
    if (by > 180) by -= 360;
    if (by < -180) by += 360;

    const gap = performance.now() - grip.at;
    grip.angle = now;
    grip.at = performance.now();
    grip.moved += Math.abs(by);

    drag += by;
    // per-frame speed, so the throw carries whatever the hand was doing
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

    // it was a press, not a throw: one tooth, the way it always was
    drag = 0;
    paint();
    wheel.classList.remove('is-spinning');
    step(1);
  };

  wheelHit.addEventListener('pointerup', letGo);

  /* A cancelled gesture is the browser taking the pointer away — a system
     swipe, a context menu, a call coming in. Nobody pressed anything, so
     the wheel goes back where it was rather than clicking on a tooth. The
     same applies to the window losing focus mid-grip, which otherwise
     leaves it paused and half-turned for good. */
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

  // the keyboard has no pointer to release, so it comes through as a click
  // with no click count behind it
  wheelHit.addEventListener('click', event => {
    if (event.detail === 0) step(1);
  });

  /* And the staff goes through it. The pole is drawn across the page and
     the wheel is the largest thing on it, so a swing that reaches the
     header passes through the wheel — and a wheel that a bar has just
     gone through and did not move is a picture of a wheel.

     An event rather than a call: the staff has no way to reach in here,
     and the wheel has no business knowing what a staff is. */
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


/* ───────────────────── what was asked for ──────────────────────

   Only the 404 has this. GitHub Pages serves that page for any address
   it cannot find and leaves the address in the bar, so the page knows
   the one thing the front page does not: which url somebody actually
   typed or followed. Saying it back is the difference between "that page
   does not exist" and being able to see your own typo.

   Written as text, never as markup — the address is whatever a stranger
   put in the bar, and the only safe thing to do with that is print it.
   Long ones are cut: an address can be a thousand characters, and this
   is one line under a heading. */
const lostPath = document.getElementById('lost-path');
const lostGuess = document.getElementById('lost-guess');

/* A function rather than a block so the suite can run it again against
   an address it has just put in the bar — the served page and the tested
   page stay the same code. */
function lostSaid() {
  if (!lostPath) return;
  lostPath.hidden = true;
  lostPath.textContent = '';
  if (lostGuess) { lostGuess.hidden = true; lostGuess.textContent = ''; }

  /* Decoding is what turns %C3%BC back into ü, and it throws outright on
     a half-written escape — /%E0%A4 is a url anybody can type, and an
     exception here would take the whole file down with it. */
  const raw = location.pathname + location.search;
  let path = raw;
  try { path = decodeURI(raw); } catch { /* show it as it came */ }
  path = path.replace(/\s+/g, ' ').trim();

  // opened directly rather than landed on: there is nothing to say
  if (!path || path === '/' || /^\/404(\.html)?$/.test(path)) return;
  const shown = path.length > 64 ? `${path.slice(0, 63)}…` : path;
  lostPath.textContent = `nothing at ${shown}`;
  lostPath.hidden = false;

  /* ── and, when the typo sits an edit or two from a real place, where
     it might have meant. The address belongs to a stranger, so it never
     reaches the page as markup and it never becomes a link — it only
     gets to pick from this list, which is the page's own. A wrong guess
     costs a question mark; a right one saves retyping the whole thing. */
  if (!lostGuess) return;
  const PLACES = [
    [['likes', 'like', 'favourites', 'favorites', 'favourite', 'favorite'], 'favourites', '/#likes'],
    [['score', 'flash', 'blackflash', 'black'], 'the black flash', '/#score'],
    [['traced', 'tracing', 'wheel', 'staff', 'yeoui'], 'traced from', '/#traced'],
    [['rules', 'rule'], 'the rules', '/#rules'],
    [['making', 'drawn', 'sakuga', 'colophon'], 'how it’s drawn', '/#making'],
    [['music', 'spotify', 'ears', 'track', 'song'], 'in my ears', '/#music'],
    [['now', 'status', 'presence', 'discord'], 'right now', '/#now']
  ];

  /* One row of the usual table is enough here: none of the words being
     compared clears ten letters, and the guess is only allowed to be two
     edits out anyway — anything further is declared unreachable before
     any counting is done. */
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

  // the words of the path, extension dropped, nothing under three letters
  const tokens = path.toLowerCase().replace(/\.[a-z0-9]+$/, '')
    .split(/[^a-z0-9]+/).filter(t => t.length >= 3 && t.length <= 24);

  let best = null;
  for (const t of tokens) {
    for (const [keys, label, href] of PLACES) {
      for (const k of keys) {
        const d = t === k ? 0 : edits(t, k);
        // a short word gets one edit of grace, a longer one two
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


/* ─────────────────────────── 여의봉 ────────────────────────────── */

/* Yeoui: a stone staff with a gold band at each end that grows to
   whatever length is asked of it. Which is the interaction — take hold
   of the grip and pull, and it goes wherever the pointer goes, however
   far. Let go and it comes back.

   Only the grip takes a pointer. The pole is drawn across the page and
   would otherwise be a wall between the reader and everything under it,
   and the same goes for the barrier the black flash listens on: the
   grip is a button, which that game already treats as off limits.

   Coming back is a spring rather than a transition, for two reasons.
   Custom properties cannot be interpolated without registering them,
   which is a newer thing than this page leans on anywhere else — and a
   spring overshoots, which is what a staff of that weight snapping back
   into a hand actually does. */
const staff = document.querySelector('.staff');
const staffGrip = document.getElementById('staff-hit');
const staffRig = document.querySelector('.staff-rig');

if (staff && staffGrip && staffRig) {
  const REST_LEN = staffRig.offsetWidth || 240;
  const REST_TURN = parseFloat(getComputedStyle(staffRig).rotate) || 0;
  const MIN_LEN = REST_LEN * .82;
  // far enough to cross whatever screen it is on, corner to corner
  const reach = () => Math.hypot(innerWidth, innerHeight) * 1.02;

  let len = REST_LEN, turn = REST_TURN;
  let vLen = 0, vTurn = 0;             // where the spring is, mid-flight
  let held = false, frame = 0;

  const paint = () => {
    staff.style.setProperty('--len', `${len.toFixed(1)}px`);
    staff.style.setProperty('--turn', `${turn.toFixed(2)}deg`);
    const far = reach();
    staff.style.setProperty('--pull',
      Math.max(0, Math.min(1, (len - REST_LEN) / Math.max(1, far - REST_LEN) * 2.6)).toFixed(3));
  };

  /* the origin the pole turns about, in page coordinates. Read off the
     rig's own transform-origin rather than guessed at, so moving it in
     the stylesheet cannot put the maths out of step with the drawing. */
  const pivot = () => {
    const box = staff.getBoundingClientRect();
    const [ox, oy] = getComputedStyle(staffRig).transformOrigin.split(' ').map(parseFloat);
    return [box.left + staffRig.offsetLeft + ox, box.top + staffRig.offsetTop + oy];
  };

  const reachFor = (x, y) => {
    const [px, py] = pivot();
    const dx = x - px, dy = y - py;
    len = Math.max(MIN_LEN, Math.min(reach(), Math.hypot(dx, dy)));
    /* it never comes back over its own shoulder. Straight up is as far
       round as it goes, and a little below level the other way — past
       that it lies across the name, which is not somewhere a staff
       should be able to be parked. */
    turn = Math.max(-96, Math.min(38, Math.atan2(dy, dx) * 180 / Math.PI));
    paint();
  };

  /* Back to rest under its own weight: stiff, and damped just short of
     critical, so it overshoots once. */
  const settle = () => {
    frame = 0;
    /* Against the clock rather than counted in frames. A spring stepped
       once per frame takes twice as long on a machine drawing thirty a
       second as on one drawing sixty, which is exactly backwards — the
       slower machine is the one that must not be left holding a staff
       halfway home. */
    let last = performance.now();
    const step = now => {
      /* Caught up in whole steps rather than by scaling one of them.
         Scaling the step is what an explicit spring cannot survive: at
         three frames' worth in one go it puts nearly the whole distance
         in at once and then rings for a second and a half. */
      let owed = Math.min(12, Math.max(1, Math.round((now - last) / 16.667)));
      last = now;
      while (owed--) {
        vLen = (vLen + (REST_LEN - len) * .24) * .55;
        vTurn = (vTurn + (REST_TURN - turn) * .24) * .55;
        // it cannot come back shorter than its own two ends
        len = Math.max(MIN_LEN, len + vLen);
        turn += vTurn;
      }
      paint();
      if (Math.abs(REST_LEN - len) > 1 || Math.abs(vLen) > 1 ||
          Math.abs(REST_TURN - turn) > .15 || Math.abs(vTurn) > .15) {
        frame = requestAnimationFrame(step);
      } else {
        len = REST_LEN; turn = REST_TURN; vLen = vTurn = 0;
        paint();
      }
    };
    frame = requestAnimationFrame(step);
  };

  /* ── what the swing leaves behind ────────────────────────────────
     The one rule worth taking from how these fights are drawn: the
     moment of contact is not the panel. What is drawn is the wind-up
     and the aftermath — sometimes the aftermath alone, with the blow
     itself never shown at all.

     The wind-up is the pole going out, which is under your hand. This
     is the other half: the air it tore on the way back, three ghosts
     of it along the arc it swept, and the mark left where the far end
     had been. None of it is on the pole — it is all in the strike
     layer, which is fixed, takes no pointer and is already there. */
  const swung = (px, py, atLen, atTurn, power) => {
    if (!strikes || stillPlease.matches || power < .18) return;
    const mark = document.createElement('div');
    mark.className = 'swing';
    mark.style.left = `${px}px`;
    mark.style.top = `${py}px`;
    mark.style.setProperty('--turn', `${atTurn.toFixed(2)}deg`);
    mark.style.setProperty('--len', `${Math.round(atLen)}px`);
    mark.style.setProperty('--power', power.toFixed(3));

    let bits = '';
    // the ghosts, each one a little further round the arc it came from
    for (let i = 0; i < 3; i++) bits += `<span class="swing-ghost" style="--i:${i}"></span>`;
    // and the air at the far end, torn along the line it was travelling
    for (let i = 0; i < 5; i++) {
      bits += `<span class="swing-air" style="--i:${i};--off:${(i - 2) * 9}deg;` +
        `--far:${(.5 + Math.random() * .7).toFixed(2)}"></span>`;
    }
    bits += '<span class="swing-hit"></span>';
    mark.innerHTML = bits;

    strikes.append(mark);
    setTimeout(() => mark.remove(), 900);
  };

  /* What the far end of it went through.

     A staff that grows to the width of the page and leaves nothing
     behind is a spring with a drawing on it. Everything else on this
     page answers to being hit — the wheel takes a tooth, the cloud gets
     shoved, the flag swings — so the tip does what a hand does, and the
     things it goes through answer the same way.

     Measured along the pole rather than at the point: it is a bar, not a
     dart, and the whole length of it is what passes through. Twelve
     steps is close enough at any length the page allows and costs one
     hit test each. */
  const HITTABLE = '.band, .flag, .wheel, .brush';
  const swept = (px, py, atLen, atTurn, power) => {
    if (power < .22) return;

    const rad = atTurn * Math.PI / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);

    /* Against the boxes rather than through elementFromPoint. Every one
       of these drawings takes no pointer — that is the whole reason the
       pole itself is not a wall between the reader and the page — and a
       hit test that asks what is under a point never sees any of them.
       Their boxes are right there on the same screen. */
    const found = [];
    for (const el of document.querySelectorAll(HITTABLE)) {
      const box = el.getBoundingClientRect();
      if (!box.width || !box.height) continue;
      if (box.bottom < 0 || box.top > innerHeight) continue;

      // sampled along the pole: it is a bar, not a dart, and the whole
      // length of it is what passes through
      for (let i = 3; i <= 14; i++) {
        const at = (atLen * i) / 14;
        const x = px + cos * at, y = py + sin * at;
        if (x < box.left || x > box.right || y < box.top || y > box.bottom) continue;
        found.push([at, el, x, y]);
        break;
      }
    }

    /* In the order the pole reached them: a bar going through three
       things is three sounds, not one. And each contact leaves a mark at
       the point of it — the thing shaking on its own said something was
       hit, and nothing said where. */
    found.sort((a, b) => a[0] - b[0]);
    found.forEach(([, el, x, y], n) => setTimeout(() => {
      knock(el.matches('.band, .flag') ? el.querySelector('svg') || el : el, 'is-struck');
      poke(x, y);
      if (el.classList.contains('wheel')) dispatchEvent(new Event('strohut:struck'));
    }, n * 70));
  };

  /* When the last real pull ended. A drag that ends on the grip is
     followed by a click, and the click path is the press — so one gesture
     was going out twice: once where it was pulled to, and again straight
     across the header a moment later. */
  let pulled = 0;

  const letGo = event => {
    if (!held) return;
    held = false;
    pulled = performance.now();
    staff.classList.remove('is-out');
    /* read before the spring is let go, because by the time it has run
       there is nothing left to say where the far end had been */
    const [px, py] = pivot();
    const power = Math.min(1, (len - REST_LEN) / Math.max(1, reach() - REST_LEN) * 2.2);
    swung(px, py, len, turn, power);
    swept(px, py, len, turn, power);
    if (event && event.pointerId != null && staffGrip.hasPointerCapture(event.pointerId)) {
      staffGrip.releasePointerCapture(event.pointerId);
    }
    if (stillPlease.matches) { len = REST_LEN; turn = REST_TURN; paint(); return; }
    settle();
  };

  staffGrip.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    held = true;
    cancelAnimationFrame(frame);
    vLen = vTurn = 0;
    staff.classList.add('is-out');
    staffGrip.setPointerCapture(event.pointerId);
    reachFor(event.clientX, event.clientY);
    event.preventDefault();
  });

  staffGrip.addEventListener('pointermove', event => {
    if (!held) return;
    reachFor(event.clientX, event.clientY);
  });

  staffGrip.addEventListener('pointerup', letGo);
  staffGrip.addEventListener('pointercancel', letGo);
  addEventListener('blur', letGo);

  /* Keyboard and anything else that reaches it as a press rather than a
     drag: it goes out on its own and comes back, so the drawing is not
     something only a pointer can see. */
  staffGrip.addEventListener('click', () => {
    if (held || performance.now() - pulled < 400) return;
    cancelAnimationFrame(frame);
    if (stillPlease.matches) {
      /* A drag under reduced motion still sweeps — its knocks are state
         changes and the wheel still takes its tooth. A press gets the
         same sweep with the travel left out, rather than nothing. */
      const [px, py] = pivot();
      swept(px, py, Math.min(reach(), innerWidth * .78), REST_TURN - 9, .8);
      return;
    }
    const far = Math.min(reach(), innerWidth * .78);
    let t = 0;
    vLen = vTurn = 0;
    const out = () => {
      t += 1 / 14;
      const e = t < 1 ? 1 - Math.pow(1 - t, 3) : 1;
      len = REST_LEN + (far - REST_LEN) * e;
      turn = REST_TURN - 9 * e;
      paint();
      if (t < 1) return void (frame = requestAnimationFrame(out));
      // the same aftermath a released drag leaves, so a press and a pull
      // are the same move rather than two different ones
      setTimeout(() => {
        const [px, py] = pivot();
        const power = Math.min(1, (len - REST_LEN) / Math.max(1, reach() - REST_LEN) * 2.2);
        swung(px, py, len, turn, power);
        swept(px, py, len, turn, power);
        settle();
      }, 220);
    };
    frame = requestAnimationFrame(out);
  });
}
