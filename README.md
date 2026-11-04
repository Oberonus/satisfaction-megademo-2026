# SATISFACTION: a tribute to Code Busters

An unofficial fan homage to *Satisfaction*, the 1993/94 ZX Spectrum megademo by **Code Busters**, imagined as if it were made today. It is a seven-and-a-half-minute real-time WebGL2 show set to new covers of the original music.

**▶ [Watch it live in your browser](https://oberonus.github.io/satisfaction-megademo-2026)** · **[Video on YouTube](https://www.youtube.com/watch?v=Bv_sd428ZlM)**

To see the 1994 original as it was, there is also a JavaScript port of the ZX Spectrum demo: [run it in your browser](https://oberonus.github.io/satisfaction-megademo) · [source](https://github.com/Oberonus/satisfaction-megademo).

This is not a remake and not the authors' work. The original artwork, fonts, map bitmap, portraits and music themes belong to their authors. Everything else (visuals, texts, soundtrack covers) is new.

## Watch

Open the [site](https://oberonus.github.io/satisfaction-megademo-2026), turn the sound on and press **PLAY**. It needs a browser with WebGL2 (current Chrome, Safari, Firefox or Edge). The picture fills any window from upright phone (9:16) to ultrawide (21:9). Outside that range it keeps the limit shape and centres it on black.

| Key | Action |
|---|---|
| Space | play / pause |
| ← → | previous / next part |
| `,` `.` | seek ±5 s |
| F | fullscreen |
| M | mute |
| H | chapter progress bar |
| D | debug overlay (fps, render scale) |

## Run locally

```sh
npm start        # http://localhost:8090  (Node 18+, no dependencies)
```

Any other static server works too if it supports HTTP Range requests (the music needs them to seek). Opening `index.html` straight from disk won't work.

## How it fits together

- `src/timeline.js` is the edit: seven chapters, each with its tempo measured from the soundtrack, and shots and captions written in beats.
- `src/content.js` holds all the texts.
- `src/scenes/` has one fragment shader per visual world (balls, voxel, grid, orbs, dots, city, glenz, stars, scrolls).
- `src/post.js` handles bloom, cut effects and the ZX attribute-clash filter. `src/type.js` draws the captions.
- `src/main.js` handles boot and the frame loop. `src/player.js` is the audio clock, `src/resolution.js` the adaptive render scale, `src/ui.js` the controls.

Each scene setup is timed once during loading and gets its own render resolution, so slower GPUs stay smooth. The frame loop keeps adjusting from there.

To swap the music, try it with `?music=assets/other.mp3`, then update `start`/`beat` for each chapter, plus `OUTRO` and `END`, in `src/timeline.js`.

## Debugging

- `?debug` (or the D key) shows time, beat, shot, fps, GPU time and render scale.
- `?t=123.4` renders a single still frame at that time, without audio.
- `?scale=0.5` fixes the render scale instead of adapting it.

## Deploy

Every push to `master` publishes to GitHub Pages through `.github/workflows/pages.yml`. Only `index.html`, `style.css`, `src/` and `assets/` are published. In the repository settings, set **Pages → Source** to **GitHub Actions** once.

## Credits

The original *Satisfaction* by **Code Busters**, 1993/94.
Original ZX code: **RST7**, **Max Iwamoto**. Graphics: **Max Iwamoto**. Music: **Klav**, **RST7**, **Andrei Kolesnik**.
The multicolor picture comes from Konami's *Nemesis* (MSX).

All original fonts, artwork and music belong to their authors. This is a non-commercial fan tribute, not made by or affiliated with them, made with gratitude for what they gave the ZX Spectrum scene.
