/**
 * Kings Taxi — Telegram Bot Provider Interface
 *
 * Requirements:
 * - Direct passenger handshake with official bot (@KingstaxiBot)
 * - Cryptographic deep-link nonce verification
 * - Secure OTP transmission over Telegram Bot API
 * - Automatic chat_id resolution via deep linking and contact sharing
 */

export interface TelegramSendResult {
  success: boolean;
  messageId?: number;
  chatId?: string;
  reason?: 'CHAT_NOT_FOUND' | 'BOT_BLOCKED' | 'INVALID_TOKEN' | 'NETWORK_ERROR' | 'UNKNOWN';
  error?: string;
}

export interface ITelegramProvider {
  sendOtpMessage(
    telegramChatIdOrPhone: string,
    otp: string,
    options?: { sessionId?: string; purpose?: string; recipientName?: string }
  ): Promise<TelegramSendResult>;
  verifyAccountHandshake(telegramUserId: string, nonce: string): Promise<boolean>;
}
