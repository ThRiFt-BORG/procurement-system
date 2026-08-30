import { getReportData } from '@/lib/queries'
import { toCsv } from '@/lib/csv'
import { formatDate } from '@/lib/utils'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const report = await getReportData({ from, to })

  // One row per LPO line, not per LPO — this is what's actually needed to
  // reconcile against a supplier invoice or hand to an accountant.
  const rows = report.lpos.flatMap((lpo) =>
    lpo.items.map((item) => ({ lpo, item }))
  )

  const csv = toCsv(rows, [
    { label: 'LPO Number', value: (r) => r.lpo.lpoNumber },
    { label: 'Date', value: (r) => formatDate(r.lpo.orderDate) },
    { label: 'Supplier', value: (r) => r.lpo.supplier.name },
    { label: 'Status', value: (r) => r.lpo.status },
    { label: 'Category', value: (r) => r.item.product.category.name },
    { label: 'Product', value: (r) => r.item.product.name },
    { label: 'Quantity', value: (r) => Number(r.item.quantity) },
    { label: 'Unit', value: (r) => r.item.unit },
    { label: 'Unit Price (excl VAT)', value: (r) => Number(r.item.unitPrice).toFixed(2) },
    { label: 'VAT Status', value: (r) => (r.item.vatStatus === 'EXEMPT' ? 'Exempt' : `${Number(r.item.vatRate)}%`) },
    { label: 'Line Subtotal', value: (r) => Number(r.item.lineSubtotal).toFixed(2) },
    { label: 'Line VAT', value: (r) => Number(r.item.lineVat).toFixed(2) },
    { label: 'Line Total', value: (r) => Number(r.item.lineTotal).toFixed(2) },
  ])

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="procurement-report-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
