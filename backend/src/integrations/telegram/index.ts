/**
 * Kings Taxi — Telegram Bot Provider Interface
 *
 * Requirements:
 * - Direct passenger handshake with official bot (@KingsTaxiAuthBot)
 * - Cryptographic deep-link nonce verification
 * - Secure OTP transmission over Telegram Bot API
 */

export interface ITelegramProvider {
  sendOtpMessage(telegramChatId: string, otp: string): Promise<boolean>;
  verifyAccountHandshake(telegramUserId: string, nonce: string): Promise<boolean>;
}

