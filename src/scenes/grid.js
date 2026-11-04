// GRID — neon line worlds for the greetings. Original "zooming grid" grown up.
// uVar: 0 corridor, 1 twin planes, 2 infinite zoom squares, 3 inside a grid sphere, 4 LED floor scroller
// uA: x hue, y speed, z roll amount, w line density
export default {
  name: 'grid',
  frag: /* glsl */`
float gridLine(vec2 p, float w){
  vec2 g = abs(fract(p) - .5);
  vec2 fw = fwidth(p) + 1e-4;
  vec2 l = smoothstep(w + fw, w - fw*.5, .5 - g);
  // distance-aware fade fights moire
  float fade = sat(1. - max(fw.x, fw.y)*2.5);
  return max(l.x, l.y) * fade;
}

void main(){
  vec2 uv = cuv();
  float t = uTime, sp = uA.y;
  vec3 ca = hue(fract(uA.x)), cb = hue(fract(uA.x + .33));
  vec3 col = vec3(0.);
  float zpush = uBeat*sp;
  uv *= rot(uA.z * sin(t*.4) + uA.z*.5*uP);

  if(uVar < .5){
    // square corridor
    float r = max(abs(uv.x), abs(uv.y));
    float z = 1./max(r, 1e-3);
    vec2 wall = abs(uv.x) > abs(uv.y) ? vec2(uv.y/abs(uv.x), z) : vec2(uv.x/abs(uv.y), z);
    vec2 g = vec2(wall.x*2.*uA.w, wall.y + zpush);
    float l = gridLine(g, .03);
    float seg = floor(wall.y + zpush);
    float flash = step(.85, hash11(seg)) * (.5 + 2.*uPulse);
    col = mix(ca, cb, step(.5, fract(seg*.5))) * l * (1. + flash);
    col += ca * flash * .08 * (1. - l);
    col *= sat(r*1.6);
  } else if(uVar < 1.5){
    // floor and ceiling planes
    float y = uv.y + .12*sin(t*.5);
    float z = .7/max(abs(y), 1e-3);
    vec2 g = vec2(uv.x*z*uA.w, z + zpush);
    float l = gridLine(g, .035);
    vec3 c = y < 0. ? ca : cb;
    col = c * l * sat(1.5 - z*.05) * 1.4;
    col += c * .2 * exp(-abs(y)*8.);
    // sun
    float sun = smoothstep(.36, .34, length(uv - vec2(0., .02)));
    col += sun * mix(cb, vec3(1.), .3) * .8 * step(.0, sin((uv.y)*60. - t*4.) + .4*(uv.y+.3)*4.);
  } else if(uVar < 2.5){
    // infinite zoom of nested squares (log scale)
    float r = max(abs(uv.x), abs(uv.y));
    float lr = log2(r) - uBeat*sp*.25;
    float k = fract(lr*2.);
    float edge = smoothstep(.06, .0, abs(k - .5) - .38) ;
    float idx = floor(lr*2.);
    col = mix(ca, cb, mod(idx, 2.)) * (smoothstep(.0, .06, .5 - abs(k - .5)) * .15 + edge*1.2);
    vec2 g = uv / exp2(floor(lr*2.)*.5) * 4.;
    col += mix(cb, ca, mod(idx,2.)) * gridLine(g, .02) * .5;
    col *= sat(r*3.);
  } else if(uVar < 3.5){
    // inside a lat/long sphere
    vec3 rd = normalize(vec3(uv, 1.1));
    rd.xz *= rot(t*.3); rd.yz *= rot(sin(t*.2)*.5);
    vec2 s = vec2(atan(rd.z, rd.x)/TAU, acos(rd.y)/PI);
    vec2 g = vec2(s.x*24.*uA.w, s.y*12.*uA.w + uBeat*sp*.1);
    float l = gridLine(g, .03);
    col = mix(ca, cb, s.y) * l * 1.5;
    float ring = exp(-pow((s.y - fract(uBeat*.25))*30., 2.));
    col += cb * ring * l * 4.;
  } else {
    // LED floor scroller seen from above at an angle
    float y = uv.y - .1;
    float z = .9/max(-y, 1e-3);
    vec2 w = vec2(uv.x*z, z);
    float l = gridLine(w*2., .02);
    col = ca*l*.6*sat(1. - z*.04)*step(y, 0.);
    vec2 tp = vec2(w.x*.9 + uTextT*3.5, (2.733 - w.y)*.75);
    float tl = textDots(vec2(tp.x, tp.y), uRow, uLen, 0., .42) * step(y, 0.);
    col += mix(cb, vec3(1.), .5) * tl * 2.6 * sat(1.6 - z*.05);
  }
  col *= .9 + .3*uPulse;
  outColor = vec4(col, 1.);
}`,
};
