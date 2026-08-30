import Link from 'next/link'
import PageHeader from '@/components/PageHeader'
import Card from '@/components/Card'
import StatCard from '@/components/StatCard'
import StatusBadge from '@/components/StatusBadge'
import MonthlyChart from '@/components/MonthlyChart'
import { getDashboardData } from '@/lib/queries'
import { formatKES } from '@/lib/money'
import { formatDate } from '@/lib/utils'

export default async function DashboardPage() {
  const data = await getDashboardData()

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        subtitle="Procurement activity across all suppliers and categories."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Purchases this month" value={formatKES(data.purchasesThisMonth)} />
        <StatCard label="Purchases this year" value={formatKES(data.purchasesThisYear)} />
        <StatCard label="Total LPOs" value={data.totalLpos} />
        <StatCard label="Pending LPOs" value={data.pendingLpos} hint={`${data.completedLpos} fully received`} />
        <StatCard label="Suppliers" value={data.supplierCount} hint="active" />
        <StatCard label="Products" value={data.productCount} hint="active" />
        <StatCard
          label="Price movers"
          value={data.increases.length}
          hint="rose 5%+ recently"
        />
        <StatCard
          label="Outstanding deliveries"
          value={data.outstandingDeliveries}
          hint="approved, awaiting goods"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card title="Purchases, last 6 months" className="lg:col-span-2">
          <MonthlyChart data={data.monthly} />
        </Card>

        <Card title="Notable price increases" subtitle="5% or more since last purchase">
          {data.increases.length === 0 ? (
            <p className="text-sm text-muted">No significant increases recently.</p>
          ) : (
            <ul className="space-y-3">
              {data.increases.map((c, i) => (
                <li key={i} className="flex items-start justify-between gap-3 text-sm">
                  <div>
                    <div className="font-medium text-foreground">{c.product}</div>
                    <div className="text-xs text-muted">{c.supplier}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-critical font-medium tabular-nums">+{c.percent}%</div>
                    <div className="text-xs text-muted tabular-nums">{formatKES(c.currentPrice)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card
          title="Recent LPOs"
          actions={
            <Link href="/lpos" className="text-xs text-accent-strong font-medium hover:underline">
              View all
            </Link>
          }
        >
          {data.recentLpos.length === 0 ? (
            <p className="text-sm text-muted">No LPOs yet.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {data.recentLpos.map((lpo) => (
                  <tr key={lpo.id} className="border-t border-line first:border-t-0">
                    <td className="py-2 pr-2">
                      <Link href={`/lpos/${lpo.id}`} className="font-mono text-xs text-accent-strong hover:underline">
                        {lpo.lpoNumber}
                      </Link>
                      <div className="text-xs text-muted">{lpo.supplier.name}</div>
                    </td>
                    <td className="py-2 pr-2 text-right tabular-nums">{formatKES(lpo.grandTotal)}</td>
                    <td className="py-2 text-right">
                      <StatusBadge status={lpo.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card
          title="Recent price changes"
          actions={
            <Link href="/prices" className="text-xs text-accent-strong font-medium hover:underline">
              View all
            </Link>
          }
        >
          {data.priceChanges.length === 0 ? (
            <p className="text-sm text-muted">No price changes recorded yet.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {data.priceChanges.map((c, i) => (
                  <tr key={i} className="border-t border-line first:border-t-0">
                    <td className="py-2 pr-2">
                      <div className="font-medium">{c.product}</div>
                      <div className="text-xs text-muted">
                        {c.supplier} · {formatDate(c.effectiveDate)}
                      </div>
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      <span className={c.absolute > 0 ? 'text-critical' : 'text-good'}>
                        {c.absolute > 0 ? '+' : ''}
                        {c.percent}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  )
}
