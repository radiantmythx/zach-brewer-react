import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { triggerPetalStorm } from '../era'

interface HeroProps {
  onOpenResume?: () => void
}

/* ---- bitmap font for the ASCII wordmark (guaranteed-correct letterforms) ---- */

const FONT: Record<string, string[]> = {
  Z: ['█████', '   █ ', '  █  ', ' █   ', '█████'],
  A: [' ███ ', '█   █', '█████', '█   █', '█   █'],
  C: [' ████', '█    ', '█    ', '█    ', ' ████'],
  H: ['█   █', '█   █', '█████', '█   █', '█   █'],
  B: ['████ ', '█   █', '████ ', '█   █', '████ '],
  R: ['████ ', '█   █', '████ ', '█  █ ', '█   █'],
  E: ['█████', '█    ', '████ ', '█    ', '█████'],
  W: ['█   █', '█   █', '█ █ █', '█ █ █', ' █ █ '],
}

function ascii(word: string): string {
  const rows: string[] = []
  for (let r = 0; r < 5; r++) {
    rows.push(
      word
        .split('')
        .map((ch) => FONT[ch]?.[r] ?? '     ')
        .join(' '),
    )
  }
  return rows.join('\n')
}

const ASCII_ZACH = ascii('ZACH')
const ASCII_BREWER = ascii('BREWER')

/* ---- boot sequence ---- */

const BOOT_LINES = [
  'ZB/370 SYSTEM CONSOLE — INITIAL PROGRAM LOAD',
  'MEM CHECK .................. 640K OK (plenty)',
  'MOUNTING /dev/craft ........ OK',
  'MOUNTING /dev/sakura ....... OK',
  'PETAL SUBSYSTEM ............ ONLINE',
  'LOADING ENTERPRISE.FINANCE . OK',
  'LOADING FULLSTACK.WEB ...... OK',
  'LOADING GAME.DEV ........... OK',
  'LOADING MODERN.AI .......... OK',
  'BOOT COMPLETE — WELCOME, VISITOR',
]

// Distinguishes "booted during an earlier page load" from "the boot effect
// already ran once during THIS load" — StrictMode double-invokes the effect,
// and the sessionStorage flag alone would make the second run skip the
// animation and leave the terminal stuck in its rewound (blank) state.
let animatedThisLoad = false

const HELP_TEXT = [
  'available commands:',
  '  whoami      who is this guy',
  '  ls          look around',
  '  resume      open the resume',
  '  contact     get in touch',
  '  migrate     begin the mainframe → cloud migration',
  '  sakura      🌸',
  '  clear       clear terminal',
]

export default function Hero({ onOpenResume }: HeroProps) {
  // How much of the boot sequence is visible. Server renders everything so
  // the prerendered HTML is complete; the client re-runs the animation once
  // per session.
  const [bootShown, setBootShown] = useState(BOOT_LINES.length)
  const [nameShown, setNameShown] = useState(true)
  const [history, setHistory] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [powerOn, setPowerOn] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const historyRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) return
    if (sessionStorage.getItem('zb-booted') && !animatedThisLoad) return

    animatedThisLoad = true
    sessionStorage.setItem('zb-booted', '1')
    // Synchronous rewind before first paint is intentional: the server renders
    // the fully-booted state for SEO, and this resets it so the boot sequence
    // can animate once per session without a flash of final content.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBootShown(0)
    setNameShown(false)
    setPowerOn(true)

    const timers: number[] = []
    BOOT_LINES.forEach((_, i) => {
      timers.push(window.setTimeout(() => setBootShown(i + 1), 160 + i * 130))
    })
    timers.push(
      window.setTimeout(() => setNameShown(true), 160 + BOOT_LINES.length * 130 + 180),
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  useEffect(() => {
    historyRef.current?.scrollTo({ top: historyRef.current.scrollHeight })
  }, [history])

  const run = (raw: string) => {
    const cmd = raw.trim().toLowerCase()
    const echo = `visitor@zb-s370:~$ ${raw}`
    const out: string[] = []

    switch (cmd) {
      case '':
        break
      case 'help':
      case '?':
        out.push(...HELP_TEXT)
        break
      case 'whoami':
        out.push(
          'Zach Brewer — Software Engineer & AVP @ U.S. Bank.',
          '10+ years, mainframe to cloud. Obsessed with the craft.',
        )
        break
      case 'ls':
      case 'ls -la':
      case 'dir':
        out.push('experience/   about/   contact/   resume.pdf   sakura/')
        break
      case 'cat resume.pdf':
        out.push("resume.pdf is a binary file. try 'resume' instead.")
        break
      case 'resume':
      case 'open resume':
        out.push('opening resume…')
        onOpenResume?.()
        break
      case 'contact':
      case 'cd contact':
        out.push('routing to contact…')
        document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })
        break
      case 'migrate':
      case 'cd cloud':
      case 'cd experience':
        out.push('beginning migration — hold on to your datasets…')
        document.getElementById('experience')?.scrollIntoView({ behavior: 'smooth' })
        break
      case 'sakura':
      case 'bloom':
        out.push('🌸 full bloom protocol engaged')
        triggerPetalStorm()
        break
      case 'clear':
      case 'cls':
        setHistory([])
        setInput('')
        return
      case 'neofetch':
        out.push(
          '        *  zach@brewer',
          '       ❀   ─────────────',
          '      🌸    OS: Enterprise Finance → Cloud',
          '            Shell: C# / React / GraphQL',
          '            Uptime: 10+ years',
          '            Side quests: Godot, AI tooling',
        )
        break
      case 'sudo':
      case 'sudo su':
      case 'sudo rm -rf /':
      case 'su':
        out.push('visitor is not in the sudoers file. this incident will be reported. 🌸')
        break
      case 'exit':
      case 'quit':
        out.push("there is no escape. scroll down instead.")
        break
      case 'vim':
      case 'emacs':
        out.push('war is not the answer. peace. 🌸')
        break
      default:
        out.push(`command not found: ${cmd} — try 'help'`)
    }

    setHistory((h) => [...h.slice(-40), echo, ...out])
    setInput('')
  }

  const booted = bootShown >= BOOT_LINES.length

  return (
    <section
      id="hero"
      className={`crt crt-flicker${powerOn ? ' crt-power-on' : ''}`}
      onClick={() => inputRef.current?.focus({ preventScroll: true })}
      style={{
        position: 'relative',
        minHeight: '100svh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        overflow: 'hidden',
        cursor: 'text',
      }}
    >
      <h1 className="sr-only">Zach Brewer — Software Engineer</h1>

      {/* Phosphor glow bed */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(90% 65% at 50% 42%, rgba(70,247,143,0.075) 0%, rgba(70,247,143,0.02) 45%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: '1100px',
          margin: '0 auto',
          padding: '6.5rem 1.5rem 4.5rem',
          width: '100%',
          fontFamily: 'var(--font-mono)',
          color: 'var(--color-phosphor)',
        }}
      >
        {/* Boot log */}
        <div
          aria-hidden="true"
          style={{
            fontSize: 'clamp(0.6rem, 1.4vw, 0.74rem)',
            lineHeight: 1.75,
            letterSpacing: '0.05em',
            color: 'var(--color-phosphor-dim)',
            minHeight: `${BOOT_LINES.length * 1.75 * 0.72}rem`,
            marginBottom: '2rem',
            textShadow: '0 0 6px rgba(70,247,143,0.35)',
          }}
        >
          {BOOT_LINES.slice(0, bootShown).map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>

        {/* ASCII wordmark */}
        <div
          aria-hidden="true"
          style={{
            opacity: nameShown ? 1 : 0,
            transition: 'opacity 0.35s steps(3)',
            textShadow: '0 0 14px rgba(70,247,143,0.5), 0 0 40px rgba(70,247,143,0.18)',
            marginBottom: '2.25rem',
          }}
        >
          <pre
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              fontSize: 'clamp(9px, 2.6vw, 22px)',
              lineHeight: 1.05,
              margin: 0,
            }}
          >
            {ASCII_ZACH}
          </pre>
          <pre
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              fontSize: 'clamp(9px, 2.6vw, 22px)',
              lineHeight: 1.05,
              margin: '0.6em 0 0',
            }}
          >
            {ASCII_BREWER}
          </pre>
        </div>

        {/* Tagline */}
        <p
          style={{
            fontSize: 'clamp(0.78rem, 1.8vw, 0.95rem)',
            lineHeight: 1.8,
            letterSpacing: '0.02em',
            maxWidth: '58ch',
            color: 'var(--color-phosphor)',
            opacity: nameShown ? 0.92 : 0,
            transition: 'opacity 0.4s steps(3)',
            textShadow: '0 0 8px rgba(70,247,143,0.3)',
            marginBottom: '2.5rem',
          }}
        >
          SOFTWARE ENGINEER · 10+ YRS · ENTERPRISE FINANCE / FULL-STACK WEB /
          GAME DEV — <span style={{ color: 'var(--color-sakura)' }}>OBSESSED WITH THE CRAFT</span>{' '}
          AND WHAT'S NOW POSSIBLE WITH MODERN AI.
        </p>

        {/* Interactive terminal */}
        <div
          style={{
            border: '1px solid rgba(70,247,143,0.25)',
            borderRadius: '4px',
            background: 'rgba(0, 12, 5, 0.55)',
            padding: '0.9rem 1rem',
            fontSize: 'clamp(0.72rem, 1.6vw, 0.85rem)',
            lineHeight: 1.7,
            opacity: booted ? 1 : 0.25,
            transition: 'opacity 0.3s',
          }}
        >
          <div
            ref={historyRef}
            style={{
              maxHeight: '10.5em',
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              color: 'var(--color-phosphor)',
              opacity: 0.85,
            }}
          >
            {history.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5ch' }}>
            <label htmlFor="zb-terminal" style={{ whiteSpace: 'nowrap', opacity: 0.9 }}>
              visitor@zb-s370:~$
            </label>
            <input
              id="zb-terminal"
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') run(input)
              }}
              placeholder="type 'help'"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-label="Interactive terminal — type help for available commands"
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                font: 'inherit',
                color: 'var(--color-phosphor)',
                caretColor: 'var(--color-phosphor)',
                textShadow: '0 0 8px rgba(70,247,143,0.3)',
                minWidth: '8ch',
              }}
            />
          </div>
        </div>
      </div>

      {/* Scroll hint */}
      <a
        href="#experience"
        style={{
          position: 'absolute',
          bottom: '1.5rem',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1,
          fontFamily: 'var(--font-mono)',
          fontSize: '0.66rem',
          letterSpacing: '0.22em',
          color: 'var(--color-phosphor-dim)',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        ▼ SCROLL TO BEGIN MIGRATION{' '}
        <span className="cursor-blink" aria-hidden="true">
          ▮
        </span>
      </a>
    </section>
  )
}
