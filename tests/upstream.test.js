const BASE = `http://localhost:${process.env.PORT || 8899}`;
const { launchBrowser, blockLanyardSocket } = require('./browser');

const fails = [];
const check = (n, ok, d) => { console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  — ' + d : '')); if (!ok) fails.push(n); };

const LONG = 'x'.repeat(220);
const MANY = Array.from({ length: 20 }, (_, i) => ({
  type: 0, name: `Game ${i} ${LONG.slice(0, 60)}`, timestamps: { start: Date.now() - i * 1e6 }
}));

(async () => {
  const b = await launchBrowser();

  /* Skip the separately tested arrival barrier. */
  const seen = () => { try { sessionStorage.setItem('strohut-seen', '1'); } catch { /* nothing to do */ } };

  const open = async (routes = {}, opts = {}) => {
    const p = await b.newPage({ viewport: { width: 1340, height: 900 }, ...opts });
    await p.addInitScript(seen);
    await blockLanyardSocket(p);
    p.on('pageerror', e => fails.push('pageerror: ' + e.message));
    await p.route('**/api.lanyard.rest/**', r => r.abort());
    for (const [pat, handler] of Object.entries(routes)) await p.route(pat, handler);
    await p.goto(BASE + '/index.html');
    return p;
  };
  const overflows = p => p.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  const favouriteState = p => p.evaluate(() => {
    const box = document.getElementById('likes');
    return {
      hidden: box.hidden,
      source: box.dataset.source,
      count: document.querySelectorAll('#like-list li').length,
      fallback: document.querySelectorAll('#like-list [data-fallback]').length
    };
  });

  // ── every upstream refuses
  let p = await open({
    '**/api.lanyard.rest/**': r => r.abort(),
    '**/graphql.anilist.co/**': r => r.abort()
  });
  await p.waitForTimeout(2500);
  check('all upstreams dead: page still stands', !(await overflows(p)));
  check('all upstreams dead: the authored favourites remain',
    await (async () => { const state = await favouriteState(p); return !state.hidden && state.source === 'authored' && state.count === 3 && state.fallback === 3; })());
  check('all upstreams dead: readout says so',
    /reach|can't|offline/i.test(await p.evaluate(() => document.getElementById('dc-state').textContent)),
    await p.evaluate(() => document.getElementById('dc-state').textContent));

  /* Static work does not depend on either upstream. The presence readout
     keeps its row even when Discord cannot answer, and Chapter Two still
     carries its authored evidence. */
  const alone = await p.evaluate(() => {
    const now = document.querySelector('.now').getBoundingClientRect();
    const spread = document.querySelector('.spread').getBoundingClientRect();
    return { now: Math.round(now.width), spread: Math.round(spread.width), work: !!document.getElementById('work') };
  });
  check('all upstreams dead: the readout still takes its row',
    alone.now > alone.spread * .9, JSON.stringify(alone));
  check('all upstreams dead: the authored work chapter still stands', alone.work);
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

  /* Discord's app assets go missing all the time — an asset the developer
     deleted, an id that never resolved, a filter that blocks the cdn. The
     row has to look like a row without one, not like a broken picture in
     a white box. */
  const playing = art => ({
    discord_user: { id: '1', username: 'u', display_name: 'Strohut', avatar: null },
    discord_status: 'online', listening_to_spotify: false, spotify: null,
    activities: [{ type: 0, name: 'Counter-Strike 2', application_id: '730', assets: { large_image: art } }]
  });
  const plateOf = () => p.evaluate(() => {
    const li = document.querySelector('#dc-doing li');
    const img = li.querySelector('img');
    const plate = li.querySelector('.no-art');
    return {
      plate: !!plate, box: Math.round(plate.getBoundingClientRect().width),
      img: img ? getComputedStyle(img).opacity : null
    };
  });

  p = await open({ '**/cdn.discordapp.com/**': r => r.abort() });
  await p.waitForTimeout(1200);
  await p.evaluate(body => render(body), playing('gone'));
  await p.waitForTimeout(700);
  let art = await plateOf();
  check('an icon that never arrives leaves the plate', art.plate, JSON.stringify(art));
  check('and no broken picture with it', art.img === null, JSON.stringify(art));
  check('and the row keeps the size it had', art.box > 20, JSON.stringify(art));
  await p.close();

  // and one that does arrive is shown, over the plate it was waiting on
  const ICON = r => r.fulfill({ status: 200, contentType: 'image/svg+xml',
    body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><rect width="8" height="8" fill="#c9c4b8"/></svg>' });
  p = await open({ '**/media.discordapp.net/**': ICON });
  await p.waitForTimeout(1200);
  await p.evaluate(body => render(body), playing('mp:external/x/https/example.invalid/cover.png'));
  await p.waitForTimeout(900);
  art = await plateOf();
  check('an icon that arrives is shown', art.img === '1', JSON.stringify(art));
  await p.close();

  // ── what Discord shares, and what this page chooses to show
  p = await open();
  await p.waitForTimeout(1200);
  await p.evaluate(() => render({
    discord_user: { id: '1', username: 'u', display_name: 'Strohut', avatar: null },
    discord_status: 'online', listening_to_spotify: true,
    spotify: { track_id: 'x', song: 'Kaikai Kitan', artist: 'Eve' },
    activities: [
      { type: 4, state: 'building quietly' },
      { type: 2, name: 'Spotify', details: 'Kaikai Kitan', state: 'Eve' },
      { type: 0, name: 'Roblox', details: 'Playing an experience' },
      { type: 0, name: 'Visual Studio Code', details: 'Editing script.js' }
    ]
  }));
  await p.waitForTimeout(400);
  const shared = await p.evaluate(() => ({
    rows: [...document.querySelectorAll('#dc-doing li')].map(li => li.textContent),
    state: document.getElementById('dc-state').textContent,
    quiet: document.getElementById('dc-quiet').hidden
  }));
  check('a shared Roblox activity renders', shared.rows.some(row => /Roblox/.test(row)), shared.rows.join(' | '));
  check('other non-custom activities still render', shared.rows.some(row => /Visual Studio Code/.test(row)), shared.rows.join(' | '));
  check('custom status stays in the presence line', shared.state === 'building quietly', shared.state);
  check('Spotify is not folded into right now', shared.rows.length === 2 && shared.rows.every(row => !/Spotify|Kaikai Kitan/.test(row)), shared.rows.join(' | '));
  check('real activities keep the quiet line hidden', shared.quiet);

  await p.evaluate(() => render({
    discord_user: { id: '1', username: 'u', display_name: 'Strohut', avatar: null },
    discord_status: 'online', listening_to_spotify: true,
    spotify: { track_id: 'x', song: 'Kaikai Kitan', artist: 'Eve' },
    activities: [{ type: 2, name: 'Spotify', details: 'Kaikai Kitan', state: 'Eve' }]
  }));
  await p.waitForTimeout(200);
  const onlySpotify = await p.evaluate(() => ({
    rows: document.querySelectorAll('#dc-doing li').length,
    quiet: document.getElementById('dc-quiet').hidden,
    quietText: document.getElementById('dc-quiet').textContent,
    music: !!document.querySelector('#music, .music, [id^="track-"]')
  }));
  check('Spotify alone is reported as no shared game or app activity', onlySpotify.rows === 0 && !onlySpotify.quiet && /no (?:game or app )?activity shared/.test(onlySpotify.quietText), JSON.stringify(onlySpotify));
  check('Spotify creates no separate UI', !onlySpotify.music);
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
  await p.addInitScript(seen);
  p.on('pageerror', e => fails.push('pageerror(storage): ' + e.message));
  await p.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('denied'); } });
  });
  await p.goto(BASE + '/index.html');
  await p.waitForTimeout(1500);
  check('localStorage blocked: page still works',
    await p.evaluate(() => !!document.querySelector('.name')) && !(await overflows(p)));

  await p.close();

  /* Session storage refusing is the one that matters, because it is the
     one everything here uses: the barrier, the run and the islands. A
     browser in a locked-down mode throws on the property itself,
     not on the write — and every one of those reads happens before
     anything is drawn. */
  p = await b.newPage({ viewport: { width: 1340, height: 900 } });
  const broke = [];
  p.on('pageerror', e => broke.push(e.message));
  await p.addInitScript(() => {
    Object.defineProperty(window, 'sessionStorage', { get() { throw new DOMException('denied'); } });
  });
  await p.goto(BASE + '/index.html');
  await p.waitForTimeout(2400);
  check('sessionStorage blocked: nothing throws', !broke.length, broke.join(' | '));
  check('sessionStorage blocked: the page is still there',
    await p.evaluate(() => !!document.querySelector('.name')) && !(await overflows(p)));
  check('sessionStorage blocked: and the field still takes a hold', await p.evaluate(() => {
    const a = document.getElementById('flash-arena');
    a.scrollIntoView({ block: 'center' });
    const r = a.getBoundingClientRect();
    a.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, buttons: 1,
      clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 1, isPrimary: true }));
    const on = document.querySelectorAll('.charge').length > 0;
    dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0 }));
    return on;
  }));
  await p.close();

  /* The barrier, the run and the island log belong to this visit. None of
     them has any reason to outlive the tab. */
  p = await open();
  await p.waitForTimeout(1600);
  const shelves = await p.evaluate(() => ({
    session: Object.keys(sessionStorage),
    local: Object.keys(localStorage)
  }));
  check('the visit is remembered in session storage', shelves.session.length > 0, JSON.stringify(shelves));
  check('and nothing at all outlives it', shelves.local.length === 0, JSON.stringify(shelves));
  await p.close();

  /* ── an upstream that is having a bad time
     The socket was retried every twelve seconds for as long as the tab
     lived, which against a service that is down is three hundred attempts
     an hour from one page left open on a second monitor. It backs off
     now — and because backing off makes coming back slow, bringing the
     tab forward tries at once rather than waiting out the delay. */
  p = await b.newPage({ viewport: { width: 1340, height: 900 } });
  await p.addInitScript(seen);
  await p.addInitScript(() => {
    window.__socketTries = [];
    class ClosingSocket extends EventTarget {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSED = 3;

      constructor() {
        super();
        this.readyState = ClosingSocket.CONNECTING;
        window.__socketTries.push(performance.now());
        setTimeout(() => {
          this.readyState = ClosingSocket.CLOSED;
          this.dispatchEvent(new Event('close'));
        }, 20);
      }

      send() {}
      close() { this.readyState = ClosingSocket.CLOSED; }
    }
    Object.defineProperty(window, 'WebSocket', { configurable: true, value: ClosingSocket });
  });
  await p.route('**/api.lanyard.rest/v1/**', r => r.abort());
  await p.goto(BASE + '/index.html');
  await p.waitForTimeout(15000);

  const tries = await p.evaluate(() => window.__socketTries);
  const gaps = tries.slice(1).map((t, i) => t - tries[i]);
  check('a socket that will not open is tried again', tries.length >= 2, JSON.stringify(gaps));
  check('and each wait is longer than the last',
    gaps.length >= 2 && gaps.every((g, i) => i === 0 || g > gaps[i - 1] * 1.2), JSON.stringify(gaps));
  check('and it is not hammered', tries.length <= 6, `${tries.length} in 15s`);

  const before = tries.length;
  await p.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await p.waitForTimeout(1200);
  const after = await p.evaluate(() => window.__socketTries.length);
  check('coming back to the tab tries at once', after > before,
    `${before} → ${after}`);
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
  check('anilist dead: the authored shelf remains',
    await (async () => { const state = await favouriteState(p); return !state.hidden && state.source === 'authored' && state.count === 3; })());
  await p.close();

  p = await b.newPage({ viewport: { width: 1340, height: 900 } });
  await p.addInitScript(seen);
  await blockLanyardSocket(p);
  p.on('pageerror', e => fails.push('pageerror(authored favourites): ' + e.message));
  await p.route('**/api.lanyard.rest/**', r => r.abort());
  await p.route('**/graphql.anilist.co/**', r => r.abort());
  await p.route('**/index.html', async r => {
    const response = await r.fetch();
    const html = (await response.text()).replace(
      /(<ul class="like-list" id="like-list">)[\s\S]*?(<\/ul>)/,
      '$1$2'
    );
    await r.fulfill({ response, body: html });
  });
  await p.goto(BASE + '/index.html');
  await p.waitForTimeout(2000);
  const authored = await p.evaluate(() => ({
    source: document.getElementById('likes').dataset.source,
    rows: [...document.querySelectorAll('#like-list li')].map(row => ({
      fallback: row.dataset.fallback,
      title: row.querySelector('.like-name')?.textContent.trim(),
      meta: row.querySelector('.like-meta')?.textContent.replace(/\s+/g, ' ').trim(),
      linked: !!row.querySelector('.like-name a'),
      cover: !!row.querySelector('.cover img[src]')
    }))
  }));
  check('script restores the three authored favourites when markup is empty',
    authored.source === 'authored' &&
      JSON.stringify(authored.rows.map(row => row.title)) ===
        '["Jujutsu Kaisen","The God of High School","One Piece"]' &&
      authored.rows.every(row => row.fallback === 'true'), JSON.stringify(authored));
  check('the authored fallback only states title and format',
    JSON.stringify(authored.rows.map(row => row.meta)) === '["manga","manhwa","manga"]' &&
      authored.rows.every(row => !row.linked && !row.cover), JSON.stringify(authored));
  await p.close();

  p = await open({ '**/graphql.anilist.co/**': anilist({ errors: [{ message: 'nope' }] }) });
  await p.waitForTimeout(1800);
  check('anilist errors: the authored shelf remains',
    await (async () => { const state = await favouriteState(p); return !state.hidden && state.source === 'authored' && state.count === 3; })());
  await p.close();

  p = await open({ '**/graphql.anilist.co/**': anilist({ data: { jjk_book: page(), gohs_book: page(), op_book: page() } }) });
  await p.waitForTimeout(1800);
  check('anilist finds none of them: the authored shelf remains',
    await (async () => { const state = await favouriteState(p); return !state.hidden && state.source === 'authored' && state.count === 3; })());
  await p.close();

  // one of the three missing is still worth showing
  p = await open({ '**/graphql.anilist.co/**': anilist({ data: { jjk_book: page(media()), gohs_book: page(), op_book: page(media({ title: { romaji: 'One Piece', native: 'ONE PIECE' } })) } }) });
  await p.waitForTimeout(1800);
  check('anilist missing one: the other two still show',
    await p.evaluate(() => document.querySelectorAll('#like-list li').length) === 2,
    String(await p.evaluate(() => document.querySelectorAll('#like-list li').length)));
  await p.close();

  // a record with nothing but a title, which is all the code may assume
  p = await open({ '**/graphql.anilist.co/**': anilist({ data: { jjk_book: page({ title: { romaji: 'Jujutsu Kaisen' } }) } }) });
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
  p = await open({ '**/graphql.anilist.co/**': anilist({ data: { jjk_book: page(media({ coverImage: { large: COVER } })) } }) });
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
    '**/graphql.anilist.co/**': anilist({ data: { jjk_book: page(media()) } }),
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
    jjk_book: page(media({ title: { romaji: 'Jujutsu Kaisen 0: Tokyo Metropolitan Curse Technical School' } })),
    op_book: page(media({ title: { romaji: 'One Piece' } }))
  } }) });
  await p.waitForTimeout(1800);
  check('a search whose only hit is a spin-off is dropped',
    JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('.like-name')].map(a => a.textContent))) === '["One Piece"]',
    JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('.like-name')].map(a => a.textContent))));
  await p.close();

  /* The whole reason for taking a list rather than one best guess: the
     top hit being wrong no longer costs the row. */
  p = await open({ '**/graphql.anilist.co/**': anilist({ data: {
    op_book: page(
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

  /* The adaptation only ever adds a line, so it must not be able to take
     one away: with the book found and the anime search landing on a
     recap film, the card is still the book's. */
  p = await open({ '**/graphql.anilist.co/**': anilist({ data: {
    op_book: page(media({ title: { romaji: 'One Piece' }, chapters: null })),
    op_screen: page(media({ title: { romaji: 'One Piece Film: Red' }, episodes: 1 }))
  } }) });
  await p.waitForTimeout(1800);
  check('an adaptation that does not match is left off',
    await p.evaluate(() => document.querySelectorAll('#like-list li').length) === 1 &&
    !/episodes/i.test(await p.evaluate(() => document.querySelector('.like-text').textContent)),
    await p.evaluate(() => document.querySelector('.like-text').textContent.replace(/\s+/g, ' ')));
  await p.close();

  // and one that does match adds its own line
  p = await open({ '**/graphql.anilist.co/**': anilist({ data: {
    op_book: page(media({ title: { romaji: 'One Piece' }, chapters: null })),
    op_screen: page(media({ title: { romaji: 'One Piece' }, episodes: 1140, status: 'RELEASING' }))
  } }) });
  await p.waitForTimeout(1800);
  check('an adaptation that matches says how much of it there is',
    /1140 episodes/i.test(await p.evaluate(() => document.querySelector('.like-text').textContent)),
    await p.evaluate(() => document.querySelector('.like-text').textContent.replace(/\s+/g, ' ')));
  check('a screen-only answer does not replace the authored shelf',
    await (async () => {
      const q = await open({ '**/graphql.anilist.co/**': anilist({ data: {
        op_screen: page(media({ title: { romaji: 'One Piece' }, episodes: 1140 }))
      } }) });
      await q.waitForTimeout(1600);
      const state = await favouriteState(q);
      await q.close();
      return !state.hidden && state.source === 'authored' && state.count === 3;
    })());
  await p.close();

  /* Titles are matched on their latin letters, so a native-script one
     reduces to nothing. Two nothings must not be a match, or everything
     matches everything. */
  p = await open({ '**/graphql.anilist.co/**': anilist({ data: {
    op_book: page(media({ title: { native: '別のもの' } }), media({ title: { romaji: 'One Piece' } }))
  } }) });
  await p.waitForTimeout(1800);
  check('a native-only title does not match everything',
    JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('.like-name')].map(a => a.textContent))) === '["One Piece"]',
    JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('.like-name')].map(a => a.textContent))));
  await p.close();

  // the same work under a name with an article and different punctuation
  p = await open({ '**/graphql.anilist.co/**': anilist({ data: {
    gohs_book: page(media({ title: { romaji: 'God of High School', native: '갓 오브 하이스쿨' }, format: 'MANHWA' }))
  } }) });
  await p.waitForTimeout(1800);
  check('a leading "the" and punctuation do not lose a match',
    await p.evaluate(() => document.querySelectorAll('#like-list li').length) === 1);
  check('a manhwa is called a manhwa',
    /manhwa/i.test(await p.evaluate(() => (document.querySelector('.like-meta') || {}).textContent || '')),
    await p.evaluate(() => (document.querySelector('.like-meta') || {}).textContent || ''));
  await p.close();

  /* The facts about a book run out of room in the column and wrap, and the
     break has to land between two of them: "1140 episodes" split across
     two lines reads as two different numbers for a moment. Each fact is
     one unbreakable run, so a fact drawn over two lines is a failure —
     and the text has to still read as one sentence to anything copying
     it, which the runs are built not to disturb. */
  p = await open({ '**/graphql.anilist.co/**': anilist({ data: {
    op_book: page(media({ title: { romaji: 'One Piece' }, chapters: 1140, format: 'MANGA' })),
    op_screen: page({ title: { romaji: 'One Piece' }, episodes: 1140, status: 'RELEASING', genres: [] })
  } }) }, { viewport: { width: 380, height: 800 } });
  await p.waitForTimeout(1800);
  check('the facts about a book read as one sentence',
    /manga · still going · 1140 chapters · since 2018/.test(
      await p.evaluate(() => (document.querySelector('.like-meta') || {}).textContent || '')),
    await p.evaluate(() => (document.querySelector('.like-meta') || {}).textContent || ''));
  const split = await p.evaluate(() => [...document.querySelectorAll('.like-meta .fact')]
    .filter(f => f.getClientRects().length > 1).map(f => f.textContent));
  check('and no one of them is broken over two lines', split.length === 0, JSON.stringify(split));
  check('and they wrap inside the card rather than past it', !(await overflows(p)));
  await p.close();

  /* ── the books are kept for the visit
     Three favourites and their adaptations change about as often as
     anybody's favourites do, and the panel was asked for again on every
     reload — arriving a second after the rest of the page, every time. A
     reload draws them from the visit's own shelf straight away and asks
     anilist again behind them. */
  const BOOKS = anilist({ data: {
    jjk_book: page(media({ title: { romaji: 'Jujutsu Kaisen' } })),
    gohs_book: page(media({ title: { romaji: 'The God of High School' }, format: 'MANHWA' })),
    op_book: page(media({ title: { romaji: 'One Piece' } }))
  } });

  p = await open({ '**/graphql.anilist.co/**': BOOKS });
  await p.waitForTimeout(1800);
  check('the books arrive', await p.evaluate(() => document.querySelectorAll('#like-list li').length) === 3,
    String(await p.evaluate(() => document.querySelectorAll('#like-list li').length)));
  check('the live answer replaces the authored shelf',
    await p.evaluate(() => document.getElementById('likes').dataset.source === 'anilist' &&
      document.querySelectorAll('#like-list [data-fallback]').length === 0));

  // and now anilist takes its time about answering
  await p.unroute('**/graphql.anilist.co/**');
  await p.route('**/graphql.anilist.co/**', async r => {
    await new Promise(done => setTimeout(done, 3000));
    return BOOKS(r);
  });
  await p.reload();
  await p.waitForTimeout(800);
  check('a reload has them before anilist has answered',
    await p.evaluate(() => document.querySelectorAll('#like-list li').length) === 3 &&
    !(await p.evaluate(() => document.getElementById('likes').hidden)) &&
    await p.evaluate(() => document.getElementById('likes').dataset.source === 'cache'),
    String(await p.evaluate(() => document.querySelectorAll('#like-list li').length)));

  /* Junk on the shelf is a card built out of something that is not a
     record. It has to be ignored, not thrown over. */
  await p.evaluate(() => sessionStorage.setItem('strohut-liked-2', '{"not":"an array"}'));
  await p.reload();
  await p.waitForTimeout(3600);
  check('junk on the shelf is ignored rather than drawn',
    await p.evaluate(() => document.querySelectorAll('#like-list li').length) === 3);
  await p.close();

  // and it goes with the tab, like everything else here
  p = await open({ '**/graphql.anilist.co/**': r => r.abort() });
  await p.waitForTimeout(1800);
  check('a new tab with anilist dead keeps the authored shelf',
    await (async () => { const state = await favouriteState(p); return !state.hidden && state.source === 'authored' && state.count === 3; })());
  await p.close();

  // a title long enough to be a paragraph
  p = await open({ '**/graphql.anilist.co/**': anilist({ data: { jjk_book: page(media({ title: { romaji: 'Jujutsu Kaisen', native: LONG } })) } }) });
  await p.waitForTimeout(1800);
  check('a 220-char title does not overflow', !(await overflows(p)));
  await p.close();

  await b.close();
  console.log(fails.length ? '\n' + fails.length + ' FAILING: ' + fails.join(' | ') : '\nall failure modes hold');
  process.exit(fails.length ? 1 : 0);
})();
