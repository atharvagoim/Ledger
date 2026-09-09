import { useState } from 'react'
import { Swords } from 'lucide-react'
import { api } from '../../api/client'
import { formatCurrency } from '../../lib/format'
import { TestCard } from './TestCard'
import { ResultBanner } from './ResultBanner'
import { ExplanationPanel } from './ExplanationPanel'
import { RequestLogTable } from './RequestLogTable'
import type { RequestLogRow } from './RequestLogTable'
import type { DemoWalletController } from './types'

export function ConcurrentDebitRaceCard({ demoWallet }: { demoWallet: DemoWalletController }) {
  const [initialBalance, setInitialBalance] = useState('500.00')
  const [debitAmount, setDebitAmount] = useState('100.00')
  const [concurrency, setConcurrency] = useState(10)
  const [phase, setPhase] = useState<'idle' | 'preparing' | 'running' | 'done'>('idle')
  const [rows, setRows] = useState<RequestLogRow[]>([])
  const [finalBalance, setFinalBalance] = useState<string | null>(null)

  const successCount = rows.filter((r) => r.outcome === 'success').length
  const insufficientCount = rows.filter((r) => r.outcome === 'insufficient').length
  const otherCount = rows.length - successCount - insufficientCount
  const expectedSuccess = Math.min(
    concurrency,
    Math.floor(Number(initialBalance) / Number(debitAmount || '1'))
  )
  const verified =
    phase === 'done' &&
    rows.length > 0 &&
    otherCount === 0 &&
    successCount === expectedSuccess &&
    finalBalance !== null &&
    Number(finalBalance) >= 0

  async function run() {
    setRows([])
    setFinalBalance(null)
    setPhase('preparing')
    const userId = await demoWallet.ensureBalance(initialBalance)

    setPhase('running')
    const requests = Array.from({ length: concurrency }, (_, i) => i + 1)

    const results = await Promise.all(
      requests.map(async (requestNumber) => {
        const transactionId = crypto.randomUUID()
        const outcome = await api.processTransactionTimed({
          transactionId,
          userId,
          amount: debitAmount,
          type: 'DEBIT',
        })
        const row: RequestLogRow = {
          requestNumber,
          transactionId,
          durationMs: outcome.durationMs,
          outcome: outcome.status === 201 ? 'success' : outcome.status === 422 ? 'insufficient' : 'error',
          detail:
            outcome.status === 201
              ? 'Debited successfully'
              : outcome.status === 422
                ? 'Insufficient funds'
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
      icon={Swords}
      title="Concurrent Wallet Debit Race"
      description="Attempt multiple simultaneous debits against the same wallet."
    >
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1">Initial balance (₹)</label>
          <input
            value={initialBalance}
            onChange={(e) => setInitialBalance(e.target.value)}
            inputMode="decimal"
            className="w-full rounded-md border border-surface-border px-2.5 py-2 text-sm font-mono text-ink-900 focus:border-ledger focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1">Debit amount (₹)</label>
          <input
            value={debitAmount}
            onChange={(e) => setDebitAmount(e.target.value)}
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
          <div className="flex items-center justify-center gap-3 text-center text-xs">
            <div className="rounded-md bg-surface-sunken px-4 py-2">
              <p className="font-display text-lg font-semibold text-success tabular-nums">{successCount}</p>
              <p className="text-ink-500">Success</p>
            </div>
            <span className="text-ink-300">+</span>
            <div className="rounded-md bg-surface-sunken px-4 py-2">
              <p className="font-display text-lg font-semibold text-danger tabular-nums">{insufficientCount}</p>
              <p className="text-ink-500">Insufficient balance</p>
            </div>
            <span className="text-ink-300">=</span>
            <div className="rounded-md bg-surface-sunken px-4 py-2">
              <p className="font-display text-lg font-semibold text-ink-900 tabular-nums">
                {finalBalance ? formatCurrency(finalBalance) : '—'}
              </p>
              <p className="text-ink-500">Final balance</p>
            </div>
          </div>
          <RequestLogTable rows={rows} />
        </>
      )}

      {phase === 'done' && (
        <ResultBanner
          verified={verified}
          verifiedLabel="✓ CONCURRENCY SAFETY VERIFIED"
          failedLabel="Unexpected result - see the table above"
          detail={<>Balance never went negative, and exactly {expectedSuccess} of {concurrency} requests could be honestly afforded.</>}
        />
      )}

      <ExplanationPanel
        howItWorks="Each debit locks the wallet row with SELECT ... FOR UPDATE (@Lock(PESSIMISTIC_WRITE)) before checking the balance. Any other request trying to debit the same wallet blocks until that lock is released at commit/rollback - so requests are serialized one at a time at the database level, and each one sees the true, latest balance rather than a stale value another concurrent request is about to invalidate."
        whyItMatters="Without row-level locking, two concurrent requests could both read the same starting balance, both decide they can afford the debit, and both subtract - a lost update that lets the balance go negative. The pessimistic lock is what makes 'check funds, then debit' atomic under real concurrency, not just in a single-threaded test."
      />
    </TestCard>
  )
}
