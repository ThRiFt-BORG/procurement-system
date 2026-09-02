import PageHeader from '@/components/PageHeader'
import ImportWizard from '@/components/ImportWizard'
import { getCategories, getSuppliers, getSettings } from '@/lib/queries'
import { db } from '@/lib/db'
import { requireMutatorPage } from '@/lib/auth'

export default async function ImportPage() {
  await requireMutatorPage()

  const [categories, suppliers, products, settings] = await Promise.all([
    getCategories(),
    getSuppliers(),
    db.product.findMany({
      select: { id: true, name: true, unit: true, vatStatus: true, vatRate: true },
      orderBy: { name: 'asc' },
    }),
    getSettings(),
  ])

  return (
    <div>
      <PageHeader
        eyebrow="Products & prices"
        title="Import from a spreadsheet"
        subtitle="Upload a supplier price list (.xlsx or .csv). Nothing is saved until you've reviewed and confirmed it below."
      />
      <ImportWizard
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          unit: p.unit,
          vatStatus: p.vatStatus,
          vatRate: Number(p.vatRate),
        }))}
        defaultVatRate={Number(settings.defaultVatRate)}
      />
    </div>
  )
}
