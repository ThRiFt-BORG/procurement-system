'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { emptyToNull, toNumber } from '@/lib/utils'
import { splitPrice } from '@/lib/money'
import { requireUser } from '@/lib/auth'

export async function createProduct(formData) {
  await requireUser()
  const name = formData.get('name')?.toString().trim()
  const categoryId = formData.get('categoryId')?.toString()
  const unit = formData.get('unit')?.toString().trim()
  const vatStatus = formData.get('vatStatus')?.toString() === 'EXEMPT' ? 'EXEMPT' : 'APPLICABLE'
  const vatRate = vatStatus === 'EXEMPT' ? 0 : toNumber(formData.get('vatRate'), 16)

  if (!name) throw new Error('Product name is required')
  if (!categoryId) throw new Error('Category is required')
  if (!unit) throw new Error('Unit of measure is required')

  const existing = await db.product.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } })
  if (existing) throw new Error(`A product named "${existing.name}" already exists`)

  const product = await db.product.create({
    data: {
      name,
      categoryId,
      unit,
      vatStatus,
      vatRate,
      notes: emptyToNull(formData.get('notes')),
    },
  })

  revalidatePath('/products')
  redirect(`/products/${product.id}`)
}

export async function setProductActive(id, active) {
  await requireUser()
  await db.product.update({ where: { id }, data: { active } })
  revalidatePath('/products')
  revalidatePath(`/products/${id}`)
}

// Adds a new price record for an existing supplier/product pair.
// Never edits or deletes a prior PriceHistory row — always inserts.
export async function addPricePoint(formData) {
  await requireUser()
  const supplierProductId = formData.get('supplierProductId')?.toString()
  const quotedPrice = toNumber(formData.get('quotedPrice'))
  const vatBasis = formData.get('vatBasis')?.toString() === 'INCLUSIVE' ? 'INCLUSIVE' : 'EXCLUSIVE'
  const effectiveDateRaw = formData.get('effectiveDate')?.toString()
  const sourceReference = emptyToNull(formData.get('sourceReference'))
  const notes = emptyToNull(formData.get('notes'))

  if (!supplierProductId) throw new Error('Supplier/product is required')
  if (!quotedPrice || quotedPrice <= 0) throw new Error('Price must be greater than zero')

  const supplierProduct = await db.supplierProduct.findUniqueOrThrow({
    where: { id: supplierProductId },
    include: { product: true },
  })

  const { priceExclVat, vatAmount, priceInclVat } = splitPrice(
    quotedPrice,
    supplierProduct.product.vatRate,
    vatBasis,
    supplierProduct.product.vatStatus
  )

  await db.priceHistory.create({
    data: {
      supplierProductId,
      vatBasis,
      quotedPrice,
      vatRate: supplierProduct.product.vatStatus === 'EXEMPT' ? 0 : supplierProduct.product.vatRate,
      priceExclVat,
      vatAmount,
      priceInclVat,
      effectiveDate: effectiveDateRaw ? new Date(effectiveDateRaw) : new Date(),
      sourceReference,
      notes,
    },
  })

  revalidatePath(`/products/${supplierProduct.productId}`)
  revalidatePath(`/suppliers/${supplierProduct.supplierId}`)
  revalidatePath('/prices')
  revalidatePath('/')
}

// Links a new supplier to a product and records its first price in one step.
export async function addSupplierWithPrice(formData) {
  await requireUser()
  const productId = formData.get('productId')?.toString()
  const supplierId = formData.get('supplierId')?.toString()
  const isPreferred = formData.get('isPreferred') === 'on'
  const quotedPrice = toNumber(formData.get('quotedPrice'))
  const vatBasis = formData.get('vatBasis')?.toString() === 'INCLUSIVE' ? 'INCLUSIVE' : 'EXCLUSIVE'
  const effectiveDateRaw = formData.get('effectiveDate')?.toString()
  const sourceReference = emptyToNull(formData.get('sourceReference'))

  if (!productId || !supplierId) throw new Error('Product and supplier are required')
  if (!quotedPrice || quotedPrice <= 0) throw new Error('Price must be greater than zero')

  const product = await db.product.findUniqueOrThrow({ where: { id: productId } })

  const supplierProduct = await db.supplierProduct.upsert({
    where: { supplierId_productId: { supplierId, productId } },
    update: { isPreferred },
    create: { supplierId, productId, isPreferred },
  })

  const { priceExclVat, vatAmount, priceInclVat } = splitPrice(
    quotedPrice,
    product.vatRate,
    vatBasis,
    product.vatStatus
  )

  await db.priceHistory.create({
    data: {
      supplierProductId: supplierProduct.id,
      vatBasis,
      quotedPrice,
      vatRate: product.vatStatus === 'EXEMPT' ? 0 : product.vatRate,
      priceExclVat,
      vatAmount,
      priceInclVat,
      effectiveDate: effectiveDateRaw ? new Date(effectiveDateRaw) : new Date(),
      sourceReference,
    },
  })

  revalidatePath(`/products/${productId}`)
  revalidatePath(`/suppliers/${supplierId}`)
  revalidatePath('/prices')
}
