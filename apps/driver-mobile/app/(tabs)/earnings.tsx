import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Info, TrendingUp, Wallet } from 'lucide-react-native';
import { CardShadow, Colors, Radius, Spacing } from '../../src/theme/tokens';
import { useDriverStore } from '../../src/store/useDriverStore';
import { DEMO_TARIFF_CONFIG } from '../../src/data/mockDriverData';
import { StatusPill } from '../../src/components/StatusPill';

export default function EarningsScreen() {
  const router = useRouter();
  const rides = useDriverStore((s) => s.rides);

  const settledOrCompleted = rides.filter(
    (r) => r.status === 'COMPLETED' || r.status === 'PAYMENT_PENDING_VERIFICATION'
  );
  const totalEarnings = settledOrCompleted.reduce(
    (sum, r) => sum + (r.finalFareETB ?? r.estimatedPriceETB),
    0
  );
  const todayEarnings = settledOrCompleted
    .filter((r) => r.requestDate === 'Today' || r.completedAt === 'Just now')
    .reduce((sum, r) => sum + (r.finalFareETB ?? r.estimatedPriceETB), 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Earnings Overview</Text>
        <Text style={styles.subtitle}>Simulated Phase 1 trip fare summary in ETB</Text>

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <Text style={styles.heroLabel}>Today&apos;s Simulated Earnings</Text>
            <Wallet size={20} color={Colors.lightSilver} />
          </View>
          <Text style={styles.heroValue}>ETB {todayEarnings.toLocaleString()}</Text>
          <View style={styles.heroFooter}>
            <TrendingUp size={14} color={Colors.primarySilver} />
            <Text style={styles.heroMeta}>
              Total recorded ({settledOrCompleted.length} trips): ETB {totalEarnings.toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={styles.tariffCard}>
          <View style={styles.tariffHeader}>
            <Info size={16} color={Colors.primaryBlack} />
            <Text style={styles.tariffTitle}>UI Demonstration Tariff Model</Text>
          </View>
          <Text style={styles.tariffNote}>
            Base ETB {DEMO_TARIFF_CONFIG.baseFareETB} + ETB {DEMO_TARIFF_CONFIG.perKmETB}/km + ETB{' '}
            {DEMO_TARIFF_CONFIG.perMinuteETB}/min. Demonstration values only — not official Kings Taxi pricing.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Completed Trip Fares</Text>
        {settledOrCompleted.length > 0 ? (
          settledOrCompleted.map((ride) => (
            <Pressable
              key={ride.id}
              onPress={() => router.push(`/ride/${ride.id}`)}
              style={styles.txRow}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.txName}>
                  {ride.passengerName} • {ride.referenceCode}
                </Text>
                <Text style={styles.txMeta}>
                  {ride.completedAt || ride.requestDate} •{' '}
                  {ride.paymentReference ? `Ref: ${ride.paymentReference}` : 'No ref'}
                </Text>
                <View style={{ marginTop: 6 }}>
                  <StatusPill
                    status={
                      ride.paymentVerificationStatus === 'PENDING_VERIFICATION'
                        ? 'PAYMENT_PENDING_VERIFICATION'
                        : ride.status
                    }
                  />
                </View>
              </View>
              <Text style={styles.txAmount}>
                ETB {(ride.finalFareETB ?? ride.estimatedPriceETB).toLocaleString()}
              </Text>
            </Pressable>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No completed trips yet.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.screenBg },
  content: { padding: Spacing.lg, paddingBottom: 32 },
  title: { fontSize: 21, fontWeight: '800', color: Colors.primaryBlack },
  subtitle: {
    fontSize: 13,
    color: Colors.secondaryText,
    marginTop: 2,
    marginBottom: Spacing.lg,
  },
  heroCard: {
    backgroundColor: Colors.primaryBlack,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    ...CardShadow,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroLabel: {
    color: Colors.primarySilver,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  heroValue: {
    color: Colors.cardWhite,
    fontSize: 32,
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 10,
  },
  heroFooter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroMeta: { color: Colors.lightSilver, fontSize: 12, fontWeight: '500' },
  tariffCard: {
    backgroundColor: Colors.cardWhite,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  tariffHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  tariffTitle: { fontSize: 14, fontWeight: '700', color: Colors.primaryBlack },
  tariffNote: { fontSize: 12, lineHeight: 18, color: Colors.secondaryText },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primaryBlack,
    marginBottom: Spacing.md,
  },
  txRow: {
    backgroundColor: Colors.cardWhite,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    ...CardShadow,
  },
  txName: { fontSize: 14, fontWeight: '700', color: Colors.primaryBlack },
  txMeta: { fontSize: 12, color: Colors.secondaryText, marginTop: 2 },
  txAmount: { fontSize: 16, fontWeight: '800', color: Colors.primaryBlack },
  emptyCard: {
    backgroundColor: Colors.cardWhite,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: { fontSize: 13, color: Colors.secondaryText },
});
