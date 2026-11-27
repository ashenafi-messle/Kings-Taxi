import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Clock, MapPin, Navigation, Phone, Play, ShieldAlert } from 'lucide-react-native';
import { CardShadow, Colors, Radius, Spacing } from '../../src/theme/tokens';
import { useDriverStore } from '../../src/store/useDriverStore';
import { StatusPill } from '../../src/components/StatusPill';

export default function RideDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const rides = useDriverStore((s) => s.rides);
  const startTrip = useDriverStore((s) => s.startTrip);

  const [actionError, setActionError] = useState('');

  const ride = rides.find((r) => r.id === id);

  if (!ride) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.notFoundBox}>
          <Text style={styles.notFoundTitle}>Ride Not Found</Text>
          <Text style={styles.notFoundText}>
            The requested ride record could not be located.
          </Text>
          <Pressable onPress={() => router.back()} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const handleStartTrip = () => {
    setActionError('');
    const res = startTrip(ride.id);
    if (!res.ok) {
      setActionError(res.error || 'Unable to start trip.');
      return;
    }
    router.replace('/(tabs)/trips');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary Header */}
        <View style={styles.card}>
          <View style={styles.topRow}>
            <View>
              <Text style={styles.refCode}>{ride.referenceCode}</Text>
              <Text style={styles.serviceTitle}>{ride.requestedService}</Text>
            </View>
            <StatusPill status={ride.status} />
          </View>

          <View style={styles.passengerRow}>
            <Image source={{ uri: ride.passengerAvatar }} style={styles.avatar} />
            <View style={{ flex: 1 }}>
              <Text style={styles.passengerName}>{ride.passengerName}</Text>
              <View style={styles.phoneRow}>
                <Phone size={13} color={Colors.secondaryText} />
                <Text style={styles.phoneText}>{ride.passengerPhone}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Route & Schedule */}
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>Route &amp; Schedule</Text>
          <View style={styles.routeItem}>
            <View style={styles.pinStart}>
              <Navigation size={14} color={Colors.primaryBlack} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.routeLabel}>Pickup Location</Text>
              <Text style={styles.routeValue}>{ride.pickupLocation}</Text>
            </View>
          </View>

          <View style={styles.routeDivider} />

          <View style={styles.routeItem}>
            <View style={styles.pinEnd}>
              <MapPin size={14} color={Colors.cardWhite} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.routeLabel}>Destination</Text>
              <Text style={styles.routeValue}>{ride.destination}</Text>
            </View>
          </View>

          <View style={styles.metaGrid}>
            <View style={styles.metaCell}>
              <Calendar size={14} color={Colors.secondaryText} />
              <Text style={styles.metaCellText}>{ride.requestDate}</Text>
            </View>
            <View style={styles.metaCell}>
              <Clock size={14} color={Colors.secondaryText} />
              <Text style={styles.metaCellText}>{ride.requestTime}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaCellBold}>
                {(ride.actualDistanceKm ?? ride.estimatedDistanceKm).toFixed(1)} km
              </Text>
            </View>
          </View>

          {ride.notes ? (
            <View style={styles.notesBox}>
              <Text style={styles.notesLabel}>Passenger Notes</Text>
              <Text style={styles.notesText}>{ride.notes}</Text>
            </View>
          ) : null}
        </View>

        {/* Fare Card */}
        <View style={styles.card}>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>
              {ride.finalFareETB ? 'Final Simulated Fare' : 'Estimated Fare'}
            </Text>
            <Text style={styles.fareValue}>
              ETB {(ride.finalFareETB ?? ride.estimatedPriceETB).toLocaleString()}
            </Text>
          </View>
          {ride.paymentReference ? (
            <Text style={styles.paymentMeta}>
              Payment Ref: {ride.paymentReference} ({ride.paymentInstitution})
            </Text>
          ) : null}
        </View>

        {actionError ? (
          <View style={styles.errorBox}>
            <ShieldAlert size={16} color={Colors.error} />
            <Text style={styles.errorText}>{actionError}</Text>
          </View>
        ) : null}

        {/* State-Specific Actions */}
        {ride.status === 'PENDING' && (
          <Pressable
            onPress={handleStartTrip}
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}
          >
            <Play size={16} color={Colors.cardWhite} fill={Colors.cardWhite} />
            <Text style={styles.primaryBtnText}>Start Trip</Text>
          </Pressable>
        )}

        {ride.status === 'CONFIRMED' && (
          <View style={styles.infoBanner}>
            <Text style={styles.infoBannerTitle}>Confirmed Scheduled Ride</Text>
            <Text style={styles.infoBannerText}>
              This ride is confirmed for {ride.requestDate} at {ride.requestTime}. Confirmed scheduled rides cannot be started early from this preview.
            </Text>
          </View>
        )}

        {ride.status === 'IN_PROGRESS' && (
          <Pressable
            onPress={() => router.replace('/(tabs)/trips')}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryBtnText}>Open Active Trip Monitor</Text>
          </Pressable>
        )}

        {(ride.status === 'AWAITING_PAYMENT' ||
          ride.status === 'PAYMENT_PENDING_VERIFICATION') && (
          <Pressable
            onPress={() => router.push(`/checkout/${ride.id}`)}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryBtnText}>Open Checkout &amp; Payment</Text>
          </Pressable>
        )}

        {(ride.status === 'COMPLETED' || ride.status === 'CANCELLED') && (
          <View style={styles.infoBanner}>
            <Text style={styles.infoBannerTitle}>Historical Record</Text>
            <Text style={styles.infoBannerText}>
              {ride.status === 'COMPLETED'
                ? `Completed ${ride.completedAt || ''}. Displayed for driver history.`
                : `Cancelled ${ride.completedAt || ''}. Displayed for driver history.`}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.screenBg },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 32 },
  card: {
    backgroundColor: Colors.cardWhite,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    ...CardShadow,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: Spacing.lg,
  },
  refCode: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.secondaryText,
    letterSpacing: 0.6,
  },
  serviceTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.primaryBlack,
    marginTop: 2,
  },
  passengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.lightSilver },
  passengerName: { fontSize: 16, fontWeight: '700', color: Colors.primaryBlack },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  phoneText: { fontSize: 13, color: Colors.secondaryText },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: Spacing.md,
  },
  routeItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pinStart: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.lightSilver,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinEnd: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primaryBlack,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeDivider: {
    width: 1.5,
    height: 16,
    backgroundColor: Colors.primarySilver,
    marginLeft: 13,
    marginVertical: 4,
  },
  routeLabel: { fontSize: 11, color: Colors.secondaryText, fontWeight: '600' },
  routeValue: { fontSize: 14, fontWeight: '700', color: Colors.primaryBlack, marginTop: 1 },
  metaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  metaCell: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaCellText: { fontSize: 13, color: Colors.secondaryText, fontWeight: '600' },
  metaCellBold: { fontSize: 13, color: Colors.primaryBlack, fontWeight: '800' },
  notesBox: {
    marginTop: Spacing.md,
    backgroundColor: Colors.screenBg,
    borderRadius: Radius.sm,
    padding: Spacing.md,
  },
  notesLabel: { fontSize: 11, fontWeight: '700', color: Colors.secondaryText, marginBottom: 2 },
  notesText: { fontSize: 13, color: Colors.primaryBlack },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fareLabel: { fontSize: 14, fontWeight: '600', color: Colors.secondaryText },
  fareValue: { fontSize: 22, fontWeight: '800', color: Colors.primaryBlack },
  paymentMeta: { fontSize: 12, color: Colors.secondaryText, marginTop: 6 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.errorBg,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#F5C2C2',
  },
  errorText: { flex: 1, fontSize: 13, color: Colors.error, fontWeight: '600' },
  primaryBtn: {
    backgroundColor: Colors.primaryBlack,
    borderRadius: Radius.md,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: { color: Colors.cardWhite, fontSize: 15, fontWeight: '700' },
  infoBanner: {
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primarySilver,
    padding: Spacing.lg,
  },
  infoBannerTitle: { fontSize: 14, fontWeight: '700', color: Colors.primaryBlack, marginBottom: 4 },
  infoBannerText: { fontSize: 13, lineHeight: 19, color: Colors.secondaryText },
  notFoundBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl, gap: 12 },
  notFoundTitle: { fontSize: 18, fontWeight: '800', color: Colors.primaryBlack },
  notFoundText: { fontSize: 13, color: Colors.secondaryText, textAlign: 'center' },
});
