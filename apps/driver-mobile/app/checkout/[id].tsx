import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle2, Info, Landmark, Receipt } from 'lucide-react-native';
import { CardShadow, Colors, Radius, Spacing } from '../../src/theme/tokens';
import { useDriverStore } from '../../src/store/useDriverStore';
import {
  DEMO_TARIFF_CONFIG,
  PLACEHOLDER_FINANCIAL_INSTITUTIONS,
} from '../../src/data/mockDriverData';
import {
  calculateDemoFare,
  mockSubmitPaymentReference,
} from '../../src/services/mockDriverService';
import { QrPlaceholder } from '../../src/components/QrPlaceholder';
import { StatusPill } from '../../src/components/StatusPill';

export default function CheckoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const rides = useDriverStore((s) => s.rides);
  const submitRidePayment = useDriverStore((s) => s.submitRidePayment);
  const completeCheckout = useDriverStore((s) => s.completeCheckout);

  const ride = rides.find((r) => r.id === id);

  const [selectedInstId, setSelectedInstId] = useState(
    PLACEHOLDER_FINANCIAL_INSTITUTIONS[0].id
  );
  const [transactionRef, setTransactionRef] = useState(ride?.paymentReference || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const breakdown = useMemo(() => {
    if (!ride) return null;
    return calculateDemoFare(
      ride.actualDistanceKm ?? ride.estimatedDistanceKm,
      ride.actualDurationMin ?? ride.estimatedDurationMin
    );
  }, [ride]);

  if (!ride || !breakdown) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>Checkout Trip Not Found</Text>
          <Pressable onPress={() => router.replace('/(tabs)/rides')} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Back to Rides</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const isSubmitted =
    ride.status === 'PAYMENT_PENDING_VERIFICATION' ||
    ride.paymentVerificationStatus === 'PENDING_VERIFICATION';

  const selectedInst =
    PLACEHOLDER_FINANCIAL_INSTITUTIONS.find((i) => i.id === selectedInstId) ||
    PLACEHOLDER_FINANCIAL_INSTITUTIONS[0];

  const handleSubmitPayment = async () => {
    if (isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    try {
      const res = await mockSubmitPaymentReference({
        rideId: ride.id,
        institutionName: selectedInst.name,
        transactionReference: transactionRef,
      });
      if (!res.success) {
        setError(res.error || 'Unable to submit payment reference.');
        return;
      }
      submitRidePayment(ride.id, selectedInst.name, transactionRef);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDone = () => {
    completeCheckout(ride.id);
    router.replace('/(tabs)/rides');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Trip Summary */}
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.refCode}>{ride.referenceCode} • CHECKOUT</Text>
                <Text style={styles.passengerName}>{ride.passengerName}</Text>
              </View>
              <StatusPill
                status={isSubmitted ? 'PAYMENT_PENDING_VERIFICATION' : 'AWAITING_PAYMENT'}
              />
            </View>
            <Text style={styles.routeLine}>From: {ride.pickupLocation}</Text>
            <Text style={styles.routeLine}>To: {ride.destination}</Text>
            <View style={styles.metricsRow}>
              <Text style={styles.metricText}>
                Distance: {breakdown.distanceKm.toFixed(1)} km
              </Text>
              <Text style={styles.metricText}>
                Duration: {breakdown.durationMin} min
              </Text>
            </View>
          </View>

          {/* Fare Breakdown */}
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>Simulated Fare Breakdown</Text>
            <View style={styles.lineItem}>
              <Text style={styles.lineLabel}>Base Fare (Demo)</Text>
              <Text style={styles.lineValue}>ETB {breakdown.baseFareETB}</Text>
            </View>
            <View style={styles.lineItem}>
              <Text style={styles.lineLabel}>
                Distance Tariff ({breakdown.distanceKm.toFixed(1)} km × ETB {DEMO_TARIFF_CONFIG.perKmETB})
              </Text>
              <Text style={styles.lineValue}>ETB {breakdown.distanceFareETB}</Text>
            </View>
            <View style={styles.lineItem}>
              <Text style={styles.lineLabel}>
                Time Tariff ({breakdown.durationMin} min × ETB {DEMO_TARIFF_CONFIG.perMinuteETB})
              </Text>
              <Text style={styles.lineValue}>ETB {breakdown.timeFareETB}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Simulated Fare</Text>
              <Text style={styles.totalValue}>
                ETB {breakdown.totalFareETB.toLocaleString()}
              </Text>
            </View>
            <View style={styles.disclaimerBox}>
              <Info size={14} color={Colors.secondaryText} />
              <Text style={styles.disclaimerText}>
                UI demonstration values only — not official Kings Taxi pricing.
              </Text>
            </View>
          </View>

          {/* Illustrative QR & Placeholder Financial Institutions */}
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>Payment Channel Placeholders</Text>
            <QrPlaceholder />

            <View style={styles.instList}>
              {PLACEHOLDER_FINANCIAL_INSTITUTIONS.map((inst) => {
                const active = inst.id === selectedInstId;
                return (
                  <Pressable
                    key={inst.id}
                    onPress={() => !isSubmitted && setSelectedInstId(inst.id)}
                    style={[styles.instCard, active && styles.instCardActive]}
                  >
                    <Landmark size={16} color={Colors.primaryBlack} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.instName}>{inst.name}</Text>
                      <Text style={styles.instAccount}>
                        {inst.accountTitle} • {inst.accountNumberPlaceholder}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Payment Reference Submission */}
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>Transaction Reference</Text>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {!isSubmitted ? (
              <>
                <View style={styles.inputWrap}>
                  <Receipt size={18} color={Colors.secondaryText} />
                  <TextInput
                    style={styles.input}
                    value={transactionRef}
                    onChangeText={setTransactionRef}
                    placeholder="Enter demo reference (e.g. DEMO-TX-1024)"
                    placeholderTextColor={Colors.metallicMuted}
                    autoCapitalize="characters"
                  />
                </View>

                <Pressable
                  onPress={handleSubmitPayment}
                  disabled={isSubmitting}
                  style={styles.primaryBtn}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={Colors.cardWhite} size="small" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Submit Payment Reference</Text>
                  )}
                </Pressable>
              </>
            ) : (
              <View style={styles.pendingVerifyBox}>
                <CheckCircle2 size={24} color={Colors.warning} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.pendingTitle}>
                    Simulated Verification Pending
                  </Text>
                  <Text style={styles.pendingText}>
                    Reference <Text style={styles.bold}>{ride.paymentReference}</Text> recorded under{' '}
                    {ride.paymentInstitution}. In Phase 1, payment verification is visibly simulated and does not verify a live bank transaction.
                  </Text>
                </View>
              </View>
            )}
          </View>

          {isSubmitted && (
            <Pressable
              onPress={handleDone}
              style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}
            >
              <Text style={styles.primaryBtnText}>Done &amp; Save to Ride History</Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.screenBg },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 36 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: Colors.primaryBlack },
  card: {
    backgroundColor: Colors.cardWhite,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    ...CardShadow,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  refCode: { fontSize: 11, fontWeight: '700', color: Colors.secondaryText, letterSpacing: 0.5 },
  passengerName: { fontSize: 18, fontWeight: '800', color: Colors.primaryBlack, marginTop: 2 },
  routeLine: { fontSize: 13, color: Colors.secondaryText, marginTop: 3 },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  metricText: { fontSize: 13, fontWeight: '700', color: Colors.primaryBlack },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: Spacing.md,
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  lineLabel: { fontSize: 13, color: Colors.secondaryText, flex: 1, paddingRight: 8 },
  lineValue: { fontSize: 13, fontWeight: '700', color: Colors.primaryBlack },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  totalLabel: { fontSize: 15, fontWeight: '800', color: Colors.primaryBlack },
  totalValue: { fontSize: 22, fontWeight: '800', color: Colors.primaryBlack },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.md,
    backgroundColor: Colors.screenBg,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
  },
  disclaimerText: { flex: 1, fontSize: 11, color: Colors.secondaryText },
  instList: { marginTop: Spacing.lg, gap: 8 },
  instCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.screenBg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  instCardActive: {
    borderColor: Colors.primaryBlack,
    backgroundColor: Colors.surfaceSubtle,
  },
  instName: { fontSize: 13, fontWeight: '700', color: Colors.primaryBlack },
  instAccount: { fontSize: 12, color: Colors.secondaryText, marginTop: 2 },
  errorBox: {
    backgroundColor: Colors.errorBg,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  errorText: { fontSize: 13, color: Colors.error, fontWeight: '600' },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.screenBg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 48,
    gap: 10,
    marginBottom: Spacing.md,
  },
  input: { flex: 1, fontSize: 14, color: Colors.primaryBlack, fontWeight: '600' },
  primaryBtn: {
    backgroundColor: Colors.primaryBlack,
    borderRadius: Radius.md,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primaryBtnText: { color: Colors.cardWhite, fontSize: 15, fontWeight: '700' },
  pendingVerifyBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.warningBg,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#F3D8A0',
  },
  pendingTitle: { fontSize: 14, fontWeight: '800', color: Colors.warning, marginBottom: 3 },
  pendingText: { fontSize: 12, lineHeight: 18, color: Colors.primaryBlack },
  bold: { fontWeight: '800' },
});
