/* 領域展開, the barrier that goes up when you arrive.

   A loading screen is the one piece of a page that can lock somebody out
   of it, so every way it could fail to lift is worth forcing: the animation
   never firing, javascript never running, somebody who has asked their
   machine to hold still, and somebody who simply does not want to watch it. */
const BASE = `http://localhost:${process.env.PORT || 8899}`;
const { chromium } = require('playwright');

const fails = [];
const check = (n, ok, d) => { console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  — ' + d : '')); if (!ok) fails.push(n); };

const up = p => p.evaluate(() => {
  const c = document.getElementById('curtain');
  return !c.classList.contains('is-done') && getComputedStyle(c).display !== 'none';
});

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const view = { width: 1200, height: 800 };

  // ── arriving
  let c = await b.newContext({ viewport: view });
  let p = await c.newPage();
  p.on('pageerror', e => fails.push('pageerror: ' + e.message));
  await p.goto(BASE + '/index.html');
  await p.waitForTimeout(250);
  check('it is up when you arrive', await up(p));

  /* The page has to be underneath it the whole time, not swapped in
     afterwards — a reader that never sees the animation, and anything that
     does not run scripts at all, still has to find the content. */
  check('the page is underneath it the whole time',
    await p.evaluate(() => document.querySelectorAll('.panel').length >= 4 &&
      !!document.querySelector('h1') && document.body.innerText.includes('right now')));

  /* Nothing underneath it is allowed to have arrived yet. The regions in
     view used to assemble themselves behind the barrier and be sitting
     there finished when it went, which threw away the one moment on the
     page where everything is about to happen. */
  check('what is under it has not arrived yet',
    await p.evaluate(() => ![...document.querySelectorAll('.reveal')].some(s => s.classList.contains('is-in'))));
  /* The header inks itself in — the name, then the stroke under it, then
     the line, then the tags. All four have to be held, and they have to
     be held in a way that keeps the order: paused rather than delayed, so
     nothing here has to know how long the barrier lasts. */
  const held = await p.evaluate(() => ['.name button > span', '.brush', '.who', '.links a']
    .map(s => {
      const a = document.querySelector(s).getAnimations()[0];
      return a ? `${a.playState}@${Math.round(a.effect.getTiming().delay)}` : 'none';
    }));
  check('and none of the header has been drawn yet',
    held.every(h => h.startsWith('paused')), held.join(' '));
  check('and it is held in an order rather than all at once',
    new Set(held.map(h => h.split('@')[1])).size >= 3, held.join(' '));

  await p.waitForTimeout(2400);
  check('it lifts on its own', !(await up(p)));

  /* .now only. Nothing is mocked here, so the music region has hidden
     itself and the favourites never appeared — both correctly. */
  check('and then what is in view arrives',
    await p.evaluate(() => document.querySelector('.now').classList.contains('is-in')));
  check('and the header is drawn',
    await p.evaluate(() => ['.name button > span', '.brush', '.who', '.links a']
      .every(s => {
        const a = document.querySelector(s).getAnimations()[0];
        return !a || a.playState !== 'paused';
      })));
  check('and stops being in the way',
    await p.evaluate(() => getComputedStyle(document.getElementById('curtain')).display) === 'none');
  check('what is under it can be clicked once it is gone',
    await p.evaluate(() => !!document.elementFromPoint(120, 400)));

  /* The white outlives the drawing on purpose — the page arrives out of it
     rather than cross-fading with it — so for a moment it is a full-screen
     layer over a live page, and it must not be in the way while it is. */
  check('the white never takes a click',
    await p.evaluate(() => getComputedStyle(document.getElementById('curtain-white')).pointerEvents) === 'none');
  await p.waitForTimeout(600);
  check('and it is gone afterwards too',
    await p.evaluate(() => getComputedStyle(document.getElementById('curtain-white')).display) === 'none');

  /* Going somewhere and coming back is the same visit and must not put it
     up again. Session storage is per tab, which is exactly the shape
     wanted: a new tab is somebody arriving, a reload is not. */
  await p.goto(BASE + '/404.html');
  await p.waitForTimeout(300);
  check('the 404 carries no curtain of its own',
    await p.evaluate(() => !document.getElementById('curtain')));

  await p.goBack();
  await p.waitForTimeout(400);
  check('coming back does not put it up again', !(await up(p)));

  await p.reload();
  await p.waitForTimeout(400);
  check('nor does a reload', !(await up(p)));
  await p.close();
  await c.close();

  // ── somebody who does not want to watch it
  c = await b.newContext({ viewport: view });
  p = await c.newPage();
  await p.goto(BASE + '/index.html');
  await p.waitForTimeout(200);
  await p.mouse.click(600, 400);
  await p.waitForTimeout(400);
  check('a click takes it down at once', !(await up(p)));
  /* Clicking through it is not the timer running out, and what is
     underneath is waiting on a word from one place. Miss this path and
     anybody impatient enough to skip the barrier gets a page that never
     arrives at all. */
  check('and clicking through it still lets the page arrive',
    await p.evaluate(() => document.querySelector('.now').classList.contains('is-in')));
  await p.close();

  p = await c.newPage();
  await p.evaluate(() => {}).catch(() => {});
  await c.clearCookies();
  await p.goto(BASE + '/index.html');
  await p.waitForTimeout(200);
  await p.keyboard.press('Escape');
  await p.waitForTimeout(120);
  // this page is the second of its session, so it was never up to begin
  // with — what matters is that pressing a key did not break anything
  check('a key press leaves the page working',
    await p.evaluate(() => !!document.querySelector('h1')));
  await p.close();
  await c.close();

  /* Once is a loading screen; being able to set it off again is the point.
     The name is the control. */
  c = await b.newContext({ viewport: view });
  p = await c.newPage();
  p.on('pageerror', e => fails.push('replay pageerror: ' + e.message));
  await p.addInitScript(() => { try { sessionStorage.setItem('strohut-seen', '1'); } catch { /* fine */ } });
  await p.goto(BASE + '/index.html');
  await p.waitForTimeout(500);
  check('arriving a second time, it is down', !(await up(p)));

  await p.click('#name-hit');
  await p.waitForTimeout(220);
  check('the name puts it up again', await up(p));

  await p.waitForTimeout(2200);
  check('and it comes down again on its own', !(await up(p)));

  // and again, because an animation that only replays once is a bug
  await p.click('#name-hit');
  await p.waitForTimeout(220);
  check('and again after that', await up(p));
  await p.mouse.click(600, 400);
  await p.waitForTimeout(150);
  check('a click still takes it down', !(await up(p)));
  await p.close();
  await c.close();

  // asked to hold still, the name must not set it off either
  c = await b.newContext({ viewport: view, reducedMotion: 'reduce' });
  p = await c.newPage();
  await p.goto(BASE + '/index.html');
  await p.waitForTimeout(400);
  await p.click('#name-hit');
  await p.waitForTimeout(250);
  check('reduced motion: the name does not raise it', !(await up(p)));
  await p.close();
  await c.close();

  // ── asked to hold still
  c = await b.newContext({ viewport: view, reducedMotion: 'reduce' });
  p = await c.newPage();
  await p.goto(BASE + '/index.html');
  await p.waitForTimeout(400);
  check('reduced motion never sees it', !(await up(p)));
  await p.close();
  await c.close();

  // ── no javascript at all: it must not exist, or nothing could lift it
  c = await b.newContext({ viewport: view, javaScriptEnabled: false });
  p = await c.newPage();
  await p.goto(BASE + '/index.html');
  await p.waitForTimeout(400);
  check('without javascript it is never in the way',
    await p.evaluate(() => getComputedStyle(document.getElementById('curtain')).display) === 'none' &&
    await p.evaluate(() => getComputedStyle(document.getElementById('curtain-white')).display) === 'none');
  await p.close();
  await c.close();

  /* The animation not firing is the failure that would leave somebody
     staring at a black rectangle. Something has to lift it anyway. */
  c = await b.newContext({ viewport: view });
  p = await c.newPage();
  await p.addInitScript(() => {
    // as if the animation never ran and nothing ever ended
    const real = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (kind, fn, opts) {
      if (kind === 'animationend' && this instanceof HTMLElement && this.id === 'curtain') return;
      return real.call(this, kind, fn, opts);
    };
  });
  await p.goto(BASE + '/index.html');
  await p.waitForTimeout(400);
  check('with no animationend it is still up at first', await up(p));
  await p.waitForTimeout(3400);
  check('and a timer takes it down regardless', !(await up(p)));
  await p.close();
  await c.close();

  await b.close();
  console.log(fails.length ? `\n${fails.length} FAILING: ${fails.join(' | ')}` : '\nthe barrier always lifts');
  process.exit(fails.length ? 1 : 0);
})();
