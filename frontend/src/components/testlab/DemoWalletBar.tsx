import { Wallet, RotateCcw } from 'lucide-react'
import { formatCurrency, shortId } from '../../lib/format'
import type { DemoWalletController } from './types'

export function DemoWalletBar({ demoWallet }: { demoWallet: DemoWalletController }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-card border border-dashed border-ledger/30 bg-ledger-tint px-4 py-3 text-sm">
      <Wallet size={16} className="text-ledger shrink-0" />
      <div className="min-w-0">
        <p className="font-medium text-ledger">
          {demoWallet.userId ? (
            <>
              Demo wallet <span className="font-mono">{shortId(demoWallet.userId)}</span> · Balance{' '}
              {demoWallet.balance ? formatCurrency(demoWallet.balance) : '—'}
            </>
          ) : (
            'No demo wallet yet - each test below creates one automatically the first time you run it.'
          )}
        </p>
        <p className="text-xs text-ledger/80">
          Disposable, isolated from your dashboard wallet. Every test resets it to the balance it needs before running,
          so results are repeatable.
        </p>
      </div>
      {demoWallet.userId && (
        <button
          onClick={() => demoWallet.ensureBalance('1000.00')}
          disabled={demoWallet.busy}
          className="ml-auto flex shrink-0 items-center gap-1.5 rounded-md border border-ledger/30 bg-white px-3 py-1.5 text-xs font-medium text-ledger hover:bg-ledger-tint transition-colors disabled:opacity-60"
        >
          <RotateCcw size={13} />
          Reset demo wallet (₹1000)
        </button>
      )}
    </div>
  )
}
