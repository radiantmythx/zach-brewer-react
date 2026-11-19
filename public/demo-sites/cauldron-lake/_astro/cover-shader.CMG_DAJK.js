var e=`
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform sampler2D u_sim;    // ripple height field (R), see core/three/ripples.ts
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


#define NAVY   hex(0x01152f)
#define COBALT hex(0x0d4177)
#define GOLD   hex(0xedb738)
#define PINEB  hex(0x031317)
#define OLIVE  hex(0x2e4b1b)

const float HY = 0.03;
const vec2  DISC = vec2(0.0, 0.29);
const float DR = 0.11;
const float IB = -0.09;
const float IW = 0.24;
const float ISC = 1.35;
vec2 toI(vec2 p) { return (p - vec2(0.0, IB)) / ISC + vec2(0.0, IB); }

float ridgeY(float x) {
  float side = smoothstep(0.05, 0.8, abs(x));
  float r1 = 1.0 - abs(noise1(x * 3.6 + 1.7) * 2.0 - 1.0);
  float r2 = 1.0 - abs(noise1(x * 9.0 + 4.2) * 2.0 - 1.0);
  return HY + 0.06 + 0.12 * side + 0.06 * r1 * (0.3 + side) + 0.014 * r2;
}

float cloudSDF(vec2 p, vec2 c, float hw, float h, float seed) {
  float d = 1e3;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float ox = (fi - 1.0) * hw * 0.42 + (hash11(seed + fi) - 0.5) * hw * 0.2;
    float r = h * (fi == 1.0 ? 1.0 : 0.62 + 0.2 * hash11(seed + fi * 3.0));
    d = min(d, length(p - vec2(c.x + ox, c.y)) - r);
  }
  vec2 q = (p - c) / vec2(hw * 1.5, h * 0.22);
  d = min(d, (length(q) - 1.0) * h * 0.22);
  return max(d, c.y - h * 0.04 - p.y);
}

// halftone coverage: dots on a 15° screen, radius from tone (0..1)
float halftone(vec2 p, float tone, float cell) {
  mat2 r = mat2(0.966, -0.259, 0.259, 0.966);
  vec2 g = r * p / cell;
  vec2 c = fract(g) - 0.5;
  float rad = sqrt(clamp(tone, 0.0, 1.0)) * 0.62;
  return aa((length(c) - rad) * cell);
}

float pineMask(vec2 p, vec2 b, float h, float w, out float olive) {
  vec2 q = p - b;
  olive = 0.0;
  if (q.y < -0.01 || q.y > h * 1.02 || abs(q.x) > w * 1.1) return 0.0;
  float cov = aa(abs(q.x) - w * 0.07) * step(q.y, h * 0.2);
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float y0 = h * (0.1 + fi * 0.2);
    float y1 = h * (0.46 + fi * 0.18);
    float tw = w * (1.0 - fi * 0.19);
    float k = (q.y - y0) / (y1 - y0);
    float hw = tw * pow(max(0.0, 1.0 - k), 1.0);
    float inside = aa(abs(q.x) - hw) * step(0.0, k) * step(k, 1.0);
    cov = max(cov, inside);
    // olive chevron on the moonward side of each tier
    olive = max(olive, inside * step(q.x, -hw * 0.25) * step(k, 0.3) * step(-hw * 0.95, q.x) * step(0.5, hash11(fi + b.x * 50.0)));
  }
  return cov;
}

void main() {
  float t = u_time;
  vec2 p0 = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  float ax = 0.5 * u_res.x / u_res.y;

  // plates: each has its own rough edge; the gold plate also carries the misregistration
  float k = clamp(t / 1.2, 0.0, 1.0);
  vec2 reg = vec2(0.012, -0.008) * pow(1.0 - k, 4.0) + vec2(0.0011, -0.0007);
  vec2 rough = (vec2(noise(p0 * 380.0), noise(p0 * 380.0 + 9.0)) - 0.5) * 0.0016;
  vec2 p = p0 + rough;
  vec2 pg = p0 - reg + (vec2(noise(p0 * 410.0 + 3.0), noise(p0 * 410.0 + 5.0)) - 0.5) * 0.0016;

  float cobalt = 0.0, gold = 0.0, pine = 0.0, olive = 0.0, navyOver = 0.0;

  // sky: halftone glow behind the rim, halftone halo round the disc
  float rY = ridgeY(p.x);
  float glowTone = (1.0 - smoothstep(rY, rY + 0.16, p.y)) * 0.55;
  cobalt = max(cobalt, halftone(p, glowTone, 0.011) * step(rY, p.y));
  float dd = length(pg - DISC);
  gold = max(gold, aa(dd - DR));
  gold = max(gold, halftone(pg, (1.0 - smoothstep(DR, DR + 0.09, dd)) * 0.5, 0.009) * step(DR, dd));

  // clouds (gold)
  gold = max(gold, aa(cloudSDF(pg, vec2(-0.42 + t * 0.002, 0.2), 0.17, 0.042, 2.0)));
  gold = max(gold, aa(cloudSDF(pg, vec2(0.36 + t * 0.0025, 0.235), 0.15, 0.032, 7.0)));
  gold = max(gold, aa(cloudSDF(pg, vec2(0.62 + t * 0.002, 0.34), 0.1, 0.02, 11.0)));
  gold = max(gold, aa(cloudSDF(pg, vec2(-0.85 + t * 0.002, 0.31), 0.12, 0.024, 5.0)));

  // crater rim: cobalt faces, navy gullies, gold caps with teeth
  float inRidge = aa(p.y - rY) * step(HY, p.y);
  float below = rY - p.y;
  float gx = (p.x + below * 0.9) * 9.0;
  float gully = step(0.78 - 0.18 * noise1(floor(gx) * 3.1), fract(gx + noise1(p.x * 4.0) * 0.6));
  cobalt = max(cobalt, inRidge);
  navyOver = max(navyOver, inRidge * gully * smoothstep(0.02, 0.06, below) * step(0.3, noise1(floor(gx) * 1.7 + 4.0)));
  float rYg = ridgeY(pg.x);
  float peak = smoothstep(0.1, 0.2, rYg - HY);
  float tx = pg.x * 9.0 + noise1(pg.x * 2.5) * 1.6;
  float tooth = pow(max(0.0, 1.0 - abs(fract(tx) * 2.0 - 1.0)), 1.5) * (0.4 + 0.6 * hash11(floor(tx)));
  float cap = 0.006 + (0.014 + 0.07 * tooth) * peak;
  gold = max(gold, aa(pg.y - rYg) * aa(rYg - cap - pg.y));

  // far shore: a gold rule
  float shoreY = HY + 0.04 * pg.x * pg.x;
  gold = max(gold, aa(abs(pg.y - shoreY) - 0.0035) * aa(abs(pg.x) - ax * 0.98));

  // lake: cobalt with stepped navy stencil ripples; pointer wakes quantise into the bands
  if (p.y < shoreY - 0.004) {
    cobalt = 1.0;
    float depth = shoreY - p.y;
    float z = 0.1 / depth;
    vec2 w = vec2(p.x * z, z + t * 0.05);
    // simulated ripples, quantised into the emblem's stepped stencil bands
    float wake = texture(u_sim, gl_FragCoord.xy / u_res).r * 4.0;
    float stepped = floor(wake * 2.5 + 0.5) / 2.5;
    float bandF = w.y * 20.0 + stepped * 0.5;
    float id = floor(bandF), f = fract(bandF);
    float n = noise(vec2(w.x * 9.0 + id * 5.1 + stepped * 2.0, id * 0.9));
    float thick = clamp((n - 0.55) / 0.45, 0.0, 1.0) * 0.3;
    navyOver = max(navyOver, step(abs(f - 0.5), thick));

    // stacked gold reflection bars under the island
    for (int i = 0; i < 6; i++) {
      float fi = float(i);
      float by = IB - 0.03 - fi * 0.026;
      float bw = (0.1 - fi * 0.013) * (1.0 + 0.08 * sin(t * 1.3 + fi * 2.0));
      float bx = 0.01 * sin(t * 0.8 + fi * 1.7) + stepped * 0.01;
      vec2 pb = toI(pg);
      float yy = (pb.y - by) / 0.0075;
      float bh = bw * sqrt(max(0.0, 1.0 - yy * yy));
      gold = max(gold, aa(abs(pb.x - bx) - bh) * step(abs(yy), 1.0));
    }
  }

  // island: pine mound with a gold waterline, olive moss (in island space)
  vec2 pL = p, pgL = pg;
  p = toI(p); pg = toI(pg);
  float top = IB + 0.038 * sqrt(max(0.0, 1.0 - pow(p.x / IW, 2.0)));
  float mound = aa(p.y - top) * step(IB - 0.004, p.y) * aa(abs(p.x) - IW);
  pine = max(pine, mound);
  olive = max(olive, mound * step(IB + 0.012, p.y) * step(0.55, noise(p * vec2(30.0, 60.0))));
  float wl = (pg.x / (IW * 1.25));
  gold = max(gold, aa(abs(pg.y - IB + 0.002) - 0.004 * sqrt(max(0.0, 1.0 - wl * wl))) * step(abs(wl), 1.0));

  vec3 P[6] = vec3[6](vec3(-0.15, 0.1, 0.026), vec3(-0.1, 0.13, 0.03), vec3(-0.19, 0.07, 0.02),
                      vec3(0.1, 0.12, 0.028), vec3(0.15, 0.09, 0.024), vec3(0.19, 0.06, 0.018));
  for (int i = 0; i < 6; i++) {
    float o;
    float c = pineMask(p, vec2(P[i].x, IB + 0.025), P[i].y, P[i].z, o);
    pine = max(pine, c);
    olive = max(olive, o);
  }

  // cabin: navy, gold windows, gold smoke
  vec2 q = p - vec2(0.005, IB + 0.03);
  float wall = aa(abs(q.x) - 0.045) * aa(-q.y) * aa(q.y - 0.034);
  float roof = aa(abs(q.x) - 0.056) * aa(0.03 - q.y) * aa(q.y - (0.07 - abs(q.x) * 0.72));
  float chim = aa(abs(q.x - 0.03) - 0.006) * aa(0.04 - q.y) * aa(q.y - 0.078);
  navyOver = max(navyOver, max(wall, max(roof, chim)));
  pine = max(pine, max(wall, max(roof, chim)));
  vec2 qg = pg - vec2(0.005, IB + 0.03);
  for (int i = 0; i < 4; i++) {
    float wx = (float(i) < 2.0 ? -0.028 : 0.012) + mod(float(i), 2.0) * 0.013;
    gold = max(gold, aa(abs(qg.x - wx - 0.005) - 0.005) * aa(abs(qg.y - 0.016) - 0.0065));
  }
  float s = qg.y - 0.08;
  float sx = 0.03 + 0.011 * sin(s * 70.0 - t * 1.6) * smoothstep(0.0, 0.02, s) + s * 0.12;
  gold = max(gold, aa(abs(qg.x - sx) - 0.0068 * (1.0 - smoothstep(0.035, 0.07, s))) * step(0.0, s) * step(s, 0.07));

  p = pL; pg = pgL;
  // foreground pines
  vec3 F[8] = vec3[8](vec3(-ax + 0.05, 0.44, 0.085), vec3(-ax + 0.16, 0.34, 0.07), vec3(-ax + 0.27, 0.25, 0.055),
                      vec3(ax - 0.06, 0.42, 0.08), vec3(ax - 0.17, 0.32, 0.065), vec3(ax - 0.28, 0.22, 0.05),
                      vec3(-0.05, 0.1, 0.032), vec3(0.14, 0.08, 0.028));
  for (int i = 0; i < 8; i++) {
    float o;
    float c = pineMask(p, vec2(F[i].x, -0.52), F[i].y, F[i].z, o);
    pine = max(pine, c);
    olive = max(olive, o);
    gold *= 1.0 - c;
  }

  // composite, in press order: navy ground, cobalt, navy overprint, pine, olive, gold
  vec3 col = NAVY;
  col = mix(col, COBALT, cobalt);
  col = mix(col, NAVY, navyOver);
  col = mix(col, PINEB, pine * (1.0 - navyOver * 0.0));
  col = mix(col, OLIVE, olive * pine);
  col = mix(col, GOLD, gold);

  // ink on paper: density variation, slight paper tooth showing through
  float density = 0.955 + 0.06 * fbm(p0 * 70.0);
  col *= density;
  col += (hash21(gl_FragCoord.xy) - 0.5) * 0.018;
  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;export{e as fragment};