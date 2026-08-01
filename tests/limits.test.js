const BASE = `http://localhost:${process.env.PORT || 8899}`;
const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');

// screenshots are for whoever is running this, not for the repository
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
const fails = [];
const check = (n, ok, d) => { console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  — ' + d : '')); if (!ok) fails.push(n); };

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

  /* The barrier goes up on the first page of a session and covers
     everything for a second and three quarters. These checks are about
     what is underneath it, so they arrive having already seen it — the
     same as mocking an upstream. The intro has its own checks. */
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
  await p.screenshot({ path: path.join(OUT, 'w280.png'), fullPage: true });
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
