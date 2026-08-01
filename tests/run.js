/* Runs every check against a local server, one suite at a time. */
const { spawn } = require('node:child_process');
const path = require('node:path');

const SUITES = ['source', 'page', 'motion', 'curtain', 'flash', 'upstream', 'limits', 'reach'];
const PORT = Number(process.env.PORT) || 8899;
const BASE = `http://localhost:${PORT}`;

const serve = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', path.join(__dirname, '..')],
  { stdio: 'ignore' });

let stopped = false;
const stop = code => { if (!stopped) { stopped = true; serve.kill(); } process.exit(code); };
process.on('SIGINT', () => stop(130));

/* Waiting a fixed second and hoping is how a busy machine — or a second
   copy of this already holding the port — turns into five suites all
   reporting ERR_CONNECTION_REFUSED, which reads as the site being broken
   rather than the harness never having started. */
async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`${BASE}/index.html`);
      if (r.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise(r => setTimeout(r, 250));
  }
  return false;
}

const run = name => new Promise(done => {
  console.log(`\n── ${name} ──`);
  const p = spawn('node', [path.join(__dirname, `${name}.test.js`)],
    { stdio: 'inherit', env: { ...process.env, PORT: String(PORT) } });
  p.on('close', done);
});

(async () => {
  if (!await waitForServer()) {
    console.error(`\nnothing is answering on ${BASE} after 15s.` +
      '\nsomething else is probably holding the port — try PORT=8900 npm test');
    stop(1);
    return;
  }

  let bad = 0;
  for (const s of SUITES) bad += (await run(s)) ? 1 : 0;
  console.log(bad ? `\n${bad} suite(s) failing` : '\neverything passes');
  stop(bad ? 1 : 0);
})();
