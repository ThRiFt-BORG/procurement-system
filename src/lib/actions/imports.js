'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { splitPrice } from '@/lib/money'
import { logAudit } from '@/lib/audit'
import { requireUser } from '@/lib/auth'

// Commits a reviewed bulk import. Everything about the shape of `rows` has
// already been resolved and confirmed on the review screen (client-side) —
// this only re-validates the essentials and writes the data. Products are
// matched by case-insensitive exact name; a match reuses that product's own
// fixed VAT classification (never the sheet's), a miss creates a new one
// from the row's classification. Prices are always inserted as a new
// PriceHistory row, never overwritten, same as manual entry.
export async function commitImport({ categoryMappings, supplierMappings, rows, sourceLabel, effectiveDate }) {
  const user = await requireUser()
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('No rows to import')

  const effective = effectiveDate ? new Date(effectiveDate) : new Date()
  const source = sourceLabel?.toString().trim() || 'Bulk import'

  const result = await db.$transaction(
    async (tx) => {
      const categoryIdByKey = new Map()
      for (const cm of categoryMappings ?? []) {
        if (cm.action === 'existing') {
          categoryIdByKey.set(cm.key, cm.categoryId)
        } else {
          const name = cm.newName?.toString().trim()
          if (!name) throw new Error('Every new category needs a name')
          const created = await tx.category.upsert({
            where: { name },
            update: {},
            create: { name },
          })
          categoryIdByKey.set(cm.key, created.id)
        }
      }

      const supplierIdByKey = new Map()
      for (const sm of supplierMappings ?? []) {
        if (sm.action === 'existing') {
          supplierIdByKey.set(sm.key, sm.supplierId)
        } else {
          const name = sm.newName?.toString().trim()
          if (!name) throw new Error('Every new supplier needs a name')
          const existing = await tx.supplier.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } })
          const supplier = existing ?? (await tx.supplier.create({ data: { name } }))
          supplierIdByKey.set(sm.key, supplier.id)
        }
      }

      let newProducts = 0
      let newSupplierLinks = 0
      let priceEntries = 0
      const productCache = new Map() // name.toLowerCase() -> product row (avoids re-querying within this batch)

      for (const row of rows) {
        const productName = row.productName?.toString().trim()
        const price = Number(row.price)
        if (!productName || !Number.isFinite(price) || price <= 0) continue

        const categoryId = categoryIdByKey.get(row.categoryKey)
        const supplierId = supplierIdByKey.get(row.supplierKey)
        if (!categoryId || !supplierId) continue

        const cacheKey = productName.toLowerCase()
        let product = productCache.get(cacheKey)
        if (!product) {
          product = await tx.product.findFirst({ where: { name: { equals: productName, mode: 'insensitive' } } })
          if (!product) {
            const vatStatus = row.vatStatus === 'EXEMPT' ? 'EXEMPT' : 'APPLICABLE'
            const vatRate = vatStatus === 'EXEMPT' ? 0 : Number(row.vatRate) || 16
            product = await tx.product.create({
              data: {
                name: productName,
                categoryId,
                unit: row.unit?.toString().trim() || 'pc',
                vatStatus,
                vatRate,
              },
            })
            newProducts++
          }
          productCache.set(cacheKey, product)
        }

        let supplierProduct = await tx.supplierProduct.findUnique({
          where: { supplierId_productId: { supplierId, productId: product.id } },
        })
        if (!supplierProduct) {
          supplierProduct = await tx.supplierProduct.create({ data: { supplierId, productId: product.id } })
          newSupplierLinks++
        }

        const vatBasis = product.vatStatus === 'EXEMPT' ? 'EXCLUSIVE' : (row.vatBasis === 'INCLUSIVE' ? 'INCLUSIVE' : 'EXCLUSIVE')
        const { priceExclVat, vatAmount, priceInclVat } = splitPrice(price, product.vatRate, vatBasis, product.vatStatus)

        await tx.priceHistory.create({
          data: {
            supplierProductId: supplierProduct.id,
            vatBasis,
            quotedPrice: price,
            vatRate: product.vatStatus === 'EXEMPT' ? 0 : product.vatRate,
            priceExclVat,
            vatAmount,
            priceInclVat,
            effectiveDate: effective,
            sourceReference: source,
          },
        })
        priceEntries++
      }

      await logAudit(tx, {
        entity: 'Import',
        entityId: 'bulk-' + Date.now(),
        action: 'CREATE',
        summary: `${user.name} imported ${priceEntries} price entr${priceEntries === 1 ? 'y' : 'ies'} (${newProducts} new product${newProducts === 1 ? '' : 's'}) from ${source}`,
      })

      return { newProducts, newSupplierLinks, priceEntries }
    },
    { timeout: 60000 }
  )

  revalidatePath('/products')
  revalidatePath('/suppliers')
  revalidatePath('/categories')
  revalidatePath('/prices')
  revalidatePath('/')
  return result
}
