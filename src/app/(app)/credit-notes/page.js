import Link from 'next/link'
import PageHeader from '@/components/PageHeader'
import StatusBadge from '@/components/StatusBadge'
import { getCreditNotes } from '@/lib/queries'
import { setCreditNoteStatus } from '@/lib/actions/creditNotes'
import { getCurrentUser, canMutate } from '@/lib/auth'
import { formatKES } from '@/lib/money'
import { formatDate } from '@/lib/utils'
import { inputClass, btnGhost } from '@/components/form'

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
                  <td className="px-4 py-3 text-right">
                    {editable && next && (
                      <form action={setCreditNoteStatus.bind(null, cn.id, next)}>
                        <button type="submit" className={btnGhost}>
                          Mark {next.toLowerCase()}
                        </button>
                      </form>
                    )}
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
