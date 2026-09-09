import { useState } from 'react'
import { RefreshCw, Send, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { api } from '../api/client'
import { ApiError } from '../types/api'
import type { TransactionType } from '../types/api'
import { useApp } from '../context/AppContext'
import { isValidUuid } from '../lib/format'

type Outcome =
  | { kind: 'success'; message: string }
  | { kind: 'duplicate'; message: string }
  | { kind: 'insufficient'; message: string }
  | { kind: 'error'; message: string }

export function TransactionForm() {
  const { userId, refreshAll } = useApp()
  const [transactionId, setTransactionId] = useState<string>(() => crypto.randomUUID())
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<TransactionType>('DEBIT')
  const [submitting, setSubmitting] = useState(false)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)

  function regenerateId() {
    setTransactionId(crypto.randomUUID())
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setOutcome(null)
    setFieldError(null)

    if (!userId) {
      setFieldError('Select or create a wallet first.')
      return
    }
    if (!isValidUuid(transactionId)) {
      setFieldError('Transaction ID must be a valid UUID.')
      return
    }
    const amountValue = Number(amount)
    if (!amount || Number.isNaN(amountValue) || amountValue <= 0) {
      setFieldError('Amount must be a positive number.')
      return
    }

    setSubmitting(true)
    try {
      const response = await api.processTransaction({ transactionId, userId, amount, type })
      if (response.status === 'SUCCESS') {
        setOutcome({ kind: 'success', message: 'Transaction processed successfully.' })
        regenerateId()
        setAmount('')
      } else {
        setOutcome({
          kind: 'insufficient',
          message: 'Transaction failed because the wallet does not have sufficient funds.',
        })
      }
      await refreshAll()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setOutcome({ kind: 'duplicate', message: 'This transaction has already been processed.' })
      } else if (err instanceof ApiError) {
        setOutcome({ kind: 'error', message: err.message })
      } else {
        setOutcome({ kind: 'error', message: 'Something went wrong. Please try again.' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-card border border-surface-border bg-white p-5">
      <h2 className="font-display text-base font-semibold text-ink-900">Process transaction</h2>
      <p className="mt-0.5 text-xs text-ink-500">
        Submits to <code className="font-mono">POST /api/v1/transactions/process</code>
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1">Transaction ID</label>
          <div className="flex gap-2">
            <input
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              className="flex-1 min-w-0 rounded-md border border-surface-border px-2.5 py-2 text-sm font-mono text-ink-900 focus:border-ledger focus:outline-none"
            />
            <button
              type="button"
              onClick={regenerateId}
              title="Generate new transaction ID"
              className="shrink-0 rounded-md border border-surface-border px-2.5 text-ink-500 hover:bg-surface-sunken transition-colors"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">Amount (₹)</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              className="w-full rounded-md border border-surface-border px-2.5 py-2 text-sm font-mono text-ink-900 focus:border-ledger focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as TransactionType)}
              className="w-full rounded-md border border-surface-border px-2.5 py-2 text-sm text-ink-900 focus:border-ledger focus:outline-none bg-white"
            >
              <option value="DEBIT">Debit</option>
              <option value="CREDIT">Credit</option>
            </select>
          </div>
        </div>

        {fieldError && <p className="text-xs text-danger">{fieldError}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-ledger py-2.5 text-sm font-medium text-white hover:bg-ledger-light transition-colors disabled:opacity-60"
        >
          <Send size={15} />
          {submitting ? 'Processing…' : 'Process transaction'}
        </button>
      </form>

      {outcome && (
        <div
          className={`mt-4 flex items-start gap-2.5 rounded-md border p-3 text-sm ${
            outcome.kind === 'success'
              ? 'border-success/20 bg-success-tint text-success'
              : outcome.kind === 'duplicate'
                ? 'border-ledger/20 bg-ledger-tint text-ledger'
                : 'border-danger/20 bg-danger-tint text-danger'
          }`}
        >
          {outcome.kind === 'success' ? (
            <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          ) : outcome.kind === 'duplicate' ? (
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          ) : (
            <XCircle size={16} className="mt-0.5 shrink-0" />
          )}
          <span>{outcome.message}</span>
        </div>
      )}
    </div>
  )
}
