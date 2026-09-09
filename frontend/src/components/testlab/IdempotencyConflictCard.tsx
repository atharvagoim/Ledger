import { useState } from 'react'
import { GitCompareArrows } from 'lucide-react'
import { api } from '../../api/client'
import { shortId } from '../../lib/format'
import { TestCard } from './TestCard'
import { ResultBanner } from './ResultBanner'
import { ExplanationPanel } from './ExplanationPanel'
import type { DemoWalletController } from './types'

const STARTING_BALANCE = '1000.00'
const FIRST_AMOUNT = '100.00'
const SECOND_AMOUNT = '500.00'

type Step = { label: string; status: number; detail: string } | null

export function IdempotencyConflictCard({ demoWallet }: { demoWallet: DemoWalletController }) {
  const [running, setRunning] = useState(false)
  const [transactionId, setTransactionId] = useState<string | null>(null)
  const [first, setFirst] = useState<Step>(null)
  const [second, setSecond] = useState<Step>(null)

  async function run() {
    setRunning(true)
    setFirst(null)
    setSecond(null)
    const userId = await demoWallet.ensureBalance(STARTING_BALANCE)
    const sharedTransactionId = crypto.randomUUID()
    setTransactionId(sharedTransactionId)

    const firstOutcome = await api.processTransactionTimed({
      transactionId: sharedTransactionId,
      userId,
      amount: FIRST_AMOUNT,
      type: 'DEBIT',
    })
    setFirst({
      label: `Request 1 - amount ₹${FIRST_AMOUNT}`,
      status: firstOutcome.status,
      detail: firstOutcome.status === 201 ? 'Processed successfully' : 'Unexpected result',
    })

    const secondOutcome = await api.processTransactionTimed({
      transactionId: sharedTransactionId,
      userId,
      amount: SECOND_AMOUNT,
      type: 'DEBIT',
    })
    setSecond({
      label: `Request 2 - SAME transaction ID, amount ₹${SECOND_AMOUNT}`,
      status: secondOutcome.status,
      detail:
        secondOutcome.status === 409
          ? (secondOutcome.body && 'error' in secondOutcome.body ? secondOutcome.body.error : 'Conflict')
          : 'Unexpected result',
    })

    await demoWallet.refresh()
    setRunning(false)
  }

  const verified = first?.status === 201 && second?.status === 409

  return (
    <TestCard
      icon={GitCompareArrows}
      title="Idempotency Conflict"
      description="Reuse the same transaction ID with a different amount - same key, conflicting payload."
    >
      <p className="text-xs text-ink-500">
        Same idempotency key cannot represent two different financial operations. This sends{' '}
        <span className="font-mono text-ink-700">₹{FIRST_AMOUNT}</span> and then{' '}
        <span className="font-mono text-ink-700">₹{SECOND_AMOUNT}</span> under the exact same transaction ID.
      </p>

      <button
        onClick={run}
        disabled={running}
        className="w-full rounded-md bg-ledger py-2 text-sm font-medium text-white hover:bg-ledger-light transition-colors disabled:opacity-60"
      >
        {running ? 'Running conflict test…' : 'Run conflict test'}
      </button>

      {(first || second) && (
        <div className="space-y-2 text-xs">
          {transactionId && (
            <p className="text-ink-500">
              Transaction ID: <span className="font-mono text-ink-700">{shortId(transactionId)}</span>
            </p>
          )}
          {first && (
            <div className="flex items-center justify-between rounded-md bg-surface-sunken px-3 py-2">
              <span className="text-ink-700">{first.label}</span>
              <span className={`font-mono font-medium ${first.status === 201 ? 'text-success' : 'text-danger'}`}>
                {first.status} · {first.detail}
              </span>
            </div>
          )}
          {second && (
            <div className="flex items-center justify-between rounded-md bg-surface-sunken px-3 py-2">
              <span className="text-ink-700">{second.label}</span>
              <span className={`font-mono font-medium ${second.status === 409 ? 'text-danger' : 'text-ink-900'}`}>
                {second.status} · {second.detail}
              </span>
            </div>
          )}
        </div>
      )}

      {first && second && (
        <ResultBanner
          verified={verified}
          verifiedLabel="✓ CONFLICT CORRECTLY REJECTED"
          failedLabel="Unexpected result - see the requests above"
          detail="The second request was refused (409 IDEMPOTENCY_KEY_CONFLICT) rather than silently applied with a different amount."
        />
      )}

      <ExplanationPanel
        howItWorks="When a transactionId is reused, the service compares the new request's userId, amount, and type against the originally-claimed row. Identical payloads are treated as a safe retry (see the Concurrent Duplicate Payment test). A different payload is a genuine conflict: the API throws IdempotencyConflictException, mapped to 409 with error code IDEMPOTENCY_KEY_CONFLICT, and the wallet is never touched a second time."
        whyItMatters="An idempotency key exists to make retries safe - not to let a client accidentally (or maliciously) reuse an ID to mean a different operation. Without this check, a transactionId collision with a different amount could either silently apply the wrong amount or silently do nothing, both of which hide a real bug or attack from the caller."
      />
    </TestCard>
  )
}
