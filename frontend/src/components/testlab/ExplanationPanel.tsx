import { useState } from 'react'
import { ChevronDown, Info } from 'lucide-react'

export function ExplanationPanel({
  howItWorks,
  whyItMatters,
}: {
  howItWorks: string
  whyItMatters: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-md border border-surface-border">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-medium text-ink-500 hover:text-ink-900"
      >
        <span className="flex items-center gap-1.5">
          <Info size={13} />
          How it works &amp; why this test matters
        </span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-2 border-t border-surface-border px-3 py-3 text-xs leading-relaxed text-ink-500">
          <p>
            <span className="font-semibold text-ink-700">How it works: </span>
            {howItWorks}
          </p>
          <p>
            <span className="font-semibold text-ink-700">Why this test matters: </span>
            {whyItMatters}
          </p>
        </div>
      )}
    </div>
  )
}
