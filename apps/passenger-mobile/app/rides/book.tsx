import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
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
import { formatETB } from '../../src/utils/currency';

export default function RideBookingScreen() {
  const router = useRouter();
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

  const selectedVehicle =
    availableVehicles.find((v) => v.id === selectedCategory) || availableVehicles[0];

  const handleConfirmBooking = async () => {
    if (!destinationLocation) return;
    await requestRide();
    router.replace('/rides/active');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title="Book a Kings Ride" showBack />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Interactive Map Visual */}
        <InteractiveMap
          pickupCoords={pickupLocation.coordinates}
          destinationCoords={destinationLocation?.coordinates}
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
              <Text style={styles.locationLabel}>Pickup Location</Text>
              <Text style={styles.locationTitle} numberOfLines={1}>
                {pickupLocation.title}
              </Text>
            </View>
            <Text style={styles.changeActionText}>Change</Text>
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
              <Text style={styles.locationLabel}>Dropoff Destination</Text>
              <Text
                style={[
                  styles.locationTitle,
                  !destinationLocation && styles.placeholderText,
                ]}
                numberOfLines={1}
              >
                {destinationLocation ? destinationLocation.title : 'Select dropoff destination...'}
              </Text>
            </View>
            <Text style={styles.changeActionText}>
              {destinationLocation ? 'Change' : 'Choose'}
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
        <Text style={styles.sectionTitle}>Choose Vehicle Category</Text>

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
            <Text style={styles.paymentLabel}>Payment Method:</Text>
            <Text style={styles.paymentMethodName}>Telebirr SuperApp</Text>
          </View>
          <ChevronRight size={16} color={theme.colors.textMuted} />
        </TouchableOpacity>

        {/* Book Button */}
        <PrimaryButton
          title={
            destinationLocation
              ? `Confirm Kings ${selectedVehicle.name.replace('Kings ', '')} • ${formatETB(selectedVehicle.estimatedPrice)}`
              : 'Please Select Destination'
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
