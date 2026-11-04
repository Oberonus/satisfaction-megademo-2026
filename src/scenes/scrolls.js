// 24 SCROLLS — a one-shot tribute: all 24 scrollers at once on a tilted
// departure-board plane. uRow = row of scroll #0 (24 consecutive rows).
// uA: x tilt, y hue, z speed
export default {
  name: 'scrolls',
  frag: /* glsl */`
uniform float uLens[24];
void main(){
  vec2 uv = cuv();
  float t = uTime;
  // tilt the board in perspective
  float k = uA.x;
  vec2 p = uv;
  p.y *= 1. + k*.2;
  p.x /= 1. - p.y*k*.35;
  p.xy *= rot(-.08*k);
  float lanes = 24.;
  float H = 2.2;
  float lane = floor((H*.5 - p.y)/H*lanes);
  vec3 col = vec3(.0,.0,.015);
  if(lane >= 0. && lane < lanes){
    float lh = H/lanes;
    float v = fract((H*.5 - p.y)/lh);
    float dir = mod(lane, 2.) < .5 ? 1. : -1.;
    float spd = (2. + hash11(lane)*5.)*uA.z;
    float len = uLens[int(lane)];
    float x = p.x/(lh*.9) + dir*uTextT*spd + lane*7.;
    float cov = textLine(vec2(x, (v - .08)/.84), uRow + lane, len + 6., 1., .22);
    float hl = step(.5, fract(uBeat*.5 + hash11(lane*3.)*.0)) * step(abs(lane - mod(floor(uBeat), 24.)), .5);
    vec3 lc = hue(fract(uA.y + lane/lanes*.35));
    col += lc*.06*(1. - step(.92, v));
    col = mix(col, mix(lc, vec3(1.), .55 + .45*hl), cov);
    col += lc*hl*.25;
  }
  col *= smoothstep(1.9, 1., abs(p.x)/max(aspect(),1.));
  outColor = vec4(col, 1.);
}`,
};
