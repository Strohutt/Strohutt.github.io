# strohutt.github.io

My page. It is a light on a porch: it says whether I'm in, and what I'm
doing while I'm there.

Runs on GitHub Pages. No build step, no framework — three files and a
favicon, open them and type.

| File          | Contents                                              |
| ------------- | ----------------------------------------------------- |
| `index.html`  | The page, plus every drawn thing as inline SVG         |
| `styles.css`  | The panel system, the palette, the black flash         |
| `404.html`    | The same page, for a url that is not there             |
| `flash.js`    | 黒閃, shared by both pages                              |
| `script.js`   | Reveals, the hit targets, the clock, pushes, presence  |
| `og.png`      | The share card, built from the front page's own parts  |
| `fonts.css`, `fonts/` | The two faces, self-hosted, latin + two kanji |
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

Traced off panels rather than invented.

| | |
| --- | --- |
| **Mahoraga's wheel** | Background, drawn thin, cropped by the right edge of the header. Hub sphere, eight spokes running through the rim, eight spheres outside it. It clicks round a step at a time rather than gliding — adaptation lands, it does not ease — and lurches a whole spoke every time a black flash hits. |
| **The loop of binding** | Round the name. A metal ring that floats about the forehead, red once Mori reaches nirvana. It is a hoop, not a headband, so the name sits inside it: near edge over the top, far edge sunk behind the letters. |
| **The cloud scarf** | Crossing the gutter under the header. The band that hangs round Luffy in gear 5 — white where every other zoan awakening billows black. |
| **黒閃** | Click anywhere. Cursed energy landing inside a millionth of a second of the hit; it is named for the black, so the bolts are black and the red is only the edge. The odds climb while you are on a streak and reset the moment you miss. |
| **Jolly Roger** | At the foot, for the name. |

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

## Lately

The five most recent repositories pushed to, with the last commit message
on each, from GitHub's public events feed — no key, no auth.

If it is rate limited or unreachable the panel stays hidden. A section
that only ever explains its own failure is not worth a heading.

## Things you can hit

Every drawn thing answers to a click, and answers the way that thing
would: the wheel adapts a spoke, the cloud gets shoved along, the flag
swings on its pole, the stroke under the name is pulled again. They are
real `<button>` elements so a keyboard reaches them, with every scrap of
button styling taken off — the drawing is the control.

Clicking anywhere else may land a black flash — 黒閃 on the counter. The
odds climb while you are on a streak and reset the moment you miss, and
five in a row stops being a counter and takes the whole field.

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

When nothing is playing it says so and names the pinned track instead. The
markup only holds a bare track id, so the title comes from Spotify's
oembed endpoint — no key, no auth. If that is blocked the panel keeps the
wording it already had.

## The 404

GitHub Pages serves `404.html` for anything it cannot find, and without
one a typo lands on GitHub's own page, which has nothing to do with this
site. It is the same page with less on it — same wheel, same cloud, same
flag — and it is still worth hitting, so `flash.js` is shared rather than
copied. Everything in there guards on its element existing, because the
404 does not carry all of the front page's markup.

## Fonts

Self-hosted. Both families are Japanese and run to thousands of glyphs;
this page reaches basic latin plus exactly two kanji, 黒 and 閃, so only
those subsets are here — 160K on disk, and `unicode-range` means a first
paint pulls about 50K of it. The kanji only arrive if the counter does.

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

Five suites:

| | |
| --- | --- |
| `source` | No browser. Asset versions agree across both pages, every `use` has a symbol and no symbol is unused, nothing styles a cloned symbol through a descendant selector, every `getElementById` has an element, `:has()` and `overflow: clip` are not load-bearing |
| `page` | Nothing hidden without javascript, no sideways scroll from 1600 to 320, every hit target reacts, keyboard reaches all of them, no tap target under 44px |
| `flash` | The timing window lands and misses where it should, rings never pile up, holding forever resolves, touch does not strand one, reduced motion stays still, the best score survives a reload |
| `upstream` | Every upstream dead, github rate limited, github answering junk, twenty activities, a 200-character track title, a malformed presence payload, localStorage refusing to open |
| `limits` | Offline, 280px wide, browser text at 200%, a response that arrives four seconds late, the 404 at 320px |

The site itself has no build step and no dependencies. `package.json`
exists for these and nothing else.

## Running it locally

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`. The presence panel needs internet;
without it the panel just says it can't reach Discord.
