import { Inbox } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { TransactionTable } from '../components/TransactionTable'
import { EmptyState } from '../components/EmptyState'
import { useApp } from '../context/AppContext'

export function Transactions() {
  const { userId, transactions, transactionsLoading } = useApp()

  return (
    <div>
      <PageHeader title="Transactions" subtitle="Full history for the selected wallet." />

      {!userId ? (
        <EmptyState
          icon={Inbox}
          title="No wallet selected"
          description="Create a demo wallet or paste an existing userId from the switcher above to see its transaction history."
        />
      ) : transactionsLoading ? (
        <p className="text-sm text-ink-500">Loading transactions…</p>
      ) : (
        <TransactionTable transactions={transactions} />
      )}
    </div>
  )
}
