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

// Corrects a credit note's own details — a data-entry fix, not a status
// change. Locked once it's been Received/Completed, since by then the money
// has actually been reconciled against whatever was recorded.
export async function updateCreditNote(id, formData) {
  const user = await requireUser()

  const existing = await db.creditNote.findUniqueOrThrow({ where: { id } })
  if (!['PENDING', 'REQUESTED'].includes(existing.status)) {
    throw new Error('This credit note has already been received or completed and can no longer be edited.')
  }

  const amount = toNumber(formData.get('amount'))
  if (!amount || amount <= 0) throw new Error('Amount must be greater than zero')

  const creditNoteNumber = emptyToNull(formData.get('creditNoteNumber'))
  const creditNoteDateRaw = formData.get('creditNoteDate')?.toString()
  const notes = emptyToNull(formData.get('notes'))

  await db.creditNote.update({
    where: { id },
    data: {
      amount,
      creditNoteNumber,
      creditNoteDate: creditNoteDateRaw ? new Date(creditNoteDateRaw) : null,
      notes,
    },
  })

  await logAudit(null, {
    entity: 'CreditNote',
    entityId: id,
    action: 'UPDATE',
    summary: `${user.name} corrected a credit note's details`,
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
