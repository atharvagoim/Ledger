package com.assignment.paymentwallet.integration;

import com.assignment.paymentwallet.dto.ErrorResponse;
import com.assignment.paymentwallet.dto.TransactionRequest;
import com.assignment.paymentwallet.dto.TransactionResponse;
import com.assignment.paymentwallet.dto.WalletCreateRequest;
import com.assignment.paymentwallet.dto.WalletResponse;
import com.assignment.paymentwallet.entity.Transaction;
import com.assignment.paymentwallet.entity.TransactionStatus;
import com.assignment.paymentwallet.entity.TransactionType;
import com.assignment.paymentwallet.entity.Wallet;
import com.assignment.paymentwallet.repository.TransactionRepository;
import com.assignment.paymentwallet.repository.WalletRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * End-to-end integration tests. These make real HTTP calls into a fully-started
 * Spring application backed by real H2 - nothing here is mocked, so what passes here
 * is what will actually happen at runtime.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class TransactionProcessingIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private WalletRepository walletRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    private UUID userId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
    }

    @AfterEach
    void tearDown() {
        // Each test uses its own random userId, so no cross-test interference - this is
        // just tidy-up, not a correctness requirement.
        walletRepository.findByUserId(userId).ifPresent(walletRepository::delete);
    }

    // ------------------------------------------------------------------
    // Test 1
    // ------------------------------------------------------------------

    @Test
    @DisplayName("Processes a single valid debit transaction successfully.")
    void processesSingleValidDebitTransactionSuccessfully() {
        seedWallet(new BigDecimal("500.00"));
        TransactionRequest request = debitRequest(UUID.randomUUID(), new BigDecimal("150.00"));

        ResponseEntity<TransactionResponse> response = processTransaction(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        TransactionResponse body = Objects.requireNonNull(response.getBody());
        assertThat(body.status()).isEqualTo(TransactionStatus.SUCCESS);
        assertThat(body.walletBalanceAfter()).isEqualByComparingTo("350.00");

        Wallet wallet = walletRepository.findByUserId(userId).orElseThrow();
        assertThat(wallet.getBalance()).isEqualByComparingTo("350.00");

        System.out.println("==================================================");
        System.out.println("TEST: Single valid debit transaction");
        System.out.println("==================================================");
        System.out.println("Initial balance: ₹500.00");
        System.out.println("Debit amount:    ₹150.00");
        System.out.println("Final balance:   ₹" + wallet.getBalance());
        System.out.println("RESULT: PASS");
        System.out.println("==================================================");
    }

    // ------------------------------------------------------------------
    // Test 2
    // ------------------------------------------------------------------

    @Test
    @DisplayName("Sends 3 identical transactionIDs simultaneously. Ensures the balance is only deducted once.")
    void sendsThreeIdenticalTransactionIdsSimultaneously() throws InterruptedException {
        BigDecimal initialBalance = new BigDecimal("500.00");
        BigDecimal debitAmount = new BigDecimal("100.00");
        seedWallet(initialBalance);

        UUID sharedTransactionId = UUID.randomUUID();
        int concurrentRequests = 3;

        // All 3 requests carry the exact same transactionId AND the exact same payload
        // (userId, amount, type) - a genuine concurrent retry of one logical operation, not
        // a conflict. Per the idempotency contract (see TransactionProcessingService), the
        // single winner gets a fresh 201 and the other two get the *same* 201 result replayed
        // back (marked via the X-Idempotent-Replay header) - none of them are rejected, but
        // only one of them ever touches the wallet.
        List<ResponseEntity<String>> responses = fireConcurrently(
            concurrentRequests,
            () -> processTransactionRaw(debitRequest(sharedTransactionId, debitAmount))
        );

        long createdCount = responses.stream()
            .filter(r -> r.getStatusCode() == HttpStatus.CREATED)
            .count();
        long freshCount = responses.stream()
            .filter(r -> r.getStatusCode() == HttpStatus.CREATED && r.getHeaders().getFirst("X-Idempotent-Replay") == null)
            .count();
        long replayCount = responses.stream()
            .filter(r -> "true".equals(r.getHeaders().getFirst("X-Idempotent-Replay")))
            .count();

        Wallet wallet = walletRepository.findByUserId(userId).orElseThrow();
        List<Transaction> persistedRows = transactionRepository.findByUserIdOrderByCreatedAtDesc(userId);

        System.out.println("==================================================");
        System.out.println("TEST: Idempotency - duplicate transactionId (identical payload)");
        System.out.println("==================================================");
        System.out.println("Concurrent requests:        " + concurrentRequests);
        System.out.println("201 Created responses:      " + createdCount + " (all requests see the same result)");
        System.out.println("  - fresh (first to claim):   " + freshCount);
        System.out.println("  - replayed (X-Idempotent-Replay): " + replayCount);
        System.out.println("Initial balance:            ₹" + initialBalance);
        System.out.println("Final balance:                ₹" + wallet.getBalance());
        System.out.println("Persisted transaction rows for this id: " + persistedRows.size());
        System.out.println("RESULT: " + (freshCount == 1 && replayCount == 2 ? "PASS" : "FAIL"));
        System.out.println("==================================================");

        assertThat(createdCount).isEqualTo(3); // every caller sees a successful (replayed or fresh) result
        assertThat(freshCount).isEqualTo(1);
        assertThat(replayCount).isEqualTo(2);
        assertThat(wallet.getBalance()).isEqualByComparingTo("400.00"); // debited exactly once
        // Exactly one row was ever committed for this transactionId - the other two
        // attempts failed the UNIQUE constraint before anything was persisted, and were
        // resolved as replays rather than new inserts.
        assertThat(persistedRows).hasSize(1);
        assertThat(persistedRows.get(0).getStatus()).isEqualTo(TransactionStatus.SUCCESS);
    }

    // ------------------------------------------------------------------
    // Test 3
    // ------------------------------------------------------------------

    @Test
    @DisplayName("Sends 10 concurrent debit requests of ₹100 for a wallet with a ₹500 balance. Ensures the final balance is exactly ₹0 and 5 requests fail with insufficient funds.")
    void sendsTenConcurrentDebitRequestsAgainstFiveHundredBalance() throws InterruptedException {
        BigDecimal initialBalance = new BigDecimal("500.00");
        BigDecimal debitAmount = new BigDecimal("100.00");
        seedWallet(initialBalance);

        int concurrentRequests = 10;

        List<ResponseEntity<String>> responses = fireConcurrently(
            concurrentRequests,
            () -> processTransactionRaw(debitRequest(UUID.randomUUID(), debitAmount))
        );

        long successCount = responses.stream()
            .filter(r -> r.getStatusCode() == HttpStatus.CREATED)
            .count();
        long insufficientFundsCount = responses.stream()
            .filter(r -> r.getStatusCode() == HttpStatus.UNPROCESSABLE_ENTITY)
            .count();

        Wallet wallet = walletRepository.findByUserId(userId).orElseThrow();

        System.out.println("==================================================");
        System.out.println("TEST: Concurrent debits - no negative balance");
        System.out.println("==================================================");
        System.out.println("Concurrent requests:        " + concurrentRequests);
        System.out.println("Debit amount each:          ₹" + debitAmount);
        System.out.println("Initial balance:             ₹" + initialBalance);
        System.out.println("Successful transactions:     " + successCount);
        System.out.println("Insufficient-funds failures: " + insufficientFundsCount);
        System.out.println("Final balance:                ₹" + wallet.getBalance());
        System.out.println("RESULT: " + (successCount == 5 && insufficientFundsCount == 5
            && wallet.getBalance().compareTo(BigDecimal.ZERO) == 0 ? "PASS" : "FAIL"));
        System.out.println("==================================================");

        assertThat(successCount).isEqualTo(5);
        assertThat(insufficientFundsCount).isEqualTo(5);
        assertThat(wallet.getBalance()).isEqualByComparingTo(BigDecimal.ZERO); // never negative
    }

    // ------------------------------------------------------------------
    // Small focused extras beyond the three required tests
    // ------------------------------------------------------------------

    @Test
    @DisplayName("Rejects a transaction with a negative amount with 400 Bad Request.")
    void rejectsNegativeAmount() {
        seedWallet(new BigDecimal("500.00"));
        TransactionRequest request = new TransactionRequest(
            UUID.randomUUID(), userId, new BigDecimal("-50.00"), TransactionType.DEBIT);

        ResponseEntity<ErrorResponse> response = restTemplate.postForEntity(
            url("/api/v1/transactions/process"), request, ErrorResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        ErrorResponse body = Objects.requireNonNull(response.getBody());
        assertThat(body.error()).isEqualTo("VALIDATION_ERROR");
    }

    @Test
    @DisplayName("Returns 404 Not Found when the wallet does not exist.")
    void returnsNotFoundForUnknownWallet() {
        TransactionRequest request = debitRequest(UUID.randomUUID(), new BigDecimal("10.00"));
        // Note: userId here has no seeded wallet.

        ResponseEntity<ErrorResponse> response = restTemplate.postForEntity(
            url("/api/v1/transactions/process"), request, ErrorResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        ErrorResponse body = Objects.requireNonNull(response.getBody());
        assertThat(body.error()).isEqualTo("WALLET_NOT_FOUND");
    }

    @Test
    @DisplayName("Processes a single valid credit transaction successfully.")
    void processesSingleValidCreditTransactionSuccessfully() {
        seedWallet(new BigDecimal("500.00"));
        TransactionRequest request = new TransactionRequest(
            UUID.randomUUID(), userId, new BigDecimal("150.00"), TransactionType.CREDIT);

        ResponseEntity<TransactionResponse> response = processTransaction(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        TransactionResponse body = Objects.requireNonNull(response.getBody());
        assertThat(body.status()).isEqualTo(TransactionStatus.SUCCESS);
        assertThat(body.walletBalanceAfter()).isEqualByComparingTo("650.00");

        Wallet wallet = walletRepository.findByUserId(userId).orElseThrow();
        assertThat(wallet.getBalance()).isEqualByComparingTo("650.00");
    }

    @Test
    @DisplayName("Rejects an amount over the maximum allowed transaction amount with 400 Bad Request.")
    void rejectsAmountOverMaximum() {
        seedWallet(new BigDecimal("500.00"));
        TransactionRequest request = debitRequest(UUID.randomUUID(), new BigDecimal("10000000.01"));

        ResponseEntity<ErrorResponse> response = restTemplate.postForEntity(
            url("/api/v1/transactions/process"), request, ErrorResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        ErrorResponse body = Objects.requireNonNull(response.getBody());
        assertThat(body.error()).isEqualTo("VALIDATION_ERROR");
    }

    @Test
    @DisplayName("Insufficient-funds attempts are still recorded in the audit trail, and the wallet stays untouched.")
    void insufficientFundsAttemptIsRecordedButWalletUntouched() {
        seedWallet(new BigDecimal("50.00"));
        UUID transactionId = UUID.randomUUID();
        TransactionRequest request = debitRequest(transactionId, new BigDecimal("500.00"));

        ResponseEntity<TransactionResponse> response = processTransaction(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        TransactionResponse body = Objects.requireNonNull(response.getBody());
        assertThat(body.status()).isEqualTo(TransactionStatus.FAILED_INSUFFICIENT_FUNDS);

        Transaction persisted = transactionRepository.findByTransactionId(transactionId).orElseThrow();
        assertThat(persisted.getStatus()).isEqualTo(TransactionStatus.FAILED_INSUFFICIENT_FUNDS);
        assertThat(walletRepository.findByUserId(userId).orElseThrow().getBalance())
            .isEqualByComparingTo("50.00"); // untouched - rejection never reached the wallet
    }

    // ------------------------------------------------------------------
    // Idempotency semantics for a *reused* transactionId
    // ------------------------------------------------------------------

    @Test
    @DisplayName("Same transactionId + identical payload sent again -> replays the original result, no second financial effect.")
    void sameTransactionIdWithIdenticalPayloadReplaysOriginalResult() {
        seedWallet(new BigDecimal("500.00"));
        UUID transactionId = UUID.randomUUID();
        TransactionRequest request = debitRequest(transactionId, new BigDecimal("100.00"));

        ResponseEntity<TransactionResponse> first = processTransaction(request);
        assertThat(first.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(first.getHeaders().getFirst("X-Idempotent-Replay")).isNull();

        // Exact same transactionId, userId, amount, and type - a safe retry.
        ResponseEntity<TransactionResponse> second = processTransaction(request);

        assertThat(second.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(second.getHeaders().getFirst("X-Idempotent-Replay")).isEqualTo("true");
        TransactionResponse secondBody = Objects.requireNonNull(second.getBody());
        assertThat(secondBody.walletBalanceAfter()).isEqualByComparingTo("400.00");

        // Only one financial effect: the wallet was debited exactly once, and only one
        // transaction row exists for this transactionId.
        Wallet wallet = walletRepository.findByUserId(userId).orElseThrow();
        assertThat(wallet.getBalance()).isEqualByComparingTo("400.00");
        assertThat(transactionRepository.findByUserIdOrderByCreatedAtDesc(userId)).hasSize(1);
    }

    @Test
    @DisplayName("Same transactionId + a DIFFERENT amount -> 409 idempotency conflict, no financial effect from the second request.")
    void sameTransactionIdWithConflictingAmountIsRejected() {
        seedWallet(new BigDecimal("500.00"));
        UUID transactionId = UUID.randomUUID();
        ResponseEntity<TransactionResponse> first = processTransaction(debitRequest(transactionId, new BigDecimal("100.00")));
        assertThat(first.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        // Same transactionId, but a different amount - must NOT be silently processed.
        TransactionRequest conflicting = debitRequest(transactionId, new BigDecimal("500.00"));
        ResponseEntity<ErrorResponse> second = restTemplate.postForEntity(
            url("/api/v1/transactions/process"), conflicting, ErrorResponse.class);

        assertThat(second.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        ErrorResponse body = Objects.requireNonNull(second.getBody());
        assertThat(body.error()).isEqualTo("IDEMPOTENCY_KEY_CONFLICT");

        // The wallet only reflects the first (original) transaction's effect.
        Wallet wallet = walletRepository.findByUserId(userId).orElseThrow();
        assertThat(wallet.getBalance()).isEqualByComparingTo("400.00");
        assertThat(transactionRepository.findByUserIdOrderByCreatedAtDesc(userId)).hasSize(1);
    }

    @Test
    @DisplayName("Same transactionId + a DIFFERENT userId -> 409 idempotency conflict.")
    void sameTransactionIdWithConflictingUserIdIsRejected() {
        seedWallet(new BigDecimal("500.00"));
        UUID transactionId = UUID.randomUUID();
        processTransaction(debitRequest(transactionId, new BigDecimal("100.00")));

        UUID otherUserId = UUID.randomUUID();
        walletRepository.saveAndFlush(new Wallet(UUID.randomUUID(), otherUserId, new BigDecimal("500.00")));
        try {
            TransactionRequest conflicting = new TransactionRequest(
                transactionId, otherUserId, new BigDecimal("100.00"), TransactionType.DEBIT);
            ResponseEntity<ErrorResponse> response = restTemplate.postForEntity(
                url("/api/v1/transactions/process"), conflicting, ErrorResponse.class);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
            ErrorResponse body = Objects.requireNonNull(response.getBody());
            assertThat(body.error()).isEqualTo("IDEMPOTENCY_KEY_CONFLICT");
        } finally {
            walletRepository.findByUserId(otherUserId).ifPresent(walletRepository::delete);
        }
    }

    // ------------------------------------------------------------------
    // Wallet endpoints
    // ------------------------------------------------------------------

    @Test
    @DisplayName("Creates a wallet with the requested initial balance.")
    void createsWalletWithInitialBalance() {
        UUID newUserId = UUID.randomUUID();
        try {
            WalletCreateRequest request = new WalletCreateRequest(newUserId, new BigDecimal("1000.00"));

            ResponseEntity<WalletResponse> response = restTemplate.postForEntity(
                url("/api/v1/wallets"), request, WalletResponse.class);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
            WalletResponse body = Objects.requireNonNull(response.getBody());
            assertThat(body.userId()).isEqualTo(newUserId);
            assertThat(body.balance()).isEqualByComparingTo("1000.00");
        } finally {
            walletRepository.findByUserId(newUserId).ifPresent(walletRepository::delete);
        }
    }

    @Test
    @DisplayName("Rejects creating a second wallet for a userId that already has one.")
    void rejectsDuplicateWalletCreation() {
        seedWallet(new BigDecimal("500.00"));
        WalletCreateRequest request = new WalletCreateRequest(userId, new BigDecimal("1000.00"));

        ResponseEntity<ErrorResponse> response = restTemplate.postForEntity(
            url("/api/v1/wallets"), request, ErrorResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        ErrorResponse body = Objects.requireNonNull(response.getBody());
        assertThat(body.error()).isEqualTo("WALLET_ALREADY_EXISTS");
    }

    @Test
    @DisplayName("Looks up an existing wallet's balance.")
    void looksUpExistingWallet() {
        seedWallet(new BigDecimal("321.50"));

        ResponseEntity<WalletResponse> response = restTemplate.getForEntity(
            url("/api/v1/wallets/" + userId), WalletResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        WalletResponse body = Objects.requireNonNull(response.getBody());
        assertThat(body.balance()).isEqualByComparingTo("321.50");
    }

    @Test
    @DisplayName("Lists a user's transaction history, most recent first.")
    void listsTransactionHistory() {
        seedWallet(new BigDecimal("500.00"));
        processTransaction(debitRequest(UUID.randomUUID(), new BigDecimal("50.00")));
        processTransaction(debitRequest(UUID.randomUUID(), new BigDecimal("30.00")));

        ResponseEntity<TransactionResponse[]> response = restTemplate.getForEntity(
            url("/api/v1/transactions?userId=" + userId), TransactionResponse[].class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        TransactionResponse[] body = Objects.requireNonNull(response.getBody());
        assertThat(body).hasSize(2);
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private void seedWallet(BigDecimal balance) {
        walletRepository.saveAndFlush(new Wallet(UUID.randomUUID(), userId, balance));
    }

    private TransactionRequest debitRequest(UUID transactionId, BigDecimal amount) {
        return new TransactionRequest(transactionId, userId, amount, TransactionType.DEBIT);
    }

    private ResponseEntity<TransactionResponse> processTransaction(TransactionRequest request) {
        return restTemplate.postForEntity(url("/api/v1/transactions/process"), request, TransactionResponse.class);
    }

    /** String body so both TransactionResponse (2xx) and ErrorResponse (4xx) shapes deserialize without error. */
    private ResponseEntity<String> processTransactionRaw(TransactionRequest request) {
        return restTemplate.postForEntity(url("/api/v1/transactions/process"), request, String.class);
    }

    private String url(String path) {
        return "http://localhost:" + port + path;
    }

    /**
     * Fires {@code count} callables from separate threads, released simultaneously via a
     * {@link CountDownLatch} so they genuinely race each other at the HTTP layer - this is
     * real concurrency, not a sequential loop dressed up to look concurrent.
     */
    private <T> List<T> fireConcurrently(int count, Callable<T> action) throws InterruptedException {
        ExecutorService executor = Executors.newFixedThreadPool(count);
        CountDownLatch readyLatch = new CountDownLatch(count);
        CountDownLatch startLatch = new CountDownLatch(1);
        AtomicInteger errors = new AtomicInteger();

        try {
            List<Future<T>> futures = IntStream.range(0, count)
                .mapToObj(i -> executor.submit(() -> {
                    readyLatch.countDown();
                    startLatch.await();
                    return action.call();
                }))
                .collect(Collectors.toList());

            // Wait until every thread is spun up and waiting at the gate, then release them
            // all at once so the requests hit the server in the same narrow window.
            readyLatch.await(5, TimeUnit.SECONDS);
            startLatch.countDown();

            List<T> results = new java.util.ArrayList<>();
            for (Future<T> future : futures) {
                try {
                    results.add(future.get(10, TimeUnit.SECONDS));
                } catch (Exception e) {
                    errors.incrementAndGet();
                    throw new RuntimeException("Concurrent request failed", e);
                }
            }
            assertThat(errors.get()).as("unexpected thread failures").isZero();
            return results;
        } finally {
            executor.shutdown();
            executor.awaitTermination(10, TimeUnit.SECONDS);
        }
    }
}
