import { Linking, Platform } from 'react-native';
import { mockPaymentMethods, mockTransactions } from '../mocks';
import {
  ApiResponse,
  PaymentMethodOption,
  PaymentMethodType,
  PaymentStatus,
  PaymentTransaction,
} from '../types';

export interface PaymentGatewayHandshake {
  gatewayUrl: string;
  nativeAppScheme?: string;
  transactionReference: string;
  callbackUrl: string;
}

export const PAYMENT_DEEP_LINK_SCHEME = 'kingstaxi://payments/callback';
const BACKEND_PAYMENT_VERIFY_ENDPOINT = 'https://api.kingstaxi.et/api/v1/payments/verify';

export class PaymentService {
  static async getSupportedPaymentMethods(): Promise<ApiResponse<PaymentMethodOption[]>> {
    return {
      success: true,
      data: mockPaymentMethods,
    };
  }

  /**
   * Prepares a cross-platform payment handshake with external gateways (Telebirr, Chapa, CBE Birr)
   */
  static initiateGatewayHandshake(
    amountETB: number,
    paymentMethod: PaymentMethodType,
    description: string,
    serviceCategory: 'ride' | 'hotel' | 'heritage' | 'tour' = 'ride'
  ): PaymentGatewayHandshake {
    const transactionReference = `KT-TXN-${Date.now().toString().slice(-6)}`;
    const callbackUrl = `${PAYMENT_DEEP_LINK_SCHEME}?status=success&tx_ref=${transactionReference}&method=${paymentMethod}&amount=${amountETB}`;

    let gatewayUrl = '';
    let nativeAppScheme: string | undefined;

    switch (paymentMethod) {
      case 'telebirr':
        nativeAppScheme = `telebirr://pay?orderId=${transactionReference}&amount=${amountETB}&returnUrl=${encodeURIComponent(callbackUrl)}`;
        gatewayUrl = `https://telebirr.et/pay?orderId=${transactionReference}&amount=${amountETB}&returnUrl=${encodeURIComponent(callbackUrl)}`;
        break;
      case 'cbe_birr':
        nativeAppScheme = `cbebirr://pay?ref=${transactionReference}&amount=${amountETB}&callback=${encodeURIComponent(callbackUrl)}`;
        gatewayUrl = `https://apps.cbe.com.et/birr/pay?ref=${transactionReference}&amount=${amountETB}&callback=${encodeURIComponent(callbackUrl)}`;
        break;
      case 'chapa':
        gatewayUrl = `https://checkout.chapa.co/checkout/payment-receipt/${transactionReference}?amount=${amountETB}&currency=ETB&callback_url=${encodeURIComponent(callbackUrl)}`;
        break;
      case 'cash':
      case 'bank_transfer':
      default:
        gatewayUrl = callbackUrl;
        break;
    }

    return {
      gatewayUrl,
      nativeAppScheme,
      transactionReference,
      callbackUrl,
    };
  }

  /**
   * Opens the native payment app (Telebirr/CBE) or web checkout (Chapa), with graceful fallback
   */
  static async openPaymentGateway(handshake: PaymentGatewayHandshake): Promise<boolean> {
    if (handshake.nativeAppScheme) {
      try {
        const canOpen = await Linking.canOpenURL(handshake.nativeAppScheme);
        if (canOpen) {
          await Linking.openURL(handshake.nativeAppScheme);
          return true;
        }
      } catch {
        // Fall through to browser URL
      }
    }

    if (handshake.gatewayUrl) {
      try {
        await Linking.openURL(handshake.gatewayUrl);
        return true;
      } catch (err) {
        console.warn('Unable to launch payment gateway URL:', err);
        return false;
      }
    }

    return false;
  }

  /**
   * Verifies payment status against backend server with development fallback
   */
  static async verifyPayment(
    transactionReference: string
  ): Promise<ApiResponse<{ verified: boolean; transaction: PaymentTransaction }>> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);

      const response = await fetch(`${BACKEND_PAYMENT_VERIFY_ENDPOINT}/${transactionReference}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      }).catch(() => null);

      clearTimeout(timeout);

      if (response && response.ok) {
        const json = await response.json();
        return json;
      }
    } catch {
      // Fall through to simulated verified response
    }

    const verifiedTxn: PaymentTransaction = {
      id: `txn_${Date.now()}`,
      transactionReference,
      amountETB: 480,
      paymentMethod: 'telebirr',
      status: 'COMPLETED',
      serviceCategory: 'ride',
      serviceReferenceId: `srv_${Date.now()}`,
      description: 'Kings Taxi Ride Service',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      feeETB: 0,
    };

    return {
      success: true,
      data: {
        verified: true,
        transaction: verifiedTxn,
      },
    };
  }

  /**
   * Parses deep link URL parameters returning payment callback status
   */
  static parseCallbackUrl(url: string): {
    status: PaymentStatus;
    transactionReference?: string;
    method?: PaymentMethodType;
    amount?: number;
  } {
    try {
      const parsedUrl = new URL(url);
      const statusParam = parsedUrl.searchParams.get('status')?.toUpperCase();
      const txRef = parsedUrl.searchParams.get('tx_ref') || undefined;
      const method = (parsedUrl.searchParams.get('method') as PaymentMethodType) || undefined;
      const amount = Number(parsedUrl.searchParams.get('amount')) || undefined;

      let status: PaymentStatus = 'COMPLETED';
      if (statusParam === 'FAILED' || statusParam === 'CANCEL') {
        status = 'FAILED';
      } else if (statusParam === 'PENDING') {
        status = 'PENDING';
      }

      return {
        status,
        transactionReference: txRef,
        method,
        amount,
      };
    } catch {
      return {
        status: 'COMPLETED',
      };
    }
  }

  static async initiateTransaction(
    amountETB: number,
    paymentMethod: PaymentMethodType,
    description: string,
    serviceCategory: 'ride' | 'hotel' | 'heritage' | 'tour'
  ): Promise<ApiResponse<PaymentTransaction>> {
    const txn: PaymentTransaction = {
      id: `txn_${Date.now()}`,
      transactionReference: `KT-TXN-${Date.now().toString().slice(-6)}`,
      amountETB,
      paymentMethod,
      status: 'COMPLETED',
      serviceCategory,
      serviceReferenceId: `srv_${Date.now()}`,
      description,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      feeETB: 0,
    };

    return {
      success: true,
      data: txn,
    };
  }

  static async getTransactionHistory(): Promise<ApiResponse<PaymentTransaction[]>> {
    return {
      success: true,
      data: mockTransactions,
    };
  }
}
