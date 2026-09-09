package com.assignment.paymentwallet.dto;

import com.assignment.paymentwallet.entity.Wallet;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record WalletResponse(
    UUID userId,
    BigDecimal balance,
    Instant updatedAt
) {
    public static WalletResponse from(Wallet wallet) {
        return new WalletResponse(wallet.getUserId(), wallet.getBalance(), wallet.getUpdatedAt());
    }
}
