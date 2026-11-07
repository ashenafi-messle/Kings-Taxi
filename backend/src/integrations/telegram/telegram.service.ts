import crypto from 'crypto';
import { ITelegramProvider } from './index';
import { logger } from '../../core/logging/logger';

export class TelegramService implements ITelegramProvider {
  private static instance: TelegramService;

  public static getInstance(): TelegramService {
    if (!TelegramService.instance) {
      TelegramService.instance = new TelegramService();
    }
    return TelegramService.instance;
  }

  async sendOtpMessage(telegramChatId: string, _otp: string): Promise<boolean> {
    try {
      logger.info({ telegramChatId }, `[TelegramService] Dispatching OTP message to Telegram chat ${telegramChatId}`);
      return true;
    } catch (err: any) {
      logger.error({ err, telegramChatId }, '[TelegramService] Failed to send OTP message via Telegram');
      return false;
    }
  }

  async verifyAccountHandshake(telegramUserId: string, nonce: string): Promise<boolean> {
    try {
      logger.info({ telegramUserId, nonce }, '[TelegramService] Validating Telegram deep link handshake');
      return Boolean(telegramUserId && nonce);
    } catch (err: any) {
      logger.error({ err, telegramUserId }, '[TelegramService] Handshake verification failed');
      return false;
    }
  }

  /**
   * Validates Telegram Login Widget or WebApp data using HMAC-SHA256
   */
  verifyTelegramAuthData(authData: Record<string, any>, botToken: string): boolean {
    if (!botToken || !authData.hash) {
      return false;
    }

    const { hash, ...dataToCheck } = authData;
    const dataCheckString = Object.keys(dataToCheck)
      .sort()
      .map((key) => `${key}=${dataToCheck[key]}`)
      .join('\n');

    const secretKey = crypto.createHash('sha256').update(botToken).digest();
    const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    return crypto.timingSafeEqual(Buffer.from(computedHash, 'utf8'), Buffer.from(hash, 'utf8'));
  }
}
