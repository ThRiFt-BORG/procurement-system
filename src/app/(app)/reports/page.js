import PageHeader from '@/components/PageHeader'
import Card from '@/components/Card'
import StatCard from '@/components/StatCard'
import { getReportData } from '@/lib/queries'
import { formatKES } from '@/lib/money'
import { inputClass, btnPrimary, btnSecondary } from '@/components/form'

function toInputDate(d) {
  return d.toISOString().slice(0, 10)
}

export default async function ReportsPage({ searchParams }) {
  const { from, to } = await searchParams
  const report = await getReportData({ from, to })

  const query = new URLSearchParams()
  if (from) query.set('from', from)
  if (to) query.set('to', to)

  return (
    <div>
      <PageHeader
        eyebrow="Analysis"
        title="Reports"
        subtitle="Spend by supplier, category and product for the selected period."
      />

      <form className="flex flex-wrap items-end gap-3 mb-6">
        <div>
          <label className="block text-xs font-medium text-muted mb-1">From</label>
          <input type="date" name="from" defaultValue={from ?? toInputDate(report.fromDate)} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">To</label>
          <input type="date" name="to" defaultValue={to ?? toInputDate(new Date())} className={inputClass} />
        </div>
        <button type="submit" className={btnPrimary}>
          Apply
        </button>
        <a href={`/reports/export?${query.toString()}`} className={btnSecondary}>
          Export CSV
        </a>
      </form>

      <div className="text-[11px] font-mono uppercase tracking-wide text-muted mb-2">For the selected period</div>
      <div className="grid grid-cols-2 gap-3 mb-5">
        <StatCard label="Total expenditure" value={formatKES(report.totalExpenditure)} hint={`${report.lpoCount} LPOs`} />
        <StatCard label="VAT paid" value={formatKES(report.totalVat)} />
      </div>

      <div className="text-[11px] font-mono uppercase tracking-wide text-muted mb-2">Right now — not limited by the dates above</div>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard label="Outstanding deliveries" value={report.outstandingDeliveries} hint="approved, not yet fully received" />
        <StatCard
          label="Pending credit notes"
          value={report.pendingCreditNotesCount}
          hint={formatKES(report.pendingCreditNotesValue)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card title="Spend by supplier" className="!p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted uppercase tracking-wide border-b border-line">
                <th className="px-5 py-2.5 font-medium">Supplier</th>
                <th className="px-5 py-2.5 font-medium text-right">LPOs</th>
                <th className="px-5 py-2.5 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {report.bySupplier.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-6 text-center text-muted">
                    No purchases in this period.
                  </td>
                </tr>
              )}
              {report.bySupplier.map((s) => (
                <tr key={s.name} className="border-b border-line last:border-b-0">
                  <td className="px-5 py-2.5">{s.name}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{s.lpoCount}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums font-medium">{formatKES(s.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Spend by category" className="!p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted uppercase tracking-wide border-b border-line">
                <th className="px-5 py-2.5 font-medium">Category</th>
                <th className="px-5 py-2.5 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {report.byCategory.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-5 py-6 text-center text-muted">
                    No purchases in this period.
                  </td>
                </tr>
              )}
              {report.byCategory.map((c) => (
                <tr key={c.name} className="border-b border-line last:border-b-0">
                  <td className="px-5 py-2.5">{c.name}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums font-medium">{formatKES(c.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <Card title="Spend by product" className="!p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted uppercase tracking-wide border-b border-line">
              <th className="px-5 py-2.5 font-medium">Product</th>
              <th className="px-5 py-2.5 font-medium text-right">Quantity</th>
              <th className="px-5 py-2.5 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {report.byProduct.length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-6 text-center text-muted">
                  No purchases in this period.
                </td>
              </tr>
            )}
            {report.byProduct.map((p) => (
              <tr key={p.name} className="border-b border-line last:border-b-0">
                <td className="px-5 py-2.5">{p.name}</td>
                <td className="px-5 py-2.5 text-right tabular-nums">
                  {p.quantity} {p.unit}
                </td>
                <td className="px-5 py-2.5 text-right tabular-nums font-medium">{formatKES(p.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
