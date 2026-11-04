// Shared GLSL prelude prepended to every scene shader.
const HEADER = `#version 300 es
precision highp float;
precision highp int;
`;
const BODY = `
uniform vec2  uRes;      // render target size in px
uniform float uTime;     // global soundtrack seconds
uniform float uT;        // seconds since shot start
uniform float uP;        // shot progress 0..1
uniform float uBeat;     // beats since chapter start (fractional)
uniform float uBeatLen;  // seconds per beat
uniform float uPulse;    // 1 on each beat, decays
uniform float uBarPulse; // 1 on each bar, decays
uniform float uVar;      // shot variant
uniform vec4  uA;        // shot parameters
uniform vec4  uB;        // more shot parameters
uniform float uEnergy;   // live audio energy 0..1
uniform float uSeed;
uniform float uRow, uLen;   // primary scroller text row/length
uniform float uRow2, uLen2; // secondary scroller
uniform float uTextT;       // seconds the scroller has been running (continuous across shots)
uniform sampler2D uFont;
uniform sampler2D uText;

#define PI 3.14159265
#define TAU 6.2831853

mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
float hash11(float p){ p=fract(p*.1031); p*=p+33.33; p*=p+p; return fract(p); }
float hash21(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
vec2  hash22(vec2 p){ vec3 p3=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973)); p3+=dot(p3,p3.yzx+33.33); return fract((p3.xx+p3.yz)*p3.zy); }
vec3  hash33(vec3 p){ p=fract(p*vec3(.1031,.1030,.0973)); p+=dot(p,p.yxz+33.33); return fract((p.xxy+p.yxx)*p.zyx); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x), mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float a=.5, s=0.; for(int i=0;i<5;i++){ s+=a*noise(p); p=p*2.03+17.1; a*=.5; } return s; }
vec3 pal(float t, vec3 a, vec3 b, vec3 c, vec3 d){ return a + b*cos(TAU*(c*t+d)); }
vec3 hue(float h){ return clamp(abs(mod(h*6.+vec3(0,4,2),6.)-3.)-1., 0., 1.); }
float sat(float x){ return clamp(x,0.,1.); }
float ease(float x){ x=sat(x); return x*x*(3.-2.*x); }
float expo(float x){ x=sat(x); return x==1.?1.:1.-pow(2.,-10.*x); }

float aspect(){ return uRes.x/uRes.y; }

// ZX Spectrum bright palette
vec3 zx(int i){
  if(i==0) return vec3(0); if(i==1) return vec3(0,0,1); if(i==2) return vec3(1,0,0); if(i==3) return vec3(1,0,1);
  if(i==4) return vec3(0,1,0); if(i==5) return vec3(0,1,1); if(i==6) return vec3(1,1,0); return vec3(1);
}

mat3 lookAt(vec3 ro, vec3 ta, float roll){
  vec3 f=normalize(ta-ro); vec3 r=normalize(cross(vec3(sin(roll),cos(roll),0.), f));
  return mat3(r, cross(f,r), f);
}

`;
const FRAG_ONLY = `
// Centered coordinates: min dimension spans -1..1 (works in landscape and portrait).
vec2 cuv(){ return (gl_FragCoord.xy*2.-uRes)/min(uRes.x,uRes.y); }

// ---------- text engine (original ZX fonts) ----------
float glyph(vec2 f, float code, float font, float soft){
  if(f.x<0.||f.x>1.||f.y<0.||f.y>1.) return 0.;
  float slot = font*96.+code;
  vec2 cell = vec2(mod(slot,16.), floor(slot/16.));
  vec2 uv = (cell*18.+1.+f*16.)/vec2(288.,216.);
  float a = texture(uFont, uv).r;
  return smoothstep(.5-soft, .5+soft, a);
}
float charCode(float i, float row, float len){
  i = mod(floor(i), len);
  return floor(texelFetch(uText, ivec2(int(i), int(row)), 0).r*255.+.5);
}
// p.x: position in characters (scrolls by adding time), p.y: 0..1 top->bottom.
float textLine(vec2 p, float row, float len, float font, float soft){
  if(p.y<0.||p.y>1.) return 0.;
  float c = charCode(p.x, row, len);
  if(c<.5) return 0.;
  return glyph(vec2(fract(p.x)*1.08-.04, p.y), c, font, soft);
}
// Non-looping variant: blank outside [0,len).
float textOnce(vec2 p, float row, float len, float font, float soft){
  if(p.x<0.||p.x>=len) return 0.;
  return textLine(p,row,len,font,soft);
}
// Twisting ribbon scroller (screen space). Returns (coverage, facing).
// y0 = ribbon center, h = glyph height, both in cuv() units.
vec2 ribbon(vec2 uv, float y0, float h, float speed, float twist, float wave){
  float x = uv.x/(h*.9) + uTextT*speed;
  float yc = y0 + sin(uv.x*1.7 + uTextT*2.2)*wave;
  float ang = sin(x*.22 - uTextT*1.3)*1.15*twist;
  float c = cos(ang);
  float hh = h*max(abs(c),.04);
  float v = (yc + hh*.5 - uv.y)/hh;
  float cov = textLine(vec2(x, c>0. ? v : 1.-v), uRow, uLen, 0., .2);
  return vec2(cov, c);
}

// LED / dot-matrix rendering of the same text.
float textDots(vec2 p, float row, float len, float font, float radius){
  float aa = 16.*fwidth(p.y)+.02;
  if(p.y<0.||p.y>1.) return 0.;
  float c = charCode(p.x, row, len);
  if(c<.5) return 0.;
  vec2 g = vec2(fract(p.x), p.y)*16.;
  vec2 cellc = (floor(g)+.5)/16.;
  float on = glyph(cellc, c, font, .05);
  float d = length(fract(g)-.5);
  return on*smoothstep(radius+aa, radius-aa, d);
}
`;
export const PRELUDE = HEADER + 'in vec2 vUv;\nout vec4 outColor;\n' + BODY + FRAG_ONLY;
export const VERT_PRELUDE = HEADER + BODY;
