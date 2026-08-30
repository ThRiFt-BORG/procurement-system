import { randomBytes, scrypt, timingSafeEqual } from 'crypto'
import { promisify } from 'util'

const scryptAsync = promisify(scrypt)

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const derivedKey = await scryptAsync(password, salt, 64)
  return `${salt}:${derivedKey.toString('hex')}`
}

export async function verifyPassword(password, storedHash) {
  if (!storedHash) return false
  const [salt, key] = storedHash.split(':')
  if (!salt || !key) return false
  const keyBuffer = Buffer.from(key, 'hex')
  const derivedKey = await scryptAsync(password, salt, 64)
  if (keyBuffer.length !== derivedKey.length) return false
  return timingSafeEqual(keyBuffer, derivedKey)
}
