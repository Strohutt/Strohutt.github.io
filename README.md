# strohutt.github.io

My page. Ink on paper, dark by default.

Runs on GitHub Pages. No build step, no framework — open the files and type.

## What lives where

| File          | Contents                                                          |
| ------------- | ----------------------------------------------------------------- |
| `index.html`  | The page, plus every drawing as SVG in the `<svg class="sprite">` at the top |
| `styles.css`  | Colours, layout, the drawn rules                                  |
| `script.js`   | Light switch and the Discord presence                              |
| `favicon.svg` | Straw hat for the tab                                             |

## The drawings

Everything drawn is an SVG path placed by hand — hat, wordmark, cassette,
record, manga volume, controller, terminal, tape, icons. No icon library
and no generator, which is why nothing sits perfectly straight.

The rules under the headings and links aren't `border`s. They're a wobbly
SVG line used as a `mask` over a block of colour, so they pick up the ink
colour of whichever mode is on without needing a second copy.

To add a drawing: drop it in the sprite as `<symbol id="…">` and place it
with `<use href="#…">`. Don't hard-code the colour inside the symbol —
`stroke` is inherited from outside, otherwise it stays wrong in one of the
two modes.

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
