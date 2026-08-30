import { notFound, redirect } from 'next/navigation'
import PageHeader from '@/components/PageHeader'
import NewLpoForm from '@/components/NewLpoForm'
import { db } from '@/lib/db'
import { getLpoById, getSupplierProductsForSupplier } from '@/lib/queries'
import { requireMutatorPage } from '@/lib/auth'

export default async function EditLpoPage({ params }) {
  await requireMutatorPage()
  const { id } = await params
  const lpo = await getLpoById(id)
  if (!lpo) notFound()
  if (lpo.status !== 'DRAFT') redirect(`/lpos/${id}`)

  // Include the LPO's current supplier even if it's since been deactivated,
  // so editing an older draft never breaks.
  const suppliers = await db.supplier.findMany({
    where: { OR: [{ active: true }, { id: lpo.supplierId }] },
    orderBy: { name: 'asc' },
  })

  const entries = await Promise.all(suppliers.map(async (s) => [s.id, await getSupplierProductsForSupplier(s.id)]))
  const productsBySupplier = Object.fromEntries(entries)

  const initial = {
    supplierId: lpo.supplierId,
    orderDate: new Date(lpo.orderDate).toISOString().slice(0, 10),
    notes: lpo.notes ?? '',
    terms: lpo.terms ?? '',
    lines: lpo.items.map((item) => ({
      supplierProductId: item.priceHistory?.supplierProductId,
      quantity: Number(item.quantity),
      quotedPrice: Number(item.priceHistory?.quotedPrice ?? item.unitPrice),
      vatBasis: item.priceHistory?.vatBasis ?? 'EXCLUSIVE',
    })),
  }

  return (
    <div>
      <PageHeader
        eyebrow={lpo.lpoNumber}
        title="Edit LPO"
        subtitle="Still a draft, so it's safe to change — totals recalculate automatically."
      />
      <NewLpoForm suppliers={suppliers} productsBySupplier={productsBySupplier} editingLpoId={lpo.id} initial={initial} />
    </div>
  )
}
