# strohutt.github.io

My page. Dark, jujutsu kaisen flavoured, with god of highschool
and one piece bolted on.

Runs on GitHub Pages. No build step, no framework — four files, open them
and type.

| File          | Contents                                                  |
| ------------- | --------------------------------------------------------- |
| `index.html`  | The page, plus every icon and drawn thing as inline SVG    |
| `styles.css`  | Colours, layout, the cursed energy                         |
| `script.js`   | Scroll reveals, the doodle pad, the Discord presence       |
| `favicon.svg` | The purple orb                                             |

## The look

The page runs on three techniques: **blue** pulls, **red** pushes, and where
they collide you get **purple**. Links, pens, the status dot and the glow
are those three and nothing else.

The orb in the header is that collision: a blue field and a red field on
`mix-blend-mode: screen`, drifting against each other on opposite
schedules, so the overlap really does go violet rather than being painted
violet. The live Discord avatar sits inside it.

Nothing is rounded except the orb and the avatar. Every panel, button and
tag is cleaved — a `clip-path` polygon with two corners cut off.

## The drawn things

Five of them, traced off panels rather than invented, which is why they
keep their own colours instead of being repainted violet:

| | |
| --- | --- |
| **Mahoraga's wheel** | Behind the avatar. Hub sphere, eight spokes running through the rim, eight spheres outside it. Turns on its own, and lurches a spoke further every time a black flash lands. |
| **The Loop of Binding** | Round the name. A metal ring that floats about the forehead, red in the nirvana form — so it is a hoop, not a band: the near edge crosses above the name, the far edge sinks away behind it. Two scroll curls rolled up on the near edge. |
| **Nyoibō** | Between the sections. It comes in stubby and pushes out to full width as you reach it, because extending is the only thing it does. No two are the same length or struck at the same angle. |
| **Gear 5 clouds** | Drifting behind everything. Inked outlines, not fills — at the opacity they need to sit at, a fill just disappears. |
| **Jolly Roger** | At the foot. |

Every outline is generated with a fixed seed and shaken off its ideal
curve, so no two bumps match and nothing sits on a perfect circle.

### Two things that will bite you

`<use>` clones a symbol into a shadow tree, and **a descendant selector
never reaches inside it**. `.puff .cl-body` silently does nothing;
`.cl-body` works. Custom properties inherit through, so per-instance
variation has to ride on a variable rather than an ancestor class.

The wheel runs past the right margin on purpose. Clip that on `.domain`
and the cut lands on the column edge, straight through the wheel — it has
to be clipped on `main`, which spans the viewport.

## Japanese

The small vertical labels are section names: 領域展開 domain expansion,
現在 now, 自己紹介 about me, 落書き scribble, 音楽 music. The characters
on the counter are 黒閃, black flash.

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
