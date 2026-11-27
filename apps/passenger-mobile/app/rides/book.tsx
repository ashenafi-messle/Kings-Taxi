import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Car,
  Building,
  Phone,
  FileText,
  User,
  Star,
  CheckCircle,
  ShieldCheck,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react-native';
import { theme } from '../../src/theme';
import { AppHeader, PrimaryButton } from '../../src/components';
import { useRideStore, useAuthStore } from '../../src/stores';
import { passengerRideSocket } from '../../src/services/passengerRideSocket';
import { SubcityInfo, PublicDriverInfo } from '../../src/types';
import { formatETB } from '../../src/utils/currency';

export default function RideBookingScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    subcities,
    selectedSubcity,
    availableDrivers,
    selectedDriver,
    passengerPhone,
    additionalInstructions,
    isLoadingSubcities,
    isLoadingDrivers,
    isBookingRide,
    bookingError,
    fetchSubcities,
    selectSubcity,
    selectDriver,
    setPassengerPhone,
    setAdditionalInstructions,
    requestOnDemandRide,
  } = useRideStore();

  // Load subcities and prefill passenger phone on mount
  useEffect(() => {
    fetchSubcities();
    if (!passengerPhone && user?.phone) {
      setPassengerPhone(user.phone);
    }

    const onBackPress = () => {
      if (router.canGoBack()) {
        router.back();
        return true;
      }
      router.replace('/(tabs)');
      return true;
    };

    const backSub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSub.remove();
  }, []);

  // Subscribe to live driver availability updates for the active subcity
  useEffect(() => {
    const disconnect = passengerRideSocket.connect({
      onDriverAvailabilityChanged: () => {
        const activeSubcityId = useRideStore.getState().selectedSubcity?.id;
        if (activeSubcityId) {
          useRideStore.getState().fetchDrivers(activeSubcityId);
        }
      },
    });
    return () => disconnect();
  }, []);

  const handleRequestRide = async () => {
    const ok = await requestOnDemandRide();
    if (ok) {
      router.replace('/rides/active');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title="Request a Taxi" showBack />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* On-Demand Dispatch Banner */}
        <View style={styles.heroBanner}>
          <View style={styles.heroBadge}>
            <Sparkles size={14} color="#C9A227" />
            <Text style={styles.heroBadgeText}>On-Demand Transport • Gondar City</Text>
          </View>
          <Text style={styles.heroTitle}>Request a Ride in Seconds</Text>
          <Text style={styles.heroSubtitle}>
            No upfront destination required. An available driver will accept your request, and you will choose your vehicle before boarding.
          </Text>
        </View>

        {/* 1. Subcity Selection (Gondar City Districts) */}
        <View style={styles.sectionHeaderRow}>
          <Building size={16} color={theme.colors.primaryDark} />
          <Text style={styles.sectionTitle}>1. Select Your Subcity in Gondar *</Text>
        </View>

        {isLoadingSubcities ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={theme.colors.primaryDark} />
            <Text style={styles.loadingText}>Loading Gondar Subcities...</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subcitiesScroll}
          >
            {subcities.map((subcity: SubcityInfo) => {
              const isSelected = selectedSubcity?.id === subcity.id;
              return (
                <TouchableOpacity
                  key={subcity.id}
                  style={[styles.subcityChip, isSelected && styles.subcityChipSelected]}
                  onPress={() => selectSubcity(subcity)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[styles.subcityChipText, isSelected && styles.subcityChipTextSelected]}
                  >
                    {subcity.name}
                  </Text>
                  {isSelected && (
                    <CheckCircle size={14} color="#FFFFFF" style={styles.subcityCheckIcon} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* 2. Passenger Verified Contact Phone */}
        <View style={styles.inputCard}>
          <View style={styles.inputHeaderRow}>
            <View style={styles.inputLabelWithIcon}>
              <Phone size={16} color={theme.colors.primaryDark} />
              <Text style={styles.inputLabel}>2. Passenger Contact Phone *</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <ShieldCheck size={13} color={theme.colors.success} />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          </View>

          <TextInput
            style={styles.textInput}
            value={passengerPhone || user?.phone || ''}
            onChangeText={setPassengerPhone}
            placeholder="09... or 07... (e.g. 0911223344)"
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="phone-pad"
            autoCapitalize="none"
          />
          <Text style={styles.inputHelperText}>
            The driver will contact this number upon arrival to pick you up.
          </Text>
        </View>

        {/* 3. Optional Pickup Instructions / Landmark */}
        <View style={styles.inputCard}>
          <View style={styles.inputLabelWithIcon}>
            <FileText size={16} color={theme.colors.primaryDark} />
            <Text style={styles.inputLabel}>3. Pickup Landmark / Notes (Optional)</Text>
          </View>
          <TextInput
            style={[styles.textInput, styles.instructionsInput]}
            value={additionalInstructions}
            onChangeText={setAdditionalInstructions}
            placeholder="e.g. Standing near the commercial bank, wearing a navy jacket"
            placeholderTextColor={theme.colors.textMuted}
            multiline
            numberOfLines={2}
          />
        </View>

        {/* 4. Available Drivers Preview */}
        <View style={styles.sectionHeaderRow}>
          <User size={16} color={theme.colors.primaryDark} />
          <Text style={styles.sectionTitle}>
            Available Drivers in {selectedSubcity?.name || 'Subcity'} ({availableDrivers.length})
          </Text>
        </View>

        {isLoadingDrivers ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={theme.colors.primaryDark} />
            <Text style={styles.loadingText}>Searching available drivers nearby...</Text>
          </View>
        ) : availableDrivers.length === 0 ? (
          <View style={styles.emptyDriversBox}>
            <Text style={styles.emptyDriversTitle}>No Drivers Currently Online</Text>
            <Text style={styles.emptyDriversSubtitle}>
              No drivers are online in this subcity right now. This list updates automatically as soon as a driver goes online.
            </Text>
          </View>
        ) : (
          <View style={styles.driversList}>
            {availableDrivers.map((driver: PublicDriverInfo) => {
              const isSelected = selectedDriver?.id === driver.id;
              return (
                <TouchableOpacity
                  key={driver.id}
                  style={[styles.driverCard, isSelected && styles.driverCardSelected]}
                  onPress={() => selectDriver(isSelected ? null : driver)}
                  activeOpacity={0.85}
                >
                  <View style={styles.driverLeft}>
                    {driver.profileImage ? (
                      <Image source={{ uri: driver.profileImage }} style={styles.driverAvatar} />
                    ) : (
                      <View style={styles.driverAvatarPlaceholder}>
                        <User size={20} color={theme.colors.primaryDark} />
                      </View>
                    )}
                    <View style={styles.driverMeta}>
                      <View style={styles.driverNameRow}>
                        <Text style={styles.driverFullName}>{driver.fullName}</Text>
                        <View style={styles.driverAvailableBadge}>
                          <Text style={styles.driverAvailableText}>AVAILABLE</Text>
                        </View>
                      </View>
                      <View style={styles.driverSubMetaRow}>
                        <Star size={13} color="#F59E0B" fill="#F59E0B" />
                        <Text style={styles.driverRatingText}>{driver.rating.toFixed(1)}</Text>
                        <Text style={styles.driverDotDivider}>•</Text>
                        <Text style={styles.driverTripsText}>{driver.totalTrips} completed trips</Text>
                      </View>
                      {driver.vehicle && (
                        <Text style={styles.driverVehicleInfo}>
                          {driver.vehicle.vehicleColor} {driver.vehicle.vehicleModel} • {driver.vehicle.plateNumber}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                    {isSelected && <View style={styles.radioInnerDot} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* 5. Dynamic Transparent Rates Information */}
        <View style={styles.rateInfoCard}>
          <View style={styles.rateHeaderRow}>
            <Clock size={16} color={theme.colors.primaryDark} />
            <Text style={styles.rateTitle}>Transparent Metered Fare System</Text>
          </View>
          <Text style={styles.rateSubtitle}>
            Final fare is calculated dynamically from the driver's authoritative GPS telemetry upon destination arrival.
          </Text>
          <View style={styles.rateBreakdownRow}>
            <View style={styles.rateItem}>
              <Text style={styles.rateItemLabel}>Base Fare</Text>
              <Text style={styles.rateItemValue}>From ETB 100</Text>
            </View>
            <View style={styles.rateItemDivider} />
            <View style={styles.rateItem}>
              <Text style={styles.rateItemLabel}>Distance Rate</Text>
              <Text style={styles.rateItemValue}>ETB 25 / km</Text>
            </View>
            <View style={styles.rateItemDivider} />
            <View style={styles.rateItem}>
              <Text style={styles.rateItemLabel}>Time Rate</Text>
              <Text style={styles.rateItemValue}>ETB 2 / min</Text>
            </View>
          </View>
        </View>

        {/* Error Banner */}
        {bookingError && (
          <View style={styles.errorBanner}>
            <AlertCircle size={16} color={theme.colors.danger} />
            <Text style={styles.errorBannerText}>{bookingError}</Text>
          </View>
        )}

        {/* Submit Ride Request Button */}
        <PrimaryButton
          title={isBookingRide ? 'Submitting Request...' : 'Request Kings Taxi'}
          onPress={handleRequestRide}
          disabled={isBookingRide || !selectedSubcity || !selectedDriver}
          icon={<Car size={20} color="#FFFFFF" />}
          style={styles.requestBtn}
        />
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
  heroBanner: {
    backgroundColor: '#FAF4DC',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.brightGold,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.cardGold,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#FAF2D3',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.borderGold,
    marginBottom: theme.spacing.xs,
  },
  heroBadgeText: {
    ...theme.typography.captionBold,
    color: theme.colors.antiqueGold,
    fontSize: 11,
    fontWeight: '700',
  },
  heroTitle: {
    ...theme.typography.h3,
    color: theme.colors.deepChocolate,
    fontWeight: '800',
    fontSize: 18,
    marginBottom: 4,
  },
  heroSubtitle: {
    ...theme.typography.body,
    fontSize: 13,
    color: theme.colors.deepChocolateLight,
    lineHeight: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  sectionTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.deepChocolate,
    fontWeight: '700',
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderGold,
    marginBottom: theme.spacing.md,
  },
  loadingText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  subcitiesScroll: {
    gap: theme.spacing.xs,
    paddingBottom: theme.spacing.sm,
  },
  subcityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.borderGold,
    marginRight: 6,
  },
  subcityChipSelected: {
    backgroundColor: theme.colors.antiqueGold,
    borderColor: theme.colors.brightGold,
  },
  subcityChipText: {
    ...theme.typography.captionBold,
    color: theme.colors.deepChocolate,
    fontWeight: '700',
  },
  subcityChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  subcityCheckIcon: {
    marginLeft: 6,
  },
  inputCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.borderGold,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.cardGold,
  },
  inputHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  inputLabelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inputLabel: {
    ...theme.typography.bodyBold,
    color: theme.colors.deepChocolate,
    fontWeight: '700',
    fontSize: 14,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: theme.borderRadius.full,
  },
  verifiedText: {
    ...theme.typography.captionBold,
    color: theme.colors.success,
    fontSize: 11,
  },
  textInput: {
    ...theme.typography.body,
    backgroundColor: '#FFFDF9',
    borderWidth: 1.5,
    borderColor: theme.colors.borderGold,
    borderRadius: theme.borderRadius.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: theme.colors.deepChocolate,
    marginTop: 6,
  },
  instructionsInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  inputHelperText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 6,
  },
  emptyDriversBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1.5,
    borderColor: theme.colors.borderGold,
    marginBottom: theme.spacing.md,
  },
  emptyDriversTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.deepChocolate,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptyDriversSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  driversList: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1.5,
    borderColor: theme.colors.borderGold,
  },
  driverCardSelected: {
    borderColor: theme.colors.brightGold,
    backgroundColor: theme.colors.paleGold,
  },
  driverLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceMuted,
  },
  driverAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverMeta: {
    flex: 1,
  },
  driverNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  driverFullName: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  driverAvailableBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  driverAvailableText: {
    ...theme.typography.captionBold,
    color: '#059669',
    fontSize: 10,
  },
  driverSubMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  driverRatingText: {
    ...theme.typography.captionBold,
    color: theme.colors.text,
    marginLeft: 3,
  },
  driverDotDivider: {
    marginHorizontal: 4,
    color: theme.colors.textMuted,
  },
  driverTripsText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  driverVehicleInfo: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
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
  rateInfoCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  rateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  rateTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
    fontSize: 14,
  },
  rateSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },
  rateBreakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rateItem: {
    alignItems: 'center',
    flex: 1,
  },
  rateItemDivider: {
    width: 1,
    height: 24,
    backgroundColor: theme.colors.border,
  },
  rateItemLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  rateItemValue: {
    ...theme.typography.captionBold,
    color: theme.colors.primaryDark,
    marginTop: 2,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  errorBannerText: {
    ...theme.typography.caption,
    color: theme.colors.danger,
    flex: 1,
  },
  requestBtn: {
    marginTop: theme.spacing.sm,
  },
});
