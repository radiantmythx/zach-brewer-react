import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import Reveal, { Lines } from './Reveal'

/*
 * Four crafts, each with a tiny looping "film still" drawn in SVG + SMIL —
 * the same vocabulary as the hero, at postcard size. Animations pause when
 * offscreen and never start for reduced-motion visitors.
 */

/* neon inside the dark vignettes, earth tones on the page */
const C = {
  code: '#5CA8FF',
  design: '#3DE3F5',
  game: '#3DFFA8',
  music: '#B8FF5C',
  text: '#E6F0EE',
  dim: '#566872',
  hot: '#FF4F8B',
  violet: '#8B7CFF',
}
const EARTH = { code: '#2B6A93', design: '#1F8A86', game: '#3F7A55', music: '#6F952F' }

function useSmil() {
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => {
    const svg = ref.current
    if (!svg) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      svg.pauseAnimations()
      return
    }
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? svg.unpauseAnimations() : svg.pauseAnimations()))
    io.observe(svg)
    return () => io.disconnect()
  }, [])
  return ref
}

/* ---- 01 programming: code typing itself, token by token ---- */

const CODE_ROWS: { y: number; segs: [number, number, string][] }[] = [
  { y: 44, segs: [[48, 118, C.dim]] },
  { y: 70, segs: [[48, 22, C.code], [78, 50, C.text], [136, 48, C.game]] },
  { y: 94, segs: [[72, 28, C.music], [108, 14, C.dim], [130, 28, C.music]] },
  { y: 118, segs: [[48, 8, C.dim]] },
  { y: 142, segs: [[48, 40, C.code], [96, 44, C.game], [148, 18, C.dim]] },
  { y: 166, segs: [[72, 66, C.text], [146, 38, C.music]] },
  { y: 190, segs: [[48, 8, C.dim]] },
]
const CODE_CYCLE = 6
const CODE_TIMING = (() => {
  let t = 0.35
  return CODE_ROWS.map((row) => {
    const segs = row.segs.map(([x, len, color]) => {
      const start = t
      const dur = len / 190
      t += dur + 0.05
      return { x, len, color, k0: start / CODE_CYCLE, k1: (start + dur) / CODE_CYCLE }
    })
    t += 0.12
    return { y: row.y, segs }
  })
})()

function CodeVisual() {
  const ref = useSmil()
  return (
    <svg ref={ref} viewBox="0 0 320 220" aria-hidden="true">
      {CODE_ROWS.map((r, i) => (
        <rect key={i} x="24" y={r.y - 1.5} width="6" height="3" rx="1.5" fill="rgba(255,255,255,0.12)" />
      ))}
      <g>
        <animate attributeName="opacity" values="1;1;0;0;1" keyTimes="0;0.86;0.91;0.97;1" dur={`${CODE_CYCLE}s`} repeatCount="indefinite" />
        {CODE_TIMING.map((row) =>
          row.segs.map((s, j) => (
            <line
              key={`${row.y}-${j}`}
              x1={s.x}
              y1={row.y}
              x2={s.x + s.len}
              y2={row.y}
              stroke={s.color}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={`${s.len} ${s.len * 2 + 20}`}
              strokeDashoffset={s.len}
            >
              <animate
                attributeName="stroke-dashoffset"
                values={`${s.len};${s.len};0;0;${s.len};${s.len}`}
                keyTimes={`0;${s.k0.toFixed(4)};${s.k1.toFixed(4)};0.92;0.93;1`}
                dur={`${CODE_CYCLE}s`}
                repeatCount="indefinite"
              />
            </line>
          )),
        )}
      </g>
      <rect x="64" y="181" width="2.4" height="18" rx="1" fill={C.code}>
        <animate attributeName="opacity" values="1;1;0;0" keyTimes="0;0.5;0.5;1" dur="1.05s" repeatCount="indefinite" />
      </rect>
    </svg>
  )
}

/* ---- 02 design: a bezier path whose handles are being dragged ---- */

const P0 = [64, 170]
const P3 = [256, 52]
const K1 = [[180, 170], [228, 198], [138, 190], [180, 170]]
const K2 = [[140, 52], [96, 20], [176, 28], [140, 52]]
const SPL = '0.65 0 0.35 1;0.65 0 0.35 1;0.65 0 0.35 1'
const pathAt = (i: number) => `M${P0[0]} ${P0[1]} C${K1[i][0]} ${K1[i][1]} ${K2[i][0]} ${K2[i][1]} ${P3[0]} ${P3[1]}`
const D_VALUES = [0, 1, 2, 3].map(pathAt).join(';')
const vals = (pts: number[][], axis: 0 | 1) => pts.map((p) => p[axis]).join(';')

function Smil({ attr, values }: { attr: string; values: string }) {
  return (
    <animate attributeName={attr} values={values} keyTimes="0;0.33;0.66;1" calcMode="spline" keySplines={SPL} dur="6s" repeatCount="indefinite" />
  )
}

function DesignVisual() {
  const ref = useSmil()
  return (
    <svg ref={ref} viewBox="0 0 320 220" aria-hidden="true">
      <defs>
        <pattern id="dotgrid" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="8" cy="8" r="0.8" fill="rgba(255,255,255,0.14)" />
        </pattern>
      </defs>
      <rect width="320" height="220" fill="url(#dotgrid)" />
      <path d={pathAt(0)} fill="none" stroke={C.design} strokeOpacity="0.2" strokeWidth="9" strokeLinecap="round">
        <Smil attr="d" values={D_VALUES} />
      </path>
      <path d={pathAt(0)} fill="none" stroke="#D8FBFF" strokeWidth="2" strokeLinecap="round">
        <Smil attr="d" values={D_VALUES} />
      </path>
      <g stroke="rgba(255,255,255,0.5)" strokeWidth="1">
        <line x1={P0[0]} y1={P0[1]} x2={K1[0][0]} y2={K1[0][1]}>
          <Smil attr="x2" values={vals(K1, 0)} />
          <Smil attr="y2" values={vals(K1, 1)} />
        </line>
        <line x1={P3[0]} y1={P3[1]} x2={K2[0][0]} y2={K2[0][1]}>
          <Smil attr="x2" values={vals(K2, 0)} />
          <Smil attr="y2" values={vals(K2, 1)} />
        </line>
      </g>
      <circle cx={K1[0][0]} cy={K1[0][1]} r="4" fill="#fff">
        <Smil attr="cx" values={vals(K1, 0)} />
        <Smil attr="cy" values={vals(K1, 1)} />
      </circle>
      <circle cx={K2[0][0]} cy={K2[0][1]} r="4" fill={C.design}>
        <Smil attr="cx" values={vals(K2, 0)} />
        <Smil attr="cy" values={vals(K2, 1)} />
      </circle>
      {[P0, P3].map(([x, y]) => (
        <rect key={x} x={x - 4.5} y={y - 4.5} width="9" height="9" fill="#0B0B0E" stroke="#fff" strokeWidth="1.3" />
      ))}
      <g>
        <animateTransform
          attributeName="transform"
          type="translate"
          values={K2.map((p) => `${p[0]} ${p[1]}`).join(';')}
          keyTimes="0;0.33;0.66;1"
          calcMode="spline"
          keySplines={SPL}
          dur="6s"
          repeatCount="indefinite"
        />
        <path d="M1 2 L1 18 L5.4 14 L8.4 20.4 L11 19.2 L8.2 13 L13.4 13 Z" fill="#fff" stroke="#0A0A0C" strokeWidth="1" />
      </g>
    </svg>
  )
}

/* ---- 03 game dev: a top-down spin slash clearing a ring of enemies ---- */

const ARENA = { x: 160, y: 112 }
const FOES = Array.from({ length: 7 }, (_, k) => {
  const a = (k / 7) * Math.PI * 2 + 0.3
  return { a, x0: ARENA.x + Math.cos(a) * 118, y0: ARENA.y + Math.sin(a) * 86, x1: ARENA.x + Math.cos(a) * 34, y1: ARENA.y + Math.sin(a) * 30 }
})

function GameVisual() {
  const ref = useSmil()
  const dur = '2.4s'
  return (
    <svg ref={ref} viewBox="0 0 320 220" aria-hidden="true">
      <defs>
        <pattern id="hexgrid" width="24" height="41.57" patternUnits="userSpaceOnUse">
          <path d="M8 0 L16 0 L20 6.93 L16 13.86 L8 13.86 L4 6.93 Z M20 6.93 L28 6.93 M8 13.86 L4 20.78 L8 27.71 L16 27.71 L20 20.78 L16 13.86 M4 20.78 L-4 20.78 M8 27.71 L4 34.64 L8 41.57 M16 27.71 L20 34.64 L16 41.57 M20 34.64 L28 34.64" fill="none" stroke="rgba(61,227,245,0.12)" strokeWidth="0.8" />
        </pattern>
        <radialGradient id="arenaFade" cx="50%" cy="50%" r="60%">
          <stop offset="0.6" stopColor="#05080D" stopOpacity="0" />
          <stop offset="1" stopColor="#05080D" stopOpacity="1" />
        </radialGradient>
      </defs>
      <rect width="320" height="220" fill="url(#hexgrid)" />
      <rect width="320" height="220" fill="url(#arenaFade)" />
      <ellipse cx={ARENA.x} cy={ARENA.y} rx="120" ry="88" fill="none" stroke={C.design} strokeOpacity="0.28" strokeDasharray="4 8" />

      {FOES.map((f, k) => (
        <g key={k}>
          <animateTransform attributeName="transform" type="translate" values={`${f.x0} ${f.y0};${f.x1} ${f.y1};${f.x1 + Math.cos(f.a) * 16} ${f.y1 + Math.sin(f.a) * 14};${f.x1} ${f.y1}`} keyTimes="0;0.55;0.62;1" dur={dur} repeatCount="indefinite" />
          <g transform={`rotate(${(f.a * 180) / Math.PI + 90})`}>
            <path d="M0 -9 L8 6 L-8 6 Z" fill="rgba(139,124,255,0.3)" stroke={C.violet} strokeWidth="1.5">
              <animate attributeName="fill" values="rgba(139,124,255,0.3);rgba(139,124,255,0.3);#ffffff;rgba(139,124,255,0.3)" keyTimes="0;0.55;0.58;1" dur={dur} repeatCount="indefinite" />
            </path>
            <circle r="2.2" fill={C.hot} />
          </g>
          <animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;0.08;0.6;0.64;1" dur={dur} repeatCount="indefinite" />
        </g>
      ))}

      {FOES.map((f, k) => (
        <circle key={`s${k}`} cx={f.x1} cy={f.y1} r="3" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0">
          <animate attributeName="r" values="3;3;16;16" keyTimes="0;0.58;0.74;1" dur={dur} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;0.57;0.58;0.74;1" dur={dur} repeatCount="indefinite" />
        </circle>
      ))}

      <g opacity="0">
        <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.53;0.55;0.62;0.72;1" dur={dur} repeatCount="indefinite" />
        <animateTransform attributeName="transform" type="rotate" values={`0 ${ARENA.x} ${ARENA.y};0 ${ARENA.x} ${ARENA.y};360 ${ARENA.x} ${ARENA.y};360 ${ARENA.x} ${ARENA.y}`} keyTimes="0;0.53;0.66;1" dur={dur} repeatCount="indefinite" />
        <path d={`M${ARENA.x} ${ARENA.y - 44} A44 40 0 1 1 ${ARENA.x - 44} ${ARENA.y}`} fill="none" stroke={C.design} strokeWidth="9" strokeOpacity="0.25" strokeLinecap="round" />
        <path d={`M${ARENA.x} ${ARENA.y - 44} A44 40 0 1 1 ${ARENA.x - 44} ${ARENA.y}`} fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
      </g>

      <circle cx={ARENA.x} cy={ARENA.y} r="22" fill={C.design} opacity="0.12" />
      <circle cx={ARENA.x} cy={ARENA.y} r="12" fill="none" stroke={C.design} strokeWidth="2" />
      <circle cx={ARENA.x} cy={ARENA.y} r="7" fill="#ffffff" />

      {[0, 3].map((k) => (
        <text key={`d${k}`} x={FOES[k].x1} y={FOES[k].y1 - 14} textAnchor="middle" fontFamily="Unbounded, sans-serif" fontWeight="800" fontSize={k ? 13 : 10} fill={k ? '#FFD166' : '#ffffff'} opacity="0">
          {k ? '512' : '128'}
          <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.58;0.62;0.82;0.92" dur={dur} repeatCount="indefinite" />
          <animateTransform attributeName="transform" type="translate" values="0 0;0 0;0 -14" keyTimes="0;0.58;0.92" dur={dur} repeatCount="indefinite" />
        </text>
      ))}

      <rect x="16" y="16" width="64" height="4" rx="2" fill="rgba(255,255,255,0.12)" />
      <rect x="16" y="16" width="52" height="4" rx="2" fill={C.game} />
      <text x="304" y="24" textAnchor="end" fontFamily="Unbounded, sans-serif" fontWeight="900" fontSize="14" fill="#ffffff">
        x7
      </text>
    </svg>
  )
}

/* ---- 04 music: four partials and the sound they sum to ---- */

const WAVE_FRAMES = 12
const PARTIALS = [
  { a: 20, k: 1.5, m: 1, color: C.code },
  { a: 13, k: 1.89, m: 2, color: C.design },
  { a: 10, k: 2.25, m: 2, color: C.game },
  { a: 7, k: 3.0, m: 3, color: C.music },
]
const waveY = (x: number, f: number) => {
  const s = (x - 20) / 280
  const w = Math.pow(Math.sin(Math.PI * s), 0.8)
  let y = 0
  PARTIALS.forEach((p, i) => (y += p.a * Math.sin(Math.PI * 2 * (p.k * s - p.m * f) + i)))
  return 110 + y * w
}
const WAVE_VALUES = Array.from({ length: WAVE_FRAMES + 1 }, (_, fi) => {
  const f = fi / WAVE_FRAMES
  let d = ''
  for (let i = 0; i <= 56; i++) {
    const x = 20 + (i / 56) * 280
    d += `${i ? ' L' : 'M'}${x.toFixed(1)} ${waveY(x, f).toFixed(1)}`
  }
  return d
}).join(';')
const sinePath = (amp: number, len: number) => {
  let d = ''
  for (let x = -len; x <= 320 + len; x += 6) d += `${x === -len ? 'M' : ' L'}${x} ${(110 + amp * Math.sin((x / len) * Math.PI * 2)).toFixed(1)}`
  return d
}

function MusicVisual() {
  const ref = useSmil()
  const first = WAVE_VALUES.split(';')[0]
  return (
    <svg ref={ref} viewBox="0 0 320 220" aria-hidden="true">
      {PARTIALS.map((p, i) => {
        const len = [186, 148, 124, 93][i]
        return (
          <g key={i} opacity="0.4">
            <animateTransform attributeName="transform" type="translate" from="0 0" to={`${len} 0`} dur={`${[4, 2, 2, 1.33][i]}s`} repeatCount="indefinite" />
            <path d={sinePath(p.a, len)} fill="none" stroke={p.color} strokeWidth="1.2" />
          </g>
        )
      })}
      <path d={first} fill="none" stroke={C.music} strokeOpacity="0.22" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round">
        <animate attributeName="d" values={WAVE_VALUES} dur="4s" repeatCount="indefinite" />
      </path>
      <path d={first} fill="none" stroke="#EFFFE0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <animate attributeName="d" values={WAVE_VALUES} dur="4s" repeatCount="indefinite" />
      </path>
      {[0, 1, 2, 3].map((i) => (
        <circle key={i} cx={142 + i * 12} cy="192" r="2.6" fill={C.music} opacity="0.2">
          <animate attributeName="opacity" values="1;0.2;0.2" keyTimes="0;0.25;1" dur="2s" begin={`${i * 0.5}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </svg>
  )
}

const CRAFTS: { id: string; color: string; glow: string; title: string; body: string; tags: string[]; visual: ReactNode }[] = [
  {
    id: 'programming',
    color: EARTH.code,
    glow: C.code,
    title: 'Programming',
    body: "Production systems at enterprise scale: React front ends, C#/.NET and GraphQL services, and the CI/CD pipelines that ship them. Lately I've also been leading AI-assisted development across my org.",
    tags: ['C# / .NET', 'React', 'TypeScript', 'GraphQL', 'Azure DevOps'],
    visual: <CodeVisual />,
  },
  {
    id: 'design',
    color: EARTH.design,
    glow: C.design,
    title: 'Design',
    body: 'Interfaces with intent. I tune type, spacing and motion until they feel inevitable, and I care about the systems underneath that keep them consistent. This site is built by hand, frame by frame.',
    tags: ['Interface', 'Motion', 'Typography', 'Design systems'],
    visual: <DesignVisual />,
  },
  {
    id: 'game-design',
    color: EARTH.game,
    glow: C.game,
    title: 'Game design',
    body: "Systems that are fun to push against. I build in Godot and I'm working on a browser action-RPG engine, always chasing game feel: responsive input, readable feedback, squash and stretch.",
    tags: ['Godot', 'Game feel', 'Systems', 'Engines'],
    visual: <GameVisual />,
  },
  {
    id: 'music',
    color: EARTH.music,
    glow: C.music,
    title: 'Music',
    body: "Composition and sound, and the code that connects them: Web Audio synthesis, DSP, and tools for shaping what you hear. Turn the sound on up top to hear what I mean. It's all synthesized live.",
    tags: ['Composition', 'Sound design', 'Web Audio', 'DSP'],
    visual: <MusicVisual />,
  },
]

export default function Crafts() {
  return (
    <section id="crafts" className="section">
      <div className="container">
        <header className="section-head">
          <Reveal>
            <p className="label">(02) Crafts</p>
          </Reveal>
          <div className="crafts-head">
            <Reveal as="h2" variant="lines" className="display">
              <Lines
                lines={[
                  'Four crafts.',
                  <>
                    <span className="scribble">
                      <em>One line</em>
                      <svg viewBox="0 0 200 20" preserveAspectRatio="none" aria-hidden="true">
                        <path d="M2 14 C 40 4, 80 18, 120 10 S 180 6, 198 12" pathLength="1" />
                      </svg>
                    </span>{' '}
                    through all of them.
                  </>,
                ]}
              />
            </Reveal>
            <Reveal delay={0.15}>
              <p className="crafts-intro">
                Everything I make comes back to structure, feel and rhythm. The medium changes; the standard
                doesn't. Here's how that shows up in each.
              </p>
            </Reveal>
          </div>
        </header>

        <div className="crafts-grid">
          {CRAFTS.map((c, i) => (
            <Reveal key={c.id} as="article" className="craft" delay={i * 0.08} style={{ '--c': c.color, '--glow': c.glow } as CSSProperties}>
              <div className="craft-visual">{c.visual}</div>
              <div className="craft-meta">
                <span className="craft-num">0{i + 1}</span>
                <h3>{c.title}</h3>
              </div>
              <p>{c.body}</p>
              <ul className="tags" aria-label={`${c.title} tools`}>
                {c.tags.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
