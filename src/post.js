// Post-processing: bloom chain + final composite with chromatic aberration,
// glitch blocks, ZX attribute-clash filter, flashes, grain and the type overlay.
import { program, use, drawFS, bindTarget, target, freeTarget } from './gl.js';

const HEAD = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
vec3 fixnan(vec3 c){ bool ok = c.r==c.r && c.g==c.g && c.b==c.b && all(lessThan(abs(c), vec3(1e4))); return ok ? clamp(c, 0., 64.) : vec3(0.); }
vec3 tex3(sampler2D s, vec2 uv){ return fixnan(texture(s, uv).rgb); }
`;

const PREFILTER = HEAD + `
uniform sampler2D uSrc; uniform vec2 uTexel; uniform float uThreshold;
void main(){
  vec3 c = vec3(0.);
  c += tex3(uSrc, vUv + uTexel*vec2(-1,-1)); c += tex3(uSrc, vUv + uTexel*vec2(1,-1));
  c += tex3(uSrc, vUv + uTexel*vec2(-1,1));  c += tex3(uSrc, vUv + uTexel*vec2(1,1));
  c *= .25;
  float b = max(c.r, max(c.g, c.b));
  float k = max(b - uThreshold, 0.); k = k*k/(b*.5 + 1e-4) + max(b - uThreshold - .5, 0.);
  o = vec4(c*min(k/max(b,1e-4), 4.), 1.);
}`;

const DOWN = HEAD + `
uniform sampler2D uSrc; uniform vec2 uTexel;
void main(){
  vec3 c = texture(uSrc, vUv).rgb*.5;
  c += texture(uSrc, vUv + uTexel*vec2(-1,-1)).rgb*.125; c += texture(uSrc, vUv + uTexel*vec2(1,-1)).rgb*.125;
  c += texture(uSrc, vUv + uTexel*vec2(-1,1)).rgb*.125;  c += texture(uSrc, vUv + uTexel*vec2(1,1)).rgb*.125;
  o = vec4(c, 1.);
}`;

const UP = HEAD + `
uniform sampler2D uSrc; uniform vec2 uTexel;
void main(){
  vec3 c = vec3(0.);
  c += texture(uSrc, vUv + uTexel*vec2(-1,0)).rgb; c += texture(uSrc, vUv + uTexel*vec2(1,0)).rgb;
  c += texture(uSrc, vUv + uTexel*vec2(0,-1)).rgb; c += texture(uSrc, vUv + uTexel*vec2(0,1)).rgb;
  o = vec4(c*.25, 1.);
}`;

const COMPOSITE = HEAD + `
uniform sampler2D uScene, uBloom, uOverlay;
uniform vec2 uRes, uSceneRes;
uniform float uTime, uBloomAmt, uCA, uGlitch, uZX, uFlash, uFade, uPunch, uGrain, uSeed, uOverlayOn, uMirror;
float h21(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14), 0., 1.); }
float bayer(vec2 p){
  ivec2 q = ivec2(mod(p, 4.));
  int m[16] = int[16](0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5);
  return (float(m[q.y*4+q.x]) + .5)/16.;
}
vec3 sceneAt(vec2 uv, float ca){
  vec2 d = (uv - .5)*ca;
  vec3 c;
  c.r = tex3(uScene, uv + d).r + texture(uBloom, uv + d).r*uBloomAmt;
  c.g = tex3(uScene, uv).g + texture(uBloom, uv).g*uBloomAmt;
  c.b = tex3(uScene, uv - d).b + texture(uBloom, uv - d).b*uBloomAmt;
  return aces(c*1.05);
}
void main(){
  vec2 uv = vUv;
  uv = (uv - .5)/(1. + uPunch*.07) + .5;
  if(uMirror > .5) uv.x = .5 - abs(uv.x - .5);
  // glitch: displaced horizontal slices
  float gl = uGlitch;
  if(gl > .001){
    float slice = floor(uv.y*mix(12., 40., h21(vec2(uSeed, 1.))) + uSeed*7.);
    float h = h21(vec2(slice, floor(uTime*24.)));
    if(h > 1. - gl*.6) uv.x += (h21(vec2(slice, 3.)) - .5)*.25*gl;
  }
  float ca = .004 + uCA*.02 + gl*.03;
  vec3 col = sceneAt(uv, ca);

  if(uZX > .001){
    // ZX Spectrum: 256x192-ish pixel grid, 8x8 attribute cells with one ink colour on black paper.
    float px = uRes.y/192.;
    vec2 cellPx = floor(gl_FragCoord.xy/px);
    vec2 attr = floor(cellPx/8.);
    vec2 base = attr*8.*px;
    vec3 m = vec3(0.);
    for(int i=0;i<4;i++){
      vec2 o2 = vec2(float(i&1), float(i>>1))*4.*px + 2.*px;
      m += sceneAt((base + o2)/uRes, 0.);
    }
    m *= .25;
    vec3 inkc = step(.5, m/max(max(m.r, max(m.g, m.b)), 1e-3));
    if(dot(inkc, vec3(1.)) < .5) inkc = vec3(1.);
    float bright = step(.55, max(max(m.r,m.g),m.b));
    vec3 s = sceneAt((cellPx + .5)*px/uRes, 0.);
    float l = max(max(s.r, s.g), s.b);
    float on = step(bayer(cellPx), l*1.4);
    vec3 z = on*inkc*(bright > .5 ? 1. : .8);
    col = mix(col, z, uZX);
  }

  if(uOverlayOn > .5){
    vec2 d = (uv - .5)*(ca*.6);
    vec4 ov = texture(uOverlay, vec2(uv.x, 1. - uv.y));
    float ar = texture(uOverlay, vec2(uv.x + d.x, 1. - uv.y - d.y)).a;
    float ab = texture(uOverlay, vec2(uv.x - d.x, 1. - uv.y + d.y)).a;
    vec3 ovc = ov.a > 0. ? ov.rgb/ov.a : vec3(0.);
    col = mix(col, ovc, ov.a);
    col.r = mix(col.r, ovc.r, max(ar - ov.a, 0.)*.5);
    col.b = mix(col.b, ovc.b, max(ab - ov.a, 0.)*.5);
  }

  vec2 q = vUv - .5;
  col *= 1. - dot(q, q)*.55;
  col += (h21(gl_FragCoord.xy + fract(uTime*7.13)*100.) - .5)*uGrain;
  col = mix(col, vec3(1.), uFlash);
  col *= 1. - uFade;
  o = vec4(col, 1.);
}`;

export class Post {
  constructor(gl) {
    this.gl = gl;
    this.pre = program(gl, PREFILTER, undefined, 'prefilter');
    this.down = program(gl, DOWN, undefined, 'down');
    this.up = program(gl, UP, undefined, 'up');
    this.comp = program(gl, COMPOSITE, undefined, 'composite');
    this.levels = [];
    this.chains = new Map();
    this.overlayTex = gl.createTexture();
    this.overlayW = this.overlayH = 0;
  }
  // Bloom chain for a scene size. Chains are kept for a few recent sizes, so
  // switching resolution on a cut does not reallocate.
  resize(w, h) {
    const gl = this.gl, key = w + 'x' + h;
    let levels = this.chains.get(key);
    if (!levels) {
      levels = [];
      let lw = Math.max(1, w >> 1), lh = Math.max(1, h >> 1);
      for (let i = 0; i < 6 && lw > 4 && lh > 4; i++) { levels.push(target(gl, lw, lh)); lw >>= 1; lh >>= 1; }
      if (this.chains.size >= 4) {
        const [oldKey, old] = this.chains.entries().next().value;
        old.forEach((l) => freeTarget(gl, l));
        this.chains.delete(oldKey);
      }
    } else this.chains.delete(key);
    this.chains.set(key, levels); // most recently used last
    this.levels = levels;
  }
  // The overlay canvas is re-uploaded every frame a cue is visible: allocate the
  // texture once per size and update it in place.
  uploadOverlay(canvas) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.overlayTex);
    if (this.overlayW !== canvas.width || this.overlayH !== canvas.height) {
      gl.deleteTexture(this.overlayTex);
      this.overlayTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.overlayTex);
      gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, canvas.width, canvas.height);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      this.overlayW = canvas.width; this.overlayH = canvas.height;
    }
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  }
  run(scene, fx, overlayOn) {
    const gl = this.gl, L = this.levels;
    bindTarget(gl, L[0]);
    use(gl, this.pre, { uSrc: { tex: scene.tex, unit: 0 }, uTexel: [1 / scene.w, 1 / scene.h], uThreshold: fx.threshold ?? 0.9 });
    drawFS(gl);
    for (let i = 1; i < L.length; i++) {
      bindTarget(gl, L[i]);
      use(gl, this.down, { uSrc: { tex: L[i - 1].tex, unit: 0 }, uTexel: [1 / L[i - 1].w, 1 / L[i - 1].h] });
      drawFS(gl);
    }
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    for (let i = L.length - 1; i > 0; i--) {
      bindTarget(gl, L[i - 1]);
      use(gl, this.up, { uSrc: { tex: L[i].tex, unit: 0 }, uTexel: [1 / L[i].w, 1 / L[i].h] });
      drawFS(gl);
    }
    gl.disable(gl.BLEND);
    bindTarget(gl, null);
    use(gl, this.comp, {
      uScene: { tex: scene.tex, unit: 0 }, uBloom: { tex: L[0].tex, unit: 1 }, uOverlay: { tex: this.overlayTex, unit: 2 },
      uRes: [gl.drawingBufferWidth, gl.drawingBufferHeight], uSceneRes: [scene.w, scene.h],
      uTime: fx.time, uBloomAmt: fx.bloom ?? 0.9, uCA: fx.ca ?? 0, uGlitch: fx.glitch ?? 0, uZX: fx.zx ?? 0,
      uFlash: fx.flash ?? 0, uFade: fx.fade ?? 0, uPunch: fx.punch ?? 0, uGrain: fx.grain ?? 0.05, uSeed: fx.seed ?? 0,
      uOverlayOn: overlayOn ? 1 : 0, uMirror: fx.mirror ? 1 : 0,
    });
    drawFS(gl);
  }
}
