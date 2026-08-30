import { db } from '@/lib/db'
import { priceChange, round2 } from '@/lib/money'

export async function getUsers() {
  return db.user.findMany({ orderBy: [{ active: 'desc' }, { name: 'asc' }] })
}

export async function getCategories() {
  return db.category.findMany({ orderBy: { name: 'asc' } })
}

export async function getSuppliers(search) {
  return db.supplier.findMany({
    where: search
      ? { name: { contains: search, mode: 'insensitive' } }
      : undefined,
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: true, lpos: true } } },
  })
}

export async function getSupplierById(id) {
  return db.supplier.findUnique({
    where: { id },
    include: {
      products: {
        include: {
          product: { include: { category: true } },
          priceHistory: { orderBy: { effectiveDate: 'desc' }, take: 5 },
        },
      },
      lpos: { orderBy: { orderDate: 'desc' }, take: 10 },
    },
  })
}

export async function getProducts({ search, categoryId } = {}) {
  return db.product.findMany({
    where: {
      AND: [
        search ? { name: { contains: search, mode: 'insensitive' } } : {},
        categoryId ? { categoryId } : {},
      ],
    },
    orderBy: { name: 'asc' },
    include: { category: true, suppliers: { select: { id: true } } },
  })
}

export async function getProductById(id) {
  return db.product.findUnique({
    where: { id },
    include: {
      category: true,
      suppliers: {
        include: {
          supplier: true,
          priceHistory: { orderBy: { effectiveDate: 'desc' } },
        },
      },
    },
  })
}

export async function getSupplierProductsForSupplier(supplierId) {
  const rows = await db.supplierProduct.findMany({
    where: { supplierId },
    include: {
      product: { include: { category: true } },
      priceHistory: { orderBy: { effectiveDate: 'desc' }, take: 1 },
    },
  })
  return rows
    .filter((r) => r.product.active && r.priceHistory.length > 0)
    .map((r) => ({
      supplierProductId: r.id,
      productId: r.productId,
      productName: r.product.name,
      unit: r.product.unit,
      category: r.product.category.name,
      vatStatus: r.product.vatStatus,
      vatRate: Number(r.product.vatRate),
      isPreferred: r.isPreferred,
      latestPrice: Number(r.priceHistory[0].priceExclVat),
      latestPriceDate: r.priceHistory[0].effectiveDate,
    }))
    .sort((a, b) => a.productName.localeCompare(b.productName))
}

// Every supplier/product pair's two most recent price points, for the
// "recent price changes" list and the dashboard's price-movers card.
export async function getRecentPriceChanges(limit = 8) {
  const groups = await db.priceHistory.findMany({
    orderBy: { effectiveDate: 'desc' },
    include: {
      supplierProduct: { include: { product: true, supplier: true } },
    },
    take: 400,
  })

  const bySupplierProduct = new Map()
  for (const row of groups) {
    const key = row.supplierProductId
    if (!bySupplierProduct.has(key)) bySupplierProduct.set(key, [])
    const arr = bySupplierProduct.get(key)
    if (arr.length < 2) arr.push(row)
  }

  const changes = []
  for (const [, rows] of bySupplierProduct) {
    if (rows.length < 2) continue
    const [current, previous] = rows
    const change = priceChange(current.priceExclVat, previous.priceExclVat)
    if (!change || change.absolute === 0) continue
    changes.push({
      product: current.supplierProduct.product.name,
      unit: current.supplierProduct.product.unit,
      supplier: current.supplierProduct.supplier.name,
      currentPrice: Number(current.priceExclVat),
      previousPrice: Number(previous.priceExclVat),
      effectiveDate: current.effectiveDate,
      ...change,
    })
  }

  return changes.sort((a, b) => new Date(b.effectiveDate) - new Date(a.effectiveDate)).slice(0, limit)
}

export async function getSignificantIncreases(thresholdPercent = 5, limit = 5) {
  const changes = await getRecentPriceChanges(200)
  return changes
    .filter((c) => c.percent !== null && c.percent >= thresholdPercent)
    .sort((a, b) => b.percent - a.percent)
    .slice(0, limit)
}

export async function getPriceComparison(productId) {
  const supplierProducts = await db.supplierProduct.findMany({
    where: { productId },
    include: {
      supplier: true,
      priceHistory: { orderBy: { effectiveDate: 'desc' }, take: 2 },
    },
  })

  return supplierProducts
    .filter((sp) => sp.priceHistory.length > 0)
    .map((sp) => {
      const [current, previous] = sp.priceHistory
      return {
        supplierProductId: sp.id,
        supplier: sp.supplier.name,
        isPreferred: sp.isPreferred,
        currentPrice: Number(current.priceExclVat),
        previousPrice: previous ? Number(previous.priceExclVat) : null,
        change: previous ? priceChange(current.priceExclVat, previous.priceExclVat) : null,
        effectiveDate: current.effectiveDate,
      }
    })
    .sort((a, b) => a.currentPrice - b.currentPrice)
}

export async function getLpos({ search, status } = {}) {
  return db.lPO.findMany({
    where: {
      AND: [
        search
          ? {
              OR: [
                { lpoNumber: { contains: search, mode: 'insensitive' } },
                { supplier: { name: { contains: search, mode: 'insensitive' } } },
              ],
            }
          : {},
        status ? { status } : {},
      ],
    },
    orderBy: { orderDate: 'desc' },
    include: { supplier: true, _count: { select: { items: true } } },
  })
}

export async function getLpoById(id) {
  return db.lPO.findUnique({
    where: { id },
    include: {
      supplier: true,
      preparedBy: true,
      approvedBy: true,
      items: { include: { product: true } },
      deliveries: { orderBy: { deliveryDate: 'desc' }, include: { items: true } },
    },
  })
}

export async function getDashboardData() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfYear = new Date(now.getFullYear(), 0, 1)

  const [
    lpos,
    supplierCount,
    productCount,
    recentLpos,
    priceChanges,
    increases,
  ] = await Promise.all([
    db.lPO.findMany({ select: { grandTotal: true, orderDate: true, status: true } }),
    db.supplier.count({ where: { active: true } }),
    db.product.count({ where: { active: true } }),
    db.lPO.findMany({ orderBy: { orderDate: 'desc' }, take: 6, include: { supplier: true } }),
    getRecentPriceChanges(5),
    getSignificantIncreases(5, 5),
  ])

  const purchasesThisMonth = round2(
    lpos.filter((l) => l.orderDate >= startOfMonth).reduce((s, l) => s + Number(l.grandTotal), 0)
  )
  const purchasesThisYear = round2(
    lpos.filter((l) => l.orderDate >= startOfYear).reduce((s, l) => s + Number(l.grandTotal), 0)
  )
  const pendingLpos = lpos.filter((l) => ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PARTIALLY_RECEIVED'].includes(l.status)).length
  const completedLpos = lpos.filter((l) => l.status === 'FULLY_RECEIVED').length

  // last 6 months of purchase totals for the trend chart
  const monthly = []
  for (let i = 5; i >= 0; i--) {
    const from = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const to = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    const total = round2(
      lpos
        .filter((l) => l.orderDate >= from && l.orderDate < to)
        .reduce((s, l) => s + Number(l.grandTotal), 0)
    )
    monthly.push({ label: from.toLocaleDateString('en-KE', { month: 'short' }), total })
  }

  const outstandingDeliveries = await db.lPO.count({
    where: { status: { in: ['APPROVED', 'PARTIALLY_RECEIVED'] } },
  })

  return {
    purchasesThisMonth,
    purchasesThisYear,
    totalLpos: lpos.length,
    pendingLpos,
    completedLpos,
    supplierCount,
    productCount,
    recentLpos,
    priceChanges,
    increases,
    monthly,
    outstandingDeliveries,
  }
}

// ---------- Deliveries ----------

// LPOs that can still receive a delivery, with how much of each line is left.
export async function getReceivableLpos() {
  return db.lPO.findMany({
    where: { status: { in: ['APPROVED', 'PARTIALLY_RECEIVED'] } },
    orderBy: { orderDate: 'asc' },
    include: { supplier: true },
  })
}

export async function getLpoForDelivery(lpoId) {
  const lpo = await db.lPO.findUnique({
    where: { id: lpoId },
    include: {
      supplier: true,
      items: {
        include: {
          product: true,
          deliveryItems: true,
        },
      },
    },
  })
  if (!lpo) return null

  const lines = lpo.items.map((item) => {
    const deliveredSoFar = item.deliveryItems.reduce((s, di) => s + Number(di.deliveredQty), 0)
    const remaining = round2(Number(item.quantity) - deliveredSoFar)
    return {
      lpoItemId: item.id,
      productName: item.product.name,
      unit: item.unit,
      orderedQty: Number(item.quantity),
      deliveredSoFar,
      remaining,
      unitPriceInclVat: round2(Number(item.lineTotal) / Number(item.quantity)),
    }
  })

  // Plain, fully-serializable shape only — this crosses into a Client Component,
  // and Prisma's Decimal fields (in lpo.items etc.) can't be passed as props.
  return {
    id: lpo.id,
    lpoNumber: lpo.lpoNumber,
    status: lpo.status,
    supplier: { id: lpo.supplier.id, name: lpo.supplier.name },
    lines: lines.filter((l) => l.remaining > 0),
  }
}

export async function getDeliveries() {
  return db.delivery.findMany({
    orderBy: { deliveryDate: 'desc' },
    include: {
      lpo: { include: { supplier: true } },
      items: { include: { creditNotes: true } },
    },
  })
}

export async function getDeliveryById(id) {
  return db.delivery.findUnique({
    where: { id },
    include: {
      lpo: { include: { supplier: true } },
      items: {
        include: {
          lpoItem: { include: { product: true } },
          creditNotes: true,
        },
      },
    },
  })
}

// ---------- Credit notes ----------

export async function getCreditNotes(status) {
  return db.creditNote.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    include: {
      deliveryItem: {
        include: {
          lpoItem: { include: { product: true } },
          delivery: { include: { lpo: { include: { supplier: true } } } },
        },
      },
    },
  })
}

// ---------- Settings ----------

export async function getSettings() {
  return db.settings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: { id: 'singleton' },
  })
}

// ---------- Reports ----------

export async function getReportData({ from, to } = {}) {
  const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1)
  const toDate = to ? new Date(new Date(to).getTime() + 86400000) : new Date()

  const lpos = await db.lPO.findMany({
    where: { orderDate: { gte: fromDate, lt: toDate }, status: { not: 'CANCELLED' } },
    include: {
      supplier: true,
      items: { include: { product: { include: { category: true } } } },
    },
    orderBy: { orderDate: 'asc' },
  })

  const totalExpenditure = round2(lpos.reduce((s, l) => s + Number(l.grandTotal), 0))
  const totalVat = round2(lpos.reduce((s, l) => s + Number(l.vatTotal), 0))

  const bySupplier = new Map()
  const byCategory = new Map()
  const byProduct = new Map()

  for (const lpo of lpos) {
    const supplierRow = bySupplier.get(lpo.supplier.name) ?? { name: lpo.supplier.name, total: 0, lpoCount: 0 }
    supplierRow.total = round2(supplierRow.total + Number(lpo.grandTotal))
    supplierRow.lpoCount += 1
    bySupplier.set(lpo.supplier.name, supplierRow)

    for (const item of lpo.items) {
      const catRow = byCategory.get(item.product.category.name) ?? { name: item.product.category.name, total: 0 }
      catRow.total = round2(catRow.total + Number(item.lineTotal))
      byCategory.set(item.product.category.name, catRow)

      const prodRow = byProduct.get(item.product.name) ?? { name: item.product.name, total: 0, quantity: 0, unit: item.unit }
      prodRow.total = round2(prodRow.total + Number(item.lineTotal))
      prodRow.quantity = round2(prodRow.quantity + Number(item.quantity))
      byProduct.set(item.product.name, prodRow)
    }
  }

  const [outstandingDeliveries, creditNotes] = await Promise.all([
    db.lPO.count({ where: { status: { in: ['APPROVED', 'PARTIALLY_RECEIVED'] } } }),
    db.creditNote.findMany({
      where: { status: { not: 'COMPLETED' } },
      include: { deliveryItem: { include: { lpoItem: { include: { product: true } } } } },
    }),
  ])

  return {
    fromDate,
    toDate,
    lpoCount: lpos.length,
    totalExpenditure,
    totalVat,
    bySupplier: [...bySupplier.values()].sort((a, b) => b.total - a.total),
    byCategory: [...byCategory.values()].sort((a, b) => b.total - a.total),
    byProduct: [...byProduct.values()].sort((a, b) => b.total - a.total),
    outstandingDeliveries,
    pendingCreditNotesValue: round2(creditNotes.reduce((s, c) => s + Number(c.amount), 0)),
    pendingCreditNotesCount: creditNotes.length,
    lpos,
  }
}
