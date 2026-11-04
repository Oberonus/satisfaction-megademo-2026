// Adaptive render resolution.
//
// Scenes differ a lot in cost (balls is ~10x stars), so every scene setup
// (scene + variant) gets its own pixel budget. Budgets are calibrated once while
// loading by timing each setup offscreen, then the live loop acts as a safety
// net: it lowers a setup's budget when frames run long and raises it back when
// there is headroom. Budgets are stored in pixels, so they survive window resizes.

const MAX_PIXELS = 2.2e6;     // never render a scene above ~1080p worth of pixels
const MIN_SCALE = 0.35;
const FRAME_MS = 1000 / 60;   // aim for at least 60 fps
const GPU_BUDGET = 12;        // ms of GPU time per frame we plan for (scene + post)
const STEP = 0.05;            // scales are quantised so render targets can be reused

export const setupKey = (shot) => `${shot.scene}/${shot.var ?? 0}`;

export class Resolution {
  // fixed: a constant scale (from ?scale=, or for stills/recording), else adaptive.
  constructor(gl, fixed = 0) {
    this.gl = gl;
    this.fixed = fixed;
    this.pixels = new Map();   // setup key -> current pixel budget
    this.calibrated = new Map(); // setup key -> budget measured at load
    this.samples = [];
    this.sampleKey = null;
    this.lastAdjust = 0;
    this.timer = fixed ? null : GpuTimer.create(gl);
  }
  get adaptive() { return !this.fixed; }

  // Render scale for a setup on a w×h canvas.
  scale(key, w, h) {
    const area = w * h;
    const cap = Math.min(1, Math.sqrt(MAX_PIXELS / area));
    if (this.fixed) return this.fixed;
    const px = this.pixels.get(key) ?? MAX_PIXELS;
    const s = Math.min(cap, Math.max(MIN_SCALE, Math.sqrt(px / area)));
    return Math.max(MIN_SCALE, Math.floor(s / STEP + 1e-6) * STEP);
  }

  // measure(shot) renders one setup and returns its GPU time in ms at `pixels`.
  // postMs is the fixed per-frame cost of the post pass.
  calibrate(shotsByKey, measure, pixels, postMs) {
    const budget = Math.max(2, GPU_BUDGET - postMs);
    for (const [key, shot] of shotsByKey) {
      const ms = measure(shot);
      const px = Math.min(MAX_PIXELS, pixels * budget / Math.max(ms, 0.05));
      this.pixels.set(key, px);
      this.calibrated.set(key, px);
    }
  }

  // Once per frame with the frame interval and the setup on screen.
  update(now, frameMs, key, playing) {
    if (!this.adaptive) return;
    this.timer?.poll();
    if (!playing || frameMs > 250) { this.samples.length = 0; return; } // paused or tab was hidden
    if (key !== this.sampleKey) { this.samples.length = 0; this.sampleKey = key; }
    this.samples.push(frameMs);
    if (this.samples.length > 30) this.samples.shift();
    if (this.samples.length < 20 || now - this.lastAdjust < 1000) return;

    const avg = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
    const px = this.pixels.get(key) ?? MAX_PIXELS;
    const gpu = this.timer?.ms;  // null when the GPU timer is unavailable
    let next = px;
    if (avg > FRAME_MS * 1.3 || (gpu != null && gpu > GPU_BUDGET * 1.25)) next = px * 0.72;   // ~0.85 in scale
    else if (gpu != null ? gpu < GPU_BUDGET * 0.6 : avg < FRAME_MS * 1.08) {
      // Room to spare. Without a GPU timer, vsync hides how much, so only climb
      // back to what calibration measured.
      next = Math.min(px * 1.17, gpu != null ? MAX_PIXELS : (this.calibrated.get(key) ?? MAX_PIXELS));
    }
    if (next !== px) {
      this.pixels.set(key, next);
      this.lastAdjust = now;
      this.samples.length = 0;
    }
  }

  frameBegin() { this.timer?.begin(); }
  frameEnd() { this.timer?.end(); }
}

// GPU frame time via EXT_disjoint_timer_query_webgl2 (results arrive a few frames late).
class GpuTimer {
  static create(gl) {
    const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    return ext ? new GpuTimer(gl, ext) : null;
  }
  constructor(gl, ext) {
    this.gl = gl; this.ext = ext;
    this.pending = [];
    this.active = null;
    this.ms = null;
  }
  begin() {
    if (this.active || this.pending.length > 4) return;
    this.active = this.gl.createQuery();
    this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, this.active);
  }
  end() {
    if (!this.active) return;
    this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
    this.pending.push(this.active);
    this.active = null;
  }
  poll() {
    const gl = this.gl;
    const disjoint = gl.getParameter(this.ext.GPU_DISJOINT_EXT);
    while (this.pending.length) {
      const q = this.pending[0];
      if (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) break;
      const ns = gl.getQueryParameter(q, gl.QUERY_RESULT);
      if (!disjoint) this.ms = this.ms == null ? ns / 1e6 : this.ms * 0.8 + (ns / 1e6) * 0.2;
      gl.deleteQuery(q);
      this.pending.shift();
    }
  }
}
