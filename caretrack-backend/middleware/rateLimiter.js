const rateLimit = require('express-rate-limit');

/**
 * authLimiter
 * Highly strict limiter for sensitive routes (Login, Password Reset).
 * Limits to 5 requests per 15 minutes per IP.
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per windowMs
    message: {
        success: false,
        message: 'Too many attempts from this IP, please try again after 15 minutes.'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/**
 * signupLimiter
 * Moderate limiter for account creation to prevent mass bot signups.
 * Limits to 3 requests per hour per IP.
 */
const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 requests per windowMs
    message: {
        success: false,
        message: 'Too many accounts created from this IP, please try again after an hour.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    authLimiter,
    signupLimiter
};
