'use server'

import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { verifyPassword } from '@/lib/password'
import { createSession, destroySession } from '@/lib/auth'

export async function login(prevState, formData) {
  const email = formData.get('email')?.toString().trim().toLowerCase()
  const password = formData.get('password')?.toString()

  if (!email || !password) return { error: 'Enter your email and password.' }

  const user = await db.user.findUnique({ where: { email } })
  if (!user || !user.active || !user.passwordHash) {
    return { error: 'Invalid email or password.' }
  }

  const ok = await verifyPassword(password, user.passwordHash)
  if (!ok) return { error: 'Invalid email or password.' }

  await createSession(user.id)
  redirect('/')
}

export async function logout() {
  await destroySession()
  redirect('/login')
}
