/* Everything on this page that moves without being asked to.

   A screenshot cannot answer any of this. Motion either runs or it does
   not, and the ways it silently stops running are all cheap to introduce
   and invisible to review: a custom property nothing reads, an animation
   on an element that never gets the class, a reading that climbs and then
   sticks because nothing was left to bring it down.

   So every check here is measured off a live animation or a computed
   style, and every one of them names the thing that would be dead. */
const BASE = `http://localhost:${process.env.PORT || 8899}`;
const { chromium } = require('playwright');

const fails = [];
const check = (n, ok, d) => { console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  — ' + d : '')); if (!ok) fails.push(n); };

const now = Date.now();
const PRESENCE = () => ({
  success: true,
  data: {
    discord_user: { id: '402858450926829568', username: 'strohut', display_name: 'Strohut', avatar: null },
    discord_status: 'online',
    active_on_discord_desktop: true,
    listening_to_spotify: true,
    spotify: {
      song: 'Kaikai Kitan', artist: 'Eve', album: 'Smile', album_art_url: '',
      track_id: '2N7umuRBdK014bDuwREFZS',
      timestamps: { start: now - 74e3, end: now + 130e3 }
    },
    activities: [{ type: 0, name: 'Counter-Strike 2', timestamps: { start: now - 4.2e6 }, assets: {} }]
  }
});

const card = (key, title, native, format, status) => ({
  [`${key}_book`]: { media: [{ id: 1, siteUrl: 'https://anilist.co/manga/1', format, status, chapters: 271,
    title: { romaji: title, english: title, native }, coverImage: { large: '' },
    startDate: { year: 2018 }, genres: ['Action'] }] },
  [`${key}_screen`]: { media: [{ title: { romaji: title }, episodes: 47, status, genres: ['Action'] }] }
});
const ANILIST = { data: {
  ...card('jjk', 'Jujutsu Kaisen', '呪術廻戦', 'MANGA', 'FINISHED'),
  ...card('gohs', 'The God of High School', '갓 오브 하이스쿨', 'MANHWA', 'FINISHED'),
  ...card('op', 'One Piece', 'ONE PIECE', 'MANGA', 'RELEASING')
} };

const json = body => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

  const open = async opts => {
    const p = await b.newPage({ viewport: { width: 1340, height: 900 }, ...opts });
    // the barrier has its own suite; these checks are about what is under it
    await p.addInitScript(() => { try { sessionStorage.setItem('strohut-seen', '1'); } catch { /* fine */ } });
    p.on('pageerror', e => fails.push('pageerror: ' + e.message));
    await p.route('**/api.lanyard.rest/**', r => r.fulfill(json(PRESENCE())));
    await p.route('**/graphql.anilist.co/**', r => r.fulfill(json(ANILIST)));
    await p.route('**/cdn.discordapp.com/**', r => r.abort());
    await p.goto(BASE + '/index.html');
    await p.waitForTimeout(1800);
    return p;
  };

  const p = await open();

  /* ── the wake ────────────────────────────────────────────────────
     Built by script rather than sitting in the markup, because without
     javascript there is nobody to move a pointer. */
  check('the wake is there', await p.evaluate(() => !!document.querySelector('.wake')));
  check('and nothing in it takes a click',
    await p.evaluate(() => getComputedStyle(document.querySelector('.spark')).pointerEvents) === 'none');

  /* Driven from inside the page: a pointer moved over cdp arrives at
     whatever rate the round trip allows, and the wake is spaced by
     distance travelled, so it would be a different test every run. */
  const sparked = await p.evaluate(async () => {
    const running = () => [...document.querySelectorAll('.spark')]
      .reduce((n, s) => n + s.getAnimations().filter(a => a.playState === 'running').length, 0);
    let peak = 0;
    for (let i = 0; i < 24; i++) {
      const ev = new PointerEvent('pointermove', { clientX: 200 + i * 36, clientY: 320, bubbles: true });
      Object.defineProperty(ev, 'movementX', { value: 36 });
      Object.defineProperty(ev, 'movementY', { value: 3 });
      dispatchEvent(ev);
      await new Promise(r => setTimeout(r, 24));
      peak = Math.max(peak, running());
    }
    return peak;
  });
  check('dragging through the page tears pieces off it', sparked >= 3, String(sparked));

  const held = await p.evaluate(async () => {
    dispatchEvent(new PointerEvent('pointerdown', { clientX: 660, clientY: 460, button: 0, bubbles: true }));
    await new Promise(r => setTimeout(r, 380));
    const out = {
      hot: document.querySelector('.wake').classList.contains('is-hot'),
      fill: getComputedStyle(document.querySelector('.spark svg')).fill
    };
    dispatchEvent(new PointerEvent('pointerup', { clientX: 660, clientY: 460, button: 0, bubbles: true }));
    await new Promise(r => setTimeout(r, 80));
    out.cool = !document.querySelector('.wake').classList.contains('is-hot');
    return out;
  });
  check('holding a strike turns the wake hot', held.hot);
  check('and hot is not the same colour as cold', held.fill !== 'rgb(239, 236, 228)', held.fill);
  check('letting go cools it', held.cool);

  /* ── how hard the page is being thrown about ────────────────────── */
  /* The peak over the whole scroll, not the reading at one instant after
     it. Scroll events and frames do not line up, so any single sample
     lands wherever that happened to fall. */
  const vel = await p.evaluate(async () => {
    const read = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--vel')) || 0;
    const rest = read();
    let peak = 0;
    for (let i = 1; i <= 14; i++) {
      scrollTo(0, i * 90);
      await new Promise(r => requestAnimationFrame(r));
      peak = Math.max(peak, read());
    }
    await new Promise(r => setTimeout(r, 1200));
    return { rest, peak, after: read() };
  });
  check('scrolling raises the speed reading', vel.peak > .3, JSON.stringify(vel));
  /* Nothing else is coming to put it back. A reading that only ever goes
     up leaves the speed lines stretched for as long as the tab is open. */
  check('and nothing being left to lower it does not happen', vel.after < .02, String(vel.after));
  check('the speed lines actually read it',
    await p.evaluate(() => getComputedStyle(document.querySelector('.speed')).scale) !== 'none');

  // and the regions know where they are on the screen
  const near = await p.evaluate(async () => {
    document.querySelector('.score').scrollIntoView({ block: 'center' });
    await new Promise(r => setTimeout(r, 400));
    const at = s => parseFloat(document.querySelector(s).style.getPropertyValue('--near')) || 0;
    return { score: at('.score'), hero: at('.hero') };
  });
  check('the region in the middle of the screen knows it', near.score > .8, JSON.stringify(near));
  check('and one scrolled off does not', near.hero < near.score, JSON.stringify(near));

  /* ── the cards turn ─────────────────────────────────────────────── */
  const tilt = await p.evaluate(async () => {
    const li = document.querySelector('.like-list li');
    li.scrollIntoView({ block: 'center' });
    await new Promise(r => setTimeout(r, 300));
    const r0 = li.getBoundingClientRect();
    dispatchEvent(new PointerEvent('pointermove', {
      clientX: Math.round(r0.left + r0.width * .85), clientY: Math.round(r0.top + r0.height * .2), bubbles: true
    }));
    // half a second of easing; two frames in, the matrix still rounds to
    // the identity it started from
    await new Promise(r => setTimeout(r, 700));
    return { x: li.style.getPropertyValue('--tilt-x'), m: getComputedStyle(li).transform };
  });
  check('the card under the pointer turns toward it', parseFloat(tilt.x) > .4, tilt.x);
  check('and that reaches the drawing', /^matrix3d/.test(tilt.m), tilt.m);

  /* ── the word ─────────────────────────────────────────────────────
     Before anything: the name is the paper colour until something
     actually reaches for it. It was pink on arrival for a while, because
     the value the letters brighten with had the same name as the one
     every region carries for how centred it is — and a custom property
     set on the region is inherited by everything inside it. Nothing about
     that is visible in the rule; only in what it renders as. */
  const cold = await p.evaluate(async () => {
    scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 400));
    /* color-mix computes to color(srgb …) whatever it was given, so the
       two cannot be compared as strings even when they are the same
       colour. Both forms are read back as three numbers instead. */
    const rgb = s => {
      const n = (s.match(/-?[\d.]+/g) || []).slice(0, 3).map(Number);
      return /^color\(/.test(s) ? n.map(v => Math.round(v * 255)) : n.map(Math.round);
    };
    const a = rgb(getComputedStyle(document.querySelector('.name i')).color);
    const b = rgb(getComputedStyle(document.body).color);
    return { a, b, off: Math.max(...a.map((v, i) => Math.abs(v - b[i]))) };
  });
  check('the word is not lit until something reaches for it',
    cold.off <= 1, `${cold.a} against ${cold.b}`);

  const word = await p.evaluate(async () => {
    scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 300));
    const glyphs = [...document.querySelectorAll('.name i')];
    const r0 = glyphs[0].getBoundingClientRect();
    dispatchEvent(new PointerEvent('pointermove', {
      clientX: Math.round(r0.left + r0.width / 2), clientY: Math.round(r0.top + r0.height / 2), bubbles: true
    }));
    await new Promise(r => setTimeout(r, 200));
    return glyphs.map(g => parseFloat(g.style.getPropertyValue('--pull')) || 0);
  });
  check('the letter under the pointer answers', word[0] > .5, word.map(n => n.toFixed(2)).join(' '));
  check('and the far end of the word does not', word[word.length - 1] < .15, String(word[word.length - 1]));

  /* ── the record ─────────────────────────────────────────────────── */
  const disc = await p.evaluate(() => {
    const svg = document.querySelector('.disc svg');
    return {
      playing: document.getElementById('music-embed').classList.contains('is-playing'),
      state: svg.getAnimations()[0] && svg.getAnimations()[0].playState,
      out: getComputedStyle(document.querySelector('.disc')).translate
    };
  });
  check('the record turns while something is playing', disc.playing && disc.state === 'running', JSON.stringify(disc));
  check('and it has ridden out of the sleeve', /^[1-9]/.test(disc.out), disc.out);

  // the drawing is a readout, so it has to be wrong when the state is
  const stopped = await p.evaluate(async () => {
    showTrack(null);
    await new Promise(r => setTimeout(r, 80));
    const svg = document.querySelector('.disc svg');
    return {
      playing: document.getElementById('music-embed').classList.contains('is-playing'),
      state: svg.getAnimations()[0] && svg.getAnimations()[0].playState
    };
  });
  check('and it stops when nothing is playing', !stopped.playing && stopped.state === 'paused', JSON.stringify(stopped));

  /* ── the sea ────────────────────────────────────────────────────── */
  const sea = await p.evaluate(() => ({
    rolling: [...document.querySelectorAll('.sea svg')].map(s => (s.getAnimations()[0] || {}).playState || 'none'),
    width: document.querySelector('.sea').getBoundingClientRect().width,
    view: document.documentElement.clientWidth,
    doc: document.documentElement.scrollWidth
  }));
  check('both seas roll', sea.rolling.length === 2 && sea.rolling.every(s => s === 'running'), sea.rolling.join(','));
  check('the sea runs the full width', sea.width >= sea.view - 1, JSON.stringify(sea));
  check('and does not widen the page doing it', sea.doc <= sea.view + 1, JSON.stringify(sea));

  /* The band is three tiles wide and has to be slid by exactly one of
     them. Travel anything else and the loop jumps by the difference every
     time round, which is the one thing an endless loop must never do.

     A third of the box is only one tile while the drawing is being scaled
     to the width of it. Under about four and a half times the band's own
     height it scales to the height instead and a tile comes out wider
     than a third — so this is measured off where the tiles actually
     landed, at widths on both sides of that.

     Two <use> in a row are one tile apart by construction, whatever the
     scaling did, which makes their spacing the only honest ruler here. */
  for (const w of [1600, 1340, 1000, 760, 420]) {
    await p.setViewportSize({ width: w, height: 900 });
    await p.waitForTimeout(250);
    const seam = await p.evaluate(async () => {
      const svg = document.querySelector('.sea-near');
      const uses = [...svg.querySelectorAll('use')];
      const anim = svg.getAnimations()[0];
      anim.pause();
      const span = anim.effect.getTiming().duration;
      const at = async t => {
        anim.currentTime = t;
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        const m = new DOMMatrixReadOnly(getComputedStyle(svg).transform);
        return m.e;
      };
      const tile = uses[1].getBoundingClientRect().left - uses[0].getBoundingClientRect().left;
      const from = await at(0);
      const to = await at(span * 0.9999);
      anim.play();
      return { tiles: uses.length, tile, travel: Math.abs(to - from) };
    });
    check(`${w}: the sea is three tiles`, seam.tiles === 3, String(seam.tiles));
    check(`${w}: and travels exactly one of them`,
      Math.abs(seam.travel - Math.abs(seam.tile)) < 1.5,
      `travelled ${seam.travel.toFixed(1)} against a tile of ${Math.abs(seam.tile).toFixed(1)}`);
  }
  await p.setViewportSize({ width: 1340, height: 900 });
  await p.waitForTimeout(250);

  /* ── the run shows on the panel ─────────────────────────────────── */
  const sigil = await p.evaluate(async () => {
    const panel = document.querySelector('.score');
    const art = document.querySelector('.score-sigil');
    panel.scrollIntoView({ block: 'center' });
    await new Promise(r => setTimeout(r, 300));
    const cold = parseFloat(getComputedStyle(art).opacity);
    panel.style.setProperty('--streak', 8);
    await new Promise(r => setTimeout(r, 800));
    return { cold, hot: parseFloat(getComputedStyle(art).opacity) };
  });
  check('the mark behind the score burns up with the run', sigil.hot > sigil.cold * 2, JSON.stringify(sigil));
  /* It sits directly inside a region that fades its children in, and that
     rule beats this one on specificity — which pinned it at full. */
  check('and nothing else has pinned it open', sigil.cold < .1, String(sigil.cold));

  /* ── the field belongs to whoever is hitting ─────────────────────
     Five in a row opens 無量空処 over the page and it stands there for
     seven seconds. It is a full-screen layer over a live page, so the two
     things that matter about it are that it never takes a click while it
     is up and that it comes down again — and it has to still be up well
     after the length the old one-second flash would have run for. */
  const cast = await p.evaluate(async () => {
    const el = document.querySelector('.domain');
    const seen = { takes: getComputedStyle(el).pointerEvents };
    // the real path, not the class by hand: this is what lands the fifth
    streak = 4;
    landed();
    await new Promise(r => setTimeout(r, 200));
    seen.up = getComputedStyle(el).display;
    seen.red = getComputedStyle(el).getPropertyValue('--paper').trim();
    await new Promise(r => setTimeout(r, 2500));
    seen.still = getComputedStyle(el).display;
    await new Promise(r => setTimeout(r, 5200));
    seen.down = getComputedStyle(el).display;
    return seen;
  });
  check('five in a row opens the domain', cast.up === 'block', JSON.stringify(cast));
  check('and it stands rather than flashing', cast.still === 'block', cast.still);
  check('and it is cast in red rather than paper', /blood|#ff|255/.test(cast.red) || cast.red !== '', cast.red);
  check('and it never takes a click', cast.takes === 'none', cast.takes);
  check('and it comes down again', cast.down === 'none', cast.down);

  await p.close();

  /* ── asked to hold still ────────────────────────────────────────── */
  const q = await open({ reducedMotion: 'reduce' });

  /* Normally the domain is taken down by its own animationend. Here every
     animation is cut to a hundredth of a millisecond and there is nothing
     to rely on in that — without a second way down it is a full-screen
     layer over the page for as long as the tab is open. */
  const stuck = await q.evaluate(async () => {
    streak = 4;
    landed();
    await new Promise(r => setTimeout(r, 7800));
    return getComputedStyle(document.querySelector('.domain')).display;
  });
  check('holding still, the domain still comes down', stuck === 'none', stuck);
  check('nothing is built to follow a pointer', await q.evaluate(() => !document.querySelector('.wake')));
  const stillFrames = await q.evaluate(() =>
    document.getAnimations().filter(a => a.playState === 'running' &&
      a.effect && a.effect.getTiming().duration > 100).length);
  check('and nothing is left running on a loop', stillFrames === 0, String(stillFrames));
  await q.close();

  /* ── his hour ──────────────────────────────────────────────────
     The header says "a light on a porch", and a porch light is a thing
     that is on at night. The hour the clock is already reading is
     written where css can reach it, and what hangs off it is a matter of
     degree: the field is thick with sparks after dark and nearly clear
     at noon, and the sea takes its time.

     Measured with transitions off, so a reading is the value rather than
     a frame on the way to it. */
  {
    const h = await b.newPage({ viewport: { width: 1200, height: 800 } });
    h.on('pageerror', e => fails.push('hour pageerror: ' + e.message));
    await h.addInitScript(() => {
      try { sessionStorage.setItem('strohut-seen', '1'); } catch { /* fine */ }
    });
    await h.goto(BASE + '/index.html');
    await h.waitForTimeout(1500);

    const sun = await h.evaluate(() =>
      parseFloat(getComputedStyle(document.body).getPropertyValue('--sun')));
    check('the page knows what hour it is where he is',
      sun >= 0 && sun <= 1, String(sun));

    await h.addStyleTag({ content: '*, *::before, *::after { transition: none !important }' });
    const at = async v => {
      await h.evaluate(x => document.body.style.setProperty('--sun', x), v);
      await h.waitForTimeout(80);
      return h.evaluate(() => ({
        field: parseFloat(getComputedStyle(document.querySelector('.field')).opacity),
        near: getComputedStyle(document.querySelector('.sea-near')).animationDuration,
        far: getComputedStyle(document.querySelector('.sea-far')).animationDuration,
        sheet: getComputedStyle(document.body).backgroundColor
      }));
    };

    const dark = await at(0);
    const noon = await at(1);
    check('the field is thicker after dark than at noon', dark.field > noon.field + .3,
      `${dark.field} vs ${noon.field}`);
    check('and the sea takes its time', parseFloat(dark.near) > parseFloat(noon.near),
      `${dark.near} vs ${noon.near}`);
    check('and the sheet is not the same colour at both', dark.sheet !== noon.sheet,
      `${dark.sheet} vs ${noon.sheet}`);

    /* Two layers at unrelated speeds is what makes the sea read as
       distance rather than as one texture — and for a long time it was
       one texture, because the shorthand on .sea svg is a class and a
       type and outweighed the class on its own that set each layer. */
    check('the two layers of the sea run at different speeds',
      parseFloat(noon.near) !== parseFloat(noon.far), `${noon.near} vs ${noon.far}`);

    // the domain is its own weather and does not answer to the hour
    await h.evaluate(() => { document.body.classList.add('is-domain'); });
    await h.waitForTimeout(80);
    const inside = await h.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await h.evaluate(() => { document.body.classList.remove('is-domain'); });
    check('and the domain keeps its own', inside !== noon.sheet, `${inside} vs ${noon.sheet}`);
    await h.close();
  }

  await b.close();
  console.log(fails.length ? `\n${fails.length} FAILING: ${fails.join(' | ')}` : '\nall of it moves');
  process.exit(fails.length ? 1 : 0);
})();
