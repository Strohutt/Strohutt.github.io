/* Whether the page can actually be read and hit.

   Both of these are the kind of thing that is fine until somebody nudges
   a grey half a step darker or takes a padding off, and then is quietly
   wrong for everybody with tired eyes or a thumb. Neither is visible in a
   screenshot, so neither is caught by looking. They are measured.

   Text against what is really behind it — every layer composited, not
   just the nearest one that happens to have a background — against the
   AA thresholds: 4.5 for body text, 3 for large or bold. And every
   control against 24 by 24, which is the smallest a target is allowed to
   be, on the two narrowest screens this page ever sees. */
const BASE = `http://localhost:${process.env.PORT || 8899}`;
const { chromium, devices } = require('playwright');

const fails = [];
const check = (name, ok, detail) => {
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (detail ? '  — ' + detail : ''));
  if (!ok) fails.push(name);
};

/* Enough of the upstreams to get every panel on the page. Without them
   the favourites and the music never arrive, and those two carry most of
   the small grey text on the site. */
const now = Date.now();
const PRESENCE = {
  success: true,
  data: {
    discord_user: { id: '1', username: 'strohut', display_name: 'Strohut', avatar: null },
    discord_status: 'online', listening_to_spotify: true,
    spotify: { song: 'Kaikai Kitan', artist: 'Eve', album: 'Smile', album_art_url: '',
      track_id: 'abc', timestamps: { start: now - 74e3, end: now + 13e4 } },
    activities: [
      { type: 4, state: 'not here' },
      { type: 0, name: 'Counter-Strike 2', timestamps: { start: now - 42e5 }, assets: {},
        details: 'Competitive', state: 'de_dust2 — 12:4', party: { size: [5, 5] } },
      { type: 3, name: 'Crunchyroll', timestamps: { start: now - 3e5 }, assets: {},
        details: 'Jujutsu Kaisen', state: 'S2 E17' }
    ]
  }
};

const book = (romaji, over = {}) => ({
  media: [{
    id: 1, siteUrl: 'https://anilist.co/manga/1', format: 'MANGA', status: 'RELEASING',
    chapters: 271, title: { romaji, english: romaji, native: '呪術廻戦' },
    coverImage: { large: '' }, startDate: { year: 2018 }, genres: ['Action'], ...over
  }]
});

const ANILIST = { data: {
  jjk_book: book('Jujutsu Kaisen'),
  gohs_book: book('The God of High School', { format: 'MANHWA' }),
  op_book: book('One Piece')
} };

/* Composited from the page up, not read off the nearest ancestor that
   has a background — most of this page is translucent ink over a dark
   sheet, and taking the first non-transparent background as the answer
   overstates every ratio on it. */
const AUDIT = () => {
  const lum = ([r, g, b]) => {
    const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };

  /* getComputedStyle does not answer in one syntax. Plain values come
     back as rgb(); anything that went through color-mix comes back as
     color(srgb …) with channels from nought to one; and inside the
     domain, where the mix is against a colour the browser resolves in a
     different space, it comes back as oklab(). Three formats read as
     8-bit gives two wrong answers, and the wrong answers are the ones
     that say a light letter is black.

     So the browser is asked to do it. A canvas parses every colour
     syntax it supports and hands back the pixel it painted, which is the
     same conversion the compositor did. The hand parse stays as the
     fallback for anything the canvas refuses. */
  const nib = document.createElement('canvas');
  nib.width = nib.height = 1;
  const ctx = nib.getContext('2d', { willReadFrequently: true });

  const byHand = str => {
    const s = String(str).trim();
    const n = (s.match(/[\d.]+(?:e[-+]?\d+)?/g) || []).map(Number);
    if (!n.length) return [];
    if (/^color\(/.test(s)) {
      const out = [n[0] * 255, n[1] * 255, n[2] * 255];
      if (n[3] !== undefined) out.push(n[3]);
      return out;
    }
    return n.slice(0, 4);
  };

  const parse = str => {
    const s = String(str).trim();
    if (!s || s === 'none') return [];
    // transparent has to stay transparent: a canvas would report it as
    // black with an alpha of nought, which is a colour
    if (/^(transparent|rgba?\(0,\s*0,\s*0,\s*0\))$/.test(s)) return [0, 0, 0, 0];
    try {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = '#000';
      ctx.fillStyle = s;
      // a syntax it does not know leaves the previous value in place
      if (ctx.fillStyle === '#000' && !/^(#000|black|rgb\(0,\s*0,\s*0\))$/i.test(s)) return byHand(str);
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      return a === 255 ? [r, g, b] : [r, g, b, a / 255];
    } catch {
      return byHand(str);
    }
  };

  const over = (fg, bg) => {
    const a = fg[3] === undefined ? 1 : fg[3];
    return [0, 1, 2].map(i => fg[i] * a + bg[i] * (1 - a));
  };

  /* What is behind everything, read off the page rather than assumed —
     the domain turns the whole palette over for seven seconds, and an
     audit that measured against the usual near-black through that would
     be measuring against a colour that is not on the screen. */
  const SHEET = (() => {
    const c = parse(getComputedStyle(document.body).backgroundColor);
    return c.length >= 3 && (c[3] === undefined || c[3] > 0) ? c.slice(0, 3) : [8, 8, 11];
  })();

  const bgOf = el => {
    const stack = [];
    for (let node = el; node && node !== document.documentElement; node = node.parentElement) {
      const col = parse(getComputedStyle(node).backgroundColor);
      if (col.length >= 3 && (col[3] === undefined || col[3] > 0)) stack.push(col);
    }
    return stack.reverse().reduce((acc, col) => over(col, acc), SHEET);
  };

  const ratio = (a, b) => {
    const [hi, lo] = lum(a) > lum(b) ? [lum(a), lum(b)] : [lum(b), lum(a)];
    return (hi + 0.05) / (lo + 0.05);
  };

  const dim = [];
  for (const el of document.querySelectorAll('body *')) {
    const text = [...el.childNodes]
      .filter(n => n.nodeType === 3 && n.textContent.trim())
      .map(n => n.textContent.trim()).join(' ');
    if (!text) continue;

    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') continue;
    // things on their way in, and things drawn to be barely there
    if (parseFloat(s.opacity) < 0.5) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;

    const size = parseFloat(s.fontSize);
    const bold = parseInt(s.fontWeight, 10) >= 700;
    const need = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
    const bg = bgOf(el);
    const got = ratio(over(parse(s.color), bg), bg);
    if (got < need) {
      dim.push(`${text.slice(0, 24)} (${Math.round(got * 100) / 100} of ${need})`);
    }
  }

  const small = [];
  for (const el of document.querySelectorAll('a[href], button, input, [tabindex]:not([tabindex="-1"])')) {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || el.hidden) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    if (r.width < 24 || r.height < 24) {
      small.push(`${el.id || el.className || el.tagName} ${Math.round(r.width)}×${Math.round(r.height)}`);
    }
  }

  return { dim, small };
};

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const json = body => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

  for (const [tag, opts, which] of [
    ['the front, wide', { viewport: { width: 1340, height: 900 } }, 'index.html'],
    ['the front, on a phone', { ...devices['iPhone 13'] }, 'index.html'],
    ['the front, at 320px', { viewport: { width: 320, height: 700 }, hasTouch: true, isMobile: true }, 'index.html'],
    ['the 404, on a phone', { ...devices['iPhone 13'] }, '404.html']
  ]) {
    const c = await b.newContext(opts);
    const p = await c.newPage();
    p.on('pageerror', e => fails.push(`${tag}: pageerror ${e.message}`));
    await p.route('**/api.lanyard.rest/**', r => r.fulfill(json(PRESENCE)));
    await p.route('**/oembed**', r => r.fulfill(json({ title: 'Eve — Kaikai Kitan' })));
    await p.route('**/graphql.anilist.co/**', r => r.fulfill(json(ANILIST)));
    await p.addInitScript(() => {
      try { sessionStorage.setItem('strohut-seen', '1'); } catch { /* it will just show */ }
    });
    await p.goto(`${BASE}/${which}`);
    await p.waitForTimeout(2600);

    /* Everything on this page arrives when it is scrolled to, and a
       region that has not arrived is at opacity nought — which the audit
       skips. So the whole page is walked before anything is measured. */
    await p.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 400) {
        scrollTo(0, y);
        await new Promise(done => setTimeout(done, 60));
      }
      scrollTo(0, 0);
    });
    await p.waitForTimeout(700);

    const { dim, small } = await p.evaluate(AUDIT);
    check(`${tag}: every piece of text clears AA`, !dim.length, dim.slice(0, 6).join(' | '));
    check(`${tag}: every control clears 24px`, !small.length, small.slice(0, 6).join(' | '));
    await c.close();
  }

  /* ── and inside the domain
     Five in a row turns the whole page over: the paper goes dark red and
     the ink goes light, for seven seconds, while somebody is reading the
     numbers it is showing them. That is a second palette, and it has to
     clear the same bar as the first. */
  {
    const c = await b.newContext({ viewport: { width: 1340, height: 900 } });
    const p = await c.newPage();
    p.on('pageerror', e => fails.push(`domain: pageerror ${e.message}`));
    await p.route('**/api.lanyard.rest/**', r => r.fulfill(json(PRESENCE)));
    await p.route('**/oembed**', r => r.fulfill(json({ title: 'Eve — Kaikai Kitan' })));
    await p.route('**/graphql.anilist.co/**', r => r.fulfill(json(ANILIST)));
    await p.addInitScript(() => {
      try { sessionStorage.setItem('strohut-seen', '1'); } catch { /* it will just show */ }
    });
    await p.goto(`${BASE}/index.html`);
    await p.waitForTimeout(2400);
    await p.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 400) {
        scrollTo(0, y);
        await new Promise(done => setTimeout(done, 60));
      }
      scrollTo(0, 0);
      document.body.classList.add('is-domain');
    });
    await p.waitForTimeout(900);

    const { dim } = await p.evaluate(AUDIT);
    check('inside the domain, every piece of text still clears AA', !dim.length, dim.slice(0, 6).join(' | '));
    await c.close();
  }

  /* ── the same page in high contrast
     Windows' high contrast mode throws away every colour and substitutes
     its own pair. For the text that is exactly right; for the drawings it
     is not — they are line art built out of a light stroke and a dark
     fill, and the substitution flattens every one of them into a solid
     black lump in the middle of the text. They are drawn as lines in that
     mode instead.

     Every one of those rules has to be a plain class: these shapes live
     inside symbols, and a symbol reached through <use> is a shadow tree
     that a descendant selector never enters — it would match nothing at
     all, and silently. */
  for (const [tag, forced, want] of [['in high contrast', 'active', 'none'], ['and not otherwise', 'none', 'rgb(8, 8, 11)']]) {
    const c = await b.newContext({ viewport: { width: 1200, height: 800 }, forcedColors: forced });
    const p = await c.newPage();
    p.on('pageerror', e => fails.push(`${tag}: pageerror ${e.message}`));
    await p.addInitScript(() => {
      try { sessionStorage.setItem('strohut-seen', '1'); } catch { /* it will just show */ }
    });
    await p.goto(`${BASE}/index.html`);
    await p.waitForTimeout(1600);

    const drawn = await p.evaluate(() => {
      const fill = sel => {
        const el = document.querySelector(sel);
        return el ? getComputedStyle(el).fill : 'gone';
      };
      return {
        cloud: fill('.cb-body'), wheel: fill('.mg-body'), staff: fill('.ye-fill'),
        edge: getComputedStyle(document.querySelector('.arena')).borderTopWidth,
        motes: getComputedStyle(document.querySelector('.field')).display
      };
    });

    const lines = drawn.cloud === want && drawn.wheel === want && drawn.staff !== 'gone';
    check(`${tag}: the drawings are ${forced === 'active' ? 'lines' : 'themselves'}`, lines, JSON.stringify(drawn));

    if (forced === 'active') {
      // a box-shadow is not drawn at all in this mode, and the field's
      // edge was one
      check(`${tag}: the field still has an edge`, drawn.edge === '1px', drawn.edge);
      check(`${tag}: and the motes are not in the way`, drawn.motes === 'none', drawn.motes);
    }
    await c.close();
  }

  /* ── and when more contrast is asked for
     prefers-contrast: more is a request, not a mode: the two quiet greys
     each move up a step and everything else stays itself. Measured as a
     difference rather than a pair of hex values, so retuning the palette
     does not break this — asked, the quiet type must come out lighter on
     the same black. */
  {
    const c = await b.newContext({ viewport: { width: 1200, height: 800 } });
    const p = await c.newPage();
    p.on('pageerror', e => fails.push(`contrast: pageerror ${e.message}`));
    await p.addInitScript(() => {
      try { sessionStorage.setItem('strohut-seen', '1'); } catch { /* it will just show */ }
    });
    await p.goto(`${BASE}/index.html`);
    await p.waitForTimeout(1200);

    const lum = rgb => {
      const m = rgb.match(/\d+/g);
      return m ? m.slice(0, 3).reduce((s, v, i) => s + Number(v) * [.2126, .7152, .0722][i], 0) : -1;
    };
    const quiet = () => p.evaluate(() => {
      const el = document.querySelector('.chapter .says');
      return el ? getComputedStyle(el).color : 'gone';
    });

    const plain = await quiet();
    await p.emulateMedia({ contrast: 'more' });
    await p.waitForTimeout(200);
    const asked = await quiet();
    check('asked for more contrast, the quiet type gives more',
      plain !== 'gone' && asked !== 'gone' && lum(asked) > lum(plain) + 20,
      `${plain} → ${asked}`);
    await c.close();
  }

  /* ── and on paper
     Printed, every word of this came out white on white: browsers drop
     background colours, and the ink here is the light half of the pair,
     so the sheet stayed white and the type stayed paper. The two swap in
     print, which turns the whole page — rules, panels, drawings and all —
     back into ink on paper without a rule of its own. */
  {
    const c = await b.newContext({ viewport: { width: 1200, height: 900 } });
    const p = await c.newPage();
    p.on('pageerror', e => fails.push(`print: pageerror ${e.message}`));
    await p.addInitScript(() => {
      try { sessionStorage.setItem('strohut-seen', '1'); } catch { /* it will just show */ }
    });
    await p.goto(`${BASE}/index.html`);
    await p.waitForTimeout(1800);
    await p.emulateMedia({ media: 'print' });
    await p.waitForTimeout(400);

    const paper = await p.evaluate(() => {
      const lum = s => {
        const [r, g, b] = (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const body = getComputedStyle(document.body);
      const off = sel => {
        const el = document.querySelector(sel);
        return !el || getComputedStyle(el).display === 'none';
      };
      return {
        text: Math.round(lum(body.color)),
        sheet: Math.round(lum(body.backgroundColor)),
        quiet: ['.field', '.arena', '.pose', '.tally', '#strikes'].every(off),
        // a link on paper is only useful if it says where it goes
        says: getComputedStyle(document.querySelector('.links a'), '::after').content
      };
    });

    check('printed, the type is dark', paper.text < 90, JSON.stringify(paper));
    check('printed, the sheet is not', paper.sheet > 200, JSON.stringify(paper));
    check('printed, nothing that moves or takes a press is drawn', paper.quiet, JSON.stringify(paper));
    check('printed, a link says where it goes', /https/.test(paper.says), paper.says);
    await c.close();
  }

  await b.close();
  console.log(fails.length ? `\n${fails.length} FAILING: ${fails.join(' | ')}` : '\nall of it can be read and hit');
  process.exit(fails.length ? 1 : 0);
})();
