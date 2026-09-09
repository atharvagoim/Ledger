import { useState } from 'react'
import { ChevronDown, Copy, Check, Plus } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { api } from '../api/client'
import { ApiError } from '../types/api'
import { isValidUuid, shortId } from '../lib/format'

export function UserBar() {
  const { userId, setUserId, refreshAll } = useApp()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'switch' | 'create'>('switch')
  const [inputId, setInputId] = useState('')
  const [initialBalance, setInitialBalance] = useState('1000.00')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  function copyId() {
    if (!userId) return
    navigator.clipboard.writeText(userId)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  async function handleSwitch() {
    setError(null)
    if (!isValidUuid(inputId)) {
      setError('Enter a valid userId (UUID).')
      return
    }
    setUserId(inputId.trim())
    setOpen(false)
    setInputId('')
  }

  async function handleCreate() {
    setError(null)
    const amount = Number(initialBalance)
    if (Number.isNaN(amount) || amount < 0) {
      setError('Initial balance must be zero or a positive number.')
      return
    }
    setBusy(true)
    try {
      const newUserId = crypto.randomUUID()
      await api.createWallet({ userId: newUserId, initialBalance })
      setUserId(newUserId)
      await refreshAll()
      setOpen(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create wallet.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md border border-surface-border bg-white px-3 py-1.5 text-sm text-ink-700 hover:bg-surface-sunken transition-colors"
      >
        {userId ? (
          <>
            <span className="text-ink-300">User</span>
            <span className="font-mono text-ink-900">{shortId(userId)}</span>
          </>
        ) : (
          <span className="text-ink-500">No wallet selected</span>
        )}
        <ChevronDown size={14} className="text-ink-300" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-30 mt-2 w-80 rounded-card border border-surface-border bg-white p-4 shadow-raised">
            <div className="flex gap-1 rounded-md bg-surface-sunken p-1 text-sm">
              <button
                onClick={() => setMode('switch')}
                className={`flex-1 rounded py-1.5 font-medium transition-colors ${
                  mode === 'switch' ? 'bg-white shadow-subtle text-ink-900' : 'text-ink-500'
                }`}
              >
                Switch wallet
              </button>
              <button
                onClick={() => setMode('create')}
                className={`flex-1 rounded py-1.5 font-medium transition-colors ${
                  mode === 'create' ? 'bg-white shadow-subtle text-ink-900' : 'text-ink-500'
                }`}
              >
                New wallet
              </button>
            </div>

            {mode === 'switch' ? (
              <div className="mt-3 space-y-2">
                <label className="block text-xs font-medium text-ink-500">
                  Existing userId
                  <input
                    value={inputId}
                    onChange={(e) => setInputId(e.target.value)}
                    placeholder="e.g. 3f2b6c9e-..."
                    className="mt-1 w-full rounded-md border border-surface-border px-2.5 py-1.5 text-sm font-mono text-ink-900 focus:border-ledger focus:outline-none"
                  />
                </label>
                {userId && (
                  <button
                    onClick={copyId}
                    className="flex items-center gap-1.5 text-xs text-ink-500 hover:text-ink-900"
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    {copied ? 'Copied current userId' : 'Copy current userId'}
                  </button>
                )}
                <button
                  onClick={handleSwitch}
                  className="w-full rounded-md bg-ledger py-1.5 text-sm font-medium text-white hover:bg-ledger-light transition-colors"
                >
                  Load wallet
                </button>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                <label className="block text-xs font-medium text-ink-500">
                  Initial balance (₹)
                  <input
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(e.target.value)}
                    inputMode="decimal"
                    className="mt-1 w-full rounded-md border border-surface-border px-2.5 py-1.5 text-sm font-mono text-ink-900 focus:border-ledger focus:outline-none"
                  />
                </label>
                <button
                  onClick={handleCreate}
                  disabled={busy}
                  className="flex w-full items-center justify-center gap-1.5 rounded-md bg-ledger py-1.5 text-sm font-medium text-white hover:bg-ledger-light transition-colors disabled:opacity-60"
                >
                  <Plus size={14} />
                  {busy ? 'Creating…' : 'Create demo wallet'}
                </button>
              </div>
            )}

            {error && <p className="mt-2 text-xs text-danger">{error}</p>}
          </div>
        </>
      )}
    </div>
  )
}
