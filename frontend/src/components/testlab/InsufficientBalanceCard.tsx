import { useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import { api } from '../../api/client'
import { formatCurrency } from '../../lib/format'
import { TestCard } from './TestCard'
import { ResultBanner } from './ResultBanner'
import { ExplanationPanel } from './ExplanationPanel'
import type { DemoWalletController } from './types'

const INITIAL_BALANCE = '100.00'
const DEBIT_AMOUNT = '250.00'

export function InsufficientBalanceCard({ demoWallet }: { demoWallet: DemoWalletController }) {
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState<number | null>(null)
  const [balanceAfter, setBalanceAfter] = useState<string | null>(null)

  async function run() {
    setRunning(true)
    setStatus(null)
    setBalanceAfter(null)
    const userId = await demoWallet.ensureBalance(INITIAL_BALANCE)

    const outcome = await api.processTransactionTimed({
      transactionId: crypto.randomUUID(),
      userId,
      amount: DEBIT_AMOUNT,
      type: 'DEBIT',
    })
    setStatus(outcome.status)

    const balance = await demoWallet.refresh()
    setBalanceAfter(balance)
    setRunning(false)
  }

  const verified = status === 422 && balanceAfter !== null && Number(balanceAfter) === Number(INITIAL_BALANCE)

  return (
    <TestCard
      icon={ShieldAlert}
      title="Insufficient Balance"
      description={`Attempt to debit ₹${DEBIT_AMOUNT} from a wallet holding only ₹${INITIAL_BALANCE}.`}
    >
      <button
        onClick={run}
        disabled={running}
        className="w-full rounded-md bg-ledger py-2 text-sm font-medium text-white hover:bg-ledger-light transition-colors disabled:opacity-60"
      >
        {running ? 'Running…' : 'Run test'}
      </button>

      {status !== null && (
        <div className="flex items-center justify-between rounded-md bg-surface-sunken px-3 py-2 text-xs">
          <span className="text-ink-700">
            Debit ₹{DEBIT_AMOUNT} against ₹{INITIAL_BALANCE} balance
          </span>
          <span className={`font-mono font-medium ${status === 422 ? 'text-danger' : 'text-ink-900'}`}>
            {status} · {status === 422 ? 'Rejected - insufficient funds' : 'Unexpected'}
          </span>
        </div>
      )}

      {status !== null && (
        <ResultBanner
          verified={verified}
          verifiedLabel="✓ NO NEGATIVE BALANCE"
          failedLabel="Unexpected result"
          detail={<>Balance remains {balanceAfter ? formatCurrency(balanceAfter) : '—'} - the request was rejected before ever touching the wallet.</>}
        />
      )}

      <ExplanationPanel
        howItWorks="After locking the wallet row, the service compares the current balance against the requested debit amount before doing anything else. If the balance is insufficient, the already-inserted transaction row is marked FAILED_INSUFFICIENT_FUNDS (so it's still recorded in the audit trail) and the method returns immediately - the wallet's balance column is never written to."
        whyItMatters="This is the application-level guarantee that a wallet can never go negative from a single request. It's backed by two more layers below it: the pessimistic lock (which makes this check race-safe under concurrency) and a database-level CHECK (balance >= 0) constraint as a last line of defense - see the Concurrent Wallet Debit Race test for the check under real concurrency."
      />
    </TestCard>
  )
}
