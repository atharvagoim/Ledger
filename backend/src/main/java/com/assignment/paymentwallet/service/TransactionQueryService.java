package com.assignment.paymentwallet.service;

import com.assignment.paymentwallet.dto.TransactionResponse;
import com.assignment.paymentwallet.repository.TransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Read-only transaction history for the dashboard's transaction list.
 * Kept separate from {@link TransactionProcessingService} for the same reason as
 * {@link WalletService}: queries never lock rows or mutate state.
 */
@Service
public class TransactionQueryService {

    private final TransactionRepository transactionRepository;

    public TransactionQueryService(TransactionRepository transactionRepository) {
        this.transactionRepository = transactionRepository;
    }

    @Transactional(readOnly = true)
    public List<TransactionResponse> getTransactionsForUser(UUID userId) {
        return transactionRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
            .map(transaction -> TransactionResponse.from(transaction, null))
            .toList();
    }
}
