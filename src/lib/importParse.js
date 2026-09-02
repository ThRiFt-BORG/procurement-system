// Parsing/normalization helpers for the spreadsheet importer. Pure functions,
// no framework dependency — kept separate from ImportWizard so the parsing
// logic (which deals with genuinely messy real-world spreadsheets) can be
// read and adjusted on its own.

export function normalizeKey(s) {
  return (s ?? '')
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function titleCase(s) {
  return (s ?? '')
    .toString()
    .trim()
    .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
}

export function levenshtein(a, b) {
  if (a === b) return 0
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i++) dp[i][0] = i
  for (let j = 0; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1])
    }
  }
  return dp[a.length][b.length]
}

// Interprets one VAT-column cell. Returns a status plus a confidence flag —
// low-confidence / unrecognized readings are surfaced to the reviewer rather
// than silently guessed.
export function classifyVat(raw) {
  if (raw === null || raw === undefined) return { status: 'AMBIGUOUS' }
  if (typeof raw === 'number') {
    return { status: 'AMBIGUOUS', hint: `Found a number (${raw}) here instead of a VAT note — this row's columns may not line up as expected.` }
  }
  const s = raw.toString().trim().toLowerCase()
  if (!s) return { status: 'AMBIGUOUS' }
  if (s === 'not stated' || s === 'n/a' || s === '-' || s === 'unknown') return { status: 'AMBIGUOUS' }
  if (s.includes('exempt')) return { status: 'EXEMPT', confident: true }
  if (s === '0% vat' || s === '0%') return { status: 'EXEMPT', confident: true, hint: '0% VAT treated as Exempt — no VAT amount either way.' }
  if (s.includes('incl')) return { status: 'APPLICABLE', basis: 'INCLUSIVE', confident: true }
  if (s.includes('excl')) return { status: 'APPLICABLE', basis: 'EXCLUSIVE', confident: true }
  if (/^\d+(\.\d+)?%?\s*vat$/.test(s) || /^\d+(\.\d+)?%$/.test(s)) {
    return {
      status: 'APPLICABLE',
      basis: 'INCLUSIVE',
      confident: false,
      hint: `"${raw}" gives a rate but not whether the price already includes VAT — defaulted to Inclusive, please confirm.`,
    }
  }
  return { status: 'AMBIGUOUS', hint: `Unrecognized VAT note: "${raw}"` }
}

// Finds the header row (the row containing a "product" column) within the
// first 10 rows, then locates category/supplier/product columns by header
// text. Price/VAT are NOT trusted to fixed columns — see scanForPrice below,
// because real files shift these around row by row (an optional pack-size
// column appears for some rows and not others).
export function locateColumns(aoa) {
  const searchDepth = Math.min(10, aoa.length)
  for (let r = 0; r < searchDepth; r++) {
    const row = aoa[r] ?? []
    const productCol = row.findIndex((c) => c?.toString().trim().toLowerCase() === 'product')
    if (productCol === -1) continue

    const supplierCol = row.findIndex((c) => c?.toString().trim().toLowerCase().includes('supplier'))
    let categoryCol = row.findIndex((c) => c?.toString().trim().toLowerCase().includes('category'))
    if (categoryCol === -1 && productCol > 0 && (row[productCol - 1] === null || row[productCol - 1] === undefined || row[productCol - 1] === '')) {
      // Common pattern: an unlabeled fill-down column immediately before Product.
      categoryCol = productCol - 1
    }

    return { headerRow: r, productCol, supplierCol: supplierCol === -1 ? productCol + 1 : supplierCol, categoryCol }
  }
  return null
}

// From the cells after the supplier column, finds the first numeric cell
// (the price) and whatever sits immediately after it (the VAT note). Any
// non-empty text seen before the price is kept as a unit/spec hint — real
// files sometimes insert an optional pack-size column ("1kg", "6 pieces")
// that pushes the price one column to the right only for some rows.
export function scanForPriceAndVat(row, fromCol) {
  let unitHint = null
  for (let c = fromCol; c < row.length; c++) {
    const cell = row[c]
    if (cell === null || cell === undefined || cell === '') continue
    if (typeof cell === 'number' || (typeof cell === 'string' && cell.trim() !== '' && !Number.isNaN(Number(cell.trim())))) {
      const price = Number(cell)
      const vatRaw = row[c + 1] !== undefined && row[c + 1] !== null && row[c + 1] !== '' ? row[c + 1] : null
      return { price, vatRaw, unitHint }
    }
    if (unitHint === null) unitHint = cell.toString().trim()
  }
  return { price: null, vatRaw: null, unitHint }
}

// Groups a list of raw strings into clusters by normalized key (handles
// case/punctuation/whitespace variants for free), then flags clusters whose
// key is a close spelling match (edit distance <= 2) to another cluster or
// to an existing database name — a suggestion the reviewer can accept, never
// applied automatically.
export function buildGroups(rawValues, existingNames) {
  const byKey = new Map()
  for (const raw of rawValues) {
    const trimmed = raw?.toString().trim()
    if (!trimmed) continue
    const key = normalizeKey(trimmed)
    if (!key) continue
    if (!byKey.has(key)) byKey.set(key, { key, variants: new Map(), count: 0 })
    const g = byKey.get(key)
    g.variants.set(trimmed, (g.variants.get(trimmed) ?? 0) + 1)
    g.count += 1
  }

  const groups = [...byKey.values()].map((g) => {
    const label = [...g.variants.entries()].sort((a, b) => b[1] - a[1])[0][0]
    return { key: g.key, label, count: g.count, variants: [...g.variants.keys()] }
  })

  const existingKeyed = (existingNames ?? []).map((n) => ({ id: n.id, name: n.name, key: normalizeKey(n.name) }))

  for (const g of groups) {
    // First choice: an exact normalized match against the database.
    const exact = existingKeyed.find((e) => e.key === g.key)
    if (exact) {
      g.exactMatchId = exact.id
      continue
    }
    // Otherwise, suggest the closest existing name or sibling group, if close enough.
    let best = null
    const candidates = [
      ...existingKeyed.map((e) => ({ id: e.id, name: e.name, key: e.key, source: 'existing' })),
      ...groups.filter((o) => o.key !== g.key).map((o) => ({ id: null, name: o.label, key: o.key, source: 'group' })),
    ]
    for (const cand of candidates) {
      if (Math.min(g.key.length, cand.key.length) < 6) continue
      const dist = levenshtein(g.key, cand.key)
      if (dist <= 2 && (!best || dist < best.dist)) best = { ...cand, dist }
    }
    if (best) g.suggestion = best
  }

  return groups.sort((a, b) => b.count - a.count)
}
