import rateLimit from "express-rate-limit";

// General API limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

// Strict limiter for login/register/OTP
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 10 requests per 15 min
  message: {
    success: false,
    message: "Too many attempts. Try again in 15 minutes.",
  },
});

// OTP specific
export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 min
  max: 3, // Only 3 OTP requests per 10 min
  message: {
    success: false,
    message: "Too many OTP requests. Wait 10 minutes.",
  },
});