// Kinetic typography overlay, drawn with Canvas2D and composited by the post
// pass (so it gets chromatic aberration, glitch and ZX treatment too).

export const SANS = '"SF Pro Display", system-ui, -apple-system, "Segoe UI", "Helvetica Neue", "Arial Black", sans-serif';
export const ZXF = '"ZX Satisfaction", monospace';

const ACCENT = '#ffe600';
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const outBack = (x) => { x = clamp(x); const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };

export class TypeLayer {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.dirty = false;
  }
  resize(w, h) { this.canvas.width = w; this.canvas.height = h; this.dirty = false; }
  get W() { return this.canvas.width; }
  get H() { return this.canvas.height; }
  get U() { return Math.min(this.W, this.H); }

  // Start a frame. `dirty` tells whether anything was drawn (and must be uploaded).
  begin() {
    if (this.dirty) this.ctx.clearRect(0, 0, this.W, this.H);
    this.dirty = false;
  }

  font(px, weight = 900, family = SANS) { this.ctx.font = `${weight} ${Math.round(px)}px ${family}`; }

  // Measure at the final size and shrink so the text really fits.
  shrink(size, text, maxW, spacing) {
    for (let k = 0; k < 3; k++) {
      this.font(size);
      this.ctx.letterSpacing = `${spacing * size}px`;
      const w = this.ctx.measureText(text).width + size * 0.08;
      if (w <= maxW) break;
      size *= maxW / w;
    }
    return size;
  }

  fit(text, maxW, maxH, weight = 900, family = SANS, spacing = -0.04) {
    const c = this.ctx;
    this.font(100, weight, family);
    c.letterSpacing = `${spacing * 100}px`;
    const w = c.measureText(text).width;
    return Math.min(maxH, (maxW / Math.max(w, 1)) * 100);
  }

  // Huge centered word(s) that punch in.
  slam(cue, age, dur, k = {}) {
    const c = this.ctx, W = this.W, H = this.H;
    const lines = cue.text.split('\n');
    const longest = lines.reduce((a, b) => (b.length > a.length ? b : a), '');
    const narrow = W < H ? 0.86 : 1;
    let size = this.fit(longest, W * (k.width ?? 0.8) * narrow, H * (cue.maxH ?? k.maxH ?? 0.3) / lines.length);
    size = this.shrink(size, longest, W * 0.84 * narrow, -0.04);
    const p = clamp(age / 0.18);
    const s = 1 + 0.45 * Math.pow(1 - p, 3);
    const out = clamp((age - dur + 0.12) / 0.12);
    c.save();
    c.translate(W / 2 + (cue.x ?? 0) * W, H / 2 + (cue.y ?? 0) * H);
    c.rotate((cue.rot ?? 0) * Math.PI / 180);
    c.scale(s * (1 + out * 0.3), s * (1 + out * 0.3));
    c.globalAlpha = clamp(age / 0.04) * (1 - out);
    this.font(size);
    c.letterSpacing = `${-0.04 * size}px`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    const lh = size * 0.92;
    lines.forEach((ln, i) => {
      const y = (i - (lines.length - 1) / 2) * lh;
      if (!cue.outline) {
        c.fillStyle = cue.shadow ?? '#ff2bd6';
        c.fillText(ln, size * 0.05, y + size * 0.05);
        c.fillStyle = cue.color ?? '#ffffff';
        c.fillText(ln, 0, y);
      } else {
        c.lineWidth = Math.max(2, size * 0.035);
        c.strokeStyle = cue.color ?? '#ffffff';
        c.strokeText(ln, 0, y);
      }
    });
    c.restore();
    this.dirty = true;
  }

  // TikTok caption: words appear one by one, current word highlighted.
  caption(cue, age, dur) {
    const c = this.ctx, W = this.W, H = this.H, U = this.U;
    const words = cue.text.split(/\s+/).filter(Boolean);
    const per = dur / words.length;
    const idx = Math.min(words.length - 1, Math.floor(age / per));
    // chunk into groups of max ~3 words / 16 chars
    const chunks = []; let cur = [];
    words.forEach((w, i) => {
      const len = cur.map((j) => words[j]).join(' ').length;
      if (cur.length && (cur.length >= 3 || len + w.length > 16)) { chunks.push(cur); cur = []; }
      cur.push(i);
    });
    if (cur.length) chunks.push(cur);
    const chunk = chunks.find((ch) => ch.includes(idx));
    const size = U * (cue.size ?? 0.085);
    this.font(size);
    c.letterSpacing = `${-0.02 * size}px`;
    c.textBaseline = 'middle'; c.textAlign = 'left';
    const parts = chunk.map((j) => ({ j, w: c.measureText(words[j]).width }));
    const gap = size * 0.28;
    const total = parts.reduce((a, b) => a + b.w, 0) + gap * (parts.length - 1);
    let x = W / 2 - total / 2;
    const y = H * (cue.y ?? 0.74);
    const out = clamp((age - dur + 0.1) / 0.1);
    c.save();
    c.globalAlpha = 1 - out;
    for (const pr of parts) {
      if (pr.j > idx) break;
      const wa = age - pr.j * per;
      const pop = outBack(wa / 0.16);
      c.save();
      c.translate(x + pr.w / 2, y);
      c.scale(0.6 + 0.4 * pop, 0.6 + 0.4 * pop);
      if (pr.j === idx) {
        c.fillStyle = cue.accent ?? ACCENT;
        const pad = size * 0.14;
        c.beginPath();
        c.roundRect(-pr.w / 2 - pad, -size * 0.58, pr.w + pad * 2, size * 1.12, size * 0.16);
        c.fill();
        c.fillStyle = '#000';
      } else {
        c.fillStyle = '#fff';
        c.shadowColor = 'rgba(0,0,0,.85)'; c.shadowBlur = size * 0.25;
      }
      c.fillText(words[pr.j], -pr.w / 2, size * 0.04);
      c.restore();
      x += pr.w + gap;
    }
    c.restore();
    this.dirty = true;
  }

  // Small HUD label (ZX font), top-left.
  tag(cue, age, dur) {
    const c = this.ctx, U = this.U;
    const size = U * 0.026;
    const a = clamp(age / 0.15) * (1 - clamp((age - dur + 0.3) / 0.3));
    const typed = cue.text.slice(0, Math.floor(age * 40));
    c.save();
    c.globalAlpha = a;
    c.font = `${Math.round(size)}px ${ZXF}`;
    c.letterSpacing = '0px';
    c.textBaseline = 'top'; c.textAlign = 'left';
    const x = U * 0.05, y = U * 0.06;
    c.fillStyle = cue.accent ?? ACCENT;
    c.fillRect(x, y, size * 0.5, size);
    c.fillStyle = '#fff';
    c.fillText(typed, x + size, y);
    if (cue.sub) { c.globalAlpha = a * 0.6; c.fillText(cue.sub.slice(0, Math.floor(Math.max(0, age - 0.3) * 40)), x + size, y + size * 1.6); }
    c.restore();
    this.dirty = true;
  }

  // Greeting name: label + huge name, alternating layouts.
  name(cue, age, dur) {
    const c = this.ctx, W = this.W, H = this.H, U = this.U;
    const layout = cue.layout ?? 0;
    const size = this.shrink(this.fit(cue.text, W * (W < H ? 0.66 : 0.76), H * 0.22), cue.text, W * (W < H ? 0.7 : 0.78), -0.045);
    const pop = outBack(age / 0.14);
    c.save();
    const ox = [0, -0.06, 0.06, 0][layout % 4] * W, oy = [0, -0.05, 0.05, 0.02][layout % 4] * H;
    c.translate(W / 2 + ox, H / 2 + oy);
    c.rotate([0, -4, 3, 0][layout % 4] * Math.PI / 180);
    c.scale(0.7 + 0.3 * pop, 0.7 + 0.3 * pop);
    this.font(size);
    c.letterSpacing = `${-0.045 * size}px`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    if (layout % 4 === 3) {
      c.fillStyle = 'rgba(0,0,0,.82)'; c.fillText(cue.text, 0, 0);
      c.lineWidth = Math.max(2, size * 0.035); c.strokeStyle = '#fff'; c.strokeText(cue.text, 0, 0);
    } else {
      c.fillStyle = cue.shadow ?? '#00e5ff';
      c.fillText(cue.text, size * 0.045, size * 0.045);
      c.fillStyle = '#fff';
      c.fillText(cue.text, 0, 0);
    }
    if (cue.sub) {
      const s2 = U * 0.03;
      c.font = `${Math.round(s2)}px ${ZXF}`;
      c.letterSpacing = '0px';
      const w = c.measureText(cue.sub).width;
      c.fillStyle = ACCENT;
      c.fillRect(-w / 2 - s2 * 0.4, -size * 0.62 - s2 * 1.3, w + s2 * 0.8, s2 * 1.5);
      c.fillStyle = '#000';
      c.fillText(cue.sub, 0, -size * 0.62 - s2 * 0.5);
    }
    c.restore();
    this.dirty = true;
  }

  // Credits: small role + stacked names.
  credit(cue, age, dur) {
    const c = this.ctx, W = this.W, H = this.H, U = this.U;
    const [role, ...names] = cue.lines;
    const a = clamp(age / 0.2) * (1 - clamp((age - dur + 0.25) / 0.25));
    c.save();
    c.globalAlpha = a;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    // Clean sans for the header: the original ZX font's stylised L reads as W.
    const rs = U * 0.028;
    this.font(rs, 800);
    c.letterSpacing = `${rs * 0.22}px`;
    c.fillStyle = ACCENT;
    const top = H / 2 - (names.length * U * 0.11) / 2;
    if (cue.panel) {
      c.fillStyle = 'rgba(0,0,0,.78)';
      c.beginPath();
      c.roundRect(W * 0.08, top - U * 0.13, W * 0.84, names.length * U * 0.11 + U * 0.2, U * 0.02);
      c.fill();
      c.fillStyle = ACCENT;
    }
    c.fillText(role, W / 2, top - U * 0.06);
    names.forEach((n, i) => {
      const na = clamp((age - 0.12 * (i + 1)) / 0.2);
      const size = Math.min(U * 0.1, this.fit(n, W * 0.8, U * 0.1));
      this.font(size);
      c.letterSpacing = `${-0.03 * size}px`;
      c.globalAlpha = a * na;
      c.fillStyle = '#fff';
      c.fillText(n, W / 2 + (1 - na) * U * 0.05, top + U * 0.06 + i * U * 0.11);
    });
    c.restore();
    this.dirty = true;
  }

  // Portrait card from the original map screen (dithered photo + name).
  portrait(cue, age, dur, img) {
    if (!img) return;
    const c = this.ctx, W = this.W, H = this.H, U = this.U;
    const [sx, sy, sw, sh] = cue.crop;
    const portraitMode = H > W;
    const ch = portraitMode ? U * 0.62 : U * 0.56;
    const cw = ch * (sw / sh);
    const x = portraitMode ? (W - cw) / 2 : W * 0.58;
    const y = portraitMode ? H * 0.16 : (H - ch) / 2 - U * 0.04;
    const p = clamp(age / 0.35);
    const out = clamp((age - dur + 0.25) / 0.25);
    c.save();
    c.globalAlpha = 1 - out;
    // reveal by scanline wipe
    c.beginPath(); c.rect(x, y, cw, ch * p); c.clip();
    c.imageSmoothingEnabled = false;
    c.drawImage(img, sx, sy, sw, sh, x, y, cw, ch);
    c.globalCompositeOperation = 'multiply';
    c.fillStyle = cue.tint ?? '#38e8ff';
    c.fillRect(x, y, cw, ch);
    c.globalCompositeOperation = 'source-over';
    c.fillStyle = 'rgba(0,0,0,.25)';
    for (let yy = 0; yy < ch; yy += 3) c.fillRect(x, y + yy, cw, 1);
    c.restore();
    c.save();
    c.globalAlpha = (1 - out) * clamp((age - 0.2) / 0.2);
    c.strokeStyle = cue.tint ?? '#38e8ff'; c.lineWidth = 2;
    c.strokeRect(x - 6, y - 6, cw + 12, ch + 12);
    const size = U * 0.075;
    this.font(size);
    c.letterSpacing = `${-0.03 * size}px`;
    c.textAlign = 'left'; c.textBaseline = 'top';
    c.fillStyle = '#fff';
    c.fillText(cue.name, x, y + ch + U * 0.03);
    this.font(U * 0.024, 800);
    c.letterSpacing = `${U * 0.004}px`;
    c.fillStyle = ACCENT;
    c.fillText(cue.role, x, y + ch + U * 0.03 + size * 1.05);
    c.restore();
    this.dirty = true;
  }

  // Stories-style segmented progress bar.
  progress(chapters, time, total) {
    const c = this.ctx, W = this.W, U = this.U;
    const m = U * 0.025, gap = U * 0.008, h = Math.max(2, U * 0.004);
    const usable = W - m * 2 - gap * (chapters.length - 1);
    let x = m;
    c.save();
    for (const ch of chapters) {
      const w = usable * (ch.end - ch.start) / total;
      c.fillStyle = 'rgba(255,255,255,.22)';
      c.fillRect(x, m * 0.6, w, h);
      const f = clamp((time - ch.start) / (ch.end - ch.start));
      c.fillStyle = 'rgba(255,255,255,.9)';
      c.fillRect(x, m * 0.6, w * f, h);
      x += w + gap;
    }
    c.restore();
    this.dirty = true;
  }
}
