const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const override = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  || process.env.BROWSER_EXECUTABLE_PATH;

function installedBrowsers() {
  const candidates = ['/opt/pw-browsers/chromium'];

  if (process.platform === 'win32') {
    for (const root of [
      process.env.ProgramFiles,
      process.env['ProgramFiles(x86)'],
      process.env.LOCALAPPDATA
    ].filter(Boolean)) {
      candidates.push(
        path.join(root, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(root, 'Microsoft', 'Edge', 'Application', 'msedge.exe')
      );
    }
  } else {
    candidates.push(
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/snap/bin/chromium',
      '/usr/bin/microsoft-edge',
      '/usr/bin/microsoft-edge-stable'
    );
  }

  return candidates;
}

function launchBrowser(options = {}) {
  if (override) {
    if (!fs.existsSync(override)) {
      throw new Error('Browser executable does not exist: ' + override);
    }
    return chromium.launch({ ...options, executablePath: override });
  }

  const executablePath = installedBrowsers().find(candidate => fs.existsSync(candidate));
  return executablePath
    ? chromium.launch({ ...options, executablePath })
    : chromium.launch(options);
}

function blockLanyardSocket(page) {
  return page.addInitScript(() => {
    class QuietSocket extends EventTarget {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSED = 3;

      constructor() {
        super();
        this.readyState = QuietSocket.CONNECTING;
      }

      send() {}
      close() { this.readyState = QuietSocket.CLOSED; }
    }
    Object.defineProperty(window, 'WebSocket', { configurable: true, value: QuietSocket });
  });
}

module.exports = { launchBrowser, blockLanyardSocket };
