import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string
  icon: LucideIcon
  tone?: 'neutral' | 'success' | 'danger'
}

const TONE_STYLES: Record<NonNullable<StatCardProps['tone']>, string> = {
  neutral: 'text-ink-900',
  success: 'text-success',
  danger: 'text-danger',
}

export function StatCard({ label, value, icon: Icon, tone = 'neutral' }: StatCardProps) {
  return (
    <div className="rounded-card border border-surface-border bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-300">
          {label}
        </span>
        <Icon size={16} className="text-ink-300" strokeWidth={2} />
      </div>
      <p className={`mt-2 font-display text-2xl font-semibold tabular-nums ${TONE_STYLES[tone]}`}>
        {value}
      </p>
    </div>
  )
}
