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

/* the wheel keeps what it has already adapted to — that is the whole
   point of the thing */
function readAdapt() {
  try {
    return Math.max(0, parseInt(localStorage.getItem('strohut-adapt'), 10) || 0);
  } catch {
    return 0;
  }
}

let adapted = readAdapt();

function remember() {
  try {
    localStorage.setItem('strohut-adapt', String(adapted));
  } catch {
    /* it just starts over next time */
  }
}

function readBest() {
  try {
    return Math.max(0, parseInt(localStorage.getItem('strohut-flash'), 10) || 0);
  } catch {
    return 0;
  }
}

let best = readBest();
if (tally) document.getElementById('tally-best').textContent = best;
if (wheel && adapted) wheel.style.setProperty('--adapt', adapted);

// anything you can actually operate is off limits, or this fires on top
// of every link and button press
const OFF_LIMITS = 'a, button, input, iframe, .tally';

function windowNow() {
  return Math.min(WINDOW_CAP, WINDOW_BASE + streak * WINDOW_STEP);
}

function strikeAt(x, y, kind) {
  if (!strikes) return;
  const mark = document.createElement('div');
  mark.className = `strike strike-${kind}`;
  mark.style.left = `${x}px`;
  mark.style.top = `${y}px`;

  if (kind === 'flash') {
    const which = 1 + Math.floor(Math.random() * 2);
    mark.innerHTML = `<svg viewBox="0 0 400 400"><use href="#flash-${which}" /></svg>`;
  }

  strikes.append(mark);
  mark.addEventListener('animationend', () => mark.remove(), { once: true });
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
function missed(how) {
  streak = 0;
  if (!tally) return;
  tally.classList.remove('is-hot');
  document.getElementById('tally-streak').textContent = '0';
  say(how);
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
  adapted += 1;

  if (streak > best) {
    best = streak;
    try {
      localStorage.setItem('strohut-flash', String(best));
    } catch {
      /* it just won't survive a reload */
    }
  }

  say('landed');

  if (tally) {
    tally.hidden = false;
    tally.classList.toggle('is-hot', streak > 1);
    document.getElementById('tally-streak').textContent = streak;
    document.getElementById('tally-best').textContent = best;
  }

  // the wheel takes the hit and turns
  remember();
  if (wheel) wheel.style.setProperty('--adapt', adapted);
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
        missed('too late');
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

    if (inside) landed();
    else missed(held < open ? 'too early' : 'too late');
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
  wheelHit.addEventListener('click', () => {
    adapted += 1;
    remember();
    wheel.style.setProperty('--adapt', adapted);
    knock(wheelHit, 'is-struck');
  });
}
