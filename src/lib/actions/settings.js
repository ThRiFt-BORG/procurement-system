'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { emptyToNull, toNumber } from '@/lib/utils'
import { requireRole } from '@/lib/auth'

export async function updateSettings(formData) {
  await requireRole('MANAGER', 'ADMIN')
  const data = {
    companyName: formData.get('companyName')?.toString().trim() || 'Your Restaurant Name',
    companyAddress: emptyToNull(formData.get('companyAddress')),
    companyPhone: emptyToNull(formData.get('companyPhone')),
    companyEmail: emptyToNull(formData.get('companyEmail')),
    defaultVatRate: toNumber(formData.get('defaultVatRate'), 16),
  }

  await db.settings.upsert({
    where: { id: 'singleton' },
    update: data,
    create: { id: 'singleton', ...data },
  })

  revalidatePath('/settings')
  revalidatePath('/lpos', 'layout')
  redirect('/settings?saved=1')
}
