
const DISCORD_ID = '402858450926829568';


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
    /* Reveal the first region immediately; later regions may wait for intersection. */
    if (sections[0]) {
      sections[0].classList.add('is-in');
      watcher.unobserve(sections[0]);
    }
  });
}





const letters = [...document.querySelectorAll('.name i')];
const cards = document.querySelector('.like-list');
const still = stillPlease.matches;

/* Batch pointer-driven updates into one animation frame. */
if (!still && matchMedia('(pointer: fine)').matches) {
  let queued = false;
  let px = 0;
  let py = 0;

  /* Re-measure character positions after fonts load or viewport changes. */
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

  /* Skip pointer work while both targets are off-screen. */
  const onScreen = new Set();
  if ('IntersectionObserver' in window) {
    const eyes = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) onScreen.add(e.target); else onScreen.delete(e.target);
    }), { rootMargin: '20% 0px' });
    [name, cards].forEach(target => target && eyes.observe(target));
  } else {
    [name, cards].forEach(target => target && onScreen.add(target));
  }

  const leaners = [...document.querySelectorAll('.speed')];

  const write = () => {
    queued = false;

    for (const el of leaners) {
      el.style.setProperty('--lean-x', ((px / innerWidth - .5) * 2).toFixed(3));
      el.style.setProperty('--lean-y', ((py / innerHeight - .5) * 2).toFixed(3));
    }

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
  const AMP = [15, -12, 9];
  let waiting = false;

  const wheelArt = document.querySelector('.wheel');

  let vel = 0;
  let lastY = scrollY;
  let lastT = performance.now();
  let easeT = 0;

  /* Use elapsed time so throttled frames do not change decay. */
  const ease = now => {
    const dt = Math.min(200, now - easeT);
    easeT = now;
    vel *= Math.pow(.02, dt / 1000);
    if (vel < .01) { vel = 0; easeT = 0; } else requestAnimationFrame(ease);
    thrown(vel.toFixed(3));
  };

  const regions = [...document.querySelectorAll('.panel')]
    .map(panel => [panel, panel.querySelector('.head')])
    .filter(([, head]) => head);

  const stretchers = [...document.querySelectorAll('.speed, .band')];
  const thrown = v => { for (const el of stretchers) el.style.setProperty('--vel', v); };

  const shift = () => {
    const y = scrollY;
    const t = performance.now();
    const raw = Math.min(1, Math.abs(y - lastY) / Math.max(16, t - lastT) / 2.5);
    vel = Math.max(raw, vel);
    lastY = y;
    lastT = t;

    const driftBoxes = [...drifters].map(el => el.getBoundingClientRect());
    const regionBoxes = regions.map(([panel]) => panel.getBoundingClientRect());

    thrown(vel.toFixed(3));
    drifters.forEach((el, i) => {
      const r = driftBoxes[i];
      const off = Math.max(-1, Math.min(1, (r.top + r.height / 2 - innerHeight / 2) / innerHeight));
      el.style.setProperty('--drift', `${(off * AMP[i % AMP.length]).toFixed(1)}px`);
    });
    if (wheelArt) wheelArt.style.setProperty('--roll', `${(y * .06).toFixed(2)}deg`);

    const mid = innerHeight / 2;
    regions.forEach(([, head], i) => {
      const r = regionBoxes[i];
      if (r.bottom < -80 || r.top > innerHeight + 80) return;
      const off = Math.abs(r.top + r.height / 2 - mid) / (mid + r.height / 2);
      head.style.setProperty('--near', Math.max(0, 1 - off).toFixed(3));
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

/* Emit wake pieces by travel distance, not event rate. */
function trail(x, y, mx, my) {
  if (!wake || gathering) return;
  flown += Math.hypot(mx, my);
  if (flown < 34) return;
  flown = 0;
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
    for (let i = 0; i < 7; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 90 + Math.random() * 120;
      spark(event.clientX, event.clientY, Math.cos(a) * r, Math.sin(a) * r - 20, 520 + Math.random() * 300);
    }
  };

  addEventListener('pointerup', let_go, { passive: true });
  addEventListener('pointercancel', let_go, { passive: true });
}



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



const pose = document.getElementById('pose');
const poseHit = document.getElementById('pose-hit');
const poseName = document.getElementById('pose-name');
const poseTo = document.querySelector('.pose-to');

if (pose && poseHit && poseName) {
  const ISLANDS = [
    ['.now', 'right now'],
    ['.work', 'work'],
    ['.likes', 'favourites'],
    ['.score', 'black flash'],
    ['.traced', 'traced from'],
    ['.bounty', 'the bounty'],
    ['.foot', 'the sea'],
    ['.hero', 'the top']
  ];

  let target = null;
  let queued = false;
  let saying = 0;

  const SEEN_KEY = 'strohut-seen-islands';
  const MARKS = 8;
  let seen = 0;
  try { seen = Math.min(MARKS, Math.max(0, parseInt(sessionStorage.getItem(SEEN_KEY), 10) || 0)); } catch { /* fine */ }
  const record = n => {
    if (n <= seen) return;
    seen = Math.min(MARKS, n);
    pose.style.setProperty('--seen', seen);
    try { sessionStorage.setItem(SEEN_KEY, String(seen)); } catch { /* fine */ }
    written();
    bounty();
  };
  pose.style.setProperty('--seen', seen);

  const log = document.getElementById('log');

  const written = () => {
    if (!log) return;

    const bits = [];
    if (seen) bits.push(`${seen} ${seen === 1 ? 'region' : 'regions'} gone past`);
    const landed = typeof total === 'number' ? total : 0;
    const run = typeof best === 'number' ? best : 0;
    if (landed) bits.push(`${landed} ${landed === 1 ? 'flash' : 'flashes'} landed`);
    if (run > 1) bits.push(`${run} in a row at best`);

    const rank = document.getElementById('grade-name');
    if (rank && rank.textContent && rank.textContent !== 'grade four') bits.push(rank.textContent);

    log.textContent = bits.length ? `this visit · ${bits.join(' · ')}` : '';
    log.hidden = !bits.length;
  };

  const bountySum = document.getElementById('bounty-sum');
  const bountyLed = document.getElementById('bounty-led');
  const poster = document.querySelector('.poster');

  const berry = n => `<svg class="berry" viewBox="0 0 24 30" aria-hidden="true"><use href="#berry"></use></svg>${n.toLocaleString('en-US')}`;
  let priced = -1;
  let counting = 0;

  const bounty = () => {
    if (!bountySum || !bountyLed) return;

    const figure = id => parseInt((document.getElementById(id) || { textContent: '' }).textContent, 10) || 0;
    const landed = figure('score-total');
    const run = figure('score-best');
    const sparks = figure('score-adapt');
    const grade = (document.getElementById('grade-name') || { textContent: '' }).textContent;

    const lines = [];
    if (seen) lines.push([`${seen} ${seen === 1 ? 'region' : 'regions'} gone past`, seen * 3000000]);
    if (landed) lines.push([`${landed} ${landed === 1 ? 'flash' : 'flashes'} landed`, landed * 10000000]);
    if (run > 1) lines.push([`a run of ${run}`, run * 20000000]);
    if (sparks) lines.push([`${sparks} ${sparks === 1 ? 'spark' : 'sparks'}`, sparks * 30000000]);
    if (run >= 5) lines.push(['a domain of your own', 100000000]);
    if (grade === 'special grade') lines.push(['special grade', 500000000]);

    const sum = lines.reduce((s, [, b]) => s + b, 0);
    if (sum === priced) return;
    const was = Math.max(0, priced);
    priced = sum;

    bountyLed.innerHTML = lines
      .map(([what, b]) => `<li><span>${what}</span><b>${berry(b)}</b></li>`).join('');

    cancelAnimationFrame(counting);
    if (stillPlease.matches || sum <= was) {
      bountySum.textContent = sum.toLocaleString('en-US');
    } else {
      const t0 = performance.now();
      const step = now => {
        const t = Math.min(1, (now - t0) / 700);
        const eased = 1 - (1 - t) ** 3;
        bountySum.textContent = Math.round(was + (sum - was) * eased).toLocaleString('en-US');
        if (t < 1) counting = requestAnimationFrame(step);
      };
      counting = requestAnimationFrame(step);
      if (poster) {
        poster.classList.remove('is-raised');
        void poster.offsetWidth;
        poster.classList.add('is-raised');
      }
    }
  };

  addEventListener('strohut:score', written);
  addEventListener('strohut:score', bounty);
  written();
  bounty();

  const islands = () => ISLANDS
    .map(([sel, name]) => [document.querySelector(sel), name])
    .filter(([el]) => el && el.offsetParent !== null && !el.hidden);

  const look = () => {
    queued = false;
    const list = islands();
    if (!list.length) return;

    const mid = innerHeight * .55;
    const landed = scrollY + innerHeight >= (document.documentElement.scrollHeight - 8);
    let found = landed ? list[list.length - 1]
      : list.find(([el, name]) => name !== 'the top' && el.getBoundingClientRect().bottom > mid);
    if (!found) found = list[list.length - 1];

    if (found[0] !== target) {
      target = found[0];
      poseName.textContent = found[1];
      pose.classList.add('is-saying');
      clearTimeout(saying);
      saying = setTimeout(() => pose.classList.remove('is-saying'), 2400);
    }

    const on = !landed && found[0].getBoundingClientRect().top <= mid;
    if (poseTo) {
      poseTo.textContent = pose.classList.contains('is-full') ? 'logged' : on ? 'here' : 'next';
    }

    const ahead = list.filter(([, name]) => name !== 'the top');
    const reached = ahead.filter(([el]) => el.getBoundingClientRect().top <= mid).length;

    record(landed ? ahead.length : reached);

    if (ahead.length && seen >= ahead.length && !pose.classList.contains('is-full')) {
      pose.classList.add('is-full');
      if (poseTo) poseTo.textContent = 'logged';
      poseName.textContent = 'the log is full';
      pose.classList.add('is-saying');
      clearTimeout(saying);
      saying = setTimeout(() => {
        pose.classList.remove('is-saying');
        poseName.textContent = found[1];
      }, 3000);
    }

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



/* Intl handles Europe/Berlin daylight-saving changes. */

const clock = document.getElementById('clock');

if (clock) {
  const face = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', hour12: false
  });

  const hourOf = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin', hour: 'numeric', hour12: false
  });

  const sun = () => {
    const h = (Number(hourOf.format(new Date())) || 0) % 24;
    return Number(((Math.cos((h - 13) / 24 * Math.PI * 2) + 1) / 2).toFixed(3));
  };

  let lastSun = -1;
  const tick = () => {
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



const LIKED = [
  { key: 'jjk', title: 'Jujutsu Kaisen', format: 'MANGA' },
  { key: 'gohs', title: 'The God of High School', format: 'MANHWA' },
  { key: 'op', title: 'One Piece', format: 'MANGA' }
];

const AUTHORED_FAVOURITES = LIKED.map(({ key, title, format }) => ({
  key,
  authored: true,
  book: { title: { romaji: title }, format }
}));

const likeBox = document.getElementById('likes');
const likeList = document.getElementById('like-list');

const LIKE_FIELDS = `
  id siteUrl format status chapters volumes episodes genres
  title { romaji english native }
  coverImage { large }
  startDate { year }`;

if (likeBox && likeList) {
  /* Resolve all favourites in one aliased Page query. */
  const query = `{${LIKED.flatMap(l => [
    `${l.key}_book: Page(perPage: 5) { media(search: ${JSON.stringify(l.title)}, type: MANGA) {${LIKE_FIELDS}} }`,
    `${l.key}_screen: Page(perPage: 5) { media(search: ${JSON.stringify(l.title)}, type: ANIME) {${LIKE_FIELDS}} }`
  ]).join('\n')}}`;

  const LIKE_SHELF = 'strohut-liked-2';
  let drawn = '';

  const draw = (got, source = 'anilist') => {
    likeBox.dataset.source = source;
    const same = JSON.stringify(got);
    if (same === drawn) return;
    drawn = same;
    whenOpen(() => {
      likeList.replaceChildren(...got.map((e, i) => likeRow(e, i)));
      likeBox.hidden = false;
      likeBox.classList.add('is-in');
    });
  };

  const authoredRows = [...likeList.children];
  const authoredMarkup = authoredRows.length === AUTHORED_FAVOURITES.length &&
    authoredRows.every((row, i) => row.dataset.fallback === 'true' &&
      row.querySelector('.like-name')?.textContent.trim() === LIKED[i].title);

  if (authoredMarkup) {
    drawn = JSON.stringify(AUTHORED_FAVOURITES);
    likeBox.dataset.source = 'authored';
    likeBox.hidden = false;
  } else {
    queueMicrotask(() => draw(AUTHORED_FAVOURITES, 'authored'));
  }

  queueMicrotask(() => {
    const kept = unstash(LIKE_SHELF);
    if (Array.isArray(kept) && kept.length && kept.every(e => e && e.book)) draw(kept, 'cache');
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

      /* Match returned titles explicitly; search order is not authoritative. */
      const hit = (alias, asked) => {
        const page = data[alias];
        const list = (page && Array.isArray(page.media)) ? page.media : [];
        return list.find(m => m && m.title && answersTo(m.title, asked)) || null;
      };

      const got = LIKED
        .map(l => ({ key: l.key, book: hit(`${l.key}_book`, l.title), screen: hit(`${l.key}_screen`, l.title) }))
        .filter(e => e.book);

      if (!got.length) return;

      draw(got, 'anilist');
      stash(LIKE_SHELF, got);
    })
    .catch(() => {
    });
}

const nameOf = t => t.romaji || t.english || t.native || '';

const plain = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function answersTo(title, asked) {
  const want = plain(asked).replace(/^the /, '');
  if (!want) return false;

  return [title.romaji, title.english, title.native]
    .filter(Boolean)
    .some(t => plain(t).replace(/^the /, '') === want);
}

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
  if (entry.authored) {
    li.classList.add('like-fallback');
    li.dataset.fallback = 'true';
  }

  const plate = document.createElement('div');
  plate.className = 'cover';

  if (!entry.authored) {
    const art = document.createElement('img');
    art.alt = '';
    art.loading = 'lazy';
    art.width = 230;
    art.height = 345;
    art.addEventListener('load', () => art.classList.add('is-there'));
    art.addEventListener('error', () => art.classList.remove('is-there'));
    if (media.coverImage && media.coverImage.large) art.src = media.coverImage.large;
    plate.append(art);
  }

  const void_ = document.createElement('span');
  void_.className = 'cover-void';
  void_.setAttribute('aria-hidden', 'true');
  plate.append(void_);
  li.append(plate);

  const body = document.createElement('div');
  body.className = 'like-text';

  const name = document.createElement('p');
  name.className = 'like-name';
  const label = document.createElement(entry.authored ? 'span' : 'a');
  if (!entry.authored) label.href = media.siteUrl || 'https://anilist.co';
  label.textContent = nameOf(media.title);
  name.append(label);
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


const el = {
  slab: document.querySelector('.now .slab'),
  avatar: document.getElementById('dc-avatar'),
  dot: document.getElementById('dc-dot'),
  name: document.getElementById('dc-name'),
  state: document.getElementById('dc-state'),
  doing: document.getElementById('dc-doing'),
  quiet: document.getElementById('dc-quiet'),
  where: document.getElementById('dc-where'),
  frame: document.getElementById('dc-frame')
};

function stash(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
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

// Reveal the portrait only after load; keep the fallback on CDN failure.
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

// Fill from REST first; a socket update wins if it arrives earlier.
fetch(`https://api.lanyard.rest/v1/users/${DISCORD_ID}`)
  .then(response => response.json())
  .then(body => {
    if (body.success && !lastPresence) render(body.data);
  })
  .catch(() => {
    /* Let the socket connect even if the REST request fails. */
  });

/* Reconnect with bounded backoff and reset it after a successful open. */
const RETRY_MIN = 4000;
const RETRY_MAX = 120000;
let retryIn = RETRY_MIN;
let retryTimer = 0;
let live = null;

connect();

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
    // Do not reassign an unchanged avatar URL; it restarts animated images.
    if (el.avatar.src !== url) el.avatar.src = url;
  } else {
    showPortrait(false);
    el.avatar.removeAttribute('src');
  }

  el.dot.className = `dot is-${status}`;

  const on = [
    data.active_on_discord_desktop && 'desktop',
    data.active_on_discord_mobile && 'phone',
    data.active_on_discord_web && 'browser'
  ].filter(Boolean);
  el.where.textContent = status !== 'offline' && on.length ? on.join(' and ') : '';
  el.where.hidden = !el.where.textContent;

  const frame = user.avatar_decoration_data && user.avatar_decoration_data.asset;
  el.frame.hidden = !frame;
  if (frame) {
    const url = `https://cdn.discordapp.com/avatar-decoration-presets/${frame}.png?size=160`;
    if (el.frame.src !== url) el.frame.src = url;
  } else {
    el.frame.removeAttribute('src');
  }

  const activities = Array.isArray(data.activities) ? data.activities : [];
  const custom = activities.find(a => a.type === 4);
  const customText = custom && [custom.emoji?.name, custom.state].filter(Boolean).join(' ');
  el.state.textContent = customText || STATUS_TEXT[status] || status;

  const doing = activities.filter(a => a.type !== 4 && a.name !== 'Spotify');
  el.doing.replaceChildren(...doing.map(activityRow));
  el.quiet.hidden = doing.length > 0 || Boolean(customText);
}

const DOING_KIND = {
  0: 'playing',
  1: 'streaming',
  2: 'listening to',
  3: 'watching',
  5: 'competing in'
};

function activityRow(activity, i) {
  const li = document.createElement('li');
  li.style.setProperty('--i', i);
  const plate = document.createElement('span');
  plate.className = 'no-art';
  plate.setAttribute('aria-hidden', 'true');

  const url = artworkUrl(activity);
  if (url) {
    const img = document.createElement('img');
    img.src = url;
    img.alt = '';
    img.loading = 'lazy';
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

  // Discord may proxy third-party artwork through an mp:external asset key.
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

function fail() {
  liveTimers.forEach(clearInterval);
  liveTimers = [];

  el.slab.dataset.state = 'ready';
  el.name.textContent = 'Strohut';
  el.state.textContent = "can't reach discord right now";
  el.doing.replaceChildren();
  el.quiet.hidden = true;
}
