import { useCallback, useRef, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { SystemStatusBar } from '../components/testlab/SystemStatusBar'
import { DemoWalletBar } from '../components/testlab/DemoWalletBar'
import { ConcurrentDuplicatePaymentCard } from '../components/testlab/ConcurrentDuplicatePaymentCard'
import { ConcurrentDebitRaceCard } from '../components/testlab/ConcurrentDebitRaceCard'
import { IdempotencyConflictCard } from '../components/testlab/IdempotencyConflictCard'
import { InsufficientBalanceCard } from '../components/testlab/InsufficientBalanceCard'
import { SuccessfulPaymentCard } from '../components/testlab/SuccessfulPaymentCard'
import { api } from '../api/client'
import type { DemoWalletController } from '../components/testlab/types'

/**
 * A ref (not just state) backs the demo wallet's userId: `ensureBalance` is awaited
 * inside each test card's own async `run()`, and that closure needs the *live*
 * userId the instant `ensureBalance` resolves - not whatever value was captured when
 * the render that started it happened to close over. A ref sidesteps that entirely.
 */
function useDemoWallet(): DemoWalletController {
  const userIdRef = useRef<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [balance, setBalance] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const ensureBalance = useCallback(async (targetBalance: string): Promise<string> => {
    setBusy(true)
    try {
      const newUserId = crypto.randomUUID()
      const wallet = await api.createWallet({ userId: newUserId, initialBalance: targetBalance })
      userIdRef.current = newUserId
      setUserId(newUserId)
      setBalance(wallet.balance)
      return newUserId
    } finally {
      setBusy(false)
    }
  }, [])

  const refresh = useCallback(async (): Promise<string | null> => {
    const id = userIdRef.current
    if (!id) return null
    try {
      const wallet = await api.getWallet(id)
      setBalance(wallet.balance)
      return wallet.balance
    } catch {
      return null
    }
  }, [])

  return { userId, balance, busy, ensureBalance, refresh }
}

export function TestLab() {
  const demoWallet = useDemoWallet()

  return (
    <div>
      <PageHeader
        title="Manual Test Lab"
        subtitle="Exercises the real backend live - not a simulation - so you can watch the idempotency and concurrency guarantees hold under actual concurrent HTTP requests."
      />

      <div className="space-y-4">
        <SystemStatusBar />
        <DemoWalletBar demoWallet={demoWallet} />

        <div className="grid gap-4 lg:grid-cols-2">
          <ConcurrentDuplicatePaymentCard demoWallet={demoWallet} />
          <ConcurrentDebitRaceCard demoWallet={demoWallet} />
          <IdempotencyConflictCard demoWallet={demoWallet} />
          <InsufficientBalanceCard demoWallet={demoWallet} />
          <div className="lg:col-span-2">
            <SuccessfulPaymentCard demoWallet={demoWallet} />
          </div>
        </div>
      </div>
    </div>
  )
}
