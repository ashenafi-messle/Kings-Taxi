import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  MapPin,
  Calendar,
  Clock,
  Users,
  Car,
  Compass,
  Ship,
  CheckCircle2,
  Shield,
  CreditCard,
  Sparkles,
  ChevronRight,
  Info,
  Award,
  Ticket,
} from 'lucide-react-native';
import { theme } from '../../src/theme';
import { AppHeader, PrimaryButton, SecondaryButton } from '../../src/components';
import { HeritageService } from '../../src/services/heritage.service';
import { mockHeritageSites } from '../../src/mocks';
import {
  TourPackage,
  TourVehicleOption,
  TourGuide,
  TourQuote,
  TourBooking,
  HeritageSite,
} from '../../src/types';
import { formatETB } from '../../src/utils/currency';
import { useTranslation } from '../../src/i18n';

export default function TourBookingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useTranslation(['heritage', 'common']);

  // Check if passenger arrived from a specific popular destination
  const siteId = params.siteId as string | undefined;
  const selectedSite: HeritageSite | null = siteId
    ? mockHeritageSites.find((s) => s.id === siteId || (s as any).slug === siteId) || null
    : null;

  // Loading & Data States
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [packages, setPackages] = useState<TourPackage[]>([]);
  const [vehicles, setVehicles] = useState<TourVehicleOption[]>([]);
  const [guides, setGuides] = useState<TourGuide[]>([]);

  // Selection States
  const [selectedPackageId, setSelectedPackageId] = useState<string>(
    (params.packageId as string) || ''
  );
  const [scheduledDate, setScheduledDate] = useState<string>(() => {
    // Dynamic Addis Ababa default: tomorrow
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [preferredStartTime, setPreferredStartTime] = useState('09:00');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [requestGuide, setRequestGuide] = useState(true);
  const [guideLanguage, setGuideLanguage] = useState('English');
  const [pickupLocation, setPickupLocation] = useState('Gondar City Center / Hotel Lobby');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TELEBIRR' | 'CBE_BIRR' | 'CHAPA'>('TELEBIRR');
  const [specialRequests, setSpecialRequests] = useState('');

  // Authoritative Quote
  const [quote, setQuote] = useState<TourQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Confirmed Booking
  const [confirmedBooking, setConfirmedBooking] = useState<TourBooking | null>(null);

  // Load initial catalog
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [pkgRes, vehRes, guideRes] = await Promise.all([
          HeritageService.getPackages(),
          HeritageService.getVehicleOptions(),
          HeritageService.getGuides(),
        ]);

        if (pkgRes.success && pkgRes.data) {
          setPackages(pkgRes.data);
          if (!selectedSite && !selectedPackageId && pkgRes.data.length > 0) {
            setSelectedPackageId(pkgRes.data[0].id);
          }
        }

        if (vehRes.success && vehRes.data) {
          setVehicles(vehRes.data);
          if (vehRes.data.length > 0) {
            setSelectedVehicleId(vehRes.data[0].id);
          }
        }

        if (guideRes.success && guideRes.data) {
          setGuides(guideRes.data);
        }
      } catch (err) {
        console.warn('Failed to load tour options:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedSite]);

  // Fetch Authoritative Quote whenever parameters change
  useEffect(() => {
    async function fetchQuote() {
      // Must have either a site selected or a package selected, plus a vehicle
      if ((!selectedSite && !selectedPackageId) || !selectedVehicleId) return;
      setQuoteLoading(true);
      setQuoteError(null);

      try {
        const quotePayload: any = {
          scheduledDate,
          preferredStartTime,
          adults,
          children,
          vehicleOptionId: selectedVehicleId,
          requestGuide,
          preferredGuideLanguage: guideLanguage,
          pickupLocation,
        };

        if (selectedSite) {
          quotePayload.siteIds = [selectedSite.id];
        } else if (selectedPackageId) {
          quotePayload.packageId = selectedPackageId;
        }

        const res = await HeritageService.getQuote(quotePayload);

        if (res.success && res.data) {
          setQuote(res.data);
        } else {
          setQuoteError(res.error || 'Unable to calculate quote');
        }
      } catch (err: any) {
        setQuoteError(err.message || 'Quote calculation failed');
      } finally {
        setQuoteLoading(false);
      }
    }

    fetchQuote();
  }, [
    selectedSite,
    selectedPackageId,
    scheduledDate,
    preferredStartTime,
    adults,
    children,
    selectedVehicleId,
    requestGuide,
    guideLanguage,
  ]);

  const selectedPkg = packages.find((p) => p.id === selectedPackageId);
  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
  const totalPax = adults + children;

  // Handle Booking Submission
  const handleConfirmBooking = async () => {
    if (!pickupLocation.trim()) {
      Alert.alert('Pickup Location Required', 'Please provide a hotel or pickup address in Gondar.');
      return;
    }

    if (selectedVehicle && totalPax > selectedVehicle.seatingCapacity) {
      Alert.alert(
        'Vehicle Capacity Exceeded',
        `Selected vehicle seats up to ${selectedVehicle.seatingCapacity} passengers, but ${totalPax} passengers requested.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const bookingPayload: any = {
        scheduledDate,
        preferredStartTime,
        adults,
        children,
        vehicleOptionId: selectedVehicleId,
        requestGuide,
        preferredGuideLanguage: guideLanguage,
        pickupLocation: pickupLocation.trim(),
        paymentMethod,
        specialRequests: specialRequests.trim() || undefined,
      };

      if (selectedSite) {
        bookingPayload.siteIds = [selectedSite.id];
      } else if (selectedPackageId) {
        bookingPayload.packageId = selectedPackageId;
      }

      const res = await HeritageService.createBooking(bookingPayload);

      if (res.success && res.data) {
        setConfirmedBooking(res.data);
      } else {
        Alert.alert('Booking Error', res.error || 'Failed to submit booking request.');
      }
    } catch (err: any) {
      Alert.alert('Booking Error', err.message || 'Network error submitting booking.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="Tour Booking" showBack />
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={theme.colors.heritageAccent} />
          <Text style={styles.loadingText}>Loading heritage tour options...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Confirmation View
  if (confirmedBooking) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader
          title="Booking Confirmed"
          showBack
          onBack={() => router.replace('/(tabs)/explore')}
        />
        <ScrollView contentContainerStyle={styles.confirmedContent}>
          <View style={styles.successBadge}>
            <CheckCircle2 size={54} color="#059669" />
          </View>
          <Text style={styles.confirmedTitle}>Heritage Tour Requested!</Text>
          <Text style={styles.confirmedSubtitle}>
            Your chauffeured tour booking reference is confirmed and registered with Kings Taxi dispatch.
          </Text>

          <View style={styles.refCard}>
            <Text style={styles.refLabel}>Booking Reference</Text>
            <Text style={styles.refValue}>{confirmedBooking.bookingReference}</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.cardHeader}>Tour Journey Details</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Destination / Tour</Text>
              <Text style={styles.summaryValue}>
                {confirmedBooking.packageName || selectedSite?.name || selectedPkg?.name}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Date & Time</Text>
              <Text style={styles.summaryValue}>
                {confirmedBooking.scheduledDate} at {confirmedBooking.preferredStartTime}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Passengers</Text>
              <Text style={styles.summaryValue}>
                {confirmedBooking.adults} Adults
                {confirmedBooking.children > 0 ? `, ${confirmedBooking.children} Children` : ''}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Pickup Location</Text>
              <Text style={styles.summaryValue}>{confirmedBooking.pickupLocation}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Chauffeured Vehicle</Text>
              <Text style={styles.summaryValue}>
                {confirmedBooking.vehicleOption?.displayName || selectedVehicle?.displayName}
              </Text>
            </View>
            {confirmedBooking.guideRequested && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Guide Service</Text>
                <Text style={styles.summaryValue}>
                  Licensed Guide ({confirmedBooking.guideLanguage || 'English'})
                </Text>
              </View>
            )}
            {confirmedBooking.requiresBoatTransport && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Water Transit</Text>
                <Text style={[styles.summaryValue, { color: '#0284C7' }]}>
                  Lake Tana Boat Charter Included
                </Text>
              </View>
            )}
            <View style={[styles.summaryRow, styles.summaryTotalRow]}>
              <Text style={styles.totalLabel}>Total Fare</Text>
              <Text style={styles.totalValue}>{formatETB(confirmedBooking.totalAmount)}</Text>
            </View>
          </View>

          <PrimaryButton
            title="Return to Explorer"
            onPress={() => router.replace('/(tabs)/explore')}
            style={styles.doneBtn}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Step numbering adjustment: if site is already selected, start with Step 1 = Date & Time
  const stepOffset = selectedSite ? 0 : 1;

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title={selectedSite ? `Book Tour: ${selectedSite.name}` : 'Schedule Heritage Tour'}
        showBack
      />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* SELECTED POPULAR DESTINATION CARD (when arrived from View Detail) */}
        {selectedSite ? (
          <View style={styles.selectedSiteCard}>
            <Image source={{ uri: selectedSite.heroImage }} style={styles.selectedSiteHero} />
            <View style={styles.selectedSiteBody}>
              <View style={styles.selectedSiteBadgeRow}>
                <View style={styles.selectedSitePill}>
                  <Compass size={12} color="#92400E" />
                  <Text style={styles.selectedSitePillText}>Selected Destination</Text>
                </View>
                {selectedSite.unescoDesignated && (
                  <View style={styles.unescoPill}>
                    <Award size={12} color="#7C3AED" />
                    <Text style={styles.unescoPillText}>
                      UNESCO ({selectedSite.unescoYear || 1979})
                    </Text>
                  </View>
                )}
              </View>

              <Text style={styles.selectedSiteTitle}>{selectedSite.name}</Text>

              <View style={styles.selectedSiteLocRow}>
                <MapPin size={14} color={theme.colors.heritageAccent} />
                <Text style={styles.selectedSiteLocText}>{selectedSite.region}</Text>
              </View>

              <View style={styles.selectedSiteMetaRow}>
                <View style={styles.feeBadge}>
                  <Ticket size={13} color={theme.colors.textMuted} />
                  <Text style={styles.feeBadgeText}>
                    Admission: {formatETB(selectedSite.entryFeeETB)} / guest
                  </Text>
                </View>

                {selectedSite.requiresBoatTransport && (
                  <View style={styles.boatPill}>
                    <Ship size={13} color="#0284C7" />
                    <Text style={styles.boatPillText}>Lake Tana Boat Charter Included</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        ) : (
          /* PACKAGE SELECTOR (only shown if NO specific site was selected upfront) */
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>1. Select Tour Package</Text>
            <Text style={styles.sectionSubtitle}>
              Curated historical itineraries with chauffeured transport across Gondar & Lake Tana.
            </Text>

            {packages.map((pkg) => {
              const isSelected = pkg.id === selectedPackageId;
              return (
                <TouchableOpacity
                  key={pkg.id}
                  style={[styles.packageCard, isSelected && styles.packageCardSelected]}
                  onPress={() => setSelectedPackageId(pkg.id)}
                >
                  <View style={styles.packageCardHeader}>
                    <Text style={[styles.packageName, isSelected && styles.packageNameSelected]}>
                      {pkg.name}
                    </Text>
                    <Text style={styles.packagePrice}>{formatETB(pkg.basePrice)}</Text>
                  </View>
                  <Text style={styles.packageDesc}>{pkg.description}</Text>

                  <View style={styles.packagePillsRow}>
                    <View style={styles.tagPill}>
                      <Clock size={12} color={theme.colors.heritageAccent} />
                      <Text style={styles.tagPillText}>
                        {Math.round(pkg.estimatedDurationMinutes / 60)} Hours
                      </Text>
                    </View>
                    {pkg.includesBoat && (
                      <View style={[styles.tagPill, { backgroundColor: '#E0F2FE' }]}>
                        <Ship size={12} color="#0284C7" />
                        <Text style={[styles.tagPillText, { color: '#0369A1' }]}>
                          Lake Tana Boat Charter
                        </Text>
                      </View>
                    )}
                    {pkg.featured && (
                      <View style={[styles.tagPill, { backgroundColor: '#FEF3C7' }]}>
                        <Sparkles size={12} color="#D97706" />
                        <Text style={[styles.tagPillText, { color: '#B45309' }]}>Popular</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Date & Time Scheduling */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            {stepOffset ? '2' : '1'}. Schedule Date & Departure Time
          </Text>
          <Text style={styles.sectionSubtitle}>
            Addis Ababa local time (Africa/Addis_Ababa). Same-day tours require 6 hours advance notice.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Tour Date (YYYY-MM-DD)</Text>
            <View style={styles.inputWrapper}>
              <Calendar size={18} color={theme.colors.textMuted} />
              <TextInput
                style={styles.textInput}
                value={scheduledDate}
                onChangeText={setScheduledDate}
                placeholder="2026-11-12"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Preferred Morning Departure Time</Text>
            <View style={styles.timeOptionsRow}>
              {['08:00', '08:30', '09:00', '09:30', '10:00'].map((time) => (
                <TouchableOpacity
                  key={time}
                  style={[styles.timePill, preferredStartTime === time && styles.timePillSelected]}
                  onPress={() => setPreferredStartTime(time)}
                >
                  <Text
                    style={[
                      styles.timePillText,
                      preferredStartTime === time && styles.timePillTextSelected,
                    ]}
                  >
                    {time}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Passenger Count */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{stepOffset ? '3' : '2'}. Party Size & Guests</Text>
          <Text style={styles.sectionSubtitle}>
            Admission fees and vehicle capacity will be automatically calculated.
          </Text>

          <View style={styles.counterRow}>
            <View>
              <Text style={styles.counterLabel}>Adults (Age 12+)</Text>
              <Text style={styles.counterSub}>Standard entry fees apply</Text>
            </View>
            <View style={styles.counterControls}>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => setAdults(Math.max(1, adults - 1))}
              >
                <Text style={styles.counterBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.counterValue}>{adults}</Text>
              <TouchableOpacity style={styles.counterBtn} onPress={() => setAdults(adults + 1)}>
                <Text style={styles.counterBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.counterRow}>
            <View>
              <Text style={styles.counterLabel}>Children (Under 12)</Text>
              <Text style={styles.counterSub}>Accompanied by adults</Text>
            </View>
            <View style={styles.counterControls}>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => setChildren(Math.max(0, children - 1))}
              >
                <Text style={styles.counterBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.counterValue}>{children}</Text>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => setChildren(children + 1)}
              >
                <Text style={styles.counterBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Chauffeured Vehicle Selection */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{stepOffset ? '4' : '3'}. Chauffeured Vehicle</Text>
          <Text style={styles.sectionSubtitle}>
            Total party: {totalPax} guests. Please select a vehicle with sufficient seating.
          </Text>

          {vehicles.map((v) => {
            const isSelected = v.id === selectedVehicleId;
            const isOverCapacity = totalPax > v.seatingCapacity;
            return (
              <TouchableOpacity
                key={v.id}
                style={[
                  styles.vehicleOptionCard,
                  isSelected && styles.vehicleOptionSelected,
                  isOverCapacity && styles.vehicleOptionDisabled,
                ]}
                onPress={() => {
                  if (!isOverCapacity) setSelectedVehicleId(v.id);
                }}
              >
                <View style={styles.vehicleHeader}>
                  <View style={styles.vehicleTitleRow}>
                    <Car
                      size={18}
                      color={isSelected ? theme.colors.heritageAccent : theme.colors.textMuted}
                    />
                    <Text style={[styles.vehicleName, isSelected && styles.vehicleNameSelected]}>
                      {v.displayName}
                    </Text>
                  </View>
                  <Text style={styles.vehiclePrice}>{formatETB(v.baseRate)}</Text>
                </View>

                <View style={styles.vehicleMeta}>
                  <Text style={styles.vehicleCapacity}>
                    Capacity: Up to {v.seatingCapacity} seats • {v.luggageCapacity} bags
                  </Text>
                  {isOverCapacity && (
                    <Text style={styles.capacityWarning}>
                      Capacity exceeded for {totalPax} guests
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Professional Tour Guide */}
        <View style={styles.sectionCard}>
          <View style={styles.guideHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>
                {stepOffset ? '5' : '4'}. Certified Tour Guide
              </Text>
              <Text style={styles.sectionSubtitle}>
                Historical insights, royal dynasty lore, and church iconography
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.toggleBtn, requestGuide && styles.toggleBtnActive]}
              onPress={() => setRequestGuide(!requestGuide)}
            >
              <Text style={[styles.toggleBtnText, requestGuide && styles.toggleBtnTextActive]}>
                {requestGuide ? 'INCLUDED' : 'OPTIONAL'}
              </Text>
            </TouchableOpacity>
          </View>

          {requestGuide && (
            <View style={styles.guideLangSelect}>
              <Text style={styles.inputLabel}>Preferred Guide Language</Text>
              <View style={styles.langPillsRow}>
                {['English', 'Amharic', 'French', 'German'].map((lang) => (
                  <TouchableOpacity
                    key={lang}
                    style={[styles.langPill, guideLanguage === lang && styles.langPillSelected]}
                    onPress={() => setGuideLanguage(lang)}
                  >
                    <Text
                      style={[
                        styles.langPillText,
                        guideLanguage === lang && styles.langPillTextSelected,
                      ]}
                    >
                      {lang}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Pickup & Payment Details */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            {stepOffset ? '6' : '5'}. Pickup Location & Payment
          </Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Pickup Address / Hotel Name in Gondar</Text>
            <View style={styles.inputWrapper}>
              <MapPin size={18} color={theme.colors.textMuted} />
              <TextInput
                style={styles.textInput}
                value={pickupLocation}
                onChangeText={setPickupLocation}
                placeholder="e.g. Haile Resort Gondar, Lobby"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Payment Method</Text>
            <View style={styles.paymentMethodRow}>
              {(['TELEBIRR', 'CBE_BIRR', 'CHAPA', 'CASH'] as const).map((method) => (
                <TouchableOpacity
                  key={method}
                  style={[
                    styles.paymentPill,
                    paymentMethod === method && styles.paymentPillSelected,
                  ]}
                  onPress={() => setPaymentMethod(method)}
                >
                  <Text
                    style={[
                      styles.paymentPillText,
                      paymentMethod === method && styles.paymentPillTextSelected,
                    ]}
                  >
                    {method.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Special Requests (Optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={specialRequests}
              onChangeText={setSpecialRequests}
              placeholder="e.g. Photography preference, elderly assistance, dietary preferences"
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Authoritative Price Breakdown Card */}
        <View style={styles.quoteCard}>
          <View style={styles.quoteHeader}>
            <Compass size={20} color={theme.colors.heritageAccent} />
            <Text style={styles.quoteTitle}>Itemized Price Summary</Text>
          </View>

          {quoteLoading && (
            <ActivityIndicator
              size="small"
              color={theme.colors.heritageAccent}
              style={{ marginVertical: 10 }}
            />
          )}

          {quoteError && <Text style={styles.quoteErrorText}>{quoteError}</Text>}

          {quote && !quoteLoading && (
            <View style={styles.breakdownList}>
              {quote.pricing.breakdown.map((item, index) => (
                <View key={index} style={styles.breakdownRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.breakdownName}>{item.componentName}</Text>
                    {item.description ? (
                      <Text style={styles.breakdownDesc}>{item.description}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.breakdownPrice}>{formatETB(item.totalPrice)}</Text>
                </View>
              ))}

              <View style={styles.breakdownDivider} />

              <View style={styles.breakdownTotalRow}>
                <Text style={styles.breakdownTotalLabel}>Authoritative Total</Text>
                <Text style={styles.breakdownTotalValue}>
                  {formatETB(quote.pricing.totalAmount)}
                </Text>
              </View>
            </View>
          )}

          <PrimaryButton
            title={submitting ? 'Submitting...' : 'Confirm & Request Tour'}
            onPress={handleConfirmBooking}
            disabled={submitting || quoteLoading || Boolean(quoteError)}
            style={styles.submitBtn}
          />
        </View>
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
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.sm,
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  selectedSiteCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
    borderWidth: 1.5,
    borderColor: theme.colors.heritageAccent,
  },
  selectedSiteHero: {
    width: '100%',
    height: 160,
    backgroundColor: theme.colors.surfaceMuted,
  },
  selectedSiteBody: {
    padding: theme.spacing.md,
  },
  selectedSiteBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  selectedSitePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  selectedSitePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  unescoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  unescoPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7C3AED',
  },
  selectedSiteTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  selectedSiteLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  selectedSiteLocText: {
    ...theme.typography.captionBold,
    color: theme.colors.heritageAccent,
  },
  selectedSiteMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  feeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  feeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },
  boatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  boatPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0369A1',
  },
  sectionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
  },
  packageCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1.5,
    borderColor: theme.colors.borderGold,
    ...theme.shadows.subtle,
  },
  packageCardSelected: {
    borderColor: theme.colors.brightGold,
    backgroundColor: theme.colors.paleGold,
  },
  packageCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  packageName: {
    ...theme.typography.bodyBold,
    color: theme.colors.deepChocolate,
    fontWeight: '700',
    flex: 1,
  },
  packageNameSelected: {
    color: theme.colors.antiqueGold,
    fontWeight: '800',
  },
  packagePrice: {
    ...theme.typography.bodyBold,
    color: theme.colors.antiqueGold,
    fontWeight: '800',
  },
  packageDesc: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 6,
    lineHeight: 18,
  },
  packagePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },
  inputGroup: {
    marginBottom: theme.spacing.sm,
  },
  inputLabel: {
    ...theme.typography.captionBold,
    color: theme.colors.text,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  textInput: {
    flex: 1,
    ...theme.typography.body,
    color: theme.colors.text,
    padding: 0,
  },
  textArea: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  timeOptionsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  timePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  timePillSelected: {
    backgroundColor: theme.colors.heritageAccent,
    borderColor: theme.colors.heritageAccent,
  },
  timePillText: {
    ...theme.typography.captionBold,
    color: theme.colors.text,
  },
  timePillTextSelected: {
    color: '#FFFFFF',
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  counterLabel: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  counterSub: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  counterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  counterBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  counterBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  counterValue: {
    ...theme.typography.bodyBold,
    minWidth: 20,
    textAlign: 'center',
  },
  vehicleOptionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1.5,
    borderColor: theme.colors.borderGold,
    ...theme.shadows.subtle,
  },
  vehicleOptionSelected: {
    borderColor: theme.colors.brightGold,
    backgroundColor: theme.colors.paleGold,
  },
  vehicleOptionDisabled: {
    opacity: 0.45,
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  vehicleName: {
    ...theme.typography.bodyBold,
    color: theme.colors.deepChocolate,
    fontWeight: '700',
  },
  vehicleNameSelected: {
    color: theme.colors.antiqueGold,
    fontWeight: '800',
  },
  vehiclePrice: {
    ...theme.typography.bodyBold,
    color: theme.colors.antiqueGold,
    fontWeight: '800',
  },
  vehicleMeta: {
    marginTop: 6,
  },
  vehicleCapacity: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  capacityWarning: {
    ...theme.typography.caption,
    color: '#DC2626',
    fontWeight: '600',
    marginTop: 2,
  },
  guideHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  toggleBtnActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#10B981',
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  toggleBtnTextActive: {
    color: '#047857',
  },
  guideLangSelect: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  langPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  langPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceMuted,
  },
  langPillSelected: {
    backgroundColor: theme.colors.primary,
  },
  langPillText: {
    ...theme.typography.captionBold,
    color: theme.colors.text,
  },
  langPillTextSelected: {
    color: '#FFFFFF',
  },
  paymentMethodRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  paymentPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  paymentPillSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  paymentPillText: {
    ...theme.typography.captionBold,
    color: theme.colors.text,
  },
  paymentPillTextSelected: {
    color: '#FFFFFF',
  },
  quoteCard: {
    backgroundColor: theme.colors.deepChocolate,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
    borderWidth: 1.5,
    borderColor: theme.colors.brightGold,
    ...theme.shadows.cardGold,
  },
  quoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: theme.spacing.sm,
  },
  quoteTitle: {
    ...theme.typography.h3,
    color: theme.colors.champagneGold,
    fontWeight: '800',
  },
  quoteErrorText: {
    ...theme.typography.caption,
    color: '#F87171',
    marginVertical: 6,
  },
  breakdownList: {
    marginVertical: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  breakdownName: {
    ...theme.typography.captionBold,
    color: '#E2E8F0',
  },
  breakdownDesc: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  breakdownPrice: {
    ...theme.typography.captionBold,
    color: theme.colors.champagneGold,
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: 'rgba(237, 217, 135, 0.3)',
    marginVertical: 10,
  },
  breakdownTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  breakdownTotalLabel: {
    ...theme.typography.bodyBold,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  breakdownTotalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.champagneGold,
  },
  submitBtn: {
    backgroundColor: theme.colors.antiqueGold,
    borderWidth: 1,
    borderColor: theme.colors.brightGold,
    marginTop: 6,
  },
  confirmedContent: {
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  successBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: theme.spacing.md,
  },
  confirmedTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
    textAlign: 'center',
  },
  confirmedSubtitle: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: theme.spacing.md,
  },
  refCard: {
    backgroundColor: theme.colors.surfaceMuted,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    width: '100%',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  refLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  refValue: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.heritageAccent,
    marginTop: 4,
    letterSpacing: 1,
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    width: '100%',
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
  },
  cardHeader: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  summaryLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  summaryValue: {
    ...theme.typography.captionBold,
    color: theme.colors.text,
    flex: 1,
    textAlign: 'right',
  },
  summaryTotalRow: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    marginTop: 8,
    paddingTop: 10,
  },
  totalLabel: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.heritageAccent,
  },
  doneBtn: {
    width: '100%',
  },
});
