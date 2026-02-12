import rateLimit from "express-rate-limit";

// Global Rate Limiter: 300 requests per 15 minutes
// Good baseline for general API usage
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Zu viele Anfragen, bitte versuchen Sie es später erneut." }
});

// Strict Rate Limiter: 10 requests per 5 minutes
// For sensitive endpoints like auth, webhooks, or expensive proxies
export const strictLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Zu viele Versuche, bitte warten Sie einen Moment." }
});

// Auth Rate Limiter: 20 requests per 15 minutes
// Specifically for login/signup related attempts if not handled by Clerk directly
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
});
