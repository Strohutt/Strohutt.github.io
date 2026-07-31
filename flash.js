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
  const CUT = 1660;        // the white is at its peak; take the drawing away
  const DONE = 2350;       // and the white is finished
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
   the ring is the only thing that tells you where you are.

   And landing one used to widen the next window, which meant a run got
   easier the longer it went and topped out at trivial. It narrows now.
   A run has somewhere to go and somewhere to end. */

const WIND_MIN = 520;       // ms for the ring to close — drawn per attempt,
const WIND_MAX = 820;       // so there is nothing to memorise
const WINDOW_AT = 0.80;     // where in the wind-up the window opens
const WINDOW_BASE = 0.15;   // how much of the wind-up it stays open
const WINDOW_STEP = 0.014;  // taken off it per landed flash
const WINDOW_FLOOR = 0.06;  // and it never gets tighter than this
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
  last: document.getElementById('score-last'),
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
  post(score.adapt, turns, bump);
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
  return Math.max(WINDOW_FLOOR, WINDOW_BASE - streak * WINDOW_STEP);
}

// a fresh wind-up per attempt is the whole reason the ring has to be
// watched rather than counted through
function windUp() {
  return WIND_MIN + Math.random() * (WIND_MAX - WIND_MIN);
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
function openCharge(x, y, wind) {
  if (!strikes) return null;
  const ring = document.createElement('div');
  ring.className = 'charge';
  ring.style.left = `${x}px`;
  ring.style.top = `${y}px`;
  ring.style.setProperty('--wind', `${Math.round(wind)}ms`);
  ring.style.setProperty('--open-at', `${Math.round(wind * WINDOW_AT)}ms`);
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
function missed(how, off) {
  streak = 0;
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
        missed('late', HOLD_LIMIT - hw * (WINDOW_AT + windowNow()));
      }, HOLD_LIMIT)
    };
  }, { passive: true });

  const release = event => {
    if (!charge) return;

    const held = performance.now() - charge.at;
    const open = charge.wind * WINDOW_AT;
    const shut = charge.wind * (WINDOW_AT + windowNow());
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
