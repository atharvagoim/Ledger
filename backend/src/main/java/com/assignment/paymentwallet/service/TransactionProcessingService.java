package com.assignment.paymentwallet.service;

import com.assignment.paymentwallet.dto.TransactionRequest;
import com.assignment.paymentwallet.dto.TransactionResponse;
import com.assignment.paymentwallet.entity.Transaction;
import com.assignment.paymentwallet.entity.TransactionStatus;
import com.assignment.paymentwallet.entity.TransactionType;
import com.assignment.paymentwallet.entity.Wallet;
import com.assignment.paymentwallet.exception.DuplicateTransactionException;
import com.assignment.paymentwallet.exception.IdempotencyConflictException;
import com.assignment.paymentwallet.exception.WalletNotFoundException;
import com.assignment.paymentwallet.repository.TransactionRepository;
import com.assignment.paymentwallet.repository.WalletRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Owns the single atomic operation this whole assignment is about: turning one
 * client-submitted {@link TransactionRequest} into exactly one wallet effect, even
 * when the same request arrives multiple times concurrently, and even when many
 * different requests race to debit the same wallet at once.
 *
 * <p><b>What happens inside {@link #process}, in order, and why:</b>
 * <ol>
 *   <li><b>Claim the transactionId first</b> ({@link #claimTransactionId}), before touching
 *       the wallet at all. This is an INSERT that is flushed immediately, so the database's
 *       UNIQUE constraint on {@code transaction_id} is checked synchronously, right here -
 *       not deferred to end-of-transaction commit. If two (or three, or ten) requests carrying
 *       the same transactionId race each other, the database itself guarantees only one INSERT
 *       can ever succeed; every other one throws {@link DataIntegrityViolationException}
 *       immediately, which we translate into a 409-mapped {@link DuplicateTransactionException}.
 *       Only the single winner proceeds past this point.
 *       <p>This has to happen <i>before</i> the wallet lock, not after - locking the wallet
 *       first would only stop two duplicate requests from reading the balance at the exact
 *       same instant, it would NOT stop a duplicate from deducting a second time after the
 *       first duplicate's debit had already committed and released the lock. Claiming the id
 *       first is what makes duplicates fail before they ever reach the balance.</li>
 *   <li><b>Lock the wallet row</b> via {@link WalletRepository#findByUserIdForUpdate}, which
 *       issues {@code SELECT ... FOR UPDATE}. Any other request debiting the *same* wallet
 *       now blocks until this transaction commits or rolls back - so the balance this method
 *       reads next is guaranteed to be the true, latest committed balance, never a stale read
 *       that another concurrent request is simultaneously about to invalidate.</li>
 *   <li><b>Check sufficient funds while still holding the lock.</b> If insufficient, the
 *       already-inserted transaction row is updated to {@code FAILED_INSUFFICIENT_FUNDS} and
 *       the method returns normally - the attempt is recorded (audit trail), the wallet is
 *       untouched, and the lock is released on commit.</li>
 *   <li><b>Debit and save the wallet, mark the transaction {@code SUCCESS}, commit.</b>
 *       Both writes happen in the same database transaction, so they are atomic together -
 *       there is no window where the transaction is marked SUCCESS but the wallet wasn't
 *       actually debited, or vice versa.</li>
 * </ol>
 *
 * <p><b>What happens if an unexpected database error occurs</b> at any point: it propagates
 * as a RuntimeException, {@code @Transactional} rolls back everything written so far
 * (including the claimed transactionId row), and {@code GlobalExceptionHandler} converts it
 * to a generic 500 without leaking internals. Because the rollback removes the claimed row
 * too, the client can safely retry the same transactionId later.
 *
 * <p><b>Idempotency semantics for a reused transactionId</b> (see {@link #resolveDuplicate}):
 * a transactionId is meant to represent exactly one financial operation, so what happens
 * when it's reused depends on whether the new request describes that <i>same</i> operation:
 * <ul>
 *   <li><b>Same userId + amount + type</b> - a safe retry (e.g. the caller's original
 *       response was lost to a network error). {@link #resolveDuplicate} returns the
 *       <i>original</i> transaction's result again, without touching the wallet a second
 *       time - no additional financial effect occurs.</li>
 *   <li><b>Different userId, amount, and/or type</b> - a genuine conflict: the caller is
 *       asking one transactionId to mean two different operations. {@link #resolveDuplicate}
 *       throws {@link IdempotencyConflictException}, mapped to 409 with a message that
 *       explains exactly why.</li>
 * </ul>
 * {@link #resolveDuplicate} runs in its own fresh, separate transaction and is only ever
 * invoked (by {@code TransactionController}) after {@link #process}'s transaction has
 * already fully rolled back - never from inside {@link #process} itself. Querying the
 * database again from a brand-new transaction, rather than reusing the one that just failed
 * a flush, avoids relying on the Hibernate session's undefined state immediately after a
 * constraint-violation exception.
 */
@Service
public class TransactionProcessingService {

    private static final Logger log = LoggerFactory.getLogger(TransactionProcessingService.class);

    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;

    public TransactionProcessingService(WalletRepository walletRepository,
                                         TransactionRepository transactionRepository) {
        this.walletRepository = walletRepository;
        this.transactionRepository = transactionRepository;
    }

    @Transactional
    public TransactionResponse process(TransactionRequest request) {
        Transaction transaction = claimTransactionId(request);

        Wallet wallet = walletRepository.findByUserIdForUpdate(request.userId())
            .orElseThrow(() -> new WalletNotFoundException(request.userId()));

        if (request.type() == TransactionType.DEBIT) {
            if (wallet.getBalance().compareTo(request.amount()) < 0) {
                transaction.setStatus(TransactionStatus.FAILED_INSUFFICIENT_FUNDS);
                log.info("Transaction {} rejected: insufficient funds for user {}",
                    request.transactionId(), request.userId());
                return TransactionResponse.from(transaction, wallet.getBalance());
            }
            wallet.setBalance(wallet.getBalance().subtract(request.amount()));
        } else {
            wallet.setBalance(wallet.getBalance().add(request.amount()));
        }

        walletRepository.save(wallet);
        transaction.setStatus(TransactionStatus.SUCCESS);

        log.info("Transaction {} processed successfully for user {}: new balance {}",
            request.transactionId(), request.userId(), wallet.getBalance());

        return TransactionResponse.from(transaction, wallet.getBalance());
    }

    /**
     * Called by {@code TransactionController} only after {@link #process} has thrown
     * {@link DuplicateTransactionException} and its transaction has fully rolled back.
     * Decides whether the reused transactionId is a safe retry (same payload - returns
     * the original result) or a genuine conflict (different payload - throws).
     */
    @Transactional(readOnly = true)
    public TransactionResponse resolveDuplicate(TransactionRequest request) {
        Transaction existing = transactionRepository.findByTransactionId(request.transactionId())
            // Practically unreachable: we only get here after the DB just told us this
            // transactionId exists. Kept as a safe fallback rather than an assertion.
            .orElseThrow(() -> new DuplicateTransactionException(request.transactionId()));

        if (!isSameRequest(existing, request)) {
            throw new IdempotencyConflictException(request.transactionId());
        }

        BigDecimal currentBalance = walletRepository.findByUserId(existing.getUserId())
            .map(Wallet::getBalance)
            .orElse(null);
        return TransactionResponse.from(existing, currentBalance);
    }

    /** True if {@code request} describes the exact same operation as the already-claimed {@code existing} row. */
    private boolean isSameRequest(Transaction existing, TransactionRequest request) {
        return existing.getUserId().equals(request.userId())
            && existing.getAmount().compareTo(request.amount()) == 0
            && existing.getType() == request.type();
    }

    private Transaction claimTransactionId(TransactionRequest request) {
        Transaction transaction = new Transaction(
            UUID.randomUUID(),
            request.transactionId(),
            request.userId(),
            request.amount(),
            request.type(),
            TransactionStatus.SUCCESS // provisional; corrected below before the caller returns
        );
        try {
            // saveAndFlush (not save) forces the INSERT - and therefore the UNIQUE constraint
            // check - to happen right now, synchronously, instead of being deferred until this
            // whole @Transactional method commits. That immediacy is what lets us detect a
            // duplicate mid-request instead of only at the very end.
            return transactionRepository.saveAndFlush(transaction);
        } catch (DataIntegrityViolationException ex) {
            throw new DuplicateTransactionException(request.transactionId());
        }
    }
}
