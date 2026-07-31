/* The page as a browser sees it: what is reachable, what reacts, what
   overflows, and what a screen reader is handed. */
const BASE = `http://localhost:${process.env.PORT || 8899}`;
const { chromium } = require('playwright');

const fails = [];
const check = (n, ok, d) => { console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  — ' + d : '')); if (!ok) fails.push(n); };

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
  // the field is markup, not script, so it has to be there without js too
  const motesNoJs = await n.evaluate(() => document.querySelectorAll('.mote').length);
  await nojs.close();

  check('no js: nothing is stuck invisible', !hiddenNoJs.length, hiddenNoJs.join(' | '));
  check('no js: the field is still running', motesNoJs >= 20, String(motesNoJs));

  const p = await b.newPage({ viewport: { width: 1340, height: 900 } });
  p.on('pageerror', e => errs.push('page: ' + e.message));
  p.on('console', m => m.type() === 'error' && /attribute|Uncaught/.test(m.text()) && errs.push('con: ' + m.text()));

  /* The regions fed by github stay hidden when it cannot be reached, and a
     hidden region has no box — so a layout checked against a dead network
     is a layout nobody checked. Both are answered here. */
  const json = body => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  const when = i => new Date(Date.now() - i * 9e6).toISOString();
  await p.route('**/api.github.com/**/repos**', r => r.fulfill(json(
    Array.from({ length: 6 }, (_, i) => ({
      name: `a-repository-with-a-fairly-long-name-${i}`, html_url: 'https://example.invalid',
      description: 'A description of the sort github lets people write, which is to say a long one.',
      language: 'TypeScript', stargazers_count: i * 3, pushed_at: when(i), fork: false, archived: false
    })))));
  await p.route('**/api.github.com/**/events/**', r => r.fulfill(json(
    Array.from({ length: 5 }, (_, i) => ({
      type: 'PushEvent', repo: { name: `Strohutt/a-repository-with-a-fairly-long-name-${i}` },
      created_at: when(i), payload: { size: i + 1, commits: [{ message: 'A commit message of an ordinary length' }] }
    })))));

  await p.goto(BASE + '/index.html');
  await p.waitForTimeout(1800);
  check('the repository list fills', await p.evaluate(() => document.querySelectorAll('#work-list li').length) === 6);
  // the two regions were one list printed twice; the commit line has to
  // arrive on the repository's own row now
  check('each repo carries what was last pushed to it',
    await p.evaluate(() => document.querySelectorAll('.work-last').length) >= 5,
    String(await p.evaluate(() => document.querySelectorAll('.work-last').length)));

  const overflow = [];
  for (const w of [1600, 1340, 1100, 900, 700, 500, 380, 320]) {
    await p.setViewportSize({ width: w, height: 900 });
    await p.waitForTimeout(200);
    if (await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1))
      overflow.push(w);
  }
  check('nothing widens the document at any width', !overflow.length, overflow.join(','));

  /* Not widening the document is not the same as fitting in it. The sheet
     clips on purpose, so a region left in a half-width column at phone
     size does not scroll — it is silently cut off, which is worse than a
     scrollbar. Only the hero is allowed past the edge; the wheel and the
     speed lines bleed by design. */
  const cut = [];
  for (const w of [1340, 900, 700, 500, 380, 320]) {
    await p.setViewportSize({ width: w, height: 900 });
    await p.waitForTimeout(220);
    const over = await p.evaluate(() => {
      const edge = document.documentElement.clientWidth;
      return [...document.querySelectorAll('.panel:not(.hero), .panel:not(.hero) *')]
        .filter(el => { const r = el.getBoundingClientRect(); return r.width > 2 && r.right > edge + 1; })
        .map(el => (el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className) || el.tagName)
        .slice(0, 4);
    });
    if (over.length) cut.push(`${w}: ${over.join(' ')}`);
  }
  await p.setViewportSize({ width: 1340, height: 900 });
  check('nothing is clipped off the right edge', !cut.length, cut.join(' | '));

  // Every hit target has to actually do something. Measuring that the class
  // was added only proves js ran; these read the value the drawing moves by.
  for (const [id, probe] of [
    ['wheel-hit', () => getComputedStyle(document.querySelector('.wheel')).getPropertyValue('--adapt').trim()],
    ['cloud-hit', () => document.getElementById('cloud-hit').style.getPropertyValue('--shove')],
    ['cloud-hit-2', () => document.getElementById('cloud-hit-2').style.getPropertyValue('--shove')],
    ['flag-hit', () => document.getElementById('flag-hit').className],
    ['name-hit', () => document.getElementById('brush').innerHTML.length]
  ]) {
    const before = await p.evaluate(probe);
    await p.click('#' + id);
    await p.waitForTimeout(140);
    const after = await p.evaluate(probe);
    check(`${id} does something`, before !== after, `stayed ${before}`);
  }

  // scrolling has to reach the drawings, not just the text
  await p.evaluate(() => scrollTo(0, 900));
  await p.waitForTimeout(400);
  const rolled = await p.evaluate(() =>
    parseFloat(getComputedStyle(document.querySelector('.wheel')).getPropertyValue('--roll')) || 0);
  const drifted = await p.evaluate(() => [...document.querySelectorAll('.band svg')]
    .map(s => parseFloat(s.style.getPropertyValue('--drift')) || 0));
  check('the wheel rolls with the page', Math.abs(rolled) > 1, String(rolled));
  check('the bands drift, and not together', drifted.length >= 2 && drifted[0] !== drifted[1], drifted.join(','));
  await p.evaluate(() => scrollTo(0, 0));

  // keyboard: can you tab to them
  const focusable = await p.evaluate(() =>
    [...document.querySelectorAll('button, a[href]')].filter(el => el.tabIndex >= 0).length);
  check('everything operable is reachable by keyboard', focusable >= 10, String(focusable));

  // small tap targets
  const small = await p.evaluate(() => [...document.querySelectorAll('a[href], button')]
    .map(el => { const r = el.getBoundingClientRect(); return { t: (el.getAttribute('aria-label') || el.textContent).trim().slice(0, 16), w: Math.round(r.width), h: Math.round(r.height) }; })
    .filter(x => x.w && (x.h < 44 || x.w < 44)));
  check('every target clears 44px', !small.length, JSON.stringify(small));

  /* A rule can go missing without anything failing: splice a comment into
     the middle of a selector and the two rules either side quietly become
     one descendant selector that matches nothing. Valid css, no warning,
     and the element just renders unstyled. Every paragraph in this design
     is given its own margins, so one still carrying the browser's default
     — a full em above and below, matched to its own font size — is one
     whose rule never landed. */
  await p.evaluate(() => render({
    discord_user: { id: '1', username: 'u', display_name: 'Strohut', avatar: null },
    discord_status: 'online', active_on_discord_desktop: true, active_on_discord_mobile: true,
    activities: [
      { type: 4, state: 'a custom status' },
      { type: 0, name: 'A Game', details: 'a detail line', state: 'a state line',
        party: { size: [2, 5] }, timestamps: { start: Date.now() - 6e4 } }
    ],
    listening_to_spotify: true,
    spotify: { song: 'a song', artist: 'an artist', album: 'an album', track_id: 'abc',
      album_art_url: '', timestamps: { start: Date.now() - 1e4, end: Date.now() + 1e5 } }
  }));
  await p.waitForTimeout(300);

  const unstyled = await p.evaluate(() => [...document.querySelectorAll('p')]
    .filter(e => e.offsetParent !== null)
    .filter(e => {
      const c = getComputedStyle(e);
      const em = parseFloat(c.fontSize);
      return Math.abs(parseFloat(c.marginTop) - em) < 0.5 && Math.abs(parseFloat(c.marginBottom) - em) < 0.5;
    })
    .map(e => e.className || e.id || e.tagName));
  check('every paragraph got the margins the design gives it', !unstyled.length, unstyled.join(', '));

  // and the presence panel really is showing what discord sends, not just
  // the name it used to stop at
  const rich = await p.evaluate(() => ({
    kind: document.querySelector('.doing-what')?.textContent,
    lines: [...document.querySelectorAll('.doing-line')].map(e => e.textContent),
    where: document.getElementById('dc-where').textContent,
    album: document.getElementById('track-album').textContent,
    clock: document.getElementById('track-time').textContent
  }));
  check('an activity says what kind it is', rich.kind === 'playing', rich.kind);
  check("an activity shows the game's own two lines",
    rich.lines.includes('a detail line') && rich.lines.some(l => l.includes('a state line')), rich.lines.join(' | '));
  check('the party size is folded in', rich.lines.some(l => l.includes('2 of 5')), rich.lines.join(' | '));
  check('the readout says which machine he is at', rich.where === 'desktop and phone', rich.where);
  check('the track names its album', rich.album === 'an album', rich.album);
  check('the track counts in minutes and seconds', /^\d+:\d\d \/ \d+:\d\d$/.test(rich.clock), rich.clock);

  // what a screen reader is told, and what it is spared
  const a11y = await p.evaluate(() => ({
    lang: document.documentElement.lang,
    skip: !!document.querySelector('.skip'),
    live: [...document.querySelectorAll('[aria-live="polite"]')].map(e => e.className),
    tickingInLive: [...document.querySelectorAll('.doing-time, #track-fill')]
      .filter(e => e.closest('[aria-live="polite"]')).length,
    // aria-hidden covers a whole subtree, so a drawing inside a hidden
    // wrapper does not need to say so again
    unlabelledSvg: [...document.querySelectorAll('svg')]
      .filter(s => !s.closest('[aria-hidden="true"]') && !s.querySelector('title'))
      .map(s => s.getAttribute('class') || s.parentElement.className),
    imgNoAlt: [...document.querySelectorAll('img')].filter(i => !i.hasAttribute('alt')).length,
    headings: [...document.querySelectorAll('h1, h2')].map(h => h.tagName),
    // splitting the name into letters must not make it spell itself out
    nameSaid: document.getElementById('name-hit').getAttribute('aria-label')
  }));

  check('the page declares a language', a11y.lang === 'en', a11y.lang);
  check('there is a skip link', a11y.skip);
  check('the live regions are the ones that change', a11y.live.length >= 2, a11y.live.join(' | '));
  check('no per-second ticker sits inside a live region', a11y.tickingInLive === 0, String(a11y.tickingInLive));
  check('every decorative drawing is hidden from the tree', !a11y.unlabelledSvg.length, a11y.unlabelledSvg.join(','));
  check('every image has alt text', a11y.imgNoAlt === 0, String(a11y.imgNoAlt));
  check('there is exactly one h1', a11y.headings.filter(h => h === 'H1').length === 1, a11y.headings.join(','));
  check('the split name still names itself', /strohut/i.test(a11y.nameSaid || ''), a11y.nameSaid);

  check('no errors on the console', !errs.length, errs.join(' | '));

  console.log(fails.length ? `\n${fails.length} FAILING: ${fails.join(' | ')}` : '\npage checks pass');
  await b.close();
  process.exit(fails.length ? 1 : 0);
})();
