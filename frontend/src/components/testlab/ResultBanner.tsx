import { CheckCircle2, XCircle } from 'lucide-react'
import type { ReactNode } from 'react'

export function ResultBanner({
  verified,
  verifiedLabel,
  failedLabel,
  detail,
}: {
  verified: boolean
  verifiedLabel: string
  failedLabel: string
  detail?: ReactNode
}) {
  return (
    <div
      className={`flex items-start gap-2.5 rounded-md px-3.5 py-3 text-sm font-medium ${
        verified ? 'bg-success-tint text-success' : 'bg-danger-tint text-danger'
      }`}
    >
      {verified ? (
        <CheckCircle2 size={18} className="shrink-0 mt-0.5" strokeWidth={2} />
      ) : (
        <XCircle size={18} className="shrink-0 mt-0.5" strokeWidth={2} />
      )}
      <div>
        <p>{verified ? verifiedLabel : failedLabel}</p>
        {detail && <p className="mt-0.5 font-normal opacity-90">{detail}</p>}
      </div>
    </div>
  )
}
