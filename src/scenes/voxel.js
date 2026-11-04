// VOXEL — extrudes an original 1-bit/multicolor bitmap into 3D pixel columns
// with exact 2D DDA traversal. Used for the SATISFACTION logo and the
// Multicolor picture.
// uVar camera: 0 front drift, 1 grazing sweep, 2 low flyover, 3 orbit, 5 flat 2D raster mode
// uA: x mode (0 logo, 1 picture), y explode, z depth, w wave
// uB: x background (0 dark, 1 ZX loading stripes, 2 gradient), y zoom, z scanline color cycle
export default {
  name: 'voxel',
  textures: ['img'],
  frag: /* glsl */`
uniform sampler2D uImg;
uniform vec2 uImgSize;

vec4 texel(vec2 c){ return texelFetch(uImg, ivec2(int(c.x), int(uImgSize.y-1.-c.y)), 0); }
float lum(vec3 c){ return dot(c, vec3(.3,.59,.11)); }

void column(vec2 c, out float on, out float z0, out float z1){
  vec4 tx = texel(c);
  float l = max(max(tx.r, tx.g), tx.b);
  on = step(.08, l);
  float h = hash21(c + 7.);
  float depth = uA.x < .5 ? uA.z : 1. + lum(tx.rgb)*uA.z;
  float wv = sin(c.x*.09 + uTime*2.6) * cos(c.y*.11 - uTime*1.7) * uA.w;
  wv += uPulse * uA.w * .6 * sin(c.x*.3 + c.y*.2);
  z0 = -h*h*uA.y*90. + wv;
  z1 = z0 + depth;
}

vec3 stripes(vec2 fc){
  float y = fc.y/uRes.y;
  float band = floor(y*24. + uTime*37. + hash11(floor(uTime*12.))*8.);
  int a = int(hash11(band)*7.99);
  return zx(a)*.8;
}

void main(){
  vec2 uv = cuv();
  vec2 S = uImgSize;
  vec3 bg = vec3(0.);
  if(uB.x > .5 && uB.x < 1.5) bg = stripes(gl_FragCoord.xy) * .35;
  else if(uB.x > 1.5) bg = mix(vec3(.02,.0,.06), vec3(.0,.08,.12), vUv.y);

  if(uVar > 4.5){
    // ---- flat raster mode: scanline color cycling + pixel melt ----
    float sc = min(uRes.x, uRes.y);
    vec2 p = (gl_FragCoord.xy - uRes*.5) / (sc*.92/S.y) * (1. - .08*uB.y*uP) + S*.5;
    float melt = uA.y * noise(vec2(floor(p.x)*.35, uTime*.4)) * 40. * smoothstep(.0,1.,uP);
    p.y += melt;
    vec3 col = bg;
    if(p.x >= 0. && p.y >= 0. && p.x < S.x && p.y < S.y){
      vec4 tx = texel(floor(p));
      float row = floor(S.y - p.y);
      vec3 rc = hue(fract(row*.013 - uTime*.6));
      col = mix(tx.rgb, tx.rgb*rc*1.35, uB.z * step(.08, lum(tx.rgb)));
      // reveal in raster bands
      float rev = step(fract(row/8.)*.15 + row/S.y*.85, uP*2.2);
      col *= rev;
      col += (1.-rev) * step(abs(row/S.y*.85 - uP*2.2 + .02), .01) * vec3(.5,1.,1.);
      col *= 1.05 + .4*uPulse;
    }
    outColor = vec4(col, 1.);
    return;
  }

  // ---- 3D voxel mode ----
  float W = S.x, Hh = S.y;
  float t = uTime;
  vec3 ctr = vec3(W*.5, Hh*.5, 0.);
  float asp = aspect();
  float dist = 1.62*max(W*.5/max(asp, 1.), Hh*.5*max(1./asp, 1.)) * (1. - .25*uB.y*uP);
  vec3 ro, ta = ctr; float roll = 0.;
  if(uVar < .5){ ro = ctr + vec3(sin(t*.3)*W*.18, cos(t*.23)*Hh*.15, -dist); }
  else if(uVar < 1.5){ float a = -.9 + uP*1.8; ro = ctr + vec3(sin(a)*dist*.9, -Hh*.35, -cos(a)*dist*.9); roll = .2*sin(t*.7); }
  else if(uVar < 2.5){ ro = vec3(mix(-W*.1, W*1.1, uP), Hh*.25, -Hh*.35); ta = ro + vec3(W*.25, Hh*.5, Hh*.6); }
  else { float a = t*.5; ro = ctr + vec3(sin(a)*dist, sin(t*.31)*Hh*.4, -cos(a)*dist); }
  vec3 rd = lookAt(ro, ta, roll) * normalize(vec3(uv, 1.5));

  float zmin = -uA.y*90. - uA.w - 1., zmax = max(uA.z, 1. + uA.z) + uA.w + 2.;
  vec3 bmin = vec3(0., 0., zmin), bmax = vec3(W, Hh, zmax);
  vec3 inv = 1./rd;
  vec3 t0 = (bmin - ro)*inv, t1 = (bmax - ro)*inv;
  vec3 tn = min(t0, t1), tf = max(t0, t1);
  float tin = max(max(tn.x, tn.y), max(tn.z, 0.)), tout = min(min(tf.x, tf.y), tf.z);
  vec3 col = bg;
  if(tin < tout){
    vec3 p = ro + rd*(tin + 1e-3);
    vec2 cell = floor(clamp(p.xy, vec2(0.), S - 1.));
    vec2 stp = sign(rd.xy);
    vec2 tDelta = abs(1./rd.xy);
    vec2 tMax = ((cell + max(stp, 0.)) - ro.xy) * inv.xy;
    float tEnter = tin; vec3 nrm = vec3(0.);
    // normal of the face we entered the box through
    if(tn.x >= tn.y && tn.x >= tn.z) nrm = vec3(-stp.x,0,0); else if(tn.y >= tn.z) nrm = vec3(0,-stp.y,0); else nrm = vec3(0,0,-sign(rd.z));
    bool hit = false; float th = 0.; vec2 hc;
    for(int i=0;i<460;i++){
      float tExit = min(min(tMax.x, tMax.y), tout);
      float on, z0, z1; column(cell, on, z0, z1);
      if(on > .5){
        float zA = ro.z + rd.z*tEnter;
        if(zA >= z0 && zA <= z1){ hit = true; th = tEnter; hc = cell; break; }
        float tz = ((rd.z > 0. ? z0 : z1) - ro.z) / rd.z;
        if(tz >= tEnter && tz <= tExit){ hit = true; th = tz; hc = cell; nrm = vec3(0,0,-sign(rd.z)); break; }
      }
      if(tExit >= tout) break;
      tEnter = tExit;
      if(tMax.x < tMax.y){ cell.x += stp.x; tMax.x += tDelta.x; nrm = vec3(-stp.x,0,0); }
      else { cell.y += stp.y; tMax.y += tDelta.y; nrm = vec3(0,-stp.y,0); }
      if(cell.x < 0. || cell.y < 0. || cell.x >= W || cell.y >= Hh) break;
    }
    if(hit){
      vec4 tx = texel(hc);
      vec3 base = tx.rgb;
      if(uB.z > .5) base = mix(base, base*hue(fract(hc.y*.013 - t*.6))*2., .7);
      vec3 L = normalize(vec3(-.5, .7, -.6));
      float dif = .35 + .65*sat(dot(nrm, L));
      float face = nrm.z < -.5 ? 1. : .55;
      col = base * dif * face;
      col += base * uPulse * .35 * face;
      // fake ambient occlusion along the side
      vec3 hp = ro + rd*th;
      float z0, z1, on; column(hc, on, z0, z1);
      if(nrm.z > -.5) col *= .5 + .5*sat((hp.z - z0)/max(z1 - z0, .01));
      col = mix(col, bg, sat(th/(dist*4.)));
    }
  }
  outColor = vec4(col, 1.);
}`,
};
