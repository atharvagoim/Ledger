import { useState } from 'react'
import { Copy } from 'lucide-react'
import { api } from '../../api/client'
import { formatCurrency } from '../../lib/format'
import { TestCard } from './TestCard'
import { ResultBanner } from './ResultBanner'
import { ExplanationPanel } from './ExplanationPanel'
import { RequestLogTable } from './RequestLogTable'
import type { RequestLogRow } from './RequestLogTable'
import type { DemoWalletController } from './types'

const STARTING_BALANCE = '1000.00'

export function ConcurrentDuplicatePaymentCard({ demoWallet }: { demoWallet: DemoWalletController }) {
  const [amount, setAmount] = useState('100.00')
  const [concurrency, setConcurrency] = useState(10)
  const [phase, setPhase] = useState<'idle' | 'preparing' | 'running' | 'done'>('idle')
  const [rows, setRows] = useState<RequestLogRow[]>([])
  const [finalBalance, setFinalBalance] = useState<string | null>(null)

  const freshCount = rows.filter((r) => r.outcome === 'success').length
  const replayCount = rows.filter((r) => r.outcome === 'replay').length
  const otherCount = rows.length - freshCount - replayCount
  const verified = phase === 'done' && rows.length > 0 && freshCount === 1 && otherCount === 0

  async function run() {
    setRows([])
    setFinalBalance(null)
    setPhase('preparing')
    const userId = await demoWallet.ensureBalance(STARTING_BALANCE)

    setPhase('running')
    const sharedTransactionId = crypto.randomUUID()
    const requests = Array.from({ length: concurrency }, (_, i) => i + 1)

    const results = await Promise.all(
      requests.map(async (requestNumber) => {
        const outcome = await api.processTransactionTimed({
          transactionId: sharedTransactionId,
          userId,
          amount,
          type: 'DEBIT',
        })
        const row: RequestLogRow = {
          requestNumber,
          transactionId: sharedTransactionId,
          durationMs: outcome.durationMs,
          outcome:
            outcome.status === 201 && outcome.replayed
              ? 'replay'
              : outcome.status === 201
                ? 'success'
                : outcome.status === 409
                  ? 'conflict'
                  : outcome.status === 422
                    ? 'insufficient'
                    : 'error',
          detail:
            outcome.status === 201 && outcome.replayed
              ? 'Replayed original result'
              : outcome.status === 201
                ? 'Payment processed'
                : outcome.body && 'message' in outcome.body
                  ? outcome.body.message
                  : `HTTP ${outcome.status}`,
        }
        return row
      })
    )

    results.sort((a, b) => a.requestNumber - b.requestNumber)
    setRows(results)
    const balance = await demoWallet.refresh()
    setFinalBalance(balance)
    setPhase('done')
  }

  return (
    <TestCard
      icon={Copy}
      title="Concurrent Duplicate Payment"
      description="Send the same transaction ID from multiple requests simultaneously."
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1">Amount (₹)</label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            className="w-full rounded-md border border-surface-border px-2.5 py-2 text-sm font-mono text-ink-900 focus:border-ledger focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1">Concurrent requests</label>
          <input
            value={concurrency}
            onChange={(e) => setConcurrency(Math.max(2, Math.min(50, Number(e.target.value) || 2)))}
            type="number"
            min={2}
            max={50}
            className="w-full rounded-md border border-surface-border px-2.5 py-2 text-sm font-mono text-ink-900 focus:border-ledger focus:outline-none"
          />
        </div>
      </div>

      <button
        onClick={run}
        disabled={phase === 'preparing' || phase === 'running'}
        className="w-full rounded-md bg-ledger py-2 text-sm font-medium text-white hover:bg-ledger-light transition-colors disabled:opacity-60"
      >
        {phase === 'preparing' ? 'Preparing test…' : phase === 'running' ? `Sending ${concurrency} concurrent requests…` : 'Run test'}
      </button>

      {rows.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-md bg-surface-sunken py-2">
              <p className="font-display text-lg font-semibold text-ink-900 tabular-nums">{rows.length}</p>
              <p className="text-ink-500">Requests sent</p>
            </div>
            <div className="rounded-md bg-surface-sunken py-2">
              <p className="font-display text-lg font-semibold text-success tabular-nums">{freshCount}</p>
              <p className="text-ink-500">Fresh success</p>
            </div>
            <div className="rounded-md bg-surface-sunken py-2">
              <p className="font-display text-lg font-semibold text-ledger tabular-nums">{replayCount}</p>
              <p className="text-ink-500">Replayed</p>
            </div>
          </div>
          <RequestLogTable rows={rows} />
        </>
      )}

      {phase === 'done' && (
        <ResultBanner
          verified={verified}
          verifiedLabel="✓ IDEMPOTENCY VERIFIED"
          failedLabel="Unexpected result - see the table above"
          detail={
            <>
              {concurrency} concurrent requests, same transaction ID → 1 financial effect. Final demo wallet balance:{' '}
              {finalBalance ? formatCurrency(finalBalance) : '—'}.
            </>
          }
        />
      )}

      <ExplanationPanel
        howItWorks="All requests carry the same transactionId. The transactions table has a UNIQUE constraint on transaction_id, and the service inserts (and immediately flushes) that row before ever touching the wallet. Only one INSERT can win; every other concurrent request fails that constraint. Instead of returning an error for those losers, the API resolves the collision in a fresh transaction: because their payload is identical to the winner's, it replays the winner's original result (marked with the X-Idempotent-Replay header) rather than debiting the wallet again."
        whyItMatters="This is what stops a network retry (or a duplicate webhook delivery) from charging a user twice. No matter how many identical requests arrive at once, the database guarantees exactly one financial effect - and callers still get back a successful result, not an error, for the copies."
      />
    </TestCard>
  )
}
