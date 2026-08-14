const BASE = `http://localhost:${process.env.PORT || 8899}`;
const { launchBrowser } = require('./browser');
const path = require('node:path');
const fs = require('node:fs');

// screenshots are for whoever is running this, not for the repository
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
const fails = [];
const check = (n, ok, d) => { console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  — ' + d : '')); if (!ok) fails.push(n); };

(async () => {
  const b = await launchBrowser();

  /* Skip the separately tested arrival barrier. */
  const seen = () => { try { sessionStorage.setItem('strohut-seen', '1'); } catch { /* nothing to do */ } };
  const over = p => p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);

  // ── fully offline
  const ctx = await b.newContext({ offline: true, viewport: { width: 1200, height: 800 } });
  let p = await ctx.newPage();
  p.on('pageerror', e => fails.push('offline pageerror: ' + e.message));
  await p.goto(BASE + '/index.html').catch(() => {});
  await p.waitForTimeout(2000);
  check('offline: nothing throws', true);
  await ctx.close();

  // ── 280px, the narrowest thing anybody still uses
  p = await b.newPage({ viewport: { width: 280, height: 650 } });
  await p.addInitScript(seen);
  p.on('pageerror', e => fails.push('280 pageerror: ' + e.message));
  await p.goto(BASE + '/index.html'); await p.waitForTimeout(1200);
  check('280px does not scroll sideways', !(await over(p)));
  check('280px keeps the fixed compass off the copy', await p.evaluate(() => getComputedStyle(document.getElementById('pose')).display === 'none'));
  await p.screenshot({ path: path.join(OUT, 'w280.png'), fullPage: true });
  await p.close();

  for (const width of [320, 390]) {
    p = await b.newPage({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true });
    await p.addInitScript(seen);
    await p.goto(BASE + '/index.html');
    await p.waitForTimeout(900);
    const overlap = await p.evaluate(() => {
      const a = document.querySelector('.hero .sub').getBoundingClientRect();
      const b = document.querySelector('.hero .wheel').getBoundingClientRect();
      return Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
        Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    });
    check(`${width}px keeps the wheel clear of the intro copy`, overlap === 0, String(Math.round(overlap)));
    await p.close();
  }

  p = await b.newPage({ viewport: { width: 1340, height: 900 } });
  await p.addInitScript(seen);
  await p.goto(BASE + '/index.html');
  await p.waitForTimeout(700);
  check('a laptop without an outer gutter hides the fixed compass',
    await p.evaluate(() => getComputedStyle(document.getElementById('pose')).display === 'none'));
  await p.close();

  p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.addInitScript(seen);
  await p.goto(BASE + '/index.html');
  await p.waitForTimeout(700);
  const poseGap = await p.evaluate(() => {
    const pose = document.getElementById('pose').getBoundingClientRect();
    const spread = document.querySelector('.spread').getBoundingClientRect();
    return { shown: getComputedStyle(document.getElementById('pose')).display !== 'none', right: pose.right, content: spread.left };
  });
  check('the fixed compass returns only when a real gutter exists',
    poseGap.shown && poseGap.right <= poseGap.content + 1, JSON.stringify(poseGap));
  await p.close();

  // ── someone has set their browser text to 200%
  p = await b.newPage({ viewport: { width: 1340, height: 900 } });
  await p.addInitScript(seen);
  p.on('pageerror', e => fails.push('zoom pageerror: ' + e.message));
  await p.goto(BASE + '/index.html');
  await p.addStyleTag({ content: 'html { font-size: 32px !important; }' });
  await p.waitForTimeout(900);
  check('200% text does not scroll sideways', !(await over(p)));
  await p.screenshot({ path: path.join(OUT, 'zoom200.png'), fullPage: true });
  await p.close();

  // ── the same on a phone
  p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await p.addInitScript(seen);
  await p.goto(BASE + '/index.html');
  await p.addStyleTag({ content: 'html { font-size: 26px !important; }' });
  await p.waitForTimeout(900);
  check('phone at 160% text holds', !(await over(p)));
  await p.close();

  // ── a very slow upstream that answers after the visitor has moved on
  p = await b.newPage({ viewport: { width: 1340, height: 900 } });
  await p.addInitScript(seen);
  p.on('pageerror', e => fails.push('slow pageerror: ' + e.message));
  await p.route('**/graphql.anilist.co/**', async r => {
    await new Promise(res => setTimeout(res, 4000));
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: {
      op_book: { media: [{ id: 1, siteUrl: 'https://example.invalid', format: 'MANGA', status: 'RELEASING',
        title: { romaji: 'One Piece', native: 'ONE PIECE' }, coverImage: { large: '' }, startDate: { year: 1997 } }] }
    } }) });
  });
  await p.goto(BASE + '/index.html');
  await p.evaluate(() => scrollTo(0, 2000));
  await p.waitForTimeout(5000);
  check('late response still lands', await p.evaluate(() => !document.getElementById('likes').hidden));
  check('late response does not shove the page', !(await over(p)));
  await p.close();

  /* ── a monitor wider than the column
     The spread stops at 78rem and centres, so past about thirteen
     hundred pixels there is a gutter either side. The wheel is meant to
     run off the edge of the screen rather than sit inside a frame, and a
     wheel pushed fifteen percent past the column lands in that gutter
     and sits there whole, with the speed lines stopping in mid-air
     behind it. Both are measured against the viewport, not the column. */
  for (const wide of [1280, 1920, 2560]) {
    p = await b.newPage({ viewport: { width: wide, height: 900 } });
    await p.addInitScript(seen);
    p.on('pageerror', e => fails.push(`${wide} pageerror: ` + e.message));
    await p.goto(BASE + '/index.html');
    await p.waitForTimeout(1400);
    const edge = await p.evaluate(() => ({
      wheel: Math.round(document.querySelector('.wheel').getBoundingClientRect().right),
      speed: Math.round(document.querySelector('.speed').getBoundingClientRect().right),
      vw: innerWidth
    }));
    check(`at ${wide}px the wheel still runs off the edge`, edge.wheel > edge.vw, JSON.stringify(edge));
    check(`at ${wide}px the speed lines reach it`, edge.speed >= edge.vw - 1, JSON.stringify(edge));
    check(`at ${wide}px nothing widens the page`, !(await over(p)));
    await p.close();
  }

  // ── the 404 under the same pressure
  p = await b.newPage({ viewport: { width: 320, height: 650 } });
  await p.addInitScript(seen);
  p.on('pageerror', e => fails.push('404 pageerror: ' + e.message));
  await p.goto(BASE + '/404.html'); await p.waitForTimeout(900);
  check('404 at 320px holds', !(await over(p)));
  await p.close();

  await b.close();
  console.log(fails.length ? '\n' + fails.length + ' FAILING: ' + fails.join(' | ') : '\nall of it holds');
  process.exit(fails.length ? 1 : 0);
})();
