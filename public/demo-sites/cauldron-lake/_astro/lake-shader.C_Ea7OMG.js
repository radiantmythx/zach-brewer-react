var e=`
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform vec3 u_mouse;      // px (origin bottom-left), z = 1 when the pointer is over the canvas
uniform sampler2D u_sim;    // ripple height field (R), see core/three/ripples.ts
uniform float u_horizon;    // where the far shore sits (rises when looking down from the rim)
uniform float u_approach;   // 0 far from the island … 1 at its windows
uniform float u_mist;       // shore mist (shop, 404)
uniform float u_warm;       // lantern-lit interior (workshop)
uniform float u_lantern;    // a lantern on the dock (contact)
uniform vec3  u_tint;       // the product's colour, for the moon path and water
uniform float u_tintAmt;
uniform float u_pines;      // foreground pines (fewer where content needs room)
out vec4 outColor;

#define PI 3.14159265
vec3 hex(int h) { return vec3(float((h >> 16) & 255), float((h >> 8) & 255), float(h & 255)) / 255.0; }

float hash11(float p) { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash21(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1, 0)), u.x), mix(hash21(i + vec2(0, 1)), hash21(i + vec2(1, 1)), u.x), u.y);
}
float noise1(float x) { float i = floor(x), f = fract(x); return mix(hash11(i), hash11(i + 1.0), f * f * (3.0 - 2.0 * f)); }
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
// Coverage of a signed distance measured in "p" units (1.0 = canvas height): 1 inside (d < 0).
// Uses the known pixel size instead of fwidth so it is safe inside divergent branches.
float aa(float d) { return clamp(0.5 - d * u_res.y, 0.0, 1.0); }


#define NIGHT   hex(0x011327)
#define DEEP    hex(0x072950)
#define DEEP2   hex(0x0b305b)
#define LAKE    hex(0x133e70)
#define LAKEN   hex(0x17467a)
#define SHALL   hex(0x234e7f)
#define CLOUDC  hex(0x2d5786)
#define SLATE   hex(0x405371)
#define SMOKE   hex(0x919ba6)
#define MOONC   hex(0xf5dfc0)
#define MOONSH  hex(0xc4b6a3)
#define GLIT    hex(0xcabca8)
#define LANTERN hex(0xf6b750)
#define EMBER   hex(0xf2bc6d)
#define MOSS    hex(0x444528)
#define CEDAR   hex(0x442d20)
#define ROCK    hex(0x112336)
#define PINEC   hex(0x061a2b)
#define FGPINE  hex(0x001123)

float HY;                        // horizon (far shore), from u_horizon
const vec2  MOONP = vec2(-0.21, 0.30);
const float MR = 0.064;
const float CAMH = 0.1;
const float SPEED = 0.18;
const float IX = 0.035;          // island centre
float IB;                        // island waterline (drops as we approach)
const float IW = 0.2;
float ISC;                       // island scale (grows as we approach)
vec2 toI(vec2 p) { return (p - vec2(IX, IB)) / ISC + vec2(IX, IB); }

float ridgeY(float x) {
  float side = smoothstep(0.0, 0.85, abs(x + 0.03));
  float r1 = 1.0 - abs(noise1(x * 4.0 + 3.1) * 2.0 - 1.0);
  float r2 = 1.0 - abs(noise1(x * 11.0 + 9.7) * 2.0 - 1.0);
  return HY + 0.05 + 0.13 * side + 0.055 * r1 * r1 * (0.35 + side) + 0.012 * r2;
}

float cloudSDF(vec2 p, vec2 c, float hw, float h, float seed) {
  float d = 1e3;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float ox = (fi - 1.5) / 1.5 * hw * 0.5 + (hash11(seed + fi) - 0.5) * hw * 0.25;
    float r = h * (0.6 + 0.4 * hash11(seed * 3.1 + fi)) * (1.0 - 0.4 * abs(fi - 1.5) / 1.5);
    d = min(d, length(p - vec2(c.x + ox, c.y)) - r);
  }
  vec2 q = (p - c) / vec2(hw * 1.35, h * 0.24);
  d = min(d, (length(q) - 1.0) * h * 0.24);
  return max(d, c.y - h * 0.1 - p.y);
}

vec3 clouds(vec2 p, vec3 col, float t) {
  float drift = t * 0.004;
  vec4 C[5] = vec4[5](
    vec4(-0.62, 0.19, 0.21, 0.036), vec4(0.30, 0.25, 0.17, 0.032), vec4(0.70, 0.16, 0.22, 0.03),
    vec4(-0.02, 0.37, 0.09, 0.016), vec4(-0.98, 0.33, 0.15, 0.024));
  for (int i = 0; i < 5; i++) {
    vec4 c = C[i];
    float d = cloudSDF(p, vec2(c.x + drift * (1.0 + float(i) * 0.3), c.y), c.z, c.w, float(i) * 13.0 + 1.0);
    float a = aa(d);
    float rim = smoothstep(c.y + c.w * 0.2, c.y + c.w * 1.1, p.y);
    float towardMoon = exp(-length(p - MOONP) * 2.5);
    vec3 cc = mix(CLOUDC, hex(0x4a6c9b), rim * (0.4 + 0.6 * towardMoon));
    col = mix(col, cc, a * 0.92);
  }
  return col;
}

vec3 skyCol(vec2 p, float t, bool refl) {
  float k = clamp((p.y - HY) / 0.45, 0.0, 1.0);
  vec3 col = mix(SHALL, DEEP, smoothstep(0.0, 0.75, k));
  col = mix(col, hex(0x05264c), smoothstep(0.6, 1.0, k));
  float d = length(p - MOONP);
  col += hex(0x5a77a0) * (0.32 * exp(-d * 9.0) + 0.16 * exp(-d * 3.2)) * (refl ? 0.5 : 1.0);
  col = clouds(p, col, t);
  if (refl) return col;
  vec2 mp = (p - MOONP) / MR;
  float maria = fbm(mp * 1.8 + 4.0);
  vec3 mc = mix(MOONC, hex(0xd8c2a2), smoothstep(0.52, 0.68, maria) * 0.85);
  mc *= 1.0 - 0.07 * dot(mp, mp);
  return mix(col, mc, aa(d - MR));
}

vec3 ridgeCol(vec2 p, float rY) {
  float below = rY - p.y;
  float g = noise(vec2((p.x + below * 0.6) * 24.0, below * 3.0));
  float g2 = noise(vec2((p.x - below * 0.5) * 15.0 + 5.0, below * 2.0));
  vec3 col = mix(DEEP2, SLATE, smoothstep(0.42, 0.62, g));
  col = mix(col, DEEP, smoothstep(0.55, 0.72, g2) * 0.55);
  float height = rY - HY;
  float snowDepth = 0.042 * smoothstep(0.1, 0.24, height) * (1.0 - 0.35 * smoothstep(0.7, 1.2, abs(p.x))) * (0.45 + 0.9 * noise(vec2(p.x * 36.0, 0.5)));
  float snow = aa(rY - snowDepth - p.y) * smoothstep(0.3, 0.45, g + 0.12);
  col = mix(col, mix(MOONSH, MOONC, smoothstep(0.45, 0.7, g)), snow);
  col = mix(col, SHALL, (1.0 - smoothstep(HY, HY + 0.075, p.y)) * 0.65);
  return col;
}

// Everything behind the island: sky + crater rim. Also used for reflections.
vec3 far(vec2 p, float t, bool refl) {
  float rY = ridgeY(p.x);
  vec3 col = skyCol(p, t, refl);
  col = mix(col, ridgeCol(p, rY), aa(p.y - rY));
  float shore = exp(-abs(p.y - HY) * 900.0);
  return col + hex(0x2a5a8c) * shore * 0.35;
}

float pine(vec2 p, vec2 b, float h, float w) {
  vec2 q = p - b;
  if (q.y < -0.01 || q.y > h * 1.02 || abs(q.x) > w * 1.1) return 0.0;
  float cov = aa(abs(q.x) - w * 0.07) * step(q.y, h * 0.2);
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float y0 = h * (0.1 + fi * 0.2) + h * 0.03 * abs(fract(q.x / (w * 0.22)) - 0.5);
    float y1 = h * (0.46 + fi * 0.18);
    float tw = w * (1.0 - fi * 0.19);
    float k = (q.y - y0) / (y1 - y0);
    float hw = tw * pow(max(0.0, 1.0 - k), 1.2);
    cov = max(cov, aa(abs(q.x) - hw) * step(0.0, k) * step(k, 1.0));
  }
  return cov;
}

float islandTop(float x) {
  float u = (x - IX) / IW;
  return IB + 0.032 * sqrt(max(0.0, 1.0 - u * u)) + 0.004 * noise1(x * 70.0);
}

#define CX (IX + 0.012)
float cabinGround() { return IB + 0.026; }

// Island + its pines + cabin body. rgb = colour, a = coverage.
vec4 island(vec2 p, bool forReflection) {
  if (abs(p.x - IX) > IW + 0.03 || p.y < IB - 0.012 || p.y > IB + 0.16) return vec4(0.0);
  vec4 o = vec4(0.0);
  float top = islandTop(p.x);
  float mound = aa(p.y - top) * aa(abs(p.x - IX) - IW * (1.0 + 0.06 * noise1(p.y * 200.0))) * step(IB - 0.008, p.y);
  float rockBand = aa(p.y - (IB + 0.012 + 0.008 * noise(vec2(p.x * 55.0, 1.0))));
  float rockLump = noise(vec2(p.x * 70.0, p.y * 90.0));
  vec3 ground = mix(hex(0x1d2a22), MOSS, exp(-abs(p.x - CX) * 18.0) * 0.9);
  vec3 rock = mix(ROCK, hex(0x37475c), smoothstep(0.45, 0.75, rockLump) * smoothstep(IX + 0.1, IX - 0.2, p.x));
  vec3 mc = mix(ground, rock, rockBand);
  o = mix(o, vec4(mc, 1.0), mound);

  // pines on the island
  vec4 P[7] = vec4[7](
    vec4(-0.115, 0.075, 0.022, 0.0), vec4(-0.075, 0.11, 0.026, 0.0), vec4(-0.15, 0.06, 0.018, 0.0),
    vec4(0.075, 0.1, 0.024, 0.0), vec4(0.105, 0.125, 0.028, 0.0), vec4(0.15, 0.07, 0.02, 0.0), vec4(-0.035, 0.085, 0.022, 0.0));
  for (int i = 0; i < 7; i++) {
    vec4 pp = P[i];
    float bx = IX + pp.x;
    float c = pine(p, vec2(bx, islandTop(bx) - 0.006), pp.y, pp.z);
    float lit = smoothstep(0.004, -0.01, p.x - bx) * 0.35;
    o = mix(o, vec4(mix(PINEC, hex(0x1b3347), lit), 1.0), c);
  }

  // cabin
  float g = cabinGround();
  vec2 q = p - vec2(CX, g);
  float wall = aa(abs(q.x) - 0.038) * aa(-q.y) * aa(q.y - 0.03);
  float logs = 0.85 + 0.15 * step(0.5, fract(q.y * 260.0));
  vec3 wallC = CEDAR * logs;
  float roof = aa(abs(q.x) - 0.048) * aa(0.026 - q.y) * aa(q.y - (0.062 - abs(q.x) * 0.7));
  vec3 roofC = mix(hex(0x1c2a3d), hex(0x34465f), step(q.x, 0.0));
  float chim = aa(abs(q.x - 0.026) - 0.005) * aa(0.035 - q.y) * aa(q.y - 0.07);
  o = mix(o, vec4(wallC, 1.0), wall);
  o = mix(o, vec4(roofC, 1.0), roof);
  o = mix(o, vec4(hex(0x30383e), 1.0), chim);
  float win = 0.0;
  for (int i = 0; i < 4; i++) {
    float wx = (float(i) < 2.0 ? -0.022 : 0.012) + mod(float(i), 2.0) * 0.011;
    win = max(win, aa(abs(q.x - wx - 0.0045) - 0.0042) * aa(abs(q.y - 0.014) - 0.0055));
  }
  o = mix(o, vec4(LANTERN, 1.0), win);
  if (forReflection) o.rgb = mix(o.rgb, LANTERN, win);
  return o;
}

float smoke(vec2 p, float t) {
  vec2 o = vec2(CX + 0.026, cabinGround() + 0.07);
  float s = p.y - o.y;
  if (s < 0.0 || s > 0.18) return 0.0;
  float cx = o.x + s * 0.18 + 0.012 * sin(s * 48.0 - t * 1.4) * smoothstep(0.0, 0.05, s) + 0.02 * smoothstep(0.08, 0.18, s);
  float w = 0.0035 + s * 0.05;
  float a = aa(abs(p.x - cx) - w) * smoothstep(0.0, 0.006, s) * (1.0 - smoothstep(0.06, 0.18, s));
  return a * (0.75 + 0.25 * noise(vec2(p.x * 90.0, s * 40.0 - t)));
}

vec3 water(vec2 p, float t) {
  float depth = max(HY - p.y, 0.003);   // keep the projection finite at the horizon
  float z = CAMH / depth;
  vec2 w = vec2(p.x * z, z + t * SPEED);
  float near = smoothstep(0.0, 0.5, depth);

  float wake = texture(u_sim, gl_FragCoord.xy / u_res).r * 3.0;

  float bandF = w.y * 9.0 + wake * 0.5;
  float id = floor(bandF);
  float f = fract(bandF);
  float rnd = hash11(id * 1.31);
  float wob = noise(vec2(w.x * 3.0 + rnd * 20.0, id * 0.7)) - 0.5;

  vec2 q = vec2(p.x + wob * (0.004 + 0.05 * near) + wake * 0.015, 2.0 * HY - p.y + (rnd - 0.5) * 0.008 * near);
  vec3 refl = far(q, t, true);
  float vis = 0.45 + 0.55 * step(0.32, hash11(id * 2.71));
  float fres = mix(0.62, 0.16, near) * vis;
  vec3 col = mix(mix(LAKE, LAKEN, near), refl * 0.72, fres);

  float dashMask = smoothstep(0.38, 0.62, noise(vec2(w.x * 4.0 + id * 7.3, id)));
  float crest = smoothstep(0.0, 0.1, f) * smoothstep(0.34, 0.14, f);
  col = mix(col, SHALL * 1.08, crest * dashMask * (0.2 + 0.45 * near));
  float trough = smoothstep(0.55, 0.78, f) * smoothstep(1.0, 0.86, f);
  col = mix(col, DEEP, trough * 0.3 * (0.4 + near));

  // island reflection about its own waterline
  if (p.y < IB && p.y > IB - 0.17 * ISC && abs(p.x - IX) < (IW + 0.05) * ISC) {
    vec2 q2 = toI(vec2(p.x + wob * (0.006 + 0.02 * near), 2.0 * IB - p.y));
    vec4 isl = island(q2, true);
    float fade = smoothstep(IB - 0.17 * ISC, IB - 0.02, p.y);
    col = mix(col, mix(NIGHT * 1.4, isl.rgb * 0.5, 0.35), isl.a * 0.75 * fade);
    float sm = smoke(q2, t);
    col = mix(col, SMOKE * 0.55, sm * 0.35 * fade);
  }

  // moon path
  float gw = 0.012 + 0.11 * pow(near, 1.25);
  float column = exp(-pow((p.x - MOONP.x - wob * 0.02 - wake * 0.01) / gw, 2.0));
  float dash = smoothstep(0.42, 0.62, noise(vec2(w.x * 2.4 + id * 3.7 + wake, id * 1.3 + t * 0.35)));
  float dline = smoothstep(0.04, 0.18, f) * smoothstep(0.62, 0.42, f);
  float glit = column * dash * dline * smoothstep(0.0, 0.05, depth);
  vec3 path = mix(mix(GLIT, MOONC, column), mix(u_tint, MOONC, 0.35 * column), u_tintAmt);
  col = mix(col, path, clamp(glit * 1.5, 0.0, 1.0));
  col = mix(col, col * (0.75 + 0.5 * u_tint), u_tintAmt * 0.35 * near);

  // window light on the water
  float wcx = IX + (CX - 0.004 - IX) * ISC;
  float wcol = exp(-pow((p.x - wcx - wob * 0.015) / (0.01 + 0.03 * near), 2.0));
  float wrange = smoothstep(IB - 0.15 * ISC, IB - 0.012, p.y) * step(p.y, IB - 0.004);
  col = mix(col, EMBER, clamp(wcol * wrange * dash * dline * 1.6, 0.0, 1.0));

  col += SHALL * 0.25 * clamp(abs(wake), 0.0, 1.0) * near;
  return col;
}

void main() {
  float t = u_time;
  HY = u_horizon;
  float ap = u_approach * u_approach * (3.0 - 2.0 * u_approach);
  ISC = mix(1.45, 7.5, ap);
  IB = mix(-0.035, -0.06 - 0.5 * ap, ap);
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  vec2 m = u_mouse.z > 0.5 ? (u_mouse.xy / u_res - 0.5) : vec2(0.0);
  vec2 drift = vec2(sin(t * 0.07), 0.0) * 0.004 + m * vec2(0.012, 0.006);
  vec2 pf = p + drift * 0.4;   // far layers move least
  vec2 pi = p + drift * 0.9;
  vec2 pn = p + drift * 2.2;   // foreground pines move most
  float ax = 0.5 * u_res.x / u_res.y;

  vec3 col = p.y > HY ? far(pf, t, false) : water(p, t);
  if (p.y <= HY && p.y > HY - 0.006) col = mix(col, far(vec2(pf.x, HY + 0.001), t, false), smoothstep(HY - 0.006, HY, p.y) * 0.8);

  vec2 il = toI(pi);
  vec4 isl = island(il, false);
  col = mix(col, isl.rgb, isl.a);
  col = mix(col, SMOKE, smoke(il, t) * 0.8 * (1.0 - ap * 0.8));

  // window glow and spill
  float g = cabinGround();
  float wd = length((il - vec2(CX - 0.005, g + 0.014)) * vec2(0.7, 1.0));
  col += LANTERN * (0.35 * exp(-wd * 70.0) + 0.08 * exp(-wd * 18.0)) * (1.0 + 2.0 * ap);
  // arriving: the window light fills the frame
  col = mix(col, mix(LANTERN, MOONC, 0.35), smoothstep(0.82, 1.0, u_approach) * 0.92);

  // a lantern on the dock, and its broken reflection
  if (u_lantern > 0.001) {
    vec2 lp = vec2(0.0, -0.3);
    float ld = length((p - lp) * vec2(1.0, 0.9));
    col += LANTERN * u_lantern * (0.9 * exp(-ld * 60.0) + 0.18 * exp(-ld * 9.0));
    float streak = exp(-pow(p.x / (0.02 + 0.06 * (lp.y - p.y)), 2.0)) * step(p.y, lp.y - 0.02) * smoothstep(-0.55, lp.y, p.y);
    col = mix(col, EMBER, clamp(streak * step(0.5, fract((p.y - t * 0.02) * 60.0)) * u_lantern * 0.7, 0.0, 1.0));
  }

  // foreground pines framing the bottom corners
  vec4 F[9] = vec4[9](
    vec4(-ax + 0.04, 0.46, 0.085, 0.0), vec4(-ax + 0.15, 0.36, 0.07, 0.0), vec4(-ax + 0.25, 0.28, 0.06, 0.0),
    vec4(-ax + 0.33, 0.2, 0.045, 0.0), vec4(ax - 0.05, 0.42, 0.08, 0.0), vec4(ax - 0.16, 0.33, 0.065, 0.0),
    vec4(ax - 0.27, 0.24, 0.05, 0.0), vec4(-0.06, 0.12, 0.035, 0.0), vec4(0.12, 0.09, 0.03, 0.0));
  for (int i = 0; i < 9; i++) {
    vec4 fp = F[i];
    fp.y *= u_pines;
    if (fp.y < 0.01) continue;
    vec2 b = vec2(fp.x, -0.52);
    float c = pine(pn, b, fp.y, fp.z);
    float rim = c * (1.0 - pine(pn + vec2(0.004, 0.0), b, fp.y, fp.z));
    col = mix(col, FGPINE, c);
    col = mix(col, hex(0x1d3a5c), rim * 0.7);
  }

  // shore mist: layered fbm, thickest on the water and at the horizon
  if (u_mist > 0.001) {
    float band = exp(-abs(p.y - HY) * 7.0) + smoothstep(HY, -0.5, p.y) * 0.6;
    float wisps = fbm(vec2(p.x * 2.2 + t * 0.03, p.y * 7.0 - t * 0.01)) * fbm(vec2(p.x * 5.0 - t * 0.05, p.y * 3.0));
    col = mix(col, mix(SHALL, SMOKE, 0.35), clamp(u_mist * (band * 0.55 + wisps * 1.2), 0.0, 0.92));
  }
  // lantern-lit interior: the whole scene warms
  col = mix(col, col * vec3(1.18, 0.92, 0.68) + LANTERN * 0.06, u_warm);

  // grade: cool shadows, gouache tooth, grain, vignette into Caldera Night
  float L = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(col, col * vec3(0.93, 0.98, 1.07), 1.0 - smoothstep(0.1, 0.5, L));
  col *= 0.975 + 0.05 * fbm(gl_FragCoord.xy / u_res.y * 140.0);
  col += (hash21(gl_FragCoord.xy + fract(t * 7.0) * 91.0) - 0.5) * 0.022;
  vec2 uv = gl_FragCoord.xy / u_res;
  float v = smoothstep(1.05, 0.35, length((uv - 0.5) * vec2(1.0, 1.2)));
  col = mix(NIGHT, col, 0.45 + 0.55 * v);
  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;export{e as fragment};