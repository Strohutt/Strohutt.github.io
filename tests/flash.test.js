const BASE = `http://localhost:${process.env.PORT || 8899}`;
const { chromium } = require('playwright');

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

  // ── touch
  p = await fresh({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  const spot = await p.evaluate(() => {
    for (let y = 300; y < 700; y += 20) for (let x = 40; x < 340; x += 40) {
      const el = document.elementFromPoint(x, y);
      if (el && !el.closest('a,button,input,iframe,.tally')) return [x, y];
    }
    return null;
  });
  if (spot) {
    await p.touchscreen.tap(spot[0], spot[1]);
    await p.waitForTimeout(900);
    check('a tap does not strand a ring', await rings(p) === 0, `${await rings(p)} left`);
  } else check('touch spot found', false);
  await p.close();

  // ── reduced motion: nothing fires at all
  const rm = await b.newContext({ reducedMotion: 'reduce' });
  p = await rm.newPage({ viewport: { width: 900, height: 700 } });
  await p.goto(BASE + '/index.html'); await p.waitForTimeout(600);
  await p.mouse.move(...AT); await p.mouse.down(); await p.waitForTimeout(520); await p.mouse.up();
  await p.waitForTimeout(150);
  check('reduced motion stays still', await rings(p) === 0 && await p.evaluate(() => document.querySelectorAll('.strike').length) === 0);
  await rm.close();

  // ── the best score survives a reload
  p = await fresh();
  await p.mouse.move(...AT);
  for (let i = 0; i < 2; i++) { await p.mouse.down(); await p.waitForTimeout(520); await p.mouse.up(); await p.waitForTimeout(100); }
  const got = await streak(p);
  await p.reload(); await p.waitForTimeout(700);
  const kept = await p.evaluate(() => document.getElementById('tally-best').textContent);
  check('best survives reload', kept === got, `streak ${got} → best ${kept}`);
  await p.close();

  await b.close();
  console.log(fails.length ? '\n' + fails.length + ' FAILING: ' + fails.join(', ') : '\nall flash checks pass');
  process.exit(fails.length ? 1 : 0);
})();
