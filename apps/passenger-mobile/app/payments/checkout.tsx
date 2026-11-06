import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  BackHandler,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Lock,
} from 'lucide-react-native';
import { theme } from '../../src/theme';
import {
  AppHeader,
  PaymentMethodCard,
  PriceBreakdown,
  PrimaryButton,
  SecondaryButton,
} from '../../src/components';
import { mockPaymentMethods } from '../../src/mocks';
import { PaymentMethodType, PaymentStatus } from '../../src/types';
import { PaymentService } from '../../src/services/payment.service';
import { formatETB } from '../../src/utils/currency';
import { useTranslation } from '../../src/i18n';

export default function CheckoutPaymentScreen() {
  const router = useRouter();
  const { t } = useTranslation(['payments', 'common', 'navigation']);
  const params = useLocalSearchParams();

  const amount = Number(params.amount) || 480;
  const description = (params.description as string) || 'Kings Taxi Ride Service';
  const serviceCategory = (params.serviceCategory as string) || 'ride';

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>('telebirr');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('PENDING');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionRef, setTransactionRef] = useState('');

  const breakdownItems = [
    { label: description, amount },
    { label: 'Payment Processing Fee', amount: 0 },
  ];

  // Intercept Android hardware back press during payment
  useEffect(() => {
    const onBackPress = () => {
      if (paymentStatus === 'PROCESSING') {
        // Prevent accidental cancellation while transaction is in flight
        return true;
      }
      return false;
    };

    const backSub = BackHandler.addEventListener('hardwareBackPress', onBackPress);

    // Listen for incoming deep link callbacks (e.g. from Telebirr / Chapa redirect)
    const urlSub = Linking.addEventListener('url', (event) => {
      if (event.url && event.url.includes('payments/callback')) {
        const parsed = PaymentService.parseCallbackUrl(event.url);
        if (parsed.transactionReference) {
          setTransactionRef(parsed.transactionReference);
        }
        setPaymentStatus(parsed.status);
        setIsSubmitting(false);
      }
    });

    return () => {
      backSub.remove();
      urlSub.remove();
    };
  }, [paymentStatus]);

  const handleProcessPayment = async () => {
    if (isSubmitting) return; // Prevent duplicate submission (idempotency check)
    setIsSubmitting(true);
    setPaymentStatus('PROCESSING');

    const handshake = PaymentService.initiateGatewayHandshake(
      amount,
      selectedMethod,
      description,
      serviceCategory as any
    );
    setTransactionRef(handshake.transactionReference);

    if (selectedMethod === 'cash') {
      // Cash on Arrival completes immediately
      setTimeout(() => {
        setPaymentStatus('COMPLETED');
        setIsSubmitting(false);
      }, 900);
      return;
    }

    // Try opening external native app or web gateway (Telebirr / Chapa / CBE)
    const launchedExternal = await PaymentService.openPaymentGateway(handshake);

    // If external app could not launch or in simulator/dev, complete after simulation
    setTimeout(() => {
      setPaymentStatus('COMPLETED');
      setIsSubmitting(false);
    }, launchedExternal ? 4000 : 2000);
  };

  const handleRetry = () => {
    setPaymentStatus('PENDING');
    setIsSubmitting(false);
  };

  const handleFinish = () => {
    router.replace('/(tabs)/bookings');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title={t('title')}
        showBack
        onBack={() => {
          if (paymentStatus === 'PROCESSING') return; // Do not interrupt in flight
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)');
          }
        }}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {paymentStatus === 'PROCESSING' && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.colors.primaryDark} />
            <Text style={styles.processingTitle}>{t('processing')}</Text>
            <Text style={styles.processingDesc}>
              {mockPaymentMethods.find((m) => m.id === selectedMethod)?.name}
            </Text>
            <View style={styles.securityBadge}>
              <Lock size={14} color="#059669" />
              <Text style={styles.securityBadgeText}>256-Bit Encrypted</Text>
            </View>
          </View>
        )}

        {paymentStatus === 'COMPLETED' && (
          <View style={styles.centerContainer}>
            <CheckCircle2 size={58} color={theme.colors.success} />
            <Text style={styles.successTitle}>{t('successTitle')}</Text>
            <Text style={styles.successAmount}>{formatETB(amount)}</Text>
            <Text style={styles.successRef}>{t('referenceNumber', { ref: transactionRef })}</Text>
            <Text style={styles.successDesc}>
              {t('successMsg', { amount: formatETB(amount) })}
            </Text>
            <PrimaryButton
              title={t('backToBookings')}
              onPress={handleFinish}
              style={styles.doneBtn}
            />
          </View>
        )}

        {paymentStatus === 'FAILED' && (
          <View style={styles.centerContainer}>
            <XCircle size={58} color={theme.colors.danger} />
            <Text style={styles.failedTitle}>{t('failedTitle')}</Text>
            <Text style={styles.failedDesc}>
              {t('failedMsg')}
            </Text>
            <PrimaryButton
              title={t('common:retry')}
              onPress={handleRetry}
              style={styles.retryBtn}
            />
          </View>
        )}

        {paymentStatus === 'PENDING' && (
          <>
            {/* Amount Banner */}
            <View style={styles.amountBanner}>
              <Text style={styles.amountLabel}>{t('orderTotal')}</Text>
              <Text style={styles.amountValue}>{formatETB(amount)}</Text>
              <Text style={styles.serviceDesc}>{description}</Text>
            </View>

            {/* Select Method */}
            <Text style={styles.sectionTitle}>{t('subtitle')}</Text>
            <View style={styles.methodsList}>
              {mockPaymentMethods.map((method) => (
                <PaymentMethodCard
                  key={method.id}
                  method={method}
                  isSelected={selectedMethod === method.id}
                  onSelect={() => setSelectedMethod(method.id)}
                />
              ))}
            </View>

            {/* Price Breakdown */}
            <Text style={styles.sectionTitle}>{t('summary')}</Text>
            <PriceBreakdown
              items={breakdownItems}
              total={amount}
              style={styles.priceBreakdown}
            />

            {/* Security Notice */}
            <View style={styles.securityFooter}>
              <ShieldCheck size={18} color="#059669" />
              <Text style={styles.securityText}>
                {t('serviceFeeNotice')}
              </Text>
            </View>

            {/* Pay Button */}
            <PrimaryButton
              title={t('payBtn', { amount: formatETB(amount) })}
              onPress={handleProcessPayment}
              disabled={isSubmitting}
              style={styles.payBtn}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  amountBanner: {
    backgroundColor: theme.colors.secondary,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  amountLabel: {
    ...theme.typography.captionBold,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountValue: {
    ...theme.typography.h1,
    color: theme.colors.primary,
    marginTop: 4,
  },
  serviceDesc: {
    ...theme.typography.caption,
    color: '#E2E8F0',
    marginTop: 4,
    textAlign: 'center',
  },
  sectionTitle: {
    ...theme.typography.h4,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  methodsList: {
    marginBottom: theme.spacing.md,
  },
  priceBreakdown: {
    marginBottom: theme.spacing.md,
  },
  securityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  securityText: {
    ...theme.typography.caption,
    color: '#065F46',
    flex: 1,
    lineHeight: 16,
  },
  payBtn: {
    width: '100%',
  },
  centerContainer: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  processingTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  processingDesc: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    marginTop: theme.spacing.lg,
  },
  securityBadgeText: {
    ...theme.typography.captionBold,
    color: '#047857',
  },
  successTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  successAmount: {
    ...theme.typography.h1,
    color: theme.colors.primaryDark,
    marginVertical: theme.spacing.xs,
  },
  successRef: {
    ...theme.typography.captionBold,
    color: theme.colors.textMuted,
  },
  successDesc: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  doneBtn: {
    width: '100%',
  },
  failedTitle: {
    ...theme.typography.h2,
    color: theme.colors.danger,
    marginTop: theme.spacing.md,
  },
  failedDesc: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginVertical: theme.spacing.md,
  },
  retryBtn: {
    width: '100%',
  },
});
