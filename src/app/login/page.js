import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import LoginForm from '@/components/LoginForm'

export default async function LoginPage() {
  const user = await getCurrentUser()
  if (user) redirect('/')

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-[11px] font-mono uppercase tracking-wide text-accent mb-1">Procurement</div>
          <div className="text-xl font-semibold text-foreground">Restaurant Ops</div>
        </div>
        <div className="bg-surface border border-line rounded-lg p-6">
          <LoginForm />
        </div>
        <div className="mt-4 text-xs text-muted text-center leading-relaxed">
          Demo accounts (local only) —<br />
          amina@example-restaurant.co.ke / officer123 (Procurement Officer)<br />
          david@example-restaurant.co.ke / manager123 (Manager)<br />
          grace@example-restaurant.co.ke / admin123 (Admin)<br />
          joseph@example-restaurant.co.ke / viewer123 (Viewer)
        </div>
      </div>
    </div>
  )
}
