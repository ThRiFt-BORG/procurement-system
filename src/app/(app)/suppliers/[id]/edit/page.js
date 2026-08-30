import { notFound } from 'next/navigation'
import PageHeader from '@/components/PageHeader'
import Card from '@/components/Card'
import { getSupplierById } from '@/lib/queries'
import { updateSupplier } from '@/lib/actions/suppliers'
import { requireMutatorPage } from '@/lib/auth'
import { inputClass, labelClass, btnPrimary } from '@/components/form'

export default async function EditSupplierPage({ params }) {
  await requireMutatorPage()
  const { id } = await params
  const supplier = await getSupplierById(id)
  if (!supplier) notFound()

  return (
    <div>
      <PageHeader eyebrow="Suppliers" title={`Edit ${supplier.name}`} subtitle="Changes apply immediately across the app." />

      <Card className="max-w-2xl">
        <form action={updateSupplier.bind(null, supplier.id)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>Supplier name *</label>
            <input name="name" required defaultValue={supplier.name} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Contact person</label>
            <input name="contactPerson" defaultValue={supplier.contactPerson ?? ''} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input name="phone" defaultValue={supplier.phone ?? ''} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input type="email" name="email" defaultValue={supplier.email ?? ''} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Payment terms</label>
            <input name="paymentTerms" defaultValue={supplier.paymentTerms ?? ''} className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Address</label>
            <input name="address" defaultValue={supplier.address ?? ''} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Tax / VAT PIN</label>
            <input name="taxPin" defaultValue={supplier.taxPin ?? ''} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Bank / payment details</label>
            <input name="bankDetails" defaultValue={supplier.bankDetails ?? ''} className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Notes</label>
            <textarea name="notes" rows={3} defaultValue={supplier.notes ?? ''} className={inputClass} />
          </div>
          <div className="sm:col-span-2 pt-2">
            <button type="submit" className={btnPrimary}>
              Save changes
            </button>
          </div>
        </form>
      </Card>
    </div>
  )
}
