package com.assignment.paymentwallet.service;

import com.assignment.paymentwallet.dto.WalletCreateRequest;
import com.assignment.paymentwallet.dto.WalletResponse;
import com.assignment.paymentwallet.entity.Wallet;
import com.assignment.paymentwallet.exception.WalletAlreadyExistsException;
import com.assignment.paymentwallet.exception.WalletNotFoundException;
import com.assignment.paymentwallet.repository.WalletRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Read-only wallet queries, plus the demo/setup wallet-creation endpoint. Deliberately
 * separate from {@link TransactionProcessingService} - nothing here locks a wallet row.
 */
@Service
public class WalletService {

    private final WalletRepository walletRepository;

    public WalletService(WalletRepository walletRepository) {
        this.walletRepository = walletRepository;
    }

    @Transactional(readOnly = true)
    public WalletResponse getWallet(UUID userId) {
        return walletRepository.findByUserId(userId)
            .map(WalletResponse::from)
            .orElseThrow(() -> new WalletNotFoundException(userId));
    }

    @Transactional
    public WalletResponse createWallet(WalletCreateRequest request) {
        Wallet wallet = new Wallet(UUID.randomUUID(), request.userId(), request.initialBalance());
        try {
            return WalletResponse.from(walletRepository.saveAndFlush(wallet));
        } catch (DataIntegrityViolationException ex) {
            throw new WalletAlreadyExistsException(request.userId());
        }
    }
}
