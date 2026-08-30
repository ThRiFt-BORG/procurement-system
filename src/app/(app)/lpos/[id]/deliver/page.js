import { notFound } from 'next/navigation'
import PageHeader from '@/components/PageHeader'
import DeliverForm from '@/components/DeliverForm'
import { getLpoForDelivery } from '@/lib/queries'
import { requireMutatorPage } from '@/lib/auth'

export default async function DeliverLpoPage({ params }) {
  await requireMutatorPage()
  const { id } = await params
  const lpo = await getLpoForDelivery(id)
  if (!lpo) notFound()
  if (!['APPROVED', 'PARTIALLY_RECEIVED'].includes(lpo.status)) {
    notFound()
  }

  return (
    <div>
      <PageHeader
        eyebrow={lpo.lpoNumber}
        title={`Record delivery — ${lpo.supplier.name}`}
        subtitle="Enter what actually arrived. Anything short is flagged automatically for a credit note."
      />
      {lpo.lines.length === 0 ? (
        <p className="text-sm text-muted">Everything on this LPO has already been received.</p>
      ) : (
        <DeliverForm lpo={lpo} />
      )}
    </div>
  )
}
