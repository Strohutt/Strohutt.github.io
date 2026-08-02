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
  /* Waited for rather than read off a stopwatch. The regions start
     watching for themselves the moment the barrier says it is done, and
     how long the observer then takes to answer is not a number this
     check has any business knowing — a header one line longer was enough
     to put it on the wrong side of a fixed wait. */
  const arrived = await p.waitForFunction(
    () => document.querySelector('.now').classList.contains('is-in'),
    null, { timeout: 4000 }).then(() => true).catch(() => false);
  check('and then what is in view arrives', arrived);
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
    await p.waitForFunction(() => document.querySelector('.now').classList.contains('is-in'),
      null, { timeout: 4000 }).then(() => true).catch(() => false));
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

  /* The 404 has the staff too. It is the page somebody lands on by mistake,
     so it is the one that most needs something to do. Same rig, same pull. */
  c = await b.newContext({ viewport: view });
  p = await c.newPage();
  await p.goto(BASE + '/404.html');
  await p.waitForTimeout(600);

  const rigLen = () => p.evaluate(() => {
    const rig = document.querySelector('.staff-rig');
    return rig ? Math.round(rig.offsetWidth) : -1;
  });

  const rest = await rigLen();
  check('the 404 has a staff at rest', rest > 100);

  const grip = await p.evaluate(() => {
    const g = document.querySelector('.staff-grip');
    if (!g) return null;
    const r = g.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  check('and a grip to take hold of', !!grip);

  if (grip) {
    await p.mouse.move(grip.x, grip.y);
    await p.mouse.down();
    await p.mouse.move(grip.x + 700, grip.y, { steps: 12 });
    await p.waitForTimeout(120);
    const pulled = await rigLen();
    check('it stretches when it is pulled on the 404', pulled > rest + 200);

    /* Nothing it does may make the page scroll sideways — the staff reaches
       further than the window on purpose, so it has to be clipped. */
    check('and pulling it never widens the page', await p.evaluate(() =>
      document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));

    await p.mouse.up();
    await p.waitForTimeout(900);
    const back = await rigLen();
    check('and it snaps back after letting go', Math.abs(back - rest) < 60);
  }

  /* ── and it is marked as the side story
     The front's regions are numbered chapters; the 404 is the one page
     of the book that is not one, and a volume has a mark for that. Three
     drawn characters, each resolving to a symbol in this page's own
     sprite — a use pointing at nothing is an empty box exactly the size
     of the missing character. */
  {
    const mark = await p.evaluate(() => {
      const chapter = document.querySelector('.lost-head .chapter');
      if (!chapter) return null;
      const uses = [...chapter.querySelectorAll('.glyphs use')]
        .map(u => (u.getAttribute('href') || '').replace('#', ''));
      return {
        says: (chapter.querySelector('.says') || {}).textContent || '',
        uses,
        drawn: uses.filter(id => {
          const sym = document.getElementById(id);
          return sym && sym.tagName.toLowerCase() === 'symbol';
        }).length,
        beside: !!chapter.closest('.lost-head').querySelector('.code')
      };
    });
    check('the 404 is marked as the side story', !!mark && mark.says === 'side story',
      mark && mark.says);
    check('and every character of the mark is really drawn',
      !!mark && mark.uses.length === 3 && mark.drawn === 3,
      mark && `${mark.drawn} of ${mark.uses.length}`);
    check('and it shares its row with the code, not the name',
      !!mark && mark.beside);
  }
  await p.close();
  await c.close();

  /* ── the 404 says which address it is talking about
     GitHub Pages serves that page for anything it cannot find and leaves
     the address in the bar, so the page knows the one thing the front
     page does not: what somebody actually typed or followed. Saying it
     back is the difference between "that page does not exist" and being
     able to see your own typo.

     It is a stranger's text, so it is written as text and never as
     markup, it is cut before it can run away with the line, and the
     decoding of it — which is what turns %C3%BC back into ü — cannot be
     allowed to throw on a half-written escape and take the file with it. */
  c = await b.newContext({ viewport: view });
  p = await c.newPage();
  const broke = [];
  p.on('pageerror', e => broke.push(e.message));

  const asked = async where => {
    // the server here has no 404 handler, so the address is put in the
    // bar the way pages does it: the same document, a different url —
    // and then the page's own code is run against it, not a copy of it
    await p.goto(BASE + '/404.html');
    await p.waitForTimeout(400);
    return p.evaluate(url => {
      history.replaceState(null, '', url);
      lostSaid();
      const el = document.getElementById('lost-path');
      const guess = document.getElementById('lost-guess');
      const link = guess && guess.querySelector('a');
      return {
        text: el.textContent, hidden: el.hidden, html: el.innerHTML,
        guessed: guess && !guess.hidden ? guess.textContent : null,
        to: link ? link.getAttribute('href') : null,
        guessHtml: guess ? guess.innerHTML : ''
      };
    }, where);
  };

  let said = await asked('/some/old/page');
  check('the 404 says what was asked for', said.text === 'nothing at /some/old/page', said.text);

  said = await asked('/404.html');
  check('and says nothing when it was opened on purpose', said.hidden, said.text);

  said = await asked(`/${'x'.repeat(200)}`);
  check('a very long address is cut', said.text.length < 80, String(said.text.length));
  check('and it does not widen the page', await p.evaluate(() =>
    document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));

  said = await asked('/a?<img src=x onerror=alert(1)>');
  check('markup in the address is printed, not run',
    said.html.includes('&lt;img') && !said.html.includes('<img'), said.html.slice(0, 40));

  /* ── and when the typo is close to a real place, it says which one.
     The stranger's text only picks from the page's own list — it never
     becomes markup and it never becomes the link itself. */
  said = await asked('/bountry');
  check('a near-miss gets a guess', said.guessed === 'were you after the bounty?' && said.to === '/#bounty',
    `${said.guessed} → ${said.to}`);

  said = await asked('/Making.html');
  check('an extension does not hide the place it was near',
    said.to === '/#making', `${said.guessed} → ${said.to}`);

  said = await asked('/spotify');
  check('a word the page never uses can still name a region',
    said.to === '/#music', `${said.guessed} → ${said.to}`);

  said = await asked('/some/old/page');
  check('a path near nothing gets no guess', said.guessed === null, String(said.guessed));

  said = await asked('/bountry?<img src=x onerror=alert(1)>');
  check('and the guess never carries the stranger\'s text',
    said.to === '/#bounty' && !said.guessHtml.includes('&lt;img') && !said.guessHtml.includes('<img'),
    said.guessHtml.slice(0, 60));

  /* A half-written escape is a url anybody can type, and decoding one
     throws outright. */
  await p.goto(BASE + '/404.html');
  await p.waitForTimeout(400);
  const half = await p.evaluate(() => {
    const raw = '/%E0%A4';
    let path = raw;
    try { path = decodeURI(raw); } catch { /* show it as it came */ }
    return path;
  });
  check('a half-written escape is shown as it came', half === '/%E0%A4', half);
  check('and nothing on that page threw', !broke.length, broke.join(' | '));

  const first = await p.evaluate(() => {
    const el = document.querySelector('.lost .who > i');
    return el ? getComputedStyle(el).display : 'gone';
  });
  check('the rule holding that sentence apart is still drawn', first !== 'none', first);
  await p.close();
  await c.close();

  await b.close();
  console.log(fails.length ? `\n${fails.length} FAILING: ${fails.join(' | ')}` : '\nthe barrier always lifts');
  process.exit(fails.length ? 1 : 0);
})();
