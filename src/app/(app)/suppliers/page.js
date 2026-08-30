import Link from 'next/link'
import PageHeader from '@/components/PageHeader'
import StatusBadge from '@/components/StatusBadge'
import { getSuppliers } from '@/lib/queries'
import { setSupplierActive } from '@/lib/actions/suppliers'
import { getCurrentUser, canMutate } from '@/lib/auth'
import { inputClass, btnPrimary, btnGhost } from '@/components/form'

export default async function SuppliersPage({ searchParams }) {
  const { q } = await searchParams
  const [suppliers, user] = await Promise.all([getSuppliers(q), getCurrentUser()])
  const editable = canMutate(user)

  return (
    <div>
      <PageHeader
        eyebrow="Suppliers"
        title="Suppliers"
        subtitle="Everyone you buy from — contacts, terms, and what they supply."
        actions={
          editable && (
            <Link href="/suppliers/new" className={btnPrimary}>
              + Add supplier
            </Link>
          )
        }
      />

      <form className="mb-4">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search suppliers by name…"
          className={`${inputClass} max-w-sm`}
        />
      </form>

      <div className="bg-surface border border-line rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted uppercase tracking-wide border-b border-line">
              <th className="px-4 py-2.5 font-medium">Supplier</th>
              <th className="px-4 py-2.5 font-medium">Contact</th>
              <th className="px-4 py-2.5 font-medium">Terms</th>
              <th className="px-4 py-2.5 font-medium text-right">Products</th>
              <th className="px-4 py-2.5 font-medium text-right">LPOs</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              {editable && <th className="px-4 py-2.5 font-medium"></th>}
            </tr>
          </thead>
          <tbody>
            {suppliers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  No suppliers found.
                </td>
              </tr>
            )}
            {suppliers.map((s) => (
              <tr key={s.id} className="border-b border-line last:border-b-0 hover:bg-surface-alt/60">
                <td className="px-4 py-3">
                  <Link href={`/suppliers/${s.id}`} className="font-medium text-foreground hover:text-accent-strong">
                    {s.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">
                  {s.contactPerson || '—'}
                  {s.phone && <div className="text-xs">{s.phone}</div>}
                </td>
                <td className="px-4 py-3 text-muted">{s.paymentTerms || '—'}</td>
                <td className="px-4 py-3 text-right tabular-nums">{s._count.products}</td>
                <td className="px-4 py-3 text-right tabular-nums">{s._count.lpos}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={s.active ? 'ACTIVE' : 'INACTIVE'} />
                </td>
                {editable && (
                  <td className="px-4 py-3 text-right">
                    <form action={setSupplierActive.bind(null, s.id, !s.active)}>
                      <button type="submit" className={btnGhost}>
                        {s.active ? 'Deactivate' : 'Activate'}
                      </button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
