import type { TransactionStatus } from '../types/api'

const STYLES: Record<TransactionStatus, string> = {
  SUCCESS: 'bg-success-tint text-success',
  FAILED_INSUFFICIENT_FUNDS: 'bg-danger-tint text-danger',
}

const LABELS: Record<TransactionStatus, string> = {
  SUCCESS: 'Success',
  FAILED_INSUFFICIENT_FUNDS: 'Insufficient funds',
}

export function StatusBadge({ status }: { status: TransactionStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  )
}
