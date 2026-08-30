import { db } from '@/lib/db'

// Lightweight audit trail for financial records. No user auth exists yet
// (that's a later stage), so `actor` is left null until logins are added.
export async function logAudit(tx, { entity, entityId, action, summary }) {
  const client = tx ?? db
  await client.auditLog.create({
    data: { entity, entityId, action, summary, actor: null },
  })
}
