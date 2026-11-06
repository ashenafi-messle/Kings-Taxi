/**
 * Kings Taxi — Payment Provider Interface (Telebirr, CBE Birr, Chapa)
 */

export interface PaymentInitiationParams {
  transactionReference: string;
  amount: number;
  currency: 'ETB';
  returnUrl: string;
  callbackUrl: string;
  customerPhone?: string;
  customerEmail?: string;
}

export interface PaymentVerificationResult {
  verified: boolean;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  transactionReference: string;
  gatewayReference?: string;
  amount: number;
  currency: string;
}

export interface IPaymentGatewayProvider {
  initiatePayment(params: PaymentInitiationParams): Promise<{ checkoutUrl: string; providerReference: string }>;
  verifyWebhookSignature(payload: any, signatureHeader: string): boolean;
  queryTransactionStatus(transactionReference: string): Promise<PaymentVerificationResult>;
}

