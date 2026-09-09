package com.assignment.paymentwallet.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Allows the local Vite dev server to call this API during development. Origins are
 * restricted to localhost - no wildcard - since even a local-dev CORS config is a
 * habit worth keeping strict.
 *
 * <p>Vite's default port is 5173, but it silently falls back to 5174, 5175, etc. if
 * that port is already taken by another process - so a couple of fallback ports are
 * allowlisted too, rather than only the default.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    private static final String[] DEV_ORIGINS = {
        "http://localhost:5173", "http://127.0.0.1:5173",
        "http://localhost:5174", "http://127.0.0.1:5174",
        "http://localhost:5175", "http://127.0.0.1:5175",
    };

    @Override
    public void addCorsMappings(@NonNull CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins(DEV_ORIGINS)
            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
            .allowedHeaders("*")
            // Custom response headers are invisible to browser JS (fetch/XHR) unless
            // explicitly exposed - the Manual Test Lab reads this one to tell an
            // idempotent replay apart from a fresh success.
            .exposedHeaders("X-Idempotent-Replay");

        // The frontend's system-status section polls this for a real "is the backend up" signal.
        registry.addMapping("/actuator/health")
            .allowedOrigins(DEV_ORIGINS)
            .allowedMethods("GET");
    }
}
