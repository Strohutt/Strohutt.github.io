const { launchBrowser, blockLanyardSocket } = require('./browser');

const BASE = `http://127.0.0.1:${process.env.PORT || 8899}`;
const failures = [];
const check = (label, pass, detail = '') => {
  console.log(`${pass ? 'ok  ' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!pass) failures.push(label);
};

const seen = () => sessionStorage.setItem('strohut-seen', '1');
const media = (title, format) => ({
  id: title.length,
  siteUrl: `https://anilist.co/${encodeURIComponent(title)}`,
  format,
  status: 'RELEASING',
  title: { romaji: title, english: title, native: title },
  coverImage: { large: 'https://example.invalid/cover.jpg' },
  startDate: { year: 2020 }
});

(async () => {
  const browser = await launchBrowser();

  const offline = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  await offline.addInitScript(seen);
  await blockLanyardSocket(offline);
  await offline.route('**/api.lanyard.rest/**', route => route.abort());
  await offline.route('**/graphql.anilist.co/**', route => route.abort());
  await offline.goto(`${BASE}/`);
  await offline.waitForTimeout(700);
  const fallback = await offline.evaluate(() => ({
    source: document.getElementById('likes').dataset.source,
    titles: [...document.querySelectorAll('#like-list .like-name')].map(node => node.textContent.trim()),
    links: document.querySelectorAll('#like-list .like-name a').length
  }));
  check('authored favourites survive without either service',
    fallback.source === 'authored' && fallback.titles.join('|') ===
      'Jujutsu Kaisen|The God of High School|One Piece' && fallback.links === 0,
    JSON.stringify(fallback));
  await offline.close();

  const live = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  await live.addInitScript(seen);
  await blockLanyardSocket(live);
  await live.route('**/api.lanyard.rest/**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: {
      discord_user: { id: '1', username: 'strohut', display_name: 'Strohut', avatar: null },
      discord_status: 'online',
      activities: [
        { type: 4, state: 'building the small version' },
        { type: 0, name: 'Roblox', details: 'Playing' },
        { type: 2, name: 'Spotify', details: 'Track' }
      ]
    } })
  }));
  await live.route('**/graphql.anilist.co/**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data: {
      jjk_book: { media: [media('Jujutsu Kaisen', 'MANGA')] },
      jjk_screen: { media: [] },
      gohs_book: { media: [media('The God of High School', 'MANHWA')] },
      gohs_screen: { media: [] },
      op_book: { media: [media('One Piece', 'MANGA')] },
      op_screen: { media: [] }
    } })
  }));
  await live.goto(`${BASE}/`);
  await live.waitForTimeout(900);
  const state = await live.evaluate(() => ({
    name: document.getElementById('dc-name').textContent,
    status: document.getElementById('dc-state').textContent,
    activities: [...document.querySelectorAll('#dc-doing li')].map(node => node.textContent),
    source: document.getElementById('likes').dataset.source,
    links: document.querySelectorAll('#like-list .like-name a').length
  }));
  check('presence renders the shared activity and keeps Spotify out',
    state.name === 'Strohut' && state.status === 'building the small version' &&
    state.activities.length === 1 && /Roblox/.test(state.activities[0]), JSON.stringify(state));
  check('AniList replaces the authored shelf when valid data arrives',
    state.source === 'anilist' && state.links === 3, JSON.stringify(state));

  await browser.close();
  console.log(failures.length ? `\n${failures.length} upstream check(s) failed` : '\nupstream checks pass');
  process.exit(failures.length ? 1 : 0);
})().catch(error => {
  console.error(error);
  process.exit(1);
});
