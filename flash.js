/* ════════════════════════════════════════════════════════════════
   黒閃 — shared by the front page and the 404, because both are worth
   hitting. Everything guards on its element being present, so a page
   carrying only some of the markup still works.
   ════════════════════════════════════════════════════════════════ */

const stillPlease = window.matchMedia('(prefers-reduced-motion: reduce)');

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

   Landing one widens the next window a little, which is the one thing
   the dice version had right: people who land one tend to land another. */

const WIND_UP = 620;        // ms for the ring to close
const WINDOW_AT = 0.80;     // where in the wind-up the window opens
const WINDOW_BASE = 0.13;   // how much of the wind-up it stays open
const WINDOW_STEP = 0.022;  // widened per landed flash
const WINDOW_CAP = 0.26;
const HOLD_LIMIT = 2200;    // holding past this is a miss, not a pause
const DOMAIN_AT = 5;

let streak = 0;
let charge = null;

/* Storage is not always there to be written to — private windows and a
   full quota both throw — and none of this is worth losing the page over,
   so every read falls back to zero and every write is allowed to fail. */
function readNum(key) {
  try {
    return Math.max(0, parseInt(localStorage.getItem(key), 10) || 0);
  } catch {
    return 0;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* it just starts over next time */
  }
}

/* the wheel keeps what it has already adapted to — that is the whole
   point of the thing */
let adapted = readNum('strohut-adapt');   // where it points, either way
let turns = readNum('strohut-turns');     // how far it has been moved, ever
let best = readNum('strohut-flash');
let total = readNum('strohut-landed');

/* Every turn goes through here — a landed flash, a press, a throw running
   down — so there is one place that knows where the wheel is. */
function turn(by) {
  adapted += by;
  turns += Math.abs(by);
  write('strohut-adapt', adapted);
  write('strohut-turns', turns);
  if (wheel) wheel.style.setProperty('--adapt', adapted);
}

if (tally) document.getElementById('tally-best').textContent = best;
if (wheel && adapted) wheel.style.setProperty('--adapt', adapted);

/* The score panel. The corner tally comes and goes with a run; this is
   what is left over afterwards, and it is the only part of the page that
   is about the person reading it rather than the one who wrote it. */
const score = {
  best: document.getElementById('score-best'),
  total: document.getElementById('score-total'),
  adapt: document.getElementById('score-adapt'),
  last: document.getElementById('score-last')
};

function post(cell, value, bump) {
  if (!cell || cell.textContent === String(value)) return;
  cell.textContent = value;
  if (!bump) return;
  cell.classList.remove('is-up');
  void cell.offsetWidth;
  cell.classList.add('is-up');
}

function tell(bump) {
  post(score.best, best, bump);
  post(score.total, total, bump);
  post(score.adapt, turns, bump);
}

tell(false);

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

function windowNow() {
  return Math.min(WINDOW_CAP, WINDOW_BASE + streak * WINDOW_STEP);
}

function strikeAt(x, y, kind) {
  if (!strikes) return;
  const stamp = document.createElement('div');
  stamp.className = `strike strike-${kind}`;
  stamp.style.left = `${x}px`;
  stamp.style.top = `${y}px`;

  if (kind === 'flash') {
    const which = 1 + Math.floor(Math.random() * 2);
    stamp.innerHTML = `<svg viewBox="0 0 400 400"><use href="#flash-${which}" /></svg>`;
  }

  strikes.append(stamp);
  stamp.addEventListener('animationend', () => stamp.remove(), { once: true });
}

/* the ring that shows the window. it carries its own timing as custom
   properties so css runs the animation and js never touches a frame. */
function openCharge(x, y) {
  if (!strikes) return null;
  const ring = document.createElement('div');
  ring.className = 'charge';
  ring.style.left = `${x}px`;
  ring.style.top = `${y}px`;
  ring.style.setProperty('--wind', `${WIND_UP}ms`);
  ring.style.setProperty('--open-at', `${Math.round(WIND_UP * WINDOW_AT)}ms`);
  ring.style.setProperty('--span', `${Math.round(WIND_UP * windowNow())}ms`);
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
function missed(how, off) {
  streak = 0;

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
  const said = `${Math.max(1, Math.round(off))} ms ${how}`;
  tellLast(said);
  say(said);
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

function landed() {
  streak += 1;
  total += 1;
  write('strohut-landed', total);

  if (streak > best) {
    best = streak;
    write('strohut-flash', best);
  }

  say('landed');
  tellLast('landed');
  mark(true);

  if (tally) {
    tally.hidden = false;
    tally.classList.toggle('is-hot', streak > 1);
    document.getElementById('tally-streak').textContent = streak;
    document.getElementById('tally-best').textContent = best;
  }

  // the wheel takes the hit and turns
  turn(1);
  tell(true);
  if (sigil) sigil.classList.add('is-adapted');

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
  addEventListener('pointerdown', event => {
    if (event.button !== 0 || charge) return;
    if (event.target.closest(OFF_LIMITS)) return;

    const at = performance.now();
    const ring = openCharge(event.clientX, event.clientY);
    document.body.classList.add('is-charging');

    charge = {
      ring,
      at,
      x: event.clientX,
      y: event.clientY,
      // holding forever is not a pause, it is a miss
      timer: setTimeout(() => {
        if (!charge) return;
        strikeAt(charge.x, charge.y, 'hit');
        shutCharge(false);
        missed('late', HOLD_LIMIT - WIND_UP * (WINDOW_AT + windowNow()));
      }, HOLD_LIMIT)
    };
  }, { passive: true });

  const release = event => {
    if (!charge) return;

    const held = performance.now() - charge.at;
    const open = WIND_UP * WINDOW_AT;
    const shut = WIND_UP * (WINDOW_AT + windowNow());
    const inside = held >= open && held <= shut;

    // the pointer may have travelled since it went down
    const x = event && event.clientX != null ? event.clientX : charge.x;
    const y = event && event.clientY != null ? event.clientY : charge.y;

    strikeAt(x, y, inside ? 'flash' : 'hit');
    shutCharge(inside);

    if (inside) {
      landed();
    } else {
      // "too early" tells you nothing you can act on. The number of
      // milliseconds does — you find out whether you were nearly there or
      // nowhere near, and that is the whole difference between a game you
      // can get better at and one you cannot.
      const off = held < open ? open - held : held - shut;
      missed(held < open ? 'early' : 'late', off);
    }
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
  wheelHit.addEventListener('pointercancel', letGo);

  // the keyboard has no pointer to release, so it comes through as a click
  // with no click count behind it
  wheelHit.addEventListener('click', event => {
    if (event.detail === 0) step(1);
  });
}
