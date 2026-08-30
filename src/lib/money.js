// Central place for every VAT / totals calculation in the system.
// Rule: nothing hard-codes VAT onto a product — the rate and applicability
// always come from the product (or the price record for historical rows).

export function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}

// A supplier quote can arrive either inclusive or exclusive of VAT.
// This always returns all three figures, reconciled.
export function splitPrice(quotedPrice, vatRatePercent, vatBasis, vatStatus) {
  const quoted = Number(quotedPrice)

  if (vatStatus === 'EXEMPT') {
    return { priceExclVat: round2(quoted), vatAmount: 0, priceInclVat: round2(quoted) }
  }

  const rate = Number(vatRatePercent) / 100

  if (vatBasis === 'INCLUSIVE') {
    const excl = quoted / (1 + rate)
    return {
      priceExclVat: round2(excl),
      vatAmount: round2(quoted - excl),
      priceInclVat: round2(quoted),
    }
  }

  // EXCLUSIVE
  const vat = quoted * rate
  return {
    priceExclVat: round2(quoted),
    vatAmount: round2(vat),
    priceInclVat: round2(quoted + vat),
  }
}

// One LPO line: quantity x unit price (always excl VAT), VAT applied per the rules above.
export function calcLineTotals(quantity, unitPrice, vatRatePercent, vatStatus) {
  const lineSubtotal = round2(Number(quantity) * Number(unitPrice))
  const lineVat = vatStatus === 'EXEMPT' ? 0 : round2(lineSubtotal * (Number(vatRatePercent) / 100))
  const lineTotal = round2(lineSubtotal + lineVat)
  return { lineSubtotal, lineVat, lineTotal }
}

// Sum a set of already-rounded lines into LPO-level totals.
export function calcLpoTotals(lines) {
  const subtotal = round2(lines.reduce((sum, l) => sum + Number(l.lineSubtotal), 0))
  const vatTotal = round2(lines.reduce((sum, l) => sum + Number(l.lineVat), 0))
  const grandTotal = round2(subtotal + vatTotal)
  return { subtotal, vatTotal, grandTotal }
}

// Current vs previous price: absolute and percentage change.
export function priceChange(currentPrice, previousPrice) {
  if (previousPrice === null || previousPrice === undefined) return null
  const current = Number(currentPrice)
  const previous = Number(previousPrice)
  const absolute = round2(current - previous)
  const percent = previous !== 0 ? round2((absolute / previous) * 100) : null
  return { absolute, percent }
}

export function formatKES(value) {
  const n = Number(value)
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}
