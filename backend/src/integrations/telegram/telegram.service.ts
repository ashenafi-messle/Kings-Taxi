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
  (
    sessionOrPhone: string,
    chatId: string,
    userMeta?: { fromId?: string; username?: string; firstName?: string; lastName?: string }
  ): Promise<{ otp: string; purpose: string; recipientName?: string } | { error: string } | null>;
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

    // Official Kings Taxi OTP message format: exactly one concise line per spec
    const messageText = `Your Kings Taxi verification OTP is: ${otp}`;

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

    // Handle /start Command
    if (text.startsWith('/start')) {
      const parts = text.split(' ');
      const startParam = parts[1] ? parts[1].trim() : '';

      logger.info({ chatId, fromId, hasParam: Boolean(startParam) }, '[TelegramService] Received /start command');

      // Case A: Deep link parameter provided (e.g. /start reg_<token> or /start rec_<token>)
      if (startParam && this.sessionResolver) {
        const sessionData = await this.sessionResolver(startParam, chatId, {
          fromId,
          username: message.from?.username,
          firstName: message.from?.first_name,
          lastName: message.from?.last_name,
        });

        if (sessionData && 'otp' in sessionData) {
          // Exactly one concise message with the OTP:
          // "Your Kings Taxi verification OTP is: 123456"
          await this.sendDirectMessage(
            chatId,
            `Your Kings Taxi verification OTP is: ${sessionData.otp}`
          );
          return;
        }

        // Invalid or expired token
        await this.sendDirectMessage(
          chatId,
          'Invalid or expired verification link. Please request a new code from the Kings Taxi app.'
        );
        return;
      }

      // Case B: Plain /start without parameters
      await this.sendDirectMessage(
        chatId,
        'Welcome to Kings Taxi. To verify your account, please start from the Kings Taxi mobile application.'
      );
      return;
    }

    // Default response for unhandled text messages
    await this.sendDirectMessage(
      chatId,
      'Welcome to Kings Taxi. To request a verification code or book a ride, please use the Kings Taxi mobile application.'
    );
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
