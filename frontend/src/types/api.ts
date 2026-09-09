export type TransactionType = 'DEBIT' | 'CREDIT'

export type TransactionStatus = 'SUCCESS' | 'FAILED_INSUFFICIENT_FUNDS'

export interface TransactionRequest {
  transactionId: string
  userId: string
  amount: string
  type: TransactionType
}

export interface TransactionResponse {
  transactionId: string
  userId: string
  amount: string
  type: TransactionType
  status: TransactionStatus
  walletBalanceAfter: string | null
  processedAt: string
}

export interface WalletResponse {
  userId: string
  balance: string
  updatedAt: string
}

export interface WalletCreateRequest {
  userId: string
  initialBalance: string
}

export interface ErrorResponse {
  timestamp: string
  status: number
  error: string
  message: string
  path: string
}

/** Thrown by the API client for any non-2xx response, carrying the parsed error body when available. */
export class ApiError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}
