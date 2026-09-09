package com.assignment.paymentwallet.exception;

import java.util.UUID;

public class WalletAlreadyExistsException extends RuntimeException {

    public WalletAlreadyExistsException(UUID userId) {
        super("A wallet already exists for userId " + userId);
    }
}
