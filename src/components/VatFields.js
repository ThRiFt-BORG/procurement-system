'use client'

import { useState } from 'react'
import { inputClass, labelClass } from '@/components/form'

export default function VatFields({ defaultVatStatus = 'APPLICABLE', defaultVatRate = 16 }) {
  const [status, setStatus] = useState(defaultVatStatus)

  return (
    <>
      <div>
        <label className={labelClass}>VAT status</label>
        <div className="flex gap-4 text-sm pt-1.5">
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="vatStatus"
              value="APPLICABLE"
              checked={status === 'APPLICABLE'}
              onChange={() => setStatus('APPLICABLE')}
            />
            Applicable
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="vatStatus"
              value="EXEMPT"
              checked={status === 'EXEMPT'}
              onChange={() => setStatus('EXEMPT')}
            />
            Exempt
          </label>
        </div>
      </div>
      <div>
        <label className={labelClass}>VAT rate (%)</label>
        <input
          type="number"
          name="vatRate"
          step="0.01"
          min="0"
          defaultValue={defaultVatRate}
          disabled={status === 'EXEMPT'}
          className={`${inputClass} disabled:opacity-40 disabled:bg-surface-alt`}
        />
      </div>
    </>
  )
}
