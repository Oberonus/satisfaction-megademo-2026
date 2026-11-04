// STARS — the intro's space and crawl, used for the epilogue.
// uVar: 0 starfield + perspective crawl, 1 hyperspace streaks, 2 calm drift
// uA: x warp speed, y crawl on, z crawl columns, w hue
export default {
  name: 'stars',
  frag: /* glsl */`
vec3 starLayer(vec2 uv, float z, float sc){
  vec2 g = uv*sc;
  vec2 id = floor(g); vec2 f = fract(g) - .5;
  vec2 h = hash22(id + z*13.1);
  vec2 o = (h - .5)*.7;
  float d = length(f - o);
  float b = smoothstep(.06, .0, d) * step(.6, h.x);
  return vec3(b) * mix(vec3(.6,.8,1.), vec3(1.,.8,.6), h.y);
}
void main(){
  vec2 uv = cuv();
  float t = uTime;
  vec3 col = vec3(0.);
  vec3 tint = hue(fract(uA.w));
  if(uVar > .5 && uVar < 1.5){
    // hyperspace: radial streaks
    float a = atan(uv.y, uv.x), r = length(uv);
    float seg = floor(a/TAU*180.);
    float h = hash11(seg);
    float spd = uA.x*(1. + h);
    float z = fract(h*7. + t*spd*.25);
    float streak = smoothstep(.0, .01, r - z*z*2.) * smoothstep(.12*uA.x + .02, .0, r - z*z*2.);
    float lane = smoothstep(.45, .0, abs(fract(a/TAU*180.) - .5));
    col = mix(tint, vec3(1.), h) * streak * lane * 2.;
    col += tint * .15 * exp(-r*2.);
  } else {
    for(int i=0;i<4;i++){
      float z = fract(float(i)*.25 + t*.03*(1. + uA.x*4.));
      float sc = mix(30., 2., z);
      col += starLayer(uv + vec2(t*.01, 0.), float(i), sc) * smoothstep(0., .3, z) * smoothstep(1., .8, z);
    }
    col += tint*.04*fbm(uv*1.5 + t*.05);
  }
  if(uA.y > .5){
    // perspective crawl on a tilted plane
    float horizon = .62;
    // The nearest fully visible line spans about ±1.32 units: on frames narrower
    // than ~4:3, zoom the plane out around the horizon so whole lines fit.
    // (16:9 and wider: fit = 1, unchanged.)
    float fit = max(1., 1.5/max(aspect(), 1.));
    vec2 cp = vec2(uv.x, uv.y - horizon)*fit;
    float y = cp.y;
    if(y < 0.){
      float z = 1.25/(-y);
      float cols = uA.z;
      float x = cp.x*z*3.6;
      float lineH = 1.25;
      float s = uTextT*(uB.x > 0. ? uB.x : 1.6) + 3. - z;
      float line = floor(s/lineH);
      float v = fract(s/lineH)*1.35 - .1;
      float cx = x/1. + cols*.5;
      float cov = 0.;
      if(line >= 0. && cx >= 0. && cx < cols) cov = textOnce(vec2(line*cols + cx, v), uRow, uLen, 0., .25);
      float fade = smoothstep(16., 7., z) * smoothstep(1.35, 2.1, z);
      col = mix(col, mix(vec3(1.,.9,.3), tint, .25)*1.5, cov*fade);
    }
  }
  outColor = vec4(col, 1.);
}`,
};
