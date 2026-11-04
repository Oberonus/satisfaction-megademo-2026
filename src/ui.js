// Intro / end screens, the auto-hiding HUD and keyboard controls.

const $ = (id) => document.getElementById(id);
const pad2 = (n) => String(n).padStart(2, '0');
const fmt = (s) => `${pad2(Math.floor(s / 60))}:${pad2(Math.floor(s % 60))}`;

export function showError(msg) {
  const e = $('error');
  e.textContent = msg;
  e.hidden = false;
}

export class UI {
  constructor({ player, TL }) {
    this.player = player;
    this.TL = TL;
    this.debug = false;
    this.showProgress = false;
    this.ended = false;
    this.outroShown = false;
    this.idleTimer = 0;
    this.el = {
      intro: $('intro'), end: $('end'), start: $('start'), startLabel: $('start-label'),
      play: $('play'), now: $('now'), time: $('time'), seek: $('seek'), chapters: $('chapters'),
      mute: $('mute'), full: $('full'), replay: $('replay'), debug: $('debug'),
    };
    this.chapterButtons = [];
  }

  setLoading(label) { this.el.startLabel.textContent = label; }

  enableStart() {
    this.el.start.disabled = false;
    this.el.startLabel.textContent = 'PLAY';
  }

  bind() {
    const { el, TL } = this;
    TL.chapters.forEach((c, i) => {
      const b = document.createElement('button');
      b.textContent = pad2(i + 1);
      b.title = c.title;
      b.addEventListener('click', () => { this.seek(c.start + 0.001); this.poke(); });
      el.chapters.appendChild(b);
      this.chapterButtons.push(b);
    });
    el.start.addEventListener('click', () => { el.intro.hidden = true; this.play(); this.poke(); });
    el.play.addEventListener('click', () => this.toggle());
    el.replay.addEventListener('click', () => { this.seek(0); this.play(); });
    el.mute.addEventListener('click', () => this.toggleMute());
    el.full.addEventListener('click', toggleFullscreen);
    el.seek.max = TL.end;
    el.seek.addEventListener('input', () => this.seek(Number(el.seek.value)));
    window.addEventListener('pointermove', () => this.poke());
    window.addEventListener('keydown', (e) => this.key(e));
    el.debug.hidden = !this.debug;
  }

  key(e) {
    if (e.target.tagName === 'INPUT' && e.key !== ' ') return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    switch (k) {
      case ' ':
        e.preventDefault();
        if (!this.el.intro.hidden && this.el.start.disabled) return; // still loading
        this.el.intro.hidden = true;
        this.toggle();
        break;
      case 'ArrowRight': this.chapterJump(1); break;
      case 'ArrowLeft': this.chapterJump(-1); break;
      case 'f': toggleFullscreen(); break;
      case 'm': this.toggleMute(); break;
      case 'h': this.showProgress = !this.showProgress; break;
      case 'd': this.debug = !this.debug; this.el.debug.hidden = !this.debug; break;
      case '.': this.seek(this.player.now() + 5); break;
      case ',': this.seek(this.player.now() - 5); break;
    }
    this.poke();
  }

  toggle() { this.player.playing ? this.pause() : this.play(); }

  play() {
    this.ended = false; this.outroShown = false;
    this.el.end.hidden = true;
    this.player.play().catch((e) => showError('Audio could not start: ' + e.message));
    this.el.play.textContent = 'PAUSE';
    document.body.classList.add('playing');
  }

  pause() {
    this.player.pause();
    this.el.play.textContent = 'PLAY';
    document.body.classList.remove('playing');
    this.poke();
  }

  seek(t) {
    this.player.seek(t);
    if (this.ended && t < this.TL.end - 0.1) { this.ended = false; this.el.end.hidden = true; }
    if (t < this.TL.outro) { this.outroShown = false; this.el.end.hidden = true; }
  }

  chapterJump(dir) {
    const t = this.player.now(), chs = this.TL.chapters;
    let i = chs.findIndex((c) => t >= c.start && t < c.end);
    if (dir < 0 && t - chs[i].start > 2) dir = 0; // first press goes back to the start of this part
    i = Math.max(0, Math.min(chs.length - 1, i + dir));
    this.seek(chs[i].start + 0.001);
  }

  toggleMute() {
    this.player.muted = !this.player.muted;
    this.el.mute.textContent = this.player.muted ? 'SOUND OFF' : 'SOUND ON';
  }

  // Show the HUD; it hides again after a moment of no input while playing.
  poke() {
    document.body.classList.add('hud');
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => { if (this.player.playing) document.body.classList.remove('hud'); }, 2200);
  }

  showEnd() {
    this.ended = true;
    this.el.end.hidden = false;
    document.body.classList.remove('playing');
    this.el.play.textContent = 'PLAY';
  }

  // Once per frame.
  update(t, shot, debugLine) {
    const { el, TL } = this;
    const ch = shot.chapter;
    if (ch !== this.lastChapter) {
      this.lastChapter = ch;
      el.now.textContent = `${pad2(ch.index + 1)} ${ch.title}`;
      this.chapterButtons.forEach((b, i) => b.classList.toggle('on', i === ch.index));
    }
    const sec = Math.floor(t);
    if (sec !== this.lastSec) { this.lastSec = sec; el.time.textContent = `${fmt(t)} / ${fmt(TL.end)}`; }
    if (document.activeElement !== el.seek) el.seek.value = t;
    if (this.debug) el.debug.textContent = debugLine();
    // after the last shot the end screen stays up while the music plays out
    const inOutro = t >= TL.outro;
    if (inOutro !== this.outroShown && !this.ended) { this.outroShown = inOutro; el.end.hidden = !inOutro; }
  }
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.().catch(() => {});
}
