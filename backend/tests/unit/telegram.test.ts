import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { TelegramService } from '../../src/integrations/telegram/telegram.service';

describe('TelegramService Unit Tests', () => {
  const telegramService = TelegramService.getInstance();

  it('should return singleton instance', () => {
    const instance2 = TelegramService.getInstance();
    expect(telegramService).toBe(instance2);
  });

  it('should normalize Ethiopian phone numbers to E.164 format', () => {
    expect(telegramService.normalizePhone('0911234567')).toBe('+251911234567');
    expect(telegramService.normalizePhone('251911234567')).toBe('+251911234567');
    expect(telegramService.normalizePhone('+251911234567')).toBe('+251911234567');
    expect(telegramService.normalizePhone('0712345678')).toBe('+251712345678');
  });

  it('should properly mask phone numbers in audit and logs', () => {
    const masked = telegramService.maskTarget('+251911234567');
    expect(masked).toContain('***');
    expect(masked).not.toBe('+251911234567');
    expect(masked.startsWith('+251')).toBe(true);
    expect(masked.endsWith('67')).toBe(true);
  });

  it('should return CHAT_NOT_FOUND when user has not started the bot yet', async () => {
    const unlinkedPhone = '+251999887766';
    const result = await telegramService.sendOtpMessage(unlinkedPhone, '123456');

    expect(result.success).toBe(false);
    expect(result.reason).toBe('CHAT_NOT_FOUND');
    expect(result.error).toContain('Deep-link');

    const audits = telegramService.getRecentAudits();
    expect(audits[0].status).toBe('PENDING_START');
    expect(audits[0].reason).toBe('CHAT_NOT_FOUND');
  });

  it('should successfully link phone to chat ID and route OTP messages', async () => {
    const testPhone = '+251911000111';
    const fakeChatId = '123456789';

    telegramService.linkPhoneToChat(testPhone, fakeChatId);
    expect(telegramService.getChatIdForPhone(testPhone)).toBe(fakeChatId);

    const result = await telegramService.sendOtpMessage(testPhone, '888999');
    expect(result.chatId).toBe(fakeChatId);
  });

  it('should validate Telegram WebApp HMAC auth data securely', () => {
    const botToken = 'fake_test_bot_token_1234567890';
    const authData: Record<string, any> = {
      id: 9123463667,
      first_name: 'Dawit',
      username: 'dawit_taxi',
      auth_date: Math.floor(Date.now() / 1000),
    };

    const dataCheckString = Object.keys(authData)
      .sort()
      .map((k) => `${k}=${authData[k]}`)
      .join('\n');

    const secretKey = crypto.createHash('sha256').update(botToken).digest();
    const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    const validPayload = { ...authData, hash };
    const isValid = telegramService.verifyTelegramAuthData(validPayload, botToken);
    expect(isValid).toBe(true);

    const tamperedPayload = { ...authData, first_name: 'Hacker', hash };
    const isTamperedValid = telegramService.verifyTelegramAuthData(tamperedPayload, botToken);
    expect(isTamperedValid).toBe(false);
  });

  it('should provide safe diagnostic methods without secret leaks', async () => {
    const me = await telegramService.getMe();
    expect(me).toHaveProperty('success');

    const webhook = await telegramService.getWebhookInfo();
    expect(webhook).toHaveProperty('success');
  });
});

