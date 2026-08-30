import PageHeader from '@/components/PageHeader'
import Card from '@/components/Card'
import VatFields from '@/components/VatFields'
import { getCategories, getSettings } from '@/lib/queries'
import { createProduct } from '@/lib/actions/products'
import { requireMutatorPage } from '@/lib/auth'
import { inputClass, labelClass, btnPrimary } from '@/components/form'

export default async function NewProductPage() {
  await requireMutatorPage()
  const [categories, settings] = await Promise.all([getCategories(), getSettings()])

  return (
    <div>
      <PageHeader eyebrow="Products" title="Add product" subtitle="Products belong to a category and carry their own VAT rule." />

      <Card className="max-w-2xl">
        <form action={createProduct} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>Product name *</label>
            <input name="name" required className={inputClass} placeholder="e.g. Tomatoes" />
          </div>
          <div>
            <label className={labelClass}>Category *</label>
            <select name="categoryId" required className={inputClass} defaultValue="">
              <option value="" disabled>
                Select a category
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Unit of measure *</label>
            <input name="unit" required className={inputClass} placeholder="e.g. kg, litre, bottle, carton" />
          </div>

          <VatFields defaultVatRate={Number(settings.defaultVatRate)} />

          <div className="sm:col-span-2">
            <label className={labelClass}>Notes</label>
            <textarea name="notes" rows={2} className={inputClass} />
          </div>
          <div className="sm:col-span-2 pt-2">
            <button type="submit" className={btnPrimary}>
              Save product
            </button>
          </div>
        </form>
      </Card>
    </div>
  )
}
