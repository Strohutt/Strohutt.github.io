/* ════════════════════════════════════════════════════════════════
   strohut
   1. Sections arriving as you scroll
   2. Black flash, and the wheel that adapts to it
   3. Things you can hit
   4. Discord presence, via Lanyard
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
  });
}


/* ─────────────────────── Things you can hit ────────────────────── */

/* Every drawn thing on the page answers to a click, and each answers in
   the way that thing would: the wheel adapts a spoke, the cloud gets
   shoved, the flag swings, the stroke is pulled again. */

const STROKES = [
  "<path class=\"bs-body\" d=\"M12 44.8C16.9 43.5 31.6 38.94 41.4 37C51.2 35.06 61 34.08 70.8 33.16C80.6 32.25 90.4 32.23 100.2 31.53C110 30.83 119.8 29.59 129.6 28.95C139.4 28.32 149.2 27.98 159 27.71C168.8 27.45 178.6 27.61 188.4 27.36C198.2 27.1 208 26.28 217.8 26.19C227.6 26.1 237.4 26.71 247.2 26.83C257 26.95 266.8 26.91 276.6 26.93C286.4 26.95 296.2 27.08 306 26.97C315.8 26.86 325.6 26.45 335.4 26.28C345.2 26.12 355 25.76 364.8 25.96C374.6 26.16 384.4 27.34 394.2 27.47C404 27.61 413.8 26.6 423.6 26.77C433.4 26.94 443.2 28.06 453 28.49C462.8 28.92 472.6 29.29 482.4 29.37C492.2 29.45 502 28.88 511.8 28.96C521.6 29.04 531.4 29.67 541.2 29.84C551 30.01 560.8 29.74 570.6 29.98C580.4 30.22 590.2 30.89 600 31.27C609.8 31.66 619.6 32.13 629.4 32.29C639.2 32.44 649 32.05 658.8 32.21C668.6 32.37 678.4 32.98 688.2 33.26C698 33.54 707.8 33.7 717.6 33.9C727.4 34.09 737.2 34.08 747 34.44C756.8 34.79 766.6 35.67 776.4 36.03C786.2 36.39 796 36.31 805.8 36.6C815.6 36.89 825.4 37.62 835.2 37.77C845 37.92 854.8 37.42 864.6 37.52C874.4 37.61 884.2 38.13 894 38.36C903.8 38.59 913.6 38.77 923.4 38.92C933.2 39.07 943 39.15 952.8 39.24C962.6 39.33 972.4 39.19 982.2 39.45C992 39.72 1001.8 40.62 1011.6 40.83C1021.4 41.04 1031.2 40.53 1041 40.7C1050.8 40.87 1060.6 41.84 1070.4 41.85C1080.2 41.85 1090 40.77 1099.8 40.73C1109.6 40.68 1119.4 41.3 1129.2 41.55C1139 41.81 1148.8 42.12 1158.6 42.27C1168.4 42.41 1183.1 42.39 1188 42.41L1188 41.44C1183.1 41.6 1168.4 41.87 1158.6 42.42C1148.8 42.96 1139 44.14 1129.2 44.69C1119.4 45.24 1109.6 45.44 1099.8 45.72C1090 45.99 1080.2 45.9 1070.4 46.34C1060.6 46.78 1050.8 48.07 1041 48.36C1031.2 48.64 1021.4 47.77 1011.6 48.05C1001.8 48.34 992 49.48 982.2 50.07C972.4 50.66 962.6 51.17 952.8 51.6C943 52.03 933.2 52.23 923.4 52.65C913.6 53.07 903.8 53.9 894 54.12C884.2 54.34 874.4 53.61 864.6 53.96C854.8 54.31 845 55.61 835.2 56.23C825.4 56.86 815.6 57.37 805.8 57.72C796 58.08 786.2 58.23 776.4 58.38C766.6 58.52 756.8 58.25 747 58.59C737.2 58.93 727.4 59.87 717.6 60.43C707.8 60.99 698 61.66 688.2 61.95C678.4 62.24 668.6 61.91 658.8 62.18C649 62.44 639.2 63.15 629.4 63.53C619.6 63.92 609.8 64.25 600 64.48C590.2 64.71 580.4 64.66 570.6 64.92C560.8 65.18 551 65.85 541.2 66.05C531.4 66.25 521.6 65.88 511.8 66.11C502 66.35 492.2 67.11 482.4 67.43C472.6 67.75 462.8 67.82 453 68.02C443.2 68.22 433.4 68.45 423.6 68.63C413.8 68.81 404 69.08 394.2 69.08C384.4 69.08 374.6 68.6 364.8 68.63C355 68.65 345.2 69.12 335.4 69.22C325.6 69.31 315.8 69.36 306 69.2C296.2 69.03 286.4 68.42 276.6 68.21C266.8 67.99 257 68.01 247.2 67.91C237.4 67.81 227.6 68.06 217.8 67.62C208 67.17 198.2 65.66 188.4 65.25C178.6 64.84 168.8 65.46 159 65.14C149.2 64.82 139.4 64.04 129.6 63.33C119.8 62.62 110 61.91 100.2 60.89C90.4 59.87 80.6 58.42 70.8 57.21C61 55.99 51.2 55.58 41.4 53.61C31.6 51.63 16.9 46.75 12 45.38Z\"/><path class=\"bs-skip\" d=\"M616.44 28.24L951.16 26.53\" style=\"stroke-width:1.01\"/><path class=\"bs-skip\" d=\"M784.57 60.61L917.41 61.54\" style=\"stroke-width:1.07\"/><path class=\"bs-skip\" d=\"M1052.15 52.42L1200 52.57\" style=\"stroke-width:0.98\"/><path class=\"bs-skip\" d=\"M620.09 62.38L923.82 64.36\" style=\"stroke-width:2.61\"/><path class=\"bs-skip\" d=\"M746.89 32.95L1002.45 31.1\" style=\"stroke-width:3.09\"/><path class=\"bs-skip\" d=\"M651.23 32.95L805.27 33.51\" style=\"stroke-width:2.47\"/><path class=\"bs-skip\" d=\"M601.28 62.02L696.67 60.7\" style=\"stroke-width:1.76\"/>",
  "<path class=\"bs-body\" d=\"M12 45C16.9 43.59 31.6 38.44 41.4 36.54C51.2 34.65 61 34.61 70.8 33.64C80.6 32.68 90.4 31.3 100.2 30.76C110 30.22 119.8 30.88 129.6 30.41C139.4 29.93 149.2 28.42 159 27.91C168.8 27.39 178.6 27.63 188.4 27.34C198.2 27.04 208 26.23 217.8 26.13C227.6 26.04 237.4 26.69 247.2 26.79C257 26.88 266.8 26.83 276.6 26.71C286.4 26.59 296.2 26.19 306 26.07C315.8 25.94 325.6 25.77 335.4 25.96C345.2 26.15 355 26.93 364.8 27.22C374.6 27.52 384.4 27.63 394.2 27.73C404 27.83 413.8 27.82 423.6 27.83C433.4 27.84 443.2 27.58 453 27.81C462.8 28.03 472.6 28.81 482.4 29.18C492.2 29.55 502 29.79 511.8 30.02C521.6 30.25 531.4 30.46 541.2 30.55C551 30.64 560.8 30.43 570.6 30.55C580.4 30.66 590.2 31 600 31.26C609.8 31.52 619.6 31.7 629.4 32.1C639.2 32.51 649 33.34 658.8 33.71C668.6 34.07 678.4 34.1 688.2 34.3C698 34.5 707.8 34.63 717.6 34.89C727.4 35.16 737.2 35.79 747 35.89C756.8 36 766.6 35.46 776.4 35.53C786.2 35.61 796 36.08 805.8 36.34C815.6 36.6 825.4 36.77 835.2 37.09C845 37.4 854.8 38.07 864.6 38.23C874.4 38.38 884.2 37.94 894 38.02C903.8 38.09 913.6 38.42 923.4 38.68C933.2 38.94 943 39.43 952.8 39.57C962.6 39.71 972.4 39.35 982.2 39.51C992 39.68 1001.8 40.49 1011.6 40.56C1021.4 40.63 1031.2 39.95 1041 39.95C1050.8 39.95 1060.6 40.3 1070.4 40.58C1080.2 40.85 1090 41.56 1099.8 41.62C1109.6 41.68 1119.4 41.03 1129.2 40.94C1139 40.84 1148.8 40.87 1158.6 41.02C1168.4 41.18 1183.1 41.73 1188 41.87L1188 41.53C1183.1 41.67 1168.4 41.84 1158.6 42.35C1148.8 42.87 1139 44.18 1129.2 44.63C1119.4 45.07 1109.6 44.65 1099.8 45C1090 45.36 1080.2 46.37 1070.4 46.75C1060.6 47.13 1050.8 46.87 1041 47.28C1031.2 47.69 1021.4 48.68 1011.6 49.21C1001.8 49.75 992 50.08 982.2 50.46C972.4 50.85 962.6 51.2 952.8 51.51C943 51.83 933.2 51.94 923.4 52.34C913.6 52.74 903.8 53.6 894 53.91C884.2 54.23 874.4 54.01 864.6 54.23C854.8 54.44 845 54.78 835.2 55.2C825.4 55.61 815.6 56.29 805.8 56.72C796 57.14 786.2 57.37 776.4 57.75C766.6 58.13 756.8 58.64 747 59C737.2 59.36 727.4 59.64 717.6 59.93C707.8 60.21 698 60.39 688.2 60.71C678.4 61.02 668.6 61.37 658.8 61.8C649 62.24 639.2 63.02 629.4 63.33C619.6 63.63 609.8 63.42 600 63.61C590.2 63.81 580.4 64.23 570.6 64.47C560.8 64.71 551 64.63 541.2 65.06C531.4 65.49 521.6 66.72 511.8 67.06C502 67.4 492.2 66.86 482.4 67.09C472.6 67.33 462.8 68.33 453 68.44C443.2 68.54 433.4 67.66 423.6 67.73C413.8 67.81 404 68.59 394.2 68.88C384.4 69.17 374.6 69.55 364.8 69.45C355 69.35 345.2 68.37 335.4 68.28C325.6 68.19 315.8 68.96 306 68.92C296.2 68.88 286.4 68.24 276.6 68.04C266.8 67.84 257 67.75 247.2 67.71C237.4 67.66 227.6 67.96 217.8 67.78C208 67.6 198.2 67.08 188.4 66.65C178.6 66.22 168.8 65.88 159 65.21C149.2 64.55 139.4 63.33 129.6 62.66C119.8 61.98 110 62.09 100.2 61.14C90.4 60.2 80.6 58.23 70.8 57C61 55.78 51.2 55.64 41.4 53.79C31.6 51.95 16.9 47.24 12 45.93Z\"/><path class=\"bs-skip\" d=\"M777.67 22.5L953.48 23.82\" style=\"stroke-width:3.04\"/><path class=\"bs-skip\" d=\"M857.8 43.81L1098.77 45.43\" style=\"stroke-width:2.82\"/><path class=\"bs-skip\" d=\"M1007.33 32.53L1200 33.94\" style=\"stroke-width:2.14\"/><path class=\"bs-skip\" d=\"M732.3 56.63L877.79 54.9\" style=\"stroke-width:0.82\"/><path class=\"bs-skip\" d=\"M690 29.07L894.72 30.08\" style=\"stroke-width:1.71\"/><path class=\"bs-skip\" d=\"M688.94 59.97L909.31 58.54\" style=\"stroke-width:2.04\"/><path class=\"bs-skip\" d=\"M639.3 58.55L829.79 60.22\" style=\"stroke-width:2.81\"/>",
  "<path class=\"bs-body\" d=\"M12 45.33C16.9 43.94 31.6 38.91 41.4 36.98C51.2 35.05 61 34.79 70.8 33.77C80.6 32.75 90.4 31.57 100.2 30.84C110 30.11 119.8 29.8 129.6 29.38C139.4 28.97 149.2 28.67 159 28.35C168.8 28.02 178.6 27.64 188.4 27.44C198.2 27.23 208 27.38 217.8 27.13C227.6 26.87 237.4 26.01 247.2 25.92C257 25.84 266.8 26.63 276.6 26.63C286.4 26.62 296.2 25.87 306 25.9C315.8 25.93 325.6 26.58 335.4 26.81C345.2 27.03 355 27.24 364.8 27.23C374.6 27.22 384.4 26.67 394.2 26.76C404 26.85 413.8 27.65 423.6 27.77C433.4 27.9 443.2 27.26 453 27.53C462.8 27.8 472.6 29.02 482.4 29.37C492.2 29.72 502 29.52 511.8 29.62C521.6 29.73 531.4 29.72 541.2 30.01C551 30.31 560.8 31.15 570.6 31.41C580.4 31.66 590.2 31.49 600 31.53C609.8 31.57 619.6 31.39 629.4 31.66C639.2 31.94 649 32.85 658.8 33.17C668.6 33.49 678.4 33.43 688.2 33.58C698 33.74 707.8 33.88 717.6 34.09C727.4 34.3 737.2 34.51 747 34.84C756.8 35.17 766.6 35.9 776.4 36.06C786.2 36.22 796 35.59 805.8 35.8C815.6 36 825.4 36.87 835.2 37.29C845 37.71 854.8 38.21 864.6 38.33C874.4 38.46 884.2 38.04 894 38.02C903.8 38 913.6 37.99 923.4 38.23C933.2 38.46 943 39.14 952.8 39.43C962.6 39.72 972.4 39.94 982.2 39.96C992 39.98 1001.8 39.3 1011.6 39.56C1021.4 39.81 1031.2 41.34 1041 41.48C1050.8 41.62 1060.6 40.36 1070.4 40.4C1080.2 40.44 1090 41.61 1099.8 41.72C1109.6 41.83 1119.4 40.9 1129.2 41.04C1139 41.18 1148.8 42.34 1158.6 42.53C1168.4 42.72 1183.1 42.23 1188 42.17L1188 41.87C1183.1 42.09 1168.4 42.81 1158.6 43.2C1148.8 43.58 1139 43.85 1129.2 44.17C1119.4 44.5 1109.6 44.82 1099.8 45.14C1090 45.46 1080.2 45.73 1070.4 46.1C1060.6 46.47 1050.8 46.95 1041 47.35C1031.2 47.75 1021.4 48.01 1011.6 48.5C1001.8 48.99 992 49.97 982.2 50.28C972.4 50.6 962.6 50.13 952.8 50.38C943 50.63 933.2 51.25 923.4 51.77C913.6 52.29 903.8 52.99 894 53.48C884.2 53.97 874.4 54.36 864.6 54.71C854.8 55.06 845 55.08 835.2 55.58C825.4 56.07 815.6 57.19 805.8 57.68C796 58.17 786.2 58.2 776.4 58.53C766.6 58.86 756.8 59.44 747 59.68C737.2 59.92 727.4 59.68 717.6 59.97C707.8 60.25 698 60.92 688.2 61.39C678.4 61.87 668.6 62.41 658.8 62.81C649 63.21 639.2 63.62 629.4 63.77C619.6 63.93 609.8 63.63 600 63.75C590.2 63.87 580.4 64.25 570.6 64.48C560.8 64.72 551 64.82 541.2 65.16C531.4 65.5 521.6 66.14 511.8 66.52C502 66.89 492.2 67.28 482.4 67.39C472.6 67.5 462.8 67.16 453 67.18C443.2 67.19 433.4 67.16 423.6 67.46C413.8 67.76 404 68.75 394.2 68.97C384.4 69.19 374.6 68.72 364.8 68.78C355 68.84 345.2 69.34 335.4 69.33C325.6 69.33 315.8 68.8 306 68.75C296.2 68.7 286.4 69.1 276.6 69.01C266.8 68.92 257 68.6 247.2 68.2C237.4 67.8 227.6 67.05 217.8 66.6C208 66.16 198.2 65.83 188.4 65.52C178.6 65.2 168.8 65.16 159 64.72C149.2 64.28 139.4 63.62 129.6 62.89C119.8 62.15 110 61.06 100.2 60.32C90.4 59.58 80.6 59.5 70.8 58.46C61 57.43 51.2 56.23 41.4 54.12C31.6 52.01 16.9 47.18 12 45.79Z\"/><path class=\"bs-skip\" d=\"M892.82 38.06L1001.76 38.32\" style=\"stroke-width:2.49\"/><path class=\"bs-skip\" d=\"M783.14 33.43L855.3 34.01\" style=\"stroke-width:2.11\"/><path class=\"bs-skip\" d=\"M566.91 54.56L705.97 55.76\" style=\"stroke-width:1.2\"/><path class=\"bs-skip\" d=\"M527.95 26.95L667.29 28.76\" style=\"stroke-width:1.9\"/><path class=\"bs-skip\" d=\"M904.52 55.44L1200 54.79\" style=\"stroke-width:1.37\"/><path class=\"bs-skip\" d=\"M670.16 45.44L800.03 47.19\" style=\"stroke-width:2.87\"/><path class=\"bs-skip\" d=\"M995.64 57.03L1180.85 57.81\" style=\"stroke-width:1.9\"/>"
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
  artist: 'the link goes to what I keep coming back to',
  url: el.link ? el.link.href : ''
};

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
  el.link.href = track ? `https://open.spotify.com/track/${track.track_id}` : PINNED.url;

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
