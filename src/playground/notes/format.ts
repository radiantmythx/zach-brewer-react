/*
 * Typesetting for the notes: a small TeX subset rendered to HTML (no math
 * library), and the inline markup used in guide text. Both return HTML
 * strings with every piece of source text escaped.
 */

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/* ------------------------------------------------------------------ TeX */

const GREEK: Record<string, string> = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ϵ', varepsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ',
  vartheta: 'ϑ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ',
  tau: 'τ', upsilon: 'υ', phi: 'ϕ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ', Upsilon: 'Υ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
}
// relations and binary operators get space around them
const REL: Record<string, string> = {
  approx: '≈', neq: '≠', ne: '≠', leq: '≤', le: '≤', geq: '≥', ge: '≥', ll: '≪', gg: '≫', equiv: '≡', sim: '∼', simeq: '≃',
  propto: '∝', to: '→', rightarrow: '→', leftarrow: '←', gets: '←', Rightarrow: '⇒', Leftarrow: '⇐', iff: '⟺', mapsto: '↦',
  in: '∈', notin: '∉', subset: '⊂', subseteq: '⊆', cup: '∪', cap: '∩', cdot: '·', times: '×', div: '÷', pm: '±', mp: '∓',
  circ: '∘', odot: '⊙', otimes: '⊗', oplus: '⊕', ast: '∗', star: '⋆', mid: '|', perp: '⊥', uparrow: '↑', downarrow: '↓',
  longrightarrow: '⟶', leftrightarrow: '↔',
}
const SYM: Record<string, string> = {
  partial: '∂', nabla: '∇', infty: '∞', forall: '∀', exists: '∃', ldots: '…', cdots: '⋯', dots: '…', vdots: '⋮',
  lfloor: '⌊', rfloor: '⌋', lceil: '⌈', rceil: '⌉', langle: '⟨', rangle: '⟩', top: '⊤', prime: '′', emptyset: '∅',
  vert: '|', Vert: '‖', angle: '∠', deg: '°', degree: '°', hbar: 'ℏ', ell: 'ℓ', Re: 'ℜ', Im: 'ℑ', colon: ':',
  lbrace: '{', rbrace: '}', neg: '¬', land: '∧', lor: '∨', bullet: '•', square: '□', triangle: '△', checkmark: '✓',
}
const BIG: Record<string, string> = { sum: '∑', prod: '∏', int: '∫', oint: '∮', iint: '∬', bigcup: '⋃', bigcap: '⋂' }
const FN = new Set(['sin', 'cos', 'tan', 'exp', 'log', 'ln', 'max', 'min', 'arg', 'tanh', 'sinh', 'cosh', 'det', 'lim', 'sup', 'inf', 'sgn', 'mod', 'gcd', 'Pr', 'argmax', 'argmin', 'erf', 'atan2', 'arctan', 'diag', 'tr', 'Var', 'Cov'])
const SPACE: Record<string, string> = { ',': '0.17em', ':': '0.22em', ';': '0.28em', quad: '1em', qquad: '2em', ' ': '0.25em' }
const ACCENT: Record<string, string> = { hat: 'ˆ', bar: '¯', vec: '→', dot: '˙', ddot: '¨', tilde: '˜', widehat: 'ˆ', overline: '¯' }
const BB: Record<string, string> = { E: '𝔼', R: 'ℝ', N: 'ℕ', Z: 'ℤ', Q: 'ℚ', C: 'ℂ', P: 'ℙ' }
const CAL: Record<string, string> = { L: 'ℒ', N: '𝒩', O: '𝒪', D: '𝒟', H: 'ℋ', F: 'ℱ', X: '𝒳', B: 'ℬ', E: 'ℰ', M: 'ℳ' }

class TexParser {
  i = 0
  private s: string
  constructor(s: string) {
    this.s = s
  }

  peek() {
    return this.s[this.i]
  }

  /** a group's raw text (for \text{…}), without parsing */
  rawArg() {
    this.skipSpace()
    if (this.s[this.i] !== '{') return this.s[this.i++] ?? ''
    let depth = 0
    const start = ++this.i
    for (; this.i < this.s.length; this.i++) {
      const c = this.s[this.i]
      if (c === '{') depth++
      else if (c === '}') {
        if (depth === 0) break
        depth--
      }
    }
    const out = this.s.slice(start, this.i)
    this.i++
    return out
  }

  skipSpace() {
    while (this.s[this.i] === ' ') this.i++
  }

  /** one argument: a {group} or a single atom */
  arg(): string {
    this.skipSpace()
    if (this.s[this.i] === '{') {
      this.i++
      const out = this.expr('}')
      this.i++
      return out
    }
    return this.atom()
  }

  command(): string {
    const m = /^[a-zA-Z]+/.exec(this.s.slice(this.i))
    if (!m) {
      const c = this.s[this.i++] ?? ''
      if (SPACE[c]) return `<span style="display:inline-block;width:${SPACE[c]}"></span>`
      if (c === '!') return ''
      if (c === '{' || c === '}') return `<span class="m-o">${c}</span>`
      if (c === '|') return '<span class="m-o">‖</span>'
      return esc(c)
    }
    const name = m[0]
    this.i += name.length
    if (name === 'frac' || name === 'dfrac' || name === 'tfrac') {
      const a = this.arg()
      const b = this.arg()
      return `<span class="m-frac"><span class="m-num">${a}</span><span class="m-den">${b}</span></span>`
    }
    if (name === 'sqrt') {
      return `<span class="m-sqrt"><span class="m-rad">√</span><span class="m-sqrt-body">${this.arg()}</span></span>`
    }
    if (ACCENT[name]) {
      const raw = this.peekArgRaw()
      const body = this.arg()
      if (name === 'overline' || name === 'widehat' || raw.length > 1) return `<span class="m-over" data-acc="${name}">${body}</span>`
      return `<span class="m-acc">${body}<span class="m-accmark">${ACCENT[name]}</span></span>`
    }
    if (name === 'text' || name === 'textrm' || name === 'mathrm' || name === 'operatorname' || name === 'textit' || name === 'mbox') {
      const raw = this.rawArg()
      const cls = name === 'operatorname' ? 'm-f' : name === 'textit' ? 'm-ti' : 'm-t'
      return `<span class="${cls}">${esc(raw)}</span>`
    }
    if (name === 'mathbf' || name === 'boldsymbol' || name === 'bm') return `<span class="m-b">${this.arg()}</span>`
    if (name === 'mathbb') {
      const raw = this.rawArg()
      return `<span class="m-o">${esc([...raw].map((c) => BB[c] ?? c).join(''))}</span>`
    }
    if (name === 'mathcal') {
      const raw = this.rawArg()
      return `<span class="m-v">${esc([...raw].map((c) => CAL[c] ?? c).join(''))}</span>`
    }
    if (name === 'left' || name === 'right' || name === 'big' || name === 'Big' || name === 'bigg' || name === 'displaystyle') return ''
    if (GREEK[name]) return `<span class="${/^[A-Z]/.test(name) ? 'm-o' : 'm-v'}">${GREEK[name]}</span>`
    if (REL[name]) return `<span class="m-rel">${REL[name]}</span>`
    if (BIG[name]) return `<span class="m-big">${BIG[name]}</span>`
    if (SYM[name]) return `<span class="m-o">${SYM[name]}</span>`
    if (FN.has(name)) return `<span class="m-f">${name}</span>`
    if (SPACE[name]) return `<span style="display:inline-block;width:${SPACE[name]}"></span>`
    return `<span class="m-t">${esc(name)}</span>`
  }

  peekArgRaw() {
    const save = this.i
    const raw = this.rawArg()
    this.i = save
    return raw
  }

  atom(): string {
    const c = this.s[this.i]
    if (c === undefined) return ''
    if (c === '\\') {
      this.i++
      return this.command()
    }
    if (c === '{') {
      this.i++
      const out = this.expr('}')
      this.i++
      return out
    }
    this.i++
    if (/[a-zA-Z]/.test(c)) return `<span class="m-v">${c}</span>`
    if (/[0-9.]/.test(c)) {
      let num = c
      while (/[0-9.]/.test(this.s[this.i] ?? '')) num += this.s[this.i++]
      return `<span class="m-n">${num}</span>`
    }
    if (c === '-') return '<span class="m-rel">−</span>'
    if (c === '+' || c === '=' || c === '<' || c === '>') return `<span class="m-rel">${esc(c)}</span>`
    if (c === '*') return '<span class="m-rel">∗</span>'
    if (c === "'") return '<span class="m-o">′</span>'
    if (c === '~') return '<span style="display:inline-block;width:0.25em"></span>'
    if (c === ' ') return ''
    if (c === ',' || c === ';') return `<span class="m-p">${c}</span>`
    return `<span class="m-o">${esc(c)}</span>`
  }

  expr(until?: string): string {
    let out = ''
    while (this.i < this.s.length && this.s[this.i] !== until) {
      let base = this.atom()
      // scripts: any order, each at most once
      let sub = ''
      let sup = ''
      for (let k = 0; k < 2; k++) {
        this.skipSpace()
        const c = this.s[this.i]
        if (c === '_' && !sub) {
          this.i++
          sub = this.arg()
        } else if (c === '^' && !sup) {
          this.i++
          sup = this.arg()
        }
      }
      if (sub && sup) base += `<span class="m-scripts"><span class="m-sup">${sup}</span><span class="m-sub">${sub}</span></span>`
      else if (sup) base += `<sup class="m-sup">${sup}</sup>`
      else if (sub) base += `<sub class="m-sub">${sub}</sub>`
      out += base
    }
    return out
  }
}

/** TeX subset → HTML. Never throws; worst case shows the source. */
export function renderTex(tex: string): string {
  try {
    return new TexParser(tex).expr()
  } catch {
    return esc(tex)
  }
}

/* --------------------------------------------------------------- inline */

const INLINE = /(\$[^$]+\$|`[^`]+`|\*\*[^*]+\*\*|\*[^*\s][^*]*\*|\[[^\]]+\]\([^)\s]+\))/g

/** *italic*  **bold**  `code`  $math$  [label](https://…) → HTML */
export function renderInline(text: string): string {
  let out = ''
  let last = 0
  for (const m of text.matchAll(INLINE)) {
    const tok = m[0]
    out += esc(text.slice(last, m.index))
    last = (m.index ?? 0) + tok.length
    if (tok.startsWith('$')) out += `<span class="m">${renderTex(tok.slice(1, -1))}</span>`
    else if (tok.startsWith('`')) out += `<code>${esc(tok.slice(1, -1))}</code>`
    else if (tok.startsWith('**')) out += `<strong>${renderInline(tok.slice(2, -2))}</strong>`
    else if (tok.startsWith('*')) out += `<em>${renderInline(tok.slice(1, -1))}</em>`
    else {
      const lm = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(tok)
      const href = lm?.[2] ?? ''
      if (lm && /^https?:\/\//.test(href)) out += `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer" class="link-u">${renderInline(lm[1])}</a>`
      else out += esc(tok)
    }
  }
  return out + esc(text.slice(last))
}

/** Strip anything executable from an authored SVG figure. */
export function cleanSvg(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*')/gi, '')
    .replace(/javascript:/gi, '')
}
