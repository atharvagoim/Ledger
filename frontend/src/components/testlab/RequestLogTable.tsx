import { shortId } from '../../lib/format'

export interface RequestLogRow {
  requestNumber: number
  transactionId: string
  outcome: 'success' | 'replay' | 'conflict' | 'insufficient' | 'error'
  detail: string
  durationMs: number
}

const OUTCOME_STYLES: Record<RequestLogRow['outcome'], string> = {
  success: 'bg-success-tint text-success',
  replay: 'bg-ledger-tint text-ledger',
  conflict: 'bg-danger-tint text-danger',
  insufficient: 'bg-danger-tint text-danger',
  error: 'bg-danger-tint text-danger',
}

const OUTCOME_LABELS: Record<RequestLogRow['outcome'], string> = {
  success: 'SUCCESS',
  replay: 'REPLAYED',
  conflict: 'CONFLICT',
  insufficient: 'INSUFFICIENT',
  error: 'ERROR',
}

export function RequestLogTable({ rows }: { rows: RequestLogRow[] }) {
  if (rows.length === 0) return null

  return (
    <div className="max-h-64 overflow-y-auto overflow-x-auto rounded-md border border-surface-border">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-surface-sunken text-ink-500">
          <tr>
            <th className="px-2.5 py-1.5 text-left font-medium">#</th>
            <th className="px-2.5 py-1.5 text-left font-medium">Transaction ID</th>
            <th className="px-2.5 py-1.5 text-left font-medium">Status</th>
            <th className="px-2.5 py-1.5 text-left font-medium">Response</th>
            <th className="px-2.5 py-1.5 text-right font-medium">Duration</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {rows.map((row) => (
            <tr key={row.requestNumber} className="animate-[fadeIn_0.2s_ease-out]">
              <td className="px-2.5 py-1.5 font-mono text-ink-500">{row.requestNumber}</td>
              <td className="px-2.5 py-1.5 font-mono text-ink-700">{shortId(row.transactionId)}</td>
              <td className="px-2.5 py-1.5">
                <span className={`inline-flex rounded-full px-1.5 py-0.5 font-medium ${OUTCOME_STYLES[row.outcome]}`}>
                  {OUTCOME_LABELS[row.outcome]}
                </span>
              </td>
              <td className="px-2.5 py-1.5 text-ink-500">{row.detail}</td>
              <td className="px-2.5 py-1.5 text-right font-mono tabular-nums text-ink-500">
                {row.durationMs.toFixed(0)}ms
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
