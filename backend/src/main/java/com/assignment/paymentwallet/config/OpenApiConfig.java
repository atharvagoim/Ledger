package com.assignment.paymentwallet.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * API documentation metadata for the generated OpenAPI spec / Swagger UI.
 * Visit {@code /swagger-ui.html} (or {@code /v3/api-docs} for the raw JSON) while the
 * app is running - every endpoint, request/response shape, and status code documented
 * here is generated directly from the controllers and DTOs, so it can't drift from
 * the real implementation.
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI paymentWalletProcessorOpenApi() {
        return new OpenAPI()
            .info(new Info()
                .title("Payment Wallet Processor API")
                .description("""
                    Idempotent wallet debit/credit processor. The same transactionId is applied \
                    at most once, even under concurrent retries, and a wallet's balance can never \
                    go negative. See the root README and DECISIONS.md for the full architecture \
                    and idempotency/concurrency strategy.""")
                .version("1.0.0")
                .contact(new Contact().name("Payment Wallet Processor")));
    }
}
