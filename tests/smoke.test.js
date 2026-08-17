const fs = require('node:fs');
const path = require('node:path');
const { launchBrowser, blockLanyardSocket } = require('./browser');

const BASE = `http://127.0.0.1:${process.env.PORT || 8899}`;
const failures = [];
const check = (label, pass, detail = '') => {
  console.log(`${pass ? 'ok  ' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!pass) failures.push(label);
};
const seen = () => sessionStorage.setItem('strohut-seen', '1');

async function quiet(page) {
  await page.addInitScript(seen);
  await blockLanyardSocket(page);
  await page.route('**/api.lanyard.rest/**', route => route.abort());
  await page.route('**/graphql.anilist.co/**', route => route.abort());
}

async function inspectHome(browser, viewport, mobile = false) {
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => {
    const url = request.url();
    if (url.startsWith(BASE)) errors.push(`failed: ${url}`);
  });
  await quiet(page);
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });

  const initial = await page.evaluate(() => ({
    title: document.title,
    h1: document.querySelector('h1')?.textContent.trim(),
    panels: [...document.querySelectorAll('.panel[id]')].map(node => node.id),
    wide: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    staffButton: Boolean(document.querySelector('.staff button, .staff [tabindex]')),
    staffPointer: getComputedStyle(document.querySelector('.staff-rig')).pointerEvents,
    traced: document.querySelectorAll('.traced-list > li').length,
    favourites: document.querySelectorAll('#like-list > li').length
  }));
  check(`${viewport.width}px home has its authored structure`,
    initial.h1 === 'STROHUT' && initial.panels.includes('work') && initial.panels.includes('traced') &&
    initial.traced === 7 && initial.favourites === 3, JSON.stringify(initial));
  check(`${viewport.width}px home has no horizontal overflow`, !initial.wide);
  check(`${viewport.width}px Yeoui is inert`, !initial.staffButton && initial.staffPointer === 'none',
    JSON.stringify(initial));

  await page.locator('.hero').screenshot({
    path: path.join(__dirname, 'out', `hero-${viewport.width}.png`)
  });

  await page.locator('#work').scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  const workTitleFits = await page.locator('.work-copy h3').evaluate(node => {
    const title = node.getBoundingClientRect();
    const column = node.parentElement.getBoundingClientRect();
    return title.left >= column.left - 1 && title.right <= column.right + 1;
  });
  check(`${viewport.width}px work title stays inside its column`, workTitleFits);
  await page.locator('#work').screenshot({
    path: path.join(__dirname, 'out', `home-work-${viewport.width}.png`)
  });

  await page.locator('#traced').scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  check(`${viewport.width}px traced label is not clipped`, await page.locator('#traced-h .says').evaluate(node => {
    const label = node.getBoundingClientRect();
    const heading = node.parentElement.getBoundingClientRect();
    return label.left >= heading.left - 1 && label.right <= heading.right + 1 &&
      label.top >= heading.top - 1 && label.bottom <= heading.bottom + 1;
  }));
  check(`${viewport.width}px source notes remain readable`, await page.locator('.traced-does').evaluateAll(nodes =>
    nodes.every(node => node.getBoundingClientRect().height > 20 && getComputedStyle(node).fontSize !== '0px')));
  await page.locator('#traced').screenshot({
    path: path.join(__dirname, 'out', `traced-${viewport.width}.png`)
  });

  if (!mobile) {
    const sizes = await page.evaluate(() => ['wheel-hit', 'cloud-hit', 'flash-arena'].map(id => {
      const box = document.getElementById(id).getBoundingClientRect();
      return [id, Math.round(box.width), Math.round(box.height)];
    }));
    check('desktop controls keep usable hit areas', sizes.every(([, width, height]) => width >= 44 && height >= 44),
      JSON.stringify(sizes));

    await page.locator('#wheel-hit').click();
    check('the wheel still answers a click', await page.evaluate(() =>
      Number.parseInt(getComputedStyle(document.querySelector('.wheel')).getPropertyValue('--adapt'), 10) >= 1));

    await page.locator('#flash-arena').focus();
    await page.keyboard.down('Space');
    await page.waitForTimeout(80);
    const charging = await page.evaluate(() => document.body.classList.contains('is-charging'));
    await page.keyboard.up('Space');
    await page.waitForTimeout(80);
    const released = await page.evaluate(() => !document.body.classList.contains('is-charging'));
    check('Black Flash accepts and releases a timed hold', charging && released);
  }

  await page.screenshot({
    path: path.join(__dirname, 'out', `home-${viewport.width}.png`),
    fullPage: true
  });
  check(`${viewport.width}px home raises no local or runtime errors`, !errors.length, errors.join(' | '));
  await context.close();
}

(async () => {
  fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
  const browser = await launchBrowser();
  await inspectHome(browser, { width: 1440, height: 900 });
  await inspectHome(browser, { width: 390, height: 844 }, true);

  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${BASE}/work/`, { waitUntil: 'networkidle' });
    await page.locator('.capture-pair').scrollIntoViewIfNeeded();
    await page.waitForTimeout(450);
    const work = await page.evaluate(() => ({
      title: document.querySelector('h1')?.textContent.replace(/\s+/g, ' ').trim(),
      heading: document.getElementById('evidence-title')?.textContent.replace(/\s+/g, ' ').trim(),
      proofs: [...document.querySelectorAll('.capture img, .capture-pair img')]
        .every(image => image.complete && image.naturalWidth > 0),
      wide: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      live: document.querySelector('a[href="https://fv.entdeckerwerkstadt.de/"]')?.textContent.trim()
    }));
    check(`${viewport.width}px work page shows real evidence`,
      work.title === 'EntdeckerWerkStadt' && work.proofs && work.live === 'visit the live site', JSON.stringify(work));
    check(`${viewport.width}px work copy is concrete`, work.heading === 'A public site the team can keep current.');
    check(`${viewport.width}px work page has no overflow or runtime errors`, !work.wide && !errors.length,
      errors.join(' | '));
    await page.evaluate(() => { document.activeElement?.blur(); scrollTo(0, 0); });
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(__dirname, 'out', `work-${viewport.width}.png`), fullPage: true });
    await page.close();
  }

  const lost = await browser.newPage({ viewport: { width: 1024, height: 720 } });
  const lostErrors = [];
  lost.on('pageerror', error => lostErrors.push(error.message));
  const body = fs.readFileSync(path.join(__dirname, '..', '404.html'), 'utf8');
  await lost.route('**/some/old/page', route => route.fulfill({ status: 404, contentType: 'text/html', body }));
  await lost.goto(`${BASE}/some/old/page`);
  await lost.waitForTimeout(300);
  const nested = await lost.evaluate(() => ({
    path: document.querySelector('.lost-path')?.textContent,
    styled: getComputedStyle(document.body).backgroundColor,
    guess: typeof window.lostSaid
  }));
  check('nested 404 keeps its own styling and helper',
    /some\/old\/page/.test(nested.path || '') && nested.guess === 'function' && !/255, 255, 255/.test(nested.styled),
    JSON.stringify(nested));
  check('nested 404 raises no runtime errors', !lostErrors.length, lostErrors.join(' | '));
  await lost.close();

  const still = await browser.newPage({ viewport: { width: 1024, height: 720 }, reducedMotion: 'reduce' });
  await quiet(still);
  await still.goto(`${BASE}/`);
  check('reduced motion removes ambient movement', await still.evaluate(() =>
    getComputedStyle(document.querySelector('.field')).display === 'none'));
  await still.close();

  await browser.close();
  console.log(failures.length ? `\n${failures.length} smoke check(s) failed` : '\nsmoke checks pass');
  process.exit(failures.length ? 1 : 0);
})().catch(error => {
  console.error(error);
  process.exit(1);
});
