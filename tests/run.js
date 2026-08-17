const { spawn, spawnSync } = require('node:child_process');
const path = require('node:path');

const PORT = Number(process.env.PORT) || 8899;
const BASE = `http://127.0.0.1:${PORT}`;
const suites = ['source', 'smoke', 'upstream'];

for (const file of ['script.js', 'flash.js']) {
  const checked = spawnSync(process.execPath, ['--check', path.join(__dirname, '..', file)], { stdio: 'inherit' });
  if (checked.status) process.exit(checked.status || 1);
}

const server = spawn('python', [
  '-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', path.join(__dirname, '..')
], { stdio: 'ignore' });

const stop = code => {
  if (!server.killed) server.kill();
  process.exit(code);
};

process.on('SIGINT', () => stop(130));

async function ready() {
  for (let i = 0; i < 40; i++) {
    try {
      if ((await fetch(`${BASE}/`)).ok) return true;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  return false;
}

function run(name) {
  const result = spawnSync(process.execPath, [path.join(__dirname, `${name}.test.js`)], {
    stdio: 'inherit',
    env: { ...process.env, PORT: String(PORT) }
  });
  return result.status || 0;
}

(async () => {
  if (!await ready()) return stop(1);
  let failures = 0;
  for (const suite of suites) failures += run(suite) ? 1 : 0;
  console.log(failures ? `\n${failures} suite(s) failed` : '\nrelease checks pass');
  stop(failures ? 1 : 0);
})();
