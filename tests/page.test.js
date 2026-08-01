/* The page as a browser sees it: what is reachable, what reacts, what
   overflows, and what a screen reader is handed. */
const BASE = `http://localhost:${process.env.PORT || 8899}`;
const { chromium } = require('playwright');

const fails = [];
const check = (n, ok, d) => { console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  — ' + d : '')); if (!ok) fails.push(n); };

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

  /* The barrier goes up on the first page of a session and covers
     everything for a second and three quarters. These checks are about
     what is underneath it, so they arrive having already seen it — the
     same as mocking an upstream. The intro has its own checks. */
  const seen = () => { try { sessionStorage.setItem('strohut-seen', '1'); } catch { /* nothing to do */ } };
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

  /* A control that does nothing when it is pressed is worse than no
     control. Without javascript the field cannot take a hold, the run
     can never move, the compass has nothing to point at and the clock
     has no time to show — so none of them are offered. */
  const drawn = sel => n.evaluate(s => {
    const el = document.querySelector(s);
    if (!el) return false;
    const st = getComputedStyle(el);
    return st.display !== 'none' && st.visibility !== 'hidden';
  }, sel);

  const offered = [];
  for (const sel of ['#flash-arena', '.score-list', '.score-marks', '.score .kicker', '.pose', '#clock']) {
    if (await drawn(sel)) offered.push(sel);
  }

  /* What does stay is the heading and the sentence under it: they
     describe a thing this page does when it is allowed to run, which is
     worth reading either way. */
  const kept = await drawn('.score-line') && await drawn('.score .head');
  await nojs.close();

  check('no js: nothing is stuck invisible', !hiddenNoJs.length, hiddenNoJs.join(' | '));
  check('no js: the field is still running', motesNoJs >= 20, String(motesNoJs));
  check('no js: nothing dead is offered', !offered.length, offered.join(' | '));
  check('no js: but the panel still says what it is', kept);

  const p = await b.newPage({ viewport: { width: 1340, height: 900 } });
  await p.addInitScript(seen);
  p.on('pageerror', e => errs.push('page: ' + e.message));
  p.on('console', m => m.type() === 'error' && /attribute|Uncaught/.test(m.text()) && errs.push('con: ' + m.text()));

  /* A region that only exists when its upstream answers has no box while
     it does not — so a layout checked against a dead network is a layout
     nobody checked. The favourites are filled here, with titles longer
     than anything anilist would really send. */
  const json = body => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  const one = (romaji, native) => ({
    id: 1, siteUrl: 'https://example.invalid', format: 'MANHWA', status: 'FINISHED',
    chapters: 570, title: { romaji, english: romaji, native },
    coverImage: { large: '' }, startDate: { year: 2011 },
    genres: ['Action', 'Adventure', 'Supernatural']
  });
  await p.route('**/graphql.anilist.co/**', r => r.fulfill(json({ data: {
    jjk_book: { media: [one('Jujutsu Kaisen', '呪術廻戦')] },
    jjk_screen: { media: [{ title: { romaji: 'Jujutsu Kaisen' }, episodes: 47, status: 'RELEASING', genres: ['Action'] }] },
    gohs_book: { media: [one('The God of High School', '갓 오브 하이스쿨')] },
    gohs_screen: { media: [{ title: { romaji: 'The God of High School' }, episodes: 13, status: 'FINISHED', genres: ['Action'] }] },
    op_book: { media: [one('One Piece', 'ONE PIECE')] },
    op_screen: { media: [{ title: { romaji: 'One Piece' }, episodes: 1140, status: 'RELEASING', genres: ['Adventure'] }] }
  } })));

  /* And the presence, for the same reason: the two live regions are half
     the page's boxes and a layout checked without them is a layout with
     two holes where its widest content goes. */
  const now = Date.now();
  await p.route('**/api.lanyard.rest/**', r => r.fulfill(json({ success: true, data: {
    discord_user: { id: '402858450926829568', username: 'strohut', display_name: 'Strohut' },
    discord_status: 'online', active_on_discord_desktop: true,
    listening_to_spotify: true,
    spotify: { song: 'Kaikai Kitan', artist: 'Eve', album: 'Smile', album_art_url: '',
      track_id: '2N7umuRBdK014bDuwREFZS', timestamps: { start: now - 74e3, end: now + 130e3 } },
    activities: [
      { type: 0, name: 'Counter-Strike 2', timestamps: { start: now - 4200e3 }, assets: {},
        details: 'Competitive', state: 'de_dust2 — 12:4', party: { size: [5, 5] } },
      { type: 0, name: 'Visual Studio Code', timestamps: { start: now - 900e3 }, assets: {},
        details: 'Editing script.js', state: 'Workspace: Strohutt.github.io' },
      { type: 3, name: 'Crunchyroll', timestamps: { start: now - 300e3 }, assets: {},
        details: 'Jujutsu Kaisen', state: 'S2 E17' }
    ]
  } })));

  await p.goto(BASE + '/index.html');
  await p.waitForTimeout(1800);
  check('the presence fills', await p.evaluate(() => document.querySelectorAll('#dc-doing li').length) === 3,
    String(await p.evaluate(() => document.querySelectorAll('#dc-doing li').length)));
  check('the favourites fill',await p.evaluate(() => document.querySelectorAll('#like-list li').length) === 3,
    String(await p.evaluate(() => document.querySelectorAll('#like-list li').length)));
  check('each card says what was made of it too',
    await p.evaluate(() => document.querySelectorAll('#like-list li').length) ===
    await p.evaluate(() => [...document.querySelectorAll('#like-list li')].filter(l => /episodes/i.test(l.textContent)).length));

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
     speed lines bleed by design.

     What is hidden from a reader is not measured. Everything drawn on
     this page runs past its box on purpose — the mark behind the score
     bleeds off the edge the way the wheel does, and the sea is three
     tiles wide so that sliding it by one never shows a seam. All of it
     carries aria-hidden, which is the same statement in the markup: there
     is nothing here to read, so there is nothing here to cut off. What
     does have to be read has no way of claiming that exemption. */
  const cut = [];
  for (const w of [1340, 900, 700, 500, 380, 320]) {
    await p.setViewportSize({ width: w, height: 900 });
    await p.waitForTimeout(220);
    const over = await p.evaluate(() => {
      const edge = document.documentElement.clientWidth;
      return [...document.querySelectorAll('.panel:not(.hero), .panel:not(.hero) *')]
        .filter(el => !el.closest('[aria-hidden="true"], svg'))
        .filter(el => { const r = el.getBoundingClientRect(); return r.width > 2 && r.right > edge + 1; })
        .map(el => (el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className) || el.tagName)
        .slice(0, 4);
    });
    if (over.length) cut.push(`${w}: ${over.join(' ')}`);
  }
  await p.setViewportSize({ width: 1340, height: 900 });
  check('nothing is clipped off the right edge', !cut.length, cut.join(' | '));

  /* Every hit target has to actually do something. Measuring that the
     class or the custom property changed only proves the script ran —
     the cloud's shove was set on a property the drawing never rendered,
     because the idle drift is an infinite animation on the same
     transform and an animation beats a declaration. The number went up
     on every click and nothing moved for a month. So where a hit is
     supposed to move something, this reads where it ended up.

     The probe is serialised and run in the page, so it cannot close over
     anything out here — the selector has to be handed across. */
  const moved = sel => {
    const el = document.querySelector(sel);
    // the idle drift would otherwise be read at whatever point of its
    // twenty-two second cycle the click happened to land on
    el.getAnimations().forEach(a => { a.pause(); a.currentTime = 0; });
    const r = el.getBoundingClientRect();
    return `${Math.round(r.left)},${Math.round(r.top)},${getComputedStyle(el).transform}`;
  };

  for (const [id, probe, arg] of [
    ['wheel-hit', () => getComputedStyle(document.querySelector('.wheel')).getPropertyValue('--adapt').trim()],
    ['cloud-hit', moved, '#cloud-hit'],
    ['cloud-hit-2', moved, '#cloud-hit-2'],
    ['flag-hit', () => document.getElementById('flag-hit').className],
    ['name-hit', () => document.getElementById('brush').innerHTML.length]
  ]) {
    const before = await p.evaluate(probe, arg);
    await p.click('#' + id);
    await p.waitForTimeout(900);
    const after = await p.evaluate(probe, arg);
    check(`${id} does something`, before !== after, `stayed ${before}`);
  }

  /* ── 여의봉 ──────────────────────────────────────────────────────
     The staff grows to wherever it is pulled and comes back on its own.
     Three things have to hold or it is in the way rather than on the
     page: the pole takes no pointer at all, the page does not get any
     bigger while it is out, and it does come back. */
  /* The loop above presses the name, and the name puts the barrier back
     up — which covers the whole page for the best part of three
     seconds. Anything after it that means to reach the page has to get
     rid of that first, or it is dragging on a sheet of black. */
  await p.keyboard.press('Escape');
  await p.waitForTimeout(700);
  check('the barrier is out of the way again',
    await p.evaluate(() => getComputedStyle(document.getElementById('curtain')).display) === 'none');

  /* Measured off the pole rather than off the property that drives it:
     at rest the property is written in rem and under the hand it is
     written in pixels, so the two are not the same number even when
     nothing has moved. */
  const staffOf = () => p.evaluate(() => ({
    len: Math.round(document.querySelector('.staff-rig').offsetWidth),
    turn: getComputedStyle(document.querySelector('.staff')).getPropertyValue('--turn').trim()
  }));
  const grip = await p.$('#staff-hit');
  const gb = await grip.boundingBox();
  check('the staff is a real target', gb.width >= 44 && gb.height >= 44,
    `${Math.round(gb.width)}x${Math.round(gb.height)}`);

  const parked = await staffOf();
  await p.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2);
  await p.mouse.down();
  await p.mouse.move(1180, 300, { steps: 8 });
  await p.waitForTimeout(150);
  const pulled = await staffOf();
  check('the staff goes where it is pulled', pulled.len > parked.len * 2.5,
    `${parked.len}px → ${pulled.len}px`);
  check('and it points at what pulled it', pulled.turn !== parked.turn,
    `${parked.turn} → ${pulled.turn}`);

  const grew = await p.evaluate(() => ({
    wide: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    // what is under the middle of the pole must not be the pole
    under: (() => {
      const r = document.querySelector('.staff-rig').getBoundingClientRect();
      const el = document.elementFromPoint(r.left + r.width * .75, r.top + r.height / 2);
      return el ? (el.closest('.staff-rig') ? 'the pole' : 'something else') : 'nothing';
    })()
  }));
  check('a staff across the page does not widen it', !grew.wide);
  check('and nothing can be blocked by the pole itself', grew.under !== 'the pole', grew.under);

  await p.mouse.up();
  await p.waitForTimeout(2000);
  const home = await staffOf();
  check('and it comes back on its own',
    Math.abs(home.len - parked.len) <= 2 && Math.abs(parseFloat(home.turn) - parseFloat(parked.turn)) < .05,
    `${JSON.stringify(home)} vs ${JSON.stringify(parked)}`);

  /* ── and what it went through
     A staff that grows to the width of the page and leaves nothing
     behind is a spring with a drawing on it. Everything else here
     answers to being hit, so the things the pole passes through answer
     the same way — and the wheel, which is the largest of them, takes a
     tooth for it. */
  await p.evaluate(() => scrollTo(0, 0));
  await p.waitForTimeout(400);
  const adaptOf = () => p.evaluate(() =>
    parseInt(getComputedStyle(document.querySelector('.wheel')).getPropertyValue('--adapt'), 10) || 0);

  const before = await adaptOf();
  const swung = await p.evaluate(() => {
    const r = document.querySelector('.staff-grip').getBoundingClientRect();
    return [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)];
  });
  await p.mouse.move(swung[0], swung[1]);
  await p.mouse.down();
  // across the header, through the wheel at the far end of it
  await p.mouse.move(await p.evaluate(() => innerWidth - 60), swung[1] - 140, { steps: 8 });
  await p.waitForTimeout(140);
  const marked = p.waitForFunction(() => document.querySelector('.wheel.is-struck'), null, { timeout: 3000 })
    .then(() => true).catch(() => false);
  await p.mouse.up();
  check('a swing through the wheel strikes it', await marked);
  await p.waitForTimeout(1400);
  check('and the wheel takes a tooth for it', await adaptOf() > before,
    `${before} → ${await adaptOf()}`);

  /* One gesture, one swing. A drag that ends on the grip is followed by
     a click, and the click is the press — so a pull was going out twice,
     once where it was pulled to and again across the header. */
  const after = await adaptOf();
  await p.waitForTimeout(900);
  check('and it does not go out a second time on its own', await adaptOf() === after,
    `${after} → ${await adaptOf()}`);

  // a nudge is not a swing
  const nudged = await adaptOf();
  await p.mouse.move(swung[0], swung[1]);
  await p.mouse.down();
  await p.mouse.move(swung[0] + 30, swung[1], { steps: 3 });
  await p.mouse.up();
  await p.waitForTimeout(1200);
  check('and a nudge goes through nothing', await adaptOf() === nudged,
    `${nudged} → ${await adaptOf()}`);

  /* ── ログポース ─────────────────────────────────────────────────
     The one piece of navigation on the page. It has to name where it
     is taking you, change as the page goes by, actually take you
     there, and point home once there is nothing left ahead. */
  const poseOf = () => p.evaluate(() => ({
    ndl: parseFloat(getComputedStyle(document.getElementById('pose')).getPropertyValue('--ndl')),
    to: document.querySelector('.pose-to').textContent,
    name: document.getElementById('pose-name').textContent,
    label: document.getElementById('pose-hit').textContent.replace(/\s+/g, ' ').trim()
  }));

  await p.evaluate(() => scrollTo(0, 0));
  await p.waitForTimeout(500);
  const top = await poseOf();
  check('the pose says where it is taking you', /right now/.test(top.label), top.label);

  await p.evaluate(() => scrollTo(0, 900));
  await p.waitForTimeout(600);
  const along = await poseOf();
  check('and it locks onto the next one as the page goes by',
    along.name !== top.name || along.ndl !== top.ndl, `${top.name}@${top.ndl} → ${along.name}@${along.ndl}`);

  await p.evaluate(() => scrollTo(0, 0));
  await p.waitForTimeout(500);
  await p.click('#pose-hit');
  await p.waitForTimeout(1500);
  check('and pressing it sails there', await p.evaluate(() => scrollY) > 200,
    String(await p.evaluate(() => Math.round(scrollY))));

  await p.evaluate(() => scrollTo(0, document.body.scrollHeight));
  await p.waitForTimeout(700);
  const end = await poseOf();
  check('at the end of the page it points home', /the top/.test(end.name), end.name);
  await p.click('#pose-hit');
  await p.waitForTimeout(1600);
  check('and takes you back there', await p.evaluate(() => scrollY) < 120,
    String(await p.evaluate(() => Math.round(scrollY))));

  /* A log pose records the island it has been on. Four marks on the
     bezel, one per region, and the count is kept for the visit — so a
     reload inside the same tab still knows where you have been. */
  /* The page has already been to the foot of itself by here, so the count
     has to be put back to nothing to watch it climb at all. */
  await p.evaluate(() => { try { sessionStorage.removeItem('strohut-seen-islands'); } catch { /* fine */ } });
  await p.reload();
  await p.waitForTimeout(1200);
  await p.evaluate(() => scrollTo(0, 0));
  await p.waitForTimeout(400);
  const poseSeen = () => p.evaluate(() =>
    Number(getComputedStyle(document.getElementById('pose')).getPropertyValue('--seen')) || 0);
  const coldSeen = await poseSeen();
  await p.evaluate(() => scrollTo(0, document.body.scrollHeight));
  await p.waitForTimeout(800);
  const warmSeen = await poseSeen();
  /* ── 出典 ────────────────────────────────────────────────────
     Six things are drawn on this page and this is the chapter that says
     what they are. The drawings in it have to be the page's own symbols
     rather than copies — a page that shows its own parts twice, once
     working and once explained, is lying the second time if they are not
     the same parts. */
  {
    const traced = await p.evaluate(() => {
      const list = [...document.querySelectorAll('#traced .traced-list li')];
      // the drawings, not the chapter's own heading glyphs
      const ids = [...document.querySelectorAll('#traced .traced-art use')]
        .map(u => (u.getAttribute('href') || '').replace('#', ''));
      return {
        count: list.length,
        // every one names the thing, the work it is from, and what it does
        whole: list.filter(li => li.querySelector('.traced-name b') &&
          li.querySelector('.traced-work') && li.querySelector('.traced-does')).length,
        uses: ids,
        // and every symbol it points at is one the rest of the page draws
        elsewhere: ids.filter(id => [...document.querySelectorAll('use')]
          .filter(u => (u.getAttribute('href') || '') === `#${id}` && !u.closest('#traced')).length > 0)
      };
    });
    check('the chapter names six drawn things', traced.count === 6, String(traced.count));
    check('and each of them says what it is, where it is from, and what it does',
      traced.whole === traced.count, `${traced.whole} of ${traced.count}`);
    check('and every drawing in it is one the page itself uses',
      traced.elsewhere.length === traced.uses.length,
      traced.uses.filter(u => !traced.elsewhere.includes(u)).join(','));
  }

  /* However many regions the page has — the count is not written down
     anywhere, and a chapter added to the page is a mark added to the
     bezel without anybody touching this. */
  const regions = await p.evaluate(() =>
    ['.now', '.likes', '.score', '.traced', '.foot']
      .filter(s => { const el = document.querySelector(s); return el && !el.hidden && el.offsetParent !== null; }).length);
  check('the pose records the islands it has been past', warmSeen > coldSeen && warmSeen === regions,
    `${coldSeen} → ${warmSeen}`);
  await p.reload();
  await p.waitForTimeout(1600);
  check('and still knows them after a reload', await poseSeen() === regions, String(await poseSeen()));

  /* A phone turned on its side is four hundred pixels tall, and a compass
     fixed to the bottom left of that lands on the staff's name in the
     header and on the jolly roger at the foot. A fixed thing that covers
     what is under it is worse than no fixed thing. */
  {
    const flat = await b.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
    const f = await flat.newPage();
    await f.addInitScript(seen);
    await f.goto(BASE + '/index.html');
    await f.waitForTimeout(1600);
    const drawn = sel => f.evaluate(s => {
      const el = document.querySelector(s);
      const st = getComputedStyle(el);
      return st.display !== 'none' && st.visibility !== 'hidden';
    }, sel);
    check('lying down, the compass is not in the way', !(await drawn('.pose')));

    /* and nothing else went with it — the check is the height, so a rule
       aimed at it must not be catching a tall phone as well */
    await f.setViewportSize({ width: 390, height: 844 });
    await f.waitForTimeout(500);
    check('and standing up it is back', await drawn('.pose'));
    await flat.close();
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

  /* Off the raw scroll position the lean grew with the page: near the
     foot of a phone one of the clouds was a hundred and thirty pixels
     from where it had been placed and was drawn across the last line of
     the region above it. Wherever you stop, a drawing that is meant to
     lean stays inside the gutter it was given. */
  const wander = await p.evaluate(async () => {
    const worst = [];
    for (const at of [400, 1200, 2000, 3200, document.body.scrollHeight]) {
      scrollTo(0, at);
      await new Promise(r => setTimeout(r, 120));
      for (const s of document.querySelectorAll('.band svg, svg.band, .flag svg, svg.flag')) {
        worst.push(Math.abs(parseFloat(s.style.getPropertyValue('--drift')) || 0));
      }
    }
    return Math.max(...worst);
  });
  check('and never further than the gutter they lean in', wander <= 20, `${wander}px`);

  /* And the line under the record is a line of text, not something to be
     drawn over — the point where that came apart. On a phone, where the
     regions stack and the gutters are at their narrowest. */
  await p.setViewportSize({ width: 390, height: 844 });
  await p.waitForTimeout(300);
  const covered = await p.evaluate(async () => {
    const t = document.getElementById('track-time');
    if (!t || t.hidden) return 'no readout';
    t.scrollIntoView({ block: 'center' });
    await new Promise(r => setTimeout(r, 200));
    const b = t.getBoundingClientRect();
    const hit = document.elementFromPoint(b.left + 8, b.bottom - 4);
    return hit === t ? '' : (hit ? hit.tagName : 'nothing');
  });
  check('nothing is drawn over the time under the record', !covered, covered);
  await p.setViewportSize({ width: 1340, height: 900 });
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

  /* Every rule on the page is a drawn line carried as a data uri. A url
     that does not parse is not an error anywhere — the background simply
     does not paint, and what is left is a page with no rules on it at
     all. Twice while this was being written: once the hash was escaped
     twice, once the data: scheme was missing. Both looked identical to
     working, which was nothing. So it is loaded and measured. */
  const inked = await p.evaluate(() => {
    const read = name => getComputedStyle(document.documentElement)
      .getPropertyValue(name).trim().replace(/^url\(["']?|["']?\)$/g, '');
    const load = src => new Promise(done => {
      const im = new Image();
      im.onload = () => done(im.naturalWidth > 0 && im.naturalHeight > 0);
      im.onerror = () => done(false);
      im.src = src;
    });
    return Promise.all(['--ruled', '--ruled-mark'].map(n => load(read(n))));
  });
  check('the drawn rules are real images', inked.every(Boolean), JSON.stringify(inked));

  // and they are what the rules on the page are actually made of
  const uses = await p.evaluate(() => [...document.querySelectorAll('.head, .doing li, .like-list li, .score-list li, .foot')]
    .filter(el => !/data:image/.test(getComputedStyle(el).backgroundImage)).length);
  check('and every rule is drawn rather than ruled', uses === 0, String(uses));

  check('no errors on the console', !errs.length, errs.join(' | '));

  console.log(fails.length ? `\n${fails.length} FAILING: ${fails.join(' | ')}` : '\npage checks pass');
  await b.close();
  process.exit(fails.length ? 1 : 0);
})();
