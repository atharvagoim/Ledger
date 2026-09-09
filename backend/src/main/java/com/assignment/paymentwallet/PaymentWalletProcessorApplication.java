package com.assignment.paymentwallet;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Entry point for the Idempotent Payment/Wallet Event Processor.
 *
 * <p>Runs with an in-memory H2 database, so the application (and the test suite)
 * requires zero external setup: clone, run, done.
 */
@SpringBootApplication
public class PaymentWalletProcessorApplication {

    public static void main(String[] args) {
        SpringApplication.run(PaymentWalletProcessorApplication.class, args);
    }
}
