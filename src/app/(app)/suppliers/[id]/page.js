import { notFound } from 'next/navigation'
import Link from 'next/link'
import PageHeader from '@/components/PageHeader'
import Card from '@/components/Card'
import StatusBadge from '@/components/StatusBadge'
import { getSupplierById } from '@/lib/queries'
import { getCurrentUser, canMutate } from '@/lib/auth'
import { formatKES } from '@/lib/money'
import { formatDate } from '@/lib/utils'
import { btnSecondary } from '@/components/form'

export default async function SupplierDetailPage({ params }) {
  const { id } = await params
  const [supplier, user] = await Promise.all([getSupplierById(id), getCurrentUser()])
  if (!supplier) notFound()

  return (
    <div>
      <PageHeader
        eyebrow="Supplier"
        title={supplier.name}
        subtitle={[supplier.contactPerson, supplier.phone, supplier.email].filter(Boolean).join(' · ') || undefined}
        actions={
          <>
            <StatusBadge status={supplier.active ? 'ACTIVE' : 'INACTIVE'} />
            {canMutate(user) && (
              <Link href={`/suppliers/${supplier.id}/edit`} className={btnSecondary}>
                Edit
              </Link>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card title="Details" className="text-sm">
          <dl className="space-y-2.5">
            <Row label="Payment terms" value={supplier.paymentTerms} />
            <Row label="Tax / VAT PIN" value={supplier.taxPin} />
            <Row label="Address" value={supplier.address} />
            <Row label="Bank details" value={supplier.bankDetails} />
            <Row label="Notes" value={supplier.notes} />
          </dl>
        </Card>

        <Card title="Products supplied" className="lg:col-span-2 !p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted uppercase tracking-wide border-b border-line">
                <th className="px-5 py-2.5 font-medium">Product</th>
                <th className="px-5 py-2.5 font-medium">Category</th>
                <th className="px-5 py-2.5 font-medium text-right">Current price</th>
              </tr>
            </thead>
            <tbody>
              {supplier.products.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-6 text-center text-muted">
                    No products linked yet.
                  </td>
                </tr>
              )}
              {supplier.products.map((sp) => (
                <tr key={sp.id} className="border-b border-line last:border-b-0">
                  <td className="px-5 py-3">
                    <Link href={`/products/${sp.productId}`} className="font-medium hover:text-accent-strong">
                      {sp.product.name}
                    </Link>
                    {sp.isPreferred && <span className="ml-2 text-[10px] uppercase tracking-wide text-accent-strong">preferred</span>}
                  </td>
                  <td className="px-5 py-3 text-muted">{sp.product.category.name}</td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {sp.priceHistory[0] ? formatKES(sp.priceHistory[0].priceExclVat) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <Card title="Recent purchase orders" className="!p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted uppercase tracking-wide border-b border-line">
              <th className="px-5 py-2.5 font-medium">LPO</th>
              <th className="px-5 py-2.5 font-medium">Date</th>
              <th className="px-5 py-2.5 font-medium text-right">Total</th>
              <th className="px-5 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {supplier.lpos.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-center text-muted">
                  No LPOs raised yet.
                </td>
              </tr>
            )}
            {supplier.lpos.map((lpo) => (
              <tr key={lpo.id} className="border-b border-line last:border-b-0">
                <td className="px-5 py-3">
                  <Link href={`/lpos/${lpo.id}`} className="font-mono text-xs text-accent-strong hover:underline">
                    {lpo.lpoNumber}
                  </Link>
                </td>
                <td className="px-5 py-3 text-muted">{formatDate(lpo.orderDate)}</td>
                <td className="px-5 py-3 text-right tabular-nums">{formatKES(lpo.grandTotal)}</td>
                <td className="px-5 py-3">
                  <StatusBadge status={lpo.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right text-foreground">{value || '—'}</dd>
    </div>
  )
}
