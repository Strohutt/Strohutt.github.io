# strohutt.github.io

My personal site, drawn as a dark manga page rather than a portfolio template. The front page mixes current presence, favourite books, selected work and a small Black Flash timing game. `/work/` gives the work its own, quieter case-study surface.

The site is plain HTML, CSS and JavaScript. There is no framework or frontend build step; the npm dependencies exist for the checks.

## Pages

- `/` — personal homepage and the short work preview
- `/work/` — EntdeckerWerkStadt case study, plus honest WIP notes for Sonitor and Centauri
- `/404.html` — the matching not-found page

## Project map

- `index.html` — homepage markup and inline SVG drawings
- `styles.css` — shared composition, motion and accessibility modes
- `script.js` — presence, AniList data, reveals and page interactions
- `flash.js` — Black Flash, Domain Expansion, wheel and 404 behaviour
- `work/index.html`, `work/work.css` — dedicated work page
- `assets/work/` — screenshots from running project builds
- `fonts.css`, `fonts/` — self-hosted type
- `tests/` — source and Playwright checks

## Live data

The Right Now chapter reads Discord presence from [Lanyard](https://github.com/Phineas/lanyard). The favourites chapter asks AniList for the three named books and their adaptations. Both surfaces fail quietly when their upstream is unavailable.

Right Now can only show activities that Discord shares with Lanyard. An empty `activities` array means no activity was shared; the page cannot infer that Roblox or another local app is running.

There is no analytics code in this repository. Short-lived interaction state uses `sessionStorage` and ends with the browser tab.

## Project images

The images in `assets/work/` are captures from working project builds. Sonitor and Centauri stay text-only until their own captures are ready.

## Run locally

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000`. Live-data chapters need network access; the rest does not.

## Checks

```sh
npm install
npm test
```

The runner keeps three release gates: source integrity, desktop/mobile smoke journeys and the Lanyard/AniList fallbacks. It also writes local review captures to `tests/out/`.

When a versioned CSS or JavaScript asset changes, bump its `?v=` value on every page that loads it.
