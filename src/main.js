// SATISFACTION: boot, per-frame rendering and the main loop.
import { createGL, program, programsReady, use, drawFS, bindTarget, target, freeTarget, texture } from './gl.js';
import { PRELUDE } from './scenes/common.js';
import { buildFontAtlas, buildTextTexture } from './fonts.js';
import { Post } from './post.js';
import { TypeLayer } from './type.js';
import { buildTimeline, SOUNDTRACK } from './timeline.js';
import { SCROLLERS, SCROLLS24 } from './content.js';
import { Player } from './player.js';
import { Resolution, setupKey } from './resolution.js';
import { UI, showError } from './ui.js';
import balls from './scenes/balls.js';
import voxel from './scenes/voxel.js';
import grid from './scenes/grid.js';
import orbs from './scenes/orbs.js';
import dots from './scenes/dots.js';
import city from './scenes/city.js';
import glenz from './scenes/glenz.js';
import stars from './scenes/stars.js';
import scrolls from './scenes/scrolls.js';

// ------------------------------------------------------------------- modes --
const params = new URLSearchParams(location.search);
const STILL = params.has('t');         // render a single frame at ?t=seconds, no audio
const SILENT = params.has('silent');   // run the clock without audio

const canvas = document.getElementById('stage');
const gl = createGL(canvas, { preserve: STILL });
const post = new Post(gl);
const typeLayer = new TypeLayer();
const TL = buildTimeline();
const res = new Resolution(gl, Number(params.get('scale')) || 0);
const player = new Player({ src: params.get('music') || SOUNDTRACK, end: TL.end, silent: SILENT || STILL, onEnded: () => ui.showEnd() });
const ui = new UI({ player, TL });
ui.showProgress = params.has('progress'); // off by default: it breaks immersion (H toggles)
ui.debug = params.has('debug');

const SCENES = { balls, voxel, grid, orbs, dots, city, glenz, stars, scrolls };
let A;            // loaded assets
let energy = 0;   // audio level fed to the shaders

// ------------------------------------------------------------------ assets --
const loadImage = (src) => new Promise((ok, fail) => {
  const img = new Image();
  img.onload = () => ok(img);
  img.onerror = () => fail(new Error('Missing ' + src));
  img.src = src;
});

// Word-wrap the epilogue crawl into centred lines of `cols` characters.
function wrapCrawl(text, cols) {
  const lines = [];
  let cur = '';
  for (const w of text.trim().split(/\s+/)) {
    const next = (cur + ' ' + w).trim();
    if (next.length > cols) { lines.push(cur); cur = w; } else cur = next;
  }
  lines.push(cur);
  const centred = lines.map((l) => (' '.repeat(Math.floor((cols - l.length) / 2)) + l).padEnd(cols, ' '));
  return centred.join('') + ' '.repeat(cols * 2);
}

async function loadAssets() {
  const [fonts, title, header, mega, map] = await Promise.all([
    fetch('assets/fonts.json').then((r) => r.json()),
    loadImage('assets/title.png'), loadImage('assets/header.png'), loadImage('assets/mega.png'), loadImage('assets/map.png'),
  ]);
  try {
    const ff = new FontFace('ZX Satisfaction', 'url(assets/satisfaction.ttf)');
    await ff.load();
    document.fonts.add(ff);
  } catch { /* fall back to monospace */ }

  const rows = {};
  for (const [k, v] of Object.entries(SCROLLERS)) rows[k] = k === 'crawl' ? wrapCrawl(v, 20) : ' '.repeat(7) + v;
  SCROLLS24.forEach((s, i) => { rows['scroll' + i] = s; });   // 24 consecutive rows
  TL.bigWords.forEach((w, i) => { rows['big' + i] = w; });

  const imgs = { title, header, mega, map };
  const tex = {};
  for (const [k, im] of Object.entries(imgs)) tex[k] = texture(gl, im);
  return { atlas: buildFontAtlas(gl, fonts), text: buildTextTexture(gl, rows), imgs, tex };
}

function initScenes() {
  for (const s of Object.values(SCENES)) {
    if (s.custom) s.init(gl, PRELUDE);
    else s.prog = program(gl, PRELUDE + s.frag, undefined, s.name);
  }
}

// ----------------------------------------------------------------- targets --
// Scene targets are kept for a few recent sizes (each setup may run at its own scale).
const sceneTargets = new Map();
function sceneTarget(w, h) {
  const key = w + 'x' + h;
  let rt = sceneTargets.get(key);
  if (rt) sceneTargets.delete(key);
  else {
    rt = target(gl, w, h);
    if (sceneTargets.size >= 4) {
      const [oldKey, old] = sceneTargets.entries().next().value;
      freeTarget(gl, old);
      sceneTargets.delete(oldKey);
    }
  }
  sceneTargets.set(key, rt);
  post.resize(w, h);
  return rt;
}

let sceneRT = null;
// Size the canvas, the scene target for this setup and the type layer.
function layout(shot) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(2, Math.round(canvas.clientWidth * dpr));
  const h = Math.max(2, Math.round(canvas.clientHeight * dpr));
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  const s = res.scale(setupKey(shot), w, h);
  const sw = Math.max(2, Math.round(w * s)), sh = Math.max(2, Math.round(h * s));
  if (!sceneRT || sceneRT.w !== sw || sceneRT.h !== sh) sceneRT = sceneTarget(sw, sh);
  // captions at up to ~1.6 MP
  const k = Math.min(1, Math.sqrt(1.6e6 / (w * h)));
  const ow = Math.round(w * k), oh = Math.round(h * k);
  if (typeLayer.W !== ow || typeLayer.H !== oh) typeLayer.resize(ow, oh);
}

// ------------------------------------------------------------------- frame --
function findShot(t) {
  const s = TL.shots;
  let lo = 0, hi = s.length - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (s[m].start <= t) lo = m; else hi = m - 1; }
  return s[lo];
}

// Shot parameters may be functions of (shot progress, frame info).
const val = (v, p, f) => (typeof v === 'function' ? v(p, f) : v);
const ZERO4 = [0, 0, 0, 0];
const NO_TEXT = { row: 0, len: 1 };   // a missing text key must never stop the show

let lastShot = null, shotFrame = 0, lastFrameTime = -1;

// Render the scene for time t into the scene target. Returns the target the
// post pass should read (feedback scenes render into their own).
function renderScene(t, shot) {
  const ch = shot.chapter;
  const beat = (t - ch.start) / ch.beat;
  const st = t - shot.start;
  const sp = Math.min(1, Math.max(0, st / (shot.end - shot.start)));
  if (shot !== lastShot) { shotFrame = 0; lastShot = shot; } else shotFrame++;
  const jumped = Math.abs(t - lastFrameTime) > 0.25;
  lastFrameTime = t;

  const f = { time: t, shot, shotP: sp, shotFrame, jumped };
  const a = val(shot.a ?? ZERO4, sp, f).slice();
  const b = val(shot.b ?? ZERO4, sp, f).slice();
  f.a = a;
  const tr = (shot.text && A.text.rows[shot.text]) || NO_TEXT;
  if (shot.big) { const br = A.text.rows[shot.big]; if (br) { b[1] = br.row; b[2] = br.len; } }
  const fb = beat - Math.floor(beat);
  const u = {
    uRes: [sceneRT.w, sceneRT.h], uTime: t, uT: st, uP: sp, uBeat: beat, uBeatLen: ch.beat,
    uPulse: Math.exp(-fb * ch.beat * 7), uBarPulse: Math.exp(-(beat % 4) * ch.beat * 3),
    uVar: shot.var ?? 0, uA: a, uB: b, uEnergy: energy, uSeed: shot.start % 17,
    uRow: tr.row, uLen: tr.len, uRow2: 0, uLen2: 1,
    uTextT: Math.max(0, (beat - shot.textStartBeat) * ch.beat),
    uFont: { tex: A.atlas.tex, unit: 0 }, uText: { tex: A.text.tex, unit: 1 },
  };

  const scene = SCENES[shot.scene];
  if (scene.custom) return scene.render(gl, f, u, sceneRT, { tex: A.tex }) || sceneRT;
  if (shot.scene === 'voxel') {
    u.uImg = { tex: A.tex[shot.img], unit: 4 };
    u.uImgSize = [A.imgs[shot.img].width, A.imgs[shot.img].height];
  } else if (shot.scene === 'scrolls') {
    u.uRow = A.text.rows.scroll0.row;
    u.uLens = SCROLLS24.map((s) => s.length);
  }
  bindTarget(gl, sceneRT);
  use(gl, scene.prog, u);
  drawFS(gl);
  return sceneRT;
}

function drawOverlay(t) {
  typeLayer.begin();
  for (const c of TL.cues) {
    if (t < c.start || t >= c.end) continue;
    const age = t - c.start, dur = c.end - c.start;
    if (c.type === 'portrait') typeLayer.portrait(c, age, dur, A.imgs.map);
    else typeLayer[c.type](c, age, dur);
  }
  if (ui.showProgress && !STILL) typeLayer.progress(TL.chapters, t, TL.end);
  if (typeLayer.dirty) post.uploadOverlay(typeLayer.canvas);
}

// Cut effects. No per-beat camera/frame motion: the beat drives light and
// colour, cuts drive impact.
function cutEffects(t, shot) {
  const st = t - shot.start;
  const sp = Math.min(1, Math.max(0, st / (shot.end - shot.start)));
  const fx = { time: t, seed: shot.start, flash: 0, punch: 0, glitch: 0, zx: 0, ca: 0, fade: 0 };
  switch (shot.cut) {
    case 'flash': fx.flash = 0.8 * Math.exp(-st * 10); fx.punch += 0.4 * Math.exp(-st * 8); break;
    case 'punch': fx.punch += Math.exp(-st * 9) * 0.6; fx.ca += 0.6 * Math.exp(-st * 8); break;
    case 'glitch': fx.glitch = st < 0.3 ? 1 - st / 0.3 : 0; break;
    case 'zx': fx.zx = st < shot.chapter.beat * 0.5 ? 1 : 0; break;
    case 'soft': fx.fade = Math.max(0, 1 - st / 0.8); break; // gentle fade up from black
  }
  if (shot.fx) for (const k in shot.fx) fx[k] = Math.max(fx[k] ?? 0, val(shot.fx[k], sp, { time: t, shot }));
  fx.fade = Math.max(fx.fade, 1 - Math.min(1, t / 0.15));  // fade in at the very start
  return fx;
}

function render(t) {
  const shot = findShot(t);
  layout(shot);
  const src = renderScene(t, shot);
  drawOverlay(t);
  post.run(src, cutEffects(t, shot), typeLayer.dirty);
  return shot;
}

// --------------------------------------------------------------- calibrate --
// Draw every scene setup once offscreen while loading. This finishes shader
// compilation (drivers often defer it to the first draw, which would stall the
// first cut to each scene) and times each setup to pick its resolution.
function warmUp() {
  const px = new Uint8Array(4);
  const sync = () => { bindTarget(gl, null); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
  const setups = new Map();
  for (const s of TL.shots) if (!setups.has(setupKey(s))) setups.set(setupKey(s), s);

  const time = (fn, n) => { fn(); sync(); const t0 = performance.now(); for (let i = 0; i < n; i++) fn(); sync(); return (performance.now() - t0) / n; };
  const mid = (s) => (s.start + s.end) / 2;
  const first = TL.shots[0];
  layout(first);
  const pixels = sceneRT.w * sceneRT.h;
  // post at this size, faded to black so nothing shows behind the intro
  const blackFx = { ...cutEffects(0, first), fade: 1 };
  const postMs = time(() => post.run(sceneRT, blackFx, false), 2);

  const measure = (s) => time(() => { lastShot = null; renderScene(mid(s), s); }, res.adaptive ? 2 : 0);
  if (res.adaptive) res.calibrate(setups, measure, pixels, postMs);
  else for (const s of setups.values()) measure(s);
  lastShot = null; lastFrameTime = -1;
}

// ------------------------------------------------------------------- loop --
const frameTimes = [];
let lastPerf = performance.now();

function debugLine(t, shot) {
  const fps = 1000 / (frameTimes.reduce((x, y) => x + y, 0) / Math.max(1, frameTimes.length));
  const ch = shot.chapter, beat = (t - ch.start) / ch.beat;
  const gpu = res.timer?.ms != null ? `  gpu ${res.timer.ms.toFixed(1)} ms` : '';
  return `t ${t.toFixed(2)}  beat ${beat.toFixed(2)}  shot ${TL.shots.indexOf(shot)} ${setupKey(shot)}  ${fps.toFixed(0)} fps${gpu}  scale ${(sceneRT.w / canvas.width).toFixed(2)} (${sceneRT.w}x${sceneRT.h})`;
}

function loop() {
  const p = performance.now(), dt = p - lastPerf;
  lastPerf = p;
  frameTimes.push(dt);
  if (frameTimes.length > 40) frameTimes.shift();

  player.sampleEnergy();
  energy = player.energy;
  const t = player.now();
  res.update(p, dt, setupKey(findShot(t)), player.playing);
  res.frameBegin();
  const shot = render(t);
  res.frameEnd();
  ui.update(t, shot, () => debugLine(t, shot));
  requestAnimationFrame(loop);
}

// -------------------------------------------------------------------- boot --
(async function boot() {
  try {
    A = await loadAssets();
    initScenes();
    await programsReady(gl, { wait: !STILL }); // stills compile synchronously (headless virtual time)
    warmUp();

    if (STILL) {
      document.body.classList.add('still');
      document.getElementById('intro').hidden = true;
      const t = Number(params.get('t')) || 0;
      render(Math.max(0, t - 1 / 60)); // twice, so feedback scenes settle
      render(t);
      document.title = 'READY';
      window.__ready = true;
      return;
    }

    ui.bind();
    requestAnimationFrame(loop);
    ui.setLoading('LOADING MUSIC');
    await player.ready();
    ui.enableStart();
    if (SILENT && params.has('autoplay')) { document.getElementById('intro').hidden = true; ui.play(); }
  } catch (e) {
    console.error(e);
    showError(e.message);
    document.title = 'ERROR';
    window.__error = e.message;
  }
})();
