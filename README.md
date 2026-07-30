# strohutt.github.io

My page. It is a light on a porch: it says whether I'm in, and what I'm
doing while I'm there.

Runs on GitHub Pages. No build step, no framework — three files and a
favicon, open them and type.

| File          | Contents                                              |
| ------------- | ----------------------------------------------------- |
| `index.html`  | The page, plus every drawn thing as inline SVG         |
| `styles.css`  | The panel system, the palette, the black flash         |
| `script.js`   | Panels arriving, the black flash, the Discord presence |
| `favicon.svg` | The wheel                                              |

## The look

A manga spread rather than a column of sections. Panels sit on black with
real gutters between them, each one cut on the skew, and the drawings are
cropped by the panel edges the way a panel crops a drawing. Exactly one
thing is allowed to break a gutter, and it does it once.

Ink, paper, and a single red — no fourth colour and no gradient anywhere.
Soft glow on black is the look every dark template already has. Shading is
a screentone dot grid, which is what shades a manga panel.

Gold exists only inside the wheel and the straw hat, because those two
objects are gold and repainting them would lose them.

## The drawn things

Traced off panels rather than invented.

| | |
| --- | --- |
| **Mahoraga's wheel** | Cropped by the right edge of the header. Hub sphere, eight spokes running through the rim, eight spheres outside it. It clicks round a step at a time rather than gliding — adaptation lands, it does not ease — and lurches a whole spoke every time a black flash hits. |
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

**`clip-path` creates a stacking context.** A copy of the panel sitting
behind on `z-index: -1` to fake a border paints *over* the panel instead.
The frame is the panel itself in paper, with an inset pseudo element
laying the ink down two pixels inside it.

**Every neighbouring lobe of a cloud has to genuinely overlap.** Where two
only touch, the outline pinches to nothing and the band reads as beads on
a wire. `cloudBar()` widens any pair that comes up short.

**Walking the underside of a lobe chain needs the lower crossing of each
pair of circles and the opposite sweep direction.** Reusing the top-edge
maths gives a zigzag with spikes hanging off it.

## Japanese

Small vertical labels: 領域展開 domain expansion, 現在 now, 音楽 music.
黒閃 on the counter is black flash.

They are stacked as individual `<span>` elements rather than with
`writing-mode: vertical-rl`, because vertical layout needs vertical
metrics that a fallback font may not have — and when it doesn't, every
glyph lands on top of the last one.

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

One pinned Spotify track. If something is actually playing, `script.js`
swaps it and the kicker changes from "stuck in my head" to "playing right
now". Behind the player is a plain link, for anyone whose browser blocks
embeds.

## Running it locally

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`. The presence panel needs internet;
without it the panel just says it can't reach Discord.
