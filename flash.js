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

function tell(bump) {
  post(score.best, best, bump);
  post(score.total, total, bump);
  post(score.adapt, `${learned} of ${LEARNS}`, bump);
  post(score.close, closest ? `${closest} ms` : '—', bump);
  heat();
  said();
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

// anything you can actually operate is off limits, or this fires on top
// of every link and button press
const OFF_LIMITS = 'a, button, input, iframe, .tally';

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
  document.body.classList.remove('is-domain');
  if (domainLeft) domainLeft.textContent = '';
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

if (!stillPlease.matches) {
  addEventListener('pointerdown', event => {
    if (event.button !== 0 || charge) return;
    // not every pointerdown lands on an element — one dispatched at the
    // window has the window as its target, and asking that what it sits
    // inside of throws before anything else on the page gets to run
    if (event.target?.closest?.(OFF_LIMITS)) return;

    const at = performance.now();
    const wind = windUp();
    const ring = openCharge(event.clientX, event.clientY, wind);
    document.body.classList.add('is-charging');

    charge = {
      ring,
      at,
      wind,
      x: event.clientX,
      y: event.clientY,
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
  }, { passive: true });

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
    if (event.animationName === 'domain') document.body.classList.remove('is-domain');
  });
}


/* ─────────────────── the one control both pages share ──────────── */

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
}


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

  const letGo = event => {
    if (!held) return;
    held = false;
    staff.classList.remove('is-out');
    /* read before the spring is let go, because by the time it has run
       there is nothing left to say where the far end had been */
    const [px, py] = pivot();
    swung(px, py, len, turn, Math.min(1, (len - REST_LEN) / Math.max(1, reach() - REST_LEN) * 2.2));
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
    if (held) return;
    cancelAnimationFrame(frame);
    if (stillPlease.matches) return;
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
        swung(px, py, len, turn, Math.min(1, (len - REST_LEN) / Math.max(1, reach() - REST_LEN) * 2.2));
        settle();
      }, 220);
    };
    frame = requestAnimationFrame(out);
  });
}
