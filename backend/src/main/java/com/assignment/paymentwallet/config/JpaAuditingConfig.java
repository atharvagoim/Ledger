package com.assignment.paymentwallet.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * Enables {@code @CreatedDate} / {@code @LastModifiedDate} auto-population
 * on {@code Wallet} and {@code Transaction}.
 */
@Configuration
@EnableJpaAuditing
public class JpaAuditingConfig {
}
