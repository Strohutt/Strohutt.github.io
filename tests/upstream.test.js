const BASE = `http://localhost:${process.env.PORT || 8899}`;
const { chromium } = require('playwright');

const fails = [];
const check = (n, ok, d) => { console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  — ' + d : '')); if (!ok) fails.push(n); };

const LONG = 'x'.repeat(220);
const MANY = Array.from({ length: 20 }, (_, i) => ({
  type: 0, name: `Game ${i} ${LONG.slice(0, 60)}`, timestamps: { start: Date.now() - i * 1e6 }
}));

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

  const open = async (routes = {}, opts = {}) => {
    const p = await b.newPage({ viewport: { width: 1340, height: 900 }, ...opts });
    p.on('pageerror', e => fails.push('pageerror: ' + e.message));
    for (const [pat, handler] of Object.entries(routes)) await p.route(pat, handler);
    await p.goto(BASE + '/index.html');
    return p;
  };
  const overflows = p => p.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);

  // ── every upstream refuses
  let p = await open({
    '**/api.lanyard.rest/**': r => r.abort(),
    '**/graphql.anilist.co/**': r => r.abort(),
    '**/oembed**': r => r.abort()
  });
  await p.waitForTimeout(2500);
  check('all upstreams dead: page still stands', !(await overflows(p)));
  check('all upstreams dead: the favourites stay hidden', await p.evaluate(() => document.getElementById('likes').hidden));
  check('all upstreams dead: readout says so',
    /reach|can't|offline/i.test(await p.evaluate(() => document.getElementById('dc-state').textContent)),
    await p.evaluate(() => document.getElementById('dc-state').textContent));
  await p.close();

  // ── twenty activities, all with very long names
  p = await open();
  await p.waitForTimeout(1200);
  await p.evaluate(acts => render({
    discord_user: { id: '1', username: 'u', display_name: 'Strohut', avatar: null },
    discord_status: 'online', activities: acts, listening_to_spotify: false, spotify: null
  }), MANY);
  await p.waitForTimeout(400);
  check('twenty activities do not overflow', !(await overflows(p)));
  check('twenty activities all render', await p.evaluate(() => document.querySelectorAll('#dc-doing li').length) === 20);
  await p.close();

  // ── a song with a novel for a title
  p = await open();
  await p.waitForTimeout(1200);
  await p.evaluate(t => render({
    discord_user: { id: '1', username: 'u', display_name: 'Strohut', avatar: null },
    discord_status: 'online', activities: [], listening_to_spotify: true,
    spotify: { track_id: 'x', song: t, artist: t, album_art_url: null, timestamps: { start: Date.now() - 1e4, end: Date.now() + 1e5 } }
  }), LONG);
  await p.waitForTimeout(400);
  check('200-char track does not overflow', !(await overflows(p)));
  await p.close();

  // ── the presence payload is malformed
  p = await open();
  await p.waitForTimeout(1200);
  const beforeJunk = await p.evaluate(() => document.getElementById('dc-name').textContent);
  await p.evaluate(() => { try { render({}); render(null); render({ discord_user: null }); } catch (e) { window.__threw = e.message; } });
  await p.waitForTimeout(200);
  check('malformed presence is ignored', !(await p.evaluate(() => window.__threw)) &&
    await p.evaluate(() => document.getElementById('dc-name').textContent) === beforeJunk);
  await p.close();

  // ── localStorage refuses to play
  p = await b.newPage({ viewport: { width: 1340, height: 900 } });
  p.on('pageerror', e => fails.push('pageerror(storage): ' + e.message));
  await p.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('denied'); } });
  });
  await p.goto(BASE + '/index.html');
  await p.waitForTimeout(1500);
  check('localStorage blocked: page still works',
    await p.evaluate(() => !!document.querySelector('.name')) && !(await overflows(p)));
  await p.close();

  // ── the socket drops and comes back
  p = await open();
  await p.waitForTimeout(1500);
  await p.evaluate(() => render({
    discord_user: { id: '1', username: 'u', display_name: 'Strohut', avatar: null },
    discord_status: 'online', activities: [{ type: 0, name: 'Minecraft' }], listening_to_spotify: false, spotify: null
  }));
  await p.waitForTimeout(200);
  const had = await p.evaluate(() => document.querySelectorAll('#dc-doing li').length);
  await p.evaluate(() => render({
    discord_user: { id: '1', username: 'u', display_name: 'Strohut', avatar: null },
    discord_status: 'offline', activities: [], listening_to_spotify: false, spotify: null
  }));
  await p.waitForTimeout(200);
  check('presence update clears the old one', had === 1 &&
    await p.evaluate(() => document.querySelectorAll('#dc-doing li').length) === 0);
  check('quiet line appears when nothing is on', !(await p.evaluate(() => document.getElementById('dc-quiet').hidden)));
  await p.close();

  /* What the page remembers between visits. Nothing playing is not the
     same as nothing ever playing, and the panel should not have to choose
     between claiming silence and saying nothing. */
  const SONG = playing => ({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ success: true, data: {
      discord_user: { id: '1', username: 'u', display_name: 'Strohut', avatar: null },
      discord_status: 'online', activities: [], listening_to_spotify: playing,
      spotify: playing ? { track_id: 'abc123', song: 'Kaikai Kitan', artist: 'Eve', album: 'Smile',
        album_art_url: '', timestamps: { start: Date.now() - 3e4, end: Date.now() + 1e5 } } : null } })
  });

  const jar = await b.newContext({ viewport: { width: 1340, height: 900 } });

  p = await jar.newPage();
  p.on('pageerror', e => fails.push('pageerror(cache 1): ' + e.message));
  await p.route('**/api.lanyard.rest/**', r => r.fulfill(SONG(true)));
  await p.goto(BASE + '/index.html');
  await p.waitForTimeout(1600);
  check('a track that is playing says so',
    await p.evaluate(() => document.getElementById('music-kicker').textContent) === 'now playing');
  await p.close();

  // same visitor, back later, and the music has stopped
  p = await jar.newPage();
  p.on('pageerror', e => fails.push('pageerror(cache 2): ' + e.message));
  await p.route('**/api.lanyard.rest/**', r => r.fulfill(SONG(false)));
  await p.goto(BASE + '/index.html');
  await p.waitForTimeout(1600);
  check('nothing playing falls back to the last one caught',
    await p.evaluate(() => document.getElementById('music-kicker').textContent) === 'last played' &&
    await p.evaluate(() => document.getElementById('track-song').textContent) === 'Kaikai Kitan');
  check('the last one caught says when it was',
    /ago$/.test(await p.evaluate(() => document.getElementById('track-seen').textContent)),
    await p.evaluate(() => document.getElementById('track-seen').textContent));
  check('the fallback links at the track it actually names',
    /abc123/.test(await p.evaluate(() => document.getElementById('music-link').href)));
  await p.close();
  await jar.close();

  // a first-ever visit with nothing stored: the panel must not invent a
  // song, and must not link at one nobody picked
  p = await open({ '**/api.lanyard.rest/**': r => r.fulfill(SONG(false)) });
  await p.waitForTimeout(1600);
  check('cold and quiet: the panel says nothing is playing',
    await p.evaluate(() => document.getElementById('track-song').textContent) === 'nothing playing');
  check('cold and quiet: no link to a track nobody picked',
    await p.evaluate(() => document.getElementById('music-link').hidden));
  await p.close();

  /* Anilist. This is the one upstream nobody here can reach, so every
     shape it might answer with is forced rather than assumed. */
  const media = (over = {}) => ({
    id: 1, siteUrl: 'https://anilist.co/manga/1', format: 'MANGA', status: 'RELEASING',
    chapters: 271, volumes: 30, title: { romaji: 'Jujutsu Kaisen', english: 'Jujutsu Kaisen', native: '呪術廻戦' },
    coverImage: { large: 'https://example.invalid/cover.jpg' }, startDate: { year: 2018 }, ...over
  });
  const anilist = body => r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  // the page asks Page { media }, so an answer is a list per alias
  const page = (...items) => ({ media: items.filter(Boolean) });

  p = await open({ '**/graphql.anilist.co/**': r => r.abort(), '**/api.github.com/**': r => r.abort() });
  await p.waitForTimeout(2000);
  check('anilist dead: the panel stays hidden', await p.evaluate(() => document.getElementById('likes').hidden));
  await p.close();

  p = await open({ '**/graphql.anilist.co/**': anilist({ errors: [{ message: 'nope' }] }) });
  await p.waitForTimeout(1800);
  check('anilist errors: the panel stays hidden', await p.evaluate(() => document.getElementById('likes').hidden));
  await p.close();

  p = await open({ '**/graphql.anilist.co/**': anilist({ data: { jjk: page(), gohs: page(), op: page() } }) });
  await p.waitForTimeout(1800);
  check('anilist finds none of them: the panel stays hidden',
    await p.evaluate(() => document.getElementById('likes').hidden));
  await p.close();

  // one of the three missing is still worth showing
  p = await open({ '**/graphql.anilist.co/**': anilist({ data: { jjk: page(media()), gohs: page(), op: page(media({ title: { romaji: 'One Piece', native: 'ONE PIECE' } })) } }) });
  await p.waitForTimeout(1800);
  check('anilist missing one: the other two still show',
    await p.evaluate(() => document.querySelectorAll('#like-list li').length) === 2,
    String(await p.evaluate(() => document.querySelectorAll('#like-list li').length)));
  await p.close();

  // a record with nothing but a title, which is all the code may assume
  p = await open({ '**/graphql.anilist.co/**': anilist({ data: { jjk: page({ title: { romaji: 'Jujutsu Kaisen' } }) } }) });
  await p.waitForTimeout(1800);
  check('anilist sends only a title: it still renders',
    await p.evaluate(() => document.querySelectorAll('#like-list li').length) === 1 &&
    await p.evaluate(() => document.querySelector('.like-name').textContent) === 'Jujutsu Kaisen');
  check('a record with no cover keeps its empty plate',
    await p.evaluate(() => !!document.querySelector('.cover-void') &&
      getComputedStyle(document.querySelector('.cover-void')).display !== 'none'));
  await p.close();

  /* An image that starts display:none and is loading="lazy" never loads —
     it is never near the viewport, so the load event that would reveal it
     never fires, and it waits for itself for as long as the tab is open.
     Nothing errors and nothing appears. */
  const COVER = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 230 345"><rect width="230" height="345" fill="#c9c4b8"/></svg>');
  p = await open({ '**/graphql.anilist.co/**': anilist({ data: { jjk: page(media({ coverImage: { large: COVER } })) } }) });
  await p.waitForTimeout(2200);
  const cover = await p.evaluate(() => {
    const img = document.querySelector('.cover img');
    return { loaded: img.complete && img.naturalWidth > 0, shown: img.classList.contains('is-there'),
      plate: getComputedStyle(document.querySelector('.cover-void')).display };
  });
  check('a cover that exists actually loads', cover.loaded, JSON.stringify(cover));
  check('a loaded cover is visible', cover.shown, JSON.stringify(cover));
  check('a loaded cover covers its empty plate', cover.plate === 'none', cover.plate);
  await p.close();

  // the cover host refusing must not leave a broken image
  p = await open({
    '**/graphql.anilist.co/**': anilist({ data: { jjk: page(media()) } }),
    '**/example.invalid/**': r => r.abort()
  });
  await p.waitForTimeout(2000);
  check('a blocked cover leaves the plate, not a broken image',
    await p.evaluate(() => !document.querySelector('.cover img').classList.contains('is-there') &&
      getComputedStyle(document.querySelector('.cover-void')).display !== 'none'));
  await p.close();

  /* A search returns a best match, not a promise: it can hand back a
     spin-off, a colour edition or a databook. The card would then state
     that thing's format and chapter count under a heading saying these
     are his favourites. */
  p = await open({ '**/graphql.anilist.co/**': anilist({ data: {
    jjk: page(media({ title: { romaji: 'Jujutsu Kaisen 0: Tokyo Metropolitan Curse Technical School' } })),
    op: page(media({ title: { romaji: 'One Piece' } }))
  } }) });
  await p.waitForTimeout(1800);
  check('a search whose only hit is a spin-off is dropped',
    JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('.like-name')].map(a => a.textContent))) === '["One Piece"]',
    JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('.like-name')].map(a => a.textContent))));
  await p.close();

  /* The whole reason for taking a list rather than one best guess: the
     top hit being wrong no longer costs the row. */
  p = await open({ '**/graphql.anilist.co/**': anilist({ data: {
    op: page(
      media({ title: { romaji: 'One Piece: Colour Walk' }, chapters: 1 }),
      media({ title: { romaji: 'One Piece Databook' }, chapters: 2 }),
      media({ title: { romaji: 'One Piece', native: 'ONE PIECE' }, chapters: null, status: 'RELEASING' })
    )
  } }) });
  await p.waitForTimeout(1800);
  check('the right entry is taken from further down the results',
    JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('.like-name')].map(a => a.textContent))) === '["One Piece"]',
    JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('.like-name')].map(a => a.textContent))));
  check('and it is that entry that is described, not the top hit',
    !/chapters/.test(await p.evaluate(() => document.querySelector('.like-meta').textContent)),
    await p.evaluate(() => document.querySelector('.like-meta').textContent));
  await p.close();

  // the same work under a name with an article and different punctuation
  p = await open({ '**/graphql.anilist.co/**': anilist({ data: {
    gohs: page(media({ title: { romaji: 'God of High School', native: '갓 오브 하이스쿨' }, format: 'MANHWA' }))
  } }) });
  await p.waitForTimeout(1800);
  check('a leading "the" and punctuation do not lose a match',
    await p.evaluate(() => document.querySelectorAll('#like-list li').length) === 1);
  check('a manhwa is called a manhwa',
    /manhwa/i.test(await p.evaluate(() => (document.querySelector('.like-meta') || {}).textContent || '')),
    await p.evaluate(() => (document.querySelector('.like-meta') || {}).textContent || ''));
  await p.close();

  // a title long enough to be a paragraph
  p = await open({ '**/graphql.anilist.co/**': anilist({ data: { jjk: page(media({ title: { romaji: 'Jujutsu Kaisen', native: LONG } })) } }) });
  await p.waitForTimeout(1800);
  check('a 220-char title does not overflow', !(await overflows(p)));
  await p.close();

  await b.close();
  console.log(fails.length ? '\n' + fails.length + ' FAILING: ' + fails.join(' | ') : '\nall failure modes hold');
  process.exit(fails.length ? 1 : 0);
})();
