import Link from 'next/link'
import PageHeader from '@/components/PageHeader'
import Card from '@/components/Card'
import StatusBadge from '@/components/StatusBadge'
import { getDeliveries, getReceivableLpos } from '@/lib/queries'
import { getCurrentUser, canMutate } from '@/lib/auth'
import { formatDate } from '@/lib/utils'
import { btnSecondary } from '@/components/form'

export default async function DeliveriesPage() {
  const [deliveries, receivable, user] = await Promise.all([getDeliveries(), getReceivableLpos(), getCurrentUser()])
  const editable = canMutate(user)

  return (
    <div>
      <PageHeader
        eyebrow="Fulfillment"
        title="Deliveries"
        subtitle="Compare what arrived against what was ordered, LPO by LPO."
      />

      <Card title="Awaiting delivery" subtitle="Approved LPOs with goods still outstanding" className="mb-4 !p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted uppercase tracking-wide border-b border-line">
              <th className="px-5 py-2.5 font-medium">LPO</th>
              <th className="px-5 py-2.5 font-medium">Supplier</th>
              <th className="px-5 py-2.5 font-medium">Status</th>
              {editable && <th className="px-5 py-2.5 font-medium"></th>}
            </tr>
          </thead>
          <tbody>
            {receivable.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-center text-muted">
                  Nothing awaiting delivery right now.
                </td>
              </tr>
            )}
            {receivable.map((lpo) => (
              <tr key={lpo.id} className="border-b border-line last:border-b-0">
                <td className="px-5 py-3 font-mono text-xs">
                  <Link href={`/lpos/${lpo.id}`} className="text-accent-strong hover:underline">
                    {lpo.lpoNumber}
                  </Link>
                </td>
                <td className="px-5 py-3">{lpo.supplier.name}</td>
                <td className="px-5 py-3">
                  <StatusBadge status={lpo.status} />
                </td>
                {editable && (
                  <td className="px-5 py-3 text-right">
                    <Link href={`/lpos/${lpo.id}/deliver`} className={btnSecondary}>
                      Record delivery
                    </Link>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card title="Delivery history" className="!p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted uppercase tracking-wide border-b border-line">
              <th className="px-5 py-2.5 font-medium">Date</th>
              <th className="px-5 py-2.5 font-medium">LPO</th>
              <th className="px-5 py-2.5 font-medium">Supplier</th>
              <th className="px-5 py-2.5 font-medium">Status</th>
              <th className="px-5 py-2.5 font-medium text-right">Short lines</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-muted">
                  No deliveries recorded yet.
                </td>
              </tr>
            )}
            {deliveries.map((d) => {
              const shortLines = d.items.filter((i) => Number(i.deliveredQty) < Number(i.orderedQty)).length
              return (
                <tr key={d.id} className="border-b border-line last:border-b-0 hover:bg-surface-alt/60">
                  <td className="px-5 py-3">
                    <Link href={`/deliveries/${d.id}`} className="hover:text-accent-strong">
                      {formatDate(d.deliveryDate)}
                    </Link>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-accent-strong">
                    <Link href={`/lpos/${d.lpoId}`} className="hover:underline">
                      {d.lpo.lpoNumber}
                    </Link>
                  </td>
                  <td className="px-5 py-3">{d.lpo.supplier.name}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {shortLines > 0 ? <span className="text-critical">{shortLines}</span> : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
