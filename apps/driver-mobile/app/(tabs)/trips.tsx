import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Car, Clock, Navigation, Phone, Square } from 'lucide-react-native';
import { CardShadow, Colors, Radius, Spacing } from '../../src/theme/tokens';
import { useDriverStore } from '../../src/store/useDriverStore';
import { ActiveTripMap } from '../../src/components/ActiveTripMap';
import { StatusPill } from '../../src/components/StatusPill';
import { ConfirmModal } from '../../src/components/ConfirmModal';

function formatElapsed(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function ActiveTripScreen() {
  const router = useRouter();
  const activeTrip = useDriverStore((s) => s.activeTrip);
  const rides = useDriverStore((s) => s.rides);
  const tickActiveTrip = useDriverStore((s) => s.tickActiveTrip);
  const endActiveTrip = useDriverStore((s) => s.endActiveTrip);
  const setSelectedRideTab = useDriverStore((s) => s.setSelectedRideTab);

  const [confirmEndOpen, setConfirmEndOpen] = useState(false);

  const activeRide = activeTrip
    ? rides.find((r) => r.id === activeTrip.rideId)
    : undefined;
  const awaitingPaymentRide = !activeTrip
    ? rides.find(
        (r) =>
          r.status === 'AWAITING_PAYMENT' ||
          r.status === 'PAYMENT_PENDING_VERIFICATION'
      )
    : undefined;

  useEffect(() => {
    if (!activeTrip?.isSimulating) return;
    const timer = setInterval(() => {
      tickActiveTrip();
    }, 1000);
    return () => clearInterval(timer);
  }, [activeTrip?.isSimulating, tickActiveTrip]);

  const handleConfirmEndTrip = () => {
    setConfirmEndOpen(false);
    const res = endActiveTrip();
    if (res.ok && res.rideId) {
      router.push(`/checkout/${res.rideId}`);
    }
  };

  if (!activeTrip || !activeRide) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Active Trip</Text>
          <Text style={styles.subtitle}>Live trip telemetry & route simulation</Text>
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Car size={30} color={Colors.primaryBlack} />
            </View>
            <Text style={styles.emptyTitle}>No Active Trip</Text>
            <Text style={styles.emptyDesc}>
              Select a pending ride request and tap Start Trip to launch the simulated trip monitor.
            </Text>
            {awaitingPaymentRide ? (
              <Pressable
                onPress={() => router.push(`/checkout/${awaitingPaymentRide.id}`)}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>
                  Resume Checkout ({awaitingPaymentRide.referenceCode})
                </Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => {
                  setSelectedRideTab('PENDING');
                  router.push('/(tabs)/rides');
                }}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>Browse Pending Rides</Text>
              </Pressable>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.title}>Active Trip</Text>
            <Text style={styles.subtitle}>Ref: {activeRide.referenceCode} • {activeRide.requestedService}</Text>
          </View>
          <StatusPill status={activeRide.status} />
        </View>

        <ActiveTripMap
          pickupLocation={activeRide.pickupLocation}
          destination={activeRide.destination}
          pickupCoords={activeRide.pickupCoords}
          destinationCoords={activeRide.destinationCoords}
        />

        {/* Telemetry Simulation Row */}
        <View style={styles.telemetryRow}>
          <View style={styles.telemetryCard}>
            <Clock size={18} color={Colors.primaryBlack} />
            <Text style={styles.telemetryValue}>{formatElapsed(activeTrip.elapsedSeconds)}</Text>
            <Text style={styles.telemetryLabel}>Trip Timer (Sim)</Text>
          </View>
          <View style={styles.telemetryCard}>
            <Navigation size={18} color={Colors.primaryBlack} />
            <Text style={styles.telemetryValue}>
              {activeTrip.simulatedDistanceKm.toFixed(2)} km
            </Text>
            <Text style={styles.telemetryLabel}>Distance (Sim)</Text>
          </View>
        </View>

        {/* Passenger Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Passenger Information</Text>
          <View style={styles.passengerRow}>
            <Image source={{ uri: activeRide.passengerAvatar }} style={styles.avatar} />
            <View style={{ flex: 1 }}>
              <Text style={styles.passengerName}>{activeRide.passengerName}</Text>
              <View style={styles.phoneRow}>
                <Phone size={13} color={Colors.secondaryText} />
                <Text style={styles.phoneText}>{activeRide.passengerPhone}</Text>
              </View>
            </View>
          </View>
          {activeRide.notes ? (
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>Note: {activeRide.notes}</Text>
            </View>
          ) : null}
        </View>

        {/* End Trip Button */}
        <Pressable
          onPress={() => setConfirmEndOpen(true)}
          style={({ pressed }) => [styles.endTripBtn, pressed && { opacity: 0.9 }]}
        >
          <Square size={16} color={Colors.cardWhite} fill={Colors.cardWhite} />
          <Text style={styles.endTripText}>End Trip & Proceed to Checkout</Text>
        </Pressable>
      </ScrollView>

      <ConfirmModal
        visible={confirmEndOpen}
        title="End Active Trip?"
        message="Ending this simulated trip will calculate the demonstration fare and open the Checkout screen."
        confirmLabel="End Trip"
        onConfirm={handleConfirmEndTrip}
        onCancel={() => setConfirmEndOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.screenBg },
  header: {
    backgroundColor: Colors.cardWhite,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  content: { padding: Spacing.lg, paddingBottom: 32, gap: Spacing.lg },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  title: { fontSize: 21, fontWeight: '800', color: Colors.primaryBlack },
  subtitle: { fontSize: 13, color: Colors.secondaryText, marginTop: 2 },
  telemetryRow: { flexDirection: 'row', gap: 12 },
  telemetryCard: {
    flex: 1,
    backgroundColor: Colors.cardWhite,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: 6,
    ...CardShadow,
  },
  telemetryValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primaryBlack,
  },
  telemetryLabel: {
    fontSize: 12,
    color: Colors.secondaryText,
    fontWeight: '600',
  },
  card: {
    backgroundColor: Colors.cardWhite,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    ...CardShadow,
  },
  cardHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: Spacing.md,
  },
  passengerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.lightSilver,
  },
  passengerName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primaryBlack,
  },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  phoneText: { fontSize: 13, color: Colors.secondaryText, fontWeight: '500' },
  notesBox: {
    marginTop: Spacing.md,
    backgroundColor: Colors.screenBg,
    borderRadius: Radius.sm,
    padding: Spacing.md,
  },
  notesText: { fontSize: 12, color: Colors.secondaryText },
  endTripBtn: {
    backgroundColor: Colors.primaryBlack,
    borderRadius: Radius.md,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  endTripText: { color: Colors.cardWhite, fontSize: 15, fontWeight: '700' },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyCard: {
    backgroundColor: Colors.cardWhite,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xxl,
    alignItems: 'center',
    ...CardShadow,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.lightSilver,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primaryBlack,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.secondaryText,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  primaryBtn: {
    backgroundColor: Colors.primaryBlack,
    borderRadius: Radius.md,
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  primaryBtnText: {
    color: Colors.cardWhite,
    fontSize: 14,
    fontWeight: '700',
  },
});
