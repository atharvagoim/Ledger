import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from '../api/client'
import { ApiError } from '../types/api'
import type { TransactionResponse, WalletResponse } from '../types/api'

const STORAGE_KEY = 'awp.currentUserId'

interface AppContextValue {
  userId: string | null
  setUserId: (id: string | null) => void
  wallet: WalletResponse | null
  walletLoading: boolean
  walletError: string | null
  transactions: TransactionResponse[]
  transactionsLoading: boolean
  refreshWallet: () => Promise<void>
  refreshTransactions: () => Promise<void>
  refreshAll: () => Promise<void>
}

const AppContext = createContext<AppContextValue | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [userId, setUserIdState] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY)
  )
  const [wallet, setWallet] = useState<WalletResponse | null>(null)
  const [walletLoading, setWalletLoading] = useState(false)
  const [walletError, setWalletError] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<TransactionResponse[]>([])
  const [transactionsLoading, setTransactionsLoading] = useState(false)

  const setUserId = useCallback((id: string | null) => {
    setUserIdState(id)
    if (id) {
      localStorage.setItem(STORAGE_KEY, id)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  const refreshWallet = useCallback(async () => {
    if (!userId) {
      setWallet(null)
      return
    }
    setWalletLoading(true)
    setWalletError(null)
    try {
      const result = await api.getWallet(userId)
      setWallet(result)
    } catch (err) {
      setWallet(null)
      if (err instanceof ApiError && err.status === 404) {
        setWalletError('NOT_FOUND')
      } else {
        setWalletError(err instanceof Error ? err.message : 'Failed to load wallet')
      }
    } finally {
      setWalletLoading(false)
    }
  }, [userId])

  const refreshTransactions = useCallback(async () => {
    if (!userId) {
      setTransactions([])
      return
    }
    setTransactionsLoading(true)
    try {
      const result = await api.getTransactions(userId)
      setTransactions(result)
    } catch {
      setTransactions([])
    } finally {
      setTransactionsLoading(false)
    }
  }, [userId])

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshWallet(), refreshTransactions()])
  }, [refreshWallet, refreshTransactions])

  useEffect(() => {
    refreshAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  return (
    <AppContext.Provider
      value={{
        userId,
        setUserId,
        wallet,
        walletLoading,
        walletError,
        transactions,
        transactionsLoading,
        refreshWallet,
        refreshTransactions,
        refreshAll,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
