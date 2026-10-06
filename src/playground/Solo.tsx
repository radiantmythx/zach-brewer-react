import Stage from './Stage'

/*
 * The solo/test route: /playground/?solo=games/debris
 *   &mode=preview|full   (default full)
 *   &t=6.5               step deterministically to t seconds, then freeze
 *   &w=360&h=270         fixed stage size in CSS px (default: the window)
 * Any other params reach the piece as env.params (e.g. &state=over).
 */

export default function Solo({ params }: { params: URLSearchParams }) {
  const key = params.get('solo') ?? ''
  const mode = params.get('mode') === 'preview' ? 'preview' : 'full'
  const tRaw = params.get('t')
  const fixedTime = tRaw !== null && tRaw !== '' && Number.isFinite(Number(tRaw)) ? Number(tRaw) : null
  const w = Number(params.get('w')) || 0
  const h = Number(params.get('h')) || 0
  return (
    <div className="pg-solo" style={w && h ? { width: w, height: h } : undefined}>
      <Stage pieceKey={key} mode={mode} running fixedTime={fixedTime} params={params} label={key} />
    </div>
  )
}
