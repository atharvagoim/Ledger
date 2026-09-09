import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-surface-border bg-white px-6 py-14 text-center">
      <div className="rounded-full bg-surface-sunken p-3">
        <Icon size={20} className="text-ink-300" strokeWidth={1.75} />
      </div>
      <h3 className="mt-4 font-display text-sm font-semibold text-ink-900">{title}</h3>
      <p className="mt-1 max-w-xs text-sm text-ink-500">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
