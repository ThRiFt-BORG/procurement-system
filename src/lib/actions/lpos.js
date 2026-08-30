'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { splitPrice, calcLineTotals, calcLpoTotals, round2, formatKES } from '@/lib/money'
import { logAudit } from '@/lib/audit'
import { requireUser, requireRole } from '@/lib/auth'

async function nextLpoNumber(attemptOffset) {
  const year = new Date().getFullYear()
  const prefix = `LPO-${year}-`
  const count = await db.lPO.count({ where: { lpoNumber: { startsWith: prefix } } })
  const seq = count + 1 + attemptOffset
  return `${prefix}${String(seq).padStart(4, '0')}`
}

function validateLines(lines) {
  if (!Array.isArray(lines) || lines.length === 0) throw new Error('Add at least one line item')
  for (const line of lines) {
    if (!line.supplierProductId || !line.quantity || Number(line.quantity) <= 0) {
      throw new Error('Every line needs a product and a quantity greater than zero')
    }
    if (!line.quotedPrice || Number(line.quotedPrice) <= 0) {
      throw new Error('Every line needs a unit price greater than zero')
    }
  }
}

// Resolves one submitted line into a full LPOItem row, appending a new
// PriceHistory entry (never overwriting) if the quoted price differs from
// the last one on record. Shared by create and edit so both stay identical.
async function buildLineItem(tx, line, orderDate, sourceLabel) {
  const supplierProduct = await tx.supplierProduct.findUniqueOrThrow({
    where: { id: line.supplierProductId },
    include: { product: true },
  })
  const product = supplierProduct.product
  const vatBasis = line.vatBasis === 'INCLUSIVE' ? 'INCLUSIVE' : 'EXCLUSIVE'

  const { priceExclVat, vatAmount, priceInclVat } = splitPrice(line.quotedPrice, product.vatRate, vatBasis, product.vatStatus)

  const latest = await tx.priceHistory.findFirst({
    where: { supplierProductId: line.supplierProductId },
    orderBy: { effectiveDate: 'desc' },
  })

  let priceHistoryId
  if (latest && round2(latest.priceExclVat) === priceExclVat) {
    priceHistoryId = latest.id
  } else {
    const created = await tx.priceHistory.create({
      data: {
        supplierProductId: line.supplierProductId,
        vatBasis,
        quotedPrice: line.quotedPrice,
        vatRate: product.vatStatus === 'EXEMPT' ? 0 : product.vatRate,
        priceExclVat,
        vatAmount,
        priceInclVat,
        effectiveDate: orderDate ? new Date(orderDate) : new Date(),
        sourceReference: sourceLabel,
      },
    })
    priceHistoryId = created.id
  }

  const totals = calcLineTotals(line.quantity, priceExclVat, product.vatRate, product.vatStatus)

  return {
    productId: product.id,
    priceHistoryId,
    quantity: line.quantity,
    unit: product.unit,
    unitPrice: priceExclVat,
    vatStatus: product.vatStatus,
    vatRate: product.vatStatus === 'EXEMPT' ? 0 : Number(product.vatRate),
    ...totals,
  }
}

// Creates an LPO with automatic VAT/line/total calculations. If a line's
// quoted price differs from the last recorded price for that supplier/product,
// a new PriceHistory row is appended (never overwriting the old one) and
// sourced back to this LPO.
export async function createLpo({ supplierId, orderDate, notes, terms, lines }) {
  const user = await requireUser()
  if (!supplierId) throw new Error('Supplier is required')
  validateLines(lines)

  let lastError
  for (let attempt = 0; attempt < 6; attempt++) {
    const lpoNumber = await nextLpoNumber(attempt)
    try {
      const lpo = await db.$transaction(async (tx) => {
        const itemsData = []
        for (const line of lines) {
          itemsData.push(await buildLineItem(tx, line, orderDate, `LPO ${lpoNumber}`))
        }

        const { subtotal, vatTotal, grandTotal } = calcLpoTotals(itemsData)

        const created = await tx.lPO.create({
          data: {
            lpoNumber,
            supplierId,
            status: 'DRAFT',
            orderDate: orderDate ? new Date(orderDate) : new Date(),
            preparedById: user.id,
            subtotal,
            vatTotal,
            grandTotal,
            notes: notes || null,
            terms: terms || null,
            items: { create: itemsData },
          },
        })

        await logAudit(tx, {
          entity: 'LPO',
          entityId: created.id,
          action: 'CREATE',
          summary: `${user.name} created ${lpoNumber} for ${formatKES(grandTotal)}`,
        })

        return created
      })

      revalidatePath('/lpos')
      revalidatePath('/')
      redirect(`/lpos/${lpo.id}`)
    } catch (err) {
      if (err?.digest?.startsWith?.('NEXT_REDIRECT')) throw err
      if (err?.code === 'P2002') {
        lastError = err
        continue
      }
      throw err
    }
  }
  throw lastError ?? new Error('Could not allocate an LPO number, please try again')
}

// Edits an LPO's own lines/details. Only allowed while it's still a Draft —
// once it's been submitted, the officer who prepared it can no longer change
// what a Manager is being asked to approve.
export async function updateLpo(id, { supplierId, orderDate, notes, terms, lines }) {
  const user = await requireUser()
  if (!supplierId) throw new Error('Supplier is required')
  validateLines(lines)

  const existing = await db.lPO.findUniqueOrThrow({ where: { id } })
  if (existing.status !== 'DRAFT') {
    throw new Error('Only a draft LPO can be edited — submit a correction as a new one otherwise.')
  }

  await db.$transaction(async (tx) => {
    const itemsData = []
    for (const line of lines) {
      itemsData.push(await buildLineItem(tx, line, orderDate, `LPO ${existing.lpoNumber} (edit)`))
    }

    const { subtotal, vatTotal, grandTotal } = calcLpoTotals(itemsData)

    // DRAFT LPOs have no deliveries yet, so their line items have no
    // dependents — safe to replace wholesale rather than diff them.
    await tx.lPOItem.deleteMany({ where: { lpoId: id } })

    await tx.lPO.update({
      where: { id },
      data: {
        supplierId,
        orderDate: orderDate ? new Date(orderDate) : new Date(),
        subtotal,
        vatTotal,
        grandTotal,
        notes: notes || null,
        terms: terms || null,
        items: { create: itemsData },
      },
    })

    await logAudit(tx, {
      entity: 'LPO',
      entityId: id,
      action: 'UPDATE',
      summary: `${user.name} edited ${existing.lpoNumber}`,
    })
  })

  revalidatePath('/lpos')
  revalidatePath(`/lpos/${id}`)
  revalidatePath('/')
  redirect(`/lpos/${id}`)
}

export async function setLpoStatus(id, status) {
  const user =
    status === 'APPROVED'
      ? await requireRole('MANAGER', 'ADMIN') // only a manager can approve an LPO
      : await requireUser()

  if (status === 'CANCELLED') {
    // Once anything has been delivered against this LPO, real money has
    // already changed hands — cancelling would drop that spend out of
    // Reports entirely (CANCELLED LPOs are excluded there). Close it out via
    // "fully received" instead, or credit-note any shortfall.
    const deliveryCount = await db.delivery.count({ where: { lpoId: id } })
    if (deliveryCount > 0) {
      throw new Error(
        'This LPO already has deliveries recorded against it and can no longer be cancelled — mark it fully received instead, or raise a credit note for any shortfall.'
      )
    }
  }

  const data = status === 'APPROVED' ? { status, approvedById: user.id } : { status }
  const lpo = await db.lPO.update({ where: { id }, data })

  await logAudit(null, {
    entity: 'LPO',
    entityId: id,
    action: 'STATUS_CHANGE',
    summary: `${user.name} moved ${lpo.lpoNumber} to ${status.replace(/_/g, ' ').toLowerCase()}`,
  })
  revalidatePath('/lpos')
  revalidatePath(`/lpos/${id}`)
  revalidatePath('/')
}
