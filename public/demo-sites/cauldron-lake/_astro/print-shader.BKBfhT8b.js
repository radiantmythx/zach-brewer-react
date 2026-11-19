var e=`
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform vec3 u_mouse;      // px (origin bottom-left), z = 1 when the pointer is over the canvas
uniform float u_quality;    // ray-march budget: 0.5 low … 1 high
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


#define HEARTH  hex(0x1b0e07)
#define CEDAR   hex(0x442d20)
#define LANTERN hex(0xf6b750)
#define MOONC   hex(0xf5dfc0)
#define SLATE   hex(0x405371)
#define DEEP    hex(0x072950)
#define SHALL   hex(0x234e7f)

vec3 lin(vec3 c) { return pow(c, vec3(2.2)); }
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
float sdBox(vec3 p, vec3 b) { vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0); }
float sdCyl(vec3 p, float r, float h) { vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h); return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)); }
float sdCappedCone(vec3 p, float h, float r1, float r2) {
  vec2 q = vec2(length(p.xz), p.y);
  vec2 k1 = vec2(r2, h), k2 = vec2(r2 - r1, 2.0 * h);
  vec2 ca = vec2(q.x - min(q.x, (q.y < 0.0) ? r1 : r2), abs(q.y) - h);
  vec2 cb = q - k1 + k2 * clamp(dot(k1 - q, k2) / dot(k2, k2), 0.0, 1.0);
  float s = (cb.x < 0.0 && ca.y < 0.0) ? -1.0 : 1.0;
  return s * sqrt(min(dot(ca, ca), dot(cb, cb)));
}
float sdTriPrism(vec3 p, vec2 h) { vec3 q = abs(p); return max(q.z - h.y, max(q.x * 0.866025 + p.y * 0.5, -p.y) - h.x * 0.5); }

float HC;        // current cut height
float ANG;       // turntable angle
const float LAYER = 0.011;

float pineSDF(vec3 q, float h, float r) {
  float d = sdCyl(q - vec3(0.0, h * 0.08, 0.0), r * 0.13, h * 0.08);
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float hh = h * (0.42 - fi * 0.06);
    float y0 = h * (0.12 + fi * 0.27);
    float rr = r * (1.0 - fi * 0.26);
    d = min(d, sdCappedCone(q - vec3(0.0, y0 + hh * 0.5, 0.0), hh * 0.5, rr, rr * 0.16));
  }
  return d;
}

float windowsSDF(vec3 c) {
  // recessed window boxes on the front (z+) and side (x+) walls
  float w = 1e3;
  for (int i = 0; i < 2; i++) {
    float x = i == 0 ? -0.075 : 0.075;
    w = min(w, sdBox(c - vec3(x, 0.115, 0.12), vec3(0.035, 0.032, 0.02)));
  }
  w = min(w, sdBox(c - vec3(0.17, 0.115, 0.0), vec3(0.02, 0.032, 0.04)));
  return w;
}

vec2 cabin(vec3 p) {
  vec3 c = p - vec3(0.05, 0.165, 0.02);
  c.xz = rot(0.5) * c.xz;
  float walls = sdBox(c - vec3(0.0, 0.11, 0.0), vec3(0.17, 0.11, 0.12));
  float win = windowsSDF(c);
  walls = max(walls, -win);
  vec3 rp = c - vec3(0.0, 0.273, 0.0);
  float roof = sdTriPrism(vec3(rp.z, rp.y * 1.6, rp.x), vec2(0.2, 0.2)) / 1.6;
  float chim = sdBox(c - vec3(0.1, 0.33, -0.04), vec3(0.03, 0.085, 0.03));
  float d = min(walls, min(roof, chim));
  return vec2(d, win);
}

// unclipped model distance; y = distance to the window recesses (for the inner glow)
vec2 model(vec3 p) {
  float bound = sdCyl(p - vec3(0.0, 0.45, 0.0), 0.95, 0.47);
  if (bound > 0.12) return vec2(bound, 1e3);
  vec3 q = p / vec3(0.78, 0.2, 0.58);
  float d = (length(q) - 1.0) * 0.2 + 0.008 * sin(p.x * 23.0) * sin(p.z * 19.0);
  for (int i = 0; i < 9; i++) {
    float a = float(i) / 9.0 * 2.0 * PI + 0.3;
    vec3 c = vec3(cos(a) * 0.74, 0.03, sin(a) * 0.54);
    float r = 0.075 + 0.05 * hash11(float(i) * 7.3);
    vec3 rq = (p - c) * vec3(1.0, 1.5, 1.0);
    rq.xz = rot(float(i) * 1.3) * rq.xz;
    float facet = mix(length(rq), max(abs(rq.x), max(abs(rq.y), abs(rq.z))) * 1.15, 0.55);
    d = smin(d, facet / 1.5 - r, 0.025);
  }
  d = max(d, -p.y);
  vec2 cb = cabin(p);
  d = min(d, cb.x);
  vec4 P[6] = vec4[6](vec4(-0.42, 0.14, 0.12, 0.62), vec4(-0.26, 0.15, -0.22, 0.5), vec4(0.44, 0.13, 0.15, 0.55),
                      vec4(0.3, 0.14, -0.27, 0.68), vec4(-0.56, 0.1, -0.1, 0.38), vec4(0.6, 0.09, -0.04, 0.34));
  for (int i = 0; i < 6; i++) {
    vec3 b = p - P[i].xyz;
    if (length(b.xz) > 0.3) { d = min(d, length(b.xz) - 0.18); continue; }
    d = smin(d, pineSDF(b, P[i].w, P[i].w * 0.24), 0.02);
  }
  return vec2(d, cb.y);
}

// returns distance, material (1 printed model, 2 plate, 3 bench, 4 wall), ghost proximity
vec3 map(vec3 p) {
  vec3 pm = p;
  pm.xz = rot(ANG) * pm.xz;
  vec2 m = model(pm);
  float printed = max(m.x, pm.y - HC);
  float plate = sdCyl(pm - vec3(0.0, -0.025, 0.0), 1.0, 0.025);
  float bench = sdBox(p - vec3(0.0, -0.25, 0.0), vec3(3.0, 0.2, 1.4));
  float wall = 1.7 + p.z;
  vec3 r = vec3(printed, 1.0, m.x);
  if (plate < r.x) r = vec3(plate, 2.0, m.x);
  if (bench < r.x) r = vec3(bench, 3.0, m.x);
  if (wall < r.x) r = vec3(wall, 4.0, m.x);
  return r;
}

vec3 normalAt(vec3 p) {
  vec2 e = vec2(0.0015, 0.0);
  return normalize(vec3(map(p + e.xyy).x - map(p - e.xyy).x, map(p + e.yxy).x - map(p - e.yxy).x, map(p + e.yyx).x - map(p - e.yyx).x));
}

float shadow(vec3 ro, vec3 rd, float maxT) {
  float res = 1.0, t = 0.02;
  for (int i = 0; i < 28; i++) {
    float h = map(ro + rd * t).x;
    res = min(res, 10.0 * h / t);
    t += clamp(h, 0.01, 0.12);
    if (res < 0.01 || t > maxT) break;
  }
  return clamp(res, 0.0, 1.0);
}

float ao(vec3 p, vec3 n) {
  float o = 0.0, s = 1.0;
  for (int i = 1; i <= 4; i++) {
    float h = 0.03 * float(i);
    o += (h - map(p + n * h).x) * s;
    s *= 0.6;
  }
  return clamp(1.0 - 2.5 * o, 0.0, 1.0);
}

vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }

void main() {
  float t = u_time;
  float tt = t + 27.0;              // live loop opens mid-print, windows toward the camera
  float cyc = mod(tt, 20.0);
  HC = 0.86 * clamp(cyc / 15.0, 0.0, 1.0);   // print for 15 s, admire it for 5
  ANG = tt * 0.18 + 0.6 + (u_mouse.z > 0.5 ? (u_mouse.x / u_res.x - 0.5) * 1.2 : 0.0);

  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  vec3 ro = vec3(0.2, 1.4, 3.7 + 1.2 * (1.0 - smoothstep(0.7, 1.3, u_res.x / u_res.y)));
  // wide screens keep the model right of the copy; narrow ones centre it
  float aspect = u_res.x / u_res.y;
  vec3 ta = vec3(-0.62 * smoothstep(0.85, 1.5, aspect), 0.36, 0.0);
  vec3 fw = normalize(ta - ro);
  vec3 rt = normalize(cross(fw, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(rt, fw);
  vec3 rd = normalize(uv.x * rt + uv.y * up + 1.9 * fw);

  float d = 0.0;
  vec3 hit = vec3(0.0);
  float ghost = 0.0;
  float mat = 0.0;
  int maxSteps = int(60.0 + 80.0 * u_quality);
  for (int i = 0; i < 140; i++) {
    if (i >= maxSteps) break;
    vec3 p = ro + rd * d;
    vec3 h = map(p);
    vec3 pm = p; pm.xz = rot(ANG) * pm.xz;
    if (pm.y > HC && h.z < 0.02) {
      float layerLine = smoothstep(0.75, 1.0, cos(pm.y / LAYER * PI * 0.5));
      ghost += exp(-abs(h.z) * 160.0) * layerLine * 0.22;
    }
    if (h.x < 0.0008 * d) { mat = h.y; hit = p; break; }
    d += h.x * 0.85;
    if (d > 8.0) break;
  }

  vec3 Lp = vec3(1.35, 1.55, 1.25);
  vec3 lantern = lin(mix(LANTERN, vec3(1.0, 0.95, 0.88), 0.5)) * 2.5;
  vec3 moonDir = normalize(vec3(-0.75, 0.55, -0.9));
  vec3 moonCol = lin(SHALL) * 1.1 + lin(SLATE) * 0.4;
  vec3 col = lin(HEARTH) * 0.5;

  if (mat > 0.0) {
    vec3 p = hit;
    vec3 n = normalAt(p);
    vec3 pm = p; pm.xz = rot(ANG) * pm.xz;
    vec3 nm = n; nm.xz = rot(ANG) * nm.xz;
    vec3 albedo = vec3(0.5);
    vec3 emit = vec3(0.0);
    float rough = 0.6;

    if (mat == 1.0) {
      albedo = lin(MOONC) * 0.92;
      float ph = pm.y / LAYER;
      bool cap = abs(pm.y - HC) < 0.006 && nm.y > 0.85;
      if (cap) {
        // open layer: perimeter walls + gyroid infill, fresh plastic glowing near the nozzle
        float inner = model(pm).x;
        float k = 48.0;
        vec3 g = pm * k;
        float gy = sin(g.x) * cos(g.y) + sin(g.y) * cos(g.z) + sin(g.z) * cos(g.x);
        float wallBand = smoothstep(-0.028, -0.018, inner);
        float infill = max(wallBand, smoothstep(0.32, 0.12, abs(gy)));
        albedo = mix(lin(HEARTH) * 0.8, albedo, infill);
        float a = atan(pm.z, pm.x);
        float nozzle = exp(-pow(mod(a - t * 2.6 + PI, 2.0 * PI) - PI, 2.0) * 3.0);
        emit += lin(LANTERN) * (1.2 * wallBand + 0.15 + 2.2 * nozzle) * infill;
      } else {
        float s = sin(ph * 2.0 * PI);
        float fadeL = 1.0 - smoothstep(3.0, 5.0, d);
        vec3 bend = vec3(0.0, s * 0.32 * fadeL * (1.0 - abs(n.y)), 0.0);
        n = normalize(n + bend);
        albedo *= 0.9 + 0.1 * (0.5 + 0.5 * cos(ph * 2.0 * PI));
        // amber line where the hot end is laying plastic
        emit += lin(LANTERN) * 3.0 * smoothstep(0.02, 0.0, HC - pm.y) * step(pm.y, HC + 0.001);
      }
      // lit windows inside the printed cabin (an LED, the way makers do it)
      float wd = model(pm).y;
      emit += lin(LANTERN) * 1.4 * smoothstep(0.012, 0.0, wd) * step(pm.y, HC);
      rough = 0.45;
    } else if (mat == 2.0) {
      float r = length(pm.xz);
      albedo = lin(hex(0x2a3442)) * (0.85 + 0.15 * noise(pm.xz * 140.0));
      albedo = mix(albedo, lin(MOONC) * 0.7, smoothstep(0.012, 0.0, abs(r - 0.965)) * step(0.0, pm.y));
      rough = 0.7;
    } else if (mat == 3.0) {
      float grain = noise(vec2(p.x * 2.0, p.z * 40.0 + noise(p.xz * vec2(1.5, 6.0)) * 6.0));
      albedo = lin(CEDAR) * (0.7 + 0.5 * grain);
      rough = 0.5;
    } else {
      float logs = 0.5 + 0.5 * cos((p.y + 0.06) / 0.22 * 2.0 * PI);
      albedo = lin(CEDAR) * (0.35 + 0.45 * pow(logs, 0.6)) * (0.85 + 0.3 * noise(vec2(p.x * 3.0, p.y * 30.0)));
      vec2 wq = p.xy - vec2(-1.7, 0.95);
      float inWin = step(abs(wq.x), 0.55) * step(abs(wq.y), 0.42);
      if (inWin > 0.0) {
        // the night outside, softened by old glass
        float sky = clamp((wq.y + 0.42) / 0.84, 0.0, 1.0);
        vec3 night = mix(lin(SHALL), lin(DEEP), sky);
        float md = length(wq - vec2(-0.18, 0.18));
        night += lin(MOONC) * (smoothstep(0.075, 0.06, md) * 1.4 + 0.25 * exp(-md * 9.0));
        float ridge = -0.12 + 0.08 * (1.0 - abs(noise1(wq.x * 6.0) * 2.0 - 1.0)) + 0.1 * abs(wq.x);
        night = mix(night, lin(hex(0x0b305b)), step(wq.y, ridge));
        float mull = step(abs(wq.x), 0.012) + step(abs(wq.y), 0.012);
        emit += night * 0.9 * (1.0 - clamp(mull, 0.0, 1.0));
        albedo = mix(albedo, lin(CEDAR) * 0.5, clamp(mull, 0.0, 1.0));
      }
    }

    vec3 l = Lp - p;
    float dist = length(l);
    l /= dist;
    float diff = max((dot(n, l) + 0.2) / 1.2, 0.0);
    float sh = mat == 4.0 ? 1.0 : shadow(p + n * 0.003, l, dist);
    float occ = ao(p, n);
    vec3 h = normalize(l - rd);
    float spec = pow(max(dot(n, h), 0.0), mix(64.0, 8.0, rough)) * (1.0 - rough) * 0.6;
    vec3 key = lantern / (0.35 + 0.18 * dist * dist);
    col = albedo * (key * diff * sh + moonCol * max(dot(n, moonDir), 0.0) * 0.55 + lin(HEARTH) * 1.4 * occ);
    col += key * spec * sh;
    float rim = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
    col += moonCol * rim * 0.25 * occ * step(mat, 2.0);
    col *= mix(0.6, 1.0, occ);
    col += emit;
    col = mix(col, lin(HEARTH) * 0.3, 1.0 - exp(-max(d - 3.0, 0.0) * 0.25));
  }

  col += lin(SHALL) * 1.6 * ghost;

  // lantern haze
  float lh = max(dot(rd, normalize(Lp - ro)), 0.0);
  col += lin(LANTERN) * pow(lh, 30.0) * 0.06;

  col = aces(col * 1.1);
  col = pow(col, vec3(1.0 / 2.2));
  // grade: lifted warm blacks, cool fill kept in the shadows' blue channel
  col = max(col, HEARTH * 0.9);
  vec2 sv = gl_FragCoord.xy / u_res - 0.5;
  col *= 1.0 - 0.55 * dot(sv * vec2(1.0, 1.3), sv * vec2(1.0, 1.3));
  col += (hash21(gl_FragCoord.xy + fract(t) * 37.0) - 0.5) * 0.02;
  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;export{e as fragment};