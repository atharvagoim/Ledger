import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { api } from '../../api/client'
import { formatCurrency, shortId } from '../../lib/format'
import { TestCard } from './TestCard'
import { ExplanationPanel } from './ExplanationPanel'
import type { DemoWalletController } from './types'

const STARTING_BALANCE = '1000.00'

interface Result {
  transactionId: string
  amount: string
  previousBalance: string
  newBalance: string
  status: number
}

export function SuccessfulPaymentCard({ demoWallet }: { demoWallet: DemoWalletController }) {
  const [amount, setAmount] = useState('150.00')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<Result | null>(null)

  async function run() {
    setRunning(true)
    setResult(null)
    const userId = await demoWallet.ensureBalance(STARTING_BALANCE)
    const previousBalance = STARTING_BALANCE
    const transactionId = crypto.randomUUID()

    const outcome = await api.processTransactionTimed({ transactionId, userId, amount, type: 'DEBIT' })
    const newBalance = await demoWallet.refresh()

    setResult({
      transactionId,
      amount,
      previousBalance,
      newBalance: newBalance ?? '—',
      status: outcome.status,
    })
    setRunning(false)
  }

  return (
    <TestCard
      icon={CheckCircle2}
      title="Successful Payment"
      description="A plain, single debit against a fresh demo wallet - the normal, happy-path flow."
    >
      <div>
        <label className="block text-xs font-medium text-ink-500 mb-1">Amount (₹)</label>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          className="w-full rounded-md border border-surface-border px-2.5 py-2 text-sm font-mono text-ink-900 focus:border-ledger focus:outline-none"
        />
      </div>

      <button
        onClick={run}
        disabled={running}
        className="w-full rounded-md bg-ledger py-2 text-sm font-medium text-white hover:bg-ledger-light transition-colors disabled:opacity-60"
      >
        {running ? 'Processing…' : 'Run test'}
      </button>

      {result && (
        <div className="space-y-1.5 rounded-md bg-surface-sunken px-3 py-2.5 text-xs">
          <Row label="Transaction ID" value={shortId(result.transactionId)} mono />
          <Row label="Amount" value={formatCurrency(result.amount)} />
          <Row label="Previous balance" value={formatCurrency(result.previousBalance)} />
          <Row label="New balance" value={formatCurrency(result.newBalance)} />
          <Row
            label="Status"
            value={result.status === 201 ? '201 · SUCCESS' : String(result.status)}
            valueClass={result.status === 201 ? 'text-success' : 'text-danger'}
          />
        </div>
      )}

      <ExplanationPanel
        howItWorks="A single request: claim the transactionId (insert + flush), lock the wallet row, check funds, debit, mark the transaction SUCCESS - all inside one @Transactional method, so it either all happens or (on an unexpected error) none of it does."
        whyItMatters="This is the baseline the other tests build on: before proving the system is safe under duplicates and concurrency, it has to first correctly process one straightforward request end to end."
      />
    </TestCard>
  )
}

function Row({ label, value, mono, valueClass }: { label: string; value: string; mono?: boolean; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-500">{label}</span>
      <span className={`font-medium text-ink-900 ${mono ? 'font-mono' : ''} ${valueClass ?? ''}`}>{value}</span>
    </div>
  )
}
