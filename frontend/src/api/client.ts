import type {
  ErrorResponse,
  TransactionRequest,
  TransactionResponse,
  WalletCreateRequest,
  WalletResponse,
} from '../types/api'
import { ApiError } from '../types/api'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    })
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Is the backend running?')
  }

  if (!response.ok) {
    let body: ErrorResponse | null = null
    try {
      body = await response.json()
    } catch {
      // Response wasn't JSON (e.g. a raw 500 from an unhandled failure) - fall through.
    }
    throw new ApiError(
      response.status,
      body?.error ?? 'UNKNOWN_ERROR',
      body?.message ?? `Request failed with status ${response.status}`
    )
  }

  // 204/empty bodies aren't used by this API, but guard anyway.
  const text = await response.text()
  return text ? (JSON.parse(text) as T) : (undefined as T)
}

/** One raw HTTP outcome, used by the Test Lab where the status code, replay header, and
 *  timing all matter - not just the parsed body. Never throws; the caller inspects `status`. */
export interface RawOutcome {
  status: number
  ok: boolean
  replayed: boolean
  durationMs: number
  body: TransactionResponse | ErrorResponse | null
}

async function processTransactionTimed(payload: TransactionRequest): Promise<RawOutcome> {
  const start = performance.now()
  try {
    const response = await fetch(`${BASE_URL}/api/v1/transactions/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const durationMs = performance.now() - start
    const text = await response.text()
    const body = text ? JSON.parse(text) : null
    return {
      status: response.status,
      ok: response.status === 201 || response.status === 422,
      replayed: response.headers.get('X-Idempotent-Replay') === 'true',
      durationMs,
      body,
    }
  } catch {
    return {
      status: 0,
      ok: false,
      replayed: false,
      durationMs: performance.now() - start,
      body: { timestamp: new Date().toISOString(), status: 0, error: 'NETWORK_ERROR', message: 'Could not reach the server.', path: '/api/v1/transactions/process' },
    }
  }
}

export const api = {
  /**
   * The core processing call has three distinct outcome shapes, not two:
   *  - 201 Created            -> TransactionResponse, status SUCCESS
   *  - 422 Unprocessable      -> TransactionResponse, status FAILED_INSUFFICIENT_FUNDS
   *      (a valid, recorded attempt - not an application error, so it does NOT throw)
   *  - 400/404/409/500        -> ErrorResponse -> thrown as ApiError
   */
  async processTransaction(payload: TransactionRequest): Promise<TransactionResponse> {
    let response: Response
    try {
      response = await fetch(`${BASE_URL}/api/v1/transactions/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } catch {
      throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Is the backend running?')
    }

    const text = await response.text()
    const body = text ? JSON.parse(text) : null

    if (response.status === 201 || response.status === 422) {
      return body as TransactionResponse
    }

    const errorBody = body as ErrorResponse | null
    throw new ApiError(
      response.status,
      errorBody?.error ?? 'UNKNOWN_ERROR',
      errorBody?.message ?? `Request failed with status ${response.status}`
    )
  },

  getTransactions(userId: string): Promise<TransactionResponse[]> {
    return request<TransactionResponse[]>(
      `/api/v1/transactions?userId=${encodeURIComponent(userId)}`
    )
  },

  getWallet(userId: string): Promise<WalletResponse> {
    return request<WalletResponse>(`/api/v1/wallets/${encodeURIComponent(userId)}`)
  },

  createWallet(payload: WalletCreateRequest): Promise<WalletResponse> {
    return request<WalletResponse>('/api/v1/wallets', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  /**
   * Used exclusively by the Manual Test Lab. Unlike `processTransaction`, this never
   * throws - every outcome (success, replay, conflict, insufficient funds, network
   * error) comes back as a plain result so the Lab can render every request's fate,
   * including the ones a normal UI flow would treat as an error.
   */
  processTransactionTimed,
}
