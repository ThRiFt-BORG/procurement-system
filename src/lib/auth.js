import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'

const COOKIE_NAME = 'session'
const SESSION_DAYS = 14

export async function createSession(userId) {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)

  await db.session.create({ data: { id: token, userId, expiresAt } })

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  })
}

export async function destroySession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (token) {
    await db.session.deleteMany({ where: { id: token } })
  }
  cookieStore.delete(COOKIE_NAME)
}

// Returns the logged-in user, or null. Safe to call from Server Components
// and Server Functions alike.
export async function getCurrentUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null

  const session = await db.session.findUnique({ where: { id: token }, include: { user: true } })
  if (!session || session.expiresAt < new Date() || !session.user.active) return null

  return session.user
}

// Throws if nobody is logged in, or if they're a Viewer. Every mutating
// Server Function should call this first — routes are also gated at the
// layout level, but Server Functions are reachable directly and must check
// for themselves. Viewers are read-only by definition, so this single check
// covers every write path in the app.
export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) throw new Error('You must be logged in')
  if (user.role === 'VIEWER') throw new Error('Viewers cannot make changes')
  return user
}

export async function requireRole(...roles) {
  const user = await requireUser()
  if (!roles.includes(user.role)) throw new Error('You do not have permission to do that')
  return user
}

// UI-side helpers for showing/hiding controls — mirror the checks above so a
// Viewer never even sees a button that would throw when clicked.
export function canMutate(user) {
  return Boolean(user) && user.role !== 'VIEWER'
}

export function isAdmin(user) {
  return Boolean(user) && user.role === 'ADMIN'
}

// For pages that only make sense if you can act on them (e.g. "new supplier"
// forms) — a Viewer landing here directly gets a 404 rather than a dead form.
export async function requireMutatorPage() {
  const user = await getCurrentUser()
  if (!canMutate(user)) notFound()
  return user
}
