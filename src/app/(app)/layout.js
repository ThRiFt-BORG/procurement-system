import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import Sidebar from '@/components/Sidebar'

export default async function AppLayout({ children }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-full flex">
      <Sidebar user={user} />
      <div className="flex-1 min-w-0">
        <main className="max-w-6xl mx-auto px-8 py-8">{children}</main>
      </div>
    </div>
  )
}
