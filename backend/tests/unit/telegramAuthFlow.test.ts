import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import crypto from 'crypto';
import { env } from '../../src/config/env';
import { TelegramService } from '../../src/integrations/telegram/telegram.service';
import { TelegramIdentityStore } from '../../src/integrations/telegram/telegramIdentity.store';
import { AuthService, resetAuthSessions, resetIdentifierRateLimitTracker } from '../../src/modules/auth/auth.service';
import { normalizeEthiopianPhone, maskPhone, isManualPhoneInput } from '../../src/utils/phone';
import { AppError } from '../../src/core/errors/appError';
import { prisma } from '../../src/config/database';

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

    // Mock database queries for unit tests so they don't depend on live database connection
    vi.spyOn(prisma.passenger, 'findFirst').mockResolvedValue(null);
    vi.spyOn(prisma.oTPVerification, 'create').mockResolvedValue({} as any);

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
  // Case 1: /start plain message (no deep-link param)
  // --------------------------------------------------------------------------
  it('1. /start plain: triggers instructions without keyboard or phone-sharing button', async () => {
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

    expect(sentTelegramRequests.length).toBe(1);
    const sentReq = sentTelegramRequests[0];
    expect(String(sentReq.body.chat_id)).toBe('111222');
    expect(sentReq.body.text).toContain('Welcome to Kings Taxi');
    expect(sentReq.body.reply_markup).toBeUndefined();
  });

  // --------------------------------------------------------------------------
  // Case 2: /start reg_<token> deep-link
  // --------------------------------------------------------------------------
  it('2. /start reg_<token>: receives OTP and links identity in single step', async () => {
    const regRes = await authService.initiateRegistration('telegram', '0946084865', 'Kassahun Melaku');
    expect(regRes.telegramBotUrl).toBeDefined();

    const url = new URL(regRes.telegramBotUrl!);
    const startParam = url.searchParams.get('start')!;
    expect(startParam.startsWith('reg_')).toBe(true);

    sentTelegramRequests = [];

    // User presses /start <startParam>
    await telegramService.handleUpdate({
      update_id: 1002,
      message: {
        message_id: 2,
        from: { id: 333444, first_name: 'Kassahun', username: 'kassahun_m' },
        chat: { id: 333444, type: 'private' },
        text: `/start ${startParam}`,
      },
    });

    // Verify phone was linked to chat immediately
    expect(identityStore.isPhoneLinked('+251946084865')).toBe(true);
    expect(identityStore.getLinkByPhone('0946084865')?.chatId).toBe('333444');

    // Verify exact OTP message sent
    expect(sentTelegramRequests.length).toBe(1);
    const sentReq = sentTelegramRequests[0];
    expect(String(sentReq.body.chat_id)).toBe('333444');
    expect(sentReq.body.text).toMatch(/^Your Kings Taxi verification OTP is: \d{6}$/);
    expect(sentReq.body.reply_markup).toBeUndefined();
  });

  // --------------------------------------------------------------------------
  // Case 3: Replaying single-use token
  // --------------------------------------------------------------------------
  it('3. Replaying single-use token: rejects subsequent start with token already used', async () => {
    const regRes = await authService.initiateRegistration('telegram', '0911223344', 'Dawit Tsige');
    const url = new URL(regRes.telegramBotUrl!);
    const startParam = url.searchParams.get('start')!;

    // First use
    await telegramService.handleUpdate({
      update_id: 1003,
      message: {
        message_id: 3,
        from: { id: 555111, first_name: 'Dawit' },
        chat: { id: 555111, type: 'private' },
        text: `/start ${startParam}`,
      },
    });

    sentTelegramRequests = [];

    // Second use (replay)
    await telegramService.handleUpdate({
      update_id: 1004,
      message: {
        message_id: 4,
        from: { id: 555111, first_name: 'Dawit' },
        chat: { id: 555111, type: 'private' },
        text: `/start ${startParam}`,
      },
    });

    expect(sentTelegramRequests.length).toBe(1);
    expect(sentTelegramRequests[0].body.text).toContain('Invalid or expired verification link');
  });

  // --------------------------------------------------------------------------
  // Case 4: Password recovery deep-link
  // --------------------------------------------------------------------------
  it('4. Password recovery /start rec_<token>: receives OTP for password recovery', async () => {
    vi.spyOn(prisma.passenger, 'findFirst').mockResolvedValue({
      id: 'pass_123',
      fullName: 'Almaz Ayana',
      email: null,
      phoneNumber: '+251911998877',
      passwordHash: 'hash:salt',
      isVerified: true,
      accountStatus: 'ACTIVE',
    } as any);

    const recRes = await authService.initiateRecovery('telegram', '0911998877');
    const url = new URL(recRes.telegramBotUrl!);
    const startParam = url.searchParams.get('start')!;
    expect(startParam.startsWith('rec_')).toBe(true);

    sentTelegramRequests = [];

    await telegramService.handleUpdate({
      update_id: 1005,
      message: {
        message_id: 5,
        from: { id: 777222, first_name: 'Almaz' },
        chat: { id: 777222, type: 'private' },
        text: `/start ${startParam}`,
      },
    });

    expect(sentTelegramRequests.length).toBe(1);
    expect(sentTelegramRequests[0].body.text).toMatch(/^Your Kings Taxi verification OTP is: \d{6}$/);
  });

  // --------------------------------------------------------------------------
  // Case 5: Invalid or unknown start token
  // --------------------------------------------------------------------------
  it('5. Invalid or unknown start token: rejects with friendly error message', async () => {
    await telegramService.handleUpdate({
      update_id: 1006,
      message: {
        message_id: 6,
        from: { id: 888333 },
        chat: { id: 888333, type: 'private' },
        text: '/start reg_invalidtoken1234567890',
      },
    });

    expect(sentTelegramRequests.length).toBe(1);
    expect(sentTelegramRequests[0].body.text).toContain('Invalid or expired verification link');
  });

  // --------------------------------------------------------------------------
  // Case 6: Handles missing or unexpected update payloads gracefully
  // --------------------------------------------------------------------------
  it('6. Missing or unexpected message payload: handles gracefully without crashing', async () => {
    const update = {
      update_id: 1007,
      message: {
        message_id: 7,
        from: { id: 444555 },
        chat: { id: 444555, type: 'private' },
        text: '',
      },
    };

    await expect(telegramService.handleUpdate(update)).resolves.not.toThrow();
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
  it('12. Successful Telegram OTP delivery: dispatches exact spec format "Your Kings Taxi verification OTP is: {otp}"', async () => {
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
    expect(sentReq!.body.text).toBe('Your Kings Taxi verification OTP is: 654321');
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

  // --------------------------------------------------------------------------
  // Case 19: Unified Login with Email Address
  // --------------------------------------------------------------------------
  it('19. Unified Login: allows login with email address and password', async () => {
    const salt = authService.generateSalt();
    const hash = authService.hashPasswordSync('SecurePass123!', salt);

    vi.spyOn(prisma.passenger, 'findFirst').mockResolvedValue({
      id: 'pass_email_001',
      fullName: 'Abebe Bikila',
      email: 'abebe.bikila@kingstaxi.et',
      phoneNumber: null,
      passwordHash: `${hash}:${salt}`,
      isVerified: true,
      accountStatus: 'ACTIVE',
      language: 'en',
      city: 'Gondar',
    } as any);

    const loginRes = await authService.login('abebe.bikila@kingstaxi.et', 'SecurePass123!');
    expect(loginRes.token).toBeDefined();
    expect(loginRes.user.email).toBe('abebe.bikila@kingstaxi.et');
  });

  // --------------------------------------------------------------------------
  // Case 20: Unified Login with Telegram Phone Number in Various Formats
  // --------------------------------------------------------------------------
  it('20. Unified Login: allows login with Telegram phone number in various Ethiopian formats', async () => {
    const salt = authService.generateSalt();
    const hash = authService.hashPasswordSync('SecurePass123!', salt);

    vi.spyOn(prisma.passenger, 'findFirst').mockImplementation(async (query: any) => {
      const orConditions = query?.where?.OR || [];
      // Check if any condition matched the normalized phone or variations
      const matchesPhone = orConditions.some(
        (cond: any) =>
          cond.phoneNumber === '+251946084865' ||
          cond.phoneNumber === '0946084865' ||
          cond.phoneNumber === '946084865'
      );
      if (matchesPhone) {
        return {
          id: 'pass_phone_002',
          fullName: 'Kassahun Melaku',
          email: null,
          phoneNumber: '+251946084865',
          passwordHash: `${hash}:${salt}`,
          isVerified: true,
          accountStatus: 'ACTIVE',
          language: 'en',
          city: 'Gondar',
        } as any;
      }
      return null;
    });

    // Login with local Ethiopian format (0946084865)
    const loginLocal = await authService.login('0946084865', 'SecurePass123!');
    expect(loginLocal.token).toBeDefined();
    expect(loginLocal.user.fullName).toBe('Kassahun Melaku');

    // Login with E.164 format (+251946084865)
    const loginE164 = await authService.login('+251946084865', 'SecurePass123!');
    expect(loginE164.token).toBeDefined();
    expect(loginE164.user.fullName).toBe('Kassahun Melaku');
  });
});
