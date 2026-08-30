'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { emptyToNull, toNumber } from '@/lib/utils'
import { logAudit } from '@/lib/audit'
import { requireUser } from '@/lib/auth'

export async function createCreditNote(formData) {
  const user = await requireUser()
  const deliveryItemId = formData.get('deliveryItemId')?.toString()
  const amount = toNumber(formData.get('amount'))
  const creditNoteNumber = emptyToNull(formData.get('creditNoteNumber'))
  const creditNoteDateRaw = formData.get('creditNoteDate')?.toString()
  const notes = emptyToNull(formData.get('notes'))

  if (!deliveryItemId || amount <= 0) throw new Error('A delivery line and a positive amount are required')

  const created = await db.creditNote.create({
    data: {
      deliveryItemId,
      amount,
      creditNoteNumber,
      creditNoteDate: creditNoteDateRaw ? new Date(creditNoteDateRaw) : null,
      notes,
      status: 'PENDING',
    },
  })

  await logAudit(null, {
    entity: 'CreditNote',
    entityId: created.id,
    action: 'CREATE',
    summary: `${user.name} raised a credit note for a short delivery`,
  })

  revalidatePath('/credit-notes')
  revalidatePath('/deliveries')
}

export async function setCreditNoteStatus(id, status) {
  const user = await requireUser()
  await db.creditNote.update({ where: { id }, data: { status } })
  await logAudit(null, {
    entity: 'CreditNote',
    entityId: id,
    action: 'STATUS_CHANGE',
    summary: `${user.name} moved a credit note to ${status.toLowerCase()}`,
  })
  revalidatePath('/credit-notes')
  revalidatePath('/deliveries')
}
