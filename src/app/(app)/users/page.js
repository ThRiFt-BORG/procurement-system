import { notFound } from 'next/navigation'
import PageHeader from '@/components/PageHeader'
import Card from '@/components/Card'
import StatusBadge from '@/components/StatusBadge'
import { getUsers } from '@/lib/queries'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { createUser, setUserActive, setUserRole, resetUserPassword } from '@/lib/actions/users'
import { inputClass, labelClass, btnPrimary, btnGhost } from '@/components/form'

const ROLES = ['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER', 'VIEWER']
const ROLE_LABELS = {
  ADMIN: 'Admin',
  PROCUREMENT_OFFICER: 'Procurement Officer',
  MANAGER: 'Manager',
  VIEWER: 'Viewer',
}

export default async function UsersPage() {
  const currentUser = await getCurrentUser()
  if (!isAdmin(currentUser)) notFound()

  const users = await getUsers()

  return (
    <div>
      <PageHeader
        eyebrow="Configuration"
        title="Users"
        subtitle="Who can sign in, and what they're allowed to do."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 !p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted uppercase tracking-wide border-b border-line">
                <th className="px-5 py-2.5 font-medium">User</th>
                <th className="px-5 py-2.5 font-medium">Role</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 font-medium">Reset password</th>
                <th className="px-5 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-line last:border-b-0 align-top">
                  <td className="px-5 py-3">
                    <div className="font-medium text-foreground">
                      {u.name}
                      {u.id === currentUser.id && <span className="text-xs text-muted"> (you)</span>}
                    </div>
                    <div className="text-xs text-muted">{u.email}</div>
                  </td>
                  <td className="px-5 py-3">
                    <form action={setUserRole.bind(null, u.id)} className="flex items-center gap-1.5">
                      <select name="role" defaultValue={u.role} className={`${inputClass} py-1 text-xs`}>
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                      <button type="submit" className={btnGhost}>
                        Save
                      </button>
                    </form>
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={u.active ? 'ACTIVE' : 'INACTIVE'} />
                  </td>
                  <td className="px-5 py-3">
                    <form action={resetUserPassword} className="flex items-center gap-1.5">
                      <input type="hidden" name="userId" value={u.id} />
                      <input
                        type="password"
                        name="password"
                        placeholder="New password"
                        minLength={8}
                        className={`${inputClass} py-1 text-xs w-32`}
                      />
                      <button type="submit" className={btnGhost}>
                        Set
                      </button>
                    </form>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <form action={setUserActive.bind(null, u.id, !u.active)}>
                      <button type="submit" className={btnGhost} disabled={u.id === currentUser.id && u.active}>
                        {u.active ? 'Deactivate' : 'Activate'}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Add user">
          <form action={createUser} className="space-y-3">
            <div>
              <label className={labelClass}>Name *</label>
              <input name="name" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Email *</label>
              <input type="email" name="email" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Role *</label>
              <select name="role" required defaultValue="PROCUREMENT_OFFICER" className={inputClass}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Password *</label>
              <input type="password" name="password" required minLength={8} className={inputClass} />
              <p className="text-xs text-muted mt-1">At least 8 characters. Share it with them directly.</p>
            </div>
            <button type="submit" className={btnPrimary}>
              + Add user
            </button>
          </form>
        </Card>
      </div>
    </div>
  )
}
