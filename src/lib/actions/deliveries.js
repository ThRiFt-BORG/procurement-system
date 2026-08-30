'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { round2 } from '@/lib/money'
import { logAudit } from '@/lib/audit'
import { requireUser } from '@/lib/auth'

// Records a delivery against an LPO. Quantities are re-checked against the
// database (never trusting the client), so multiple partial deliveries over
// time can never over-deliver a line. Updates the LPO's status to reflect
// how much of the order has now arrived.
export async function createDelivery({ lpoId, deliveryDate, notes, items }) {
  const user = await requireUser()
  if (!lpoId) throw new Error('LPO is required')
  if (!Array.isArray(items) || items.length === 0) throw new Error('Enter at least one delivered quantity')

  const delivery = await db.$transaction(async (tx) => {
    const lpo = await tx.lPO.findUniqueOrThrow({
      where: { id: lpoId },
      include: { items: { include: { deliveryItems: true } } },
    })

    if (!['APPROVED', 'PARTIALLY_RECEIVED'].includes(lpo.status)) {
      throw new Error('Only approved LPOs can receive deliveries')
    }

    const deliveryItemsData = []
    for (const line of items) {
      const lpoItem = lpo.items.find((i) => i.id === line.lpoItemId)
      if (!lpoItem) throw new Error('Line item not found on this LPO')

      const deliveredSoFar = lpoItem.deliveryItems.reduce((s, di) => s + Number(di.deliveredQty), 0)
      const remaining = round2(Number(lpoItem.quantity) - deliveredSoFar)
      const deliveredQty = round2(Number(line.deliveredQty))

      if (deliveredQty <= 0) continue
      if (deliveredQty > remaining) {
        throw new Error(`Cannot deliver more than the ${remaining} still outstanding on this line`)
      }

      deliveryItemsData.push({
        lpoItemId: lpoItem.id,
        orderedQty: remaining,
        deliveredQty,
        notes: line.notes || null,
      })
    }

    if (deliveryItemsData.length === 0) throw new Error('Enter at least one delivered quantity greater than zero')

    const anyShortfall = deliveryItemsData.some((d) => d.deliveredQty < d.orderedQty)
    const deliveryStatus = anyShortfall ? 'PARTIALLY_RECEIVED' : 'FULLY_RECEIVED'

    const created = await tx.delivery.create({
      data: {
        lpoId,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : new Date(),
        status: deliveryStatus,
        notes: notes || null,
        items: { create: deliveryItemsData },
      },
    })

    // Recompute whole-LPO fulfillment across every line, including past deliveries.
    let totalRemaining = 0
    for (const lpoItem of lpo.items) {
      const deliveredBefore = lpoItem.deliveryItems.reduce((s, di) => s + Number(di.deliveredQty), 0)
      const thisRound = deliveryItemsData.find((d) => d.lpoItemId === lpoItem.id)?.deliveredQty ?? 0
      totalRemaining += round2(Number(lpoItem.quantity) - deliveredBefore - thisRound)
    }

    const newLpoStatus = totalRemaining <= 0 ? 'FULLY_RECEIVED' : 'PARTIALLY_RECEIVED'
    await tx.lPO.update({ where: { id: lpoId }, data: { status: newLpoStatus } })

    await logAudit(tx, {
      entity: 'Delivery',
      entityId: created.id,
      action: 'CREATE',
      summary: `${user.name} recorded a delivery against ${lpo.lpoNumber} (${deliveryStatus.toLowerCase().replace('_', ' ')})`,
    })

    return created
  })

  revalidatePath(`/lpos/${lpoId}`)
  revalidatePath('/lpos')
  revalidatePath('/deliveries')
  revalidatePath('/')
  redirect(`/deliveries/${delivery.id}`)
}
