import { notFound } from 'next/navigation'
import Link from 'next/link'
import PageHeader from '@/components/PageHeader'
import Card from '@/components/Card'
import StatusBadge from '@/components/StatusBadge'
import { getProductById } from '@/lib/queries'
import { db } from '@/lib/db'
import { addPricePoint, addSupplierWithPrice } from '@/lib/actions/products'
import { setProductActive } from '@/lib/actions/products'
import { getCurrentUser, canMutate } from '@/lib/auth'
import { formatKES } from '@/lib/money'
import { formatDate } from '@/lib/utils'
import { inputClass, labelClass, btnPrimary, btnGhost } from '@/components/form'

export default async function ProductDetailPage({ params }) {
  const { id } = await params
  const [product, user] = await Promise.all([getProductById(id), getCurrentUser()])
  if (!product) notFound()
  const editable = canMutate(user)

  const linkedSupplierIds = new Set(product.suppliers.map((sp) => sp.supplierId))
  const availableSuppliers = editable
    ? await db.supplier.findMany({
        where: { active: true, id: { notIn: [...linkedSupplierIds] } },
        orderBy: { name: 'asc' },
      })
    : []

  const allPriceRows = product.suppliers
    .flatMap((sp) => sp.priceHistory.map((ph) => ({ ...ph, supplierName: sp.supplier.name })))
    .sort((a, b) => new Date(b.effectiveDate) - new Date(a.effectiveDate))

  return (
    <div>
      <PageHeader
        eyebrow={product.category.name}
        title={product.name}
        subtitle={`${product.unit} · ${product.vatStatus === 'EXEMPT' ? 'VAT exempt' : `VAT ${Number(product.vatRate)}%`}`}
        actions={
          <>
            <StatusBadge status={product.active ? 'ACTIVE' : 'INACTIVE'} />
            {editable && (
              <form action={setProductActive.bind(null, product.id, !product.active)}>
                <button type="submit" className={btnGhost}>
                  {product.active ? 'Deactivate' : 'Activate'}
                </button>
              </form>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card title="Suppliers & current price" className="lg:col-span-2 !p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted uppercase tracking-wide border-b border-line">
                <th className="px-5 py-2.5 font-medium">Supplier</th>
                <th className="px-5 py-2.5 font-medium text-right">Price (excl. VAT)</th>
                <th className="px-5 py-2.5 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {product.suppliers.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-6 text-center text-muted">
                    No suppliers linked yet — add one on the right.
                  </td>
                </tr>
              )}
              {product.suppliers.map((sp) => (
                <tr key={sp.id} className="border-b border-line last:border-b-0">
                  <td className="px-5 py-3">
                    <Link href={`/suppliers/${sp.supplierId}`} className="font-medium hover:text-accent-strong">
                      {sp.supplier.name}
                    </Link>
                    {sp.isPreferred && <span className="ml-2 text-[10px] uppercase tracking-wide text-accent-strong">preferred</span>}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {sp.priceHistory[0] ? formatKES(sp.priceHistory[0].priceExclVat) : '—'}
                  </td>
                  <td className="px-5 py-3 text-muted">
                    {sp.priceHistory[0] ? formatDate(sp.priceHistory[0].effectiveDate) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Add a supplier">
          {!editable ? (
            <p className="text-sm text-muted">Only Officers, Managers and Admins can link a new supplier.</p>
          ) : availableSuppliers.length === 0 ? (
            <p className="text-sm text-muted">All active suppliers are already linked to this product.</p>
          ) : (
            <form action={addSupplierWithPrice} className="space-y-3">
              <input type="hidden" name="productId" value={product.id} />
              <div>
                <label className={labelClass}>Supplier *</label>
                <select name="supplierId" required className={inputClass} defaultValue="">
                  <option value="" disabled>
                    Select supplier
                  </option>
                  {availableSuppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Quoted price *</label>
                <input type="number" step="0.01" min="0" name="quotedPrice" required className={inputClass} />
              </div>
              {product.vatStatus === 'EXEMPT' ? (
                <p className="text-xs text-muted">This product is VAT exempt — the price above is the price paid, nothing to add.</p>
              ) : (
                <div>
                  <label className={labelClass}>Basis</label>
                  <select name="vatBasis" className={inputClass} defaultValue="EXCLUSIVE">
                    <option value="EXCLUSIVE">Excludes VAT</option>
                    <option value="INCLUSIVE">Includes VAT</option>
                  </select>
                </div>
              )}
              <div>
                <label className={labelClass}>Effective date</label>
                <input type="date" name="effectiveDate" className={inputClass} defaultValue={new Date().toISOString().slice(0, 10)} />
              </div>
              <label className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" name="isPreferred" /> Mark as preferred supplier
              </label>
              <button type="submit" className={btnPrimary}>
                + Add supplier
              </button>
            </form>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Price history" className="lg:col-span-2 !p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted uppercase tracking-wide border-b border-line">
                <th className="px-5 py-2.5 font-medium">Date</th>
                <th className="px-5 py-2.5 font-medium">Supplier</th>
                <th className="px-5 py-2.5 font-medium text-right">Excl. VAT</th>
                <th className="px-5 py-2.5 font-medium text-right">VAT</th>
                <th className="px-5 py-2.5 font-medium text-right">Incl. VAT</th>
                <th className="px-5 py-2.5 font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {allPriceRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-center text-muted">
                    No prices recorded yet.
                  </td>
                </tr>
              )}
              {allPriceRows.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-b-0">
                  <td className="px-5 py-3">{formatDate(row.effectiveDate)}</td>
                  <td className="px-5 py-3 text-muted">{row.supplierName}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{formatKES(row.priceExclVat)}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-muted">{formatKES(row.vatAmount)}</td>
                  <td className="px-5 py-3 text-right tabular-nums font-medium">{formatKES(row.priceInclVat)}</td>
                  <td className="px-5 py-3 text-muted text-xs">{row.sourceReference || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Record a new price">
          {!editable ? (
            <p className="text-sm text-muted">Only Officers, Managers and Admins can record a price.</p>
          ) : product.suppliers.length === 0 ? (
            <p className="text-sm text-muted">Add a supplier first.</p>
          ) : (
            <form action={addPricePoint} className="space-y-3">
              <div>
                <label className={labelClass}>Supplier *</label>
                <select name="supplierProductId" required className={inputClass} defaultValue="">
                  <option value="" disabled>
                    Select supplier
                  </option>
                  {product.suppliers.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.supplier.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Quoted price *</label>
                <input type="number" step="0.01" min="0" name="quotedPrice" required className={inputClass} />
              </div>
              {product.vatStatus === 'EXEMPT' ? (
                <p className="text-xs text-muted">This product is VAT exempt — the price above is the price paid, nothing to add.</p>
              ) : (
                <div>
                  <label className={labelClass}>Basis</label>
                  <select name="vatBasis" className={inputClass} defaultValue="EXCLUSIVE">
                    <option value="EXCLUSIVE">Excludes VAT</option>
                    <option value="INCLUSIVE">Includes VAT</option>
                  </select>
                </div>
              )}
              <div>
                <label className={labelClass}>Effective date</label>
                <input type="date" name="effectiveDate" className={inputClass} defaultValue={new Date().toISOString().slice(0, 10)} />
              </div>
              <div>
                <label className={labelClass}>Source / reference</label>
                <input name="sourceReference" className={inputClass} placeholder="e.g. supplier price list, invoice #" />
              </div>
              <button type="submit" className={btnPrimary}>
                + Record price
              </button>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}
