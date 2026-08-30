import { notFound } from 'next/navigation'
import PageHeader from '@/components/PageHeader'
import Card from '@/components/Card'
import { getAuditLog } from '@/lib/queries'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { formatDateTime } from '@/lib/utils'
import { inputClass, btnPrimary } from '@/components/form'

const ENTITIES = ['LPO', 'Delivery', 'CreditNote', 'User']

export default async function AuditLogPage({ searchParams }) {
  const user = await getCurrentUser()
  if (!isAdmin(user)) notFound()

  const { entity } = await searchParams
  const entries = await getAuditLog({ entity })

  return (
    <div>
      <PageHeader
        eyebrow="Configuration"
        title="Audit log"
        subtitle="Every LPO, delivery, credit note and account change, most recent first. The last 200 entries."
      />

      <form className="mb-4">
        <select name="entity" defaultValue={entity ?? ''} className={`${inputClass} max-w-xs`}>
          <option value="">All record types</option>
          {ENTITIES.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
        <button type="submit" className={`${btnPrimary} ml-2`}>
          Filter
        </button>
      </form>

      <Card className="!p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted uppercase tracking-wide border-b border-line">
              <th className="px-5 py-2.5 font-medium">When</th>
              <th className="px-5 py-2.5 font-medium">Type</th>
              <th className="px-5 py-2.5 font-medium">Action</th>
              <th className="px-5 py-2.5 font-medium">What happened</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-muted">
                  Nothing recorded yet.
                </td>
              </tr>
            )}
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-line last:border-b-0">
                <td className="px-5 py-3 text-muted whitespace-nowrap">{formatDateTime(e.createdAt)}</td>
                <td className="px-5 py-3">{e.entity}</td>
                <td className="px-5 py-3 text-muted">{e.action.replace(/_/g, ' ').toLowerCase()}</td>
                <td className="px-5 py-3">{e.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
