import { notFound } from 'next/navigation'
import Link from 'next/link'
import PageHeader from '@/components/PageHeader'
import Card from '@/components/Card'
import StatusBadge from '@/components/StatusBadge'
import PrintButton from '@/components/PrintButton'
import { getLpoById, getSettings } from '@/lib/queries'
import { setLpoStatus } from '@/lib/actions/lpos'
import { getCurrentUser, canMutate } from '@/lib/auth'
import { formatKES } from '@/lib/money'
import { formatDate } from '@/lib/utils'
import { btnSecondary, btnPrimary } from '@/components/form'

const NEXT_ACTIONS = {
  DRAFT: [{ status: 'PENDING_APPROVAL', label: 'Submit for approval' }],
  PENDING_APPROVAL: [
    { status: 'APPROVED', label: 'Approve' },
    { status: 'DRAFT', label: 'Send back to draft' },
  ],
  APPROVED: [{ status: 'FULLY_RECEIVED', label: 'Mark fully received' }],
  PARTIALLY_RECEIVED: [{ status: 'FULLY_RECEIVED', label: 'Mark fully received' }],
  FULLY_RECEIVED: [],
  CANCELLED: [],
}
const CANCELABLE = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PARTIALLY_RECEIVED']

export default async function LpoDetailPage({ params }) {
  const { id } = await params
  const [lpo, settings, user] = await Promise.all([getLpoById(id), getSettings(), getCurrentUser()])
  if (!lpo) notFound()

  const editable = canMutate(user)
  const canApprove = user && ['MANAGER', 'ADMIN'].includes(user.role)
  const nextActions = editable ? (NEXT_ACTIONS[lpo.status] ?? []).filter((a) => a.status !== 'APPROVED' || canApprove) : []
  const canDeliver = editable && ['APPROVED', 'PARTIALLY_RECEIVED'].includes(lpo.status)
  const canCancel = editable && CANCELABLE.includes(lpo.status)

  return (
    <div>
      <div className="no-print flex items-center justify-between mb-6">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wide text-accent mb-1">Purchase order</div>
          <h1 className="text-2xl font-semibold flex items-center gap-3">
            {lpo.lpoNumber}
            <StatusBadge status={lpo.status} />
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {canDeliver && (
            <Link href={`/lpos/${lpo.id}/deliver`} className={btnPrimary}>
              Record delivery
            </Link>
          )}
          {nextActions.map((a) => (
            <form key={a.status} action={setLpoStatus.bind(null, lpo.id, a.status)}>
              <button type="submit" className={btnSecondary}>
                {a.label}
              </button>
            </form>
          ))}
          {canCancel && (
            <form action={setLpoStatus.bind(null, lpo.id, 'CANCELLED')}>
              <button type="submit" className="text-sm text-critical hover:underline px-2">
                Cancel
              </button>
            </form>
          )}
          <PrintButton />
        </div>
      </div>

      {/* Printable LPO document */}
      <div className="bg-surface border border-line rounded-lg p-8 max-w-3xl print:border-0 print:p-0 print:max-w-none">
        <div className="flex items-start justify-between border-b border-line pb-6 mb-6">
          <div>
            <div className="text-lg font-semibold">{settings.companyName}</div>
            {settings.companyAddress && <div className="text-sm text-muted">{settings.companyAddress}</div>}
            {(settings.companyPhone || settings.companyEmail) && (
              <div className="text-sm text-muted">{[settings.companyPhone, settings.companyEmail].filter(Boolean).join(' · ')}</div>
            )}
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide text-muted">Local Purchase Order</div>
            <div className="font-mono font-semibold">{lpo.lpoNumber}</div>
            <div className="text-sm text-muted">{formatDate(lpo.orderDate)}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted mb-1">Supplier</div>
            <div className="font-medium">{lpo.supplier.name}</div>
            {lpo.supplier.address && <div className="text-muted">{lpo.supplier.address}</div>}
            {lpo.supplier.contactPerson && <div className="text-muted">Attn: {lpo.supplier.contactPerson}</div>}
            {lpo.supplier.phone && <div className="text-muted">{lpo.supplier.phone}</div>}
            {lpo.supplier.taxPin && <div className="text-muted">PIN: {lpo.supplier.taxPin}</div>}
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide text-muted mb-1">Payment terms</div>
            <div>{lpo.supplier.paymentTerms || '—'}</div>
          </div>
        </div>

        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="text-left text-xs text-muted uppercase tracking-wide border-b border-line">
              <th className="py-2 font-medium">Description</th>
              <th className="py-2 font-medium text-right">Qty</th>
              <th className="py-2 font-medium">Unit</th>
              <th className="py-2 font-medium text-right">Unit price</th>
              <th className="py-2 font-medium text-right">VAT</th>
              <th className="py-2 font-medium text-right">Line total</th>
            </tr>
          </thead>
          <tbody>
            {lpo.items.map((item) => (
              <tr key={item.id} className="border-b border-line last:border-b-0">
                <td className="py-2.5">{item.product.name}</td>
                <td className="py-2.5 text-right tabular-nums">{Number(item.quantity)}</td>
                <td className="py-2.5">{item.unit}</td>
                <td className="py-2.5 text-right tabular-nums">{formatKES(item.unitPrice)}</td>
                <td className="py-2.5 text-right tabular-nums text-muted">
                  {item.vatStatus === 'EXEMPT' ? 'Exempt' : formatKES(item.lineVat)}
                </td>
                <td className="py-2.5 text-right tabular-nums font-medium">{formatKES(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mb-8">
          <dl className="text-sm space-y-1 w-56">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd className="tabular-nums">{formatKES(lpo.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">VAT</dt>
              <dd className="tabular-nums">{formatKES(lpo.vatTotal)}</dd>
            </div>
            <div className="flex justify-between font-semibold text-base pt-1 border-t border-line">
              <dt>Grand total</dt>
              <dd className="tabular-nums">{formatKES(lpo.grandTotal)}</dd>
            </div>
          </dl>
        </div>

        {(lpo.notes || lpo.terms) && (
          <div className="text-sm mb-10 space-y-2">
            {lpo.notes && (
              <div>
                <span className="text-muted">Notes: </span>
                {lpo.notes}
              </div>
            )}
            {lpo.terms && (
              <div>
                <span className="text-muted">Terms: </span>
                {lpo.terms}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-8 text-sm pt-6 border-t border-line">
          <div>
            <div className="text-muted mb-6">Prepared by</div>
            <div className="border-t border-line pt-1">{lpo.preparedBy?.name || '—'}</div>
          </div>
          <div>
            <div className="text-muted mb-6">Approved by</div>
            <div className="border-t border-line pt-1">{lpo.approvedBy?.name || '—'}</div>
          </div>
        </div>
      </div>

      {lpo.deliveries.length > 0 && (
        <Card title="Deliveries" className="no-print mt-4 !p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted uppercase tracking-wide border-b border-line">
                <th className="px-5 py-2.5 font-medium">Date</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 font-medium text-right">Lines</th>
              </tr>
            </thead>
            <tbody>
              {lpo.deliveries.map((d) => (
                <tr key={d.id} className="border-b border-line last:border-b-0">
                  <td className="px-5 py-3">
                    <Link href={`/deliveries/${d.id}`} className="text-accent-strong hover:underline">
                      {formatDate(d.deliveryDate)}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">{d.items.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
