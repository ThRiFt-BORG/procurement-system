'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/lib/actions/auth'

const ROLE_LABELS = {
  ADMIN: 'Admin',
  PROCUREMENT_OFFICER: 'Procurement Officer',
  MANAGER: 'Manager',
  VIEWER: 'Viewer',
}

const NAV = [
  { href: '/', label: 'Dashboard', live: true },
  { href: '/suppliers', label: 'Suppliers', live: true },
  { href: '/products', label: 'Products', live: true },
  { href: '/categories', label: 'Categories', live: true },
  { href: '/prices', label: 'Prices', live: true },
  { href: '/lpos', label: 'LPOs', live: true },
  { href: '/deliveries', label: 'Deliveries', live: true },
  { href: '/credit-notes', label: 'Credit Notes', live: true },
  { href: '/reports', label: 'Reports', live: true },
  { href: '/settings', label: 'Settings', live: true },
]

export default function Sidebar({ user }) {
  const pathname = usePathname()
  const nav =
    user?.role === 'ADMIN'
      ? [...NAV, { href: '/users', label: 'Users', live: true }, { href: '/audit-log', label: 'Audit Log', live: true }]
      : NAV

  return (
    <aside className="no-print w-60 shrink-0 border-r border-line bg-surface flex flex-col">
      <div className="px-5 py-5 border-b border-line">
        <div className="text-[11px] font-mono tracking-wide uppercase text-accent">Procurement</div>
        <div className="font-semibold text-foreground">Restaurant Ops</div>
      </div>
      <nav className="flex-1 py-3">
        {nav.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
          if (!item.live) {
            return (
              <div
                key={item.href}
                className="flex items-center justify-between px-5 py-2 text-sm text-muted/60"
                title="Coming in a later stage"
              >
                <span>{item.label}</span>
                <span className="text-[10px] font-mono uppercase tracking-wide border border-line rounded px-1.5 py-0.5">
                  soon
                </span>
              </div>
            )
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-5 py-2 text-sm border-l-2 transition-colors ${
                active
                  ? 'border-accent bg-accent-soft text-accent-strong font-medium'
                  : 'border-transparent text-foreground hover:bg-surface-alt'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
      {user && (
        <div className="px-5 py-4 border-t border-line">
          <div className="text-sm font-medium text-foreground truncate">{user.name}</div>
          <div className="text-xs text-muted mb-2">{ROLE_LABELS[user.role] ?? user.role}</div>
          <form action={logout}>
            <button type="submit" className="text-xs text-muted hover:text-accent-strong">
              Sign out
            </button>
          </form>
        </div>
      )}
    </aside>
  )
}
