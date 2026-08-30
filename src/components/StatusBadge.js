const STYLES = {
  DRAFT: 'bg-surface-alt text-muted border-line',
  PENDING_APPROVAL: 'bg-warn-soft text-warn border-warn/30',
  APPROVED: 'bg-accent-soft text-accent-strong border-accent/30',
  PARTIALLY_RECEIVED: 'bg-warn-soft text-warn border-warn/30',
  FULLY_RECEIVED: 'bg-good-soft text-good border-good/30',
  NOT_RECEIVED: 'bg-surface-alt text-muted border-line',
  CANCELLED: 'bg-critical-soft text-critical border-critical/30',
  PENDING: 'bg-warn-soft text-warn border-warn/30',
  REQUESTED: 'bg-warn-soft text-warn border-warn/30',
  RECEIVED: 'bg-accent-soft text-accent-strong border-accent/30',
  COMPLETED: 'bg-good-soft text-good border-good/30',
  ACTIVE: 'bg-good-soft text-good border-good/30',
  INACTIVE: 'bg-surface-alt text-muted border-line',
}

const LABELS = {
  PENDING_APPROVAL: 'Pending approval',
  PARTIALLY_RECEIVED: 'Partially received',
  FULLY_RECEIVED: 'Fully received',
  NOT_RECEIVED: 'Not received',
}

export default function StatusBadge({ status }) {
  const style = STYLES[status] ?? 'bg-surface-alt text-muted border-line'
  const label = LABELS[status] ?? status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium capitalize ${style}`}>
      {label.toLowerCase()}
    </span>
  )
}
