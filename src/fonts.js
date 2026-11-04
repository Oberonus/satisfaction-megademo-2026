// Builds a glyph atlas from the demo's original bitmap fonts and a data texture
// holding every scroller string, so shaders can render unlimited-length text.
import { texture, dataTexture } from './gl.js';

export const CELL = 18;          // 16px glyph + 1px padding each side (safe bilinear)
export const COLS = 16;
export const MAX_CHARS = 1024;   // per text row

// Atlas layout: font 0 = chunky 16x16 (large set, falls back to doubled 8x8),
//               font 1 = classic 8x8 doubled. slot = font*96 + (ascii-32).
export function buildFontAtlas(gl, fonts) {
  const size = COLS * CELL;
  const rows = Math.ceil(192 / COLS);
  const cv = document.createElement('canvas');
  cv.width = size; cv.height = rows * CELL;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(cv.width, cv.height);
  const put = (slot, x, y) => {
    const px = (slot % COLS) * CELL + 1 + x, py = Math.floor(slot / COLS) * CELL + 1 + y;
    const i = (py * cv.width + px) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = img.data[i + 3] = 255;
  };
  const small = fonts.small, large = fonts.large;
  const drawSmall = (slot, ch) => {
    const k = small.chars.indexOf(ch);
    if (k < 0) return;
    for (let y = 0; y < 8; y++) {
      const b = small.data[k * 8 + y];
      for (let x = 0; x < 8; x++) if (b & (128 >> x)) { put(slot, x * 2, y * 2); put(slot, x * 2 + 1, y * 2); put(slot, x * 2, y * 2 + 1); put(slot, x * 2 + 1, y * 2 + 1); }
    }
  };
  for (let c = 32; c < 128; c++) {
    const ch = String.fromCharCode(c);
    const k = large.chars.indexOf(ch);
    if (k >= 0 && ch !== ' ') {
      for (let y = 0; y < 16; y++) {
        const w = (large.data[k * 32 + y * 2] << 8) | large.data[k * 32 + y * 2 + 1];
        for (let x = 0; x < 16; x++) if (w & (0x8000 >> x)) put(c - 32, x, y);
      }
    } else drawSmall(c - 32, ch);
    drawSmall(96 + c - 32, ch);
  }
  ctx.putImageData(img, 0, 0);
  return { tex: texture(gl, cv, { filter: gl.LINEAR }), canvas: cv };
}

// One row per named text. Returns {tex, rows:{name:{row,len}}}.
export function buildTextTexture(gl, named) {
  const names = Object.keys(named);
  const data = new Uint8Array(MAX_CHARS * names.length);
  const rows = {};
  names.forEach((name, r) => {
    const s = named[name].slice(0, MAX_CHARS);
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      data[r * MAX_CHARS + i] = c >= 32 && c < 128 ? c - 32 : 0;
    }
    rows[name] = { row: r, len: s.length };
  });
  return { tex: dataTexture(gl, MAX_CHARS, names.length, data), rows };
}
