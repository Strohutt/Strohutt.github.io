/* ════════════════════════════════════════════════════════════════
   strohut
   Loaded after flash.js, which carries 黒閃 and the wheel.

   1. Sections arriving, and the layers that lean and drift
   2. What the pointer stirs up
   3. Things you can hit
   4. The clock, and what he likes
   5. Discord presence, via Lanyard
   ════════════════════════════════════════════════════════════════ */

const DISCORD_ID = '402858450926829568';
/* stillPlease, strikes and the wheel come from flash.js */

/* ───────────────────────── Arriving ────────────────────────────── */

/* Nothing arrives while the barrier is still over it. The regions in view
   on a first visit used to assemble themselves behind 無量空処 and be
   sitting there finished when it lifted, which threw away the one moment
   on the page where everything is about to happen.

   flash.js says when it is gone. If it was never up — a second visit, a
   machine asked to hold still, no javascript in the curtain at all — then
   nothing is being waited for and this runs now. */
const barred = document.documentElement.classList.contains('is-cast');
const waiting = [];

function whenOpen(fn) {
  if (!barred) fn();
  else waiting.push(fn);
}

if (barred) {
  addEventListener('strohut:open', () => {
    while (waiting.length) waiting.shift()();
  }, { once: true });
  // the barrier's own failsafe is a timer; this is the failsafe for that
  setTimeout(() => { while (waiting.length) waiting.shift()(); }, 4000);
}

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

  whenOpen(() => {
    sections.forEach(s => watcher.observe(s));
    /* The first one arrives whatever the window is. A region is at
       nothing until it has been seen, and the observer is asked for the
       lower twelve percent of the screen — so on a short window the top
       of the page sits below that line and the first region stays blank
       until somebody scrolls a pixel to prove they are there. Everything
       below it can wait to be reached; the first one cannot. */
    if (sections[0]) {
      sections[0].classList.add('is-in');
      watcher.unobserve(sections[0]);
    }
  });
}



/* ───────────────────────── Lean and drift ──────────────────────── */

/* A page that only moves when it is clicked reads as a screenshot. So
   everything here is on all the time and answers to something: the layers
   behind the header lean away from the pointer, the word leans toward it,
   the cards turn under it, the drawings lag behind the scroll at
   different rates, the speed lines stretch with how hard the page is
   being thrown about, and every region knows how centred it is.

   All of it is written to custom properties and left to css to ease.
   Setting transforms per frame fights the transitions, and a reading that
   is only a number can be used by three rules at once without any of them
   knowing about the others. */

const hero = document.querySelector('.hero');
const letters = [...document.querySelectorAll('.name i')];
const cards = document.querySelector('.like-list');
const still = stillPlease.matches;

/* One listener and one frame for everything the pointer drives. Four
   listeners each with their own requestAnimationFrame is four write
   passes and four chances to read a layout somebody else just dirtied. */
if (!still && matchMedia('(pointer: fine)').matches) {
  let queued = false;
  let px = 0;
  let py = 0;

  /* Where each letter sits inside the word, as a fraction of it. Measured
     once rather than every frame — they only shift by the hundredth of an
     em their own idle animation moves them, and the word itself is read
     fresh each time, so scrolling and resizing are both covered. */
  const name = document.querySelector('.name');
  let spots = [];
  const measure = () => {
    if (!name || !letters.length) return;
    const box = name.getBoundingClientRect();
    spots = letters.map(i => {
      const r = i.getBoundingClientRect();
      return box.width ? (r.left + r.width / 2 - box.left) / box.width : 0;
    });
  };
  measure();
  addEventListener('resize', measure, { passive: true });
  if (document.fonts) document.fonts.ready.then(measure).catch(() => { /* keep what was measured */ });

  /* Whether the two things that answer the pointer are even on the screen.
     Without this the word is measured and the cards are hit-tested on
     every frame of every pointer move anywhere on the page, most of which
     happens with both of them scrolled well out of sight. */
  const onScreen = new Set();
  if ('IntersectionObserver' in window) {
    const eyes = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) onScreen.add(e.target); else onScreen.delete(e.target);
    }), { rootMargin: '20% 0px' });
    [name, cards].forEach(target => target && eyes.observe(target));
  } else {
    [name, cards].forEach(target => target && onScreen.add(target));
  }

  const write = () => {
    queued = false;

    if (hero) {
      hero.style.setProperty('--lean-x', ((px / innerWidth - .5) * 2).toFixed(3));
      hero.style.setProperty('--lean-y', ((py / innerHeight - .5) * 2).toFixed(3));
    }

    /* The word answers to the pointer going past it, letter by letter, so
       the biggest thing on the page is not also the deadest. Falls away
       over about a letter and a half in each direction. */
    if (name && spots.length && onScreen.has(name)) {
      const box = name.getBoundingClientRect();
      const reach = Math.max(90, box.height * .9);
      letters.forEach((glyph, i) => {
        const dx = (box.left + spots[i] * box.width - px) / reach;
        const dy = (box.top + box.height / 2 - py) / reach;
        const pull = Math.max(0, 1 - Math.hypot(dx, dy));
        glyph.style.setProperty('--pull', pull.toFixed(3));
      });
    }

    /* The card under the pointer turns toward it. Read off the card's own
       box, so it works whatever the grid has done with the columns. */
    if (cards && onScreen.has(cards)) {
      const card = document.elementFromPoint(px, py)?.closest?.('.like-list li');
      cards.querySelectorAll('li').forEach(li => {
        if (li === card) return;
        li.style.removeProperty('--tilt-x');
        li.style.removeProperty('--tilt-y');
      });
      if (card) {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--tilt-x', (((px - r.left) / r.width - .5) * 2).toFixed(3));
        card.style.setProperty('--tilt-y', (((py - r.top) / r.height - .5) * 2).toFixed(3));
      }
    }
  };

  /* The travel is worked out from the last position rather than read off
     movementX. That field is not filled in by a synthesised event at all,
     and it is a late arrival in more than one engine — so a wake that
     leans on it is a wake that is simply missing on some machines, with
     nothing anywhere to say why. Two subtractions cost nothing. */
  let wasX = 0;
  let wasY = 0;

  addEventListener('pointermove', event => {
    px = event.clientX;
    py = event.clientY;
    const dx = wasX ? px - wasX : 0;
    const dy = wasY ? py - wasY : 0;
    wasX = px;
    wasY = py;
    trail(px, py, dx, dy);
    if (queued) return;
    queued = true;
    requestAnimationFrame(write);
  }, { passive: true });
}

const drifters = document.querySelectorAll('.band svg, svg.band, .flag svg, svg.flag');

if (!still) {
  // one rate per drifter, none of them a multiple of another, so no two
  // ever move together for long enough to look like one layer
  const AMP = [15, -12, 9];
  let waiting = false;

  /* The wheel is the largest thing on the page and it was the only thing
     that did not answer to scrolling. It turns with the page now — which
     is what a wheel does when something rolls past it — on top of its own
     slow ratchet, so the two never line up into one obvious loop. */
  const wheelArt = document.querySelector('.wheel');
  const root = document.documentElement;

  /* How hard the page is being thrown about, nought to one. The speed
     lines are drawn for exactly one reason and they were sitting still
     while the page was being scrolled past them.

     It climbs the moment you move and falls off slowly, because a reading
     that dropped to nothing between two scroll events would flicker. And
     it has to keep falling after the last event — nothing else is going
     to come along and set it back to nought. */
  let vel = 0;
  let lastY = scrollY;
  let lastT = performance.now();
  let easeT = 0;

  /* The fall-off is measured against the clock, not counted in frames. A
     per-frame multiplier decays four times slower on a machine dropping to
     fifteen frames a second than on one holding sixty, which is exactly
     backwards — the slower machine is the one that must not be left with a
     stuck reading. */
  const ease = now => {
    const dt = Math.min(200, now - easeT);
    easeT = now;
    vel *= Math.pow(.02, dt / 1000);
    if (vel < .01) { vel = 0; easeT = 0; } else requestAnimationFrame(ease);
    root.style.setProperty('--vel', vel.toFixed(3));
  };

  /* How centred each region is, nought at the edge of the screen and one
     in the middle of it. The mark under a heading grows as its region
     comes up and falls back as it goes, so the page answers to being
     scrolled rather than only to being arrived at. */
  const regions = [...document.querySelectorAll('.panel')];

  const shift = () => {
    const y = scrollY;
    const t = performance.now();
    // a hard fling is about two and a half pixels a millisecond
    const raw = Math.min(1, Math.abs(y - lastY) / Math.max(16, t - lastT) / 2.5);
    /* Only ever raised here, and only ever lowered by the fall-off. Doing
       both in this one place made it flicker: scroll events and frames do
       not line up, so a frame with two of them in it reads twice as fast
       as the one after it with none, and the lines flashed at whatever
       rate that happened to alternate. */
    vel = Math.max(raw, vel);
    lastY = y;
    lastT = t;

    root.style.setProperty('--vel', vel.toFixed(3));
    /* Off the page's own scroll position this grew without a limit — by
       the foot of a phone page the second cloud was a hundred and thirty
       pixels above where it had been placed, sitting across the last line
       of the region before it. It leans by where it is on the screen
       instead, which is what a layer behind the page does and cannot run
       further than the amplitude it is given.

       The reading is taken through the drift already applied, so it feeds
       back into itself — at a gain of about fourteen pixels in a screen
       height that is a quarter of a pixel, and it settles at once. */
    drifters.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      const off = Math.max(-1, Math.min(1, (r.top + r.height / 2 - innerHeight / 2) / innerHeight));
      el.style.setProperty('--drift', `${(off * AMP[i % AMP.length]).toFixed(1)}px`);
    });
    if (wheelArt) wheelArt.style.setProperty('--roll', `${(y * .06).toFixed(2)}deg`);

    const mid = innerHeight / 2;
    regions.forEach(panel => {
      const r = panel.getBoundingClientRect();
      if (r.bottom < -80 || r.top > innerHeight + 80) return;
      const off = Math.abs(r.top + r.height / 2 - mid) / (mid + r.height / 2);
      panel.style.setProperty('--near', Math.max(0, 1 - off).toFixed(3));
    });

    waiting = false;
    if (!easeT) { easeT = t; requestAnimationFrame(ease); }
  };

  addEventListener('scroll', () => {
    if (waiting) return;
    waiting = true;
    requestAnimationFrame(shift);
  }, { passive: true });

  shift();
}


/* ────────────────── What the pointer stirs up ──────────────────── */

/* The field behind the page goes whether anybody is there or not. This is
   the half that only exists because somebody is.

   Dragging through it tears pieces off. Holding — which is how a black
   flash is charged — pulls them in instead, and letting go throws them
   out again, so the layer that is always running and the one thing on the
   page you actually play are the same energy.

   A fixed pool, recycled oldest first. Making and dropping elements at
   pointer rate is the one way to make a wake cost more than it is worth. */
const POOL = 24;
const FLECKS = ['#fleck-1', '#fleck-2', '#fleck-3', '#fleck-4'];

let wake = null;
let pool = [];
let next = 0;
let flown = 0;      // px of travel since the last one was let go
let gathering = 0;  // interval id while a strike is being held

if (!still) {
  wake = document.createElement('div');
  wake.className = 'wake';
  wake.setAttribute('aria-hidden', 'true');

  for (let i = 0; i < POOL; i++) {
    const bit = document.createElement('span');
    bit.className = 'spark';
    bit.innerHTML = `<svg viewBox="0 0 32 32"><use href="${FLECKS[i % FLECKS.length]}" /></svg>`;
    pool.push(bit);
    wake.append(bit);
  }
  document.body.append(wake);
}

/* One piece of it, thrown from (x, y) to (x + dx, y + dy). The web
   animations api rather than a class and a reflow: a recycled element
   would otherwise have to have its animation removed, its layout flushed
   and the class put back, three times a second. */
function spark(x, y, dx, dy, life) {
  if (!wake) return;
  const bit = pool[next++ % POOL];
  const size = 10 + Math.random() * 20;
  const spin = (Math.random() - .5) * 220;

  bit.style.setProperty('--sz', `${size.toFixed(1)}px`);
  bit.animate([
    { transform: `translate3d(${x}px, ${y}px, 0) rotate(0deg) scale(.4)`, opacity: 0 },
    { transform: `translate3d(${x + dx * .3}px, ${y + dy * .3}px, 0) rotate(${(spin * .3).toFixed(0)}deg) scale(1)`, opacity: .9, offset: .18 },
    { transform: `translate3d(${x + dx}px, ${y + dy}px, 0) rotate(${spin.toFixed(0)}deg) scale(.5)`, opacity: 0 }
  ], { duration: life, easing: 'cubic-bezier(.15,.7,.3,1)' });
}

/* Every so many pixels of travel, not every event — pointer events arrive
   at whatever rate the mouse reports, and a wake tied to that is a solid
   ribbon on one machine and a dotted line on another. */
function trail(x, y, mx, my) {
  if (!wake || gathering) return;
  flown += Math.hypot(mx, my);
  if (flown < 34) return;
  flown = 0;
  // thrown back along the way you came, then carried up, the way anything
  // coming off something moving does
  spark(x, y,
    -mx * 1.2 + (Math.random() - .5) * 60,
    -my * 1.2 - 30 - Math.random() * 70,
    800 + Math.random() * 600);
}

if (wake) {
  addEventListener('pointerdown', event => {
    if (event.button) return;
    wake.classList.add('is-hot');
    const { clientX: x, clientY: y } = event;

    // pulled in from a ring rather than thrown out of a point: this is the
    // charge going in, and it has to read as the opposite of the wake
    const draw = () => {
      for (let i = 0; i < 2; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 80 + Math.random() * 110;
        spark(x + Math.cos(a) * r, y + Math.sin(a) * r,
          -Math.cos(a) * r, -Math.sin(a) * r, 460 + Math.random() * 240);
      }
    };
    draw();
    gathering = setInterval(draw, 80);
  }, { passive: true });

  const let_go = event => {
    if (!gathering) return;
    clearInterval(gathering);
    gathering = 0;
    wake.classList.remove('is-hot');
    // and out again, which is the release whether or not it landed
    for (let i = 0; i < 7; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 90 + Math.random() * 120;
      spark(event.clientX, event.clientY, Math.cos(a) * r, Math.sin(a) * r - 20, 520 + Math.random() * 300);
    }
  };

  addEventListener('pointerup', let_go, { passive: true });
  addEventListener('pointercancel', let_go, { passive: true });
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


/* ────────────────────────── ログポース ─────────────────────────── */

/* A log pose points at the island you have not reached yet, and once
   you have been on one long enough it locks onto the next. The regions
   of this page are the islands: the needle points at the first one that
   is still below the middle of the screen, swings past it as it goes
   by, and once they have all been passed it points home.

   The angle is the real one — from the dial on the screen to the middle
   of that region on the screen — so it behaves like something pointing
   at a place rather than like a progress bar. */
const pose = document.getElementById('pose');
const poseHit = document.getElementById('pose-hit');
const poseName = document.getElementById('pose-name');
const poseTo = document.querySelector('.pose-to');

if (pose && poseHit && poseName) {
  const ISLANDS = [
    ['.now', 'right now'],
    ['.likes', 'favourites'],
    ['.score', 'black flash'],
    ['.traced', 'traced from'],
    ['.rules', 'the rules'],
    ['.foot', 'the sea'],
    ['.hero', 'the top']
  ];

  let target = null;
  let queued = false;
  let saying = 0;

  /* A log pose records the island it has been on. Four marks on the
     bezel, one per region, and each lights as that region is reached —
     kept for the visit like everything else the page remembers. */
  const SEEN_KEY = 'strohut-seen-islands';
  // one per principal direction of the bezel
  const MARKS = 8;
  let seen = 0;
  try { seen = Math.min(MARKS, Math.max(0, parseInt(sessionStorage.getItem(SEEN_KEY), 10) || 0)); } catch { /* fine */ }
  const record = n => {
    if (n <= seen) return;
    seen = Math.min(MARKS, n);
    pose.style.setProperty('--seen', seen);
    try { sessionStorage.setItem(SEEN_KEY, String(seen)); } catch { /* fine */ }
    written();
  };
  pose.style.setProperty('--seen', seen);

  /* 航海日誌 — what this visit came to, at the foot of the page.

     A log pose records islands, and this is the page saying back what it
     recorded: how many regions were gone past, how many flashes landed,
     the longest run. Nothing here is a number that was not earned in
     this tab, and all of it goes with the tab.

     The counts belong to the other file, which has no way of knowing
     when the compass moves; the regions belong to this one, which has no
     way of knowing when a flash lands. So each tells the other. */
  const log = document.getElementById('log');

  const written = () => {
    if (!log) return;

    const bits = [];
    if (seen) bits.push(`${seen} ${seen === 1 ? 'region' : 'regions'} gone past`);
    // the game's own tally, if this file can see it at all
    const landed = typeof total === 'number' ? total : 0;
    const run = typeof best === 'number' ? best : 0;
    if (landed) bits.push(`${landed} ${landed === 1 ? 'flash' : 'flashes'} landed`);
    if (run > 1) bits.push(`${run} in a row at best`);

    log.textContent = bits.length ? `this visit — ${bits.join(' · ')}` : '';
    log.hidden = !bits.length;
  };

  addEventListener('strohut:score', written);
  written();

  const islands = () => ISLANDS
    .map(([sel, name]) => [document.querySelector(sel), name])
    // a region whose upstream never answered takes itself off the page,
    // and an island that is not there is not somewhere to sail to
    .filter(([el]) => el && el.offsetParent !== null && !el.hidden);

  const look = () => {
    queued = false;
    const list = islands();
    if (!list.length) return;

    const mid = innerHeight * .55;
    /* It holds onto an island until that island is behind you, rather
       than dropping it the moment its top edge goes past — which is
       what a log pose does, and it is also the only way the needle ever
       gets to sweep. Locked to what is ahead, the needle sits at the
       same angle for the whole page and switches when it would have
       been about to move.

       At the very foot of the page there is nothing ahead, however the
       boxes happen to fall: the only place left to go is back. */
    const landed = scrollY + innerHeight >= (document.documentElement.scrollHeight - 8);
    let found = landed ? list[list.length - 1]
      : list.find(([el, name]) => name !== 'the top' && el.getBoundingClientRect().bottom > mid);
    if (!found) found = list[list.length - 1];

    if (found[0] !== target) {
      target = found[0];
      poseName.textContent = found[1];
      /* said out loud for a moment whenever it locks onto a new one,
         which is the only way somebody without a pointer ever sees it */
      pose.classList.add('is-saying');
      clearTimeout(saying);
      saying = setTimeout(() => pose.classList.remove('is-saying'), 2400);
    }

    // and it says which of the two it is: somewhere to go, or where you are
    const on = !landed && found[0].getBoundingClientRect().top <= mid;
    if (poseTo) poseTo.textContent = on ? 'here' : 'next';

    /* what it has recorded: every island whose middle you have been past.
       Counted off the list rather than off the target, so arriving by the
       button or by a link marks everything it went by. */
    const ahead = list.filter(([, name]) => name !== 'the top');
    const reached = ahead.filter(([el]) => el.getBoundingClientRect().top <= mid).length;

    /* At the foot of the page every one of them is behind you, however
       the boxes happen to fall — and how many there are is however many
       regions the page has today, not a number written down once when
       there were four. */
    record(landed ? ahead.length : reached);

    /* A log pose locks on once it has taken a full reading, which is the
       whole of what the instrument does. Every region gone past is that
       reading, and the dial says so — once, and then it stays said.

       After the reading has been written down, not before: on the pass
       that takes the last region the count has not been raised yet, and
       at the foot of the page there is no further scroll to come back on. */
    if (ahead.length && seen >= ahead.length && !pose.classList.contains('is-full')) {
      pose.classList.add('is-full');
      if (poseTo) poseTo.textContent = 'logged';
      poseName.textContent = 'the log is full';
      pose.classList.add('is-saying');
      clearTimeout(saying);
      /* Said, then handed back. The name line belongs to the target, and
         nothing rewrites it until the target changes — so without this
         the dial reads "next: the log is full" for the rest of the
         visit, which is a sentence nobody meant. */
      saying = setTimeout(() => {
        pose.classList.remove('is-saying');
        poseName.textContent = found[1];
      }, 3000);
      /* the target itself is left alone: the needle is still pointing at
         wherever it was, and everything below measures the angle off it */
    }

    /* Measured from the middle of the screen rather than from the dial
       in the corner. The dial is pinned to the foot of the window, so
       reading the angle off it has the needle pointing up at a region
       that is plainly further down the page — true of the two boxes and
       useless to anybody looking at it. Where you are is the middle of
       what you can see.

       And the lead is a fixed distance ahead rather than the region's
       own middle: a full-width region is six hundred pixels to the
       right of the corner, which swamps every bit of the up and down
       the needle is there to show. */
    const box = target.getBoundingClientRect();
    const dy = box.top + Math.min(box.height, innerHeight) / 2 - innerHeight / 2;
    const dx = Math.max(150, Math.min(330, innerWidth * .2));
    pose.style.setProperty('--ndl', `${(Math.atan2(dy, dx) * 180 / Math.PI).toFixed(1)}deg`);
  };

  const soon = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(look);
  };

  addEventListener('scroll', soon, { passive: true });
  addEventListener('resize', soon, { passive: true });
  /* the favourites arrive late and the music can take itself away, and
     either changes what the islands are */
  setTimeout(soon, 1200);
  setTimeout(soon, 3000);
  whenOpen(soon);
  look();

  poseHit.addEventListener('click', () => {
    if (!target) return;
    target.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
  });
}



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

  /* Checked often, redrawn rarely. It is the only number on the page that
     changes on its own, and when it does it turns over rather than being
     swapped out — a digit that changes with no motion at all is a digit
     nobody ever notices changing. */
  /* And the page knows whether it is night where he is.

     The header says "a light on a porch", and a porch light is a thing
     that is on at night. The hour is already being read for the clock,
     so the sky answers to it: one number, nought in the small hours and
     one at midday, written where css can reach it. Everything that hangs
     off it is a matter of degree — the field of stars is thicker after
     dark and nearly gone at noon, the sea slows down, the sheet cools a
     shade. Nothing appears or disappears, because a page that rearranges
     itself at six in the evening is a page nobody trusts.

     It is his hour, not the reader's: the page is about where he is, and
     a visitor in Seoul reading it at breakfast is looking at his night. */
  const hourOf = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin', hour: 'numeric', hour12: false
  });

  /* Noon is one, midnight is nought, and it moves as a curve rather than
     a step so nothing lurches on the hour. */
  const sun = () => {
    const h = (Number(hourOf.format(new Date())) || 0) % 24;
    return Number(((Math.cos((h - 13) / 24 * Math.PI * 2) + 1) / 2).toFixed(3));
  };

  let lastSun = -1;
  const tick = () => {
    /* written only when it moves — the same value five times a minute is
       five chances for the style system to do work about nothing, and
       the background carries a six-second transition off this number */
    const s = sun();
    if (s !== lastSun) {
      lastSun = s;
      document.body.style.setProperty('--sun', s);
    }

    const now = face.format(new Date());
    if (clock.textContent === now) return;
    clock.textContent = now;
    if (still) return;
    clock.classList.remove('is-turned');
    void clock.offsetWidth;
    clock.classList.add('is-turned');
  };

  tick();
  setInterval(tick, 5000);
}


/* ──────────────────────── How long ago ────────────────────────── */

function ago(iso) {
  const secs = Math.max(0, (Date.now() - new Date(iso)) / 1000);
  const [n, unit] = secs < 3600 ? [secs / 60, 'minute']
    : secs < 86400 ? [secs / 3600, 'hour']
      : secs < 2592000 ? [secs / 86400, 'day']
        : [secs / 2592000, 'month'];
  const v = Math.max(1, Math.floor(n));
  return `${v} ${unit}${v === 1 ? '' : 's'} ago`;
}


/* ───────────────────────────── Favourites ──────────────────────── */

/* The three the whole page is drawn out of. Anilist has a public graphql
   endpoint that needs no key and sends CORS headers, and it is asked by
   title rather than by numeric id — an id I cannot check is an id that
   silently points at a spin-off one day.

   Everything here is anilist's: the cover, the format, how many chapters
   there are. Nothing on the card is a sentence somebody wrote about them.

   Same rule as the github regions: no answer, no heading. */

const LIKED = [
  { key: 'jjk', title: 'Jujutsu Kaisen' },
  { key: 'gohs', title: 'The God of High School' },
  { key: 'op', title: 'One Piece' }
];

const likeBox = document.getElementById('likes');
const likeList = document.getElementById('like-list');

const LIKE_FIELDS = `
  id siteUrl format status chapters volumes episodes genres
  title { romaji english native }
  coverImage { large }
  startDate { year }`;

if (likeBox && likeList) {
  /* Page { media(search:) } rather than Media(search:) at the root. Both
     exist, but this is the shape a maintained client uses against the live
     api, and it hands back a list instead of one best guess — so a search
     whose top hit is a spin-off can still be answered by the entry below
     it rather than being dropped.

     One request, one alias per title, rather than three round trips. */
  /* Each of these is two things — the book and what was made of it — and
     anilist keeps them as separate records under separate types. Asking
     for both costs one more alias in the same request and is the
     difference between a card that names a title and a card that says
     what there is of it. */
  const query = `{${LIKED.flatMap(l => [
    `${l.key}_book: Page(perPage: 5) { media(search: ${JSON.stringify(l.title)}, type: MANGA) {${LIKE_FIELDS}} }`,
    `${l.key}_screen: Page(perPage: 5) { media(search: ${JSON.stringify(l.title)}, type: ANIME) {${LIKE_FIELDS}} }`
  ]).join('\n')}}`;

  /* Three books and their adaptations, which change about as often as
     anybody's favourites do — and the panel was asked for again on every
     reload, arriving a second after the rest of the page each time.

     It is kept for the visit. A reload draws the cards straight away and
     asks anilist again behind them; anything that came back different is
     redrawn, which for a chapter count going up is the only thing that
     ever will. The stamp is on the shape of the record rather than the
     records themselves, so a change to how a card is built is a miss
     rather than an old card drawn by new code. */
  const LIKE_SHELF = 'strohut-liked-2';
  let drawn = '';

  const draw = got => {
    const same = JSON.stringify(got);
    if (same === drawn) return;
    drawn = same;
    whenOpen(() => {
      likeList.replaceChildren(...got.map((e, i) => likeRow(e, i)));
      likeBox.hidden = false;
      likeBox.classList.add('is-in');
    });
  };

  /* After this file has finished being read, not during it. A card is
     built out of things declared further down — and a const is not
     available above the line that declares it, so drawing from the shelf
     here and now throws before anything else on the page has run. A
     microtask is still the same tick and still well before the first
     paint; it is only after the rest of the file exists. */
  queueMicrotask(() => {
    const kept = unstash(LIKE_SHELF);
    if (Array.isArray(kept) && kept.length && kept.every(e => e && e.book)) draw(kept);
  });

  fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query })
  })
    .then(r => (r.ok ? r.json() : null))
    .then(body => {
      const data = body && body.data;
      if (!data) return;

      /* A search returns what it thinks you meant, not what you asked
         for. Any of these can come back as a spin-off, a colour edition
         or a databook with a longer name, and the card would then state
         that thing's format and chapter count under a heading that says
         favourites. So the entry taken is the one that answers to the
         title that was asked for, wherever it sits in the results. */
      const hit = (alias, asked) => {
        const page = data[alias];
        const list = (page && Array.isArray(page.media)) ? page.media : [];
        return list.find(m => m && m.title && answersTo(m.title, asked)) || null;
      };

      const got = LIKED
        .map(l => ({ key: l.key, book: hit(`${l.key}_book`, l.title), screen: hit(`${l.key}_screen`, l.title) }))
        // the book is the record the card is built on; the adaptation only
        // ever adds a line, so one without the other is not a card
        .filter(e => e.book);

      if (!got.length) return;

      /* Not watched by the observer — the region has no box until there
         is something to put in it, so it says for itself when it arrives.
         Behind the barrier that would be another arrival nobody sees. */
      draw(got);
      stash(LIKE_SHELF, got);
    })
    .catch(() => {
      /* stays hidden */
    });
}

// romaji is what people actually call them; english is often a licensing
// title nobody uses, and native is unreadable to most of the page
const nameOf = t => t.romaji || t.english || t.native || '';

const plain = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/* One of the titles it came back under has to be the one that was asked
   for, give or take a "the" and the punctuation.

   Comparing on the latin letters alone means a native title never matches
   — 갓 오브 하이스쿨 reduces to nothing — which is fine, because romaji and
   english are always there too. What is not fine is both sides reducing to
   nothing, which would make everything match everything. */
function answersTo(title, asked) {
  const want = plain(asked).replace(/^the /, '');
  if (!want) return false;

  return [title.romaji, title.english, title.native]
    .filter(Boolean)
    .some(t => plain(t).replace(/^the /, '') === want);
}

/* Anilist's format is the field that says what something actually is. The
   God of High School is a manhwa, not a manga — calling it one is exactly
   the kind of thing a page has no business getting wrong about something
   it claims to like. Every value anilist can send for a written work is
   spelled out here rather than left to a fallback. */
const FORMAT = {
  MANGA: 'manga',
  MANHWA: 'manhwa',
  MANHUA: 'manhua',
  NOVEL: 'light novel',
  ONE_SHOT: 'one shot'
};
const STATE = {
  RELEASING: 'still going',
  FINISHED: 'finished',
  HIATUS: 'on hiatus',
  NOT_YET_RELEASED: 'not out yet',
  CANCELLED: 'cancelled'
};

/* What each of these three left on this page.

   The favourites and the drawings were two lists that never met: three
   works named in one chapter and six things traced off them drawn in
   another, with nothing anywhere saying which came from which. It is the
   one link between the live half of this page and the drawn half, and it
   costs a line.

   The marks are the page's own symbols again — the same ones the chapter
   下 uses, at the size of a word — and the line takes you there. */
const DREW = {
  jjk: [['dharma', 'the wheel'], ['flash-2', 'the black flash']],
  gohs: [['ye-cap', 'the staff']],
  op: [['cloudbar', 'the cloud'], ['lp-case', 'the log pose'], ['roger', 'the flag']]
};

function drewLine(key) {
  const drawn = DREW[key];
  if (!drawn) return null;

  const p = document.createElement('p');
  p.className = 'like-drew';

  const link = document.createElement('a');
  link.href = '#traced';

  const marks = document.createElement('span');
  marks.className = 'like-drew-marks';
  marks.setAttribute('aria-hidden', 'true');
  marks.innerHTML = drawn
    .map(([id]) => `<svg viewBox="0 0 100 100"><use href="#${id}" /></svg>`).join('');
  link.append(marks);

  const says = document.createElement('span');
  says.textContent = drawn.map(([, name]) => name).join(', ');
  link.append(says);

  p.append(link);
  return p;
}

/* One line of facts about a book, in a column narrow enough that it wraps.
   Set as one string it breaks wherever the space happens to fall, which
   puts "· since 2018" on a line of its own and leaves "1140 episodes"
   split across two. Each fact is its own unbreakable run instead, with the
   separator kept on the fact it follows, so a break can only land between
   two of them. The text reads the same in every other respect — it is
   still "manga · finished · 271 chapters · since 2018" to anything that
   copies it or reads it aloud. */
function facts(list) {
  const p = document.createElement('p');
  p.className = 'like-meta';
  list.forEach((fact, n) => {
    const run = document.createElement('span');
    run.className = 'fact';
    run.textContent = n < list.length - 1 ? `${fact} ·` : fact;
    if (n) p.append(' ');
    p.append(run);
  });
  return p;
}

function likeRow(entry, i) {
  const media = entry.book;
  const li = document.createElement('li');
  li.style.setProperty('--i', i);

  const plate = document.createElement('div');
  plate.className = 'cover';

  /* The plate only covers its empty mark once the picture has really
     loaded, so a blocked cdn leaves the mark rather than a broken image.

     It is hidden with visibility rather than the hidden attribute, which
     is display:none — and a display:none image is never near the viewport,
     so a lazy one never loads, so the load event that would reveal it
     never fires. The image waits for itself forever. */
  const art = document.createElement('img');
  art.alt = '';
  art.loading = 'lazy';
  art.width = 230;
  art.height = 345;
  art.addEventListener('load', () => art.classList.add('is-there'));
  art.addEventListener('error', () => art.classList.remove('is-there'));
  if (media.coverImage && media.coverImage.large) art.src = media.coverImage.large;
  plate.append(art);

  const void_ = document.createElement('span');
  void_.className = 'cover-void';
  void_.setAttribute('aria-hidden', 'true');
  plate.append(void_);
  li.append(plate);

  const body = document.createElement('div');
  body.className = 'like-text';

  const name = document.createElement('p');
  name.className = 'like-name';
  const link = document.createElement('a');
  link.href = media.siteUrl || 'https://anilist.co';
  link.textContent = nameOf(media.title);
  name.append(link);
  body.append(name);

  if (media.title.native) {
    const native = document.createElement('p');
    native.className = 'like-native';
    native.textContent = media.title.native;
    body.append(native);
  }

  const bits = [
    FORMAT[media.format] || (media.format || '').toLowerCase().replace(/_/g, ' '),
    STATE[media.status],
    media.chapters ? `${media.chapters} chapters` : '',
    media.startDate && media.startDate.year ? `since ${media.startDate.year}` : ''
  ].filter(Boolean);

  if (bits.length) body.append(facts(bits));

  // and what was made of it
  const screen = entry.screen;
  if (screen) {
    const shown = [
      'anime',
      screen.episodes ? `${screen.episodes} episodes` : '',
      STATE[screen.status]
    ].filter(Boolean);

    body.append(facts(shown));
  }

  const drew = drewLine(entry.key);
  if (drew) body.append(drew);

  const tags = (media.genres || []).concat(screen ? screen.genres || [] : []);
  if (tags.length) {
    const seen = [...new Set(tags.map(t => String(t).toLowerCase()))].slice(0, 4);
    const list = document.createElement('p');
    list.className = 'like-tags';
    list.textContent = seen.join(', ');
    body.append(list);
  }

  li.append(body);
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
  album: document.getElementById('track-album'),
  clock: document.getElementById('track-time'),
  where: document.getElementById('dc-where'),
  frame: document.getElementById('dc-frame'),
  bar: document.getElementById('track-bar'),
  fill: document.getElementById('track-fill'),
  link: document.getElementById('music-link'),
  track: document.getElementById('music-embed')
};

/* The quiet state used to point at one track id that had been carried
   over from an older design — a favourite nobody had picked, sitting there
   claiming to be one. What the panel shows instead when nothing is playing
   is the last thing it actually caught him listening to, which is a true
   statement about a real song.

   For the visit and no longer. It was on the shelf that survives the
   browser being closed, so coming back after a fortnight was met with a
   song and the words "17 days ago" — a true statement nobody wanted, and
   the same shelf the game was taken off for the same reason. Nothing on
   this page is kept past the visit. */
const LAST_TRACK = 'strohut-track';

function stash(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* it just won't be there later in the visit */
  }
}

function unstash(key) {
  try {
    const raw = sessionStorage.getItem(key);
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

/* Lanyard is somebody else's free service, and this page can be left open
   on a second monitor all day. A socket that will not open was retried
   every twelve seconds for as long as the tab lived — three hundred
   attempts an hour at an upstream that is already having a bad time.

   So it backs off, up to two minutes, and resets the moment a connection
   actually opens. And because backing off makes coming back slow, the two
   moments that mean somebody is looking again — the tab being brought
   forward, and the network returning — try immediately instead of waiting
   out whatever the delay had grown to. */
const RETRY_MIN = 4000;
const RETRY_MAX = 120000;
let retryIn = RETRY_MIN;
let retryTimer = 0;
let live = null;

connect();

// nothing to reconnect if one is already up or on its way
const tryNow = () => {
  if (live && (live.readyState === WebSocket.OPEN || live.readyState === WebSocket.CONNECTING)) return;
  clearTimeout(retryTimer);
  retryIn = RETRY_MIN;
  connect();
};

addEventListener('online', tryNow);
document.addEventListener('visibilitychange', () => { if (!document.hidden) tryNow(); });

function connect() {
  let socket;
  let heartbeat;

  try {
    socket = new WebSocket('wss://api.lanyard.rest/socket');
  } catch {
    fail();
    return;
  }
  live = socket;

  socket.addEventListener('open', () => {
    retryIn = RETRY_MIN;
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
    clearTimeout(retryTimer);
    retryTimer = setTimeout(connect, retryIn);
    retryIn = Math.min(RETRY_MAX, Math.round(retryIn * 1.8));
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

  /* Which machine he is at. Discord reports the three separately and one
     person can be on more than one at once, which is worth saying — being
     on a phone and being at a desk mean different things about whether a
     message gets a reply. */
  const on = [
    data.active_on_discord_desktop && 'desktop',
    data.active_on_discord_mobile && 'phone',
    data.active_on_discord_web && 'browser'
  ].filter(Boolean);
  el.where.textContent = status !== 'offline' && on.length ? on.join(' and ') : '';
  el.where.hidden = !el.where.textContent;

  // the frame around the avatar is its own image, sitting over the picture
  const frame = user.avatar_decoration_data && user.avatar_decoration_data.asset;
  el.frame.hidden = !frame;
  if (frame) {
    const url = `https://cdn.discordapp.com/avatar-decoration-presets/${frame}.png?size=160`;
    if (el.frame.src !== url) el.frame.src = url;
  } else {
    el.frame.removeAttribute('src');
  }

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

/* Discord sends far more per activity than a name: what the game itself
   is reporting on the second line and the third, how big the party is,
   and which of five kinds of activity it even is. The panel was showing
   the name and throwing the rest away. */
const DOING_KIND = {
  0: 'playing',
  1: 'streaming',
  2: 'listening to',
  3: 'watching',
  5: 'competing in'
};

function activityRow(activity, i) {
  const li = document.createElement('li');
  /* The rows are rebuilt when discord says something changed, not on a
     clock — the elapsed counter ticks on its own element. So they can
     arrive one after another without that replaying every second. */
  li.style.setProperty('--i', i);
  /* The plate is always there and the artwork lies over it, appearing
     only once it has actually arrived — the same as the covers on the
     books. Discord's app assets go missing all the time: an asset the
     developer deleted, a filter that blocks the cdn, an id that never
     resolved. Dropping the image straight into the row left a broken
     picture in a white box on every one of those. */
  const plate = document.createElement('span');
  plate.className = 'no-art';
  plate.setAttribute('aria-hidden', 'true');

  const url = artworkUrl(activity);
  if (url) {
    const img = document.createElement('img');
    img.src = url;
    img.alt = '';
    img.loading = 'lazy';
    // squares, both of them — anything else and the row jumps when it lands
    img.width = 96;
    img.height = 96;
    img.addEventListener('load', () => img.classList.add('is-there'));
    img.addEventListener('error', () => img.remove());
    plate.append(img);
  }
  li.append(plate);

  const body = document.createElement('div');

  const kind = DOING_KIND[activity.type];
  if (kind) {
    const what = document.createElement('p');
    what.className = 'doing-what';
    what.textContent = kind;
    body.append(what);
  }

  const name = document.createElement('p');
  name.className = 'doing-name';
  name.textContent = activity.name;
  body.append(name);

  // the game's own two lines, whatever it chooses to put there
  for (const line of [activity.details, partyLine(activity)]) {
    if (!line) continue;
    const p = document.createElement('p');
    p.className = 'doing-line';
    p.textContent = line;
    body.append(p);
  }

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

// the second line, with the party count folded in where there is one
function partyLine(activity) {
  const size = activity.party && activity.party.size;
  const crowd = Array.isArray(size) && size.length === 2 && size[1] > 1
    ? `${size[0]} of ${size[1]}`
    : '';
  return [activity.state, crowd].filter(Boolean).join(' · ');
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
      song: track.song, artist: track.artist, album: track.album,
      id: track.track_id, art: track.album_art_url, at: Date.now()
    });
  }

  // nothing playing: fall back to the last one this page saw
  const seen = track ? null : unstash(LAST_TRACK);
  const show = track || seen;

  /* The record rides out of the sleeve and turns while there is something
     playing, and only then — a drawing that turns whatever the state is
     would be saying nothing. */
  el.track.classList.toggle('is-playing', Boolean(track && track.song));

  el.kicker.textContent = track ? 'now playing' : seen ? 'last played' : 'nothing playing';
  /* Not "nothing playing" a second time — the kicker above it has just
     said that in red capitals, and the two lines sat one under the other
     saying the same three words. This one says the other true thing:
     nothing has been caught in this browser yet. */
  el.song.textContent = show ? show.song : 'nothing caught yet';
  el.artist.textContent = show ? show.artist || '' : '';
  el.artist.hidden = !el.artist.textContent;

  el.seen.textContent = seen && seen.at ? ago(seen.at) : '';
  el.seen.hidden = !el.seen.textContent;

  // the record it came off, which discord sends and the panel ignored
  el.album.textContent = show && show.album && show.album !== show.song ? show.album : '';
  el.album.hidden = !el.album.textContent;

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
    el.clock.hidden = true;
    return;
  }

  el.bar.hidden = false;
  el.clock.hidden = false;

  // A bar says roughly how far in it is. The numbers say exactly, and they
  // sit outside the live region — read out every second they would be the
  // only thing a screen reader ever got to say.
  const tick = () => {
    const gone = Date.now() - track.timestamps.start;
    el.fill.style.width = `${Math.min(100, Math.max(0, gone / span * 100)).toFixed(2)}%`;
    el.clock.textContent = `${clockOf(gone)} / ${clockOf(span)}`;
  };
  tick();
  liveTimers.push(setInterval(tick, 1000));
}

// minutes and seconds, the way a player shows them
function clockOf(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function fail() {
  /* Every render clears these first; this does not go through one. The
     track's own ticker would otherwise keep counting a song that stopped
     when the socket did. */
  liveTimers.forEach(clearInterval);
  liveTimers = [];

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
  if (unstash(LAST_TRACK)) {
    showTrack(null);
  } else if (music) {
    music.hidden = true;
    // and the readout takes the row it has been left alone in, rather
    // than holding half of it with the other half black
    el.slab.closest('.now')?.classList.add('is-alone');
  }
}
