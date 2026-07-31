const BASE = `http://localhost:${process.env.PORT || 8899}`;
const { chromium, devices } = require('playwright');

const AT = [710, 610];                       // a spot that is not a control
const streak = p => p.evaluate(() => document.getElementById('tally-streak').textContent);
const rings = p => p.evaluate(() => document.querySelectorAll('.charge').length);

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const fails = [];
  const check = (name, ok, detail) => { console.log((ok ? 'ok   ' : 'FAIL ') + name + (detail ? '  ' + detail : '')); if (!ok) fails.push(name); };

  const fresh = async (opts = {}) => {
    const p = await b.newPage({ viewport: { width: 900, height: 700 }, ...opts });
    p.on('pageerror', e => fails.push('pageerror: ' + e.message));
    await p.goto(BASE + '/index.html');
    await p.waitForTimeout(700);
    return p;
  };

  // ── the window itself
  let p = await fresh();
  await p.mouse.move(...AT); await p.mouse.down(); await p.waitForTimeout(120); await p.mouse.up();
  await p.waitForTimeout(80);
  check('early release misses', await streak(p) === '0');

  await p.mouse.down(); await p.waitForTimeout(520); await p.mouse.up(); await p.waitForTimeout(80);
  check('release in window lands', await streak(p) === '1');

  await p.mouse.down(); await p.waitForTimeout(1200); await p.mouse.up(); await p.waitForTimeout(80);
  check('late release misses', await streak(p) === '0');

  // ── the ring must never pile up
  for (let i = 0; i < 6; i++) { await p.mouse.down(); await p.waitForTimeout(60); await p.mouse.up(); await p.waitForTimeout(40); }
  await p.waitForTimeout(1000);
  check('rings are cleaned up', await rings(p) === 0, `${await rings(p)} left`);

  // ── holding forever resolves on its own
  await p.mouse.down();
  await p.waitForTimeout(2600);
  const afterHold = await rings(p);
  await p.mouse.up(); await p.waitForTimeout(100);
  check('hold limit resolves', afterHold === 0, `${afterHold} rings after 2.6s`);

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
  p.on('pageerror', e => fails.push('touch pageerror: ' + e.message));
  await p.goto(BASE + '/index.html');
  await p.waitForTimeout(1200);
  const spot = await p.evaluate(() => {
    for (let y = 520; y < 780; y += 20) for (let x = 60; x < 330; x += 40) {
      const el = document.elementFromPoint(x, y);
      if (el && !el.closest('a,button,input,iframe,.tally')) return [x, y];
    }
    return null;
  });
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
  let r = await finger(520);
  check('a held finger lands', r.streak === '1');
  check('the callout is suppressed while holding', r.sel === 'none');
  r = await finger(120);
  check('a tap is too early', r.streak === '0');
  check('selection comes back after release',
    await p.evaluate(() => getComputedStyle(document.body).webkitUserSelect) !== 'none');
  await phone.close();

  // ── reduced motion: nothing fires at all
  const rm = await b.newContext({ reducedMotion: 'reduce' });
  p = await rm.newPage({ viewport: { width: 900, height: 700 } });
  await p.goto(BASE + '/index.html'); await p.waitForTimeout(600);
  await p.mouse.move(...AT); await p.mouse.down(); await p.waitForTimeout(520); await p.mouse.up();
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
  check('early miss is named', await hold(120) === 'too early');
  check('a landing is named', await hold(520) === 'landed');
  check('late miss is named', await hold(1000) === 'too late');
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
  await p.mouse.move(...AT);
  for (let i = 0; i < 2; i++) { await p.mouse.down(); await p.waitForTimeout(520); await p.mouse.up(); await p.waitForTimeout(100); }
  const got = await streak(p);
  await p.reload(); await p.waitForTimeout(700);
  const kept = await p.evaluate(() => document.getElementById('tally-best').textContent);
  check('best survives reload', kept === got, `streak ${got} → best ${kept}`);
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
  await p.mouse.down(); await p.waitForTimeout(120); await p.mouse.up(); await p.waitForTimeout(120);
  let s = await score();
  check('a miss leaves a mark', s.marks.length === 1 && !s.marks[0].includes('is-hit'), s.marks.join(' | '));

  await p.mouse.down(); await p.waitForTimeout(520); await p.mouse.up(); await p.waitForTimeout(160);
  s = await score();
  check('a landed flash is counted', s.best === '1' && s.total === '1', JSON.stringify(s));
  check('a landed flash turns the wheel', s.turns === '1', s.turns);
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
  await p.waitForTimeout(2500);
  const thrown = await adapt();
  check('a throw carries the wheel past one tooth', thrown > 1, String(thrown));
  check('a throw settles on a tooth',
    await p.evaluate(() => (document.querySelector('.wheel').style.getPropertyValue('--drag') || '0deg').startsWith('0')));
  check('a throw does not leave it spinning',
    !(await p.evaluate(() => document.querySelector('.wheel').classList.contains('is-spinning'))));

  // a press is still a press
  const held = await adapt();
  await p.click('#wheel-hit');
  await p.waitForTimeout(200);
  check('a press still moves one tooth', (await adapt()) === held + 1, `${held} → ${await adapt()}`);
  await p.close();

  await b.close();
  console.log(fails.length ? '\n' + fails.length + ' FAILING: ' + fails.join(', ') : '\nall flash checks pass');
  process.exit(fails.length ? 1 : 0);
})();
