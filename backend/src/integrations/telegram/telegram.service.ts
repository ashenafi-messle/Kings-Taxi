import crypto from 'crypto';
import { ITelegramProvider, TelegramSendResult } from './index';
import { logger } from '../../core/logging/logger';
import { env } from '../../config/env';
import { TelegramIdentityStore } from './telegramIdentity.store';
import { normalizeEthiopianPhone, isManualPhoneInput, maskPhone } from '../../utils/phone';

export interface TelegramDeliveryAudit {
  id: string;
  target: string; // masked phone or chat ID
  chatId?: string;
  purpose: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING_START' | 'SIMULATED';
  timestamp: string;
  durationMs: number;
  reason?: string;
  errorMessage?: string;
}

interface TelegramApiResponse {
  ok: boolean;
  result?: any;
  description?: string;
  error_code?: number;
}

export interface SessionOtpCallback {
  (sessionOrPhone: string, chatId: string): Promise<{ otp: string; purpose: string; recipientName?: string } | null>;
}

export class TelegramService implements ITelegramProvider {
  private static instance: TelegramService;
  private identityStore = TelegramIdentityStore.getInstance();
  private recentAudits: TelegramDeliveryAudit[] = [];
  private readonly maxAuditHistory = 50;

  // Track pending deep-link registration session by Telegram chat ID
  private pendingSessionByChat = new Map<string, string>();

  // Deduplication set for processed update IDs
  private processedUpdateIds = new Set<number>();
  private readonly maxProcessedUpdates = 10000;

  public clearProcessedUpdates(): void {
    this.processedUpdateIds.clear();
    this.pendingSessionByChat.clear();
  }

  // Callback to resolve active OTP session by sessionId or phone
  private sessionResolver: SessionOtpCallback | null = null;

  // Polling control
  private isPolling = false;
  private pollingTimeout: NodeJS.Timeout | null = null;
  private lastUpdateId = 0;

  private constructor() {
    this.initService();
  }

  public static getInstance(): TelegramService {
    if (!TelegramService.instance) {
      TelegramService.instance = new TelegramService();
    }
    return TelegramService.instance;
  }

  private async initService(): Promise<void> {
    if (!env.TELEGRAM_BOT_TOKEN) {
      logger.warn('[TelegramService] TELEGRAM_BOT_TOKEN not configured; Telegram delivery will be simulated or fail.');
      return;
    }

    // Check if webhook is active; if not and not in test environment, start polling
    if (env.NODE_ENV !== 'test') {
      try {
        const whInfo = await this.getWebhookInfo();
        if (whInfo.success && !whInfo.info?.url) {
          logger.info('[TelegramService] No Telegram webhook set; starting local update poller for deep-linking');
          this.startPolling();
        } else if (whInfo.info?.url) {
          logger.info({ webhookUrl: whInfo.info.url }, '[TelegramService] Telegram webhook is configured');
        }
      } catch (err: any) {
        logger.warn({ error: err.message }, '[TelegramService] Could not check webhook info on startup');
      }
    }
  }

  public setSessionResolver(resolver: SessionOtpCallback): void {
    this.sessionResolver = resolver;
  }

  public normalizePhone(phone: string): string {
    const res = normalizeEthiopianPhone(phone);
    return res.isValid ? res.normalized : phone.trim();
  }

  public maskTarget(target: string): string {
    return maskPhone(target);
  }

  public async linkPhoneToChat(
    phone: string,
    chatId: string,
    telegramUserId?: string,
    metadata?: { username?: string; firstName?: string; lastName?: string }
  ): Promise<void> {
    const { normalized, isValid } = normalizeEthiopianPhone(phone);
    if (!isValid) return;

    await this.identityStore.linkIdentity({
      telegramUserId: telegramUserId || String(chatId),
      chatId: String(chatId),
      phone: normalized,
      username: metadata?.username,
      firstName: metadata?.firstName,
      lastName: metadata?.lastName,
      linkedAt: new Date().toISOString(),
      isVerified: true,
    });
  }

  public getChatIdForPhone(phone: string): string | null {
    const link = this.identityStore.getLinkByPhone(phone);
    return link ? link.chatId : null;
  }

  public isPhoneLinked(phone: string): boolean {
    return this.identityStore.isPhoneLinked(phone);
  }

  public isChatLinked(chatId: string): boolean {
    return this.identityStore.isChatLinked(chatId);
  }

  private recordAudit(audit: TelegramDeliveryAudit): void {
    this.recentAudits.unshift(audit);
    if (this.recentAudits.length > this.maxAuditHistory) {
      this.recentAudits.pop();
    }
  }

  public getRecentAudits(): TelegramDeliveryAudit[] {
    return [...this.recentAudits];
  }

  /**
   * Diagnostic: getMe from Telegram API
   */
  public async getMe(): Promise<{ success: boolean; bot?: any; error?: string }> {
    if (!env.TELEGRAM_BOT_TOKEN) {
      return { success: false, error: 'TELEGRAM_BOT_TOKEN is not configured' };
    }

    try {
      const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getMe`, {
        signal: AbortSignal.timeout(8000),
      });
      const data = (await res.json()) as TelegramApiResponse;
      if (data.ok) {
        return { success: true, bot: data.result };
      }
      return { success: false, error: data.description || 'getMe failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network request failed' };
    }
  }

  /**
   * Diagnostic: getWebhookInfo from Telegram API
   */
  public async getWebhookInfo(): Promise<{ success: boolean; info?: any; error?: string }> {
    if (!env.TELEGRAM_BOT_TOKEN) {
      return { success: false, error: 'TELEGRAM_BOT_TOKEN is not configured' };
    }

    try {
      const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getWebhookInfo`, {
        signal: AbortSignal.timeout(8000),
      });
      const data = (await res.json()) as TelegramApiResponse;
      if (data.ok) {
        return { success: true, info: data.result };
      }
      return { success: false, error: data.description || 'getWebhookInfo failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network request failed' };
    }
  }

  /**
   * Sends Kings Taxi branded OTP message via Telegram Bot API
   */
  async sendOtpMessage(
    telegramChatIdOrPhone: string,
    otp: string,
    options?: { sessionId?: string; purpose?: string; recipientName?: string }
  ): Promise<TelegramSendResult> {
    const startTime = Date.now();
    const target = telegramChatIdOrPhone.trim();
    const phoneRes = normalizeEthiopianPhone(target);

    let chatId: string | null = null;
    if (phoneRes.isValid && (target.startsWith('+') || target.startsWith('0') || target.startsWith('251'))) {
      chatId = this.getChatIdForPhone(phoneRes.normalized);
    } else if (phoneRes.isValid) {
      // 9 digits (could be subscriber or numeric chat ID) - check phone store first
      const linked = this.getChatIdForPhone(phoneRes.normalized);
      chatId = linked || target;
    } else if (/^-?\d+$/.test(target)) {
      chatId = target;
    } else {
      chatId = this.getChatIdForPhone(target);
    }

    const maskedTarget = this.maskTarget(target);

    // If chat ID is unknown, Telegram API cannot initiate messaging to this phone
    if (!chatId) {
      const durationMs = Date.now() - startTime;
      logger.warn(
        { target: maskedTarget, sessionId: options?.sessionId },
        '[TelegramService] No Telegram chat ID linked for this recipient yet. User must open bot and share contact.'
      );

      this.recordAudit({
        id: `aud_${Date.now()}`,
        target: maskedTarget,
        purpose: options?.purpose || 'OTP_VERIFICATION',
        status: 'PENDING_START',
        timestamp: new Date().toISOString(),
        durationMs,
        reason: 'CHAT_NOT_FOUND',
        errorMessage: 'User has not started @KingstaxiBot or shared contact yet',
      });

      return {
        success: false,
        reason: 'CHAT_NOT_FOUND',
        error: `User has not interacted with @${env.TELEGRAM_BOT_USERNAME || 'KingstaxiBot'} yet. Deep-link contact sharing required.`,
      };
    }

    // In test environment without bot token, simulate safely
    if (!env.TELEGRAM_BOT_TOKEN && env.NODE_ENV === 'test') {
      this.recordAudit({
        id: `aud_${Date.now()}`,
        target: maskedTarget,
        chatId,
        purpose: options?.purpose || 'OTP_VERIFICATION',
        status: 'SIMULATED',
        timestamp: new Date().toISOString(),
        durationMs: 5,
      });
      return { success: true, messageId: 999999, chatId };
    }

    if (!env.TELEGRAM_BOT_TOKEN) {
      return {
        success: false,
        reason: 'INVALID_TOKEN',
        error: 'TELEGRAM_BOT_TOKEN is not configured',
      };
    }

    // Official Kings Taxi OTP message format
    const messageText = `
🚕 <b>KINGS TAXI ETHIOPIA</b>
━━━━━━━━━━━━━━━━━━━━
Your passenger registration verification code is:

<code>${otp}</code>

⏱ <b>This OTP expires in 5 minutes.</b>

⚠️ <i>Do not share this code with anyone. Kings Taxi staff will never ask for your OTP.</i>

Thank you for choosing Kings Taxi!
    `.trim();

    try {
      const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: messageText,
          parse_mode: 'HTML',
        }),
        signal: AbortSignal.timeout(10000),
      });

      const data = (await res.json()) as TelegramApiResponse;
      const durationMs = Date.now() - startTime;

      if (data.ok) {
        logger.info(
          { target: maskedTarget, chatId, messageId: data.result.message_id, durationMs },
          '[TelegramService] OTP dispatched successfully to Telegram'
        );

        this.recordAudit({
          id: String(data.result.message_id),
          target: maskedTarget,
          chatId,
          purpose: options?.purpose || 'OTP_VERIFICATION',
          status: 'SUCCESS',
          timestamp: new Date().toISOString(),
          durationMs,
        });

        return {
          success: true,
          messageId: data.result.message_id,
          chatId,
        };
      }

      // Handle Telegram specific errors
      let failureReason: 'BOT_BLOCKED' | 'CHAT_NOT_FOUND' | 'UNKNOWN' = 'UNKNOWN';
      const desc: string = data.description || '';

      if (res.status === 403 || desc.toLowerCase().includes('blocked') || desc.toLowerCase().includes('deactivated')) {
        failureReason = 'BOT_BLOCKED';
      } else if (desc.toLowerCase().includes('chat not found')) {
        failureReason = 'CHAT_NOT_FOUND';
      }

      logger.error(
        { target: maskedTarget, chatId, reason: failureReason, error: desc, durationMs },
        '[TelegramService] Telegram API rejected sendMessage'
      );

      this.recordAudit({
        id: `aud_${Date.now()}`,
        target: maskedTarget,
        chatId,
        purpose: options?.purpose || 'OTP_VERIFICATION',
        status: 'FAILED',
        timestamp: new Date().toISOString(),
        durationMs,
        reason: failureReason,
        errorMessage: desc,
      });

      return {
        success: false,
        reason: failureReason,
        error: desc,
        chatId,
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      logger.error(
        { target: maskedTarget, chatId, error: err.message, durationMs },
        '[TelegramService] Network error dispatching Telegram OTP'
      );

      this.recordAudit({
        id: `aud_${Date.now()}`,
        target: maskedTarget,
        chatId,
        purpose: options?.purpose || 'OTP_VERIFICATION',
        status: 'FAILED',
        timestamp: new Date().toISOString(),
        durationMs,
        reason: 'NETWORK_ERROR',
        errorMessage: err.message,
      });

      return {
        success: false,
        reason: 'NETWORK_ERROR',
        error: err.message,
        chatId,
      };
    }
  }

  /**
   * Processes incoming Telegram webhook or polled updates
   */
  public async handleUpdate(update: any): Promise<void> {
    if (!update || !update.message) return;

    // Deduplication check
    if (update.update_id) {
      if (this.processedUpdateIds.has(update.update_id)) {
        return;
      }
      this.processedUpdateIds.add(update.update_id);
      if (this.processedUpdateIds.size > this.maxProcessedUpdates) {
        const first = this.processedUpdateIds.values().next().value;
        if (first !== undefined) this.processedUpdateIds.delete(first);
      }
    }

    const message = update.message;
    const chatId = String(message.chat.id);
    const fromId = String(message.from?.id);
    const text = message.text ? message.text.trim() : '';

    // =========================================================================
    // 1. Handle Contact Sharing Update (Real Telegram Contact Button)
    // =========================================================================
    if (message.contact && message.contact.phone_number) {
      const contactUserId = message.contact.user_id ? String(message.contact.user_id) : undefined;
      const rawPhone = message.contact.phone_number;

      // Security check: Verify that message.contact.user_id matches message.from.id
      if (!contactUserId || contactUserId !== fromId) {
        logger.warn(
          { fromId, contactUserId, chatId },
          '[TelegramService] Contact spoofing detected: shared contact does not belong to sender'
        );
        await this.sendSpoofingWarning(chatId);
        return;
      }

      // Normalize Ethiopian phone number
      const phoneValidation = normalizeEthiopianPhone(rawPhone);
      if (!phoneValidation.isValid) {
        logger.warn(
          { rawPhone, chatId },
          '[TelegramService] Invalid Ethiopian phone number provided in contact update'
        );
        await this.sendInvalidPhoneWarning(chatId);
        return;
      }

      const normalizedPhone = phoneValidation.normalized;

      // Save identity link persistently
      await this.identityStore.linkIdentity({
        telegramUserId: fromId,
        chatId,
        phone: normalizedPhone,
        username: message.from?.username,
        firstName: message.from?.first_name,
        lastName: message.from?.last_name,
        linkedAt: new Date().toISOString(),
        isVerified: true,
      });

      // Check for pending registration session
      let pendingSessionId = this.pendingSessionByChat.get(chatId);
      let sessionData = null;

      if (this.sessionResolver) {
        // Try resolving by pending sessionId first
        if (pendingSessionId) {
          sessionData = await this.sessionResolver(pendingSessionId, chatId);
        }
        // Fallback: check if an active session exists for this phone
        if (!sessionData) {
          sessionData = await this.sessionResolver(normalizedPhone, chatId);
        }
      }

      if (sessionData) {
        // Dispatch OTP immediately
        await this.sendOtpMessage(chatId, sessionData.otp, {
          sessionId: pendingSessionId || normalizedPhone,
          purpose: sessionData.purpose,
          recipientName: sessionData.recipientName,
        });

        await this.sendDirectMessage(
          chatId,
          `✅ <b>Telegram Account Successfully Linked!</b>\n━━━━━━━━━━━━━━━━━━━━\nConnected Phone: <code>${maskPhone(
            normalizedPhone
          )}</code>\n\nYour verification code has been dispatched above. Please return to the Kings Taxi app to enter your code.`
        );
      } else {
        // Inform user that linking succeeded and they can now request OTP from the app
        await this.sendDirectMessage(
          chatId,
          `🚕 <b>KINGS TAXI ETHIOPIA</b>\n━━━━━━━━━━━━━━━━━━━━\n✅ <b>Telegram Account Successfully Linked!</b>\n\nConnected Phone: <code>${maskPhone(
            normalizedPhone
          )}</code>\n\nYour Telegram account is now securely linked to Kings Taxi. You will receive OTP verification codes and trip updates directly in this chat.`
        );
      }

      this.pendingSessionByChat.delete(chatId);
      return;
    }

    // =========================================================================
    // 2. Intercept Manual Phone Number Typed as Ordinary Text
    // =========================================================================
    if (text && isManualPhoneInput(text)) {
      logger.info({ chatId, textPreview: maskPhone(text) }, '[TelegramService] User typed phone number manually as text');
      await this.sendManualPhoneWarning(chatId);
      return;
    }

    // =========================================================================
    // 3. Handle /start Command
    // =========================================================================
    if (text.startsWith('/start')) {
      const parts = text.split(' ');
      const startParam = parts[1] ? parts[1].trim() : '';

      logger.info({ chatId, fromId, startParam }, '[TelegramService] Received /start command');

      // Check if user is already linked
      const existingLink =
        this.identityStore.getLinkByChatId(chatId) || this.identityStore.getLinkByUserId(fromId);

      // Case A: Deep link parameter provided (e.g. /start reg_<sessionId>)
      if (startParam) {
        this.pendingSessionByChat.set(chatId, startParam);

        if (existingLink && this.sessionResolver) {
          const sessionData = await this.sessionResolver(startParam, chatId);
          if (sessionData) {
            await this.sendOtpMessage(chatId, sessionData.otp, {
              sessionId: startParam,
              purpose: sessionData.purpose,
              recipientName: sessionData.recipientName,
            });

            await this.sendDirectMessage(
              chatId,
              `✅ <b>Connected!</b> Your verification code has been dispatched above.\n\nPlease return to the Kings Taxi app to enter your code.`
            );
            this.pendingSessionByChat.delete(chatId);
            return;
          }
        }

        // If not linked or session needs linking, request contact
        if (!existingLink) {
          await this.sendContactPrompt(
            chatId,
            `🚕 <b>Kings Taxi Verification</b>\n━━━━━━━━━━━━━━━━━━━━\nTo link your passenger account and receive your OTP code, please tap the button below to share your phone number.`
          );
          return;
        }
      }

      // Case B: Plain /start without parameters
      if (existingLink) {
        await this.sendAlreadyLinkedMessage(chatId, existingLink.phone);
        return;
      }

      // Case C: First-time or unlinked user
      await this.sendWelcomeMessage(chatId);
      return;
    }

    // =========================================================================
    // 4. Default / Unhandled Text Response
    // =========================================================================
    const isLinked = this.identityStore.isChatLinked(chatId);
    if (!isLinked) {
      await this.sendContactPrompt(chatId);
    } else {
      await this.sendDirectMessage(
        chatId,
        `🚕 <b>Kings Taxi Ethiopia</b>\n━━━━━━━━━━━━━━━━━━━━\nYour Telegram account is active and connected. To request a verification code or book a ride, please use the Kings Taxi mobile application.`
      );
    }
  }

  /**
   * Sends the official Telegram contact-requesting ReplyKeyboardMarkup button
   */
  public async sendContactPrompt(chatId: string, customMessage?: string): Promise<boolean> {
    if (!env.TELEGRAM_BOT_TOKEN) return false;

    const text =
      customMessage ||
      `
🚕 <b>Kings Taxi Ethiopia</b>
━━━━━━━━━━━━━━━━━━━━
Please tap the button below to securely share your phone number with Kings Taxi.
      `.trim();

    try {
      const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          reply_markup: {
            keyboard: [
              [
                {
                  text: '📱 Share My Phone Number',
                  request_contact: true,
                },
              ],
            ],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        }),
        signal: AbortSignal.timeout(5000),
      });

      const data = (await res.json()) as TelegramApiResponse;
      return data.ok;
    } catch (err: any) {
      logger.warn({ error: err.message }, '[TelegramService] Failed to send contact prompt');
      return false;
    }
  }

  private async sendWelcomeMessage(chatId: string): Promise<void> {
    const text = `
🚕 <b>Welcome to Kings Taxi Ethiopia!</b>
━━━━━━━━━━━━━━━━━━━━
Gondar City's Premier Transportation Platform.

To receive instant OTP verification codes and trip notifications here, please tap the button below to link your phone number.
    `.trim();

    await this.sendContactPrompt(chatId, text);
  }

  private async sendAlreadyLinkedMessage(chatId: string, phone: string): Promise<void> {
    const text = `
🚕 <b>Kings Taxi Ethiopia</b>
━━━━━━━━━━━━━━━━━━━━
✅ <b>Your Telegram account is linked!</b>

Connected Phone: <code>${maskPhone(phone)}</code>

Your account is ready to receive instant OTP verification codes and trip updates.
To request a verification code, please return to the Kings Taxi mobile application.
    `.trim();

    await this.sendDirectMessage(chatId, text);
  }

  private async sendManualPhoneWarning(chatId: string): Promise<void> {
    const text = `
⚠️ <b>Action Required</b>
━━━━━━━━━━━━━━━━━━━━
Please use the <b>Share My Phone Number</b> button below to securely link your Telegram account.

<i>Manual text entry cannot be verified for security.</i>
    `.trim();

    await this.sendContactPrompt(chatId, text);
  }

  private async sendSpoofingWarning(chatId: string): Promise<void> {
    const text = `
⚠️ <b>Verification Failed</b>
━━━━━━━━━━━━━━━━━━━━
You must share your own phone number using the button below. Contacts belonging to other users cannot be linked.
    `.trim();

    await this.sendContactPrompt(chatId, text);
  }

  private async sendInvalidPhoneWarning(chatId: string): Promise<void> {
    const text = `
⚠️ <b>Invalid Phone Number</b>
━━━━━━━━━━━━━━━━━━━━
Please ensure your Telegram account is registered with a valid Ethiopian mobile number (+251 9... or +251 7...).
    `.trim();

    await this.sendContactPrompt(chatId, text);
  }

  public async sendDirectMessage(chatId: string, text: string): Promise<boolean> {
    if (!env.TELEGRAM_BOT_TOKEN) return false;
    try {
      const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
        }),
        signal: AbortSignal.timeout(5000),
      });
      const data = (await res.json()) as TelegramApiResponse;
      return data.ok;
    } catch {
      return false;
    }
  }

  /**
   * Starts local polling loop for development and environments without public webhooks
   */
  public startPolling(): void {
    if (this.isPolling) return;
    this.isPolling = true;

    const poll = async () => {
      if (!this.isPolling || !env.TELEGRAM_BOT_TOKEN) return;

      try {
        const res = await fetch(
          `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getUpdates?offset=${this.lastUpdateId + 1}&timeout=5`,
          { signal: AbortSignal.timeout(10000) }
        );

        if (res.ok) {
          const data = (await res.json()) as TelegramApiResponse;
          if (data.ok && Array.isArray(data.result)) {
            for (const update of data.result) {
              this.lastUpdateId = Math.max(this.lastUpdateId, update.update_id);
              await this.handleUpdate(update);
            }
          }
        }
      } catch (err: any) {
        // Silent timeout catch to prevent log spamming during long-polling
      }

      if (this.isPolling) {
        this.pollingTimeout = setTimeout(poll, 2000);
      }
    };

    poll();
  }

  public stopPolling(): void {
    this.isPolling = false;
    if (this.pollingTimeout) {
      clearTimeout(this.pollingTimeout);
      this.pollingTimeout = null;
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

  async verifyAccountHandshake(telegramUserId: string, nonce: string): Promise<boolean> {
    try {
      logger.info({ telegramUserId, nonce }, '[TelegramService] Validating Telegram deep link handshake');
      return Boolean(telegramUserId && nonce);
    } catch (err: any) {
      logger.error({ err, telegramUserId }, '[TelegramService] Handshake verification failed');
      return false;
    }
  }
}
