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
    '**/api.github.com/**': r => r.abort(),
    '**/oembed**': r => r.abort()
  });
  await p.waitForTimeout(2500);
  check('all upstreams dead: page still stands', !(await overflows(p)));
  check('all upstreams dead: pushes stay hidden', await p.evaluate(() => document.getElementById('pushes').hidden));
  check('all upstreams dead: readout says so',
    /reach|can't|offline/i.test(await p.evaluate(() => document.getElementById('dc-state').textContent)),
    await p.evaluate(() => document.getElementById('dc-state').textContent));
  await p.close();

  // ── github rate limits
  p = await open({ '**/api.github.com/**': r => r.fulfill({ status: 403, contentType: 'application/json', body: '{"message":"rate limit"}' }) });
  await p.waitForTimeout(1800);
  check('github 403: panel stays hidden', await p.evaluate(() => document.getElementById('pushes').hidden));
  await p.close();

  // ── github answers with junk
  p = await open({ '**/api.github.com/**': r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"not":"an array"}' }) });
  await p.waitForTimeout(1500);
  check('github junk: panel stays hidden', await p.evaluate(() => document.getElementById('pushes').hidden));
  await p.close();

  // ── github answers with events that have no commits
  p = await open({
    '**/api.github.com/**': r => r.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify([{ type: 'PushEvent', repo: { name: 'a/b' }, created_at: new Date().toISOString(), payload: {} }])
    })
  });
  await p.waitForTimeout(1500);
  check('push with no commits renders', await p.evaluate(() => document.querySelectorAll('#push-list li').length) === 1);
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

  await b.close();
  console.log(fails.length ? '\n' + fails.length + ' FAILING: ' + fails.join(' | ') : '\nall failure modes hold');
  process.exit(fails.length ? 1 : 0);
})();
