import { mockPaymentMethods, mockTransactions } from '../mocks';
import {
  ApiResponse,
  PaymentMethodOption,
  PaymentMethodType,
  PaymentTransaction,
} from '../types';

export class PaymentService {
  static async getSupportedPaymentMethods(): Promise<ApiResponse<PaymentMethodOption[]>> {
    return {
      success: true,
      data: mockPaymentMethods,
    };
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
