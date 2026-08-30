'use client'

import { useState } from 'react'
import { createDelivery } from '@/lib/actions/deliveries'
import { formatKES } from '@/lib/money'
import { inputClass, labelClass, btnPrimary } from '@/components/form'

export default function DeliverForm({ lpo }) {
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [quantities, setQuantities] = useState(() =>
    Object.fromEntries(lpo.lines.map((l) => [l.lpoItemId, l.remaining]))
  )
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    const items = lpo.lines
      .map((l) => ({ lpoItemId: l.lpoItemId, deliveredQty: Number(quantities[l.lpoItemId] || 0) }))
      .filter((i) => i.deliveredQty > 0)

    if (items.length === 0) return setError('Enter at least one delivered quantity')

    setPending(true)
    try {
      await createDelivery({ lpoId: lpo.id, deliveryDate, notes, items })
    } catch (err) {
      if (err?.digest?.startsWith?.('NEXT_REDIRECT')) throw err
      setError(err.message || 'Could not record the delivery')
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="bg-surface border border-line rounded-lg p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Delivery date</label>
          <input type="date" className={inputClass} value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Notes</label>
          <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Delivered by van, driver signed off" />
        </div>
      </div>

      <div className="bg-surface border border-line rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted uppercase tracking-wide border-b border-line">
              <th className="px-4 py-2.5 font-medium">Product</th>
              <th className="px-4 py-2.5 font-medium text-right">Ordered</th>
              <th className="px-4 py-2.5 font-medium text-right w-32">Delivered now</th>
              <th className="px-4 py-2.5 font-medium text-right">Missing</th>
              <th className="px-4 py-2.5 font-medium text-right">Missing value</th>
            </tr>
          </thead>
          <tbody>
            {lpo.lines.map((l) => {
              const delivered = Number(quantities[l.lpoItemId] || 0)
              const missing = Math.max(0, round2(l.remaining - delivered))
              return (
                <tr key={l.lpoItemId} className="border-b border-line last:border-b-0">
                  <td className="px-4 py-2.5">
                    {l.productName}
                    {l.deliveredSoFar > 0 && (
                      <div className="text-xs text-muted">{l.deliveredSoFar} {l.unit} already received</div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted">
                    {l.remaining} {l.unit}
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="number"
                      min="0"
                      max={l.remaining}
                      step="0.01"
                      className={inputClass + ' text-right'}
                      value={quantities[l.lpoItemId]}
                      onChange={(e) => setQuantities((q) => ({ ...q, [l.lpoItemId]: e.target.value }))}
                    />
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {missing > 0 ? <span className="text-critical">{missing} {l.unit}</span> : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {missing > 0 ? formatKES(round2(missing * l.unitPriceInclVat)) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {error && <p className="text-sm text-critical">{error}</p>}

      <button type="submit" className={btnPrimary} disabled={pending}>
        {pending ? 'Saving…' : 'Record delivery'}
      </button>
    </form>
  )
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}
