import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  MapPin,
  Calendar,
  Clock,
  Users,
  Car,
  Plus,
  Trash2,
  ArrowUpDown,
  AlertCircle,
  CheckCircle2,
  FileCheck,
} from 'lucide-react-native';
import { theme } from '../../src/theme';
import { AppHeader, PrimaryButton, SecondaryButton } from '../../src/components';
import { mockHeritageSites } from '../../src/mocks';
import { useBookingStore } from '../../src/stores';
import { formatETB } from '../../src/utils/currency';
import { CustomContractStop } from '../../src/types';

interface VehicleContractChoice {
  id: 'suv' | 'van' | 'minibus' | 'coaster_bus';
  name: string;
  description: string;
  capacity: number;
  dailyRateETB: number;
}

const contractVehicles: VehicleContractChoice[] = [
  {
    id: 'suv',
    name: 'Private 4WD Land Cruiser / Prado',
    description: 'All-terrain luxury vehicle ideal for highlands and national parks',
    capacity: 4,
    dailyRateETB: 8500,
  },
  {
    id: 'van',
    name: 'Toyota HiAce Tour Van',
    description: 'High roof, spacious luggage capacity for small groups',
    capacity: 7,
    dailyRateETB: 7000,
  },
  {
    id: 'minibus',
    name: 'Executive Minibus',
    description: 'Comfortable air-conditioned transport for delegations',
    capacity: 14,
    dailyRateETB: 11000,
  },
  {
    id: 'coaster_bus',
    name: 'Toyota Coaster Tour Coach',
    description: 'Full tourist coach for medium to large tour groups',
    capacity: 26,
    dailyRateETB: 16500,
  },
];

export default function ContractBuilderScreen() {
  const router = useRouter();
  const { createTourContract } = useBookingStore();

  // Initial stops: Gondar Fasil Ghebbi & Debre Berhan Selassie (from prompt example)
  const [selectedStops, setSelectedStops] = useState<CustomContractStop[]>([
    {
      id: 'stop_fasil',
      heritageSiteId: 'hrt_fasil_gondar',
      siteName: 'Fasil Ghebbi Royal Enclosure',
      region: 'Gondar, Amhara',
      durationHours: 4,
      order: 1,
    },
    {
      id: 'stop_debre',
      heritageSiteId: 'hrt_debre_berhan',
      siteName: 'Debre Berhan Selassie Church',
      region: 'Gondar, Amhara',
      durationHours: 3,
      order: 2,
    },
  ]);

  const [departureLocation, setDepartureLocation] = useState('Gondar City Center / Airport');
  const [startDate, setStartDate] = useState('2026-11-18');
  const [departureTime, setDepartureTime] = useState('08:30 AM');
  const [passengersCount, setPassengersCount] = useState(3);
  const [durationDays, setDurationDays] = useState(2);
  const [selectedVehicleId, setSelectedVehicleId] = useState<VehicleContractChoice['id']>('suv');
  const [specialNotes, setSpecialNotes] = useState('English-speaking certified historical guide requested.');
  const [showAvailableSitesModal, setShowAvailableSitesModal] = useState(false);
  const [submittedContract, setSubmittedContract] = useState<any>(null);

  const selectedVehicle =
    contractVehicles.find((v) => v.id === selectedVehicleId) || contractVehicles[0];

  // Estimated contract cost calculation
  const estimatedCost = selectedVehicle.dailyRateETB * durationDays;

  const handleAddStop = (site: typeof mockHeritageSites[0]) => {
    const newStop: CustomContractStop = {
      id: `stop_${Date.now()}`,
      heritageSiteId: site.id,
      siteName: site.name,
      region: site.region,
      durationHours: 3,
      order: selectedStops.length + 1,
    };
    setSelectedStops([...selectedStops, newStop]);
    setShowAvailableSitesModal(false);
  };

  const handleRemoveStop = (id: string) => {
    setSelectedStops(selectedStops.filter((s) => s.id !== id));
  };

  const handleSwapOrder = (indexA: number, indexB: number) => {
    if (indexB < 0 || indexB >= selectedStops.length) return;
    const updated = [...selectedStops];
    const temp = updated[indexA];
    updated[indexA] = updated[indexB];
    updated[indexB] = temp;
    setSelectedStops(updated);
  };

  const handleSubmitRequest = () => {
    const contract = createTourContract({
      departureLocation: {
        id: 'loc_custom_dep',
        title: departureLocation,
        address: departureLocation,
        coordinates: { latitude: 12.6078, longitude: 37.4705 },
      },
      selectedStops,
      startDate,
      departureTime,
      passengersCount,
      vehicleCategory: selectedVehicleId,
      durationDays,
      estimatedPriceETB: estimatedCost,
      notes: specialNotes,
    });

    setSubmittedContract(contract);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title="Chauffeured Tour Contract" showBack />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {submittedContract ? (
          <View style={styles.confirmationSuccess}>
            <CheckCircle2 size={54} color={theme.colors.success} />
            <Text style={styles.successTitle}>Contract Request Submitted!</Text>
            <Text style={styles.successDesc}>
              Your custom tour request has been recorded. Kings Taxi Tour Dispatch will review your stops and confirm vehicle and driver assignment.
            </Text>

            <View style={styles.quotationNotice}>
              <AlertCircle size={18} color="#92400E" />
              <Text style={styles.quotationNoticeText}>
                Important: The displayed amount of {formatETB(submittedContract.estimatedPriceETB)} is an ESTIMATED QUOTATION. Final payable amount is confirmed upon dispatch approval.
              </Text>
            </View>

            <PrimaryButton
              title="View in My Bookings"
              onPress={() => router.replace('/(tabs)/bookings')}
              style={styles.viewBookingsBtn}
            />
          </View>
        ) : (
          <>
            {/* Value Explanation Banner */}
            <View style={styles.explainerCard}>
              <Text style={styles.explainerTitle}>Full-Contract Multi-Stop Transport</Text>
              <Text style={styles.explainerDesc}>
                Customize your private chauffeured itinerary. Select heritage landmarks, set visit order, choose an all-terrain vehicle, and receive an upfront ETB contract estimate.
              </Text>
            </View>

            {/* 1. Departure Point */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeaderTitle}>1. Departure Location</Text>
              <View style={styles.inputContainer}>
                <MapPin size={18} color={theme.colors.primaryDark} />
                <TextInput
                  value={departureLocation}
                  onChangeText={setDepartureLocation}
                  style={styles.textInput}
                  placeholder="Enter pickup city or airport..."
                />
              </View>
            </View>

            {/* 2. Destination Itinerary & Reordering */}
            <View style={styles.sectionCard}>
              <View style={styles.itineraryHeaderRow}>
                <Text style={styles.sectionHeaderTitle}>
                  2. Itinerary Stops ({selectedStops.length})
                </Text>
                <TouchableOpacity
                  style={styles.addStopBtn}
                  onPress={() => setShowAvailableSitesModal(!showAvailableSitesModal)}
                >
                  <Plus size={14} color={theme.colors.primaryDark} />
                  <Text style={styles.addStopText}>Add Landmark</Text>
                </TouchableOpacity>
              </View>

              {/* Addable Landmark Selector Drawer */}
              {showAvailableSitesModal && (
                <View style={styles.availableSitesDrawer}>
                  <Text style={styles.drawerTitle}>Select Heritage Landmark to Add:</Text>
                  {mockHeritageSites
                    .filter((s) => !selectedStops.some((st) => st.heritageSiteId === s.id))
                    .map((site) => (
                      <TouchableOpacity
                        key={site.id}
                        style={styles.availableSiteItem}
                        onPress={() => handleAddStop(site)}
                      >
                        <Text style={styles.availableSiteName}>{site.name}</Text>
                        <Text style={styles.availableSiteRegion}>{site.region}</Text>
                      </TouchableOpacity>
                    ))}
                </View>
              )}

              {/* Selected Stops Sequence */}
              <View style={styles.stopsList}>
                {selectedStops.map((stop, index) => (
                  <View key={stop.id} style={styles.stopCard}>
                    <View style={styles.stopOrderBadge}>
                      <Text style={styles.stopOrderText}>{index + 1}</Text>
                    </View>
                    <View style={styles.stopInfo}>
                      <Text style={styles.stopTitle}>{stop.siteName}</Text>
                      <Text style={styles.stopRegion}>
                        {stop.region} • Est. visit {stop.durationHours} hrs
                      </Text>
                    </View>
                    {/* Order adjustments */}
                    <View style={styles.stopActions}>
                      {index > 0 && (
                        <TouchableOpacity
                          style={styles.reorderBtn}
                          onPress={() => handleSwapOrder(index, index - 1)}
                        >
                          <ArrowUpDown size={14} color={theme.colors.secondary} />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleRemoveStop(stop.id)}
                      >
                        <Trash2 size={14} color={theme.colors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* 3. Schedule & Duration */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeaderTitle}>3. Schedule & Passengers</Text>
              <View style={styles.scheduleGrid}>
                <View style={styles.scheduleItem}>
                  <Text style={styles.fieldLabel}>Start Date</Text>
                  <View style={styles.fieldBox}>
                    <Calendar size={14} color={theme.colors.textMuted} />
                    <TextInput
                      value={startDate}
                      onChangeText={setStartDate}
                      style={styles.fieldInput}
                      placeholder="YYYY-MM-DD"
                    />
                  </View>
                </View>

                <View style={styles.scheduleItem}>
                  <Text style={styles.fieldLabel}>Departure Time</Text>
                  <View style={styles.fieldBox}>
                    <Clock size={14} color={theme.colors.textMuted} />
                    <TextInput
                      value={departureTime}
                      onChangeText={setDepartureTime}
                      style={styles.fieldInput}
                      placeholder="08:00 AM"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.counterRow}>
                <View>
                  <Text style={styles.fieldLabel}>Number of Passengers</Text>
                  <Text style={styles.fieldSub}>{passengersCount} Persons traveling</Text>
                </View>
                <View style={styles.stepperWrap}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setPassengersCount(Math.max(1, passengersCount - 1))}
                  >
                    <Text style={styles.stepText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.stepVal}>{passengersCount}</Text>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setPassengersCount(passengersCount + 1)}
                  >
                    <Text style={styles.stepText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.counterRow, { marginTop: 12 }]}>
                <View>
                  <Text style={styles.fieldLabel}>Contract Duration</Text>
                  <Text style={styles.fieldSub}>{durationDays} Full Day Chauffeured Service</Text>
                </View>
                <View style={styles.stepperWrap}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setDurationDays(Math.max(1, durationDays - 1))}
                  >
                    <Text style={styles.stepText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.stepVal}>{durationDays}</Text>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setDurationDays(durationDays + 1)}
                  >
                    <Text style={styles.stepText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* 4. Select Fleet Category */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeaderTitle}>4. Chauffeured Vehicle Fleet</Text>
              {contractVehicles.map((vehicle) => {
                const isSelected = vehicle.id === selectedVehicleId;
                return (
                  <TouchableOpacity
                    key={vehicle.id}
                    onPress={() => setSelectedVehicleId(vehicle.id)}
                    style={[
                      styles.vehicleOptionCard,
                      isSelected && styles.vehicleOptionSelected,
                    ]}
                  >
                    <View style={styles.vehicleOptionHeader}>
                      <Text style={styles.vehicleOptionName}>{vehicle.name}</Text>
                      <Text style={styles.vehicleOptionPrice}>
                        {formatETB(vehicle.dailyRateETB)}
                        <Text style={styles.dailyText}> / day</Text>
                      </Text>
                    </View>
                    <Text style={styles.vehicleOptionDesc}>{vehicle.description}</Text>
                    <View style={styles.capacityRow}>
                      <Users size={12} color={theme.colors.textMuted} />
                      <Text style={styles.capacityText}>Seats up to {vehicle.capacity} passengers</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 5. Special Notes */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeaderTitle}>5. Special Inquiries & Guide Requests</Text>
              <TextInput
                value={specialNotes}
                onChangeText={setSpecialNotes}
                style={styles.notesInput}
                multiline
                numberOfLines={2}
                placeholder="Specify guide language preferences, special luggage requirements, etc."
              />
            </View>

            {/* Clear Status Notice (Required by prompt) */}
            <View style={styles.disclaimerBox}>
              <AlertCircle size={18} color="#B45309" />
              <View style={styles.disclaimerTextWrap}>
                <Text style={styles.disclaimerTitle}>Quotation Transparency</Text>
                <Text style={styles.disclaimerBody}>
                  The estimated total of {formatETB(estimatedCost)} is an unconfirmed price quotation. Your dedicated booking representative will review fuel itineraries and provide confirmed contract acceptance.
                </Text>
              </View>
            </View>

            {/* Submit Contract Request CTA */}
            <PrimaryButton
              title={`Submit Contract Request • Est. ${formatETB(estimatedCost)}`}
              onPress={handleSubmitRequest}
              style={styles.submitBtn}
            />
          </>
        )}
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
  explainerCard: {
    backgroundColor: theme.colors.secondary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  explainerTitle: {
    ...theme.typography.h3,
    color: theme.colors.textInverse,
    marginBottom: 4,
  },
  explainerDesc: {
    ...theme.typography.caption,
    color: '#CBD5E1',
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
    ...theme.shadows.subtle,
  },
  sectionHeaderTitle: {
    ...theme.typography.h4,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    height: 48,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  textInput: {
    flex: 1,
    ...theme.typography.body,
    color: theme.colors.text,
  },
  itineraryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  addStopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.sm,
  },
  addStopText: {
    ...theme.typography.captionBold,
    color: theme.colors.primaryDark,
  },
  availableSitesDrawer: {
    backgroundColor: theme.colors.surfaceMuted,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    gap: 6,
  },
  drawerTitle: {
    ...theme.typography.captionBold,
    color: theme.colors.textMuted,
    marginBottom: 2,
  },
  availableSiteItem: {
    backgroundColor: theme.colors.surface,
    padding: 10,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  availableSiteName: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  availableSiteRegion: {
    ...theme.typography.caption,
    color: theme.colors.heritageAccent,
  },
  stopsList: {
    gap: theme.spacing.sm,
  },
  stopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    padding: 10,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  stopOrderBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  stopOrderText: {
    ...theme.typography.captionBold,
    color: theme.colors.textInverse,
  },
  stopInfo: {
    flex: 1,
  },
  stopTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  stopRegion: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  stopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reorderBtn: {
    padding: 6,
  },
  deleteBtn: {
    padding: 6,
  },
  scheduleGrid: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  scheduleItem: {
    flex: 1,
  },
  fieldLabel: {
    ...theme.typography.captionBold,
    color: theme.colors.text,
    marginBottom: 4,
  },
  fieldSub: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 10,
    height: 44,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  fieldInput: {
    flex: 1,
    ...theme.typography.bodySmall,
    color: theme.colors.text,
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.borderRadius.md,
    padding: 4,
    gap: 12,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  stepText: {
    ...theme.typography.h4,
    color: theme.colors.text,
  },
  stepVal: {
    ...theme.typography.h4,
    color: theme.colors.text,
    minWidth: 18,
    textAlign: 'center',
  },
  vehicleOptionCard: {
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  vehicleOptionSelected: {
    borderColor: theme.colors.primaryDark,
    backgroundColor: theme.colors.primaryLight,
  },
  vehicleOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleOptionName: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
    flex: 1,
  },
  vehicleOptionPrice: {
    ...theme.typography.h4,
    color: theme.colors.primaryDark,
  },
  dailyText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  vehicleOptionDesc: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginVertical: 4,
  },
  capacityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  capacityText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  notesInput: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    ...theme.typography.bodySmall,
    color: theme.colors.text,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  disclaimerBox: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  disclaimerTextWrap: {
    flex: 1,
  },
  disclaimerTitle: {
    ...theme.typography.captionBold,
    color: '#92400E',
  },
  disclaimerBody: {
    ...theme.typography.caption,
    color: '#92400E',
    marginTop: 2,
    lineHeight: 16,
  },
  submitBtn: {
    marginBottom: theme.spacing.lg,
  },
  confirmationSuccess: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  successTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  successDesc: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
  quotationNotice: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.lg,
    gap: 8,
  },
  quotationNoticeText: {
    ...theme.typography.caption,
    color: '#92400E',
    flex: 1,
  },
  viewBookingsBtn: {
    width: '100%',
    marginTop: theme.spacing.xl,
  },
});
