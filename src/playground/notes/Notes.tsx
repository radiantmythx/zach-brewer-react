import { useRef } from 'react'
import type { Block, Guide } from '../guide'
import type { Entry } from '../registry'
import { cleanSvg, renderInline, renderTex } from './format'
import Legend from './Legend'

/*
 * The long read behind a piece, set like the rest of the site: a serif title
 * and standfirst, a spec sheet, the controls, a numbered contents list, then
 * sections of text, equations, code, tables, asides and figures.
 */

const html = (s: string) => ({ __html: renderInline(s) })
const pad2 = (n: number) => String(n).padStart(2, '0')

function BlockView({ b, label: eqLabel }: { b: Block; label?: string }) {
  switch (b.type) {
    case 'p':
      return <p className="pg-n-p" dangerouslySetInnerHTML={html(b.text)} />
    case 'h':
      return <h4 className="pg-n-h">{b.text}</h4>
    case 'math': {
      const label = b.label ?? eqLabel ?? ''
      return (
        <figure className="pg-n-math">
          <div className="pg-n-math-row">
            <span className="m m--display" dangerouslySetInnerHTML={{ __html: renderTex(b.tex) }} />
            <span className="pg-n-math-label">{label}</span>
          </div>
          {b.caption && <figcaption dangerouslySetInnerHTML={html(b.caption)} />}
        </figure>
      )
    }
    case 'list': {
      const Tag = b.ordered ? 'ol' : 'ul'
      return (
        <Tag className={`pg-n-list${b.ordered ? ' is-ordered' : ''}`}>
          {b.items.map((it, i) => (
            <li key={i} dangerouslySetInnerHTML={html(it)} />
          ))}
        </Tag>
      )
    }
    case 'code': {
      const lines = b.code.replace(/\s+$/, '').split('\n')
      return (
        <figure className="pg-n-code">
          <div className="pg-n-code-head">
            <span>{b.lang ?? 'ts'}</span>
            <span>{lines.length} lines</span>
          </div>
          <pre>
            <code>
              {lines.map((l, i) => (
                <span key={i} className="pg-n-code-line">
                  {l || ' '}
                </span>
              ))}
            </code>
          </pre>
          {b.caption && <figcaption dangerouslySetInnerHTML={html(b.caption)} />}
        </figure>
      )
    }
    case 'table':
      return (
        <figure className="pg-n-table">
          <div className="pg-n-table-scroll">
            <table>
              <thead>
                <tr>
                  {b.head.map((hd, i) => (
                    <th key={i}>{hd}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.rows.map((r, i) => (
                  <tr key={i}>
                    {r.map((c, j) => (
                      <td key={j} dangerouslySetInnerHTML={html(c)} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {b.caption && <figcaption dangerouslySetInnerHTML={html(b.caption)} />}
        </figure>
      )
    case 'aside':
      return (
        <aside className="pg-n-aside">
          {b.title && <p className="pg-n-aside-title">{b.title}</p>}
          <p dangerouslySetInnerHTML={html(b.text)} />
        </aside>
      )
    case 'quote':
      return (
        <blockquote className="pg-n-quote">
          <p dangerouslySetInnerHTML={html(b.text)} />
          <cite>{b.cite}</cite>
        </blockquote>
      )
    case 'figure':
      return (
        <figure className="pg-n-figure">
          <div className="pg-n-figure-art" role="img" aria-label={b.alt} dangerouslySetInnerHTML={{ __html: cleanSvg(b.svg) }} />
          <figcaption dangerouslySetInnerHTML={html(b.caption)} />
        </figure>
      )
  }
}

interface NotesProps {
  entry: Entry
  guide: Guide | null
  /** 'side' beside the stage (wide screens) or 'sheet' covering it (phones) */
  layout: 'side' | 'sheet'
  onClose: () => void
}

export default function Notes({ entry, guide, layout, onClose }: NotesProps) {
  const scroller = useRef<HTMLDivElement>(null)
  const jump = (id: string) => {
    const el = scroller.current?.querySelector<HTMLElement>(`[data-sec="${id}"]`)
    if (el && scroller.current) scroller.current.scrollTo({ top: el.offsetTop - 18, behavior: 'smooth' })
  }
  // number the display equations that have no label of their own, in reading order
  const eqLabels = new Map<Block, string>()
  let eqN = 0
  for (const sec of guide?.sections ?? []) for (const b of sec.blocks) if (b.type === 'math' && !b.label) eqLabels.set(b, `(${++eqN})`)
  const words = entry.title.split(' ')
  const head = words.length > 1 ? words.slice(0, -1).join(' ') : ''
  const tail = words[words.length - 1]

  return (
    <div className={`pg-notes pg-notes--${layout}`} ref={scroller} role="region" aria-label={`Notes on ${entry.title}`} tabIndex={-1} data-keys-pass="">
      <div className="pg-notes-bar">
        <span className="pg-notes-bar-id">
          {entry.code} · Notes
        </span>
        <button type="button" className="pg-btn" onClick={onClose}>
          {layout === 'sheet' ? '← Back to the piece' : 'Close notes'}
        </button>
      </div>

      <article className="pg-notes-body">
        <header className="pg-notes-head">
          <p className="pg-notes-kicker">
            <span>{entry.code}</span> {entry.after ?? entry.theme}
          </p>
          <h2 className="pg-notes-title">
            {head && `${head} `}
            <em>{tail}</em>
          </h2>
          {guide ? <p className="pg-notes-lede" dangerouslySetInnerHTML={html(guide.lede)} /> : <p className="pg-notes-lede">{entry.blurb}</p>}
        </header>

        {!guide && <p className="pg-n-p pg-notes-loading">Loading the notes…</p>}

        {guide && (
          <>
            <dl className="pg-notes-facts">
              {guide.facts.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd dangerouslySetInnerHTML={html(v)} />
                </div>
              ))}
            </dl>

            <section className="pg-notes-interact" aria-label="How to interact">
              <p className="pg-notes-label">How to interact</p>
              <Legend interact={guide.interact} tip />
            </section>

            <nav className="pg-notes-toc" aria-label="Contents">
              <p className="pg-notes-label">Contents</p>
              <ol>
                {guide.sections.map((s, i) => (
                  <li key={s.id}>
                    <button type="button" onClick={() => jump(s.id)}>
                      <span>{pad2(i + 1)}</span>
                      {s.title}
                    </button>
                  </li>
                ))}
                {guide.further && guide.further.length > 0 && (
                  <li>
                    <button type="button" onClick={() => jump('further')}>
                      <span>{pad2(guide.sections.length + 1)}</span>
                      Further reading
                    </button>
                  </li>
                )}
              </ol>
            </nav>

            {guide.sections.map((s, i) => (
              <section key={s.id} className="pg-n-section" data-sec={s.id}>
                <p className="pg-n-kicker">
                  <span>§ {pad2(i + 1)}</span>
                  {s.kicker}
                </p>
                <h3 className="pg-n-title">{s.title}</h3>
                {s.blocks.map((b, j) => (
                  <BlockView key={j} b={b} label={eqLabels.get(b)} />
                ))}
              </section>
            ))}

            {guide.further && guide.further.length > 0 && (
              <section className="pg-n-section pg-n-further" data-sec="further">
                <p className="pg-n-kicker">
                  <span>§ {pad2(guide.sections.length + 1)}</span>
                  Sources
                </p>
                <h3 className="pg-n-title">Further reading</h3>
                <ol>
                  {guide.further.map((r, i) => (
                    <li key={i}>
                      <p className="pg-n-ref-title">{r.title}</p>
                      <p className="pg-n-ref-by">
                        {r.by}
                        {r.year ? ` · ${r.year}` : ''}
                      </p>
                      {r.note && <p className="pg-n-ref-note" dangerouslySetInnerHTML={html(r.note)} />}
                    </li>
                  ))}
                </ol>
              </section>
            )}

            <footer className="pg-notes-foot">
              <p>
                Notes for the Playground, written with Claude. The piece runs live {layout === 'side' ? 'beside this text' : 'behind this sheet'}; nothing here
                is a recording.
              </p>
              <button type="button" className="pg-btn" onClick={onClose}>
                {layout === 'sheet' ? '← Back to the piece' : 'Close notes'}
              </button>
            </footer>
          </>
        )}
      </article>
    </div>
  )
}
