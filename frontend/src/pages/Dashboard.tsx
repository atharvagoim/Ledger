import { ListChecks, CheckCircle2, XCircle, Inbox } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { StatCard } from '../components/StatCard'
import { WalletBalanceCard } from '../components/WalletBalanceCard'
import { TransactionForm } from '../components/TransactionForm'
import { TransactionTable } from '../components/TransactionTable'
import { EmptyState } from '../components/EmptyState'
import { useApp } from '../context/AppContext'

export function Dashboard() {
  const { userId, wallet, walletError, transactions } = useApp()

  const total = transactions.length
  const successful = transactions.filter((t) => t.status === 'SUCCESS').length
  const failed = transactions.filter((t) => t.status === 'FAILED_INSUFFICIENT_FUNDS').length

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Live view of one wallet and its processed transactions."
      />

      {!userId || walletError === 'NOT_FOUND' ? (
        <EmptyState
          icon={Inbox}
          title="No wallet selected"
          description="Create a demo wallet or paste an existing userId from the switcher above to get started."
        />
      ) : (
        <div className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-3">
            {wallet && <WalletBalanceCard wallet={wallet} />}
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Total" value={String(total)} icon={ListChecks} />
              <StatCard label="Success" value={String(successful)} icon={CheckCircle2} tone="success" />
              <StatCard label="Failed" value={String(failed)} icon={XCircle} tone="danger" />
            </div>
          </div>

          <div className="grid lg:grid-cols-5 gap-5">
            <div className="lg:col-span-2">
              <TransactionForm />
            </div>
            <div className="lg:col-span-3">
              <h2 className="font-display text-base font-semibold text-ink-900 mb-3">
                Recent activity
              </h2>
              <TransactionTable transactions={transactions} limit={5} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
