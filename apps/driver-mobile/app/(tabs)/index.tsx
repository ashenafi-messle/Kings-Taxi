import React from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowRight,
  Car,
  CheckCircle2,
  Compass,
  Navigation,
  Route,
  Wallet,
} from 'lucide-react-native';
import { CardShadow, Colors, Radius, Spacing } from '../../src/theme/tokens';
import { useDriverStore } from '../../src/store/useDriverStore';
import { StatusPill } from '../../src/components/StatusPill';
import { RideCard } from '../../src/components/RideCard';

export default function DriverDashboardScreen() {
  const router = useRouter();
  const profile = useDriverStore((s) => s.profile);
  const isOnline = useDriverStore((s) => s.isOnline);
  const toggleAvailability = useDriverStore((s) => s.toggleAvailability);
  const rides = useDriverStore((s) => s.rides);
  const activeTrip = useDriverStore((s) => s.activeTrip);
  const setSelectedRideTab = useDriverStore((s) => s.setSelectedRideTab);

  const pendingRides = rides.filter((r) => r.status === 'PENDING');
  const confirmedRides = rides.filter((r) => r.status === 'CONFIRMED');
  const completedToday = rides.filter(
    (r) =>
      (r.status === 'COMPLETED' || r.status === 'PAYMENT_PENDING_VERIFICATION') &&
      (r.requestDate === 'Today' || r.completedAt === 'Just now')
  );
  const recentRides = rides.filter(
    (r) => r.status === 'COMPLETED' || r.status === 'CANCELLED'
  );
  const activeRide = activeTrip
    ? rides.find((r) => r.id === activeTrip.rideId)
    : undefined;

  const todayEarningsETB = completedToday.reduce(
    (sum, r) => sum + (r.finalFareETB ?? r.estimatedPriceETB),
    0
  );
  const todayDistanceKm = completedToday.reduce(
    (sum, r) => sum + (r.actualDistanceKm ?? r.estimatedDistanceKm),
    0
  );

  const openRideCategory = (tab: 'PENDING' | 'CONFIRMED' | 'HISTORY') => {
    setSelectedRideTab(tab);
    router.push('/(tabs)/rides');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Greeting */}
        <View style={styles.headerRow}>
          <View style={styles.greetingWrap}>
            <Text style={styles.greetingSub}>Good Day, Captain</Text>
            <Text style={styles.driverName} numberOfLines={1}>
              {profile?.fullName || 'Kings Taxi Driver'}
            </Text>
            <Text style={styles.vehicleLine} numberOfLines={1}>
              {profile?.vehicle.year} {profile?.vehicle.make} {profile?.vehicle.model} •{' '}
              {profile?.vehicle.plateNumber}
            </Text>
          </View>
          <Pressable onPress={() => router.push('/(tabs)/profile')}>
            <Image
              source={{ uri: profile?.avatarUrl }}
              style={styles.avatar}
            />
          </Pressable>
        </View>

        {/* Availability Toggle Card */}
        <View style={styles.availabilityCard}>
          <View style={styles.availLeft}>
            <StatusPill status={isOnline ? 'ONLINE' : 'OFFLINE'} />
            <Text style={styles.availTitle}>
              {isOnline ? 'Accepting Ride Requests' : 'You Are Currently Offline'}
            </Text>
            <Text style={styles.availHint}>
              {isOnline
                ? 'Dispatch status is active in your operating zone.'
                : 'Switch online to receive new passenger dispatches.'}
            </Text>
          </View>
          <Switch
            value={isOnline}
            onValueChange={toggleAvailability}
            trackColor={{ false: Colors.primarySilver, true: Colors.primaryBlack }}
            thumbColor={Colors.cardWhite}
          />
        </View>

        {/* Active Trip Banner */}
        {activeRide && activeTrip ? (
          <Pressable
            onPress={() => router.push('/(tabs)/trips')}
            style={styles.activeBanner}
          >
            <View style={styles.activeBannerTop}>
              <View style={styles.liveChip}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>ACTIVE TRIP IN PROGRESS</Text>
              </View>
              <ArrowRight size={18} color={Colors.cardWhite} />
            </View>
            <Text style={styles.activeBannerTitle} numberOfLines={1}>
              {activeRide.passengerName} → {activeRide.destination}
            </Text>
            <Text style={styles.activeBannerMeta}>
              Simulated distance: {activeTrip.simulatedDistanceKm.toFixed(2)} km • Tap to open Trip Screen
            </Text>
          </Pressable>
        ) : null}

        {/* KPI Metrics Grid */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <View style={styles.kpiIconBox}>
              <CheckCircle2 size={17} color={Colors.primaryBlack} />
            </View>
            <Text style={styles.kpiValue}>{completedToday.length}</Text>
            <Text style={styles.kpiLabel}>Today&apos;s Trips</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={styles.kpiIconBox}>
              <Wallet size={17} color={Colors.primaryBlack} />
            </View>
            <Text style={styles.kpiValue}>ETB {todayEarningsETB.toLocaleString()}</Text>
            <Text style={styles.kpiLabel}>Today&apos;s Earnings</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={styles.kpiIconBox}>
              <Route size={17} color={Colors.primaryBlack} />
            </View>
            <Text style={styles.kpiValue}>{todayDistanceKm.toFixed(1)} km</Text>
            <Text style={styles.kpiLabel}>Total Distance</Text>
          </View>
        </View>

        {/* Quick Navigation */}
        <View style={styles.quickRow}>
          <Pressable
            onPress={() => openRideCategory('PENDING')}
            style={styles.quickBtn}
          >
            <Navigation size={16} color={Colors.primaryBlack} />
            <Text style={styles.quickLabel}>Pending ({pendingRides.length})</Text>
          </Pressable>
          <Pressable
            onPress={() => openRideCategory('CONFIRMED')}
            style={styles.quickBtn}
          >
            <Compass size={16} color={Colors.primaryBlack} />
            <Text style={styles.quickLabel}>Confirmed ({confirmedRides.length})</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(tabs)/trips')}
            style={styles.quickBtn}
          >
            <Car size={16} color={Colors.primaryBlack} />
            <Text style={styles.quickLabel}>Active Trip</Text>
          </Pressable>
        </View>

        {/* Pending Ride Requests */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pending Ride Requests</Text>
          <Pressable onPress={() => openRideCategory('PENDING')}>
            <Text style={styles.seeAll}>View All</Text>
          </Pressable>
        </View>
        {pendingRides.length > 0 ? (
          pendingRides.slice(0, 2).map((ride) => (
            <RideCard
              key={ride.id}
              ride={ride}
              onPressDetails={(id) => router.push(`/ride/${id}`)}
            />
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No pending ride requests at the moment.</Text>
          </View>
        )}

        {/* Confirmed Rides */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Confirmed Rides</Text>
          <Pressable onPress={() => openRideCategory('CONFIRMED')}>
            <Text style={styles.seeAll}>View All</Text>
          </Pressable>
        </View>
        {confirmedRides.length > 0 ? (
          confirmedRides.slice(0, 1).map((ride) => (
            <RideCard
              key={ride.id}
              ride={ride}
              onPressDetails={(id) => router.push(`/ride/${id}`)}
            />
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No upcoming confirmed rides.</Text>
          </View>
        )}

        {/* Recent Rides */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Rides</Text>
          <Pressable onPress={() => openRideCategory('HISTORY')}>
            <Text style={styles.seeAll}>History</Text>
          </Pressable>
        </View>
        {recentRides.slice(0, 2).map((ride) => (
          <RideCard
            key={ride.id}
            ride={ride}
            onPressDetails={(id) => router.push(`/ride/${id}`)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.screenBg },
  content: { padding: Spacing.lg, paddingBottom: 32 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    gap: 12,
  },
  greetingWrap: { flex: 1 },
  greetingSub: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  driverName: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primaryBlack,
    marginTop: 2,
  },
  vehicleLine: {
    fontSize: 12,
    color: Colors.secondaryText,
    marginTop: 3,
    fontWeight: '500',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: Colors.primarySilver,
    backgroundColor: Colors.lightSilver,
  },
  availabilityCard: {
    backgroundColor: Colors.cardWhite,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: Spacing.lg,
    ...CardShadow,
  },
  availLeft: { flex: 1, gap: 4 },
  availTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primaryBlack,
    marginTop: 4,
  },
  availHint: {
    fontSize: 12,
    color: Colors.secondaryText,
    lineHeight: 17,
  },
  activeBanner: {
    backgroundColor: Colors.primaryBlack,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...CardShadow,
  },
  activeBannerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  liveChip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
  },
  liveText: {
    color: Colors.lightSilver,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  activeBannerTitle: {
    color: Colors.cardWhite,
    fontSize: 15,
    fontWeight: '700',
  },
  activeBannerMeta: {
    color: Colors.primarySilver,
    fontSize: 12,
    marginTop: 4,
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: Spacing.lg,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: Colors.cardWhite,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    ...CardShadow,
  },
  kpiIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: Colors.lightSilver,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiValue: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.primaryBlack,
  },
  kpiLabel: {
    fontSize: 11,
    color: Colors.secondaryText,
    marginTop: 2,
    fontWeight: '600',
  },
  quickRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.xl,
  },
  quickBtn: {
    flex: 1,
    backgroundColor: Colors.cardWhite,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: 11,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryBlack,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    marginTop: Spacing.xs,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primaryBlack,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.secondaryText,
  },
  emptyCard: {
    backgroundColor: Colors.cardWhite,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.secondaryText,
  },
});
