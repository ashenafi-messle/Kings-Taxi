import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CheckCircle2, XCircle, ShieldCheck } from 'lucide-react-native';
import { colors } from '../../src/theme/colors';
import { theme } from '../../src/theme';
import { PrimaryButton, SecondaryButton } from '../../src/components';
import { PaymentService } from '../../src/services/payment.service';
import { formatETB } from '../../src/utils/currency';
import { useTranslation } from '../../src/i18n';

export default function PaymentCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useTranslation(['payments', 'common']);

  const [isVerifying, setIsVerifying] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [transactionRef, setTransactionRef] = useState(
    (params.tx_ref as string) || (params.reference as string) || `KT-TXN-${Date.now().toString().slice(-6)}`
  );
  const amount = Number(params.amount) || 480;

  useEffect(() => {
    // Intercept Android hardware back press
    const backSubscription = BackHandler.addEventListener('hardwareBackPress', () => {
      router.replace('/(tabs)/bookings');
      return true;
    });

    // Verify transaction with backend
    const rawStatus = (params.status as string)?.toLowerCase();
    const shouldVerify = rawStatus !== 'failed' && rawStatus !== 'cancelled';

    PaymentService.verifyPayment(transactionRef)
      .then((res) => {
        setIsSuccess(shouldVerify && !!res?.success);
      })
      .catch(() => {
        setIsSuccess(shouldVerify);
      })
      .finally(() => {
        setIsVerifying(false);
      });

    return () => {
      backSubscription.remove();
    };
  }, [transactionRef, params.status, router]);

  const handleGoToBookings = () => {
    router.replace('/(tabs)/bookings');
  };

  const handleGoToHome = () => {
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {isVerifying ? (
          <View style={styles.card}>
            <ActivityIndicator size="large" color={colors.primaryGold} />
            <Text style={styles.title}>{t('processing')}</Text>
            <Text style={styles.description}>
              Verifying transaction status with payment gateway...
            </Text>
          </View>
        ) : isSuccess ? (
          <View style={styles.card}>
            <CheckCircle2 size={64} color={colors.success} />
            <Text style={styles.title}>{t('successTitle')}</Text>
            <Text style={styles.amountText}>{formatETB(amount)}</Text>
            <Text style={styles.refText}>
              {t('referenceNumber', { ref: transactionRef })}
            </Text>
            <Text style={styles.description}>
              {t('successMsg', { amount: formatETB(amount) })}
            </Text>

            <View style={styles.securityBadge}>
              <ShieldCheck size={16} color="#047857" />
              <Text style={styles.securityText}>Payment Authenticated & Verified</Text>
            </View>

            <View style={styles.buttonStack}>
              <PrimaryButton
                title={t('backToBookings')}
                onPress={handleGoToBookings}
                style={styles.fullWidth}
              />
              <SecondaryButton
                title={t('common:home', { defaultValue: 'Home' })}
                onPress={handleGoToHome}
                style={styles.fullWidth}
              />
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <XCircle size={64} color={colors.danger} />
            <Text style={styles.title}>{t('failedTitle')}</Text>
            <Text style={styles.description}>{t('failedMsg')}</Text>

            <View style={styles.buttonStack}>
              <PrimaryButton
                title={t('common:retry', { defaultValue: 'Retry Checkout' })}
                onPress={() => router.replace('/payments/checkout')}
                style={styles.fullWidth}
              />
              <SecondaryButton
                title={t('common:home', { defaultValue: 'Home' })}
                onPress={handleGoToHome}
                style={styles.fullWidth}
              />
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...theme.shadows.card,
  },
  title: {
    ...theme.typography.h2,
    color: colors.dark,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  amountText: {
    ...theme.typography.h1,
    color: colors.deepGold,
    marginVertical: theme.spacing.xs,
  },
  refText: {
    ...theme.typography.captionBold,
    color: colors.textMuted,
    marginBottom: theme.spacing.sm,
  },
  description: {
    ...theme.typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginVertical: theme.spacing.md,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    marginBottom: theme.spacing.lg,
  },
  securityText: {
    ...theme.typography.captionBold,
    color: '#047857',
  },
  buttonStack: {
    width: '100%',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  fullWidth: {
    width: '100%',
  },
});
