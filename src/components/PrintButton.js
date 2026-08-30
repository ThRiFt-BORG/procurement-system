'use client'

import { btnSecondary } from '@/components/form'

export default function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={btnSecondary}>
      Print / Save as PDF
    </button>
  )
}
