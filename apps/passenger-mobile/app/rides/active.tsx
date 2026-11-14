import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  BackHandler,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Phone,
  XCircle,
  CheckCircle,
  MapPin,
  Navigation,
  AlertTriangle,
  RotateCcw,
  Clock,
  Compass,
  Car,
  ShieldCheck,
  Star,
  Sparkles,
  ChevronRight,
  CreditCard,
  Wifi,
  WifiOff,
  Radio,
} from 'lucide-react-native';
import { theme } from '../../src/theme';
import {
  AppHeader,
  InteractiveMap,
  StatusBadge,
  PrimaryButton,
  SecondaryButton,
  ConfirmationModal,
  VehicleCard,
} from '../../src/components';
import { useRideStore, useAuthStore } from '../../src/stores';
import { GONDAR_LOCATIONS, networkService, NetworkState, offlineGpsQueueService } from '../../src/services';
import { formatETB } from '../../src/utils/currency';
import { useTranslation } from '../../src/i18n';
import { AddressLocation, VehicleCategory, VehicleOption } from '../../src/types';

export default function ActiveRideScreen() {
  const router = useRouter();
  const { t } = useTranslation(['transportation', 'common', 'navigation']);
  const user = useAuthStore((s) => s.user);

  const {
    currentRide,
    activeTracking,
    destinationRevision,
    availableVehicles,
    selectedCategory,
    journeyDistanceMeters,
    journeyDurationSeconds,
    finalFareBreakdown,
    syncRideState,
    requestDestinationChange,
    selectVehicleForApprovedRide,
    cancelRide,
    resetRide,
    simulateDriverApproval,
    simulateDriverArrival,
    simulateTripStart,
    simulateTripCompletion,
  } = useRideStore();

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDestinationModal, setShowDestinationModal] = useState(false);
  const [selectedNewDest, setSelectedNewDest] = useState<AddressLocation | null>(null);
  const [isSubmittingRevision, setIsSubmittingRevision] = useState(false);
  const [revisionFeedback, setRevisionFeedback] = useState<string | null>(null);
  const [tempSelectedCategory, setTempSelectedCategory] = useState<VehicleCategory>(selectedCategory || 'comfort');
  const [networkState, setNetworkState] = useState<NetworkState>(networkService.getNetworkState());
  const [pendingOfflineCount, setPendingOfflineCount] = useState<number>(0);

  // Monitor network transitions & auto-sync offline queue
  useEffect(() => {
    const unsub = networkService.addListener((state) => {
      setNetworkState(state);
      if (state.isInternetReachable && currentRide?.id) {
        syncRideState(currentRide.id);
        offlineGpsQueueService.syncQueue(currentRide.id).then((res) => {
          setPendingOfflineCount(res.pendingCount);
        });
      }
    });

    if (currentRide?.id) {
      offlineGpsQueueService.getPendingSamples(currentRide.id).then((samples) => {
        setPendingOfflineCount(samples.length);
      });
    }

    return () => unsub();
  }, [currentRide?.id]);

  // Background polling every 3.5s to keep state synchronized with backend
  useEffect(() => {
    if (!currentRide?.id) return;

    syncRideState(currentRide.id);
    const interval = setInterval(() => {
      syncRideState(currentRide.id);
    }, 3500);

    return () => clearInterval(interval);
  }, [currentRide?.id]);

  // Android hardware back handler for active ride
  useEffect(() => {
    const onBackPress = () => {
      if (showCancelModal) {
        setShowCancelModal(false);
        return true;
      }
      if (showDestinationModal) {
        setShowDestinationModal(false);
        return true;
      }

      if (
        currentRide &&
        currentRide.status !== 'TRIP_COMPLETED' &&
        currentRide.status !== 'PAYMENT_COMPLETED' &&
        currentRide.status !== 'CANCELLED'
      ) {
        Alert.alert(
          'Active Ride in Progress',
          'Your ride is currently active. Return to main tabs without cancelling?',
          [
            { text: 'Stay Here', style: 'cancel' },
            { text: 'Go to Tabs', onPress: () => router.replace('/(tabs)') },
          ]
        );
        return true;
      }
      return false;
    };

    const backSub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSub.remove();
  }, [showCancelModal, showDestinationModal, currentRide, router]);

  // If no ride exists, render empty fallback
  if (!currentRide) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="Active Ride" showBack />
        <View style={styles.emptyContainer}>
          <Car size={48} color={theme.colors.textMuted} />
          <Text style={styles.emptyTitle}>No Active Ride in Progress</Text>
          <Text style={styles.emptySubtitle}>
            You do not have an active taxi request. You can request a ride instantly.
          </Text>
          <PrimaryButton
            title="Request Kings Taxi"
            onPress={() => router.replace('/rides/book')}
            style={styles.bookBtn}
          />
        </View>
      </SafeAreaView>
    );
  }

  const { driver, status, pickup, destination, passengerContactPhone, subcityName } = currentRide;

  // Handle vehicle confirmation after driver approval
  const handleConfirmVehicleSelection = async () => {
    await selectVehicleForApprovedRide(tempSelectedCategory);
  };

  const handleConfirmCancel = async () => {
    setShowCancelModal(false);
    await cancelRide('Passenger cancelled via app');
    router.replace('/(tabs)');
  };

  const handleConfirmNewDestination = async () => {
    if (!selectedNewDest) return;
    setIsSubmittingRevision(true);
    setRevisionFeedback(null);

    const ok = await requestDestinationChange(selectedNewDest.title, selectedNewDest.coordinates);
    setIsSubmittingRevision(false);

    if (ok) {
      setRevisionFeedback('Proposal submitted! Waiting for driver confirmation.');
      setTimeout(() => {
        setShowDestinationModal(false);
        setRevisionFeedback(null);
      }, 1500);
    } else {
      setRevisionFeedback('Unable to propose destination change. Please try again.');
    }
  };

  // Live elapsed minutes
  const getElapsedMinutes = () => {
    if (!currentRide.startedAt) return Math.round(journeyDurationSeconds / 60) || 1;
    const diffMs = Date.now() - new Date(currentRide.startedAt).getTime();
    return Math.max(1, Math.round(diffMs / 60000));
  };

  // Live distance in KM
  const liveDistanceKm = activeTracking?.officialDistanceMeters
    ? (activeTracking.officialDistanceMeters / 1000).toFixed(2)
    : journeyDistanceMeters > 0
    ? (journeyDistanceMeters / 1000).toFixed(2)
    : currentRide.distanceKm > 0
    ? currentRide.distanceKm.toFixed(2)
    : '0.00';

  const isGpsInterrupted = activeTracking?.trackingQuality === 'INTERRUPTED';

  // Dynamic Fare calculation
  const baseRate = tempSelectedCategory === 'vip' ? 200 : tempSelectedCategory === 'comfort' ? 150 : 100;
  const kmRate = tempSelectedCategory === 'vip' ? 45 : tempSelectedCategory === 'comfort' ? 35 : 25;
  const minRate = tempSelectedCategory === 'vip' ? 4 : tempSelectedCategory === 'comfort' ? 3 : 2;

  const currentDistanceKmNum = Number(liveDistanceKm) || 0;
  const currentElapsedMinsNum = getElapsedMinutes();
  const calculatedFare =
    currentRide.finalPrice ||
    finalFareBreakdown?.totalFare ||
    Math.round(baseRate + currentDistanceKmNum * kmRate + currentElapsedMinsNum * minRate);

  const handleProceedToPayment = () => {
    router.push({
      pathname: '/payments/checkout',
      params: {
        amount: calculatedFare,
        description: `Kings Taxi Ride (${tempSelectedCategory.toUpperCase()}) • Ref: ${currentRide.bookingReference || currentRide.id}`,
        serviceCategory: 'ride',
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Live Taxi Journey"
        rightAction={<StatusBadge status={status} />}
        showBack
        onBack={() => router.replace('/(tabs)')}
      />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Network Connectivity Status Bar (Automatic Switching) */}
        <View style={[styles.networkStatusBar, !networkState.isInternetReachable && styles.networkStatusBarOffline]}>
          <View style={styles.networkStatusLeft}>
            {networkState.isInternetReachable ? (
              networkState.networkType === 'wifi' ? (
                <Wifi size={14} color="#059669" />
              ) : (
                <Radio size={14} color="#059669" />
              )
            ) : (
              <WifiOff size={14} color="#B45309" />
            )}
            <Text style={[styles.networkStatusText, !networkState.isInternetReachable && styles.networkStatusTextOffline]}>
              {networkState.isInternetReachable
                ? `Network: ${networkState.displayName} • Live Sync`
                : `Offline: Recording GPS locally (${pendingOfflineCount} pending)`}
            </Text>
          </View>
          <View style={[styles.networkDot, !networkState.isInternetReachable && styles.networkDotOffline]} />
        </View>

        {/* Offline Notice Banner */}
        {!networkState.isInternetReachable && (
          <View style={styles.offlineNoticeBanner}>
            <AlertTriangle size={18} color="#92400E" />
            <View style={styles.offlineNoticeTextWrap}>
              <Text style={styles.offlineNoticeTitle}>Driver Signal Offline — Showing Last Known Location</Text>
              <Text style={styles.offlineNoticeSubtitle}>
                GNSS tracking continues offline on the driver device. All samples will automatically synchronize with zero loss upon reconnection.
              </Text>
            </View>
          </View>
        )}

        {/* GPS Interruption Warning Banner */}
        {isGpsInterrupted && status === 'TRIP_STARTED' && (
          <View style={styles.interruptionBanner}>
            <AlertTriangle size={18} color="#B45309" />
            <View style={styles.interruptionTextContainer}>
              <Text style={styles.interruptionTitle}>Driver GPS Signal Interrupted</Text>
              <Text style={styles.interruptionSubtitle}>
                Retaining validated road distance. Live telematics will resume once connection restores.
              </Text>
            </View>
          </View>
        )}

        {/* =========================================================================
            STAGE 1: WAITING FOR DRIVER APPROVAL
           ========================================================================= */}
        {(status === 'WAITING_FOR_DRIVER' || status === 'REQUESTED' || status === 'SEARCHING_DRIVER') && (
          <View style={styles.waitingCard}>
            <View style={styles.pulseContainer}>
              <ActivityIndicator size="large" color={theme.colors.primaryDark} />
            </View>
            <Text style={styles.waitingTitle}>Waiting for Driver Approval</Text>
            <Text style={styles.waitingSubtitle}>
              Your ride request has been dispatched to available drivers in {subcityName || 'Gondar'}. You will be notified the moment a driver approves.
            </Text>

            <View style={styles.requestSummaryBox}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Passenger Phone</Text>
                <Text style={styles.summaryValue}>{passengerContactPhone || user?.phone || '0911234567'}</Text>
              </View>
              <View style={styles.summaryItemDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Subcity Zone</Text>
                <Text style={styles.summaryValue}>{subcityName || 'Gondar City'}</Text>
              </View>
            </View>

            {/* Test Simulation Helper for Fast Verification */}
            <TouchableOpacity
              style={styles.simulationBtn}
              onPress={simulateDriverApproval}
              activeOpacity={0.8}
            >
              <Sparkles size={14} color="#C9A227" />
              <Text style={styles.simulationBtnText}>Demo: Simulate Driver Approval</Text>
            </TouchableOpacity>

            <SecondaryButton
              title="Cancel Request"
              onPress={() => setShowCancelModal(true)}
              icon={<XCircle size={18} color={theme.colors.danger} />}
              textStyle={{ color: theme.colors.danger }}
              style={styles.cancelRequestBtn}
            />
          </View>
        )}

        {/* =========================================================================
            STAGE 2: DRIVER APPROVED -> VEHICLE SELECTION
           ========================================================================= */}
        {status === 'DRIVER_APPROVED' && (
          <View style={styles.approvedCard}>
            <View style={styles.approvedBanner}>
              <CheckCircle size={20} color="#15803D" />
              <Text style={styles.approvedBannerText}>Driver Approved Your Request!</Text>
            </View>

            {/* Driver Profile Card */}
            {driver && (
              <View style={styles.driverProfileBox}>
                <Image source={{ uri: driver.photoUrl }} style={styles.driverAvatarLarge} />
                <View style={styles.driverProfileMeta}>
                  <Text style={styles.driverNameLarge}>{driver.name}</Text>
                  <View style={styles.driverStatsRow}>
                    <Star size={14} color="#F59E0B" fill="#F59E0B" />
                    <Text style={styles.driverRatingLarge}>{driver.rating.toFixed(1)}</Text>
                    <Text style={styles.driverDotDivider}>•</Text>
                    <Text style={styles.driverTripsLarge}>{driver.totalTrips} completed trips</Text>
                  </View>
                  <Text style={styles.driverVehicleModel}>
                    {driver.vehicleColor} {driver.vehicleMake} {driver.vehicleModel}
                  </Text>
                </View>
              </View>
            )}

            {/* Post-Approval Vehicle Category Selection */}
            <View style={styles.vehicleSelectHeader}>
              <Car size={18} color={theme.colors.primaryDark} />
              <Text style={styles.vehicleSelectTitle}>Select Your Vehicle for this Trip:</Text>
            </View>
            <Text style={styles.vehicleSelectSubtitle}>
              Choose your preferred vehicle tier. Metered fare will be calculated according to these rates.
            </Text>

            <View style={styles.vehiclesList}>
              {availableVehicles.map((vehicle: VehicleOption) => {
                const isSelected = tempSelectedCategory === vehicle.id;
                return (
                  <TouchableOpacity
                    key={vehicle.id}
                    style={[styles.vehicleOptionCard, isSelected && styles.vehicleOptionCardSelected]}
                    onPress={() => setTempSelectedCategory(vehicle.id)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.vehicleOptionLeft}>
                      <View style={[styles.vehicleIconCircle, isSelected && styles.vehicleIconCircleSelected]}>
                        <Car size={22} color={isSelected ? theme.colors.primaryDark : theme.colors.textMuted} />
                      </View>
                      <View>
                        <Text style={styles.vehicleOptionName}>{vehicle.name}</Text>
                        <Text style={styles.vehicleOptionDesc}>{vehicle.description}</Text>
                        <Text style={styles.vehicleOptionRates}>
                          Base: ETB {vehicle.baseFare} • ETB {vehicle.ratePerKm}/km • ETB {vehicle.ratePerMin}/min
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                      {isSelected && <View style={styles.radioInnerDot} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <PrimaryButton
              title="Confirm Vehicle Selection"
              onPress={handleConfirmVehicleSelection}
              icon={<ChevronRight size={18} color="#FFFFFF" />}
              style={styles.confirmVehicleBtn}
            />
          </View>
        )}

        {/* =========================================================================
            STAGE 3 & 4: DRIVER ARRIVING, ARRIVED, OR JOURNEY IN PROGRESS
           ========================================================================= */}
        {(status === 'DRIVER_ARRIVING' ||
          status === 'VEHICLE_SELECTED' ||
          status === 'DRIVER_ARRIVED' ||
          status === 'TRIP_STARTED') && (
          <>
            {/* Interactive GPS Map (Driver Authoritative Source • Cached 2D Support) */}
            <InteractiveMap
              pickupCoords={pickup?.coordinates || { latitude: 12.6074, longitude: 37.4589 }}
              destinationCoords={destination?.coordinates}
              driverCoords={
                activeTracking?.lastLatitude && activeTracking?.lastLongitude
                  ? { latitude: activeTracking.lastLatitude, longitude: activeTracking.lastLongitude }
                  : driver?.currentLocation || { latitude: 12.608, longitude: 37.469 }
              }
              isOffline={!networkState.isInternetReachable}
              cachedRegionName="Gondar City"
              height={220}
              style={styles.map}
            />

            {/* Driver Status Card */}
            <View style={styles.driverArrivalCard}>
              <View style={styles.driverArrivalHeader}>
                <View style={styles.arrivalStatusLeft}>
                  {status === 'DRIVER_ARRIVED' ? (
                    <CheckCircle size={22} color={theme.colors.success} />
                  ) : status === 'TRIP_STARTED' ? (
                    <Navigation size={22} color={theme.colors.primaryDark} />
                  ) : (
                    <Car size={22} color={theme.colors.primaryDark} />
                  )}
                  <View>
                    <Text style={styles.arrivalStatusTitle}>
                      {status === 'DRIVER_ARRIVED'
                        ? 'Driver Arrived at Pickup!'
                        : status === 'TRIP_STARTED'
                        ? 'Journey in Progress • Live GPS'
                        : 'Driver is Heading to You'}
                    </Text>
                    <Text style={styles.arrivalStatusSubtitle}>
                      {status === 'DRIVER_ARRIVED'
                        ? 'Please meet your driver and board the vehicle'
                        : status === 'TRIP_STARTED'
                        ? networkState.isInternetReachable
                          ? 'Authoritative tracking via driver GPS terminal'
                          : 'Network offline: GNSS recording to local SQLite queue'
                        : 'Estimated arrival in 3-5 minutes'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Driver & Vehicle Plate Banner */}
              {driver && (
                <View style={styles.driverInfoBanner}>
                  <Image source={{ uri: driver.photoUrl }} style={styles.driverAvatarSmall} />
                  <View style={styles.driverDetailsCol}>
                    <Text style={styles.driverNameSmall}>{driver.name}</Text>
                    <Text style={styles.driverVehiclePlate}>
                      {driver.vehicleColor} {driver.vehicleMake} {driver.vehicleModel} •{' '}
                      <Text style={styles.plateHighlight}>{driver.vehiclePlate}</Text>
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.callHotlineBtn}
                    onPress={() => Linking.openURL('tel:+251918000000')}
                  >
                    <Phone size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Live Telematics Metrics (Distance, Duration & Connectivity) */}
              {status === 'TRIP_STARTED' && (
                <View style={styles.telematicsGrid}>
                  <View style={styles.telemetricBox}>
                    <Compass size={18} color={theme.colors.primaryDark} />
                    <Text style={styles.telemetricLabel}>Measured Distance</Text>
                    <Text style={styles.telemetricValue}>{liveDistanceKm} km</Text>
                  </View>
                  <View style={styles.telemetricDivider} />
                  <View style={styles.telemetricBox}>
                    <Clock size={18} color={theme.colors.primaryDark} />
                    <Text style={styles.telemetricLabel}>Journey Duration</Text>
                    <Text style={styles.telemetricValue}>{getElapsedMinutes()} mins</Text>
                  </View>
                  <View style={styles.telemetricDivider} />
                  <View style={styles.telemetricBox}>
                    {networkState.isInternetReachable ? (
                      <ShieldCheck size={18} color={theme.colors.success} />
                    ) : (
                      <WifiOff size={18} color="#B45309" />
                    )}
                    <Text style={styles.telemetricLabel}>Telematics</Text>
                    <Text
                      style={[
                        styles.telemetricValue,
                        {
                          color: networkState.isInternetReachable ? theme.colors.success : '#B45309',
                          fontSize: 12,
                        },
                      ]}
                    >
                      {networkState.isInternetReachable
                        ? isGpsInterrupted
                          ? 'Degraded'
                          : networkState.networkType === 'wifi'
                          ? 'Wi-Fi'
                          : 'Mobile 4G'
                        : `Offline (${pendingOfflineCount})`}
                    </Text>
                  </View>
                </View>
              )}

              {/* Simulation buttons for fast demonstration */}
              {status !== 'TRIP_STARTED' && (
                <TouchableOpacity
                  style={styles.simulationBtn}
                  onPress={simulateTripStart}
                  activeOpacity={0.8}
                >
                  <Sparkles size={14} color="#C9A227" />
                  <Text style={styles.simulationBtnText}>Demo: Board Vehicle & Start Journey</Text>
                </TouchableOpacity>
              )}

              {status === 'TRIP_STARTED' && (
                <>
                  <TouchableOpacity
                    style={[styles.simulationBtn, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}
                    onPress={simulateTripCompletion}
                    activeOpacity={0.8}
                  >
                    <Sparkles size={14} color="#15803D" />
                    <Text style={[styles.simulationBtnText, { color: '#15803D' }]}>
                      Demo: Driver Ends Journey (Arrived at Destination)
                    </Text>
                  </TouchableOpacity>

                  {/* Network Switching Simulation Controls (Acceptance Test Helpers) */}
                  <View style={styles.networkSimContainer}>
                    <Text style={styles.networkSimTitle}>Network Switching Controls (Test Suite):</Text>
                    <View style={styles.networkSimRow}>
                      <TouchableOpacity
                        style={[
                          styles.networkSimChip,
                          networkState.networkType === 'wifi' && networkState.isInternetReachable && styles.networkSimChipActive,
                        ]}
                        onPress={() => networkService.simulateNetworkState('wifi', true)}
                      >
                        <Wifi size={12} color={networkState.networkType === 'wifi' ? '#FFFFFF' : theme.colors.text} />
                        <Text style={[styles.networkSimChipText, networkState.networkType === 'wifi' && styles.networkSimChipTextActive]}>
                          Wi-Fi
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.networkSimChip,
                          networkState.networkType === 'cellular_4g' && networkState.isInternetReachable && styles.networkSimChipActive,
                        ]}
                        onPress={() => networkService.simulateNetworkState('cellular_4g', true)}
                      >
                        <Radio size={12} color={networkState.networkType === 'cellular_4g' ? '#FFFFFF' : theme.colors.text} />
                        <Text style={[styles.networkSimChipText, networkState.networkType === 'cellular_4g' && styles.networkSimChipTextActive]}>
                          4G Mobile
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.networkSimChip,
                          !networkState.isInternetReachable && styles.networkSimChipActiveOffline,
                        ]}
                        onPress={() => networkService.simulateNetworkState('none', false)}
                      >
                        <WifiOff size={12} color={!networkState.isInternetReachable ? '#FFFFFF' : theme.colors.danger} />
                        <Text style={[styles.networkSimChipText, !networkState.isInternetReachable && styles.networkSimChipTextActive]}>
                          Offline Outage
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              )}
            </View>
          </>
        )}

        {/* =========================================================================
            STAGE 5: TRIP COMPLETED -> DYNAMIC FARE CHECKOUT
           ========================================================================= */}
        {status === 'TRIP_COMPLETED' && (
          <View style={styles.completedCard}>
            <View style={styles.completedHeader}>
              <CheckCircle size={32} color={theme.colors.success} />
              <Text style={styles.completedTitle}>Destination Reached!</Text>
              <Text style={styles.completedSubtitle}>
                Your journey has concluded. Here is the authoritative metered fare:
              </Text>
            </View>

            {/* Dynamic Metered Fare Breakdown */}
            <View style={styles.fareSummaryCard}>
              <View style={styles.fareHeaderRow}>
                <Text style={styles.fareCategoryLabel}>Category: {tempSelectedCategory.toUpperCase()}</Text>
                <Text style={styles.fareTotalTop}>{formatETB(calculatedFare)}</Text>
              </View>
              <View style={styles.fareDivider} />
              <View style={styles.fareRowItem}>
                <Text style={styles.fareRowLabel}>Base Starting Fare</Text>
                <Text style={styles.fareRowVal}>ETB {baseRate}</Text>
              </View>
              <View style={styles.fareRowItem}>
                <Text style={styles.fareRowLabel}>
                  Distance Travelled ({liveDistanceKm} km @ ETB {kmRate}/km)
                </Text>
                <Text style={styles.fareRowVal}>ETB {Math.round(currentDistanceKmNum * kmRate)}</Text>
              </View>
              <View style={styles.fareRowItem}>
                <Text style={styles.fareRowLabel}>
                  Journey Duration ({currentElapsedMinsNum} mins @ ETB {minRate}/min)
                </Text>
                <Text style={styles.fareRowVal}>ETB {Math.round(currentElapsedMinsNum * minRate)}</Text>
              </View>
              <View style={styles.fareDivider} />
              <View style={styles.fareTotalRow}>
                <Text style={styles.fareTotalLabel}>Total Amount Due</Text>
                <Text style={styles.fareTotalValue}>{formatETB(calculatedFare)}</Text>
              </View>
            </View>

            <PrimaryButton
              title={`Proceed to Payment • ${formatETB(calculatedFare)}`}
              onPress={handleProceedToPayment}
              icon={<CreditCard size={18} color="#FFFFFF" />}
              style={styles.paymentBtn}
            />
          </View>
        )}

        {/* =========================================================================
            STAGE 6: PAYMENT COMPLETED
           ========================================================================= */}
        {status === 'PAYMENT_COMPLETED' && (
          <View style={styles.completedCard}>
            <CheckCircle size={48} color={theme.colors.success} />
            <Text style={styles.completedTitle}>Payment Confirmed!</Text>
            <Text style={styles.completedSubtitle}>
              Thank you for traveling with Kings Taxi Ethiopia. Your trip receipt has been saved to your account.
            </Text>
            <PrimaryButton
              title="View Itemized Receipt"
              onPress={() => router.push('/rides/receipt')}
              style={styles.paymentBtn}
            />
            <SecondaryButton
              title="Return to Home"
              onPress={() => router.replace('/(tabs)')}
              style={{ width: '100%', marginTop: theme.spacing.sm }}
            />
          </View>
        )}
      </ScrollView>

      {/* Cancel Confirmation Modal */}
      <ConfirmationModal
        visible={showCancelModal}
        title="Cancel Ride Request?"
        message="Are you sure you want to cancel your ride request?"
        confirmTitle="Yes, Cancel Ride"
        cancelTitle="No, Keep Waiting"
        onConfirm={handleConfirmCancel}
        onCancel={() => setShowCancelModal(false)}
        isDestructive
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
    marginTop: 60,
  },
  emptyTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  emptySubtitle: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  bookBtn: {
    width: '100%',
  },
  interruptionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  interruptionTextContainer: {
    flex: 1,
  },
  interruptionTitle: {
    ...theme.typography.bodyBold,
    color: '#92400E',
  },
  interruptionSubtitle: {
    ...theme.typography.caption,
    color: '#B45309',
    marginTop: 2,
  },
  waitingCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.borderGold,
    padding: theme.spacing.lg,
    alignItems: 'center',
    ...theme.shadows.cardGold,
  },
  pulseContainer: {
    marginVertical: theme.spacing.md,
  },
  waitingTitle: {
    ...theme.typography.h3,
    color: theme.colors.deepChocolate,
    fontWeight: '800',
    fontSize: 18,
    marginBottom: 6,
    textAlign: 'center',
  },
  waitingSubtitle: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: theme.spacing.md,
  },
  requestSummaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF4DC',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderGold,
    width: '100%',
    marginBottom: theme.spacing.md,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryItemDivider: {
    width: 1,
    height: 30,
    backgroundColor: theme.colors.borderGold,
  },
  summaryLabel: {
    ...theme.typography.caption,
    color: theme.colors.deepChocolateLight,
  },
  summaryValue: {
    ...theme.typography.captionBold,
    color: theme.colors.deepChocolate,
    fontWeight: '700',
    marginTop: 2,
  },
  simulationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFDF5',
    borderWidth: 1,
    borderColor: '#F3E5AB',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.full,
    marginVertical: theme.spacing.sm,
    width: '100%',
  },
  simulationBtnText: {
    ...theme.typography.captionBold,
    color: theme.colors.primaryDark,
  },
  cancelRequestBtn: {
    width: '100%',
    marginTop: theme.spacing.xs,
  },
  approvedCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    padding: theme.spacing.md,
    ...theme.shadows.card,
  },
  approvedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  approvedBannerText: {
    ...theme.typography.bodyBold,
    color: '#15803D',
    fontSize: 14,
  },
  driverProfileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surfaceMuted,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  driverAvatarLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.border,
  },
  driverProfileMeta: {
    flex: 1,
  },
  driverNameLarge: {
    ...theme.typography.bodyBold,
    fontSize: 16,
    color: theme.colors.text,
  },
  driverStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  driverRatingLarge: {
    ...theme.typography.captionBold,
    color: theme.colors.text,
    marginLeft: 3,
  },
  driverDotDivider: {
    marginHorizontal: 4,
    color: theme.colors.textMuted,
  },
  driverTripsLarge: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  driverVehicleModel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  vehicleSelectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: theme.spacing.xs,
  },
  vehicleSelectTitle: {
    ...theme.typography.bodyBold,
    fontSize: 14,
    color: theme.colors.text,
  },
  vehicleSelectSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
    marginBottom: theme.spacing.sm,
  },
  vehiclesList: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  vehicleOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.borderGold,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  vehicleOptionCardSelected: {
    borderColor: theme.colors.brightGold,
    backgroundColor: theme.colors.paleGold,
  },
  vehicleOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  vehicleIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleIconCircleSelected: {
    backgroundColor: '#FFF9E6',
  },
  vehicleOptionName: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  vehicleOptionDesc: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  vehicleOptionRates: {
    ...theme.typography.caption,
    color: theme.colors.primaryDark,
    marginTop: 3,
    fontSize: 11,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: theme.spacing.sm,
  },
  radioCircleSelected: {
    borderColor: theme.colors.primaryDark,
  },
  radioInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primaryDark,
  },
  confirmVehicleBtn: {
    marginTop: theme.spacing.xs,
  },
  map: {
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
  },
  driverArrivalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.borderGold,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.cardGold,
  },
  driverArrivalHeader: {
    marginBottom: theme.spacing.sm,
  },
  arrivalStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  arrivalStatusTitle: {
    ...theme.typography.bodyBold,
    fontSize: 15,
    color: theme.colors.deepChocolate,
    fontWeight: '700',
  },
  arrivalStatusSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  driverInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF4DC',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderGold,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  driverAvatarSmall: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.border,
  },
  driverDetailsCol: {
    flex: 1,
  },
  driverNameSmall: {
    ...theme.typography.bodyBold,
    color: theme.colors.deepChocolate,
    fontWeight: '700',
    fontSize: 13,
  },
  driverVehiclePlate: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  plateHighlight: {
    ...theme.typography.captionBold,
    color: theme.colors.antiqueGold,
  },
  callHotlineBtn: {
    backgroundColor: theme.colors.antiqueGold,
    padding: 9,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  telematicsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF4DC',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderGold,
    marginBottom: theme.spacing.sm,
  },
  telemetricBox: {
    alignItems: 'center',
    flex: 1,
  },
  telemetricDivider: {
    width: 1,
    height: 30,
    backgroundColor: theme.colors.borderGold,
  },
  telemetricLabel: {
    ...theme.typography.caption,
    color: theme.colors.deepChocolateLight,
    fontSize: 11,
    marginTop: 2,
  },
  telemetricValue: {
    ...theme.typography.captionBold,
    fontSize: 14,
    color: theme.colors.deepChocolate,
    fontWeight: '700',
    marginTop: 2,
  },
  completedCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    padding: theme.spacing.lg,
    alignItems: 'center',
    ...theme.shadows.cardGold,
  },
  completedHeader: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  completedTitle: {
    ...theme.typography.h3,
    color: '#15803D',
    fontSize: 18,
    marginTop: theme.spacing.sm,
    marginBottom: 4,
  },
  completedSubtitle: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  fareSummaryCard: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.borderGold,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.cardGold,
  },
  fareHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fareCategoryLabel: {
    ...theme.typography.captionBold,
    color: theme.colors.textMuted,
  },
  fareTotalTop: {
    ...theme.typography.bodyBold,
    color: theme.colors.primaryDark,
    fontSize: 16,
  },
  fareDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.sm,
  },
  fareRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  fareRowLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  fareRowVal: {
    ...theme.typography.captionBold,
    color: theme.colors.text,
  },
  fareTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fareTotalLabel: {
    ...theme.typography.bodyBold,
    fontSize: 15,
    color: theme.colors.text,
  },
  fareTotalValue: {
    ...theme.typography.h3,
    fontSize: 18,
    color: theme.colors.primaryDark,
  },
  paymentBtn: {
    width: '100%',
  },
  networkStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.full,
    marginBottom: theme.spacing.sm,
  },
  networkStatusBarOffline: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  networkStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  networkStatusText: {
    ...theme.typography.captionBold,
    color: '#15803D',
    fontSize: 11,
  },
  networkStatusTextOffline: {
    color: '#92400E',
  },
  networkDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  networkDotOffline: {
    backgroundColor: '#D97706',
  },
  offlineNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  offlineNoticeTextWrap: {
    flex: 1,
  },
  offlineNoticeTitle: {
    ...theme.typography.bodyBold,
    color: '#92400E',
    fontSize: 13,
  },
  offlineNoticeSubtitle: {
    ...theme.typography.caption,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 16,
  },
  networkSimContainer: {
    marginTop: theme.spacing.md,
    backgroundColor: '#F8FAFC',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: theme.spacing.sm,
  },
  networkSimTitle: {
    ...theme.typography.captionBold,
    color: theme.colors.textMuted,
    fontSize: 11,
    marginBottom: 6,
  },
  networkSimRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  networkSimChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
  },
  networkSimChipActive: {
    backgroundColor: theme.colors.primaryDark,
    borderColor: theme.colors.primaryDark,
  },
  networkSimChipActiveOffline: {
    backgroundColor: theme.colors.danger,
    borderColor: theme.colors.danger,
  },
  networkSimChipText: {
    ...theme.typography.captionBold,
    fontSize: 10,
    color: theme.colors.text,
  },
  networkSimChipTextActive: {
    color: '#FFFFFF',
  },
});
