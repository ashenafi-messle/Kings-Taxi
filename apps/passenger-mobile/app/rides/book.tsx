import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  BackHandler,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, Navigation, CreditCard, ChevronRight } from 'lucide-react-native';
import { theme } from '../../src/theme';
import {
  AppHeader,
  InteractiveMap,
  VehicleCard,
  PrimaryButton,
} from '../../src/components';
import { useRideStore } from '../../src/stores';
import { mockLocations } from '../../src/mocks';
import { LocationService } from '../../src/services/location.service';
import { formatETB } from '../../src/utils/currency';
import { useTranslation } from '../../src/i18n';

export default function RideBookingScreen() {
  const router = useRouter();
  const { t } = useTranslation(['transportation', 'common', 'navigation', 'payments']);
  const {
    pickupLocation,
    destinationLocation,
    selectedCategory,
    availableVehicles,
    setPickup,
    setDestination,
    selectCategory,
    requestRide,
  } = useRideStore();

  const [isSelectingPickup, setIsSelectingPickup] = useState(false);
  const [isSelectingDestination, setIsSelectingDestination] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] = useState(true);

  // Android BackHandler & GPS initialization
  useEffect(() => {
    const onBackPress = () => {
      if (isSelectingPickup || isSelectingDestination) {
        setIsSelectingPickup(false);
        setIsSelectingDestination(false);
        return true;
      }
      return false;
    };

    const backSub = BackHandler.addEventListener('hardwareBackPress', onBackPress);

    // Acquire current GPS position if permission is granted
    LocationService.checkPermissions().then((perm) => {
      setHasLocationPermission(perm.granted);
      if (perm.granted) {
        LocationService.getCurrentLocation().then(async (coords) => {
          const rev = await LocationService.reverseGeocode(coords);
          setPickup({
            id: 'current_user_location',
            title: rev.title,
            address: rev.address,
            coordinates: coords,
          });
        });
      }
    });

    return () => {
      backSub.remove();
    };
  }, [isSelectingPickup, isSelectingDestination, setPickup]);

  const handleRequestGpsPermission = async () => {
    const res = await LocationService.requestPermissions();
    setHasLocationPermission(res.granted);
    if (res.granted) {
      const coords = await LocationService.getCurrentLocation();
      const rev = await LocationService.reverseGeocode(coords);
      setPickup({
        id: 'current_user_location',
        title: rev.title,
        address: rev.address,
        coordinates: coords,
      });
    }
  };

  const selectedVehicle =
    availableVehicles.find((v) => v.id === selectedCategory) || availableVehicles[0];

  const handleConfirmBooking = async () => {
    if (!destinationLocation) return;
    await requestRide();
    router.replace('/rides/active');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title={t('navigation:titles.rideBooking')} showBack />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Interactive Map Visual */}
        <InteractiveMap
          pickupCoords={pickupLocation.coordinates}
          destinationCoords={destinationLocation?.coordinates}
          permissionGranted={hasLocationPermission}
          onRequestPermission={handleRequestGpsPermission}
          height={210}
          style={styles.mapContainer}
        />

        {/* Location Selectors Container */}
        <View style={styles.locationsCard}>
          {/* Pickup Row */}
          <TouchableOpacity
            style={styles.locationSelectorRow}
            onPress={() => {
              setIsSelectingPickup(!isSelectingPickup);
              setIsSelectingDestination(false);
            }}
          >
            <View style={[styles.dotCircle, { backgroundColor: theme.colors.success }]}>
              <Navigation size={12} color="#FFFFFF" />
            </View>
            <View style={styles.locationTextContainer}>
              <Text style={styles.locationLabel}>{t('pickupLocation')}</Text>
              <Text style={styles.locationTitle} numberOfLines={1}>
                {pickupLocation.title}
              </Text>
            </View>
            <Text style={styles.changeActionText}>{t('common:edit')}</Text>
          </TouchableOpacity>

          {/* Pickup Choices Dropdown */}
          {isSelectingPickup && (
            <View style={styles.dropdownChoices}>
              {mockLocations.map((loc) => (
                <TouchableOpacity
                  key={`pickup_${loc.id}`}
                  style={styles.choiceItem}
                  onPress={() => {
                    setPickup(loc);
                    setIsSelectingPickup(false);
                  }}
                >
                  <MapPin size={14} color={theme.colors.success} />
                  <Text style={styles.choiceText}>{loc.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.locationDivider} />

          {/* Destination Row */}
          <TouchableOpacity
            style={styles.locationSelectorRow}
            onPress={() => {
              setIsSelectingDestination(!isSelectingDestination);
              setIsSelectingPickup(false);
            }}
          >
            <View style={[styles.dotCircle, { backgroundColor: theme.colors.danger }]}>
              <MapPin size={12} color="#FFFFFF" />
            </View>
            <View style={styles.locationTextContainer}>
              <Text style={styles.locationLabel}>{t('destination')}</Text>
              <Text
                style={[
                  styles.locationTitle,
                  !destinationLocation && styles.placeholderText,
                ]}
                numberOfLines={1}
              >
                {destinationLocation ? destinationLocation.title : t('enterDestination')}
              </Text>
            </View>
            <Text style={styles.changeActionText}>
              {destinationLocation ? t('common:edit') : t('common:search')}
            </Text>
          </TouchableOpacity>

          {/* Destination Choices Dropdown */}
          {isSelectingDestination && (
            <View style={styles.dropdownChoices}>
              {mockLocations
                .filter((l) => l.id !== pickupLocation.id)
                .map((loc) => (
                  <TouchableOpacity
                    key={`dest_${loc.id}`}
                    style={styles.choiceItem}
                    onPress={() => {
                      setDestination(loc);
                      setIsSelectingDestination(false);
                    }}
                  >
                    <MapPin size={14} color={theme.colors.danger} />
                    <Text style={styles.choiceText}>{loc.title}</Text>
                  </TouchableOpacity>
                ))}
            </View>
          )}
        </View>

        {/* Vehicle Selection Header */}
        <Text style={styles.sectionTitle}>{t('selectVehicle')}</Text>

        {/* Vehicle Options List */}
        <View style={styles.vehiclesList}>
          {availableVehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              isSelected={selectedCategory === vehicle.id}
              onSelect={() => selectCategory(vehicle.id)}
            />
          ))}
        </View>

        {/* Payment Method Preview */}
        <TouchableOpacity
          style={styles.paymentMethodPreview}
          onPress={() => router.push('/payments/checkout')}
        >
          <View style={styles.paymentLeft}>
            <CreditCard size={18} color={theme.colors.primaryDark} />
            <Text style={styles.paymentLabel}>{t('paymentMethod')}:</Text>
            <Text style={styles.paymentMethodName}>Telebirr</Text>
          </View>
          <ChevronRight size={16} color={theme.colors.textMuted} />
        </TouchableOpacity>

        {/* Book Button */}
        <PrimaryButton
          title={
            destinationLocation
              ? `${t('bookRideBtn')} • ${formatETB(selectedVehicle.estimatedPrice)}`
              : t('enterDestination')
          }
          onPress={handleConfirmBooking}
          disabled={!destinationLocation}
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
  mapContainer: {
    marginBottom: theme.spacing.md,
  },
  locationsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
    ...theme.shadows.subtle,
  },
  locationSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  dotCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  locationTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  placeholderText: {
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  changeActionText: {
    ...theme.typography.captionBold,
    color: theme.colors.primaryDark,
    paddingHorizontal: 4,
  },
  locationDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.sm,
    marginLeft: 36,
  },
  dropdownChoices: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
    gap: 6,
  },
  choiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surface,
    gap: theme.spacing.sm,
  },
  choiceText: {
    ...theme.typography.bodySmall,
    color: theme.colors.text,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  vehiclesList: {
    marginBottom: theme.spacing.md,
  },
  paymentMethodPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  paymentLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  paymentMethodName: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  requestBtn: {
    marginTop: theme.spacing.xs,
  },
});
