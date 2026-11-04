// GLENZ — translucent two-tone polyhedra, rendered with multi-layer
// transparency (the classic glenz vector, in 2026 glass), plus a 3D text ring.
// uVar: shape (0 octahedron, 1 dodecahedron, 2 icosahedron, 3 star)
// uA: x nested inner object, y crystal field (repetition), z ring scroller, w scale
// uB: x hue A, y hue B, z spin speed, w camera distance
export default {
  name: 'glenz',
  frag: /* glsl */`
const vec3 G[16] = vec3[16](
  vec3(.57735,.57735,.57735), vec3(-.57735,.57735,.57735), vec3(.57735,-.57735,.57735), vec3(.57735,.57735,-.57735),
  vec3(0.,.850651,.525731), vec3(0.,-.850651,.525731), vec3(.525731,0.,.850651), vec3(-.525731,0.,.850651),
  vec3(.850651,.525731,0.), vec3(-.850651,.525731,0.),
  vec3(0.,.356822,.934172), vec3(0.,-.356822,.934172), vec3(.934172,0.,.356822), vec3(-.934172,0.,.356822),
  vec3(.356822,.934172,0.), vec3(-.356822,.934172,0.));
vec3 gdf(int i){ return G[i]; }
// returns (distance, face id)
vec2 polyRange(vec3 p, float r, int a, int b, vec2 acc){
  for(int i=a;i<b;i++){
    float s = dot(p, G[i]);
    float as = abs(s);
    if(as > acc.x){ acc = vec2(as, float(i)*2. + step(0., s)); }
  }
  return acc;
}
vec2 poly(vec3 p, float r, float shape){
  vec2 acc = vec2(-1e9, 0.);
  if(shape > .5 && shape < 1.5) acc = polyRange(p, r, 4, 10, acc);
  else {
    acc = polyRange(p, r, 0, 4, acc);
    if(shape > 1.5) acc = polyRange(p, r, 10, 16, acc);
  }
  return vec2(acc.x - r, acc.y);
}
vec2 star(vec3 p, float r){
  // stella octangula: union of two tetrahedra
  float d1 = max(max(dot(p, gdf(0)), dot(p, -gdf(1))), max(dot(p, -gdf(2)), dot(p, -gdf(3))));
  float d2 = max(max(dot(p, -gdf(0)), dot(p, gdf(1))), max(dot(p, gdf(2)), dot(p, gdf(3))));
  vec3 q = p;
  float id = d1 < d2 ? floor(dot(sign(q), vec3(1,2,4)) + 8.) : floor(dot(sign(q), vec3(4,2,1)) + 20.);
  return vec2(min(d1, d2) - r*.6, id);
}
mat3 R1, R2;
vec2 obj(vec3 p){
  float s = uA.w;
  vec3 q = R1*p;
  vec2 o = uVar > 2.5 ? star(q, s) : poly(q, s, uVar);
  if(uA.x > .5){
    vec3 q2 = R2*p;
    vec2 i2 = poly(q2, s*.45, mod(uVar + 1., 3.));
    i2.y += 40.;
    if(abs(i2.x) < abs(o.x)) o = i2;
  }
  return o;
}
vec2 map(vec3 p){
  if(uA.y > .5){
    vec3 c = floor(p/6. + .5);
    p -= c*6.;
    float h = hash21(c.xy + c.z*7.);
    p.xy *= rot(h*6. + uTime*(h - .5));
  }
  return obj(p);
}
vec3 normal(vec3 p){ const vec2 k = vec2(1,-1); const float e = .001;
  return normalize(k.xyy*map(p + k.xyy*e).x + k.yyx*map(p + k.yyx*e).x + k.yxy*map(p + k.yxy*e).x + k.xxx*map(p + k.xxx*e).x); }
mat3 rotm(vec3 a){ mat2 x=rot(a.x), y=rot(a.y), z=rot(a.z);
  mat3 mx = mat3(1,0,0, 0,x[0][0],x[0][1], 0,x[1][0],x[1][1]);
  mat3 my = mat3(y[0][0],0,y[0][1], 0,1,0, y[1][0],0,y[1][1]);
  mat3 mz = mat3(z[0][0],z[0][1],0, z[1][0],z[1][1],0, 0,0,1);
  return mx*my*mz; }

vec3 back(vec3 rd){
  float a = atan(rd.y, rd.x);
  vec3 c = vec3(.01,.0,.03) + hue(fract(uB.y))*.06*(1. - abs(rd.y));
  c += hue(fract(uB.x))*.25*pow(sat(sin(a*12. + uTime*.5)*.5+.5), 30.)*sat(1. - length(rd.xy)*1.2);
  return c;
}

void main(){
  vec2 uv = cuv();
  float t = uTime, sp = uB.z;
  R1 = rotm(vec3(t*.7, t*.5, t*.3)*sp);
  R2 = rotm(-vec3(t*.9, t*.4, t*.6)*sp);
  vec3 ro, rd;
  if(uA.y > .5){
    ro = vec3(sin(t*.2)*2., cos(t*.17)*2., t*6.);
    rd = normalize(vec3(uv, 1.3));
    rd.xy *= rot(t*.2);
  } else {
    float dist = uB.w;
    ro = vec3(sin(t*.3)*.6, .3*sin(t*.4), -dist);
    rd = lookAt(ro, vec3(0.), .1*sin(t*.5)) * normalize(vec3(uv, 1.6));
  }
  vec3 ca = hue(fract(uB.x)), cb = hue(fract(uB.y));
  vec3 acc = vec3(0.); float trans = 1.;
  float d = 0.;
  float dmax = uA.y > .5 ? 40. : 12.;
  if(uA.y < .5){
    // Single centred object: everything lies inside a sphere of radius 1.8*scale
    // (the star's tetrahedra are the widest shape). Rays that miss it skip the
    // march entirely; rays that hit it stop marching once they leave it.
    float rb = 1.85*uA.w + .05;
    float b = dot(ro, rd), c = dot(ro, ro) - rb*rb, disc = b*b - c;
    dmax = disc > 0. ? min(dmax, -b + sqrt(disc)) : -1.;
  }
  for(int layer=0; layer<5; layer++){
    if(d > dmax) break;
    bool hit = false; vec2 h;
    for(int i=0;i<56;i++){
      h = map(ro + rd*d);
      if(abs(h.x) < .002){ hit = true; break; }
      d += abs(h.x)*.95;
      if(d > dmax) break;
    }
    if(!hit) break;
    vec3 p = ro + rd*d;
    vec3 n = normal(p);
    float facing = dot(n, -rd);
    float tone = hash11(h.y*3.1);
    vec3 fc = mix(ca, cb, step(.5, tone));
    if(h.y > 39.) fc = mix(vec3(1.), cb, .5);
    float alpha = facing > 0. ? .42 : .3;
    vec3 L = normalize(vec3(.5, .8, -.6));
    float dif = .4 + .6*abs(dot(n, L));
    float spec = pow(sat(dot(reflect(rd, n), L)), 60.)*3.;
    float fr = pow(1. - abs(facing), 3.);
    acc += trans*(fc*dif*alpha*1.4 + spec + fr*fc*.8 + fc*uPulse*.3*alpha);
    trans *= 1. - alpha;
    d += .02;
    if(trans < .03) break;
  }
  vec3 bgc = vec3(back(rd + vec3(.004,0,0)).r, back(rd).g, back(rd - vec3(.004,0,0)).b);
  vec3 col = acc + trans*bgc;
  if(uA.y > .5) col = mix(col, bgc, sat(d/40.));

  // 3D ring scroller around the object
  if(uA.z > .5){
    float R = 1.75*uA.w + .55, H = .36;
    vec3 o = ro; vec3 dir = rd;
    // tilt ring
    mat2 tl = rot(.38 + .08*sin(t*.5));
    o.yz *= tl; dir.yz *= tl;
    float a = dot(dir.xz, dir.xz), b = dot(o.xz, dir.xz), c = dot(o.xz, o.xz) - R*R;
    float disc = b*b - a*c;
    if(disc > 0.){
      float sq = sqrt(disc);
      for(int k=1;k>=0;k--){
        float tt = (-b + (k==0 ? -sq : sq))/a;
        if(tt < 0.) continue;
        vec3 p = o + dir*tt;
        float ang = atan(-p.x, -p.z);   // 0 at the front: the wrap seam sits behind the object
        float x = -ang/TAU*28. + uTextT*2.2;
        float v = (H*.5 - p.y)/H;
        float cov = textLine(vec2(x, k==0 ? v : v), uRow, uLen, 0., .18);
        vec3 tc = k==0 ? vec3(1.) : cb*.6;
        col = mix(col, tc*(k==0 ? 1.05 : .6), cov*(k==0 ? 1. : .5));
      }
    }
  }
  outColor = vec4(col, 1.);
}`,
};
