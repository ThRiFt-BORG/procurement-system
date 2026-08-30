import PageHeader from '@/components/PageHeader'
import Card from '@/components/Card'
import { createSupplier } from '@/lib/actions/suppliers'
import { requireMutatorPage } from '@/lib/auth'
import { inputClass, labelClass, btnPrimary } from '@/components/form'

export default async function NewSupplierPage() {
  await requireMutatorPage()
  return (
    <div>
      <PageHeader eyebrow="Suppliers" title="Add supplier" subtitle="New suppliers appear everywhere immediately — no code changes needed." />

      <Card className="max-w-2xl">
        <form action={createSupplier} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>Supplier name *</label>
            <input name="name" required className={inputClass} placeholder="e.g. Fresh Fields Produce Ltd" />
          </div>
          <div>
            <label className={labelClass}>Contact person</label>
            <input name="contactPerson" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input name="phone" className={inputClass} placeholder="+254 7…" />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input type="email" name="email" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Payment terms</label>
            <input name="paymentTerms" className={inputClass} placeholder="e.g. Net 30 days" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Address</label>
            <input name="address" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Tax / VAT PIN</label>
            <input name="taxPin" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Bank / payment details</label>
            <input name="bankDetails" className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Notes</label>
            <textarea name="notes" rows={3} className={inputClass} />
          </div>
          <div className="sm:col-span-2 pt-2">
            <button type="submit" className={btnPrimary}>
              Save supplier
            </button>
          </div>
        </form>
      </Card>
    </div>
  )
}
