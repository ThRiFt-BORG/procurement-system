import Link from 'next/link'
import PageHeader from '@/components/PageHeader'
import StatusBadge from '@/components/StatusBadge'
import { getLpos } from '@/lib/queries'
import { getCurrentUser, canMutate } from '@/lib/auth'
import { formatKES } from '@/lib/money'
import { formatDate } from '@/lib/utils'
import { inputClass, btnPrimary } from '@/components/form'

const STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED', 'CANCELLED']

export default async function LposPage({ searchParams }) {
  const { q, status } = await searchParams
  const [lpos, user] = await Promise.all([getLpos({ search: q, status }), getCurrentUser()])

  return (
    <div>
      <PageHeader
        eyebrow="Purchase orders"
        title="LPOs"
        subtitle="Every purchase order raised, from draft to fully received."
        actions={
          canMutate(user) && (
            <Link href="/lpos/new" className={btnPrimary}>
              + Create LPO
            </Link>
          )
        }
      />

      <form className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search LPO number or supplier…"
          className={`${inputClass} max-w-sm`}
        />
        <select name="status" defaultValue={status ?? ''} className={`${inputClass} max-w-xs`}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
        <button type="submit" className={btnPrimary}>
          Filter
        </button>
      </form>

      <div className="bg-surface border border-line rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted uppercase tracking-wide border-b border-line">
              <th className="px-4 py-2.5 font-medium">LPO number</th>
              <th className="px-4 py-2.5 font-medium">Supplier</th>
              <th className="px-4 py-2.5 font-medium">Date</th>
              <th className="px-4 py-2.5 font-medium text-right">Lines</th>
              <th className="px-4 py-2.5 font-medium text-right">Total</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {lpos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  No LPOs found.
                </td>
              </tr>
            )}
            {lpos.map((lpo) => (
              <tr key={lpo.id} className="border-b border-line last:border-b-0 hover:bg-surface-alt/60">
                <td className="px-4 py-3">
                  <Link href={`/lpos/${lpo.id}`} className="font-mono text-xs text-accent-strong hover:underline">
                    {lpo.lpoNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 font-medium">{lpo.supplier.name}</td>
                <td className="px-4 py-3 text-muted">{formatDate(lpo.orderDate)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{lpo._count.items}</td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">{formatKES(lpo.grandTotal)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={lpo.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
