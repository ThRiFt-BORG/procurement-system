import PageHeader from '@/components/PageHeader'
import Card from '@/components/Card'
import StatusBadge from '@/components/StatusBadge'
import { getCategories } from '@/lib/queries'
import { createCategory, setCategoryActive } from '@/lib/actions/categories'
import { getCurrentUser, canMutate } from '@/lib/auth'
import { inputClass, labelClass, btnPrimary, btnGhost } from '@/components/form'
import { db } from '@/lib/db'

export default async function CategoriesPage() {
  const [categories, user] = await Promise.all([getCategories(), getCurrentUser()])
  const editable = canMutate(user)
  const productCounts = await db.product.groupBy({ by: ['categoryId'], _count: true })
  const countByCategory = Object.fromEntries(productCounts.map((c) => [c.categoryId, c._count]))

  return (
    <div>
      <PageHeader
        eyebrow="Products"
        title="Categories"
        subtitle="The groupings products are organized under. Add new ones any time — nothing needs to change in the code."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 !p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted uppercase tracking-wide border-b border-line">
                <th className="px-5 py-2.5 font-medium">Category</th>
                <th className="px-5 py-2.5 font-medium text-right">Products</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
                {editable && <th className="px-5 py-2.5 font-medium"></th>}
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className="border-b border-line last:border-b-0">
                  <td className="px-5 py-3">
                    <div className="font-medium text-foreground">{c.name}</div>
                    {c.description && <div className="text-xs text-muted">{c.description}</div>}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">{countByCategory[c.id] ?? 0}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={c.active ? 'ACTIVE' : 'INACTIVE'} />
                  </td>
                  {editable && (
                    <td className="px-5 py-3 text-right">
                      <form action={setCategoryActive.bind(null, c.id, !c.active)}>
                        <button type="submit" className={btnGhost}>
                          {c.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {editable && (
          <Card title="Add category">
            <form action={createCategory} className="space-y-3">
              <div>
                <label className={labelClass}>Name *</label>
                <input name="name" required className={inputClass} placeholder="e.g. Frozen Goods" />
              </div>
              <div>
                <label className={labelClass}>Description</label>
                <textarea name="description" rows={2} className={inputClass} />
              </div>
              <button type="submit" className={btnPrimary}>
                + Add category
              </button>
            </form>
          </Card>
        )}
      </div>
    </div>
  )
}
