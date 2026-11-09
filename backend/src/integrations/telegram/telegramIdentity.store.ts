import fs from 'fs';
import path from 'path';
import { logger } from '../../core/logging/logger';
import { prisma } from '../../config/database';
import { normalizeEthiopianPhone, maskPhone } from '../../utils/phone';

export interface TelegramLinkedIdentity {
  telegramUserId: string;
  chatId: string;
  phone: string; // E.164 normalized: +251946084865
  username?: string;
  firstName?: string;
  lastName?: string;
  linkedAt: string;
  isVerified: boolean;
}

export class TelegramIdentityStore {
  private static instance: TelegramIdentityStore;
  private identitiesByPhone = new Map<string, TelegramLinkedIdentity>();
  private identitiesByChat = new Map<string, TelegramLinkedIdentity>();
  private identitiesByUser = new Map<string, TelegramLinkedIdentity>();

  private storageFilePath: string;

  private constructor() {
    // Persistent storage directory in backend/data/
    const dataDir = path.resolve(__dirname, '../../../data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (err: any) {
        logger.warn({ error: err.message }, '[TelegramIdentityStore] Could not create data directory');
      }
    }
    this.storageFilePath = path.join(dataDir, 'telegram_identities.json');
    this.loadFromFile();
  }

  public static getInstance(): TelegramIdentityStore {
    if (!TelegramIdentityStore.instance) {
      TelegramIdentityStore.instance = new TelegramIdentityStore();
    }
    return TelegramIdentityStore.instance;
  }

  private loadFromFile(): void {
    if (!fs.existsSync(this.storageFilePath)) return;

    try {
      const raw = fs.readFileSync(this.storageFilePath, 'utf8');
      const list: TelegramLinkedIdentity[] = JSON.parse(raw);
      if (Array.isArray(list)) {
        for (const item of list) {
          this.indexIdentity(item);
        }
        logger.info(
          { count: list.length },
          '[TelegramIdentityStore] Loaded linked Telegram identities from disk'
        );
      }
    } catch (err: any) {
      logger.warn({ error: err.message }, '[TelegramIdentityStore] Failed to read identities file');
    }
  }

  private saveToFile(): void {
    try {
      const list = Array.from(this.identitiesByPhone.values());
      fs.writeFileSync(this.storageFilePath, JSON.stringify(list, null, 2), 'utf8');
    } catch (err: any) {
      logger.warn({ error: err.message }, '[TelegramIdentityStore] Failed to save identities to disk');
    }
  }

  private indexIdentity(identity: TelegramLinkedIdentity): void {
    this.identitiesByPhone.set(identity.phone, identity);
    this.identitiesByChat.set(identity.chatId, identity);
    this.identitiesByUser.set(identity.telegramUserId, identity);
  }

  /**
   * Securely saves or updates a verified Telegram link
   */
  public async linkIdentity(identity: TelegramLinkedIdentity): Promise<void> {
    const { normalized, isValid } = normalizeEthiopianPhone(identity.phone);
    if (!isValid) {
      throw new Error(`Cannot link invalid phone number: ${identity.phone}`);
    }

    const cleanIdentity: TelegramLinkedIdentity = {
      ...identity,
      phone: normalized,
      isVerified: true,
      linkedAt: identity.linkedAt || new Date().toISOString(),
    };

    // Index locally
    this.indexIdentity(cleanIdentity);
    this.saveToFile();

    logger.info(
      {
        phone: maskPhone(cleanIdentity.phone),
        telegramUserId: cleanIdentity.telegramUserId,
        chatId: cleanIdentity.chatId,
      },
      '[TelegramIdentityStore] Securely linked Telegram account'
    );

    // Synchronize to PostgreSQL if Passenger already exists
    try {
      const passenger = await prisma.passenger.findFirst({
        where: {
          OR: [{ phoneNumber: cleanIdentity.phone }, { phoneNumber: cleanIdentity.phone.replace('+', '') }],
        },
      });

      if (passenger) {
        await prisma.passengerAuthIdentity.upsert({
          where: {
            provider_providerId: {
              provider: 'TELEGRAM',
              providerId: cleanIdentity.telegramUserId,
            },
          },
          create: {
            passengerId: passenger.id,
            provider: 'TELEGRAM',
            providerId: cleanIdentity.telegramUserId,
            verified: true,
            verifiedAt: new Date(),
            metadata: {
              chatId: cleanIdentity.chatId,
              phone: cleanIdentity.phone,
              username: cleanIdentity.username || null,
            },
          },
          update: {
            verified: true,
            verifiedAt: new Date(),
            metadata: {
              chatId: cleanIdentity.chatId,
              phone: cleanIdentity.phone,
              username: cleanIdentity.username || null,
            },
          },
        });
        logger.info(
          { passengerId: passenger.id, phone: maskPhone(cleanIdentity.phone) },
          '[TelegramIdentityStore] Synchronized Telegram identity to PostgreSQL PassengerAuthIdentity'
        );
      }
    } catch {
      // Non-blocking in dev or when SSH tunnel is offline
    }
  }

  /**
   * Retrieves linked identity by phone number
   */
  public getLinkByPhone(phone: string): TelegramLinkedIdentity | null {
    const { normalized, isValid } = normalizeEthiopianPhone(phone);
    if (!isValid) return null;
    return this.identitiesByPhone.get(normalized) || null;
  }

  /**
   * Retrieves linked identity by Telegram Chat ID
   */
  public getLinkByChatId(chatId: string): TelegramLinkedIdentity | null {
    if (!chatId) return null;
    return this.identitiesByChat.get(String(chatId)) || null;
  }

  /**
   * Retrieves linked identity by Telegram User ID
   */
  public getLinkByUserId(userId: string): TelegramLinkedIdentity | null {
    if (!userId) return null;
    return this.identitiesByUser.get(String(userId)) || null;
  }

  public isPhoneLinked(phone: string): boolean {
    return Boolean(this.getLinkByPhone(phone));
  }

  public isChatLinked(chatId: string): boolean {
    return Boolean(this.getLinkByChatId(chatId));
  }

  public isUserLinked(userId: string): boolean {
    return Boolean(this.getLinkByUserId(userId));
  }

  /**
   * Clear all stored identities (for test isolation)
   */
  public clear(): void {
    this.identitiesByPhone.clear();
    this.identitiesByChat.clear();
    this.identitiesByUser.clear();
    if (fs.existsSync(this.storageFilePath)) {
      try {
        fs.unlinkSync(this.storageFilePath);
      } catch {
        // ignore
      }
    }
  }
}

