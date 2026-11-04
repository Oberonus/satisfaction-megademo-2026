// ORBS — Ballmania II: eight shaded balls on impossible flight paths, with
// feedback light trails and a dot-matrix LED scroller.
// uVar: path (0 lissajous, 1 helix, 2 trefoil, 3 figure-8 swarm, 4 ring burst)
// uA: x speed, y spacing, z trail decay, w scroller on
// uB: x hue, y camera mode (0 orbit, 1 chase, 2 top)
import { program, use, drawFS, bindTarget, target, freeTarget } from '../gl.js';

const frag = /* glsl */`
uniform sampler2D uPrev;
uniform float uFresh;

vec3 path(float s){
  if(uVar < .5) return vec3(sin(s*1.3)*3.2, sin(s*1.7+1.)*1.5, cos(s*1.1)*3.2);
  if(uVar < 1.5) return vec3(cos(s*2.)*2.4, sin(s*.6)*2.2, sin(s*2.)*2.4);
  if(uVar < 2.5){ s *= .8; return vec3(sin(s)+2.*sin(2.*s), cos(s)-2.*cos(2.*s), -sin(3.*s)*1.5)*1.1; }
  if(uVar < 3.5) return vec3(sin(s)*3.6, sin(s*2.)*1.4, sin(s*3.)*1.2 + cos(s*.5)*1.5);
  return vec3(0.);
}
vec3 ball(int i){
  float fi = float(i);
  if(uVar > 3.5){
    float a = fi/8.*TAU + uTime*1.3;
    float r = 2. + 1.2*uPulse + sin(uTime*2. + fi)*.3;
    return vec3(cos(a)*r, sin(a*2. + uTime)*.6, sin(a)*r);
  }
  return path(uTime*uA.x - fi*uA.y);
}

void main(){
  vec2 uv = cuv();
  float t = uTime;
  vec3 ro, ta = vec3(0.);
  if(uB.y < .5){ float a = t*.4; ro = vec3(sin(a)*8.5, 2.2 + sin(t*.3), cos(a)*8.5); }
  else if(uB.y < 1.5){ vec3 lead = ball(0); ro = ball(7)*1.6 + normalize(ball(7) + vec3(.01))*3. + vec3(0., 2.5, 0.); ta = lead*.5; }
  else { ro = vec3(0.01, 11., 0.); }
  vec3 rd = lookAt(ro, ta, 0.) * normalize(vec3(uv, 1.5));

  vec3 col = mix(vec3(.0,.0,.01), vec3(.03,.0,.06), sat(uv.y*.5+.5));
  float tmin = 1e9; vec3 hn; vec3 hc;
  vec3 glow = vec3(0.);
  for(int i=0;i<8;i++){
    vec3 c = ball(i);
    vec3 bc = hue(fract(uB.x + float(i)*.07));
    vec3 oc = ro - c;
    float b = dot(oc, rd), q = dot(oc, oc) - .36;
    float h = b*b - q;
    if(h > 0.){ float tt = -b - sqrt(h); if(tt > 0. && tt < tmin){ tmin = tt; hn = normalize(oc + rd*tt); hc = bc; } }
    // closest approach glow
    float tc = max(-b, 0.);
    float dd = length(oc + rd*tc);
    glow += bc * .02/(dd*dd + .04);
  }
  // mirror floor
  float fy = -2.6;
  float tf = (fy - ro.y)/rd.y;
  if(tf > 0. && tf < tmin){
    vec3 p = ro + rd*tf;
    vec3 rr = reflect(rd, vec3(0,1,0));
    vec3 rg = vec3(0.);
    for(int i=0;i<8;i++){
      vec3 oc = p - ball(i); float b = dot(oc, rr);
      float dd = length(oc + rr*max(-b,0.));
      rg += hue(fract(uB.x + float(i)*.07)) * .03/(dd*dd + .05);
    }
    vec2 g = abs(fract(p.xz*.5) - .5);
    float line = smoothstep(.015, .0, min(g.x, g.y)) * exp(-tf*.06);
    col = rg*.6 + vec3(.2,.5,1.)*line*.35;
  }
  if(tmin < 1e8){
    vec3 L = normalize(vec3(.4, .9, -.3));
    float dif = sat(dot(hn, L));
    float spec = pow(sat(dot(reflect(rd, hn), L)), 40.);
    float fr = pow(1. - sat(dot(hn, -rd)), 3.);
    col = hc*(.15 + dif*.9) + spec*2. + fr*hc*1.5;
    col *= 1. + uPulse*.8;
  }
  col += min(glow, vec3(2.)) * (.6 + .5*uPulse);

  // dot-matrix LED scroller riding a sine
  if(uA.w > .5){
    float h = .2;
    float x = uv.x/(h*.95) + uTextT*3.2;
    float y0 = -.68 + sin(uv.x*2.1 + t*3.)*.06;
    float v = (y0 + h*.5 - uv.y)/h;
    float d = textDots(vec2(x, v), uRow, uLen, 0., .36);
    col = mix(col, col*.3, step(abs(uv.y - y0), h*.62)*.6);
    col += vec3(.4, 1., .9) * d * 2.2;
  }

  vec2 pv = (vUv - .5)*.985 + .5;
  vec3 prev = texture(uPrev, pv).rgb;
  if(!(prev.r==prev.r && prev.g==prev.g && prev.b==prev.b)) prev = vec3(0.);
  vec3 trail = prev * uA.z * (1. - uFresh);
  outColor = vec4(max(col, trail), 1.);
}`;

export default {
  name: 'orbs',
  custom: true,
  init(gl, prelude) {
    this.prog = program(gl, prelude + frag, undefined, 'orbs');
    this.a = null; this.b = null;
  },
  // Renders into its own ping-pong pair and returns the fresh target, so the
  // post pass reads it directly (no copy into the scene target).
  render(gl, f, common, out) {
    if (!this.a || this.a.w !== out.w || this.a.h !== out.h) {
      freeTarget(gl, this.a); freeTarget(gl, this.b);
      this.a = target(gl, out.w, out.h); this.b = target(gl, out.w, out.h);
      this.fresh = true;
    }
    const fresh = this.fresh || f.jumped || f.shotFrame === 0 || Math.abs(f.time - (this.lastTime ?? -9)) > 0.25;
    this.fresh = false; this.lastTime = f.time;
    bindTarget(gl, this.b);
    use(gl, this.prog, { ...common, uPrev: { tex: this.a.tex, unit: 3 }, uFresh: fresh ? 1 : 0 });
    drawFS(gl);
    [this.a, this.b] = [this.b, this.a];
    return this.a;
  },
};
