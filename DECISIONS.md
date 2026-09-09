# Design Decisions

This document answers the two questions the assignment brief requires, plus a short
record of the other judgment calls made while building this project.

---

## 1. How did you handle the concurrency race condition?

There are actually two distinct race conditions in this assignment, and they needed
two different mechanisms.

### Race A: the same `transactionId` arriving more than once

The naive fix - "check if a transaction with this ID exists, and if not, insert it" -
is itself racy: two requests can both run the "check" step before either has run the
"insert" step, and both conclude it's safe to proceed.

Instead, `TransactionProcessingService.claimTransactionId()` **attempts the insert
first** and calls `saveAndFlush()` (not `save()`), which forces Hibernate to run the
`INSERT` immediately rather than deferring it to end-of-transaction commit. The
`transactions.transaction_id` column has a database-level `UNIQUE` constraint
(`Transaction.java`), so if two or three requests race to insert the same
transactionId, the database itself guarantees only one `INSERT` can succeed. Every
other one throws `DataIntegrityViolationException` immediately, which is translated
into `DuplicateTransactionException` → HTTP 409.

This has to happen **before** any wallet locking, not after. Locking the wallet row
first would only stop two duplicates from reading the balance at the exact same
instant - it would not stop a duplicate from debiting a second time *after* the first
duplicate's debit had already committed and released the lock. Claiming the
transactionId first is what makes a duplicate fail before it ever reaches the balance.

### Race B: many different transactions debiting the same wallet at once

Once a request has legitimately claimed its transactionId, it locks the wallet row
with `@Lock(LockModeType.PESSIMISTIC_WRITE)` (`WalletRepository.findByUserIdForUpdate`),
which issues `SELECT ... FOR UPDATE`. Any other transaction trying to write-lock the
same wallet row blocks until the current one commits or rolls back - so the balance
each request reads is always the true, latest committed value, never a stale read that
a concurrent request is about to invalidate underneath it. Ten concurrent debits
against one wallet therefore serialize on that row, one at a time, each seeing the
correct post-previous-debit balance before deciding whether it has sufficient funds.

---

## 2. Where did the AI assistant give an incorrect or sub-optimal suggestion?

This section originally reported (accurately, at the time) that the test suite had
been written but never executed, because the environment it was built in had no
network access to Maven Central. That has since changed: the suite has now actually
been run, repeatedly, against a real locally-installed JDK 25 + Maven - all 15 tests
pass. So instead of leaving a stale "unverified" disclaimer in place, here is what
running it for real actually surfaced, which is a more useful record for a reviewer:

- **The original idempotency design's own test caught its own design gap.** The
  first version of this project treated *every* duplicate `transactionId` the same
  way: 409 Conflict, no matter what. Running the assignment's own required scenario
  ("Send request A with transactionId=TX123, amount=100. Send request B with the
  *same* transactionId, amount=500. The system must not silently process B with a
  different payload") against that design surfaced that it didn't actually
  distinguish "a safe retry of the same request" from "a genuine conflicting
  payload" - both got an identical, generic 409. That's not wrong, exactly (a
  conflicting payload was still correctly refused), but it's not production-grade
  idempotency-key semantics either: a caller whose retry was lost to a network
  blip has no way to get its original result back, and gets treated exactly like a
  real conflict. The fix - `TransactionProcessingService#resolveDuplicate`,
  documented in section 3 below - is what makes reused-transactionId behavior a
  genuine two-way decision (replay vs. conflict) rather than a one-size-fits-all
  rejection. This is exactly the kind of gap that only shows up once you sit down
  and specify the exact scenario the assignment describes, rather than stopping at
  "duplicates are rejected."

- **A documented guarantee that didn't exist yet.** `Wallet.java`'s original
  Javadoc claimed "a database-level CHECK constraint keeps balance non-negative as
  a last line of defense" - but no such constraint was actually present in the
  entity. The application-level check and the pessimistic lock were both real and
  correct, but the CHECK constraint was documentation of an intention, not a fact.
  It's now actually implemented (`@Check(constraints = "balance >= 0")` on
  `Wallet`), and Hibernate schema generation accepting it at every app/test startup
  (rather than throwing a `SchemaManagementException`) is the actual evidence it's
  live - a good reminder that a Javadoc claim about a database guarantee is worth
  independently verifying, not trusting on read.

- **H2's pessimistic-locking behavior is not guaranteed identical to Postgres/MySQL.**
  The `SELECT ... FOR UPDATE` semantics `@Lock(PESSIMISTIC_WRITE)` relies on are
  broadly portable, but lock-wait-timeout behavior and exact blocking semantics can
  differ across database engines. This project uses H2 because the assignment
  requires zero external setup, and the locking logic is written against the JPA
  abstraction rather than any H2-specific behavior - but if this were ever pointed at
  a production database, the concurrency tests should be re-run against that database
  too, not assumed to still pass unchanged. This one remains an open, not-yet-tested
  risk, unlike the two items above.

---

## 3. Other decisions worth recording

- **A reused transactionId with an identical payload replays the original result;
  only a *different* payload is rejected as a 409 conflict.** This replaces an
  earlier, simpler design where *every* duplicate got a generic 409, with no
  distinction between "you're safely retrying the exact same request" and "you're
  reusing this ID for something else." The current behavior
  (`TransactionProcessingService#resolveDuplicate`, called by
  `TransactionController` only after the original claim attempt's transaction has
  fully rolled back) compares the new request's userId/amount/type against the
  already-claimed row:
  - **Identical** → the original `TransactionResponse` is returned again, with the
    same status code it originally had, plus an `X-Idempotent-Replay: true` header
    so a caller (or the Manual Test Lab) can tell a replay from a fresh success. No
    second financial effect occurs.
  - **Different** → `IdempotencyConflictException` → 409, `IDEMPOTENCY_KEY_CONFLICT`,
    with a message naming exactly why (payload mismatch on this transactionId).

  This is closer to how idempotency keys work in real payment APIs (Stripe's
  `Idempotency-Key` header behaves this way) and directly answers the assignment's
  own posed scenario (`TX123` with amount 100, then `TX123` again with amount 500)
  with a real, working distinction rather than a blanket rejection either way. The
  resolution runs in its own fresh, separate `@Transactional(readOnly = true)`
  method rather than reusing the transaction that just failed its `INSERT` flush -
  deliberately avoiding any reliance on a Hibernate session's state immediately
  after a constraint-violation exception, which is not something to build on.

- **Insufficient funds is not modeled as an exception.** It's an expected business
  outcome, not an application error: the attempt is still recorded in the
  `transactions` table (status `FAILED_INSUFFICIENT_FUNDS`) as part of the audit
  trail, the wallet is left untouched, and the HTTP layer returns 422. Using exception-driven
  control flow here would have thrown away that audit row on rollback.

- **One wallet per user (`user_id` is unique).** Kept deliberately simple - the
  assignment's scope is about idempotency and concurrency, not multi-wallet account
  modeling.

- **No authentication.** The brief explicitly says not to over-engineer with auth
  that isn't genuinely useful to demonstrating the core requirements. `userId` is
  passed directly in requests, which is standard for an internal service-to-service
  processor of this kind.

- **`POST /api/v1/wallets` (demo wallet creation) was added beyond the required
  endpoints.** Without it, the frontend has no way to bootstrap a funded wallet to
  demo against short of writing directly to H2. It's documented as a setup/demo
  convenience, not part of the core idempotency/concurrency requirements.

- **A real database-level `CHECK (balance >= 0)` constraint, in addition to the
  application-level check and the pessimistic lock.** It is deliberately the
  *third*, outermost layer, not the primary mechanism - by the time a write would
  violate it, the application-level balance check has already refused the request.
  It exists as a genuine last line of defense (a future code change or a direct SQL
  statement bypassing the two layers above would still be stopped), which is why
  it's real and not just documentation - see section 2 above for why that
  distinction mattered here specifically. It's documented in the `Wallet` Javadoc
  as one of three explicit layers (application check, pessimistic lock, CHECK
  constraint) rather than left implicit.

- **Maven Wrapper (`mvnw`/`mvnw.cmd`) is checked in.** So a reviewer with a JDK but
  no local Maven install can still build/test/run the project with zero setup,
  matching the same "zero external setup" philosophy that motivated choosing H2.

- **springdoc-openapi (Swagger UI) was added; Actuator's health endpoint was added
  with only `health` exposed.** Both are thin, well-justified additions - not
  scope creep - because the assignment explicitly asks for real API documentation
  and a real (not faked) system-status signal for the frontend. Actuator's other
  endpoints (env, beans, mappings, etc.) are deliberately *not* exposed, since
  they're not needed and would leak more than a demo should.

- **A `prod` Spring profile (`application-prod.properties`) exists alongside the
  default dev/demo settings, but stays deliberately minimal** - it disables the H2
  console and switches `ddl-auto` from `update` to `validate`. It does not attempt
  to be a full production configuration (no real datasource, no secrets
  management) - see section 4 below for what actually changing databases would
  require.

## 4. What would change for a production (e.g. Postgres) deployment

- **Datasource**: point `spring.datasource.*` at Postgres/MySQL, most likely via
  environment variables rather than a committed properties file; drop the H2
  dependency's runtime scope from the deployed artifact (or keep it test-scoped
  only).
- **Schema management**: replace `ddl-auto` entirely with a real migration tool
  (Flyway or Liquibase) with versioned, reviewed migration scripts - including one
  that adds the `CHECK (balance >= 0)` constraint and the two `UNIQUE` constraints
  explicitly, rather than relying on Hibernate to infer them from annotations.
- **Locking behavior**: re-run the two concurrency tests
  (`sendsThreeIdenticalTransactionIdsSimultaneously`,
  `sendsTenConcurrentDebitRequestsAgainstFiveHundredBalance`) against the real
  target database - `SELECT ... FOR UPDATE` semantics are broadly portable but not
  guaranteed bit-for-bit identical to H2's (see section 2 above).
- **Secrets**: datasource credentials would come from environment variables or a
  secrets manager, never a committed file - none are committed today because H2
  needs none.
- **Observability**: expose more of Actuator (metrics, readiness/liveness) behind
  proper network restrictions, rather than only `health` on the open internet.
