# strohutt.github.io

My page. It is a light on a porch: it says whether I'm in, and what I'm
doing while I'm there.

Runs on GitHub Pages. No build step, no framework, no dependencies — open
the files and type.

| File          | Contents                                              |
| ------------- | ----------------------------------------------------- |
| `index.html`  | The page, plus every drawn thing as inline SVG         |
| `styles.css`  | The panel system, the palette, the black flash         |
| `404.html`    | The same page, for a url that is not there             |
| `flash.js`    | 黒閃, the wheel and the staff — shared by both pages    |
| `script.js`   | Reveals, the hit targets, the clock, the compass, the books, presence |
| `og.png`      | The share card, built from the front page's own parts  |
| `fonts.css`, `fonts/` | The two faces, self-hosted, latin + the kanji it draws |
| `favicon.svg` | The wheel, drawn the same way as the one on the page   |
| `site.webmanifest`, `apple-touch-icon.png` | For a home screen |

## The look

Nothing is boxed. Thin light outlines with clipped corners on black read
as a sci-fi interface kit rather than a drawn page — a real panel border
is a black line on paper, and inverting that lands somewhere else
entirely. So the regions are held apart by space, by the cloud, and by the
rule under each heading, and the wheel runs off the right edge of the page
rather than being placed inside a frame.

One drawing rule, applied to everything: line art, paper-white stroke, ink
fill so shapes occlude one another. No gloss, no specular highlight, no
gradient, no solid colour fields. Red is not decoration — it marks exactly
two things, the loop of binding and the black flash. The flag is the one
solid, because a flag is a silhouette.

Objects drawn in four different languages is what made an earlier version
read as clutter, not the number of them.

Depth is line weight, the way it is on a drawn page: the loop and the flag
are foreground and carry the heaviest line, the cloud sits in the middle,
the wheel and the speed lines are background and are drawn thin. Every
line at the same weight is what makes a page read flat.

Shading is a screentone dot grid, which is what shades a manga panel. Soft
glow on black is what shades a dark template.

## The drawn things

Traced off panels rather than invented, and checked against the source
rather than against memory of it. Yeoui is the example: it had a gold
band round each end, which is the version from the First Heavenly War and
not the one Mori carries. What the wiki calls a stone-looking bo staff,
namu.wiki puts more plainly — 평범한 콘크리트색의 기둥, an ordinary
concrete-coloured pillar, which is what it was, one of the pillars of the
Dragon Palace. So it is grey stone end to end, cut flat, chipped, matte,
and nothing else.

| | |
| --- | --- |
| **Mahoraga's wheel** | Background, drawn thin, cropped by the right edge of the header. Hub sphere, eight spokes running through the rim, eight spheres outside it. It clicks round a step at a time rather than gliding — adaptation lands, it does not ease — and lurches a whole spoke every time a black flash hits. |
| **The loop of binding** | Round the name. A metal ring that floats about the forehead, red once Mori reaches nirvana. It is a hoop, not a headband, so the name sits inside it: near edge over the top, far edge sunk behind the letters. |
| **The cloud scarf** | Crossing the gutter under the header. The band that hangs round Luffy in gear 5 — white where every other zoan awakening billows black. |
| **黒閃** | Cursed energy landing inside a millionth of a second of the hit; it is named for the black, so the bolts are black and the red is only the edge. It has a field of its own in its own panel — see below. |
| **여의봉** | Yeoui, in the header, and on the 404. Take hold of the grip and pull and it goes wherever the pointer goes; let go and it comes back, leaving what it swung through behind it. Three drawings, not one: two ends and a middle, and only the middle stretches. |
| **The log pose** | Bottom left, once the page has been scrolled. The needle points at whichever region is coming next, swinging as you pass each one, and the four marks on the bezel light as you go by them. |
| **Jolly Roger** | At the foot, over the sea, for the name. |

Every outline is generated with a fixed seed and shaken off its ideal
curve, so no two bumps match and nothing sits on a perfect circle.

## Four things that will bite you

**`<use>` clones a symbol into a shadow tree, and a descendant selector
never reaches inside it.** `.puff .cl-body` silently does nothing;
`.cl-body` works. Custom properties inherit through, so per-instance
variation has to ride on a variable rather than an ancestor class.

**The wheel bleeds past the right margin, and clipping that is fiddly.**
Clip on the grid and the cut lands on the column edge, straight through
the wheel. `overflow-x: hidden` on `body` hides the scrollbar but the
document still reports the wider scroll width. It takes a full-width
wrapper — `.sheet` — with `overflow-x: clip`.

**Speed lines are drawn with `preserveAspectRatio="slice"`,** which makes
the artwork overflow its own viewport on purpose, so the `<svg>` element
itself has to clip or it widens the page.

**Every neighbouring lobe of a cloud has to genuinely overlap.** Where two
only touch, the outline pinches to nothing and the band reads as beads on
a wire. `cloudBar()` widens any pair that comes up short.

**Walking the underside of a lobe chain needs the lower crossing of each
pair of circles and the opposite sweep direction.** Reusing the top-edge
maths gives a zigzag with spikes hanging off it.

## The clock

A homepage that says "Germany" says the same thing at four in the morning
as at noon. This one says which it is, so a visitor can work out for
themselves whether a message is going to be answered tonight. `Intl` does
the timezone, so summer time is not something anyone has to maintain.

## Favourites

Three titles, and what AniList says about each: format, whether it is
still going, how many chapters, the year it started, and — where there is
one — the adaptation and how many episodes of it there are. One request,
one alias per title, no key and no auth.

A search hands back what it thinks you meant, not what you asked for, so
the entry taken is the one whose title answers to the one asked for
wherever it sits in the results — otherwise a card states a spin-off's
chapter count under a heading that says favourites. A title with no book
behind it is not a card, and if AniList cannot be reached the panel stays
hidden. A section that only ever explains its own failure is not worth a
heading.

They are kept for the visit, so a reload draws them straight away and
asks again behind them.

## Things you can hit

Every drawn thing answers to a click, and answers the way that thing
would: the wheel adapts a spoke, the cloud gets shoved along, the flag
swings on its pole, the stroke under the name is pulled again, the staff
grows to wherever it is dragged. They are real `<button>` elements so a
keyboard reaches them, with every scrap of button styling taken off — the
drawing is the control.

The black flash has a field of its own in the 黒閃 panel, and that is the
only thing that takes a hold — it used to be the whole window, which put
a game underneath every paragraph on the site. The field is a button, so
holding a key on it is the same press as holding a pointer, and every
attempt says what it came to in a live region for anybody who cannot see
the ring shut.

Hold, and let go as the ring shuts. Land one and the next window opens a
little wider and stays open; eight of them and it is half again the size
it started at, and the page says so out loud once. Five in a row opens
the domain for seven seconds, in which nothing misses — once per run,
and the wheel learns from every hit it gives you, which is what those
seven seconds cost. None of it is kept past the visit.

Both live panels are hidden when JavaScript is off. They are fed by a
socket, and without it they would sit on "reaching discord" forever, which
is worse than not being there.

## Discord presence

`script.js` hangs off [Lanyard](https://github.com/Phineas/lanyard). It
fills from the REST endpoint immediately so the panel is never empty while
waiting, then a WebSocket keeps it live — anything the socket has already
delivered wins over a slow REST reply.

It shows the custom status, then every activity Discord reports, each with
its own timer counting up. If Lanyard can't be reached it says so and the
rest of the page carries on.

Different account: change `DISCORD_ID` at the top of `script.js` and the
Discord link in `index.html`.

## Music

The track is drawn here rather than dropped in as Spotify's own embed,
which was the one thing on the page in somebody else's visual language.
Sleeve, title, artist, and a bar showing how far through it is, all from
what Lanyard already reports.

When nothing is playing it names the last track it caught during this
visit, and says how long ago that was. Nothing is kept past the visit — a
new tab is somebody arriving and knows of no last track, which is the
whole reason it is on that shelf rather than the other one.

Lanyard is somebody else's free service and this page can sit open all
day, so a socket that will not open backs off to two minutes rather than
being retried every twelve seconds forever. The tab coming forward, or
the network coming back, tries again at once.

## The 404

GitHub Pages serves `404.html` for anything it cannot find, and without
one a typo lands on GitHub's own page, which has nothing to do with this
site. It is the same page with less on it — same wheel, same cloud, same
flag, same staff — so `flash.js` is shared rather than copied. Everything
in there guards on its element existing, because the 404 does not carry
all of the front page's markup. The field is one of the things it does
not carry: the game lives in its own panel on the front page.

Pages leaves the address in the bar, so this is the one page that knows
which url somebody actually typed or followed, and it says it back. That
text belongs to a stranger, so it is written as text and never as markup,
it is cut at sixty-four characters, and the decoding that turns `%C3%BC`
back into ü is wrapped — `/%E0%A4` is a url anybody can type and decoding
one throws outright.

## Everywhere else

The page is the same page in five conditions it did not start out
handling, and each of them is checked:

| | |
| --- | --- |
| **No javascript** | The panels fed by a socket go, and so does anything that cannot work: a field that cannot take a hold, a run of noughts that can never move, a compass with nothing to point at, a clock with no time to show. A control that does nothing when it is pressed is worse than no control. The heading and the sentence stay. |
| **Reduced motion** | Nothing moves. The field of motes is not drawn at all, and every impact is a state change rather than an animation. |
| **High contrast** | Windows substitutes its own two colours, which flattens line art built from a light stroke and a dark fill into solid lumps. In that mode the drawings are drawn as lines instead — no fill, the system's text colour for the stroke — and the field gets a real border, because a box-shadow is not drawn at all there and its edge was one. |
| **Printed** | Every word came out white on white: browsers drop backgrounds, and the ink here is the light half of the pair. The two swap in print, which turns rules, panels, drawings and type back into ink on paper in one go. Links print the address they point at. |
| **Inside the domain** | Five in a row turns the whole palette over for seven seconds while somebody is reading the numbers. It is a second palette and it clears the same contrast bar as the first. |

## Fonts

Self-hosted. Both families are Japanese and run to thousands of glyphs;
this page reaches basic latin plus the handful of kanji it actually
draws — 黒閃, 第一二三四話, 覚醒 — so only those subsets are here. 160K on
disk, and `unicode-range` means a first paint pulls the 50K of latin and
nothing else; a kanji block is fetched only if something on the page
reaches into it.

The three latin faces are preloaded in the head rather than waited for
until the stylesheet has been fetched and parsed. A preload has to name
the file exactly as the stylesheet does and carry `crossorigin`, or it is
the same file fetched twice; `source` checks both.

That drops two render-blocking requests to a third party, and the type no
longer depends on Google being reachable.

## Cache

`index.html` asks for `styles.css?v=N` and `script.js?v=N`. GitHub Pages
does not fingerprint filenames and browsers hold onto both files, so
**bump N whenever either changes** — otherwise a returning visitor gets
new markup against an old stylesheet, which looks far more broken than a
page that simply did not update.

## Checks

```sh
npm install
npm test
```

Eight suites, three hundred-odd checks:

| | |
| --- | --- |
| `source` | No browser. Asset versions agree across both pages, every `use` has a symbol and no symbol is unused, nothing styles a cloned symbol through a descendant selector, every `getElementById` has an element, every preload is a file that exists and is asked for the same way the stylesheet asks for it, `:has()` and `overflow: clip` are not load-bearing |
| `page` | Nothing hidden without javascript, no sideways scroll from 1600 to 320, every hit target reacts, keyboard reaches all of them, the compass points at what is coming and remembers where it has been |
| `motion` | Everything that moves, and everything that stops moving when a machine has been asked to hold still |
| `curtain` | The barrier always lifts — on a timer, on a key, with no animation events at all, with javascript off entirely — and the staff on the 404 stretches and snaps back |
| `flash` | The timing window lands and misses where it should, rings never pile up, holding forever resolves, touch does not strand one, only the field takes a hold, space still scrolls the page, the eighth spark wakes it, every attempt is said out loud, and nothing survives the tab |
| `upstream` | Every upstream dead, twenty activities, a 200-character track title, a malformed presence payload, an icon that never arrives, storage refusing to open, a socket that will not connect, and the books kept for the visit |
| `limits` | Offline, 280px wide, browser text at 200%, a response that arrives four seconds late, the 404 at 320px |
| `reach` | Every piece of text against what is really behind it, at the AA thresholds, and every control against 24px — on four screens, inside the domain, in high contrast, and on paper |

The site itself has no build step and no dependencies. `package.json`
exists for these and nothing else.

## Running it locally

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`. The presence panel needs internet;
without it the panel just says it can't reach Discord.
