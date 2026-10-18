/**
 * Sanitizes a User database record before sending it in HTTP responses.
 * Guarantees passwordHash, session hashes, and internal secrets are never returned.
 */
export function sanitizeUser(user) {
  if (!user) return null;

  const {
    passwordHash,
    sessions,
    mfaSecret,
    mfaPendingSecret,
    mfaLastVerifiedStep,
    recoveryCodes,
    mfaChallenges,
    ...safeUser
  } = user;
  return safeUser;
}
