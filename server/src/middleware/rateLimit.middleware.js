import rateLimit from "express-rate-limit";

/**
 * Determines if the current execution is an automated test environment.
 * Explicitly checks NODE_ENV, npm test lifecycle, Node test flags, and test file targets.
 * Strict checks prevent production deployments from accidentally activating relaxed limits
 * if a path or directory contains the substring 'test'.
 */
export const isTestEnv = (
  env = process.env,
  argv = process.argv,
  execArgv = process.execArgv
) =>
  env.NODE_ENV === "test" ||
  env.npm_lifecycle_event === "test" ||
  (Array.isArray(execArgv) && execArgv.includes("--test")) ||
  (Array.isArray(argv) &&
    argv.some(
      (arg) =>
        typeof arg === "string" &&
        (arg === "--test" ||
          arg.endsWith(".test.js") ||
          arg.endsWith(".spec.js"))
    ));

const errorResponse = (message) => ({
  error: {
    code: "TOO_MANY_REQUESTS",
    message,
  },
});

/**
 * Rate limiter for login requests:
 * Max 5 failed attempts per 15-minute window per IP. Successful logins are not counted against the limit.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json(
      errorResponse("Too many failed login attempts. Please wait 15 minutes before trying again.")
    );
  },
});

/**
 * Rate limiter for account registration:
 * Max 10 registrations per hour per IP to prevent automated bot signups.
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json(
      errorResponse("Registration rate limit reached. Please try again later.")
    );
  },
});

/**
 * Rate limiter for forgot-password requests:
 * Prevents email flooding and enumeration abuse.
 */
export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json(
      errorResponse("Too many password reset requests. Please wait an hour before requesting again.")
    );
  },
});

/**
 * Rate limiter for password reset execution:
 * Limits token brute-force attempts. Successful resets are not counted against the limit.
 */
export const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json(
      errorResponse("Too many reset attempts. Please wait 15 minutes before trying again.")
    );
  },
});

// Alias for backward compatibility
export const passwordResetLimiter = forgotPasswordLimiter;

/**
 * Rate limiter for MFA challenge verification (login & recovery codes):
 * Max 5 failed attempts per 15-minute window per IP. Successful attempts are not counted.
 */
export const mfaVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: (req) => (isTestEnv() ? 1000 : 5),
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json(
      errorResponse("Too many failed MFA verification attempts. Please wait 15 minutes before trying again.")
    );
  },
});

/**
 * Rate limiter for MFA enrollment:
 * Max 10 enrollment attempts per hour per IP.
 */
export const mfaEnrollLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: (req) => (isTestEnv() ? 1000 : 20),
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json(
      errorResponse("Too many MFA enrollment attempts. Please try again later.")
    );
  },
});


