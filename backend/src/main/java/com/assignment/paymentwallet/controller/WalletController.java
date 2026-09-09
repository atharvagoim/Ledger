package com.assignment.paymentwallet.controller;

import com.assignment.paymentwallet.dto.WalletCreateRequest;
import com.assignment.paymentwallet.dto.WalletResponse;
import com.assignment.paymentwallet.service.WalletService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/wallets")
@Tag(name = "Wallets", description = "Wallet lookup and demo wallet creation")
public class WalletController {

    private final WalletService walletService;

    public WalletController(WalletService walletService) {
        this.walletService = walletService;
    }

    @Operation(summary = "Fetch a wallet's current balance")
    @GetMapping("/{userId}")
    public ResponseEntity<WalletResponse> getWallet(@PathVariable UUID userId) {
        return ResponseEntity.ok(walletService.getWallet(userId));
    }

    /**
     * Demo/setup convenience endpoint so the dashboard (or a reviewer) can create a
     * funded wallet without touching H2 directly. Not part of the core assignment
     * requirements, but necessary for the frontend to be usable end-to-end.
     */
    @Operation(summary = "Create a funded demo wallet",
        description = "Setup/demo convenience, not a core assignment requirement - one wallet per userId.")
    @PostMapping
    public ResponseEntity<WalletResponse> createWallet(@Valid @RequestBody WalletCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(walletService.createWallet(request));
    }
}
