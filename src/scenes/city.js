// CITY — the bitmap from the original "The Map" part becomes an abstract night
// city: blocks extrude into buildings, roads glow. Deliberately no labels or
// markers: the show does not point at real places.
// uVar: camera (0 orbit, 1 low flyover, 2 dive to focus point uA.y, 3 top-down radar)
// uA: x hue, y focus point, z build-up (0..1), w ticker on
import { program, use, drawFS, bindTarget, target } from '../gl.js';

// Neutral camera targets (not tied to anything on the map).
const FOCUS = [[256, 192], [160, 140], [330, 250]];
const CELL = 4, GW = 128, GH = 96;
const focusWorld = (px) => [px[0] / CELL, 0, px[1] / CELL];

// f: frame info from main.js (time, shot, shotP, a = evaluated shot params)
export function cityCamera(f) {
  const t = f.time, v = f.shot.var ?? 0, P = f.shotP;
  const c = [GW / 2, 0, GH / 2];
  if (v === 0) { const a = t * 0.12; return { ro: [c[0] + Math.sin(a) * 70, 42, c[2] + Math.cos(a) * 70], ta: [c[0], 0, c[2]] }; }
  if (v === 1) { const x = -10 + P * 150; return { ro: [x, 9 + Math.sin(t * 0.5) * 2, 60 + Math.sin(t * 0.3) * 15], ta: [x + 20, 2, 40] }; }
  if (v === 2) {
    const pin = focusWorld(FOCUS[Math.round(f.a?.[1] ?? 0) % FOCUS.length]);
    const e = 1 - Math.pow(1 - Math.min(1, P * 1.4), 3);
    const a = t * 0.3;
    const dist = 70 - 52 * e, h = 60 - 44 * e;
    return { ro: [pin[0] + Math.sin(a) * dist, h, pin[2] + Math.cos(a) * dist], ta: [pin[0], 2, pin[2]] };
  }
  return { ro: [c[0], 105 - 25 * P, c[2] + 28], ta: [c[0], 0, c[2] - 4], roll: Math.sin(t * 0.2) * 0.15 };
}

// Shared by the bake pass and the scene.
const MAP = /* glsl */`
uniform sampler2D uImg;
float white(vec2 px){ // 1 = block, 0 = road. px in bottom-half map pixels
  px = clamp(px, vec2(0.), vec2(511., 383.));
  px.x = 511. - px.x; // the camera basis has screen-right = world -x: mirror so the map reads correctly
  return texelFetch(uImg, ivec2(px) + ivec2(0, 384), 0).r;
}
bool inGrid(vec2 c){ return !(c.x < 1. || c.y < 1. || c.x > ${GW - 2}. || c.y > ${GH - 2}.); }
// Full height of a building cell (0 = no building) and its growth-order hash.
vec2 cellBase(vec2 c){
  vec2 p = c*${CELL}.;
  float w = white(p + 2.) * white(p + vec2(.5,.5)) * white(p + vec2(3.5,.5)) * white(p + vec2(.5,3.5)) * white(p + vec2(3.5,3.5));
  float h = hash21(floor(c/2.));
  float district = fbm(c*.05);
  // empty lots / parks (h < .25) keep streets readable
  float hh = w < .5 || h < .25 ? 0. : .4 + pow(h, 5.)*9. + district*1.6;
  return vec2(hh, hash21(c));
}
`;

// Bake pass: one texel per cell, run once (the inputs never change).
const bake = MAP + /* glsl */`
void main(){ outColor = vec4(cellBase(floor(gl_FragCoord.xy)), 0., 1.); }`;

const frag = (baked) => MAP + /* glsl */`
uniform sampler2D uHeights;
uniform vec3 uCamPos, uCamTa;
uniform float uCamRoll;

float cellH(vec2 c){
  if(!inGrid(c)) return 0.;
  vec2 b = ${baked ? 'texelFetch(uHeights, ivec2(c), 0).rg' : 'cellBase(c)'};
  if(b.x <= 0.) return 0.;
  float grow = sat(uA.z*1.6 - b.y*.6);
  return grow > 0. ? b.x*grow + .05 : 0.;
}

void main(){
  vec2 uv = cuv();
  vec3 ro = uCamPos;
  vec3 rd = lookAt(ro, uCamTa, uCamRoll) * normalize(vec3(uv, 1.5));
  vec3 sky = mix(vec3(.02,.01,.05), vec3(.08,.02,.1), pow(sat(1. - rd.y), 4.));
  sky += step(.995, hash21(floor(rd.xz/max(rd.y,.05)*200.)))*.6*sat(rd.y*4.);
  vec3 col = sky;
  vec3 ca = hue(fract(uA.x)), cb = hue(fract(uA.x + .5));

  // ground plane y=0, DDA over building columns
  float tg = -ro.y/rd.y;
  float tb = (12. - ro.y)/rd.y;
  float tstart = rd.y < 0. ? max(tb, 0.) : 1e9;
  if(ro.y < 12.) tstart = 0.;
  float tHit = 1e9; vec3 nrm = vec3(0,1,0); vec2 hcell = vec2(-1);
  if(tstart < 1e8){
    vec3 p = ro + rd*tstart;
    vec2 cell = floor(p.xz);
    vec2 stp = sign(rd.xz);
    vec2 inv = 1./rd.xz;
    vec2 tDelta = abs(inv);
    vec2 tMax = ((cell + max(stp, 0.)) - ro.xz)*inv;
    float tEnter = tstart;
    nrm = vec3(0,1,0);
    for(int i=0;i<220;i++){
      if(tEnter > tg) break;
      float tExit = min(tMax.x, tMax.y);
      float h = cellH(cell);
      if(h > 0.){
        float yA = ro.y + rd.y*tEnter;
        if(yA <= h){ tHit = tEnter; hcell = cell; if(tEnter <= tstart + 1e-4) nrm = vec3(0,1,0); break; }
        float ty = (h - ro.y)/rd.y;
        if(ty >= tEnter && ty <= tExit){ tHit = ty; hcell = cell; nrm = vec3(0,1,0); break; }
      }
      tEnter = tExit;
      if(tMax.x < tMax.y){ cell.x += stp.x; tMax.x += tDelta.x; nrm = vec3(-stp.x,0,0); }
      else { cell.y += stp.y; tMax.y += tDelta.y; nrm = vec3(0,0,-stp.y); }
    }
  }
  float fogK = .006;
  if(tHit < tg && tHit < 1e8){
    vec3 p = ro + rd*tHit;
    float h = cellH(hcell);
    float roof = nrm.y > .5 ? 1. : 0.;
    vec3 base = mix(vec3(.05,.05,.09), vec3(.12,.1,.2), roof);
    // windows
    vec2 wuv = vec2(dot(p.xz, nrm.zx*vec2(1.,-1.)) + p.x*abs(nrm.y), p.y);
    vec2 wg = fract(wuv*vec2(3.,2.5));
    float win = step(.3, wg.x)*step(wg.x,.75)*step(.3, wg.y)*step(wg.y,.7)*(1.-roof);
    float lit = step(.55, hash21(floor(wuv*vec2(3.,2.5)) + hcell*7.));
    col = base + win*lit*mix(vec3(1.,.8,.5), ca, .3)*1.2;
    col += roof*ca*.15*smoothstep(.0,.2,fract(p.y - uTime*.5));
    col *= .7 + .3*sat(p.y/max(h,.01));
    col = mix(col, sky*.5, sat(1. - exp(-tHit*fogK)));
  } else if(rd.y < 0.){
    vec3 p = ro + rd*tg;
    vec2 px = p.xz*${CELL}.;
    float road = 1. - white(floor(px));
    bool inMap = px.x > 0. && px.y > 0. && px.x < 512. && px.y < 384.;
    col = vec3(.015,.01,.03);
    if(inMap){
      float flow = .5 + .5*sin(px.x*.15 + px.y*.15 - uTime*6.);
      col += road * mix(ca, cb, flow*.4) * (1.6 + .8*uPulse);
      col += (1. - road) * vec3(.03,.02,.06);
    }
    col = mix(col, sky*.5, sat(1. - exp(-tg*fogK)));
  }
  if(uVar > 2.5){
    // radar sweep
    vec3 gp = ro + rd*tg;
    vec2 d = gp.xz - vec2(${GW / 2}., ${GH / 2}.);
    float ang = mod(atan(d.y, d.x) - uTime*1.5, TAU);
    col += ca * exp(-ang*3.) * .25 * step(length(d), 80.);
  }
  if(uA.w > .5){
    float h = .13;
    float y0 = -.84;
    float x = uv.x/(h*.95) + uTextT*3.;
    float v = (y0 + h*.5 - uv.y)/h;
    float d = textDots(vec2(x, v), uRow, uLen, 0., .4);
    col = mix(col, vec3(0.), step(abs(uv.y - y0), h*.65)*.75);
    col += mix(ca, vec3(1.), .5)*d*2.;
  }
  outColor = vec4(col, 1.);
}`;

export default {
  name: 'city',
  custom: true,
  init(gl, prelude) {
    // Without float render targets, fall back to computing heights per step.
    this.baked = gl.float32;
    this.prog = program(gl, prelude + frag(this.baked), undefined, 'city');
    if (this.baked) this.bakeProg = program(gl, prelude + bake, undefined, 'city-bake');
  },
  render(gl, f, common, out, ctx) {
    const map = { tex: ctx.tex.map, unit: 4 };
    if (this.baked && !this.heights) {
      this.heights = target(gl, GW, GH, { format: 'f32', filter: gl.NEAREST });
      bindTarget(gl, this.heights);
      use(gl, this.bakeProg, { uImg: map });
      drawFS(gl);
    }
    const cam = cityCamera(f);
    bindTarget(gl, out);
    use(gl, this.prog, {
      ...common, uImg: map, uHeights: { tex: this.heights?.tex ?? null, unit: 5 },
      uCamPos: cam.ro, uCamTa: cam.ta, uCamRoll: cam.roll || 0,
    });
    drawFS(gl);
  },
};
