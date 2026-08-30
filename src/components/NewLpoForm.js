'use client'

import { useMemo, useState } from 'react'
import { createLpo } from '@/lib/actions/lpos'
import { splitPrice, calcLineTotals, calcLpoTotals, formatKES } from '@/lib/money'
import { inputClass, labelClass, btnPrimary, btnSecondary, btnGhost } from '@/components/form'

let nextKey = 1

export default function NewLpoForm({ suppliers, productsBySupplier }) {
  const [supplierId, setSupplierId] = useState('')
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [terms, setTerms] = useState('Delivery within 48 hours. Goods subject to inspection on arrival.')
  const [lines, setLines] = useState([])
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)

  const availableProducts = productsBySupplier[supplierId] ?? []

  function handleSupplierChange(id) {
    setSupplierId(id)
    setLines([])
  }

  function addLine() {
    const used = new Set(lines.map((l) => l.supplierProductId))
    const next = availableProducts.find((p) => !used.has(p.supplierProductId))
    if (!next) return
    setLines((prev) => [
      ...prev,
      {
        key: nextKey++,
        supplierProductId: next.supplierProductId,
        quantity: 1,
        quotedPrice: next.latestPrice,
        vatBasis: 'EXCLUSIVE',
      },
    ])
  }

  function updateLine(key, patch) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  }

  function removeLine(key) {
    setLines((prev) => prev.filter((l) => l.key !== key))
  }

  function productFor(supplierProductId) {
    return availableProducts.find((p) => p.supplierProductId === supplierProductId)
  }

  const computedLines = useMemo(
    () =>
      lines.map((line) => {
        const product = productFor(line.supplierProductId)
        if (!product || !line.quotedPrice) return { ...line, product, lineSubtotal: 0, lineVat: 0, lineTotal: 0 }
        const { priceExclVat } = splitPrice(line.quotedPrice, product.vatRate, line.vatBasis, product.vatStatus)
        const totals = calcLineTotals(line.quantity || 0, priceExclVat, product.vatRate, product.vatStatus)
        return { ...line, product, priceExclVat, ...totals }
      }),
    [lines, availableProducts]
  )

  const totals = calcLpoTotals(computedLines)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!supplierId) return setError('Select a supplier')
    if (lines.length === 0) return setError('Add at least one line item')

    setPending(true)
    try {
      await createLpo({
        supplierId,
        orderDate,
        notes,
        terms,
        lines: lines.map((l) => ({
          supplierProductId: l.supplierProductId,
          quantity: Number(l.quantity),
          quotedPrice: Number(l.quotedPrice),
          vatBasis: l.vatBasis,
        })),
      })
    } catch (err) {
      if (err?.digest?.startsWith?.('NEXT_REDIRECT')) throw err
      setError(err.message || 'Could not create the LPO')
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="bg-surface border border-line rounded-lg p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Supplier *</label>
          <select
            className={inputClass}
            value={supplierId}
            onChange={(e) => handleSupplierChange(e.target.value)}
            required
          >
            <option value="" disabled>
              Select supplier
            </option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Order date</label>
          <input type="date" className={inputClass} value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Notes</label>
          <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Weekly standing order" />
        </div>
      </div>

      <div className="bg-surface border border-line rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line">
          <h2 className="text-sm font-semibold">Line items</h2>
          <button type="button" onClick={addLine} className={btnSecondary} disabled={!supplierId}>
            + Add line
          </button>
        </div>

        {!supplierId ? (
          <p className="text-sm text-muted p-5">Select a supplier to choose products.</p>
        ) : lines.length === 0 ? (
          <p className="text-sm text-muted p-5">No lines yet — add one above.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted uppercase tracking-wide border-b border-line">
                <th className="px-4 py-2 font-medium">Product</th>
                <th className="px-4 py-2 font-medium w-24">Qty</th>
                <th className="px-4 py-2 font-medium w-32">Unit price</th>
                <th className="px-4 py-2 font-medium w-36">Basis</th>
                <th className="px-4 py-2 font-medium text-right">Line total</th>
                <th className="px-4 py-2 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody>
              {computedLines.map((line) => (
                <tr key={line.key} className="border-b border-line last:border-b-0">
                  <td className="px-4 py-2">
                    <select
                      className={inputClass}
                      value={line.supplierProductId}
                      onChange={(e) => updateLine(line.key, { supplierProductId: e.target.value })}
                    >
                      {availableProducts.map((p) => (
                        <option key={p.supplierProductId} value={p.supplierProductId}>
                          {p.productName} ({p.unit})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className={inputClass}
                      value={line.quantity}
                      onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className={inputClass}
                      value={line.quotedPrice}
                      onChange={(e) => updateLine(line.key, { quotedPrice: e.target.value })}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      className={inputClass}
                      value={line.vatBasis}
                      onChange={(e) => updateLine(line.key, { vatBasis: e.target.value })}
                    >
                      <option value="EXCLUSIVE">Excl. VAT</option>
                      <option value="INCLUSIVE">Incl. VAT</option>
                    </select>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums font-medium">{formatKES(line.lineTotal)}</td>
                  <td className="px-4 py-2 text-right">
                    <button type="button" onClick={() => removeLine(line.key)} className={btnGhost}>
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {lines.length > 0 && (
          <div className="border-t border-line px-5 py-3.5 flex justify-end">
            <dl className="text-sm space-y-1 w-56">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="tabular-nums">{formatKES(totals.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">VAT</dt>
                <dd className="tabular-nums">{formatKES(totals.vatTotal)}</dd>
              </div>
              <div className="flex justify-between font-semibold text-base pt-1 border-t border-line">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatKES(totals.grandTotal)}</dd>
              </div>
            </dl>
          </div>
        )}
      </div>

      <div className="bg-surface border border-line rounded-lg p-5">
        <label className={labelClass}>Terms</label>
        <textarea className={inputClass} rows={2} value={terms} onChange={(e) => setTerms(e.target.value)} />
      </div>

      {error && <p className="text-sm text-critical">{error}</p>}

      <button type="submit" className={btnPrimary} disabled={pending}>
        {pending ? 'Saving…' : 'Save LPO as draft'}
      </button>
    </form>
  )
}
