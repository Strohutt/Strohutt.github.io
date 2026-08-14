/* Work surface contracts. */
const BASE = `http://localhost:${process.env.PORT || 8899}`;
const { launchBrowser, blockLanyardSocket } = require('./browser');

const fails = [];
const check = (name, ok, detail) => {
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (detail ? '  — ' + detail : ''));
  if (!ok) fails.push(name);
};

(async () => {
  const b = await launchBrowser();


  {
    const p = await b.newPage({ viewport: { width: 1340, height: 900 } });
    const errors = [];
    p.on('pageerror', error => errors.push(error.message));
    await p.addInitScript(() => {
      try { sessionStorage.setItem('strohut-seen', '1'); } catch { /* fine */ }
    });
    await blockLanyardSocket(p);
    await p.route('**/api.lanyard.rest/**', route => route.abort());
    await p.route('**/graphql.anilist.co/**', route => route.abort());
    const response = await p.goto(BASE + '/index.html');
    await p.waitForTimeout(900);

    const front = await p.evaluate(async () => {
      const now = document.getElementById('now');
      const work = document.getElementById('work');
      const likes = document.getElementById('likes');
      const image = work && work.querySelector('.work-shot img');
      if (image) {
        image.scrollIntoView({ block: 'center' });
        if (!image.complete) await new Promise(done => image.addEventListener('load', done, { once: true }));
      }
      const follows = (a, b) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
      return {
        inOrder: Boolean(now && work && likes && follows(now, work) && follows(work, likes)),
        chapter: work && work.querySelector('.chapter .says')?.textContent.trim(),
        says: work && work.querySelector('#work-h .says')?.textContent.trim(),
        links: work ? [...work.querySelectorAll('a[href]')].map(a => a.getAttribute('href')) : [],
        image: image ? { complete: image.complete, width: image.naturalWidth, src: image.currentSrc } : null,
        numberedImageOverlay: Boolean(work?.querySelector('.work-shot > span')),
        music: Boolean(document.querySelector('#music, .music, [id^="track-"]'))
      };
    });

    check('the front page responds', response && response.ok(), response && String(response.status()));
    check('work sits between right now and favourites', front.inOrder);
    check('work owns chapter two', front.chapter === 'chapter two' && front.says === 'selected work', JSON.stringify(front));
    check('both preview links open the dedicated case', front.links.length >= 2 && front.links.every(href => /^work\/(?:#entdeckerwerkstadt)?$/.test(href)), front.links.join(' | '));
    check('the preview uses the real dark-mode capture', front.image && front.image.complete && front.image.width > 300 && /\/assets\/work\/entdeckerwerkstadt-(desktop|mobile)-dark\.jpg$/.test(new URL(front.image.src).pathname), JSON.stringify(front.image));
    check('the preview image has no numbered overlay', !front.numberedImageOverlay);
    check('no music UI remains on the front', !front.music);
    check('the front preview throws nothing', !errors.length, errors.join(' | '));
    await p.close();
  }

  for (const [label, viewport, expectedCapture] of [
    ['wide', { width: 1340, height: 900 }, 'desktop'],
    ['phone', { width: 390, height: 844 }, 'mobile']
  ]) {
    const c = await b.newContext({ viewport });
    const p = await c.newPage();
    const errors = [];
    p.on('pageerror', error => errors.push(error.message));

    const response = await p.goto(BASE + '/work/');
    await p.waitForTimeout(500);
    await p.keyboard.press('Tab');
    const firstFocus = await p.evaluate(() => document.activeElement && document.activeElement.className);

    const page = await p.evaluate(async () => {
      const image = document.querySelector('.capture img');
      if (!image.complete) await new Promise(done => image.addEventListener('load', done, { once: true }));
      const proofImages = [...document.querySelectorAll('.capture-pair img')];
      for (const proof of proofImages) {
        proof.scrollIntoView({ block: 'center' });
        if (!proof.complete) await new Promise(done => proof.addEventListener('load', done, { once: true }));
      }
      const source = document.querySelector('.capture picture source');
      const ledger = document.querySelector('.case-ledger');
      const proofPair = document.querySelector('.capture-pair');
      const story = document.querySelector('.story-flow');
      const follows = (first, second) => Boolean(first && second && (first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING));
      const desk = [...document.querySelectorAll('.desk-list article')].map(article => ({
        name: article.querySelector('h3')?.textContent.trim(),
        status: article.querySelector('.status')?.textContent.replace(/\s+/g, ' ').trim(),
        copy: article.textContent.replace(/\s+/g, ' ').trim()
      }));
      const flow = [...document.querySelectorAll('.flow-track li')].map(step => ({
        stage: step.querySelector('.flow-stage')?.textContent.replace(/\s+/g, ' ').trim(),
        title: step.querySelector('h3')?.textContent.trim(),
        copy: step.textContent.replace(/\s+/g, ' ').trim()
      }));
      const targets = [...document.querySelectorAll('a[href], button')].map(el => {
        const rect = el.getBoundingClientRect();
        return { name: (el.textContent || el.getAttribute('aria-label') || '').trim(), width: rect.width, height: rect.height };
      }).filter(target => target.width && target.height && (target.width < 24 || target.height < 24));
      return {
        title: document.querySelector('h1')?.textContent.replace(/\s+/g, ' ').trim(),
        h1s: document.querySelectorAll('h1').length,
        sections: [...document.querySelectorAll('main > section')].map(section => section.id || section.className),
        verified: document.querySelector('.eyebrow')?.textContent.replace(/\s+/g, ' ').trim(),
        heroCopy: document.querySelector('.case-intro')?.textContent.replace(/\s+/g, ' ').trim(),
        templateNumbers: document.querySelectorAll('.case-index, .flow-no').length,
        ledger: [...document.querySelectorAll('.case-ledger article')].map(article => article.textContent.replace(/\s+/g, ' ').trim()),
        proofPlacement: follows(ledger, proofPair) && follows(proofPair, story),
        proofs: proofImages.map(proof => ({
          complete: proof.complete,
          width: proof.naturalWidth,
          height: proof.naturalHeight,
          src: proof.currentSrc,
          alt: proof.getAttribute('alt')
        })),
        proofCaptions: [...document.querySelectorAll('.capture-pair figcaption')].map(caption => caption.textContent.replace(/\s+/g, ' ').trim()),
        mobileSource: source ? {
          width: Number(source.getAttribute('width')),
          height: Number(source.getAttribute('height')),
          srcset: source.getAttribute('srcset')
        } : null,
        flow,
        flowCopy: document.querySelector('.story-flow')?.textContent.replace(/\s+/g, ' ').trim(),
        flowBoundary: document.querySelector('.flow-boundary')?.textContent.replace(/\s+/g, ' ').trim(),
        desk,
        caseLinks: [...document.querySelectorAll('.case-links a')].map(link => link.getAttribute('href')),
        capture: { complete: image.complete, width: image.naturalWidth, src: image.currentSrc },
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        missingAlt: document.querySelectorAll('img:not([alt])').length,
        skip: document.querySelector('.skip')?.getAttribute('href'),
        targets,
        externalAssets: [...document.querySelectorAll('link[rel="stylesheet"], link[rel="preload"], link[rel="icon"], img[src], source[srcset]')]
          .map(element => element.getAttribute('href') || element.getAttribute('src') || element.getAttribute('srcset'))
          .map(value => new URL(value, location.href))
          .filter(url => !['127.0.0.1', 'localhost'].includes(url.hostname))
          .map(url => url.href)
      };
    });

    check(`${label}: the work page responds`, response && response.ok(), response && String(response.status()));
    check(`${label}: EntdeckerWerkStadt is the one presented case`, page.h1s === 1 && page.title === 'EntdeckerWerkStadt' && /2026/.test(page.verified) && /website & editor/.test(page.verified), JSON.stringify({ title: page.title, verified: page.verified }));
    check(`${label}: the hero starts with the real publishing constraint`, /without calling a developer for every change/i.test(page.heroCopy) && /bilingual pages, protected editor and Steinwanderer review flow/i.test(page.heroCopy), page.heroCopy);
    check(`${label}: no decorative case or flow number survives`, page.templateNumbers === 0, String(page.templateNumbers));
    check(`${label}: the case separates public, private and system surfaces`, page.ledger.length === 3 && /public/.test(page.ledger[0]) && /private/.test(page.ledger[1]) && /system/.test(page.ledger[2]), page.ledger.join(' | '));
    check(`${label}: the two additional views sit after the ledger`, page.proofPlacement && page.proofs.length === 2, JSON.stringify({ placement: page.proofPlacement, count: page.proofs.length }));
    check(`${label}: the additional views are genuine news and mobile entry captures`, page.proofs[0]?.complete && page.proofs[0].width === 1440 && page.proofs[0].height === 900 && page.proofs[0].src.endsWith('foerderverein-news-desktop.png') && page.proofs[1]?.complete && page.proofs[1].width === 390 && page.proofs[1].height === 844 && page.proofs[1].src.endsWith('foerderverein-steinwanderer-entry-mobile.png'), JSON.stringify(page.proofs));
    check(`${label}: both additional views explain what they prove`, JSON.stringify(page.proofCaptions) === JSON.stringify(['News index — published through the protected editor.', 'Steinwanderer entry — the public side of the reviewed submission flow.']) && page.proofs.every(proof => proof.alt), JSON.stringify(page.proofCaptions));
    check(`${label}: the responsive source reserves its mobile geometry`, page.mobileSource?.width === 390 && page.mobileSource?.height === 844 && page.mobileSource.srcset.endsWith('entdeckerwerkstadt-mobile-dark.jpg'), JSON.stringify(page.mobileSource));
    check(`${label}: the Steinwanderer flow sits between evidence and unfinished work`, JSON.stringify(page.sections) === JSON.stringify(['entdeckerwerkstadt', 'evidence', 'steinwanderer', 'on-desk']), page.sections.join(' | '));
    check(`${label}: the Steinwanderer flow has four distinct phases`, page.flow.length === 4 && ['01', '02', '03', '04'].every((stage, index) => page.flow[index].stage === stage), JSON.stringify(page.flow));
    check(`${label}: the flow makes the privacy boundary explicit`, /starts pending/i.test(page.flow[1].copy) && /unavailable to anonymous visitors/i.test(page.flow[1].copy) && /only approved stones and images/i.test(page.flow[3].copy) && /nothing public before approval/i.test(page.flowBoundary), page.flowCopy);
    check(`${label}: the flow avoids invented production metrics`, !/\b\d+(?:[.,]\d+)?\s*(?:%|percent|users|hours saved|conversion)/i.test(page.flowCopy), page.flowCopy);
    check(`${label}: Sonitor says what exists and what is unfinished`, page.desk.some(item => item.name === 'Sonitor' && /active WIP/.test(item.status) && /Harbor shell, catch flow and loadout/i.test(item.copy) && /still unfinished/i.test(item.copy)), JSON.stringify(page.desk));
    check(`${label}: Centauri says what exists and what is being rebuilt`, page.desk.some(item => item.name === 'Centauri' && /under revision/.test(item.status) && /Project views, monitoring and a knowledge map exist/i.test(item.copy) && /still being rebuilt/i.test(item.copy)), JSON.stringify(page.desk));
    check(`${label}: the case links the live site, its evidence and Steinwanderer moderation`, JSON.stringify(page.caseLinks) === JSON.stringify(['https://fv.entdeckerwerkstadt.de/', '#evidence', '#steinwanderer']), page.caseLinks.join(' | '));
    check(`${label}: the ${expectedCapture} dark-mode capture is loaded`, page.capture.complete && page.capture.width > 300 && page.capture.src.endsWith(`entdeckerwerkstadt-${expectedCapture}-dark.jpg`), JSON.stringify(page.capture));
    check(`${label}: every authored runtime asset is local`, !page.externalAssets.length, page.externalAssets.join(' | '));
    check(`${label}: nothing widens the page`, !page.overflow);
    check(`${label}: every image has alt text`, page.missingAlt === 0, String(page.missingAlt));
    check(`${label}: every target clears 24px`, !page.targets.length, JSON.stringify(page.targets));
    check(`${label}: the skip link is first in the keyboard order`, firstFocus === 'skip' && page.skip === '#main', String(firstFocus));
    check(`${label}: no page errors`, !errors.length, errors.join(' | '));
    await c.close();
  }

  {
    const c = await b.newContext({ viewport: { width: 1200, height: 800 }, reducedMotion: 'reduce' });
    const p = await c.newPage();
    await p.goto(BASE + '/work/');
    await p.waitForTimeout(120);
    const running = await p.evaluate(() => document.getAnimations()
      .filter(animation => animation.playState === 'running' && animation.effect.getTiming().duration > 100).length);
    check('reduced motion leaves no long animation running', running === 0, String(running));
    await c.close();
  }

  await b.close();
  console.log(fails.length ? `\n${fails.length} FAILING: ${fails.join(' | ')}` : '\nwork checks pass');
  process.exit(fails.length ? 1 : 0);
})();
