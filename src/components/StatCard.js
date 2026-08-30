export default function StatCard({ label, value, hint }) {
  return (
    <div className="bg-surface border border-line rounded-lg px-4 py-3.5">
      <div className="text-xs text-muted">{label}</div>
      <div className="text-xl font-semibold text-foreground mt-1 tabular-nums">{value}</div>
      {hint && <div className="text-xs text-muted mt-0.5">{hint}</div>}
    </div>
  )
}
