import Link from 'next/link'
import PageHeader from '@/components/PageHeader'
import StatusBadge from '@/components/StatusBadge'
import { getCreditNotes } from '@/lib/queries'
import { setCreditNoteStatus, updateCreditNote } from '@/lib/actions/creditNotes'
import { getCurrentUser, canMutate } from '@/lib/auth'
import { formatKES } from '@/lib/money'
import { formatDate } from '@/lib/utils'
import { inputClass, labelClass, btnGhost, btnPrimary } from '@/components/form'

const EDITABLE_STATUSES = ['PENDING', 'REQUESTED']

const STATUSES = ['PENDING', 'REQUESTED', 'RECEIVED', 'COMPLETED']
const NEXT_STATUS = { PENDING: 'REQUESTED', REQUESTED: 'RECEIVED', RECEIVED: 'COMPLETED' }

export default async function CreditNotesPage({ searchParams }) {
  const { status } = await searchParams
  const [creditNotes, user] = await Promise.all([getCreditNotes(status), getCurrentUser()])
  const editable = canMutate(user)

  return (
    <div>
      <PageHeader
        eyebrow="Fulfillment"
        title="Credit notes"
        subtitle="Every short delivery, traced back to the original LPO, until the credit is confirmed."
      />

      <form className="mb-4">
        <select name="status" defaultValue={status ?? ''} className={`${inputClass} max-w-xs`}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </form>

      <div className="bg-surface border border-line rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted uppercase tracking-wide border-b border-line">
              <th className="px-4 py-2.5 font-medium">Product</th>
              <th className="px-4 py-2.5 font-medium">LPO</th>
              <th className="px-4 py-2.5 font-medium">Supplier</th>
              <th className="px-4 py-2.5 font-medium">CN number</th>
              <th className="px-4 py-2.5 font-medium text-right">Amount</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {creditNotes.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  No credit notes found.
                </td>
              </tr>
            )}
            {creditNotes.map((cn) => {
              const lpo = cn.deliveryItem.delivery.lpo
              const next = NEXT_STATUS[cn.status]
              return (
                <tr key={cn.id} className="border-b border-line last:border-b-0">
                  <td className="px-4 py-3 font-medium">{cn.deliveryItem.lpoItem.product.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    <Link href={`/lpos/${lpo.id}`} className="text-accent-strong hover:underline">
                      {lpo.lpoNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{lpo.supplier.name}</td>
                  <td className="px-4 py-3 text-muted">{cn.creditNoteNumber || '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">{formatKES(cn.amount)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={cn.status} />
                  </td>
                  <td className="px-4 py-3 text-right align-top">
                    <div className="flex items-center justify-end gap-2">
                      {editable && next && (
                        <form action={setCreditNoteStatus.bind(null, cn.id, next)}>
                          <button type="submit" className={btnGhost}>
                            Mark {next.toLowerCase()}
                          </button>
                        </form>
                      )}
                      {editable && EDITABLE_STATUSES.includes(cn.status) && (
                        <details className="text-left">
                          <summary className={`${btnGhost} inline-block cursor-pointer select-none`}>Edit</summary>
                          <form action={updateCreditNote.bind(null, cn.id)} className="mt-2 space-y-2 w-56">
                            <div>
                              <label className={labelClass}>Amount</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                name="amount"
                                defaultValue={Number(cn.amount)}
                                className={inputClass}
                              />
                            </div>
                            <div>
                              <label className={labelClass}>Credit note number</label>
                              <input name="creditNoteNumber" defaultValue={cn.creditNoteNumber ?? ''} className={inputClass} />
                            </div>
                            <div>
                              <label className={labelClass}>Credit note date</label>
                              <input
                                type="date"
                                name="creditNoteDate"
                                defaultValue={cn.creditNoteDate ? new Date(cn.creditNoteDate).toISOString().slice(0, 10) : ''}
                                className={inputClass}
                              />
                            </div>
                            <div>
                              <label className={labelClass}>Notes</label>
                              <textarea name="notes" rows={2} defaultValue={cn.notes ?? ''} className={inputClass} />
                            </div>
                            <button type="submit" className={btnPrimary}>
                              Save
                            </button>
                          </form>
                        </details>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
