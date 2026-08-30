import PageHeader from '@/components/PageHeader'
import NewLpoForm from '@/components/NewLpoForm'
import { db } from '@/lib/db'
import { getSupplierProductsForSupplier } from '@/lib/queries'
import { requireMutatorPage } from '@/lib/auth'

export default async function NewLpoPage() {
  await requireMutatorPage()
  const suppliers = await db.supplier.findMany({ where: { active: true }, orderBy: { name: 'asc' } })

  const entries = await Promise.all(
    suppliers.map(async (s) => [s.id, await getSupplierProductsForSupplier(s.id)])
  )
  const productsBySupplier = Object.fromEntries(entries)

  return (
    <div>
      <PageHeader
        eyebrow="Purchase orders"
        title="Create LPO"
        subtitle="Totals and VAT are calculated automatically from each line. A changed price is recorded as a new price history entry."
      />
      <NewLpoForm suppliers={suppliers} productsBySupplier={productsBySupplier} />
    </div>
  )
}
