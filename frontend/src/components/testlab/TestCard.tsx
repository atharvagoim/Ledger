import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export function TestCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <div className="rounded-card border border-surface-border bg-white p-5 shadow-subtle">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-ledger-tint p-2 shrink-0">
          <Icon size={18} className="text-ledger" strokeWidth={2} />
        </div>
        <div>
          <h3 className="font-display text-base font-semibold text-ink-900">{title}</h3>
          <p className="mt-0.5 text-sm text-ink-500">{description}</p>
        </div>
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  )
}
