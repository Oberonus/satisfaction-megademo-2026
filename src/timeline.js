// SATISFACTION 2026 — the edit.
//
// Every chapter is aligned to the Suno megamix (assets/soundtrack.mp3, 7:33).
// Each part is one continuous run of its song, so a chapter has one steady
// tempo: `start` is the chapter's first downbeat (s), `beat` is seconds per
// beat, both measured from the audio (beat tracking + kick-drum phase).
// Shots and cues are written in beats relative to their chapter.
// Glenz runs at 136 BPM and is counted in half-time (one "beat" = 2 kicks).
import { GREETINGS, CREDITS, PEOPLE } from './content.js';

export const SOUNDTRACK = 'assets/soundtrack.mp3';

export const CHAPTERS = [
  { id: 'balls', title: 'BALLMANIA', start: 0.187, beat: 0.49066 },
  { id: 'greetings', title: 'GREETINGS', start: 44.526, beat: 0.48651 },
  { id: 'multicolor', title: 'MULTICOLOR', start: 91.227, beat: 0.48773 },
  { id: 'ballmania', title: 'BALLMANIA II', start: 138.196, beat: 0.51225 },
  { id: 'map', title: 'THE MAP', start: 211.383, beat: 0.4903 },
  { id: 'glenz', title: 'GLENZ', start: 284.751, beat: 0.89518 },
  { id: 'epilogue', title: 'EPILOGUE', start: 359.038, beat: 0.48819 },
];
// The animation ends where the song's outro begins; the end screen stays
// up while the music plays out.
export const OUTRO = 433.243;
export const END = 453.55;

CHAPTERS.forEach((c, i) => {
  c.end = i + 1 < CHAPTERS.length ? CHAPTERS[i + 1].start : END;
  c.beats = Math.round((c.end - c.start) / c.beat);
  c.index = i;
});

// ---------------------------------------------------------------- looks ----
// Reusable scene setups. a/b may be functions of (shotProgress, frame).
const look = {
  logo: (o = {}) => ['voxel', { img: 'title', var: 0, a: [0, 0, 7, 0], b: [1, 0, 0, 0], ...o }],
  logoBuild: (o = {}) => ['voxel', { img: 'title', var: 0, a: (p) => [0, Math.pow(1 - Math.min(1, p * 1.6), 3) * 1.4, 7, 0], b: [1, 0, 0, 0], ...o }],
  header: (o = {}) => ['voxel', { img: 'header', var: 3, a: [0, 0, 5, 2], b: [2, 0, 0, 0], ...o }],
  balls: (cam, style, wave, o = {}) => ['balls', { var: cam, a: [style, wave, 0, 0], b: [0, 1, 1, 0], ...o }],
  meta: (cam, o = {}) => ['balls', { var: cam, a: [0, 1, 0.9, 0], b: [0.15, 1, 1, 0], ...o }],
  grid: (v, hueA, o = {}) => ['grid', { var: v, a: [hueA, 1, 0.3, 1], ...o }],
  megaFlat: (o = {}) => ['voxel', { img: 'mega', var: 5, a: [1, 0, 0, 0], b: [2, 0, 0, 0], ...o }],
  mega3d: (cam, o = {}) => ['voxel', { img: 'mega', var: cam, a: [1, 0, 12, 0], b: [2, 0, 1, 0], ...o }],
  orbs: (path, cam, o = {}) => ['orbs', { var: path, a: [1.4, 0.32, 0.92, 0], b: [0.02, cam, 0, 0], ...o }],
  dots: (pa, pb, o = {}) => ['dots', { var: pa, a: (p) => [p, 0.35, 1, 0], b: [pb, 0, 0, 0.5], ...o }],
  city: (cam, o = {}) => ['city', { var: cam, a: [0.78, 0, 1, 0], ...o }],
  glenz: (shape, o = {}) => ['glenz', { var: shape, a: [0, 0, 0, 1.2], b: [0.52, 0.86, 0.6, 5], ...o }],
  stars: (v, o = {}) => ['stars', { var: v, a: [0.3, 0, 20, 0.12], ...o }],
  scrolls: (o = {}) => ['scrolls', { a: [1, 0.5, 1, 0], text: 'scroll0', ...o }],
};

// ------------------------------------------------------------ chapters -----
// shots: [beat, look, overrides]   cues: {b, d, type, ...}
const S = (at, [scene, opts], extra = {}) => ({ ...opts, ...extra, at, scene });

function sequence(b0, step, items, make) { return items.map((it, i) => make(b0 + i * step, it, i)); }

const EDIT = {};

// 01 — BALLMANIA ---------------------------------------------------------------
EDIT.balls = {
  shots: [
    S(0, look.logoBuild(), { cut: 'zx' }),
    S(4, look.balls(0, 0, 0), { cut: 'flash' }),
    S(8, look.balls(3, 1, 0), { cut: 'punch' }),
    S(12, look.balls(1, 2, 3), { cut: 'zx', fx: { zx: (p) => (p < 0.5 ? 1 : 0) } }),
    S(16, look.balls(0, 0, 0, { a: [0, 0, 0, 1], text: 'balls' }), { cut: 'flash' }),
    S(24, look.balls(2, 1, 1, { a: [1, 1, 0, 1], text: 'balls' }), { cut: 'glitch' }),
    S(32, look.scrolls(), { cut: 'zx' }),
    S(40, look.balls(4, 0, 3), { cut: 'flash' }),
    S(44, look.meta(3), { cut: 'glitch' }),
    S(48, look.balls(0, 1, 2, { a: [1, 2, 0, 1], text: 'balls2', b: [0.35, 1, 2, 0] }), { cut: 'flash' }),
    S(56, look.balls(2, 0, 2, { a: [0, 2, 0, 1], text: 'balls2' }), { cut: 'punch' }),
    ...sequence(64, 2, [
      look.balls(1, 1, 0), look.balls(3, 0, 1), look.balls(0, 2, 3), look.meta(2),
      look.balls(4, 1, 0), look.meta(3, { b: [0.6, 1, 1, 0] }), look.balls(1, 0, 2), look.balls(2, 1, 3),
    ], (b, l, i) => S(b, l, { cut: i % 2 ? 'glitch' : 'punch' })),
    S(80, look.balls(0, 0, 0, { b: [0.5, 1, 1, 0] }), { cut: 'flash' }),
    S(84, look.meta(3, { b: [0.8, 1, 1, 0] }), { cut: 'glitch' }),
    S(88, look.balls(1, 1, 0), { cut: 'punch' }),
    S(89, look.logo({ var: 3 }), { cut: 'zx' }),
  ],
  cues: [
    ...sequence(4, 1, ['Z80.', '128K.', 'ONE AY.', 'GO!'], (b, t, i) => ({ b, d: 1, type: 'slam', text: t, rot: [-3, 2, -2, 3][i] })),
    { b: 8, d: 4, type: 'caption', text: 'THAT WAS THE WHOLE TOOLBOX IN 1994' },
    { b: 32, d: 4, type: 'caption', text: 'MOST DEMOS WERE HAPPY WITH ONE SCROLLER.' },
    { b: 36, d: 2, type: 'slam', text: 'RST7 MADE 24.' },
    { b: 64, d: 4, type: 'caption', text: 'IN 1994 THE AMIGA WAS CALLING.' },
    { b: 68, d: 2, type: 'caption', text: 'BUT FIRST:' },
    { b: 70, d: 2, type: 'slam', text: 'ONE MORE', shadow: '#00e5ff' },
    { b: 72, d: 2, type: 'caption', text: 'FOR THE' },
    { b: 74, d: 2, type: 'slam', text: 'SPECCY', shadow: '#ff5a00' },
    { b: 84, d: 4, type: 'caption', text: '32 YEARS LATER, STILL HARD TO BEAT.' },
    { b: 88, d: 2.4, type: 'slam', text: 'RESPECT.', rot: -4 },
  ],
};

// 02 — GREETINGS ---------------------------------------------------------------
const allNames = [];
GREETINGS.slice(1).forEach((g) => g.names.forEach((n) => allNames.push({ n, where: g.where })));
const gridCycle = [0, 1, 2, 3];
EDIT.greetings = {
  shots: [
    S(0, look.grid(0, 0.55), { cut: 'flash' }),
    S(8, look.grid(4, 0.8, { text: 'greet' }), { cut: 'punch' }),
    S(16, look.grid(1, 0.9), { cut: 'flash' }),
    S(24, look.grid(3, 0.6), { cut: 'punch' }),
    // rapid-fire names: background changes every bar
    ...sequence(32, 4, Array.from({ length: 12 }, (_, i) => i), (b, i) => S(b, look.grid(gridCycle[i % 4], (0.1 + i * 0.13) % 1, { a: [(0.1 + i * 0.13) % 1, 1.5, 0.5, 1 + (i % 3) * 0.5] }), { cut: i % 3 === 2 ? 'zx' : 'punch' })),
    S(80, look.logo({ var: 3, b: [2, 0, 1, 0] }), { cut: 'flash' }),
    S(84, look.grid(2, 0.15), { cut: 'punch' }),
    S(88, look.grid(0, 0.95), { cut: 'zx', fx: { zx: (p) => (p < 0.25 ? 1 : 0) } }),
    S(92, look.grid(1, 0.5), { cut: 'flash' }),
  ],
  cues: [
    { b: 0.5, d: 7.5, type: 'caption', text: 'BACK THEN, A DEMO GREETED THE WHOLE SCENE' },
    { b: 16, d: 4, type: 'caption', text: 'FIRST, THE CREW:' },
    ...sequence(20, 2, GREETINGS[0].names, (b, n, i) => ({ b, d: 2, type: 'name', text: n, sub: 'CODE BUSTERS', layout: i })),
    { b: 30, d: 2, type: 'slam', text: 'CODE\nBUSTERS' },
    ...allNames.slice(0, 48).map((x, i) => ({ b: 32 + i, d: 1, type: 'name', text: x.n, sub: x.where, layout: i, shadow: ['#00e5ff', '#ff2bd6', '#ffe600', '#7cff00'][i % 4] })),
    { b: 80, d: 4, type: 'caption', text: 'AND OF COURSE: SIR CLIVE SINCLAIR,' },
    { b: 84, d: 4, type: 'caption', text: 'WHO STARTED ALL OF THIS' },
    { b: 88, d: 4, type: 'slam', text: '<ZX-SPECTRUM>', shadow: '#ff0000' },
    { b: 92, d: 4, type: 'caption', text: 'TODAY WE GREET CODE BUSTERS' },
  ],
};

// 03 — MULTICOLOR --------------------------------------------------------------
EDIT.multicolor = {
  shots: [
    S(0, look.megaFlat({ b: [2, 0, 0, 0] }), { cut: 'flash' }),
    S(8, look.mega3d(0), { cut: 'punch' }),
    S(16, look.mega3d(1, { a: [1, 0, 18, 3] }), { cut: 'flash' }),
    S(24, look.mega3d(2, { a: [1, 0, 14, 5] }), { cut: 'glitch' }),
    S(32, look.mega3d(3, { a: (p) => [1, p * p * 0.6, 12, 2] }), { cut: 'punch' }),
    S(44, look.megaFlat({ a: [1, 1, 0, 0], b: [2, 1, 1, 0] }), { cut: 'glitch' }),
    S(48, look.mega3d(3, { a: (p) => [1, Math.pow(1 - p, 2) * 0.6, 12, 2] }), { cut: 'flash' }),
    S(56, look.mega3d(0, { a: [1, 0, 20, 6] }), { cut: 'zx', fx: { zx: (p) => (p < 0.15 ? 1 : 0) } }),
    S(64, look.megaFlat({ b: [2, 0, 1, 0] }), { cut: 'flash' }),
    S(72, look.mega3d(1, { a: [1, 0, 16, 2] }), { cut: 'punch' }),
    S(80, look.mega3d(2, { a: (p) => [1, p * p * 0.6, 14, 5] }), { cut: 'glitch' }),
    S(88, look.mega3d(3, { a: (p) => [1, Math.pow(1 - p, 2) * 0.6, 12, 2] }), { cut: 'flash' }),
    ...sequence(92, 1, [look.megaFlat({ b: [2, 0, 1, 0] }), look.mega3d(1), look.megaFlat({ a: [1, 1, 0, 0], b: [1, 0, 1, 0] }), look.mega3d(3, { a: [1, 0.2, 16, 4] })], (b, l, i) => S(b, l, { cut: i % 2 ? 'glitch' : 'zx' })),
  ],
  cues: [
    { b: 0, d: 2, type: 'slam', text: 'YEEEA!', rot: -3 },
    { b: 2, d: 4, type: 'slam', text: 'MULTICOLOR\nON A SPECCY', shadow: '#00e5ff' },
    { b: 16, d: 8, type: 'caption', text: 'MULTICOLOR ON A SPECCY WAS A DARE. DARE ACCEPTED.' },
    { b: 32, d: 6, type: 'caption', text: 'THE PICTURE CAME FROM AN MSX CLASSIC' },
    { b: 38, d: 6, type: 'slam', text: "'NEMESIS'\nKONAMI 1986", shadow: '#ffe600' },
    { b: 48, d: 8, type: 'caption', text: 'MADE WITH REAL LOVE FOR 8-BIT. IT SHOWS.' },
    { b: 64, d: 6, type: 'caption', text: 'THE SPECCY ALLOWED TWO COLOURS PER 8×8 CELL.' },
    { b: 70, d: 4, type: 'slam', text: 'NOBODY TOLD\nCODE BUSTERS.', rot: -3, shadow: '#ff2bd6' },
    { b: 80, d: 8, type: 'caption', text: 'IN 1994, GOING VIRAL MEANT A DISK PASSED FROM HAND TO HAND.' },
  ],
};

// 04 — BALLMANIA II + WOW -----------------------------------------------------
const bigWords = ['WOOOW', 'RST7', 'MAX', 'KLAV', 'Z80', '1994', 'STILL', 'WOW'];
EDIT.ballmania = {
  shots: [
    S(0, look.orbs(0, 0, { a: [1.4, 0.32, 0.92, 1], text: 'bm2' }), { cut: 'flash' }),
    S(8, look.orbs(0, 1, { a: [1.4, 0.32, 0.92, 1], text: 'bm2' }), { cut: 'punch' }),
    S(16, look.orbs(1, 0, { a: [1.8, 0.25, 0.93, 1], text: 'bm2', b: [0.9, 0, 0, 0] }), { cut: 'flash' }),
    S(24, look.orbs(1, 1, { a: [1.8, 0.25, 0.93, 1], text: 'bm2', b: [0.9, 1, 0, 0] }), { cut: 'glitch' }),
    S(32, look.dots(0, 1, { text: 'wow' }), { cut: 'flash' }),
    ...sequence(40, 2, bigWords, (b, w, i) => S(b, look.dots(i % 2 ? 2 : 1, i % 2 ? 3 : 0, { text: 'wow', a: (p) => [p, 0.4, 1, 1], b: [i % 2 ? 3 : 0, 0, 0, 0.5 + i * 0.05], big: 'big' + i }), { cut: i % 2 ? 'glitch' : 'punch' })),
    S(56, look.dots(3, 1, { text: 'wow' }), { cut: 'flash' }),
    S(64, look.orbs(2, 1, { a: [1.2, 0.3, 0.95, 0], b: [0.55, 1, 0, 0] }), { cut: 'flash' }),
    S(72, look.orbs(3, 2, { a: [1.6, 0.4, 0.95, 0], b: [0.75, 2, 0, 0] }), { cut: 'punch' }),
    ...sequence(80, 4, [0.0, 0.3, 0.6, 0.85], (b, h, i) => S(b, look.orbs(4, i % 2, { a: [1.4, 0.3, 0.9, 0], b: [h, i % 2, 0, 0] }), { cut: i % 2 ? 'glitch' : 'punch' })),
    S(96, look.orbs(0, 1, { a: [1.6, 0.3, 0.94, 1], text: 'bm2b', b: [0.1, 1, 0, 0] }), { cut: 'flash' }),
    S(100, look.dots(1, 0, { text: 'wow' }), { cut: 'glitch' }),
    S(104, look.orbs(2, 0, { a: [1.4, 0.3, 0.94, 0], b: [0.6, 0, 0, 0] }), { cut: 'punch' }),
    S(108, look.dots(0, 2, { text: 'wow', a: (p) => [p, 0.5, 1.2, 0] }), { cut: 'glitch' }),
    S(112, look.orbs(1, 1, { a: [2.0, 0.22, 0.95, 1], text: 'bm2c', b: [0.95, 1, 0, 0] }), { cut: 'flash' }),
    S(120, look.dots(3, 1, { text: 'wow' }), { cut: 'flash' }),
    S(128, look.orbs(1, 0, { a: [1.8, 0.25, 0.93, 0], b: [0.3, 0, 0, 0] }), { cut: 'punch' }),
    ...sequence(135, 1, [look.orbs(3, 2), look.dots(1, 3, { text: 'wow' }), look.orbs(2, 1), look.dots(2, 0, { text: 'wow' }), look.orbs(4, 0), look.dots(0, 1, { text: 'wow' }), look.orbs(0, 1), look.orbs(4, 2)],
      (b, l, i) => S(b, l, { cut: ['punch', 'glitch', 'zx', 'glitch'][i % 4] })),
  ],
  cues: [
    { b: 0, d: 2, type: 'slam', text: 'EIGHT\nBALLS.' },
    { b: 2, d: 4, type: 'slam', text: 'NO\nGRAVITY.', shadow: '#ffb000' },
    { b: 32, d: 2, type: 'slam', text: 'WOOOW!', shadow: '#ff2bd6' },
    { b: 56, d: 8, type: 'caption', text: 'AUGUST 1992: THREE MSX FANS FORM CODE BUSTERS' },
    { b: 64, d: 8, type: 'caption', text: 'SUMMER 1993: WORK ON SATISFACTION BEGINS' },
    { b: 80, d: 8, type: 'caption', text: 'SEPTEMBER 1993: AN AMIGA 600 ARRIVES. EVERYTHING STOPS.' },
    { b: 88, d: 8, type: 'caption', text: 'MARCH 1994: BACK TO THE SPECCY. PHEW.' },
    { b: 112, d: 8, type: 'caption', text: 'A DEMO MADE PURELY TO BE ENJOYED' },
    { b: 120, d: 4, type: 'slam', text: 'STILL\nENJOYING\nIT.', shadow: '#00e5ff' },
    { b: 128, d: 7, type: 'caption', text: 'EVERY FRAME COUNTED IN Z80 T-STATES. BY HAND.' },
  ],
};

// 05 — THE MAP ------------------------------------------------------------------
EDIT.map = {
  shots: [
    S(0, look.city(3, { a: (p) => [0.78, 0, p * 1.2, 0] }), { cut: 'flash' }),
    S(24, look.city(2, { a: [0.12, 2, 1, 0] }), { cut: 'punch' }),
    S(48, look.city(2, { a: [0.5, 1, 1, 0] }), { cut: 'punch' }),
    S(72, look.city(2, { a: [0.85, 0, 1, 0] }), { cut: 'punch' }),
    S(96, look.city(1, { a: [0.7, 3, 1, 1], text: 'map' }), { cut: 'flash' }),
    S(120, look.city(0, { a: [0.62, 3, 1, 1], text: 'map' }), { cut: 'punch' }),
    S(140, look.stars(1, { a: [1, 0, 22, 0.55] }), { cut: 'glitch' }),
  ],
  cues: [
    { b: 8, d: 12, type: 'caption', text: 'THE FACES BEHIND THE 1994 ORIGINAL' },
    { b: 30, d: 16, type: 'portrait', ...PEOPLE[0], tint: '#ffd23a' },
    { b: 54, d: 16, type: 'portrait', ...PEOPLE[1], tint: '#38e8ff' },
    { b: 78, d: 16, type: 'portrait', ...PEOPLE[2], tint: '#ff4fb8' },
    { b: 96, d: 9, type: 'caption', text: 'THREE FRIENDS. A LOT OF Z80.' },
    { b: 124, d: 9, type: 'caption', text: "WE'RE STILL COUNTING." },
  ],
};

// 06 — GLENZ (+ the supercut) ---------------------------------------------------
const supercut = [
  look.balls(0, 0, 0), look.grid(0, 0.55), look.mega3d(1), look.orbs(2, 1), look.city(0),
  look.dots(0, 1), look.balls(3, 1, 1), look.grid(2, 0.2), look.megaFlat({ b: [2, 0, 1, 0] }), look.orbs(4, 0),
  look.scrolls(), look.meta(3), look.glenz(1, { a: [1, 0, 0, 1.2] }), look.balls(4, 0, 3),
];
EDIT.glenz = {
  shots: [
    S(0, look.glenz(0, { a: [0, 0, 1, 1.15], text: 'glenz' }), { cut: 'flash' }),
    S(8, look.glenz(1, { a: [1, 0, 1, 1.25], text: 'glenz', b: [0.48, 0.92, 0.7, 4.6] }), { cut: 'punch' }),
    S(16, look.glenz(3, { a: [1, 0, 1, 1.3], text: 'glenz', b: [0.12, 0.6, 0.8, 4.4] }), { cut: 'flash' }),
    S(24, look.glenz(2, { a: [0, 1, 0, 1], b: [0.55, 0.85, 0.9, 5] }), { cut: 'glitch' }),
    S(28, look.glenz(0, { a: [0, 1, 0, 1], b: [0.9, 0.3, 1.2, 5] }), { cut: 'punch' }),
    S(32, look.glenz(1, { a: [1, 1, 0, 1], b: [0.2, 0.55, 1.3, 5] }), { cut: 'flash' }),
    S(40, look.glenz(3, { a: [1, 0, 1, 1.35], text: 'glenz2', b: [0.7, 0.05, 1.6, 4.0] }), { cut: 'zx', fx: { zx: (p) => (p < 0.08 ? 1 : 0) } }),
    S(48, look.glenz(2, { a: [1, 0, 1, 1.3], text: 'glenz', b: [0.3, 0.7, 1.0, 4.6] }), { cut: 'flash' }),
    S(56, look.glenz(0, { a: [1, 1, 0, 1], b: [0.62, 0.2, 1.4, 5] }), { cut: 'punch' }),
    S(60, look.glenz(1, { a: [0, 1, 0, 1], b: [0.05, 0.75, 1.1, 5] }), { cut: 'glitch' }),
    // the finale: a supercut of the whole show
    ...sequence(64, 0.5, supercut.concat(supercut.slice(0, 10)), (b, l, i) => S(b, l, { cut: ['punch', 'glitch', 'zx'][i % 3] })),
    S(76, look.logo({ var: 3, a: [0, 0, 8, 3] }), { cut: 'flash' }),
  ],
  cues: [
    { b: 0, d: 2, type: 'slam', text: 'HEEEEY!' },
    { b: 16, d: 6, type: 'caption', text: 'TWO COLOURS IN 1994. A FEW MORE TODAY.' },
    { b: 32, d: 6, type: 'caption', text: 'THE LAST PART. THE CLASSIC GLENZ, REFRACTED.' },
    { b: 60, d: 4, type: 'slam', text: 'READY?', rot: 3, shadow: '#ff2bd6' },
    ...sequence(70, 0.5, 'SATISFACTION'.split(''), (b, ch, i) => ({ b, d: 0.5, type: 'slam', text: ch, maxH: 0.7, rot: (i % 2 ? 4 : -4) })),
  ],
};

// 07 — EPILOGUE -------------------------------------------------------------------
// A slow farewell: long shots, soft fades instead of hits. The picture is gone
// by beat 152 (the outro); the end screen stays up while the music plays out.
EDIT.epilogue = {
  shots: [
    S(0, look.stars(1, { a: [1.2, 0, 22, 0.12] }), { cut: 'flash' }),
    S(16, look.stars(2, { a: [0.2, 0, 22, 0.12] }), { cut: 'soft' }),
    S(24, look.balls(4, 0, 3, { b: [0.1, 1, 1, 0] }), { cut: 'soft', fx: { fade: 0.35 } }),
    S(36, look.mega3d(3, { a: [1, 0, 10, 1] }), { cut: 'soft', fx: { fade: 0.4 } }),
    S(48, look.orbs(0, 0, { b: [0.1, 0, 0, 0] }), { cut: 'soft', fx: { fade: 0.35 } }),
    S(60, look.grid(3, 0.12), { cut: 'soft', fx: { fade: 0.35 } }),
    S(72, look.glenz(1, { a: [1, 0, 0, 1.2] }), { cut: 'soft', fx: { fade: 0.2 } }),
    S(80, look.stars(0, { a: [0.2, 1, 20, 0.12], b: [1.0, 0, 0, 0], text: 'crawl' }), { cut: 'soft' }),
    S(116, look.header(), { cut: 'soft' }),
    S(128, look.logo({ var: 3, a: [0, 0, 8, 2], b: [1, 0, 0, 0] }), { cut: 'soft', fx: { zx: (p) => Math.min(1, p * 1.5) } }),
    S(140, look.logo({ var: 0, a: [0, 0, 7, 0], b: [1, 0, 0, 0] }), { cut: 'zx', fx: { zx: 1, fade: (p) => Math.max(0, (p - 0.6) / 0.4) } }),
    S(152, look.logo({ var: 0, a: [0, 0, 7, 0], b: [1, 0, 0, 0] }), { fx: { fade: 1 } }),
  ],
  cues: [
    { b: 16, d: 8, type: 'caption', text: 'THE ORIGINAL 1994 DEMO WAS MADE BY' },
    ...CREDITS.map((lines, i) => ({ b: 24 + i * 12, d: 12, type: 'credit', lines })),
    { b: 60, d: 12, type: 'credit', lines: ['THIS TRIBUTE', 'AN UNOFFICIAL FAN HOMAGE', 'NEW VISUALS · NEW MUSIC COVERS'], panel: true },
    { b: 72, d: 8, type: 'credit', lines: ['ORIGINAL ART, FONTS AND THEMES', 'BELONG TO THEIR AUTHORS'], panel: true },
    { b: 116, d: 6, type: 'credit', lines: ['THE ORIGINAL', 'SATISFACTION', 'CODE BUSTERS · 1993/94'] },
    { b: 122, d: 6, type: 'credit', lines: ['WITH RESPECT TO', 'RST7', 'MAX IWAMOTO', 'KLAV'] },
    { b: 128, d: 6, type: 'caption', text: "32 YEARS LATER, WE'RE STILL WATCHING", y: 0.82 },
    { b: 134, d: 6, type: 'caption', text: 'AND STILL GRINNING', y: 0.82 },
    { b: 140, d: 9, type: 'slam', text: 'THANK YOU,\nCODE BUSTERS.', y: 0.3, maxH: 0.22, shadow: '#ff2bd6' },
  ],
};

// ---------------------------------------------------------------- build -----
export function buildTimeline() {
  const shots = [];
  const cues = [];
  for (const ch of CHAPTERS) {
    const e = EDIT[ch.id];
    const textStart = {};
    e.shots.forEach((s, i) => {
      const nb = i + 1 < e.shots.length ? e.shots[i + 1].at : ch.beats;
      if (s.text && textStart[s.text] === undefined) textStart[s.text] = s.at;
      shots.push({ ...s, chapter: ch, beatEnd: nb, start: ch.start + s.at * ch.beat, end: ch.start + nb * ch.beat, textStartBeat: s.text ? textStart[s.text] : s.at });
    });
    e.cues.forEach((c) => cues.push({ ...c, chapter: ch, start: ch.start + c.b * ch.beat, end: ch.start + (c.b + c.d) * ch.beat }));
  }
  return { shots, cues, chapters: CHAPTERS, end: END, outro: OUTRO, bigWords };
}
