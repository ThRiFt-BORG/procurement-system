'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { emptyToNull } from '@/lib/utils'
import { requireUser } from '@/lib/auth'

export async function createCategory(formData) {
  await requireUser()
  const name = formData.get('name')?.toString().trim()
  if (!name) throw new Error('Category name is required')

  await db.category.create({
    data: {
      name,
      description: emptyToNull(formData.get('description')),
    },
  })

  revalidatePath('/categories')
  revalidatePath('/products')
}

export async function setCategoryActive(id, active) {
  await requireUser()
  await db.category.update({ where: { id }, data: { active } })
  revalidatePath('/categories')
}
