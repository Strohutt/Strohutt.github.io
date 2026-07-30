/* Runs every check against a local server, one suite at a time. */
const { spawn } = require('node:child_process');
const path = require('node:path');

const SUITES = ['page', 'flash', 'upstream', 'limits'];
const PORT = process.env.PORT || 8899;

const serve = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', path.join(__dirname, '..')],
  { stdio: 'ignore' });

const stop = code => { serve.kill(); process.exit(code); };
process.on('SIGINT', () => stop(130));

const run = name => new Promise(done => {
  console.log(`\n── ${name} ──`);
  const p = spawn('node', [path.join(__dirname, `${name}.test.js`)],
    { stdio: 'inherit', env: { ...process.env, PORT } });
  p.on('close', done);
});

(async () => {
  await new Promise(r => setTimeout(r, 1200));           // let the server bind
  let bad = 0;
  for (const s of SUITES) bad += (await run(s)) ? 1 : 0;
  console.log(bad ? `\n${bad} suite(s) failing` : '\neverything passes');
  stop(bad ? 1 : 0);
})();
