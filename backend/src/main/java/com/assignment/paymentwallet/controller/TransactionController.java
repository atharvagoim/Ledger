package com.assignment.paymentwallet.controller;

import com.assignment.paymentwallet.dto.ErrorResponse;
import com.assignment.paymentwallet.dto.TransactionRequest;
import com.assignment.paymentwallet.dto.TransactionResponse;
import com.assignment.paymentwallet.entity.TransactionStatus;
import com.assignment.paymentwallet.exception.DuplicateTransactionException;
import com.assignment.paymentwallet.service.TransactionProcessingService;
import com.assignment.paymentwallet.service.TransactionQueryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/transactions")
@Tag(name = "Transactions", description = "Idempotent, concurrency-safe wallet debit/credit processing")
public class TransactionController {

    private final TransactionProcessingService transactionProcessingService;
    private final TransactionQueryService transactionQueryService;

    public TransactionController(TransactionProcessingService transactionProcessingService,
                                  TransactionQueryService transactionQueryService) {
        this.transactionProcessingService = transactionProcessingService;
        this.transactionQueryService = transactionQueryService;
    }

    /**
     * The core required endpoint. Returns:
     * <ul>
     *   <li>201 Created - transaction processed, wallet debited/credited</li>
     *   <li>201/422 with header {@code X-Idempotent-Replay: true} - the transactionId was
     *       already used for this exact same operation; the original result is returned
     *       again and no new financial effect occurs (see
     *       {@link TransactionProcessingService#resolveDuplicate})</li>
     *   <li>422 Unprocessable Entity - valid request, but insufficient funds</li>
     *   <li>409 Conflict (via GlobalExceptionHandler) - transactionId reused with a
     *       <b>different</b> userId/amount/type ({@code IDEMPOTENCY_KEY_CONFLICT})</li>
     *   <li>404 Not Found (via GlobalExceptionHandler) - unknown userId</li>
     *   <li>400 Bad Request (via GlobalExceptionHandler) - validation/malformed body</li>
     * </ul>
     */
    @Operation(
        summary = "Process a debit/credit transaction",
        description = "Idempotent: the same transactionId is applied at most once, even under "
            + "concurrent retries. Reusing a transactionId with an identical payload replays the "
            + "original result (X-Idempotent-Replay: true); reusing it with a different payload "
            + "is rejected as a conflict."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Processed (fresh or idempotent replay)",
            content = @Content(schema = @Schema(implementation = TransactionResponse.class))),
        @ApiResponse(responseCode = "422", description = "Insufficient funds - request was valid but not applied",
            content = @Content(schema = @Schema(implementation = TransactionResponse.class))),
        @ApiResponse(responseCode = "409", description = "Duplicate/conflicting transactionId",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(responseCode = "404", description = "Unknown userId",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(responseCode = "400", description = "Validation error / malformed body",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
    })
    @PostMapping("/process")
    public ResponseEntity<TransactionResponse> process(@Valid @RequestBody TransactionRequest request) {
        TransactionResponse response;
        boolean replay = false;
        try {
            response = transactionProcessingService.process(request);
        } catch (DuplicateTransactionException ex) {
            // The claim attempt lost the race (or this transactionId was already used).
            // process()'s transaction has fully rolled back by now, so resolveDuplicate runs
            // in a fresh transaction: same payload -> replay the original result; different
            // payload -> throws IdempotencyConflictException, handled as 409 below.
            response = transactionProcessingService.resolveDuplicate(request);
            replay = true;
        }
        HttpStatus status = response.status() == TransactionStatus.SUCCESS
            ? HttpStatus.CREATED
            : HttpStatus.UNPROCESSABLE_ENTITY;
        ResponseEntity.BodyBuilder builder = ResponseEntity.status(status);
        if (replay) {
            builder = builder.header("X-Idempotent-Replay", "true");
        }
        return builder.body(response);
    }

    @Operation(summary = "List a user's transaction history", description = "Most recent first. Includes failed (insufficient-funds) attempts as part of the audit trail.")
    @GetMapping
    public ResponseEntity<List<TransactionResponse>> getTransactions(@RequestParam UUID userId) {
        return ResponseEntity.ok(transactionQueryService.getTransactionsForUser(userId));
    }
}
