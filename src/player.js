// The show clock. While the soundtrack plays it is the master: the clock follows
// audio.currentTime and only extrapolates between its (coarse) updates. While the
// audio is buffering the clock holds still, so the picture never runs ahead.

const HAVE_FUTURE_DATA = 3;

export class Player {
  constructor({ src, end, silent = false, onEnded }) {
    this.end = end;
    this.silent = silent;
    this.t = 0;
    this.playing = false;
    this.energy = 0;            // smoothed low-frequency level, 0..1
    this.lastPerf = 0;
    this.lastAudio = -1;
    if (silent) return;
    this.audio = new Audio();
    this.audio.src = src;
    this.audio.preload = 'auto';
    this.audio.crossOrigin = 'anonymous';
    this.audio.addEventListener('ended', () => { this.playing = false; this.t = end; onEnded?.(); });
  }

  // Resolves when the music can play through, or after `timeout` ms: some mobile
  // browsers do not preload before a tap, and playback buffers on its own anyway.
  ready(timeout = 8000) {
    const a = this.audio;
    if (!a || a.readyState >= 4) return Promise.resolve();
    return new Promise((ok) => {
      const done = () => { clearTimeout(timer); a.removeEventListener('canplaythrough', done); ok(); };
      const timer = setTimeout(done, timeout);
      a.addEventListener('canplaythrough', done);
      a.addEventListener('error', done);
    });
  }

  // The analyser needs a user gesture (AudioContext), so it is built on first play.
  connectAnalyser() {
    if (this.ctx || !this.audio) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      const src = this.ctx.createMediaElementSource(this.audio);
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 512;
      this.freq = new Uint8Array(this.analyser.frequencyBinCount);
      src.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    } catch { this.ctx = null; }
  }

  // Once per frame: low-band energy from the analyser (bins 1..23).
  sampleEnergy() {
    if (!this.analyser || !this.playing) return;
    this.analyser.getByteFrequencyData(this.freq);
    let s = 0;
    for (let i = 1; i < 24; i++) s += this.freq[i];
    this.energy += (s / (23 * 255) - this.energy) * 0.3;
  }

  now() {
    const p = performance.now() / 1000;
    const a = this.audio;
    if (!this.playing) this.lastPerf = p;
    else if (a && !a.paused) {
      const at = a.currentTime;
      if (at !== this.lastAudio || a.readyState < HAVE_FUTURE_DATA) {
        this.lastAudio = at; this.t = at; this.lastPerf = p;
      } else this.t = this.lastAudio + (p - this.lastPerf);
    } else {
      this.t += p - this.lastPerf;
      this.lastPerf = p;
    }
    return Math.min(this.t, this.end);
  }

  play() {
    if (this.t >= this.end - 0.05) this.seek(0);
    this.playing = true;
    this.lastPerf = performance.now() / 1000;
    if (!this.audio) return Promise.resolve();
    this.connectAnalyser();
    this.ctx?.resume();
    this.audio.currentTime = this.t;
    return this.audio.play();
  }

  pause() {
    this.playing = false;
    this.audio?.pause();
  }

  seek(t) {
    this.t = Math.max(0, Math.min(this.end - 0.01, t));
    this.lastAudio = -1;
    this.lastPerf = performance.now() / 1000;
    if (this.audio) this.audio.currentTime = this.t;
  }

  get muted() { return !!this.audio?.muted; }
  set muted(m) { if (this.audio) this.audio.muted = m; }
}
