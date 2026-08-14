/* Local test runner. */
const { spawn, spawnSync } = require('node:child_process');
const path = require('node:path');

const SUITES = ['source', 'page', 'work', 'motion', 'curtain', 'flash', 'upstream', 'limits', 'reach'];
const PORT = Number(process.env.PORT) || 8899;
const BASE = `http://localhost:${PORT}`;
const SELECTED_SUITES = process.env.TEST_SUITES
  ? process.env.TEST_SUITES.split(',').map(name => name.trim()).filter(name => SUITES.includes(name))
  : SUITES;

function pythonCommand() {
  const explicit = process.env.PYTHON_EXECUTABLE;
  const choices = explicit
    ? [[explicit, []]]
    : process.platform === 'win32'
      ? [
          ['python', []],
          ['py', ['-3']],
          ['python3', []]
        ]
      : [
          ['python3', []],
          ['python', []]
        ];

  for (const [command, prefix] of choices) {
    const probe = spawnSync(command, [...prefix, '--version'], { encoding: 'utf8' });
    const version = ((probe.stdout || '') + (probe.stderr || '')).trim();
    if (!probe.error && probe.status === 0 && /^Python 3\./.test(version)) return { command, prefix };
  }

  throw new Error(explicit
    ? 'PYTHON_EXECUTABLE is not runnable: ' + explicit
    : 'Python 3 is required to run the local test server.');
}

const python = pythonCommand();

const serve = spawn(python.command,
  [...python.prefix, '-m', 'http.server', String(PORT), '--directory', path.join(__dirname, '..')],
  { stdio: 'ignore' });
serve.on('error', error => { console.error('static server failed: ' + error.message); process.exit(1); });

let stopped = false;
const stop = code => { if (!stopped) { stopped = true; serve.kill(); } process.exit(code); };
process.on('SIGINT', () => stop(130));

/* Poll server readiness instead of assuming a startup delay. */
async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`${BASE}/index.html`);
      if (r.ok) return true;
    } catch {

    }
    await new Promise(r => setTimeout(r, 250));
  }
  return false;
}

const run = name => new Promise(done => {
  console.log(`\n── ${name} ──`);
  const p = spawn(process.execPath, [path.join(__dirname, `${name}.test.js`)],
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
  for (const s of SELECTED_SUITES) bad += (await run(s)) ? 1 : 0;
  console.log(bad ? `\n${bad} suite(s) failing` : '\neverything passes');
  stop(bad ? 1 : 0);
})();
