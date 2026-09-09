# Backend - Idempotent Payment/Wallet Event Processor

Spring Boot 3.5.16 / Java 25 / H2. See the [root README](../README.md) for full
architecture, API, and design documentation - this file is just the quick-start.

## Run

```bash
./mvnw spring-boot:run          # macOS/Linux - no local Maven install needed
mvnw.cmd spring-boot:run        # Windows
```

Starts on `http://localhost:8080`. H2 console at `http://localhost:8080/h2-console`
(JDBC URL `jdbc:h2:mem:paymentwallet`, user `sa`, blank password). Swagger UI at
`http://localhost:8080/swagger-ui.html`.

Run with the leaner `prod` profile (H2 console disabled, no auto schema changes):

```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=prod
```

## Test

```bash
./mvnw test
```

Or run `src/test/java/com/assignment/paymentwallet/integration/TransactionProcessingIntegrationTest.java`
directly from your IDE. All 15 tests pass against a real, fully-started app + H2.

## Package structure

```
com.assignment.paymentwallet
├── controller   REST endpoints (+ OpenAPI annotations)
├── service      Business logic, @Transactional boundaries, locking
├── repository   Spring Data JPA repositories
├── entity       JPA entities
├── dto          Request/response records
├── exception    Custom exceptions + @RestControllerAdvice
└── config       CORS, JPA auditing, OpenAPI metadata
```
