# strohutt.github.io

My page. Dark, jujutsu kaisen flavoured.

Runs on GitHub Pages. No build step, no framework — four files, open them
and type.

| File          | Contents                                                  |
| ------------- | --------------------------------------------------------- |
| `index.html`  | The page, plus the icons and the ring as inline SVG        |
| `styles.css`  | Colours, layout, the cursed energy                         |
| `script.js`   | Scroll reveals, the doodle pad, the Discord presence       |
| `favicon.svg` | The purple orb                                             |

## The look

Everything on the page is built out of the three techniques and nothing
else: **blue** pulls, **red** pushes, and where they collide you get
**purple**. Those are the only three accents in `styles.css` — links,
pens, the status dot, the ring, the slashes. No fourth colour.

The orb in the header is that collision: a blue field and a red field on
`mix-blend-mode: screen`, drifting against each other on opposite
schedules, so the overlap really does go violet rather than being painted
violet. The live Discord avatar sits inside it.

Nothing is rounded except the orb and the avatar. Every panel, button and
tag is cleaved — a `clip-path` polygon with two corners cut off — and the
dividers between sections are slash marks, not rules.

The name is set three times on top of each other: blue, red, then bone.
The blue and red layers drift a few pixels apart on opposite cycles, so
the edges of the letters bleed the two techniques.

## Japanese

The small vertical labels are section names: 領域展開 domain expansion,
現在 now, 自己紹介 about me, 落書き scribble, 音楽 music. The characters
around the ring are technique names.

They are stacked as individual `<span>` elements rather than with
`writing-mode: vertical-rl`, because vertical layout needs vertical
metrics that a fallback font may not have — and when it doesn't, every
glyph lands on top of the last one.

## The doodle pad

A patch of the page visitors can draw on, in blue, red or purple. It
lives in `localStorage` and never leaves the browser.

Strokes are stored as normalised 0–1 coordinates and a pen *name*, not a
colour or a pixel position — so the drawing survives a resize and would
survive a repaint in a different palette. Anything already under the
storage key gets checked stroke by stroke before it is drawn: bad data
used to throw, and because the script is one file, that took the Discord
panel down with it.

One pointer at a time, or a second finger hijacks the stroke in progress.

## Discord presence

`script.js` hangs off [Lanyard](https://github.com/Phineas/lanyard). It
fills from the REST endpoint immediately so the panel is never empty
while waiting, then a WebSocket keeps it live — anything the socket has
already delivered wins over a slow REST reply.

It shows the custom status, then every activity Discord reports, each
with its own timer counting up. If Lanyard can't be reached it says so
and the rest of the page carries on.

Different account: change `DISCORD_ID` at the top of `script.js` and the
two profile links in `index.html`.

## Music

The `in my ears` card holds one pinned Spotify track. If something is
actually playing, `script.js` swaps it and the kicker changes from
"stuck in my head" to "playing right now". Behind the player is a plain
link, for anyone whose browser blocks embeds.

## Running it locally

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`. The presence panel needs internet;
without it the panel just says it can't reach Discord.
