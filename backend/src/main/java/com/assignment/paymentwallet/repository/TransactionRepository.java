package com.assignment.paymentwallet.repository;

import com.assignment.paymentwallet.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TransactionRepository extends JpaRepository<Transaction, UUID> {

    Optional<Transaction> findByTransactionId(UUID transactionId);

    List<Transaction> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
