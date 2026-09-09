package com.assignment.paymentwallet.repository;

import com.assignment.paymentwallet.entity.Wallet;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface WalletRepository extends JpaRepository<Wallet, UUID> {

    /**
     * Plain, non-locking lookup - safe to use for read-only endpoints
     * (e.g. GET /api/v1/wallets/{userId}) that don't mutate the balance.
     */
    Optional<Wallet> findByUserId(UUID userId);

    /**
     * Locking lookup used exclusively by the debit-processing path.
     *
     * <p>{@code PESSIMISTIC_WRITE} issues a {@code SELECT ... FOR UPDATE} under the hood.
     * Any other transaction trying to read this same wallet row with a write lock blocks
     * until the current transaction commits or rolls back. This is what prevents two
     * concurrent debits from both reading the same starting balance: the second request's
     * lock acquisition simply waits until the first request's debit has been committed,
     * so it always reads the *post-debit* balance.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select w from Wallet w where w.userId = :userId")
    Optional<Wallet> findByUserIdForUpdate(@Param("userId") UUID userId);
}
