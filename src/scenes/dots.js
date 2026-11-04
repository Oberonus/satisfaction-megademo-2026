// WOW — 96 principal points, each leading a family of followers (61k points),
// morphing between mathematical "tables", plus giant stencil letters with a
// small scroller running *inside* them (text inside text).
// uVar: preset A, uB.x preset B (blend uA.x)
// uA: x blend, y spin, z point size, w stencil amount
// uB: x presetB, y big word row, z big word len, w hue
import { program, use, drawFS, bindTarget } from '../gl.js';
import { VERT_PRELUDE } from './common.js';

const N = 96, M = 640;

const vert = (prelude) => prelude + /* glsl */`
out vec3 vCol;
out float vMain;
vec3 preset(float k, float i, float j){
  float u = i/96.*TAU, v = j/${M}.*TAU, t = uTime;
  float jr = hash11(j*1.37 + i*.17);
  if(k < .5){ // torus knot p=2 q=3, followers form the tube
    float q = u*1. + t*.25, r = 2.2 + .9*cos(3.*q);
    vec3 c = vec3(r*cos(2.*q), r*sin(2.*q), 1.3*sin(3.*q));
    float tube = .55 + .25*uPulse;
    return c + tube*vec3(cos(v)*cos(q*2.), sin(v), cos(v)*sin(q*2.))*(j > 0. ? 1. : 0.);
  }
  if(k < 1.5){ // fibonacci sphere breathing
    float n = i*${M}. + j, tot = 96.*${M}.;
    float y = 1. - 2.*(n + .5)/tot, rr = sqrt(1. - y*y), a = n*2.39996;
    float R = 3. + .5*sin(a*.002 + t*2.) + .6*uPulse*sin(y*8. + t);
    return vec3(cos(a)*rr, y, sin(a)*rr)*R;
  }
  if(k < 2.5){ // interference sheet
    float gx = (mod(i, 12.) + fract(j/32.))/12. - .5, gz = (floor(i/12.) + floor(j/32.)/20.)/8. - .5;
    vec2 g = vec2(gx, gz)*9.;
    float h = sin(length(g - vec2(2,0))*2. - t*3.) + sin(length(g + vec2(2,0))*2. - t*3.);
    return vec3(g.x, h*.6, g.y);
  }
  // lissajous cloud with jitter
  float s = u + v*.02;
  return vec3(sin(s*3. + t)*3., sin(s*4. + t*.7)*2.2, sin(s*5. + t*1.3)*2.4) + (hash33(vec3(i,j,1.)) - .5)*.35;
}
void main(){
  float id = float(gl_VertexID);
  float i = floor(id/${M}.), j = mod(id, ${M}.);
  vec3 p = mix(preset(uVar, i, j), preset(uB.x, i, j), ease(uA.x));
  p.xz *= rot(uTime*uA.y);
  p.yz *= rot(.35 + .2*sin(uTime*.3));
  vec3 cam = vec3(0., 0., 9.5 - 1.2*uP);
  vec3 q = p - vec3(0.,0.,0.); q.z = cam.z - q.z;
  float s = min(uRes.x, uRes.y)*.5;
  vec2 sp = q.xy/q.z*1.6*s;
  gl_Position = vec4(sp/(uRes*.5), 0., 1.);
  vMain = j < .5 ? 1. : 0.;
  gl_PointSize = (vMain > .5 ? 7. : 2.2) * uA.z * (s/400.) * (9./q.z);
  vCol = vMain > .5 ? vec3(1.6) : mix(vec3(.35,.9,1.), hue(fract(uB.w + i/96.*.3)), .5) * (.35 + .4*hash11(j));
}`;

const pfrag = /* glsl */`#version 300 es
precision highp float;
in vec3 vCol; in float vMain;
out vec4 o;
void main(){
  vec2 c = gl_PointCoord - .5;
  float d = length(c);
  float a = smoothstep(.5, vMain > .5 ? .3 : .1, d);
  o = vec4(vCol*a, 1.);
}`;

const stencil = /* glsl */`
void main(){
  vec2 uv = cuv();
  float asp = aspect();
  float W = 2.*max(asp, 1.);  // visible width in cuv units
  float n = uB.z;
  float ch = min(W*.96/n, 1.7);
  vec2 lp = vec2((uv.x + ch*n*.5)/ch, (ch*.5 - uv.y)/ch);
  float m = textOnce(lp, uB.y, n, 0., .08);
  float edge = textOnce(lp, uB.y, n, 0., .3) - m;
  // small scroller inside the big letters: 6 lanes, alternating direction
  float lane = floor((uv.y + 1.)*7.);
  float dir = mod(lane, 2.)*2. - 1.;
  float lh = 2./7.;
  vec2 sp = vec2(uv.x/(lh*.55) + dir*uTextT*4. + lane*13., fract((uv.y + 1.)*7.)*-1. + 1.);
  sp.y = (sp.y - .15)/.7;
  float small = textLine(sp, uRow, uLen, 1., .2);
  vec3 fill = mix(vec3(.25,.0,.25), vec3(.9,.05,.6), .4 + .6*uPulse);
  vec3 col = mix(fill, vec3(1.), small);
  float a = m * uA.w;
  outColor = vec4(col + vec3(1.,.3,.9)*max(edge,0.)*2., max(a, max(edge,0.)*uA.w));
}`;

const bgfrag = /* glsl */`
void main(){
  vec2 uv = cuv();
  vec3 c = mix(vec3(0.,.0,.02), vec3(.02,.0,.05), sat(1.-length(uv)*.6));
  outColor = vec4(c, 1.);
}`;

export default {
  name: 'dots',
  custom: true,
  init(gl, prelude) {
    this.points = program(gl, pfrag, vert(VERT_PRELUDE), 'dots-points');
    this.stencil = program(gl, prelude + stencil, undefined, 'dots-stencil');
    this.bg = program(gl, prelude + bgfrag, undefined, 'dots-bg');
    this.vao = gl.createVertexArray();
  },
  render(gl, f, common, out) {
    bindTarget(gl, out);
    use(gl, this.bg, common); drawFS(gl);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    use(gl, this.points, common);
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.POINTS, 0, N * M);
    if (common.uA[3] > 0.001) {
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      use(gl, this.stencil, common); drawFS(gl);
    }
    gl.disable(gl.BLEND);
  },
};
