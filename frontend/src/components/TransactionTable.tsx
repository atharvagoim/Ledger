import { ArrowDownLeft, ArrowUpRight, Receipt } from 'lucide-react'
import type { TransactionResponse } from '../types/api'
import { formatCurrency, formatDateTime, shortId } from '../lib/format'
import { StatusBadge } from './StatusBadge'
import { EmptyState } from './EmptyState'

export function TransactionTable({
  transactions,
  limit,
}: {
  transactions: TransactionResponse[]
  limit?: number
}) {
  const rows = limit ? transactions.slice(0, limit) : transactions

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="No transactions yet"
        description="Transactions processed for this wallet will show up here."
      />
    )
  }

  return (
    <div className="rounded-card border border-surface-border bg-white overflow-hidden">
      {/* Desktop table */}
      <table className="hidden md:table w-full text-sm">
        <thead>
          <tr className="border-b border-surface-border text-left text-xs font-medium uppercase tracking-wide text-ink-300">
            <th className="px-4 py-3 font-medium">Transaction</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium text-right">Amount</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Processed</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((tx) => (
            <tr key={tx.transactionId} className="border-b border-surface-border last:border-0">
              <td className="px-4 py-3 font-mono text-xs text-ink-500">
                {shortId(tx.transactionId)}
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-1 text-ink-700">
                  {tx.type === 'DEBIT' ? (
                    <ArrowUpRight size={14} className="text-danger" />
                  ) : (
                    <ArrowDownLeft size={14} className="text-success" />
                  )}
                  {tx.type === 'DEBIT' ? 'Debit' : 'Credit'}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-mono tabular-nums text-ink-900">
                {formatCurrency(tx.amount)}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={tx.status} />
              </td>
              <td className="px-4 py-3 text-xs text-ink-500">{formatDateTime(tx.processedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile stacked cards */}
      <ul className="md:hidden divide-y divide-surface-border">
        {rows.map((tx) => (
          <li key={tx.transactionId} className="p-4">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-900">
                {tx.type === 'DEBIT' ? (
                  <ArrowUpRight size={14} className="text-danger" />
                ) : (
                  <ArrowDownLeft size={14} className="text-success" />
                )}
                {tx.type === 'DEBIT' ? 'Debit' : 'Credit'}
              </span>
              <span className="font-mono tabular-nums text-sm text-ink-900">
                {formatCurrency(tx.amount)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="font-mono text-xs text-ink-500">{shortId(tx.transactionId)}</span>
              <StatusBadge status={tx.status} />
            </div>
            <p className="mt-1.5 text-xs text-ink-300">{formatDateTime(tx.processedAt)}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
