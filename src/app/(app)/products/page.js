import Link from 'next/link'
import PageHeader from '@/components/PageHeader'
import StatusBadge from '@/components/StatusBadge'
import { getProducts, getCategories } from '@/lib/queries'
import { getCurrentUser, canMutate } from '@/lib/auth'
import { inputClass, btnPrimary } from '@/components/form'

export default async function ProductsPage({ searchParams }) {
  const { q, category } = await searchParams
  const [products, categories, user] = await Promise.all([
    getProducts({ search: q, categoryId: category }),
    getCategories(),
    getCurrentUser(),
  ])

  return (
    <div>
      <PageHeader
        eyebrow="Products"
        title="Products"
        subtitle="Every item you buy, with its unit of measure and VAT treatment."
        actions={
          canMutate(user) && (
            <Link href="/products/new" className={btnPrimary}>
              + Add product
            </Link>
          )
        }
      />

      <form className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search products…"
          className={`${inputClass} max-w-sm`}
        />
        <select name="category" defaultValue={category ?? ''} className={inputClass + ' max-w-xs'}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
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
              <th className="px-4 py-2.5 font-medium">Product</th>
              <th className="px-4 py-2.5 font-medium">Category</th>
              <th className="px-4 py-2.5 font-medium">Unit</th>
              <th className="px-4 py-2.5 font-medium">VAT</th>
              <th className="px-4 py-2.5 font-medium text-right">Suppliers</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  No products found.
                </td>
              </tr>
            )}
            {products.map((p) => (
              <tr key={p.id} className="border-b border-line last:border-b-0 hover:bg-surface-alt/60">
                <td className="px-4 py-3">
                  <Link href={`/products/${p.id}`} className="font-medium text-foreground hover:text-accent-strong">
                    {p.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">{p.category.name}</td>
                <td className="px-4 py-3 text-muted">{p.unit}</td>
                <td className="px-4 py-3 text-muted">
                  {p.vatStatus === 'EXEMPT' ? 'Exempt' : `${Number(p.vatRate)}%`}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{p.suppliers.length}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.active ? 'ACTIVE' : 'INACTIVE'} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
