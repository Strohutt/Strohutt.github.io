# strohutt.github.io

My page. Ink on paper, dark by default.

Runs on GitHub Pages. No build step, no framework — open the files and type.

## What lives where

| File           | Contents                                                          |
| -------------- | ----------------------------------------------------------------- |
| `index.html`   | The page, plus every drawing as SVG in the `<svg class="sprite">` at the top |
| `styles.css`   | Colours, layout, the drawn rules                                  |
| `script.js`    | Light switch, scroll reveals, the desk cards, the Discord presence |
| `projects.js`  | The list behind `on my desk`. The only file to edit for that      |
| `favicon.svg`  | Straw hat for the tab                                             |

## The drawings

Everything drawn is an SVG path — hat, wordmark, cassette, record, manga
volume, controller, terminal, tape, icons — placed by hand. No icon
library, which is why nothing sits perfectly straight.

Three of them were too fiddly to place by hand and got generated once
from a fixed seed instead: the focus lines behind the hat, the burst
behind `BELLO!` and the ink splatter in the footer. The generator is not
in the repo — the paths are baked into the sprite, so there is nothing to
run. The seed is fixed so the wobble is uneven but always the same.

The rules under the headings and links aren't `border`s. They're a wobbly
SVG line used as a `mask` over a block of colour, so they pick up the ink
colour of whichever mode is on without needing a second copy.

To add a drawing: drop it in the sprite as `<symbol id="…">` and place it
with `<use href="#…">`. Don't hard-code the colour inside the symbol —
`stroke` is inherited from outside, otherwise it stays wrong in one of the
two modes.

## On my desk

The cards come out of `projects.js`. Each entry needs a `name`; `stack`
and `note` are optional, and a card with no note just shows the name and
the stack, which is deliberate — nothing gets invented to fill the gap.
Empty the list and the whole section disappears.

There are no links on the cards on purpose: none of that is public, so
each one gets a drawn `private` stamp instead.

## Why the objects look solid

The hat, the cassette, the manga volume, the controller and the terminal
are not outlines — they are lit objects. Each one is a cream face with
dark ink over it, shaded away from a light in the upper left: halftone
dots for the turn, `hatch` over that, `cross` at the darkest edge, then a
heavier nib along the shadow contour and a flick of highlight where it
catches. There is a cast shadow under each of them.

That is why their colours are fixed instead of following the mode. The
face is always light, so the ink and the hatching have to stay dark or
the shading would read inside out. The `--obj-*` variables at the top of
`styles.css` hold them.

`vector-effect` does not inherit in SVG, so `non-scaling-stroke` sits on
the individual paths that need it (the stretched frames), not on the
parent `<svg>`.

## Depth

The cover is stacked layers, and they move by different amounts: the
pointer tilts them and scrolling drifts them apart. `script.js` writes
`--px`, `--py` and `--drift` onto `.hero` once per frame and each layer
multiplies them differently — the focus lines shift about a third as far
as the hat. Pointer tracking is fine-pointer only; there is nothing to
follow on a touchscreen.

The project cards are three drawn sheets offset behind each other, so a
card has thickness. Hovering lifts the top one off the stack.

## Scroll and poke

Sections fade up once as they come into view, and the panel border wipes
on like it is being drawn. The hat in the header wobbles and throws
sparkles when you poke it. All of it is skipped for anyone browsing with
`prefers-reduced-motion`.

## Discord presence

`script.js` hangs off [Lanyard](https://github.com/Phineas/lanyard) and
gets changes pushed down a WebSocket instead of asking every few seconds.
For that to work you have to be in the [Lanyard
Discord](https://discord.gg/lanyard).

It shows the custom status, then every activity Discord reports — however
many are open — each with its own elapsed timer counting up.

Different Discord account? Change the `DISCORD_ID` constant at the top of
`script.js` and the two profile links in `index.html`.

If Lanyard can't be reached it says so and the rest of the page carries on.

## Music

The `in my ears` card holds one fixed Spotify track. If something is
actually playing, `script.js` swaps it for that and the heading changes
from "stuck in my head" to "playing right now". Behind the player sits a
plain link, for anyone whose browser blocks embeds.

## Running it locally

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`. The presence panel needs internet;
without it the panel just says it can't reach Discord.
