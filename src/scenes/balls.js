// BALLMANIA — an endless field of chrome balls riding beat-launched ripples.
// uVar: camera (0 sweep, 1 top-down, 2 tracking, 3 macro, 4 orbit block)
// uA: x style (0 chrome, 1 neon, 2 zx), y wave mode, z metaball blend, w scroller
// uB: x hue shift, y floor mirror, z ribbon twist
export default {
  name: 'balls',
  frag: /* glsl */`
float R = .42;
// Highest point any ball surface can reach: max wave (mode 0: 1.7*2.02 + .25)
// + radius with beat swell (R*1.15) + metaball blend (k/4), plus a margin.
// Nothing but empty space exists above it.
const float TOP = 4.6;

// Ripple decay per ring, exp(-age*.6), depends only on the beat: set once per pixel.
float ripAge[4], ripDecay[4];

float wave(vec2 c){
  float t = uTime, m = uA.y, h = 0.;
  float r = length(c);
  if(m < .5){
    for(int i=0;i<4;i++){
      float x = r - ripAge[i]*5.5;
      h += exp(-x*x*.35) * ripDecay[i];
    }
    h = h*1.7 + .25*sin(r*.6 - t*2.);
  } else if(m < 1.5){
    h = sin(c.x*.55 + t*3.)*cos(c.y*.4 - t*2.1)*1.2;
  } else if(m < 2.5){
    h = (sin(length(c-vec2(5,0))*.8 - t*4.) + sin(length(c+vec2(5,0))*.8 - t*4.))*.6;
  } else {
    // queue propagation: every column follows the previous one (original wave machine)
    h = sin(t*3.6 - c.x*.55 + sin(c.y*.3+t)*1.2)*1.1 + uPulse*.6*sin(c.y*.9);
  }
  return h;
}

vec2 cellClamp(vec2 id){
  if(uVar > 3.5) return clamp(id, vec2(-6.,-5.), vec2(6.,4.));
  return id;
}

float smin(float a, float b, float k){ float h=max(k-abs(a-b),0.)/k; return min(a,b)-h*h*k*.25; }

vec2 map(vec3 p){
  vec2 id = round(p.xz);
  vec2 o = sign(p.xz - id + 1e-4);
  float d = 1e9; float best = 0.;
  float k = uA.z;
  for(int i=0;i<4;i++){
    vec2 c = cellClamp(id + vec2(i==1||i==3 ? o.x : 0., i>=2 ? o.y : 0.));
    vec3 q = p - vec3(c.x, wave(c), c.y);
    float s = length(q) - R*(1. + .15*uPulse);
    if(k > .01) d = smin(d, s, k); else d = min(d, s);
    if(s < d + .01) best = hash21(c);
  }
  float fl = p.y + 2.4;
  if(fl < d) return vec2(fl, -1.);
  return vec2(d, best);
}

vec3 normal(vec3 p){ const vec2 k = vec2(1,-1); const float e = .001;
  return normalize(k.xyy*map(p + k.xyy*e).x + k.yyx*map(p + k.yyx*e).x + k.yxy*map(p + k.yxy*e).x + k.xxx*map(p + k.xxx*e).x); }

vec3 c1, c2;
vec3 env(vec3 r){
  vec3 c = mix(vec3(.01,.01,.02), vec3(.04,.03,.08), sat(r.y*.5+.5));
  float a = atan(r.z, r.x);
  c += c1 * 3.5 * smoothstep(.2,.0,abs(r.y-.45)) * step(.0, sin(a*5. + uTime*.5));
  c += c2 * 2.5 * pow(sat(dot(r, normalize(vec3(-.6,.3,-.7)))), 12.);
  c += vec3(1.) * 6. * smoothstep(.97,.995, r.y);
  return c;
}

void main(){
  vec2 uv = cuv();
  float t = uT, gt = uTime;
  float hs = uB.x;
  c1 = hue(fract(.55 + hs)) ; c2 = hue(fract(.9 + hs));
  vec3 ro, ta; float roll = 0., fov = 1.6;
  if(uVar < .5){ ro = vec3(sin(gt*.23)*9., 2.8 + sin(gt*.4), -13. + gt*.6); ta = vec3(0., -.5, gt*.6); }
  else if(uVar < 1.5){ ro = vec3(0., 17., gt*.3 - 4.); ta = vec3(0., 0., gt*.3); roll = .3*sin(gt*.15); fov = 1.9; }
  else if(uVar < 2.5){ ro = vec3(gt*2.2, .9, -6.5); ta = ro + vec3(2., -.6, 4.); roll = .15*sin(gt); }
  else if(uVar < 3.5){ ro = vec3(gt*1.4, 2.2, sin(gt*.5)*1.5+.5); ta = ro + vec3(1.6, -1.3, 1.2); fov = 1.3; }
  else { float a = t*.35 + 1.; ro = vec3(sin(a)*10.5, 5., cos(a)*10.5); ta = vec3(0., -.5, 0.); }
  vec3 rd = lookAt(ro, ta, roll) * normalize(vec3(uv, fov));
  for(int i=0;i<4;i++){ ripAge[i] = fract(uBeat) + float(i); ripDecay[i] = exp(-ripAge[i]*.6); }

  // Only march the slab below TOP: start where the ray enters it, stop where it leaves.
  float d = 0., dend = 60., glow = 0.; vec2 h = vec2(0.);
  if(ro.y > TOP) d = rd.y < 0. ? (TOP - ro.y)/rd.y : 61.;
  if(rd.y > 0.) dend = min(dend, (TOP - ro.y)/rd.y);
  for(int i=0;i<110;i++){
    if(d > dend){ d = 61.; break; }
    vec3 p = ro + rd*d;
    h = map(p);
    if(h.y >= 0.) glow += .004/(.03 + h.x*h.x*10.);
    if(h.x < .001*d || d > 60.) break;
    d += h.x*.85;
  }
  vec3 bg = mix(vec3(.0,.0,.01), c1*.05, sat(uv.y*.5+.5));
  vec3 col = bg;
  if(d < 60.){
    vec3 p = ro + rd*d;
    vec3 n = normal(p);
    vec3 r = reflect(rd, n);
    float fr = pow(1. - sat(dot(n, -rd)), 4.);
    if(h.y < 0.){
      // mirror floor with fine grid
      vec2 g = abs(fract(p.xz + .5) - .5);
      float line = smoothstep(.02, .0, min(g.x, g.y)) * .4;
      vec3 rr = reflect(rd, vec3(0,1,0));
      // cheap reflection: march the ball field from floor
      float d2 = .05, d2end = min(20., (TOP - p.y)/rr.y); vec2 h2;
      for(int i=0;i<40;i++){
        if(d2 > d2end){ d2 = 21.; break; }
        h2 = map(p + rr*d2); if(h2.x<.01||d2>20.) break; d2 += h2.x;
      }
      vec3 refl = d2 < 20. ? mix(c1, c2, h2.y) * (.6 + 1.2*uPulse) : env(rr)*.3;
      col = refl * uB.y * .5 + c1*line*.4;
    } else if(uA.x < .5){
      vec3 base = env(r);
      col = base * (.25 + .75*fr) + base*.35;
      col *= mix(vec3(1.), mix(c1, c2, h.y), .25);
    } else if(uA.x < 1.5){
      vec3 em = hue(fract(h.y*.3 + hs + p.y*.08)) ;
      float dif = .25 + .75*sat(dot(n, normalize(vec3(.3,.9,-.4))));
      col = em * (.12 + .35*dif + 1.2*uPulse*step(.75, h.y)) + env(r)*fr*.9;
    } else {
      int k = 1 + int(floor(h.y*6.99));
      col = zx(k) * (.35 + .65*sat(dot(n, normalize(vec3(.4,.8,-.3))))) + fr*.4;
    }
    col = mix(col, bg, sat(d/60.));
  }
  col += mix(c1, c2, .5) * min(glow*.03, .45);

  // twisting ribbon scroller
  if(uA.w > .5){
    vec2 rb = ribbon(uv, -.55 + .1*sin(gt*.7), .32, 2.6, uB.z, .07);
    vec2 sh = ribbon(uv + vec2(-.015, .02), -.55 + .1*sin(gt*.7), .32, 2.6, uB.z, .07);
    col = mix(col, vec3(0.), sh.x*.7);
    vec3 tc = rb.y > 0. ? vec3(1.) : c2*1.2;
    col = mix(col, tc*1.6, rb.x);
  }
  outColor = vec4(col, 1.);
}`,
};
