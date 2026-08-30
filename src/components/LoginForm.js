'use client'

import { useActionState } from 'react'
import { login } from '@/lib/actions/auth'
import { inputClass, labelClass, btnPrimary } from '@/components/form'

const initialState = { error: null }

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState)

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className={labelClass}>Email</label>
        <input type="email" name="email" required autoFocus className={inputClass} placeholder="you@restaurant.co.ke" />
      </div>
      <div>
        <label className={labelClass}>Password</label>
        <input type="password" name="password" required className={inputClass} />
      </div>
      {state?.error && <p className="text-sm text-critical">{state.error}</p>}
      <button type="submit" className={`${btnPrimary} w-full`} disabled={pending}>
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
