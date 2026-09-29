import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import Reveal, { Lines } from './Reveal'

/*
 * Four disciplines, each with a small looping figure drawn in SVG + SMIL —
 * the reel's linework language at card size. Animations pause offscreen and
 * never start for reduced-motion visitors.
 */

const INK = {
  ink: '#122630',
  ink2: '#3A4F58',
  muted: '#6C7F86',
  rule: 'rgba(18,38,48,0.14)',
  faint: 'rgba(18,38,48,0.07)',
  ocean: '#2B6A93',
  lagoon: '#1F8A86',
  moss: '#3F7A55',
  fern: '#6F952F',
}
const MONO = '"Geist Mono", ui-monospace, monospace'

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

function Grid({ id, step = 16, color = INK.faint }: { id: string; step?: number; color?: string }) {
  return (
    <>
      <defs>
        <pattern id={id} width={step} height={step} patternUnits="userSpaceOnUse">
          <path d={`M${step} 0 V${step} H0`} fill="none" stroke={color} strokeWidth="0.6" />
        </pattern>
      </defs>
      <rect width="320" height="220" fill={`url(#${id})`} />
    </>
  )
}

/* ---- 01 engineering: a small architecture with packets in flight ---- */

const NODES = [
  { x: 28, y: 34, label: 'CLIENT' },
  { x: 124, y: 34, label: 'GATEWAY' },
  { x: 220, y: 34, label: 'AZURE' },
  { x: 124, y: 96, label: 'GRAPHQL' },
  { x: 28, y: 158, label: 'LOANS' },
  { x: 124, y: 158, label: 'SERVICING' },
  { x: 220, y: 158, label: 'RISK' },
]
const W = 72
const H = 24
const cxn = (i: number) => NODES[i].x + W / 2
const EDGE_PATHS = [
  `M${NODES[0].x + W} 46 H${NODES[1].x}`,
  `M${NODES[1].x + W} 46 H${NODES[2].x}`,
  `M${cxn(1)} ${34 + H} V96`,
  `M${cxn(3)} ${96 + H} V139 H${cxn(4)} V158`,
  `M${cxn(3)} ${96 + H} V158`,
  `M${cxn(3)} ${96 + H} V139 H${cxn(6)} V158`,
]

function EngineeringVisual() {
  const ref = useSmil()
  return (
    <svg ref={ref} viewBox="0 0 320 220" aria-hidden="true">
      <Grid id="gridEng" color="rgba(43,106,147,0.08)" />
      {EDGE_PATHS.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={INK.ink} strokeOpacity="0.45" strokeWidth="0.8" />
      ))}
      {EDGE_PATHS.map((d, i) =>
        [0, 1].map((k) => (
          <rect key={`${i}-${k}`} x="-2" y="-2" width="4" height="4" fill={i % 2 ? INK.lagoon : INK.ocean}>
            <animateMotion path={d} dur={`${1.2 + (i % 3) * 0.35}s`} begin={`${k * 0.6 + i * 0.13}s`} repeatCount="indefinite" />
          </rect>
        )),
      )}
      {NODES.map((n, i) => (
        <g key={n.label}>
          <rect x={n.x} y={n.y} width={W} height={H} fill="#F8FAF7" stroke={INK.ink} strokeWidth="0.8" />
          <text x={n.x + 7} y={n.y + 15} fontFamily={MONO} fontSize="7" fill={INK.ink} letterSpacing="0.5">
            {n.label}
          </text>
          <rect x={n.x + W - 9} y={n.y + 10} width="4" height="4" fill={INK.moss}>
            <animate attributeName="opacity" values="1;0.2;1" dur={`${0.8 + (i % 3) * 0.3}s`} repeatCount="indefinite" />
          </rect>
        </g>
      ))}
      <text x="28" y="206" fontFamily={MONO} fontSize="6.5" fill={INK.muted} letterSpacing="0.6">
        FIG. 01 — SERVICE TOPOLOGY
      </text>
    </svg>
  )
}

/* ---- 02 interface design: grid, wireframe, and an easing being tuned ---- */

const P0 = [184, 176]
const P3 = [296, 64]
const K1 = [[257, 176], [274, 196], [240, 186], [257, 176]]
const K2 = [[223, 64], [202, 40], [236, 52], [223, 64]]
const SPL = '0.65 0 0.35 1;0.65 0 0.35 1;0.65 0 0.35 1'
const dAt = (i: number) => `M${P0[0]} ${P0[1]} C${K1[i][0]} ${K1[i][1]} ${K2[i][0]} ${K2[i][1]} ${P3[0]} ${P3[1]}`
const D_VALUES = [0, 1, 2, 3].map(dAt).join(';')
const vals = (pts: number[][], axis: 0 | 1) => pts.map((p) => p[axis]).join(';')

function Smil({ attr, values }: { attr: string; values: string }) {
  return <animate attributeName={attr} values={values} keyTimes="0;0.33;0.66;1" calcMode="spline" keySplines={SPL} dur="6s" repeatCount="indefinite" />
}

function InterfaceVisual() {
  const ref = useSmil()
  return (
    <svg ref={ref} viewBox="0 0 320 220" aria-hidden="true">
      {Array.from({ length: 6 }, (_, c) => (
        <rect key={c} x={24 + c * 47} y="0" width="39" height="220" fill="rgba(31,138,134,0.035)" stroke="rgba(31,138,134,0.16)" strokeWidth="0.6" />
      ))}
      {/* wireframe card */}
      <rect x="24" y="30" width="133" height="160" fill="#F8FAF7" stroke={INK.ink} strokeWidth="0.8" />
      <rect x="32" y="38" width="117" height="62" fill="none" stroke={INK.ink} strokeOpacity="0.4" strokeWidth="0.6" />
      <path d="M32 38 L149 100 M149 38 L32 100" stroke={INK.ink} strokeOpacity="0.15" strokeWidth="0.6" />
      <text x="32" y="122" fontFamily='"Instrument Serif", Georgia, serif' fontSize="15" fill={INK.ink}>
        Considered interfaces
      </text>
      {[132, 140, 148].map((y, i) => (
        <line key={y} x1="32" y1={y} x2={[140, 146, 100][i]} y2={y} stroke={INK.ink} strokeOpacity="0.14" strokeWidth="3" strokeLinecap="round" />
      ))}
      <rect x="32" y="160" width="58" height="20" rx="10" fill="none" stroke={INK.ink} strokeWidth="0.8" />
      {/* redline */}
      <g stroke={INK.fern} strokeWidth="0.7">
        <line x1="24" y1="22" x2="157" y2="22" />
        <line x1="24" y1="19" x2="24" y2="25" />
        <line x1="157" y1="19" x2="157" y2="25" />
        <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.15;0.8;1" dur="3s" repeatCount="indefinite" />
      </g>
      <text x="90" y="16" textAnchor="middle" fontFamily={MONO} fontSize="6" fill={INK.fern}>
        133
      </text>
      {/* easing editor */}
      <path d={`M${P0[0]} ${P0[1]} H${P3[0]} M${P0[0]} ${P0[1]} V${P3[1]}`} stroke={INK.ink} strokeOpacity="0.5" strokeWidth="0.7" fill="none" />
      <path d={dAt(0)} fill="none" stroke={INK.lagoon} strokeWidth="1.4">
        <Smil attr="d" values={D_VALUES} />
      </path>
      <g stroke={INK.ink} strokeOpacity="0.5" strokeWidth="0.6">
        <line x1={P0[0]} y1={P0[1]} x2={K1[0][0]} y2={K1[0][1]}>
          <Smil attr="x2" values={vals(K1, 0)} />
          <Smil attr="y2" values={vals(K1, 1)} />
        </line>
        <line x1={P3[0]} y1={P3[1]} x2={K2[0][0]} y2={K2[0][1]}>
          <Smil attr="x2" values={vals(K2, 0)} />
          <Smil attr="y2" values={vals(K2, 1)} />
        </line>
      </g>
      {[K1, K2].map((K, i) => (
        <circle key={i} cx={K[0][0]} cy={K[0][1]} r="3" fill={i ? INK.lagoon : '#F8FAF7'} stroke={INK.lagoon} strokeWidth="0.8">
          <Smil attr="cx" values={vals(K, 0)} />
          <Smil attr="cy" values={vals(K, 1)} />
        </circle>
      ))}
      {[P0, P3].map(([x, y]) => (
        <rect key={x} x={x - 3} y={y - 3} width="6" height="6" fill="#F8FAF7" stroke={INK.ink} strokeWidth="0.8" />
      ))}
    </svg>
  )
}

/* ---- 03 game systems: agents stream in, a sweep resolves them ---- */

const SPIRALS = Array.from({ length: 8 }, (_, k) => {
  const a0 = (k / 8) * Math.PI * 2
  let d = ''
  for (let s = 0; s <= 20; s++) {
    const r = 92 * (1 - s / 22)
    const a = a0 + (s / 20) * 1.4
    d += `${s ? ' L' : 'M'}${(160 + Math.cos(a) * r).toFixed(1)} ${(112 + Math.sin(a) * r * 0.9).toFixed(1)}`
  }
  return d
})

function GameVisual() {
  const ref = useSmil()
  return (
    <svg ref={ref} viewBox="0 0 320 220" aria-hidden="true">
      <ellipse cx="160" cy="112" rx="94" ry="85" fill="none" stroke={INK.ink} strokeOpacity="0.6" strokeWidth="0.8" />
      {Array.from({ length: 48 }, (_, k) => {
        const a = (k / 48) * Math.PI * 2
        const l = k % 4 === 0 ? 6 : 3
        return (
          <line key={k} x1={160 + Math.cos(a) * 94} y1={112 + Math.sin(a) * 85} x2={160 + Math.cos(a) * (94 + l)} y2={112 + Math.sin(a) * (85 + l)} stroke={INK.ink} strokeOpacity="0.35" strokeWidth="0.6" />
        )
      })}
      {SPIRALS.map((d, k) => (
        <path key={k} d={d} fill="none" stroke={k % 2 ? INK.moss : INK.ocean} strokeOpacity="0.14" strokeWidth="0.7" />
      ))}
      {SPIRALS.map((d, k) =>
        [0, 1, 2].map((j) => (
          <line key={`${k}-${j}`} x1="-4" y1="0" x2="4" y2="0" stroke={INK.ink} strokeWidth="1.2" strokeLinecap="round">
            <animateMotion path={d} dur="1.6s" begin={`${(k * 0.2 + j * 0.53) % 1.6}s`} repeatCount="indefinite" rotate="auto" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.5 0 1 1" />
          </line>
        )),
      )}
      <g>
        <animateTransform attributeName="transform" type="rotate" values="0 160 112;360 160 112" dur="0.8s" repeatCount="indefinite" />
        <path d="M160 82 A30 30 0 1 1 131 104" fill="none" stroke={INK.moss} strokeWidth="1.4" strokeLinecap="round">
          <animate attributeName="opacity" values="1;0.15;1" dur="0.8s" repeatCount="indefinite" />
        </path>
      </g>
      <g stroke={INK.ink} strokeWidth="0.7">
        {Array.from({ length: 12 }, (_, k) => {
          const a = (k / 12) * Math.PI * 2
          return <line key={k} x1={160 + Math.cos(a) * 14} y1={112 + Math.sin(a) * 14} x2={160 + Math.cos(a) * 60} y2={112 + Math.sin(a) * 54} />
        })}
        <animate attributeName="opacity" values="0;0;1;0" keyTimes="0;0.7;0.75;1" dur="1.6s" repeatCount="indefinite" />
      </g>
      <circle cx="160" cy="112" r="6" fill="none" stroke={INK.moss} strokeWidth="1" />
      <rect x="158.5" y="110.5" width="3" height="3" fill={INK.moss} />
      <text x="16" y="22" fontFamily={MONO} fontSize="6.5" fill={INK.ink2} letterSpacing="0.6">
        AGENTS 0260
      </text>
      <text x="16" y="32" fontFamily={MONO} fontSize="6.5" fill={INK.ocean} letterSpacing="0.6">
        Δt 16.7 MS
      </text>
    </svg>
  )
}

/* ---- 04 sound: notes land on a staff as the playhead passes ---- */

const NOTES = [
  [60, 3], [86, 5], [112, 6], [138, 8], [164, 6], [190, 5], [216, 3], [242, 2], [268, 3],
]

function SoundVisual() {
  const ref = useSmil()
  const bottom = 84
  const gap = 9
  const wave = (ph: number) => {
    let d = ''
    for (let i = 0; i <= 64; i++) {
      const x = 24 + (i / 64) * 272
      const s = i / 64
      const y = 138 + Math.sin(s * 22 + ph) * 12 * Math.pow(Math.sin(Math.PI * s), 1.3) + Math.sin(s * 57 - ph * 2) * 4 * Math.sin(Math.PI * s)
      d += `${i ? ' L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`
    }
    return d
  }
  const WAVES = [0, 1.6, 3.2, 4.8, 6.28].map(wave).join(';')
  return (
    <svg ref={ref} viewBox="0 0 320 220" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((k) => (
        <line key={k} x1="24" y1={bottom - k * gap} x2="296" y2={bottom - k * gap} stroke={INK.ink} strokeOpacity="0.4" strokeWidth="0.6" />
      ))}
      <line x1="24" y1={bottom} x2="24" y2={bottom - 4 * gap} stroke={INK.ink} strokeOpacity="0.6" strokeWidth="0.7" />
      <line x1="296" y1={bottom} x2="296" y2={bottom - 4 * gap} stroke={INK.ink} strokeOpacity="0.6" strokeWidth="0.7" />
      {NOTES.map(([x, step], i) => {
        const y = bottom - (step * gap) / 2
        const at = (i / NOTES.length) * 0.9
        return (
          <g key={i} opacity="0">
            <ellipse cx={x} cy={y} rx="4.2" ry="3" transform={`rotate(-20 ${x} ${y})`} fill={INK.ink} />
            <line x1={x + 3.8} y1={y} x2={x + 3.8} y2={y - 22} stroke={INK.ink} strokeWidth="0.8" />
            <animate attributeName="opacity" values="0;0;1;1;0" keyTimes={`0;${at.toFixed(3)};${(at + 0.02).toFixed(3)};0.95;1`} dur="4s" repeatCount="indefinite" />
          </g>
        )
      })}
      <line x1="30" y1={bottom + 6} x2="30" y2={bottom - 4 * gap - 6} stroke={INK.fern} strokeWidth="0.9">
        <animate attributeName="x1" values="30;290" dur="4s" repeatCount="indefinite" />
        <animate attributeName="x2" values="30;290" dur="4s" repeatCount="indefinite" />
      </line>
      <path d={wave(0)} fill="none" stroke={INK.ink} strokeWidth="0.9">
        <animate attributeName="d" values={WAVES} dur="2s" repeatCount="indefinite" />
      </path>
      <g stroke={INK.moss} strokeWidth="0.9">
        {Array.from({ length: 34 }, (_, k) => {
          const x = 24 + k * 8.2
          const h = 6 + 22 * Math.pow(1 - k / 34, 0.7) * (0.5 + 0.5 * Math.sin(k * 1.7))
          return (
            <line key={k} x1={x} y1="198" x2={x} y2={198 - h}>
              <animate attributeName="y2" values={`${198 - h};${198 - h * 0.45};${198 - h}`} dur={`${0.47 + (k % 4) * 0.12}s`} repeatCount="indefinite" />
            </line>
          )
        })}
      </g>
      <line x1="24" y1="198.5" x2="296" y2="198.5" stroke={INK.ink} strokeOpacity="0.4" strokeWidth="0.6" />
    </svg>
  )
}

const CRAFTS: { id: string; color: string; title: string; body: string; tags: string[]; visual: ReactNode }[] = [
  {
    id: 'engineering',
    color: INK.ocean,
    title: 'Engineering',
    body: 'Enterprise platforms built for scale and longevity: React front ends, C#/.NET and GraphQL services, and the CI/CD pipelines that deliver them. I also lead the adoption of AI-assisted development across my engineering organization.',
    tags: ['C# / .NET', 'React', 'TypeScript', 'GraphQL', 'Azure DevOps'],
    visual: <EngineeringVisual />,
  },
  {
    id: 'interface-design',
    color: INK.lagoon,
    title: 'Interface design',
    body: 'Interfaces designed with intent: typography, layout systems and motion tuned for clarity, and the design systems that keep them consistent. This site is designed and built by hand.',
    tags: ['Interface', 'Typography', 'Motion', 'Design systems'],
    visual: <InterfaceVisual />,
  },
  {
    id: 'game-systems',
    color: INK.moss,
    title: 'Game systems',
    body: 'Real-time systems and game feel: responsive input, readable feedback and deterministic simulation. I build in Godot and am developing a browser-based action RPG engine.',
    tags: ['Godot', 'Simulation', 'Game feel', 'Engines'],
    visual: <GameVisual />,
  },
  {
    id: 'sound',
    color: INK.fern,
    title: 'Sound',
    body: 'Composition and sound design, and the software between them: Web Audio synthesis, DSP and custom audio tools. The score for the reel above is synthesized live in your browser.',
    tags: ['Composition', 'Sound design', 'Web Audio', 'DSP'],
    visual: <SoundVisual />,
  },
]

export default function Crafts() {
  return (
    <section id="disciplines" className="section">
      <div className="container">
        <header className="section-head">
          <Reveal>
            <p className="label">(02) Disciplines</p>
          </Reveal>
          <div className="crafts-head">
            <Reveal as="h2" variant="lines" className="display">
              <Lines
                lines={[
                  'Four disciplines.',
                  <span className="scribble" key="u">
                    <em>One practice.</em>
                    <svg viewBox="0 0 200 20" preserveAspectRatio="none" aria-hidden="true">
                      <path d="M2 12 L198 12" pathLength="1" />
                    </svg>
                  </span>,
                ]}
              />
            </Reveal>
            <Reveal delay={0.15}>
              <p className="crafts-intro">
                The same principles carry across every medium I work in: structure, clarity and close attention to
                detail.
              </p>
            </Reveal>
          </div>
        </header>

        <div className="crafts-grid">
          {CRAFTS.map((c, i) => (
            <Reveal key={c.id} as="article" className="craft" delay={i * 0.08} style={{ '--c': c.color } as CSSProperties}>
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
