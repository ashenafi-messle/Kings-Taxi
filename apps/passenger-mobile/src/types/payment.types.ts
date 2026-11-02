export type PaymentMethodType = 'telebirr' | 'cbe_birr' | 'chapa' | 'bank_transfer' | 'cash';

export interface PaymentMethodOption {
  id: PaymentMethodType;
  name: string;
  subtitle: string;
  iconName: string;
  badge?: string;
  isPopular?: boolean;
}

export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface PaymentTransaction {
  id: string;
  transactionReference: string;
  amountETB: number;
  paymentMethod: PaymentMethodType;
  status: PaymentStatus;
  serviceCategory: 'ride' | 'hotel' | 'heritage' | 'tour';
  serviceReferenceId: string;
  description: string;
  createdAt: string;
  completedAt?: string;
  feeETB?: number;
}
