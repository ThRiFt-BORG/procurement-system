'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { hashPassword } from '@/lib/password'
import { requireRole } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

const ROLES = ['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER', 'VIEWER']

export async function createUser(formData) {
  const admin = await requireRole('ADMIN')

  const name = formData.get('name')?.toString().trim()
  const email = formData.get('email')?.toString().trim().toLowerCase()
  const role = formData.get('role')?.toString()
  const password = formData.get('password')?.toString()

  if (!name || !email) throw new Error('Name and email are required')
  if (!ROLES.includes(role)) throw new Error('Choose a valid role')
  if (!password || password.length < 8) throw new Error('Password must be at least 8 characters')

  const created = await db.user.create({
    data: { name, email, role, passwordHash: await hashPassword(password) },
  })

  await logAudit(null, {
    entity: 'User',
    entityId: created.id,
    action: 'CREATE',
    summary: `${admin.name} created the account for ${name} (${role.replace(/_/g, ' ').toLowerCase()})`,
  })

  revalidatePath('/users')
}

export async function setUserActive(id, active) {
  const admin = await requireRole('ADMIN')
  if (id === admin.id && !active) throw new Error("You can't deactivate your own account")

  const user = await db.user.update({ where: { id }, data: { active } })
  await logAudit(null, {
    entity: 'User',
    entityId: id,
    action: 'STATUS_CHANGE',
    summary: `${admin.name} ${active ? 'activated' : 'deactivated'} ${user.name}`,
  })
  revalidatePath('/users')
}

export async function setUserRole(id, formData) {
  const admin = await requireRole('ADMIN')
  const role = formData.get('role')?.toString()
  if (!ROLES.includes(role)) throw new Error('Choose a valid role')
  if (id === admin.id && role !== 'ADMIN') throw new Error("You can't remove your own admin access")

  const user = await db.user.update({ where: { id }, data: { role } })
  await logAudit(null, {
    entity: 'User',
    entityId: id,
    action: 'ROLE_CHANGE',
    summary: `${admin.name} changed ${user.name}'s role to ${role.replace(/_/g, ' ').toLowerCase()}`,
  })
  revalidatePath('/users')
}

export async function resetUserPassword(formData) {
  const admin = await requireRole('ADMIN')
  const id = formData.get('userId')?.toString()
  const password = formData.get('password')?.toString()
  if (!password || password.length < 8) throw new Error('Password must be at least 8 characters')

  const user = await db.user.update({ where: { id }, data: { passwordHash: await hashPassword(password) } })
  await db.session.deleteMany({ where: { userId: id } }) // force re-login everywhere
  await logAudit(null, {
    entity: 'User',
    entityId: id,
    action: 'PASSWORD_RESET',
    summary: `${admin.name} reset the password for ${user.name}`,
  })
  revalidatePath('/users')
}
