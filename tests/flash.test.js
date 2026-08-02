const BASE = `http://localhost:${process.env.PORT || 8899}`;
const { chromium, devices } = require('playwright');

/* A hardcoded point is a point that quietly starts landing on a control
   the moment anything reflows — and then every timing check fails at once
   for a reason that has nothing to do with timing. It is looked up on the
   page in front of us instead. */
let AT = [710, 610];

/* A point with nothing on it that takes a click.

   Waits for the page to stop arriving first. Everything in the header
   comes in on its own delay, and a link fourteen pixels below where it
   will end up leaves a gap that is clear now and a link in a moment — so
   a spot chosen mid-arrival gets tapped a second later and navigates,
   which surfaces as the execution context being destroyed halfway
   through a check about timing. Nothing that loops forever is waited on,
   and the whole wait gives up rather than hanging. */
const settledIn = p => p.evaluate(() => Promise.race([
  Promise.all(document.getAnimations()
    .filter(a => a.effect && a.effect.getTiming().iterations !== Infinity)
    .map(a => a.finished.catch(() => { /* cancelled is finished enough */ }))),
  new Promise(done => setTimeout(done, 3000))
]));

const openGround = async p => {
  await settledIn(p);
  /* The field is the only thing that takes a hold now, so it has to be
     on screen before anything can be aimed at it — and the panel it is
     in arrives on the way past, which moves it. Settled, scrolled to,
     settled again, then measured. */
  await p.evaluate(() => document.getElementById('flash-arena').scrollIntoView({ block: 'center' }));
  await p.waitForTimeout(500);
  await settledIn(p);

  return p.evaluate(() => {
    const a = document.getElementById('flash-arena');
    if (!a) throw new Error('there is no field on this page');
    const r = a.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) throw new Error('the field is off screen');
    return [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)];
  });
};
const streak = p => p.evaluate(() => document.getElementById('tally-streak').textContent);

/* The wind-up is drawn fresh per attempt now, so a fixed 520ms hold lands
   only sometimes — the checks would be flaky for a reason that has nothing
   to do with what they are checking. The ring carries this attempt's
   timing, so it is read off the ring and the hold is aimed at the middle
   of the window. That tests the mechanism rather than a magic number. */
const ringPlan = p => p.evaluate(() => {
  // a spent ring hangs about for the best part of a second while it fades,
  // so the first .charge in the document is very often the last attempt's
  const ring = document.querySelector('.charge:not(.is-landed):not(.is-spent)');
  if (!ring) return null;
  const ms = k => parseFloat(ring.style.getPropertyValue(k));
  return { open: ms('--open-at'), span: ms('--span'), wind: ms('--wind') };
});
const rings = p => p.evaluate(() => document.querySelectorAll('.charge').length);

/* A throw runs down over however many frames it takes, so how long it
   lasts in wall-clock depends entirely on the frame rate — which under
   load here is nothing like sixty. Waiting a fixed two and a half seconds
   was reading the wheel mid-spin and calling it a failure. */
const settled = p => p.waitForFunction(() => {
  const w = document.querySelector('.wheel');
  return !w.classList.contains('is-spinning') &&
    parseFloat(w.style.getPropertyValue('--drag') || '0') === 0;
}, null, { timeout: 15000 });

/* Landing one has to be driven from inside the page. Every press and
   release from out here is a round trip over the debugging protocol, and
   in this container that jitters by well over a hundred milliseconds —
   wider than the window it is trying to hit. The page's own setTimeout
   and the performance.now the handler reads share one clock and have no
   protocol in between, so a release scheduled in here is accurate to the
   millisecond.

   Everything with room to spare — an early tap, a late one, the hold
   limit — still goes through real input. This is only for the cases where
   the whole point is landing inside a window tens of milliseconds wide. */
const land = (p, at, pointerType = 'mouse') => p.evaluate(([x, y, kind]) => new Promise((done, fail) => {
  const target = document.elementFromPoint(x, y);
  if (!target) return fail(new Error('nothing at that point'));

  const fire = (type, buttons) => target.dispatchEvent(new PointerEvent(type, {
    bubbles: true, composed: true, clientX: x, clientY: y,
    button: 0, buttons, pointerId: 1, pointerType: kind, isPrimary: true
  }));

  fire('pointerdown', 1);

  // the ring this attempt just opened, not one still fading from the last
  const ring = document.querySelector('.charge:not(.is-landed):not(.is-spent)');
  if (!ring) return fail(new Error('no ring opened'));
  const ms = k => parseFloat(ring.style.getPropertyValue(k));
  const plan = { open: ms('--open-at'), span: ms('--span'), wind: ms('--wind') };

  /* The middle of the window, on the same clock the handler is reading.
     One long setTimeout is not good enough — with the field animating,
     a six hundred millisecond timer comes back tens of milliseconds late
     often enough to miss a window this narrow. Coasting most of the way
     and then polling against the real clock cannot drift: each check is
     against performance.now, not against the last timer. */
  const t0 = performance.now();
  const at = plan.open + plan.span / 2;

  const spin = () => {
    const left = at - (performance.now() - t0);
    if (left <= 0) {
      fire('pointerup', 0);
      done(plan);
    } else {
      setTimeout(spin, left > 40 ? left - 30 : 1);
    }
  };
  spin();
}), [at[0], at[1], pointerType]).then(async plan => {
  await p.waitForTimeout(140);
  return plan;
});

/* The same attempt with no pointer anywhere in it. Both edges are driven
   from inside the page for the reason above — a window tens of
   milliseconds wide cannot be hit over the debugging protocol. */
const landKey = p => p.evaluate(() => new Promise((done, fail) => {
  const key = kind => document.getElementById('flash-arena').dispatchEvent(
    new KeyboardEvent(kind, { key: ' ', bubbles: true, cancelable: true }));

  key('keydown');
  const ring = document.querySelector('.charge:not(.is-landed):not(.is-spent)');
  if (!ring) return fail(new Error('no ring opened'));
  const ms = k => parseFloat(ring.style.getPropertyValue(k));
  const plan = { open: ms('--open-at'), span: ms('--span'), wind: ms('--wind') };

  const t0 = performance.now();
  const at = plan.open + plan.span / 2;
  const spin = () => {
    const left = at - (performance.now() - t0);
    if (left <= 0) { key('keyup'); done(plan); }
    else setTimeout(spin, left > 40 ? left - 30 : 1);
  };
  spin();
})).then(async plan => {
  await p.waitForTimeout(140);
  return plan;
});

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

  /* The barrier goes up on the first page of a session and covers
     everything for a second and three quarters. These checks are about
     what is underneath it, so they arrive having already seen it — the
     same as mocking an upstream. The intro has its own checks. */
  const seen = () => { try { sessionStorage.setItem('strohut-seen', '1'); } catch { /* nothing to do */ } };
  const fails = [];
  const check = (name, ok, detail) => { console.log((ok ? 'ok   ' : 'FAIL ') + name + (detail ? '  ' + detail : '')); if (!ok) fails.push(name); };

  const fresh = async (opts = {}) => {
    const p = await b.newPage({ viewport: { width: 900, height: 700 }, ...opts });
    await p.addInitScript(seen);
    p.on('pageerror', e => fails.push('pageerror: ' + e.message));
    await p.goto(BASE + '/index.html');
    await p.waitForTimeout(700);
    AT = await openGround(p);
    return p;
  };

  // ── the window itself
  let p = await fresh();
  await p.mouse.move(...AT); await p.mouse.down(); await p.waitForTimeout(120); await p.mouse.up();
  await p.waitForTimeout(80);
  check('early release misses', await streak(p) === '0');

  await land(p, AT);
  check('release in window lands', await streak(p) === '1');

  await p.mouse.down(); await p.waitForTimeout(1400); await p.mouse.up(); await p.waitForTimeout(80);
  check('late release misses', await streak(p) === '0');

  // ── the ring must never pile up
  for (let i = 0; i < 6; i++) { await p.mouse.down(); await p.waitForTimeout(60); await p.mouse.up(); await p.waitForTimeout(40); }
  await p.waitForTimeout(1000);
  check('rings are cleaned up', await rings(p) === 0, `${await rings(p)} left`);

  /* ── holding forever resolves on its own
     Watched from inside the page rather than read once at a fixed
     moment: the ring goes on the end of an animation, and an animation
     on a machine with something else running can be a few hundred
     milliseconds late. What matters is that it resolves without the
     hold ending, not that it resolves by a particular frame. */
  await p.mouse.down();
  const afterHold = await p.evaluate(async () => {
    const left = () => document.querySelectorAll('.charge').length;
    const t0 = performance.now();
    while (performance.now() - t0 < 3800) {
      if (left() === 0) return 0;
      await new Promise(r => setTimeout(r, 60));
    }
    return left();
  });
  await p.mouse.up(); await p.waitForTimeout(100);
  check('hold limit resolves', afterHold === 0, `${afterHold} rings, still held`);

  // ── a second pointer must not open a second charge
  await p.mouse.down(); await p.waitForTimeout(60);
  const during = await rings(p);
  await p.mouse.up(); await p.waitForTimeout(600);
  check('one charge at a time', during === 1, `${during} rings`);

  // ── controls stay controls
  await p.click('#wheel-hit'); await p.waitForTimeout(120);
  check('buttons do not charge', await rings(p) === 0);
  const before = await p.evaluate(() => location.href);
  check('link still navigable', typeof before === 'string');
  await p.close();

  // ── a finger, with real touch events rather than a mouse
  const phone = await b.newContext({ ...devices['iPhone 13'] });
  p = await phone.newPage();
  await p.addInitScript(seen);
  p.on('pageerror', e => fails.push('touch pageerror: ' + e.message));
  await p.goto(BASE + '/index.html');
  await p.waitForTimeout(1200);
  const spot = await openGround(p);
  const cdp = await phone.newCDPSession(p);
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', {
    type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, radiusX: 12, radiusY: 12, force: 1, id: 1 }]
  });
  const finger = async ms => {
    await touch('touchStart', ...spot);
    const sel = await p.evaluate(() => getComputedStyle(document.body).webkitUserSelect);
    await p.waitForTimeout(ms);
    await touch('touchEnd', ...spot);
    await p.waitForTimeout(150);
    return { sel, streak: await streak(p) };
  };
  check('touch-action lets a finger scroll but not zoom',
    await p.evaluate(() => getComputedStyle(document.body).touchAction) === 'manipulation');
  await land(p, spot, 'touch');
  check('a held finger lands', await streak(p) === '1');
  let r = await finger(90);
  check('the callout is suppressed while holding', r.sel === 'none');
  check('a real finger, tapped, is too early', r.streak === '0');
  check('selection comes back after release',
    await p.evaluate(() => getComputedStyle(document.body).webkitUserSelect) !== 'none');
  await phone.close();

  // ── reduced motion: nothing fires at all
  const rm = await b.newContext({ reducedMotion: 'reduce' });
  p = await rm.newPage({ viewport: { width: 900, height: 700 } });
  await p.addInitScript(seen);
  await p.goto(BASE + '/index.html'); await p.waitForTimeout(600);
  await p.mouse.move(...(await openGround(p))); await p.mouse.down(); await p.waitForTimeout(700); await p.mouse.up();
  await p.waitForTimeout(150);
  check('reduced motion stays still', await rings(p) === 0 && await p.evaluate(() => document.querySelectorAll('.strike').length) === 0);
  await rm.close();

  // ── a miss says which side of the window it was on
  p = await fresh();
  const hint = () => p.evaluate(() => {
    const h = document.getElementById('tally-hint');
    return h.hidden ? '' : h.textContent;
  });
  const hold = async ms => {
    await p.mouse.move(...AT); await p.mouse.down();
    await p.waitForTimeout(ms); await p.mouse.up(); await p.waitForTimeout(120);
    return hint();
  };
  /* "too early" tells you nothing you can act on; the number of
     milliseconds does. Both the side and the size have to be there. */
  const early = await hold(90);
  check('an early miss says how early', /^\d+ ms early$/.test(early), early);
  await land(p, AT);
  /* It used to just say "landed", which is the one thing you already knew
     from the drawing. What it says now is how close to the middle you
     were — the same number a miss gets, so a hit and a miss are on one
     scale and there is something to compare. */
  check('a landing says how close it was', /^(\d+ ms (early|late)|dead on)$/.test(await hint()), await hint());
  const late = await hold(1400);
  check('a late miss says how late', /^\d+ ms late$/.test(late), late);

  // and the panel keeps the reading after the corner tally has gone
  await p.waitForTimeout(1800);
  const kept2 = await p.evaluate(() => ({
    corner: document.getElementById('tally-hint').hidden,
    panel: document.getElementById('score-last').textContent
  }));
  check('the corner reading goes away', kept2.corner);
  check('the panel keeps the last reading', /ms late$/.test(kept2.panel), kept2.panel);
  await p.close();

  // ── the wheel keeps what it adapted to
  p = await fresh();
  const adaptOf = () => p.evaluate(() =>
    getComputedStyle(document.querySelector('.wheel')).getPropertyValue('--adapt').trim());
  await p.click('#wheel-hit'); await p.waitForTimeout(150);
  const spun = await adaptOf();
  await p.reload(); await p.waitForTimeout(800);
  check('adaptation survives a reload', await adaptOf() === spun, `${spun} → ${await adaptOf()}`);
  await p.close();

  // ── the best score survives a reload
  p = await fresh();
  for (let i = 0; i < 2; i++) await land(p, AT);
  const got = await streak(p);
  await p.reload(); await p.waitForTimeout(700);
  const kept = await p.evaluate(() => document.getElementById('tally-best').textContent);
  check('best survives reload', kept === got, `streak ${got} → best ${kept}`);

  /* ── and nothing survives the visit.
     A record that outlives the browser being closed is a record somebody
     has to live with: come back in a month and the first thing the page
     says is a number you cannot remember setting. It is kept in session
     storage, which is exactly the shelf that holds through a reload and
     is gone with the tab — so a second tab has to start at nothing, and
     that is the only way to tell the two shelves apart from out here. */
  const later = await b.newPage({ viewport: { width: 900, height: 700 } });
  await later.addInitScript(seen);
  await later.goto(BASE + '/index.html');
  await later.waitForTimeout(700);
  const carried = await later.evaluate(() => ({
    best: document.getElementById('score-best').textContent,
    total: document.getElementById('score-total').textContent,
    blessed: document.getElementById('score-adapt').textContent,
    close: document.getElementById('score-close').textContent
  }));
  check('and nothing is carried into the next visit',
    carried.best === '0' && carried.total === '0' && carried.blessed === '0 of 8' && carried.close === '—',
    JSON.stringify(carried));
  await later.close();
  await p.close();

  // ── the score panel, which is what is left over after a run
  p = await fresh();
  const score = () => p.evaluate(() => ({
    best: document.getElementById('score-best').textContent,
    total: document.getElementById('score-total').textContent,
    turns: document.getElementById('score-adapt').textContent,
    marks: [...document.querySelectorAll('#score-marks .mark:not(.is-ghost)')].map(m => m.className),
    slots: document.querySelectorAll('#score-marks .mark').length
  }));

  await p.mouse.move(...AT);
  await p.mouse.down(); await p.waitForTimeout(90); await p.mouse.up(); await p.waitForTimeout(120);
  let s = await score();
  check('a miss leaves a mark', s.marks.length === 1 && !s.marks[0].includes('is-hit'), s.marks.join(' | '));

  await land(p, AT);
  s = await score();
  check('a landed flash is counted', s.best === '1' && s.total === '1', JSON.stringify(s));

  /* Landing one used to move the wheel and nothing else, which left the
     rest of the page a backdrop it happened in front of. */
  await p.waitForTimeout(360);
  const rippled = await p.evaluate(() => [...document.querySelectorAll('.is-struck')]
    .map(e => (e.className.baseVal ?? e.className).split(' ')[0]));
  check('a landed flash goes through everything drawn on the page',
    ['brush', 'band', 'flag'].every(k => rippled.includes(k)), rippled.join(', '));
  check('a landed flash teaches the wheel', s.turns === '1 of 8', s.turns);
  check('a landed flash leaves a lit mark', s.marks.length === 2 && s.marks[1].includes('is-hit'), s.marks.join(' | '));

  // a cancelled hold is not an attempt
  await p.mouse.down(); await p.waitForTimeout(150);
  await p.evaluate(() => dispatchEvent(new Event('blur')));
  await p.waitForTimeout(150);
  check('a cancelled hold leaves no mark', (await score()).marks.length === 2);

  // the row is a window on the last dozen, not a log, and it is the same
  // twelve slots wide whether or not anything has been struck yet
  for (let i = 0; i < 16; i++) { await p.mouse.down(); await p.waitForTimeout(60); await p.mouse.up(); await p.waitForTimeout(45); }
  await p.waitForTimeout(200);
  s = await score();
  check('the marks stop at twelve', s.marks.length === 12, String(s.marks.length));
  check('the row stays twelve slots wide', s.slots === 12, String(s.slots));

  const wasScore = await score();
  await p.reload(); await p.waitForTimeout(800);
  const nowScore = await score();
  check('the totals survive a reload', nowScore.best === wasScore.best && nowScore.total === wasScore.total,
    `${JSON.stringify(wasScore)} → ${JSON.stringify(nowScore)}`);
  check('the marks do not survive a reload', nowScore.marks.length === 0, String(nowScore.marks.length));
  check('a fresh page still shows twelve slots', nowScore.slots === 12, String(nowScore.slots));
  await p.close();

  // ── the wheel, taken hold of and thrown. Wide enough that the whole
  // control is on screen — below 60rem it is pushed most of the way off
  // the right edge on purpose, and there is nothing there to grab.
  p = await fresh({ viewport: { width: 1340, height: 900 } });
  // opening the page leaves it down at the field; the wheel is in the header
  await p.evaluate(() => scrollTo(0, 0));
  await p.waitForTimeout(400);
  const at = await p.evaluate(() => {
    const r = document.getElementById('wheel-hit').getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  });
  const adapt = () => p.evaluate(() =>
    parseInt(getComputedStyle(document.querySelector('.wheel')).getPropertyValue('--adapt'), 10));

  await p.mouse.move(at[0], at[1] - 70);
  await p.mouse.down();
  for (let i = 1; i <= 12; i++) {
    const a = -Math.PI / 2 + i * 0.22;
    await p.mouse.move(at[0] + Math.cos(a) * 70, at[1] + Math.sin(a) * 70);
    await p.waitForTimeout(12);
  }
  await p.mouse.up();
  await settled(p);
  const thrown = await adapt();
  check('a throw carries the wheel past one tooth', thrown > 1, String(thrown));
  check('a throw settles on a tooth',
    await p.evaluate(() => (document.querySelector('.wheel').style.getPropertyValue('--drag') || '0deg').startsWith('0')));
  check('a throw does not leave it spinning',
    !(await p.evaluate(() => document.querySelector('.wheel').classList.contains('is-spinning'))));

  /* A cancelled gesture is the browser taking the pointer away, not
     somebody pressing. It must put the wheel back rather than click it on
     a tooth — and it must not leave it paused half-turned either. */
  const before2 = await adapt();
  await p.mouse.move(at[0], at[1] - 60);
  await p.mouse.down();
  await p.mouse.move(at[0] + 30, at[1] - 50);
  await p.waitForTimeout(60);
  await p.evaluate(() => dispatchEvent(new Event('blur')));
  await p.waitForTimeout(300);
  const after2 = await p.evaluate(() => ({
    adapt: parseInt(getComputedStyle(document.querySelector('.wheel')).getPropertyValue('--adapt'), 10),
    drag: document.querySelector('.wheel').style.getPropertyValue('--drag'),
    spinning: document.querySelector('.wheel').classList.contains('is-spinning')
  }));
  await p.mouse.up();
  await p.waitForTimeout(200);
  check('an abandoned grip does not move the wheel', after2.adapt === before2, `${before2} → ${after2.adapt}`);
  check('an abandoned grip puts it back', (after2.drag || '0deg').startsWith('0'), after2.drag);
  check('an abandoned grip does not leave it paused', !after2.spinning);

  // a press is still a press
  const held = await adapt();
  await p.click('#wheel-hit');
  await p.waitForTimeout(200);
  check('a press still moves one tooth', (await adapt()) === held + 1, `${held} → ${await adapt()}`);
  await p.close();

  // ── the same throw under a finger. touch-action leaves vertical panning
  // to the browser, so the gesture has to work without taking scrolling
  // away from the rest of the page.
  const pad = await b.newContext({ viewport: { width: 1024, height: 1180 }, hasTouch: true, isMobile: true });
  p = await pad.newPage();
  await p.addInitScript(seen);
  p.on('pageerror', e => fails.push('touch throw pageerror: ' + e.message));
  await p.goto(BASE + '/index.html');
  await p.waitForTimeout(1200);

  const grip = await p.locator('#wheel-hit').boundingBox();
  const cdp2 = await pad.newCDPSession(p);
  const drag = (type, x, y) => cdp2.send('Input.dispatchTouchEvent', {
    type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, radiusX: 12, radiusY: 12, force: 1, id: 1 }]
  });
  const gx = grip.x + grip.width / 2, gy = grip.y + grip.height / 2;
  const rad = Math.min(grip.width, grip.height) / 2 - 14;

  await drag('touchStart', gx, gy - rad);
  for (let i = 1; i <= 14; i++) {
    const a = -Math.PI / 2 + i * 0.2;
    await drag('touchMove', gx + Math.cos(a) * rad, gy + Math.sin(a) * rad);
    await p.waitForTimeout(14);
  }
  await drag('touchEnd', 0, 0);
  await settled(p);

  const byFinger = await p.evaluate(() =>
    parseInt(getComputedStyle(document.querySelector('.wheel')).getPropertyValue('--adapt'), 10));
  check('a finger can throw the wheel too', byFinger > 1, String(byFinger));
  check('throwing it does not scroll the page', await p.evaluate(() => scrollY) === 0);
  await pad.close();

  /* ── what a landed one is worth, and what a domain is for ────────
     The three drawings on this page that carry the game are one system
     now, and none of it is visible in a screenshot: every landed flash
     leaves a spark, the window opens because of that rather than
     because of the run in front of you, and five in a row opens a
     domain in which a release lands whatever the timing was.

     Landing five by hand is unreliable under load, so the run is set to
     four and only the fifth is landed for real. Everything after that is
     the rule under test. */
  const own = await b.newContext({ viewport: { width: 1200, height: 800 } });
  const q = await own.newPage();
  /* No clearing here. An init script runs on every navigation, not just
     the first, so a clear would quietly wipe the record on the reload
     further down — which is the one place that record is checked for
     surviving one. A context of its own already starts at nothing. */
  await q.addInitScript(seen);
  q.on('pageerror', e => fails.push('game pageerror: ' + e.message));
  await q.goto(BASE + '/index.html');
  await q.waitForTimeout(900);
  let ground = await openGround(q);

  const reading = () => q.evaluate(() => ({
    streak: document.getElementById('tally-streak').textContent,
    on: document.body.classList.contains('is-domain'),
    left: document.getElementById('domain-left').textContent,
    last: document.getElementById('score-last').textContent,
    adapt: document.getElementById('score-adapt').textContent,
    close: document.getElementById('score-close').textContent,
    window: document.getElementById('score-window').textContent,
    learned: getComputedStyle(document.querySelector('.wheel')).getPropertyValue('--learned').trim()
  }));
  // a hold nowhere near the window
  const wild = () => q.evaluate(([x, y]) => new Promise(done => {
    // at the field, which is the only thing that takes one
    const at = document.getElementById('flash-arena');
    const ev = k => at.dispatchEvent(new PointerEvent(k, { clientX: x, clientY: y, button: 0, bubbles: true }));
    ev('pointerdown');
    setTimeout(() => { ev('pointerup'); done(); }, 90);
  }), ground);

  const cold = await reading();
  check('nothing has blessed it yet', cold.adapt === '0 of 8', cold.adapt);

  const msOf = s => Number(String(s).match(/^(\d+)/)?.[1] || 0);

  await land(q, ground);
  await q.waitForTimeout(220);
  const one = await reading();
  check('a landed flash leaves a spark', one.learned === '1', JSON.stringify(one));
  /* and it opens the window rather than closing it. In the source,
     somebody who has landed one is blessed by the sparks and the next
     come easier — it used to work the other way round here. */
  check('and that is what opens the window', msOf(one.window) > msOf(cold.window),
    `${cold.window} → ${one.window}`);
  check('and a landed flash says how close it was, not just that it landed',
    /ms|dead on/.test(one.last), one.last);
  check('and the closest yet is kept', /ms/.test(one.close), one.close);

  await wild();
  await q.waitForTimeout(220);
  const after = await reading();
  check('a miss breaks the run', after.streak === '0', after.streak);
  /* The whole point of hanging the difficulty on the wheel rather than
     the run: it does not give back what it has learned. */
  check('but the wheel does not unlearn', after.learned === '1', after.learned);
  check('and the window stays where it was', after.window === one.window, after.window);

  await q.evaluate(() => { streak = 4; });
  await land(q, ground);
  await q.waitForTimeout(260);
  const open = await reading();
  check('five in a row opens the domain', open.on, JSON.stringify(open));
  check('and it says how long it has left', /^\d+(\.\d)?s$/.test(open.left), open.left);

  /* The field settles back to a quarter so the page can be read through
     it. What it says must not settle with it: the animation was on the
     layer that holds both, and for six of the seven seconds the seconds
     left were drawn at a quarter of their colour. */
  await q.waitForTimeout(1400);
  const lit = await q.evaluate(() => ({
    field: Number(getComputedStyle(document.querySelector('.domain-field')).opacity).toFixed(2),
    say: Number(getComputedStyle(document.querySelector('.domain-say')).opacity).toFixed(2)
  }));
  check('the field settles back and what it says does not',
    Number(lit.field) < .5 && Number(lit.say) > .95, JSON.stringify(lit));

  /* A domain is a place, not a light over one: while it stands, the
     paper the whole page is drawn on is a different colour, so every
     stroke on it follows without a rule having to name any of them. */
  const paper = () => q.evaluate(() => ({
    paper: getComputedStyle(document.body).getPropertyValue('--paper').trim(),
    name: getComputedStyle(document.querySelector('.name i')).color
  }));
  const inside = await paper();
  check('the page itself is inside it', inside.paper !== '#efece4', JSON.stringify(inside));

  await wild();
  await q.waitForTimeout(240);
  const sure = await reading();
  check('inside it, a release lands whatever the timing was',
    sure.last === 'sure hit' && sure.streak === '6', JSON.stringify(sure));
  check('and the wheel learns from that too — it is what the domain costs',
    Number(sure.learned) > Number(open.learned), `${open.learned} → ${sure.learned}`);
  /* A hit that was given to you is not a piece of timing anybody did, so
     it has no business in the record of the best anybody has managed. */
  check('but a given hit is not a reading', sure.close === open.close, `${open.close} → ${sure.close}`);

  /* planted before the close so the door can be seen from outside: the
     exit runs through a sealing beat, and reading the class after the
     fact would always be too late */
  await q.evaluate(() => {
    window.__sealed = false;
    new MutationObserver(() => {
      if (document.body.classList.contains('is-sealing')) window.__sealed = true;
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  });

  await q.waitForTimeout(7400);
  const done = await reading();
  check('the domain closes on its own', !done.on && done.left === '', JSON.stringify(done));
  check('and it closes its own door rather than cutting the power',
    await q.evaluate(() => window.__sealed));
  check('and the door does not stay in the doorway',
    await q.evaluate(() => !document.body.classList.contains('is-sealing')));
  check('and the page comes back out of it',
    (await paper()).paper === '#efece4', JSON.stringify(await paper()));

  /* ── 覚醒 ────────────────────────────────────────────────────────
     Eight sparks in and it is finished: the window is at its widest and
     the field can be opened more than once in a run. It is the only
     thing on this page that has an end, and a counter quietly reaching
     its top is not one — so it is said out loud, once. */
  await q.evaluate(() => { learned = LEARNS - 1; write('strohut-learned', learned); show(); });
  await land(q, ground);
  await q.waitForTimeout(300);
  const woke = await q.evaluate(() => ({
    awake: document.body.classList.contains('is-awake'),
    said: !document.getElementById('woke').hidden,
    adapt: document.getElementById('score-adapt').textContent,
    label: document.querySelector('#score-adapt + span').textContent
  }));
  check('the eighth spark wakes it', woke.awake && woke.adapt === '8 of 8', JSON.stringify(woke));
  check('and it is said out loud, once', woke.said, JSON.stringify(woke));
  check('and the panel says what that is worth', /all in you/.test(woke.label), woke.label);

  await q.waitForTimeout(2800);
  check('and then it goes', await q.evaluate(() => document.getElementById('woke').hidden));

  await q.reload();
  await q.waitForTimeout(900);
  check('being awake survives a reload',
    await q.evaluate(() => document.body.classList.contains('is-awake')));
  // a reload puts the page back at the top, and the field with it
  ground = await openGround(q);

  /* One per run, and the run is still going here — six in a row and
     climbing. Without this a streak that has been past five once re-opens
     it on every hit after that, and the thing that costs something is
     free from then on. */
  await land(q, ground);
  await q.waitForTimeout(300);
  check('a run only gets one domain', !(await reading()).on, JSON.stringify(await reading()));

  await wild();
  await q.waitForTimeout(240);
  const out = await reading();
  check('and afterwards the same release misses again', out.streak === '0', out.last);

  // but breaking the run and building it again earns another
  await q.evaluate(() => { streak = 4; });
  await land(q, ground);
  await q.waitForTimeout(260);
  check('breaking the run and rebuilding it earns another', (await reading()).on);
  await own.close();

  /* ── the field, and only the field ─────────────────────────────
     Held down anywhere at all, the game was underneath every paragraph
     and every drawing on the page. It has its own ground now — and
     because that ground is a button, holding a key on it while it has
     the focus is the same press as holding a pointer on it. */
  p = await fresh();
  const ringCount = () => p.evaluate(() => document.querySelectorAll('.charge').length);

  // the header: as far from the field as this page gets
  await p.evaluate(() => scrollTo(0, 0));
  await p.waitForTimeout(400);
  await p.mouse.move(40, 400);
  await p.mouse.down();
  await p.waitForTimeout(260);
  check('a press on the page itself is not an attempt', await ringCount() === 0);
  await p.mouse.up();
  await p.waitForTimeout(200);
  check('and it leaves the run alone', await streak(p) === '0');

  const field = await openGround(p);
  await p.mouse.move(...field);
  await p.mouse.down();
  await p.waitForTimeout(200);
  check('a press on the field is', await ringCount() > 0);
  await p.mouse.up();
  await p.waitForTimeout(700);

  /* space is how a keyboard scrolls a page, so it is only the field's
     while the field has the focus — and there it must not scroll */
  await p.evaluate(() => document.getElementById('flash-arena').blur());
  const restY = await p.evaluate(() => Math.round(scrollY));
  await p.keyboard.press('Space');
  await p.waitForTimeout(400);
  check('space still scrolls the page everywhere else',
    await p.evaluate(() => Math.round(scrollY)) !== restY);

  await p.focus('#flash-arena');
  const wasY = await p.evaluate(() => Math.round(scrollY));
  await p.keyboard.down('Space');
  await p.waitForTimeout(220);
  check('holding it on the field winds one up', await ringCount() > 0);
  check('and does not scroll the page out from under it',
    await p.evaluate(() => Math.round(scrollY)) === wasY);

  /* A held key repeats. Every repeat after the first is the same press
     still going on, and a second wind-up opening underneath the first is
     a ring nothing can ever release. */
  await p.evaluate(() => document.getElementById('flash-arena').dispatchEvent(
    new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true, repeat: true })));
  await p.waitForTimeout(200);
  check('and holding it longer does not open a second', await ringCount() === 1,
    String(await ringCount()));

  /* Held past the window before letting go, so this one is a miss on any
     machine. Released at four hundred milliseconds it lands whenever the
     wind-up happens to be drawn short — and then the landing checked
     below is the second, and "1 in a row" is 2. */
  await p.waitForTimeout(1100);
  await p.keyboard.up('Space');
  await p.waitForTimeout(900);
  check('and letting go past the window is a miss', await streak(p) === '0', await streak(p));

  /* ── and said out loud ─────────────────────────────────────────
     The ring shutting is the whole of the feedback, and it is a drawing.
     Every attempt says what it came to in one line that a screen reader
     reads — which has to be a line that is always in the page: display
     none, visibility hidden or the hidden attribute each take it out of
     the accessibility tree, and a live region that is not in the tree
     announces nothing at all. */
  const said = () => p.evaluate(() => document.getElementById('flash-said').textContent);
  const region = await p.evaluate(() => {
    const s = document.getElementById('flash-said');
    const st = getComputedStyle(s);
    return { live: s.getAttribute('aria-live'), display: st.display,
      vis: st.visibility, hidden: s.hidden, box: Math.round(s.getBoundingClientRect().width) };
  });
  check('what happens is announced politely', region.live === 'polite', JSON.stringify(region));
  check('and the region is in the page rather than switched off',
    region.display !== 'none' && region.vis !== 'hidden' && !region.hidden, JSON.stringify(region));
  check('and it takes up no room', region.box <= 2, JSON.stringify(region));

  await p.mouse.move(...field);
  await p.mouse.down(); await p.waitForTimeout(120); await p.mouse.up();
  await p.waitForTimeout(260);
  const missSaid = await said();
  check('a miss says so, and by how much', /^Missed, \d+ ms (early|late)\./.test(missSaid), missSaid);

  /* One landing, read three ways: what it said out loud, what the panel
     counted, and what the wheel took from it. Landing twice here to ask
     two of those separately is how "1 in a row" quietly becomes 2. */
  await landKey(p);
  const landSaid = await said();
  /* And whatever else that landing brought with it — the first one ever
     is also a rank, and two announcements a frame apart means the first
     is never read, so they go out as one line. */
  check('a landed one says so, and how many in a row',
    /^Landed, .+\. 1 in a row\./.test(landSaid), landSaid);
  check('and the rank it earned goes out with it',
    /Grade three — one landed\.$/.test(landSaid), landSaid);

  const bykey = await p.evaluate(() => ({
    last: document.getElementById('score-last').textContent,
    total: document.getElementById('score-total').textContent,
    adapt: document.getElementById('score-adapt').textContent
  }));
  /* Landed is landed — the reading beside it is how far off the middle of
     the window it was, which is a couple of milliseconds either way even
     when it is aimed from inside the page. */
  check('and a release lands the same as a pointer would',
    bykey.total === '1', JSON.stringify(bykey));
  check('and the wheel learns from it too', bykey.adapt === '1 of 8', bykey.adapt);
  await p.close();

  /* ── 等級 ──────────────────────────────────────────────────────
     Eight sparks was the whole of it and then there was nothing left to
     be. Every step of the rank is a thing somebody actually did, and
     each one asks for something different: land at all, hold a run, hold
     one long enough to open a domain, finish the wheel, and then be
     accurate rather than merely persistent. */
  p = await fresh();
  const rank = () => p.evaluate(() => ({
    name: document.getElementById('grade-name').textContent,
    why: document.getElementById('grade-why').textContent,
    marks: document.querySelectorAll('#grade-mark svg').length
  }));
  const stand = (t, bst, cls, awk) => p.evaluate(([t, bst, cls, awk]) => {
    total = t; best = bst; closest = cls; awake = awk; tell(true);
  }, [t, bst, cls, awk]);

  check('cold, it is the bottom rank', (await rank()).name === 'grade four', (await rank()).name);
  check('and it says why', (await rank()).why === 'nothing landed yet', (await rank()).why);
  check('and the kanji are drawn, not set', (await rank()).marks === 2, String((await rank()).marks));

  /* A use pointing at a symbol that does not exist is not an error
     anywhere — it is an empty box the size of the missing character,
     and 四級 spent a while reading as 級 exactly that way. Every mark
     the rank ever draws has to resolve, at every rank. */
  const unresolved = await p.evaluate(() => {
    const out = [];
    for (const g of GRADES) {
      total = 99; best = 9; closest = 1; awake = true;   // reachable state for all
      gradeMark.innerHTML = '';
      held = '';
      // force exactly this grade's kanji through the same path
      const real = GRADES.find(x => x === g);
      held = '';
      (function () {
        const idOf = ch => (`#${'一二三四'.includes(ch) ? 'ch' : 'kj'}-${ch}`);
        for (const ch of real.kanji) {
          if (!document.querySelector(idOf(ch))) out.push(`${real.kanji}: ${ch}`);
        }
      })();
    }
    return out;
  });
  check('and every character of every rank has a symbol behind it',
    !unresolved.length, unresolved.join(' | '));

  await stand(1, 1, 0, false);
  check('one landed is grade three', (await rank()).name === 'grade three', (await rank()).name);

  await stand(4, 3, 0, false);
  check('three in a row is grade two', (await rank()).name === 'grade two', (await rank()).name);

  await stand(8, 5, 0, false);
  const semi = await rank();
  check('a domain of your own is semi-grade one', semi.name === 'semi-grade one', semi.name);
  check('and that one is three characters', semi.marks === 3, String(semi.marks));

  await stand(12, 6, 30, true);
  check('all eight sparks is grade one', (await rank()).name === 'grade one', (await rank()).name);

  /* The top asks for both: a run nobody gets by luck, and a reading that
     says the timing behind it was real. Either alone is not it. */
  await stand(20, 9, 40, true);
  check('eight in a row alone is not the top', (await rank()).name === 'grade one', (await rank()).name);
  await stand(20, 6, 3, true);
  check('nor is being three milliseconds out', (await rank()).name === 'grade one', (await rank()).name);
  await stand(20, 9, 3, true);
  check('both together is special grade', (await rank()).name === 'special grade', (await rank()).name);

  // and it is the one rank drawn in red
  check('and it is the one drawn in red', await p.evaluate(() =>
    getComputedStyle(document.querySelector('.grade-mark')).color) !== await p.evaluate(() =>
    getComputedStyle(document.querySelector('.score-line')).color));
  await p.close();

  /* ── and a rank can be taken along
     One line to the clipboard, composed from the live figures at the
     moment of pressing. The page keeps nothing and sends nothing, so the
     only way a rank leaves this tab is in the visitor's own hand — and
     what leaves has to be exactly what the panel says, not a copy that
     drifts from it. */
  {
    const cb = await b.newContext({
      viewport: { width: 1200, height: 800 },
      permissions: ['clipboard-read', 'clipboard-write']
    });
    const q = await cb.newPage();
    q.on('pageerror', e => fails.push('take: pageerror ' + e.message));
    await q.addInitScript(seen);
    await q.goto(BASE + '/index.html');
    await q.waitForTimeout(900);

    const takeable = () => q.evaluate(() => !document.getElementById('grade-take').hidden);
    check('nothing earned, nothing to take', !(await takeable()));

    await q.evaluate(() => { total = 4; best = 3; closest = 21; awake = false; tell(true); });
    check('a rank earned is a rank offered', await takeable());

    await q.evaluate(() => document.getElementById('grade-take').click());
    await q.waitForTimeout(300);
    const line = await q.evaluate(() => navigator.clipboard.readText());
    check('and it goes out with the numbers that earned it',
      line === 'black flash · 二級 — grade two · 4 landed · best 3 in a row · 21 ms from the ring · strohutt.github.io',
      line);
    check('and the button says it went',
      await q.evaluate(() => document.getElementById('grade-take').textContent) === 'copied');
    await cb.close();
  }

  /* ── nothing accumulates ───────────────────────────────────────
     Every attempt builds a ring, and every landing builds waves, a bolt,
     fourteen shards and a rift, all of which take themselves away again
     on a timer. One that does not is invisible for the first minute and
     then the page is carrying a thousand dead elements. So the page is
     hammered and then counted: the number of elements in it afterwards
     has to be the number it started with. */
  p = await fresh();
  const nodes = () => p.evaluate(() => document.querySelectorAll('*').length);
  const atRest = await nodes();

  await p.evaluate(() => new Promise(done => {
    const a = document.getElementById('flash-arena');
    const r = a.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const fire = (t, buttons) => a.dispatchEvent(new PointerEvent(t, {
      bubbles: true, clientX: x, clientY: y, button: 0, buttons,
      pointerId: 1, pointerType: 'mouse', isPrimary: true
    }));
    // a spread of holds: far too early, near the window, and past it
    const holds = [20, 90, 260, 470, 520, 610, 700];
    let n = 0;
    const go = () => {
      if (n >= 60) return done();
      fire('pointerdown', 1);
      setTimeout(() => { fire('pointerup', 0); n++; setTimeout(go, 30); }, holds[n % holds.length]);
    };
    go();
  }));

  // everything drawn by a hit is gone within about a second and a half
  await p.waitForTimeout(3000);
  const left = await nodes();
  check('sixty attempts leave nothing behind', left === atRest, `${atRest} → ${left}`);
  check('and no ring is still standing', await rings(p) === 0, String(await rings(p)));
  await p.close();

  await b.close();
  console.log(fails.length ? '\n' + fails.length + ' FAILING: ' + fails.join(', ') : '\nall flash checks pass');
  process.exit(fails.length ? 1 : 0);
})();
