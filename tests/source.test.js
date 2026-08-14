/* Static source contracts. */
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const fails = [];
const check = (n, ok, d) => { console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  — ' + d : '')); if (!ok) fails.push(n); };

const html = read('index.html');
const lost = read('404.html');
const css = read('styles.css');
/* Strip CSS comments before checking browser-facing rules. */
const bare = css.replace(/\/\*[\s\S]*?\*\//g, '');
const js = read('script.js');
const flash = read('flash.js');

// Asset versioning
const versions = [...html.matchAll(/(?:styles\.css|script\.js|flash\.js|fonts\.css)\?v=(\d+)/g)].map(m => m[1]);
check('every asset carries a version', versions.length >= 4, versions.join(','));
check('all versions agree', new Set(versions).size === 1, versions.join(','));
const lostVersions = [...lost.matchAll(/\?v=(\d+)/g)].map(m => m[1]);
check('the 404 uses the same version',
  lostVersions.length > 0 && new Set(lostVersions).size === 1 && lostVersions.every(v => v === versions[0]),
  lostVersions.join(','));

// SVG references
for (const [name, src] of [['index', html], ['404', lost]]) {
  const have = new Set([...src.matchAll(/<(?:symbol|path) id="([^"]+)"/g)].map(m => m[1]));
  const want = new Set([...src.matchAll(/href="#([^"]+)"/g)].map(m => m[1]));
  const missing = [...want].filter(w => !have.has(w) && !src.includes(`id="${w}"`));
  check(`${name}: every use has a symbol`, !missing.length, missing.join(','));
  // Count literal ids and JavaScript-generated symbol prefixes.
  const prefixes = [...(js + flash).matchAll(/#([a-z0-9-]+?)-?\$\{/g)].map(m => `${m[1]}-`);
  const literal = new Set([...(js + flash).matchAll(/['"`#]#([^'"`\s{}]+)/gu)].map(m => m[1]));
  const dead = [...have].filter(h => !want.has(h) && !literal.has(h) && !prefixes.some(p => h.startsWith(p)));
  check(`${name}: no symbol is unused`, !dead.length, dead.join(','));
}

/* Reusable SVG templates must live in defs. */
for (const [name, src] of [['index', html], ['404', lost]]) {
  const used = new Set([...src.matchAll(/href="#([^"]+)"/g)].map(m => m[1]));
  const loose = [...used].filter(id => {
    const at = src.indexOf(`<path id="${id}"`);
    if (at < 0) return false;                      // a symbol, not a template
    const before = src.slice(0, at);
    return before.lastIndexOf('<defs>') <= before.lastIndexOf('</defs>');
  });
  check(`${name}: every <use> template sits in defs`, !loose.length, loose.join(','));
}

// Feature baseline
check('nothing leans on :has()', !bare.includes(':has('));
check('overflow: clip always has a fallback',
  !/overflow-x: clip/.test(bare) || /overflow-x: hidden;[\s\S]{0,80}overflow-x: clip/.test(bare));
check('appearance is prefixed', !/[^-]appearance: none/.test(bare) || bare.includes('-webkit-appearance: none'));

// SVG use styling
const shadowClasses = ['mg-body', 'mg-lit', 'cb-body', 'cb-curl', 'jr-bone', 'jr-straw',
  'jr-band', 'jr-hole', 'jr-teeth', 'bf-bolt', 'bf-spark', 'bf-void', 'bf-core', 'bf-hole', 'bf-hot', 'bf-warp',
  'cw-body', 'cw-vein',

  'ye-fill', 'ye-edge', 'ye-lit', 'ye-spec', 'ye-dark', 'ye-shade', 'ye-grain',
  'ye-gold', 'ye-gold-line', 'ye-gold-lit', 'ye-gold-dark',
  'lp-strap', 'lp-stitch', 'lp-brass', 'lp-brass-lit', 'lp-brass-dark', 'lp-tick',
  'lp-glass', 'lp-shine', 'lp-under', 'lp-wire', 'lp-tail', 'lp-point', 'lp-pin'];
const reached = shadowClasses.filter(c => new RegExp(`[.\\w\\]]\\s+\\.${c}\\b`).test(bare));
check('nothing styles a cloned symbol through a descendant selector', !reached.length, reached.join(','));

/* DOM references */
const ids = new Set([...(html + lost).matchAll(/id="([^"]+)"/g)].map(m => m[1]));
const wanted = [...(js + flash).matchAll(/getElementById\('([^']+)'\)/g)].map(m => m[1]);
const absent = [...new Set(wanted)].filter(i => !ids.has(i));
check('every getElementById has an element', !absent.length, absent.join(','));

// 404 indexing
check('404 says noindex', /name="robots" content="noindex"/.test(lost));

// Font hosts
check('nothing points at google fonts', !html.includes('googleapis') && !lost.includes('googleapis'));

// Ambient field
for (const [name, src] of [['index', html], ['404', lost]]) {
  const motes = [...src.matchAll(/<span class="mote[^"]*" style="([^"]+)"/g)].map(m => m[1]);
  check(`${name}: the field has motes`, motes.length >= 20, String(motes.length));
  const needed = ['--x:', '--w:', '--dur:', '--delay:', '--sway:', '--fade:'];
  const short = motes.filter(s => needed.some(k => !s.includes(k)));
  check(`${name}: every mote carries its own timing`, !short.length, short[0] || '');

  const late = motes.filter(s => !/--delay:-/.test(s));
  check(`${name}: every mote starts mid-flight`, !late.length, late[0] || '');
}

const opens = (css.match(/{/g) || []).length;
const closes = (css.match(/}/g) || []).length;
check('the braces balance', opens === closes, `${opens} open, ${closes} close`);

/* Rebuild the AniList query exactly as shipped. */
{
  const block = js.slice(js.indexOf('const LIKE_FIELDS'));
  const fields = block.match(/const LIKE_FIELDS = `([^`]+)`/);
  const shapes = [...block.matchAll(/`\$\{l\.key\}_\w+: ([^`]+)`/g)].map(m => m[1]);
  check('the anilist query is still built here', Boolean(fields && shapes.length));

  if (fields && shapes.length) {
    // Mirror the page query assembly.
    const query = `{${['a', 'b', 'c'].flatMap(k => shapes.map((sh, n) => `${k}${n}: ` + sh
      .replace('${JSON.stringify(l.title)}', '"One Piece"')
      .replace('${LIKE_FIELDS}', fields[1]))).join('\n')}}`;

    let why = '';
    try {
      require('graphql').parse(query);
    } catch (e) {
      why = e.message;
    }
    check('the anilist query parses as graphql', !why, why);


    check('the cover is asked for inside coverImage', /coverImage \{[^}]*large/.test(fields[1]));
  }
}

/* Runner manifest */
{
  const runner = read('tests/run.js');
  const want = (runner.match(/SUITES = \[([^\]]+)\]/) || [, ''])[1]
    .split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean);
  check('the runner names some suites', want.length >= 5, want.join(' '));
  const gone = want.filter(s => !fs.existsSync(path.join(root, 'tests', `${s}.test.js`)));
  check('and every one of them is a file in the repository', !gone.length, gone.join(','));


  const orphan = fs.readdirSync(path.join(root, 'tests'))
    .filter(f => f.endsWith('.test.js'))
    .map(f => f.replace('.test.js', ''))
    .filter(s => !want.includes(s));
  check('and nothing in there is never run', !orphan.length, orphan.join(','));
}

/* JavaScript state */
for (const [name, src] of [['index', html], ['404', lost]]) {
  check(`${name}: says javascript is there, before first paint`,
    /setAttribute\('data-js'/.test(src) &&
    src.indexOf("setAttribute('data-js'") < src.indexOf('</head>'));
}

/* Structured data */
{
  const block = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  check('the page carries structured data', !!block);
  if (block) {
    let card = null;
    let why = '';
    try { card = JSON.parse(block[1]); } catch (e) { why = e.message; }
    check('and it parses', !!card, why);

    if (card) {
      check('it is a person', card['@type'] === 'Person', String(card['@type']));
      check('with the name the page says', html.includes(`>${card.name}<`) || html.includes(card.name),
        String(card.name));
      const claimed = Array.isArray(card.sameAs) ? card.sameAs : [];
      const unlinked = claimed.filter(u => !html.includes(u));
      check('and every account it claims is linked on the page', !unlinked.length, unlinked.join(','));
      check('and it claims all of them', [...html.matchAll(/href="(https:\/\/(?:discord|steamcommunity|www\.instagram|twitter)\.com[^"]*)"/g)]
        .map(m => m[1]).every(u => claimed.includes(u)));
    }
  }
}

/* Preloads */
{
  const faces = read('fonts.css');
  for (const [name, src] of [['index', html], ['404', lost]]) {
    const pre = [...src.matchAll(/<link rel="preload" href="([^"]+)"([^>]*)>/g)];
    check(`${name}: something is preloaded`, pre.length > 0, String(pre.length));

    const gone = pre.map(m => m[1]).filter(f =>
      !fs.existsSync(path.join(root, f.split('?')[0].replace(/^\/+/, ''))));
    check(`${name}: every preload is a file that exists`, !gone.length, gone.join(','));


    const unused = pre.map(m => m[1]).filter(f =>
      !faces.includes(`url('${f.replace(/^\/+/, '')}')`));
    check(`${name}: and the url the stylesheet uses`, !unused.length, unused.join(','));

    /* Font preloads require matching CORS mode. */
    const bare_ = pre.filter(m => !/crossorigin/.test(m[2])).map(m => m[1]);
    check(`${name}: every font preload is crossorigin`, !bare_.length, bare_.join(','));
  }
}

// Reduced motion
const still = css.slice(css.indexOf('prefers-reduced-motion'));
check('reduced motion drops the field', /\.field\s*{\s*display:\s*none/.test(still));

console.log(fails.length ? '\n' + fails.length + ' FAILING: ' + fails.join(' | ') : '\nsource checks pass');
process.exit(fails.length ? 1 : 0);
