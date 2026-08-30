import { notFound } from 'next/navigation'
import Link from 'next/link'
import PageHeader from '@/components/PageHeader'
import Card from '@/components/Card'
import StatusBadge from '@/components/StatusBadge'
import { getDeliveryById } from '@/lib/queries'
import { createCreditNote } from '@/lib/actions/creditNotes'
import { getCurrentUser, canMutate } from '@/lib/auth'
import { formatKES, round2 } from '@/lib/money'
import { formatDate } from '@/lib/utils'
import { inputClass, labelClass, btnPrimary } from '@/components/form'

export default async function DeliveryDetailPage({ params }) {
  const { id } = await params
  const [delivery, user] = await Promise.all([getDeliveryById(id), getCurrentUser()])
  if (!delivery) notFound()
  const editable = canMutate(user)

  return (
    <div>
      <PageHeader
        eyebrow={delivery.lpo.lpoNumber}
        title={`Delivery — ${formatDate(delivery.deliveryDate)}`}
        subtitle={delivery.lpo.supplier.name}
        actions={<StatusBadge status={delivery.status} />}
      />

      <Card title="Lines" className="!p-0 mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted uppercase tracking-wide border-b border-line">
              <th className="px-5 py-2.5 font-medium">Product</th>
              <th className="px-5 py-2.5 font-medium text-right">Ordered</th>
              <th className="px-5 py-2.5 font-medium text-right">Delivered</th>
              <th className="px-5 py-2.5 font-medium text-right">Missing</th>
              <th className="px-5 py-2.5 font-medium">Credit note</th>
            </tr>
          </thead>
          <tbody>
            {delivery.items.map((item) => {
              const missingQty = round2(Number(item.orderedQty) - Number(item.deliveredQty))
              const unitPriceInclVat = round2(Number(item.lpoItem.lineTotal) / Number(item.lpoItem.quantity))
              const missingValue = round2(missingQty * unitPriceInclVat)

              return (
                <tr key={item.id} className="border-b border-line last:border-b-0 align-top">
                  <td className="px-5 py-3">{item.lpoItem.product.name}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-muted">
                    {Number(item.orderedQty)} {item.lpoItem.unit}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {Number(item.deliveredQty)} {item.lpoItem.unit}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {missingQty > 0 ? (
                      <span className="text-critical">
                        {missingQty} {item.lpoItem.unit}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {missingQty <= 0 ? (
                      '—'
                    ) : item.creditNotes.length > 0 ? (
                      <div className="space-y-1">
                        {item.creditNotes.map((cn) => (
                          <div key={cn.id} className="flex items-center gap-2">
                            <span className="tabular-nums">{formatKES(cn.amount)}</span>
                            <StatusBadge status={cn.status} />
                          </div>
                        ))}
                      </div>
                    ) : !editable ? (
                      <span className="text-critical text-xs font-medium">
                        Credit note required — {formatKES(missingValue)}
                      </span>
                    ) : (
                      <details className="group">
                        <summary className="cursor-pointer text-critical text-xs font-medium">
                          Credit note required — {formatKES(missingValue)}
                        </summary>
                        <form action={createCreditNote} className="mt-2 space-y-2 max-w-xs">
                          <input type="hidden" name="deliveryItemId" value={item.id} />
                          <input type="hidden" name="amount" value={missingValue} />
                          <div>
                            <label className={labelClass}>Credit note number</label>
                            <input name="creditNoteNumber" className={inputClass} />
                          </div>
                          <div>
                            <label className={labelClass}>Credit note date</label>
                            <input type="date" name="creditNoteDate" className={inputClass} />
                          </div>
                          <button type="submit" className={btnPrimary}>
                            Log credit note ({formatKES(missingValue)})
                          </button>
                        </form>
                      </details>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>

      {delivery.notes && (
        <Card title="Notes">
          <p className="text-sm">{delivery.notes}</p>
        </Card>
      )}

      <p className="text-sm text-muted mt-4">
        From{' '}
        <Link href={`/lpos/${delivery.lpoId}`} className="text-accent-strong hover:underline">
          {delivery.lpo.lpoNumber}
        </Link>
      </p>
    </div>
  )
}
