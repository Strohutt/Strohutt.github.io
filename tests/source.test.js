/* Static checks on the files themselves. No browser — these are the
   things that only ever break by somebody editing carelessly. */
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const fails = [];
const check = (n, ok, d) => { console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  — ' + d : '')); if (!ok) fails.push(n); };

const html = read('index.html');
const lost = read('404.html');
const css = read('styles.css');
/* The stylesheet with its comments taken out. Every check below is about
   what the browser is handed, and this file explains itself at length —
   so a rule that reads "no :has() anywhere" was failing on the sentence
   saying why. Line-based stripping only caught lines that open a comment
   or continue one with a star; the prose in here does neither. */
const bare = css.replace(/\/\*[\s\S]*?\*\//g, '');
const js = read('script.js');
const flash = read('flash.js');

// ── the asset version has to move whenever the assets do
const versions = [...html.matchAll(/(?:styles\.css|script\.js|flash\.js|fonts\.css)\?v=(\d+)/g)].map(m => m[1]);
check('every asset carries a version', versions.length >= 4, versions.join(','));
check('all versions agree', new Set(versions).size === 1, versions.join(','));
check('the 404 uses the same version',
  new Set([...lost.matchAll(/\?v=(\d+)/g)].map(m => m[1])).size === 1);

// ── nothing may point at a symbol that is not there
for (const [name, src] of [['index', html], ['404', lost]]) {
  const have = new Set([...src.matchAll(/<(?:symbol|path) id="([^"]+)"/g)].map(m => m[1]));
  const want = new Set([...src.matchAll(/href="#([^"]+)"/g)].map(m => m[1]));
  const missing = [...want].filter(w => !have.has(w) && !src.includes(`id="${w}"`));
  check(`${name}: every use has a symbol`, !missing.length, missing.join(','));
  // Symbols reached from javascript arrive as a template, so what is in
  // the source is a prefix rather than a whole id.
  const prefixes = [...(js + flash).matchAll(/#([a-z0-9-]+?)-?\$\{/g)].map(m => `${m[1]}-`);
  const dead = [...have].filter(h => !want.has(h) && !prefixes.some(p => h.startsWith(p)));
  check(`${name}: no symbol is unused`, !dead.length, dead.join(','));
}

/* A shape that exists only to be <use>d has to sit in <defs>. Left loose
   in a symbol it renders itself as well, at its own coordinates — which
   for a template are usually nowhere near the viewBox. It stays invisible
   for exactly as long as the drawing is small. */
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

// ── features with a floor worth keeping
check('nothing leans on :has()', !bare.includes(':has('));
check('overflow: clip always has a fallback',
  !/overflow-x: clip/.test(bare) || /overflow-x: hidden;[\s\S]{0,80}overflow-x: clip/.test(bare));
check('appearance is prefixed', !/[^-]appearance: none/.test(bare) || bare.includes('-webkit-appearance: none'));

// ── a descendant selector cannot reach inside a <use> shadow tree
const shadowClasses = ['mg-body', 'mg-lit', 'cb-body', 'cb-curl', 'jr-bone', 'jr-straw',
  'jr-band', 'jr-hole', 'jr-teeth', 'bf-bolt', 'bf-spark', 'bf-void', 'bf-core', 'bf-hole', 'bf-hot', 'bf-warp',
  'cw-body', 'cw-vein'];
const reached = shadowClasses.filter(c => new RegExp(`[.\\w\\]]\\s+\\.${c}\\b`).test(bare));
check('nothing styles a cloned symbol through a descendant selector', !reached.length, reached.join(','));

// ── every id javascript reaches for has to exist in the markup
const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
const wanted = [...(js + flash).matchAll(/getElementById\('([^']+)'\)/g)].map(m => m[1]);
const absent = [...new Set(wanted)].filter(i => !ids.has(i));
check('every getElementById has an element', !absent.length, absent.join(','));

// ── the 404 must not claim to be indexable
check('404 says noindex', /name="robots" content="noindex"/.test(lost));

// ── no leftover pointers to the old font host
check('nothing points at google fonts', !html.includes('googleapis') && !lost.includes('googleapis'));

// ── the ambient field is baked into the markup, so it has to be complete
// there. A mote missing one custom property inherits nothing and either
// stacks on the left edge or animates to a length of zero.
for (const [name, src] of [['index', html], ['404', lost]]) {
  const motes = [...src.matchAll(/<span class="mote[^"]*" style="([^"]+)"/g)].map(m => m[1]);
  check(`${name}: the field has motes`, motes.length >= 20, String(motes.length));
  const needed = ['--x:', '--w:', '--dur:', '--delay:', '--sway:', '--fade:'];
  const short = motes.filter(s => needed.some(k => !s.includes(k)));
  check(`${name}: every mote carries its own timing`, !short.length, short[0] || '');
  // a positive delay is a mote that has not started yet, which is a gap in
  // the field for as long as the delay lasts
  const late = motes.filter(s => !/--delay:-/.test(s));
  check(`${name}: every mote starts mid-flight`, !late.length, late[0] || '');
}

const opens = (css.match(/{/g) || []).length;
const closes = (css.match(/}/g) || []).length;
check('the braces balance', opens === closes, `${opens} open, ${closes} close`);

/* The query the page ships to anilist is built by joining template
   strings, and nothing in the browser complains if that comes out
   malformed — the endpoint answers with errors, the region stays hidden,
   and it stays hidden for good. Nobody would find out.

   This container cannot reach anilist, so the query cannot be run. It can
   be parsed. The field names are not guesses either: every one of them
   appears in the query a maintained client sends to the live api, which is
   in the note above them in script.js. */
{
  const block = js.slice(js.indexOf('const LIKE_FIELDS'));
  const fields = block.match(/const LIKE_FIELDS = `([^`]+)`/);
  const shapes = [...block.matchAll(/`\$\{l\.key\}_\w+: ([^`]+)`/g)].map(m => m[1]);
  check('the anilist query is still built here', Boolean(fields && shapes.length));

  if (fields && shapes.length) {
    // the same join the page does, with the templating filled in
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

    // Media has no "large" of its own — asking for a cover without one is
    // how a whole card comes back empty
    check('the cover is asked for inside coverImage', /coverImage \{[^}]*large/.test(fields[1]));
  }
}

// ── motion nobody asked for has to be switchable off
const still = css.slice(css.indexOf('prefers-reduced-motion'));
check('reduced motion drops the field', /\.field\s*{\s*display:\s*none/.test(still));

console.log(fails.length ? '\n' + fails.length + ' FAILING: ' + fails.join(' | ') : '\nsource checks pass');
process.exit(fails.length ? 1 : 0);
