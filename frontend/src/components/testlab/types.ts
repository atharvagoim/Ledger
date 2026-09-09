/**
 * The Manual Test Lab manages one disposable demo wallet, shared across every test
 * card, so an interviewer never risks the "real" dashboard wallet. `ensureBalance`
 * always creates a brand-new wallet (fresh UUID) at the requested balance - that's
 * what makes each test's starting state deterministic and repeatable on every click
 * of RUN, regardless of what a previous test left behind.
 */
export interface DemoWalletController {
  userId: string | null
  balance: string | null
  busy: boolean
  ensureBalance: (targetBalance: string) => Promise<string>
  refresh: () => Promise<string | null>
}
