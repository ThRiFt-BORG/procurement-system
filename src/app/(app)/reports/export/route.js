import { getReportData } from '@/lib/queries'
import { toCsv } from '@/lib/csv'
import { formatDate } from '@/lib/utils'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const report = await getReportData({ from, to })

  const csv = toCsv(report.lpos, [
    { label: 'LPO Number', value: (r) => r.lpoNumber },
    { label: 'Date', value: (r) => formatDate(r.orderDate) },
    { label: 'Supplier', value: (r) => r.supplier.name },
    { label: 'Status', value: (r) => r.status },
    { label: 'Subtotal', value: (r) => Number(r.subtotal).toFixed(2) },
    { label: 'VAT', value: (r) => Number(r.vatTotal).toFixed(2) },
    { label: 'Total', value: (r) => Number(r.grandTotal).toFixed(2) },
  ])

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="procurement-report-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
