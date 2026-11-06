/**
 * Kings Taxi — OTP & Verification Module
 *
 * Responsibilities:
 * - Cryptographically secure OTP generation (crypto.randomInt)
 * - Salted Argon2id / HMAC-SHA256 hashing
 * - Attempt throttling (max 3 tries)
 * - Resend cooldown enforcement (60s)
 * - Expiration validation (5 min)
 * - Channel routing (Email, Telegram, SMS)
 */

export interface IOtpService {
  // Phase 2 implementation contract
}

