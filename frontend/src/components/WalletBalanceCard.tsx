import { formatCurrency, formatDateTime, shortId } from '../lib/format'
import type { WalletResponse } from '../types/api'

export function WalletBalanceCard({ wallet }: { wallet: WalletResponse }) {
  return (
    <div className="rounded-card border border-surface-border border-l-4 border-l-ledger bg-white p-5">
      <span className="text-xs font-medium uppercase tracking-wide text-ink-300">
        Current balance
      </span>
      <p className="mt-1.5 font-display text-4xl font-semibold tabular-nums text-ink-900">
        {formatCurrency(wallet.balance)}
      </p>
      <div className="mt-3 flex items-center gap-3 text-xs text-ink-500">
        <span className="font-mono">{shortId(wallet.userId)}</span>
        <span className="text-ink-300">·</span>
        <span>Updated {formatDateTime(wallet.updatedAt)}</span>
      </div>
    </div>
  )
}
