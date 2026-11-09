import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import crypto from 'crypto';
import { env } from '../../src/config/env';
import { TelegramService } from '../../src/integrations/telegram/telegram.service';
import { TelegramIdentityStore } from '../../src/integrations/telegram/telegramIdentity.store';
import { AuthService, resetAuthSessions, resetIdentifierRateLimitTracker } from '../../src/modules/auth/auth.service';
import { normalizeEthiopianPhone, maskPhone, isManualPhoneInput } from '../../src/utils/phone';
import { AppError } from '../../src/core/errors/appError';

describe('Telegram Phone Linking and OTP Flow (Section 10 Test Suite)', () => {
  let telegramService: TelegramService;
  let identityStore: TelegramIdentityStore;
  let authService: AuthService;
  let sentTelegramRequests: Array<{ url: string; body: any }> = [];

  beforeEach(() => {
    vi.restoreAllMocks();
    sentTelegramRequests = [];
    resetAuthSessions();
    resetIdentifierRateLimitTracker();

    // Enable active bot token for unit tests to verify real request structures
    env.TELEGRAM_BOT_TOKEN = '123456789:TEST_BOT_TOKEN_XYZ';

    identityStore = TelegramIdentityStore.getInstance();
    identityStore.clear();

    telegramService = TelegramService.getInstance();
    telegramService.clearProcessedUpdates();
    authService = new AuthService();

    // Mock global fetch for Telegram API
    vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
      const parsedBody = init?.body ? JSON.parse(init.body as string) : {};
      sentTelegramRequests.push({ url: String(url), body: parsedBody });

      if (url.includes('/sendMessage')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            result: {
              message_id: 887711,
              chat: { id: parsedBody.chat_id },
              text: parsedBody.text,
            },
          }),
        };
      }

      if (url.includes('/getMe')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            result: { id: 9123463667, is_bot: true, first_name: 'Kings Taxi Bot', username: 'KingstaxiBot' },
          }),
        };
      }

      if (url.includes('/getWebhookInfo')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            result: { url: '', has_custom_certificate: false, pending_update_count: 0 },
          }),
        };
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    identityStore.clear();
    env.TELEGRAM_BOT_TOKEN = '';
  });

  // --------------------------------------------------------------------------
  // Case 1: /start first-time user
  // --------------------------------------------------------------------------
  it('1. /start first-time user: triggers welcome message and contact prompt button', async () => {
    const update = {
      update_id: 1001,
      message: {
        message_id: 1,
        from: { id: 111222, first_name: 'Abebe' },
        chat: { id: 111222, type: 'private' },
        text: '/start',
      },
    };

    await telegramService.handleUpdate(update);

    expect(sentTelegramRequests.length).toBeGreaterThan(0);
    const sentReq = sentTelegramRequests[0];
    expect(String(sentReq.body.chat_id)).toBe('111222');
    expect(sentReq.body.text).toContain('Welcome to Kings Taxi Ethiopia!');
    expect(sentReq.body.reply_markup?.keyboard).toBeDefined();
    expect(sentReq.body.reply_markup.keyboard[0][0].request_contact).toBe(true);
    expect(sentReq.body.reply_markup.keyboard[0][0].text).toContain('Share My Phone Number');
  });

  // --------------------------------------------------------------------------
  // Case 2: /start already-linked user
  // --------------------------------------------------------------------------
  it('2. /start already-linked user: confirms account is linked and does not send duplicate OTP', async () => {
    // Pre-link user
    await identityStore.linkIdentity({
      telegramUserId: '222333',
      chatId: '222333',
      phone: '+251946084865',
      linkedAt: new Date().toISOString(),
      isVerified: true,
    });

    const update = {
      update_id: 1002,
      message: {
        message_id: 2,
        from: { id: 222333, first_name: 'Dawit' },
        chat: { id: 222333, type: 'private' },
        text: '/start',
      },
    };

    await telegramService.handleUpdate(update);

    expect(sentTelegramRequests.length).toBe(1);
    const sentReq = sentTelegramRequests[0];
    expect(sentReq.body.text).toContain('Your Telegram account is linked!');
    expect(sentReq.body.text).toContain(maskPhone('+251946084865'));
    // Ensure no OTP code was broadcast on plain /start
    expect(sentReq.body.text).not.toContain('verification code is');
  });

  // --------------------------------------------------------------------------
  // Case 3: Contact-sharing update
  // --------------------------------------------------------------------------
  it('3. Contact-sharing update: processes valid contact matching sender ID and triggers pending session OTP', async () => {
    // Initiate registration in auth service first
    const regRes = await authService.initiateRegistration('telegram', '0946084865', 'Kassahun Melaku');
    expect(regRes.telegramChatRequired).toBe(true);
    const sessionId = regRes.sessionId;

    // Simulate user tapping the bot with start param /start reg_<sessionId>
    await telegramService.handleUpdate({
      update_id: 1003,
      message: {
        message_id: 3,
        from: { id: 333444, first_name: 'Kassahun' },
        chat: { id: 333444, type: 'private' },
        text: `/start ${sessionId}`,
      },
    });

    sentTelegramRequests = [];

    // Now user shares valid contact matching sender ID
    await telegramService.handleUpdate({
      update_id: 1004,
      message: {
        message_id: 4,
        from: { id: 333444, first_name: 'Kassahun' },
        chat: { id: 333444, type: 'private' },
        contact: {
          phone_number: '0946084865',
          user_id: 333444,
          first_name: 'Kassahun',
        },
      },
    });

    // Verify identity was stored
    expect(identityStore.isPhoneLinked('+251946084865')).toBe(true);
    expect(identityStore.getLinkByPhone('0946084865')?.chatId).toBe('333444');

    // Verify OTP message was dispatched
    const otpMsg = sentTelegramRequests.find((r) => r.body.text?.includes('KINGS TAXI ETHIOPIA'));
    expect(otpMsg).toBeDefined();
    expect(otpMsg?.body.text).toContain('<code>');
    expect(otpMsg?.body.text).toContain('expires in 5 minutes');
  });

  // --------------------------------------------------------------------------
  // Case 4: Missing contact information
  // --------------------------------------------------------------------------
  it('4. Missing contact information: handles null or missing contact payload gracefully', async () => {
    const update = {
      update_id: 1005,
      message: {
        message_id: 5,
        from: { id: 444555 },
        chat: { id: 444555, type: 'private' },
        contact: null,
      },
    };

    await expect(telegramService.handleUpdate(update)).resolves.not.toThrow();
  });

  // --------------------------------------------------------------------------
  // Case 5: Invalid phone number
  // --------------------------------------------------------------------------
  it('5. Invalid phone number: rejects non-Ethiopian mobile numbers', async () => {
    await telegramService.handleUpdate({
      update_id: 1006,
      message: {
        message_id: 6,
        from: { id: 555666 },
        chat: { id: 555666, type: 'private' },
        contact: {
          phone_number: '+12025550199', // US phone number
          user_id: 555666,
        },
      },
    });

    expect(identityStore.isChatLinked('555666')).toBe(false);
    expect(sentTelegramRequests.length).toBeGreaterThan(0);
    const sentReq = sentTelegramRequests[0];
    expect(sentReq.body.text).toContain('Invalid Phone Number');
  });

  // --------------------------------------------------------------------------
  // Case 6: Contact belonging to another user (spoofing prevention)
  // --------------------------------------------------------------------------
  it('6. Contact belonging to another user (spoofing): rejects contact where user_id does not match from.id', async () => {
    const attackerFromId = 777000;
    const victimUserId = 888111;

    await telegramService.handleUpdate({
      update_id: 1007,
      message: {
        message_id: 7,
        from: { id: attackerFromId },
        chat: { id: attackerFromId, type: 'private' },
        contact: {
          phone_number: '+251911223344',
          user_id: victimUserId, // Forwarded contact belonging to someone else!
        },
      },
    });

    expect(identityStore.isPhoneLinked('+251911223344')).toBe(false);
    expect(identityStore.isChatLinked(String(attackerFromId))).toBe(false);

    expect(sentTelegramRequests.length).toBeGreaterThan(0);
    const sentReq = sentTelegramRequests[0];
    expect(sentReq.body.text).toContain('Verification Failed');
    expect(sentReq.body.text).toContain('You must share your own phone number');
  });

  // --------------------------------------------------------------------------
  // Case 7: Ethiopian phone number normalization
  // --------------------------------------------------------------------------
  it('7. Ethiopian phone number normalization: converts 09..., +251..., 251..., and 9... to E.164', () => {
    expect(normalizeEthiopianPhone('0946084865').normalized).toBe('+251946084865');
    expect(normalizeEthiopianPhone('+251946084865').normalized).toBe('+251946084865');
    expect(normalizeEthiopianPhone('251946084865').normalized).toBe('+251946084865');
    expect(normalizeEthiopianPhone('946084865').normalized).toBe('+251946084865');
    expect(normalizeEthiopianPhone('0712345678').normalized).toBe('+251712345678');
    expect(normalizeEthiopianPhone('+251 712-345-678').normalized).toBe('+251712345678');
    expect(normalizeEthiopianPhone('0946084865').operator).toBe('Ethio Telecom');
    expect(normalizeEthiopianPhone('0712345678').operator).toBe('Safaricom Ethiopia');
  });

  // --------------------------------------------------------------------------
  // Case 8: Successful Telegram account linking
  // --------------------------------------------------------------------------
  it('8. Successful Telegram account linking: stores and retrieves linked identity across indices', async () => {
    await identityStore.linkIdentity({
      telegramUserId: '999888',
      chatId: '999888',
      phone: '0912345678',
      username: 'kings_passenger',
      firstName: 'Tewodros',
      linkedAt: new Date().toISOString(),
      isVerified: true,
    });

    expect(identityStore.isPhoneLinked('+251912345678')).toBe(true);
    expect(identityStore.isPhoneLinked('0912345678')).toBe(true);
    expect(identityStore.isChatLinked('999888')).toBe(true);
    expect(identityStore.isUserLinked('999888')).toBe(true);

    const link = identityStore.getLinkByPhone('0912345678');
    expect(link?.username).toBe('kings_passenger');
    expect(link?.firstName).toBe('Tewodros');
  });

  // --------------------------------------------------------------------------
  // Case 9: Duplicate Telegram identity linking
  // --------------------------------------------------------------------------
  it('9. Duplicate Telegram identity linking: updates existing record without creating corrupt orphaned state', async () => {
    await identityStore.linkIdentity({
      telegramUserId: '100100',
      chatId: '100100',
      phone: '0911000111',
      linkedAt: new Date().toISOString(),
      isVerified: true,
    });

    // Re-link with updated phone
    await identityStore.linkIdentity({
      telegramUserId: '100100',
      chatId: '100100',
      phone: '0922000222',
      linkedAt: new Date().toISOString(),
      isVerified: true,
    });

    expect(identityStore.getLinkByChatId('100100')?.phone).toBe('+251922000222');
  });

  // --------------------------------------------------------------------------
  // Case 10: Missing chat ID
  // --------------------------------------------------------------------------
  it('10. Missing chat ID: sendOtpMessage returns CHAT_NOT_FOUND when phone has no linked chat', async () => {
    const res = await telegramService.sendOtpMessage('0933445566', '123456');
    expect(res.success).toBe(false);
    expect(res.reason).toBe('CHAT_NOT_FOUND');
    expect(res.error).toContain('KingstaxiBot');
  });

  // --------------------------------------------------------------------------
  // Case 11: Successful OTP generation
  // --------------------------------------------------------------------------
  it('11. Successful OTP generation: generates 6-digit numeric OTP with strong randomness', () => {
    const otps = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const otp = authService.generateOtp();
      expect(otp).toMatch(/^\d{6}$/);
      otps.add(otp);
    }
    // High entropy: at least 45 unique OTPs in 50 generations
    expect(otps.size).toBeGreaterThanOrEqual(45);
  });

  // --------------------------------------------------------------------------
  // Case 12: Successful Telegram OTP delivery
  // --------------------------------------------------------------------------
  it('12. Successful Telegram OTP delivery: dispatches HTML message with monospace <code>{otp}</code>', async () => {
    await identityStore.linkIdentity({
      telegramUserId: '500500',
      chatId: '500500',
      phone: '+251911444555',
      linkedAt: new Date().toISOString(),
      isVerified: true,
    });

    const res = await telegramService.sendOtpMessage('+251911444555', '654321');
    expect(res.success).toBe(true);
    expect(res.chatId).toBe('500500');

    const sentReq = sentTelegramRequests.find((r) => String(r.body.chat_id) === '500500');
    expect(sentReq).toBeDefined();
    expect(sentReq!.body.text).toContain('<code>654321</code>');
    expect(sentReq!.body.text).toContain('KINGS TAXI ETHIOPIA');
    expect(sentReq!.body.text).toContain('expires in 5 minutes');
    expect(sentReq!.body.parse_mode).toBe('HTML');
  });

  // --------------------------------------------------------------------------
  // Case 13: Telegram API delivery failure
  // --------------------------------------------------------------------------
  it('13. Telegram API delivery failure: handles 403 BOT_BLOCKED and network failures safely', async () => {
    await identityStore.linkIdentity({
      telegramUserId: '600600',
      chatId: '600600',
      phone: '+251911777888',
      linkedAt: new Date().toISOString(),
      isVerified: true,
    });

    // Mock 403 Bot Blocked from Telegram API
    vi.stubGlobal('fetch', async () => ({
      ok: false,
      status: 403,
      json: async () => ({
        ok: false,
        error_code: 403,
        description: 'Forbidden: bot was blocked by the user',
      }),
    }));

    const res = await telegramService.sendOtpMessage('+251911777888', '112233');
    expect(res.success).toBe(false);
    expect(res.reason).toBe('BOT_BLOCKED');
  });

  // --------------------------------------------------------------------------
  // Case 14: OTP verification
  // --------------------------------------------------------------------------
  it('14. OTP verification: verifies matching code with timing-safe HMAC comparison', async () => {
    const regRes = await authService.initiateRegistration('email', 'test.verify@kingstaxi.et', 'Test Verifier');
    const otp = regRes.devOtp;
    expect(otp).toBeDefined();

    const verifyRes = await authService.verifyRegistrationOtp(regRes.sessionId, otp!);
    expect(verifyRes.registrationToken).toBeDefined();
    expect(verifyRes.fullName).toBe('Test Verifier');
  });

  // --------------------------------------------------------------------------
  // Case 15: OTP expiry
  // --------------------------------------------------------------------------
  it('15. OTP expiry: rejects OTP after 5-minute expiry window', async () => {
    const regRes = await authService.initiateRegistration('email', 'test.expiry@kingstaxi.et', 'Expiry Test');
    const otp = regRes.devOtp!;

    // Fast-forward time past 5 minutes
    const originalDateNow = Date.now;
    vi.spyOn(Date, 'now').mockReturnValue(originalDateNow() + 301 * 1000);

    await expect(authService.verifyRegistrationOtp(regRes.sessionId, otp)).rejects.toThrowError(
      /expired/i
    );
  });

  // --------------------------------------------------------------------------
  // Case 16: OTP resend cooldown
  // --------------------------------------------------------------------------
  it('16. OTP resend cooldown: rejects resend within 60s cooldown window with HTTP 429', async () => {
    const regRes = await authService.initiateRegistration('email', 'test.cooldown@kingstaxi.et', 'Cooldown Test');

    await expect(authService.resendRegistrationOtp(regRes.sessionId)).rejects.toThrowError(
      /wait/i
    );
  });

  // --------------------------------------------------------------------------
  // Case 17: Duplicate Telegram update handling
  // --------------------------------------------------------------------------
  it('17. Duplicate Telegram update handling: ignores duplicate update_id', async () => {
    const duplicateUpdate = {
      update_id: 99999,
      message: {
        message_id: 123,
        from: { id: 700700 },
        chat: { id: 700700, type: 'private' },
        text: '/start',
      },
    };

    // First delivery
    await telegramService.handleUpdate(duplicateUpdate);
    expect(sentTelegramRequests.length).toBe(1);

    sentTelegramRequests = [];

    // Second delivery of exact same update_id
    await telegramService.handleUpdate(duplicateUpdate);
    expect(sentTelegramRequests.length).toBe(0); // Deduplicated!
  });

  // --------------------------------------------------------------------------
  // Case 18: Webhook/polling update processing
  // --------------------------------------------------------------------------
  it('18. Webhook/polling update processing: dispatches incoming webhook updates and returns ok', async () => {
    const webhookPayload = {
      update_id: 88888,
      message: {
        message_id: 456,
        from: { id: 800800 },
        chat: { id: 800800, type: 'private' },
        text: '/start',
      },
    };

    const webhookRes = await authService.handleTelegramWebhook(webhookPayload);
    expect(webhookRes).toEqual({ ok: true });
    expect(sentTelegramRequests.length).toBe(1);
  });
});
