/* ════════════════════════════════════════════════════════════════
   黒閃 — shared by the front page and the 404, because both are worth
   hitting. Everything here guards on its element being present, so a
   page that carries only some of the markup still works.
   ════════════════════════════════════════════════════════════════ */

const stillPlease = window.matchMedia('(prefers-reduced-motion: reduce)');

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
if (tally) document.getElementById('tally-best').textContent = best;

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

  if (tally) {
    tally.hidden = false;
    tally.classList.toggle('is-hot', streak > 1);
    document.getElementById('tally-streak').textContent = streak;
    document.getElementById('tally-best').textContent = best;
  }

  // the wheel takes the hit and turns
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
      if (tally) {
        tally.classList.remove('is-hot');
        document.getElementById('tally-streak').textContent = '0';
      }
    }
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
if (wheelHit) {
  wheelHit.addEventListener('click', () => {
    adapted += 1;
    wheel.style.setProperty('--adapt', adapted);
    knock(wheelHit, 'is-struck');
  });
}

