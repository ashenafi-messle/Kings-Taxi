import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Phone,
  MessageSquare,
  ShieldAlert,
  XCircle,
  PlayCircle,
  CheckCircle,
  MapPin,
  Navigation,
} from 'lucide-react-native';
import { theme } from '../../src/theme';
import {
  AppHeader,
  InteractiveMap,
  StatusBadge,
  PrimaryButton,
  SecondaryButton,
  ConfirmationModal,
} from '../../src/components';
import { useRideStore } from '../../src/stores';
import { formatETB } from '../../src/utils/currency';

export default function ActiveRideScreen() {
  const router = useRouter();
  const { currentRide, simulateNextRideStep, cancelRide, completePayment, resetRide } =
    useRideStore();

  const [showCancelModal, setShowCancelModal] = useState(false);

  // If no ride exists, render fallback
  if (!currentRide) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="Active Ride" showBack />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Active Ride</Text>
          <Text style={styles.emptySubtitle}>You do not have a ride in progress.</Text>
          <PrimaryButton
            title="Book a Ride"
            onPress={() => router.replace('/rides/book')}
            style={styles.bookBtn}
          />
        </View>
      </SafeAreaView>
    );
  }

  const { driver, status, pickup, destination, estimatedPrice, finalPrice } = currentRide;

  const handleNextStep = () => {
    if (status === 'TRIP_COMPLETED' || status === 'PAYMENT_PENDING') {
      completePayment();
      router.replace('/rides/receipt');
    } else {
      simulateNextRideStep();
    }
  };

  const handleConfirmCancel = () => {
    setShowCancelModal(false);
    cancelRide('Passenger cancelled via app');
    router.replace('/(tabs)');
  };

  const getStatusHeadline = () => {
    switch (status) {
      case 'SEARCHING_DRIVER':
        return 'Connecting with nearby drivers...';
      case 'DRIVER_ASSIGNED':
        return 'Driver Assigned & Confirmed';
      case 'DRIVER_ARRIVING':
        return 'Driver is heading to your pickup';
      case 'DRIVER_ARRIVED':
        return 'Driver has arrived at pickup point!';
      case 'TRIP_STARTED':
        return 'On the way to destination';
      case 'TRIP_COMPLETED':
        return 'Trip Completed — Ready for Payment';
      case 'PAYMENT_PENDING':
        return 'Payment Pending Confirmation';
      case 'PAYMENT_COMPLETED':
        return 'Trip & Payment Completed!';
      case 'CANCELLED':
        return 'Ride Cancelled';
      default:
        return 'Kings Taxi Service';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Live Trip Status"
        rightAction={<StatusBadge status={status} />}
        showBack
        onBack={() => router.replace('/(tabs)')}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Map Telematics View */}
        <InteractiveMap
          pickupCoords={pickup.coordinates}
          destinationCoords={destination.coordinates}
          driverCoords={driver?.currentLocation}
          height={220}
          style={styles.map}
        />

        {/* Status Headline Card */}
        <View style={styles.statusCard}>
          <Text style={styles.statusHeadline}>{getStatusHeadline()}</Text>
          <View style={styles.routePoints}>
            <View style={styles.routeRow}>
              <Navigation size={14} color={theme.colors.success} />
              <Text style={styles.routeText} numberOfLines={1}>
                {pickup.title}
              </Text>
            </View>
            <View style={styles.routeRow}>
              <MapPin size={14} color={theme.colors.danger} />
              <Text style={styles.routeText} numberOfLines={1}>
                {destination.title}
              </Text>
            </View>
          </View>
        </View>

        {/* Driver Details Card (when assigned) */}
        {driver ? (
          <View style={styles.driverCard}>
            <View style={styles.driverTopRow}>
              <Image source={{ uri: driver.photoUrl }} style={styles.driverPhoto} />
              <View style={styles.driverInfo}>
                <Text style={styles.driverName}>{driver.name}</Text>
                <Text style={styles.driverStats}>
                  ★ {driver.rating.toFixed(2)} • {driver.totalTrips} completed trips
                </Text>
                <View style={styles.vehiclePlateRow}>
                  <Text style={styles.vehicleModel}>
                    {driver.vehicleColor} {driver.vehicleMake} {driver.vehicleModel}
                  </Text>
                  <View style={styles.plateBox}>
                    <Text style={styles.plateText}>{driver.vehiclePlate}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Action Buttons for Driver Contact */}
            <View style={styles.driverContactRow}>
              <TouchableOpacity
                style={styles.contactBtn}
                onPress={() => Linking.openURL(`tel:${driver.phone}`)}
              >
                <Phone size={18} color={theme.colors.secondary} />
                <Text style={styles.contactBtnText}>Call Driver</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.contactBtn}
                onPress={() => Linking.openURL(`sms:${driver.phone}`)}
              >
                <MessageSquare size={18} color={theme.colors.secondary} />
                <Text style={styles.contactBtnText}>Send SMS</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.searchingCard}>
            <Text style={styles.searchingTitle}>Locating Available Fleet...</Text>
            <Text style={styles.searchingDesc}>
              We are broadcasting your request to certified Kings Taxi drivers near Bole.
            </Text>
          </View>
        )}

        {/* Fare Overview */}
        <View style={styles.fareRow}>
          <Text style={styles.fareLabel}>Trip Fare (Ethiopian Birr)</Text>
          <Text style={styles.fareValue}>
            {formatETB(finalPrice || estimatedPrice)}
          </Text>
        </View>

        {/* Developer / Demo Simulator Control */}
        <View style={styles.simulationControl}>
          <Text style={styles.simLabel}>Trip State Simulation Controls:</Text>
          <PrimaryButton
            title={`Advance: Step to Next Trip Status`}
            onPress={handleNextStep}
            icon={<PlayCircle size={18} color={theme.colors.text} />}
            style={styles.stepBtn}
          />
        </View>

        {/* Safety & Cancellation Actions */}
        <View style={styles.bottomActions}>
          <SecondaryButton
            title="Cancel Ride"
            onPress={() => setShowCancelModal(true)}
            icon={<XCircle size={18} color={theme.colors.danger} />}
            textStyle={{ color: theme.colors.danger }}
            style={styles.cancelBtn}
          />
          <TouchableOpacity
            style={styles.emergencyBtn}
            onPress={() => router.push('/support/index')}
          >
            <ShieldAlert size={16} color={theme.colors.danger} />
            <Text style={styles.emergencyText}>Emergency & Safety Assistance</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Cancel Confirmation Modal */}
      <ConfirmationModal
        visible={showCancelModal}
        title="Cancel Ride"
        message="Are you sure you want to cancel this ride request? Frequent cancellations may affect your rating."
        confirmTitle="Yes, Cancel"
        cancelTitle="Keep Ride"
        isDestructive
        onConfirm={handleConfirmCancel}
        onCancel={() => setShowCancelModal(false)}
      />
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  emptyTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  emptySubtitle: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginTop: 4,
    marginBottom: theme.spacing.lg,
  },
  bookBtn: {
    minWidth: 160,
  },
  map: {
    marginBottom: theme.spacing.md,
  },
  statusCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
    ...theme.shadows.subtle,
  },
  statusHeadline: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  routePoints: {
    gap: 6,
    paddingTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  driverCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  driverTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.surfaceMuted,
    marginRight: theme.spacing.md,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  driverStats: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  vehiclePlateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  vehicleModel: {
    ...theme.typography.captionBold,
    color: theme.colors.textSecondary,
  },
  plateBox: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  plateText: {
    ...theme.typography.badge,
    color: '#0F172A',
  },
  driverContactRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    gap: 6,
  },
  contactBtnText: {
    ...theme.typography.captionBold,
    color: theme.colors.secondary,
  },
  searchingCard: {
    backgroundColor: theme.colors.primaryLight,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderGold,
  },
  searchingTitle: {
    ...theme.typography.h3,
    color: theme.colors.primaryDark,
    marginBottom: 4,
  },
  searchingDesc: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  fareLabel: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  fareValue: {
    ...theme.typography.h3,
    color: theme.colors.primaryDark,
  },
  simulationControl: {
    backgroundColor: '#FEF3C7',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: theme.spacing.lg,
  },
  simLabel: {
    ...theme.typography.captionBold,
    color: '#92400E',
    marginBottom: theme.spacing.xs,
  },
  stepBtn: {
    marginTop: 4,
  },
  bottomActions: {
    gap: theme.spacing.sm,
  },
  cancelBtn: {
    borderColor: theme.colors.danger,
  },
  emergencyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: theme.spacing.sm,
  },
  emergencyText: {
    ...theme.typography.captionBold,
    color: theme.colors.danger,
  },
});
