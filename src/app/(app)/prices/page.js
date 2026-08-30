import PageHeader from '@/components/PageHeader'
import Card from '@/components/Card'
import { getRecentPriceChanges, getPriceComparison, getProducts } from '@/lib/queries'
import { formatKES } from '@/lib/money'
import { formatDate } from '@/lib/utils'
import { inputClass, btnPrimary } from '@/components/form'

export default async function PricesPage({ searchParams }) {
  const { product: productId } = await searchParams
  const [changes, products] = await Promise.all([getRecentPriceChanges(30), getProducts()])
  const comparison = productId ? await getPriceComparison(productId) : null
  const selectedProduct = products.find((p) => p.id === productId)
  const cheapest = comparison?.length ? Math.min(...comparison.map((c) => c.currentPrice)) : null

  return (
    <div>
      <PageHeader
        eyebrow="Prices"
        title="Prices"
        subtitle="Every price change ever recorded, and how suppliers compare on the same product."
      />

      <Card title="Compare suppliers on one product" className="mb-4">
        <form className="flex flex-wrap items-end gap-3 mb-4">
          <div className="min-w-[240px]">
            <select name="product" defaultValue={productId ?? ''} className={inputClass}>
              <option value="" disabled>
                Select a product
              </option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.unit})
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className={btnPrimary}>
            Compare
          </button>
        </form>

        {comparison && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted uppercase tracking-wide border-b border-line">
                <th className="py-2 font-medium">Supplier</th>
                <th className="py-2 font-medium text-right">Current price</th>
                <th className="py-2 font-medium text-right">Previous</th>
                <th className="py-2 font-medium text-right">Change</th>
              </tr>
            </thead>
            <tbody>
              {comparison.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-muted">
                    No prices recorded for {selectedProduct?.name ?? 'this product'} yet.
                  </td>
                </tr>
              )}
              {comparison.map((c) => (
                <tr key={c.supplierProductId} className="border-b border-line last:border-b-0">
                  <td className="py-2.5">
                    {c.supplier}
                    {c.isPreferred && <span className="ml-2 text-[10px] uppercase tracking-wide text-accent-strong">preferred</span>}
                    {c.currentPrice === cheapest && (
                      <span className="ml-2 text-[10px] uppercase tracking-wide text-good">cheapest</span>
                    )}
                  </td>
                  <td className="py-2.5 text-right tabular-nums font-medium">{formatKES(c.currentPrice)}</td>
                  <td className="py-2.5 text-right tabular-nums text-muted">
                    {c.previousPrice !== null ? formatKES(c.previousPrice) : '—'}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">
                    {c.change ? (
                      <span className={c.change.absolute > 0 ? 'text-critical' : c.change.absolute < 0 ? 'text-good' : 'text-muted'}>
                        {c.change.absolute > 0 ? '+' : ''}
                        {c.change.percent}%
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card title="Recent price changes" className="!p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted uppercase tracking-wide border-b border-line">
              <th className="px-5 py-2.5 font-medium">Product</th>
              <th className="px-5 py-2.5 font-medium">Supplier</th>
              <th className="px-5 py-2.5 font-medium">Date</th>
              <th className="px-5 py-2.5 font-medium text-right">Previous</th>
              <th className="px-5 py-2.5 font-medium text-right">Current</th>
              <th className="px-5 py-2.5 font-medium text-right">Change</th>
            </tr>
          </thead>
          <tbody>
            {changes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-muted">
                  No price changes recorded yet.
                </td>
              </tr>
            )}
            {changes.map((c, i) => (
              <tr key={i} className="border-b border-line last:border-b-0">
                <td className="px-5 py-3 font-medium">{c.product}</td>
                <td className="px-5 py-3 text-muted">{c.supplier}</td>
                <td className="px-5 py-3 text-muted">{formatDate(c.effectiveDate)}</td>
                <td className="px-5 py-3 text-right tabular-nums text-muted">{formatKES(c.previousPrice)}</td>
                <td className="px-5 py-3 text-right tabular-nums font-medium">{formatKES(c.currentPrice)}</td>
                <td className="px-5 py-3 text-right tabular-nums">
                  <span className={c.absolute > 0 ? 'text-critical' : 'text-good'}>
                    {c.absolute > 0 ? '+' : ''}
                    {formatKES(c.absolute)} ({c.absolute > 0 ? '+' : ''}
                    {c.percent}%)
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
