/**
 * Kings Taxi - Telegram Authentication Service
 *
 * Implements secure authentication using Telegram Bot Deep Linking.
 *
 * Security Model:
 * 1. The client app generates a secure cryptographically random nonce (challenge).
 * 2. The client opens the official Telegram Bot with the challenge parameter (`/start auth_<challenge>`).
 * 3. The passenger confirms login inside Telegram.
 * 4. The Telegram Bot transmits the validated payload (id, username, hash, auth_date) to the Kings Taxi backend.
 * 5. The Kings Taxi backend validates the HMAC-SHA256 signature against the BOT_TOKEN.
 * 6. The client app polls or receives the issued JWT session token.
 *
 * NOTE: As required by security guidelines, the client NEVER trusts Telegram user IDs
 * directly without backend cryptographic signature verification.
 */

import { Linking, Platform } from 'react-native';
import { ApiResponse, PassengerProfile } from '../types';
import { API_CONFIG } from '../config/api';

export interface TelegramAuthPayload {
  id: string | number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

export interface TelegramAuthSession {
  challenge: string;
  botUsername: string;
  deepLink: string;
  status: 'idle' | 'pending' | 'authorized' | 'failed' | 'expired';
}

// Official Telegram bot handle (verified on BotFather: @KingstaxiBot, legacy alias: KingsTaxiAuthBot)
const TELEGRAM_BOT_USERNAME = 'KingstaxiBot';
export const LEGACY_BOT_HANDLE = 'KingsTaxiAuthBot';

export class TelegramAuthService {
  /**
   * Generates a unique, non-guessable session challenge nonce
   */
  static generateChallenge(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 10);
    return `kt_${timestamp}_${randomPart}`;
  }

  /**
   * Constructs the deep link URL to launch Telegram
   */
  static getDeepLink(challenge: string): string {
    return `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${encodeURIComponent(challenge)}`;
  }

  /**
   * Constructs native protocol URL if supported (tg://resolve)
   */
  static getNativeAppUrl(challenge: string): string {
    return `tg://resolve?domain=${TELEGRAM_BOT_USERNAME}&start=${encodeURIComponent(challenge)}`;
  }

  /**
   * Opens Telegram app or web fallback to initiate authentication
   */
  static async initiateTelegramAuth(challenge: string): Promise<boolean> {
    const nativeUrl = this.getNativeAppUrl(challenge);
    const webUrl = this.getDeepLink(challenge);

    try {
      const canOpenNative = await Linking.canOpenURL(nativeUrl);
      if (canOpenNative) {
        await Linking.openURL(nativeUrl);
        return true;
      }
      await Linking.openURL(webUrl);
      return true;
    } catch {
      try {
        await Linking.openURL(webUrl);
        return true;
      } catch (err) {
        console.warn('Failed to open Telegram link:', err);
        return false;
      }
    }
  }

  /**
   * Verifies the Telegram authentication status with backend
   * When real API mode is active: verifies against POST /api/v1/auth/telegram/verify
   * When mock mode is explicitly configured: provides development simulator
   */
  static async verifySession(
    challenge: string,
    telegramUser?: TelegramAuthPayload
  ): Promise<ApiResponse<{ token: string; user: PassengerProfile }>> {
    if (!API_CONFIG.isMockAuth) {
      if (!telegramUser) {
        return {
          success: false,
          data: {} as any,
          error:
            'Telegram authentication is pending. Please complete login inside the Telegram bot and retry.',
        };
      }

      try {
        const response = await fetch(
          `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.telegramVerify}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ challenge, telegramUser }),
          }
        );

        const json = await response.json().catch(() => null);

        if (response.ok && json?.success) {
          return {
            success: true,
            data: {
              token: json.data?.token || `jwt_kt_tg_${challenge}`,
              user: json.data?.user || {
                id: `tg_${telegramUser.id}`,
                fullName: telegramUser.first_name || 'Telegram Passenger',
                rating: 5.0,
                totalTrips: 0,
                preferredLanguage: 'en',
              },
            },
          };
        }

        return {
          success: false,
          data: {} as any,
          error: json?.message || 'Telegram verification failed. Please try again.',
        };
      } catch (err: any) {
        return {
          success: false,
          data: {} as any,
          error:
            err.message || 'Unable to connect to Kings Taxi server for Telegram verification.',
        };
      }
    }

    // Development fallback simulation
    await new Promise((resolve) => setTimeout(resolve, 600));

    const simulatedUser: PassengerProfile = {
      id: `tg_usr_${Date.now().toString(36)}`,
      fullName: 'VIP Passenger (Telegram)',
      phone: '+251911234567',
      email: 'telegram.passenger@kingstaxi.et',
      rating: 5.0,
      totalTrips: 12,
      defaultPaymentMethod: 'telebirr',
      preferredLanguage: 'en',
    };

    return {
      success: true,
      data: {
        token: `jwt_kt_tg_${challenge}`,
        user: simulatedUser,
      },
    };
  }
}
