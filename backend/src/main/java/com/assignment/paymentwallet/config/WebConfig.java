package com.assignment.paymentwallet.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Allows the frontend to call this API cross-origin. Origins are an explicit
 * allowlist - no wildcard - since even a demo's CORS config is a habit worth
 * keeping strict.
 *
 * <p>The allowlist is configurable via {@code app.cors.allowed-origins} (a
 * comma-separated list), defaulting to the local Vite dev server's default port and
 * its usual fallbacks (5173-5175, since Vite silently increments the port if one is
 * already taken). When deployed, set the {@code APP_CORS_ALLOWED_ORIGINS} environment
 * variable to the real frontend URL(s) - see the root README's deployment section.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final String[] allowedOrigins;

    public WebConfig(
        @Value("${app.cors.allowed-origins:"
            + "http://localhost:5173,http://127.0.0.1:5173,"
            + "http://localhost:5174,http://127.0.0.1:5174,"
            + "http://localhost:5175,http://127.0.0.1:5175}") String allowedOrigins) {
        this.allowedOrigins = allowedOrigins.split("\\s*,\\s*");
    }

    @Override
    public void addCorsMappings(@NonNull CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins(allowedOrigins)
            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
            .allowedHeaders("*")
            // Custom response headers are invisible to browser JS (fetch/XHR) unless
            // explicitly exposed - the Manual Test Lab reads this one to tell an
            // idempotent replay apart from a fresh success.
            .exposedHeaders("X-Idempotent-Replay");

        // The frontend's system-status section polls this for a real "is the backend up" signal.
        registry.addMapping("/actuator/health")
            .allowedOrigins(allowedOrigins)
            .allowedMethods("GET");
    }
}
