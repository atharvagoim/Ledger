import { Inbox } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { WalletBalanceCard } from '../components/WalletBalanceCard'
import { EmptyState } from '../components/EmptyState'
import { useApp } from '../context/AppContext'

export function WalletPage() {
  const { userId, wallet, walletError, walletLoading } = useApp()

  return (
    <div>
      <PageHeader title="Wallet" subtitle="Balance detail for the selected wallet." />

      {!userId || walletError === 'NOT_FOUND' ? (
        <EmptyState
          icon={Inbox}
          title="No wallet selected"
          description="Create a demo wallet or paste an existing userId from the switcher above."
        />
      ) : walletLoading && !wallet ? (
        <p className="text-sm text-ink-500">Loading wallet…</p>
      ) : wallet ? (
        <div className="max-w-sm">
          <WalletBalanceCard wallet={wallet} />
        </div>
      ) : null}
    </div>
  )
}
