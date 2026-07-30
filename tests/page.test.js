const BASE = `http://localhost:${process.env.PORT || 8899}`;
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];

  // no javascript: nothing may be stuck invisible
  const nojs = await b.newContext({ javaScriptEnabled: false });
  const n = await nojs.newPage({ viewport: { width: 1200, height: 900 } });
  await n.goto(BASE + '/index.html');
  await n.waitForTimeout(600);
  const hiddenNoJs = await n.evaluate(() => [...document.querySelectorAll('.panel')]
    .filter(p => getComputedStyle(p).opacity === '0').map(p => p.className));
  await nojs.close();

  const p = await b.newPage({ viewport: { width: 1340, height: 900 } });
  p.on('pageerror', e => errs.push('page: ' + e.message));
  p.on('console', m => m.type() === 'error' && /attribute|Uncaught/.test(m.text()) && errs.push('con: ' + m.text()));
  await p.goto(BASE + '/index.html');
  await p.waitForTimeout(1500);

  const overflow = [];
  for (const w of [1600, 1340, 1100, 900, 700, 500, 380, 320]) {
    await p.setViewportSize({ width: w, height: 900 });
    await p.waitForTimeout(200);
    if (await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1))
      overflow.push(w);
  }
  await p.setViewportSize({ width: 1340, height: 900 });

  // every hit target has to actually do something, and be reachable by keyboard
  const hits = {};
  for (const [id, probe] of [
    ['wheel-hit', () => getComputedStyle(document.querySelector('.wheel')).getPropertyValue('--adapt').trim()],
    ['cloud-hit', () => document.getElementById('cloud-hit').style.getPropertyValue('--shove')],
    ['flag-hit', () => document.getElementById('flag-hit').className],
    ['name-hit', () => document.getElementById('brush').innerHTML.length]
  ]) {
    const before = await p.evaluate(probe);
    await p.click('#' + id);
    await p.waitForTimeout(120);
    const after = await p.evaluate(probe);
    hits[id] = before !== after ? 'reacts' : `NO CHANGE (${before})`;
  }

  // keyboard: can you tab to them
  const focusable = await p.evaluate(() =>
    [...document.querySelectorAll('button, a[href]')].filter(el => el.tabIndex >= 0).length);

  // small tap targets
  const small = await p.evaluate(() => [...document.querySelectorAll('a[href], button')]
    .map(el => { const r = el.getBoundingClientRect(); return { t: (el.getAttribute('aria-label') || el.textContent).trim().slice(0, 16), w: Math.round(r.width), h: Math.round(r.height) }; })
    .filter(x => x.w && (x.h < 44 || x.w < 44)));

  // what a screen reader is told, and what it is spared
  const a11y = await p.evaluate(() => ({
    lang: document.documentElement.lang,
    skip: !!document.querySelector('.skip'),
    live: [...document.querySelectorAll('[aria-live="polite"]')].map(e => e.className),
    tickingInLive: [...document.querySelectorAll('.doing-time, #track-fill')]
      .filter(e => e.closest('[aria-live="polite"]')).length,
    unlabelledSvg: [...document.querySelectorAll('svg')]
      .filter(s => !s.hasAttribute('aria-hidden') && !s.querySelector('title')).length,
    imgNoAlt: [...document.querySelectorAll('img')].filter(i => !i.hasAttribute('alt')).length,
    headings: [...document.querySelectorAll('h1, h2')].map(h => h.tagName)
  }));

  console.log(JSON.stringify({ hiddenNoJs, overflow, hits, focusable, small, a11y, errs }, null, 1));
  await b.close();
})();
