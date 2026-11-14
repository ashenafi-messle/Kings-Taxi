import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Calendar,
  Users,
  CreditCard,
  ChevronRight,
  Plus,
  Minus,
  CheckCircle2,
  Plane,
  Car,
  Clock,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react-native';
import { theme } from '../../src/theme';
import {
  AppHeader,
  PriceBreakdown,
  PrimaryButton,
} from '../../src/components';
import { mockHotels } from '../../src/mocks';
import { useBookingStore } from '../../src/stores';
import { HotelService } from '../../src/services/hotel.service';
import {
  Hotel,
  HotelRoom,
  AirportTransferRateDto,
  HotelQuoteResponse,
} from '../../src/types';
import {
  getAddisCurrentDateString,
  addCalendarDays,
  calculateCalendarNights,
  formatCalendarDisplay,
} from '../../src/utils/addisDate';
import { formatETB } from '../../src/utils/currency';
import { useTranslation } from '../../src/i18n';

export default function HotelReserveScreen() {
  const router = useRouter();
  const { t } = useTranslation(['hotels', 'common', 'navigation', 'payments']);
  const params = useLocalSearchParams();

  const hotelParamId = (params.hotelId as string) || mockHotels[0].id;
  const roomParamId = (params.roomId as string) || '';

  // Hotel and Rooms state
  const [hotel, setHotel] = useState<Hotel>(
    () => mockHotels.find((h) => h.id === hotelParamId) || mockHotels[0]
  );
  const [selectedRoomId, setSelectedRoomId] = useState<string>(roomParamId);
  const [transferRates, setTransferRates] = useState<AirportTransferRateDto[]>([]);
  const [isLoadingHotel, setIsLoadingHotel] = useState<boolean>(true);

  // Dynamic Addis Ababa dates
  const todayAddis = useMemo(() => getAddisCurrentDateString(), []);
  const [checkInDate, setCheckInDate] = useState<string>(() => addCalendarDays(todayAddis, 1));
  const [checkOutDate, setCheckOutDate] = useState<string>(() => addCalendarDays(todayAddis, 3));

  // Guest counters
  const [adults, setAdults] = useState<number>(2);
  const [children, setChildren] = useState<number>(0);
  const [roomQuantity, setRoomQuantity] = useState<number>(1);

  // Airport Transfer State
  const [includeTransfer, setIncludeTransfer] = useState<boolean>(false);
  const [selectedVehicleCategory, setSelectedVehicleCategory] = useState<string>('SEDAN');
  const [flightNumber, setFlightNumber] = useState<string>('ET 152');
  const [pickupTime, setPickupTime] = useState<string>('14:30');

  // Contact / Guest details
  const [guestName, setGuestName] = useState<string>('');
  const [guestPhone, setGuestPhone] = useState<string>('');
  const [specialRequests, setSpecialRequests] = useState<string>('');

  // Authoritative Quote & Confirmation State
  const [quote, setQuote] = useState<HotelQuoteResponse | null>(null);
  const [isQuoting, setIsQuoting] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [confirmedBooking, setConfirmedBooking] = useState<any | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const { addHotelReservation } = useBookingStore();

  // Load hotel and transfer rates from backend
  useEffect(() => {
    let isMounted = true;
    async function init() {
      setIsLoadingHotel(true);
      try {
        const [hRes, tRes] = await Promise.all([
          HotelService.getHotelById(hotelParamId),
          HotelService.getTransferRates(hotelParamId),
        ]);

        if (isMounted) {
          if (hRes.success && hRes.data) {
            setHotel(hRes.data);
            if (!selectedRoomId && hRes.data.rooms.length > 0) {
              setSelectedRoomId(hRes.data.rooms[0].id);
            }
          }
          if (tRes.success && tRes.data) {
            setTransferRates(tRes.data);
            if (tRes.data.length > 0) {
              setSelectedVehicleCategory(tRes.data[0].vehicleCategory);
            }
          }
        }
      } finally {
        if (isMounted) setIsLoadingHotel(false);
      }
    }

    init();
    return () => {
      isMounted = false;
    };
  }, [hotelParamId]);

  const activeRoom: HotelRoom = useMemo(() => {
    return (
      hotel.rooms.find((r) => r.id === selectedRoomId) ||
      hotel.rooms[0] || {
        id: 'standard-room',
        title: 'Standard Guest Room',
        description: 'Comfortable guest room',
        pricePerNight: 3500,
        capacityAdults: 2,
        capacityChildren: 1,
        bedType: 'King Bed',
        amenities: [],
        photos: [],
        availableCount: 5,
      }
    );
  }, [hotel.rooms, selectedRoomId]);

  const nights = useMemo(() => {
    try {
      return Math.max(1, calculateCalendarNights(checkInDate, checkOutDate));
    } catch {
      return 1;
    }
  }, [checkInDate, checkOutDate]);

  // Fetch authoritative quote whenever booking parameters change
  useEffect(() => {
    let isMounted = true;
    async function fetchAuthoritativeQuote() {
      if (!hotel.id || !activeRoom.id) return;
      setIsQuoting(true);
      setQuoteError(null);

      try {
        const res = await HotelService.getQuote({
          hotelId: hotel.id,
          checkInDate,
          checkOutDate,
          adults,
          children,
          roomTypes: [
            {
              roomTypeId: activeRoom.id,
              quantity: roomQuantity,
            },
          ],
          airportTransfer: includeTransfer
            ? {
                includeTransfer: true,
                vehicleCategory: selectedVehicleCategory,
              }
            : undefined,
        });

        if (isMounted) {
          if (res.success && res.data) {
            setQuote(res.data);
          } else {
            // Local authoritative fallback if backend offline
            const roomSub = activeRoom.pricePerNight * nights * roomQuantity;
            const transRate = transferRates.find(
              (r) => r.vehicleCategory === selectedVehicleCategory
            );
            const transSub = includeTransfer ? transRate?.fixedPriceETB || 1200 : 0;
            const sub = roomSub + transSub;
            const tax = Math.round(sub * 0.1);
            const fee = Math.round(sub * 0.02);
            const total = sub + tax + fee;

            setQuote({
              nights,
              roomSubtotal: roomSub,
              transferSubtotal: transSub,
              subtotal: sub,
              taxAmount: tax,
              serviceFee: fee,
              discountAmount: 0,
              totalAmount: total,
              currency: 'ETB',
              breakdown: [
                {
                  label: `${activeRoom.title} (${nights} nights x ${roomQuantity} room)`,
                  amount: roomSub,
                },
                ...(includeTransfer
                  ? [
                      {
                        label: `Gondar Airport (GDQ) Transfer (${selectedVehicleCategory})`,
                        amount: transSub,
                      },
                    ]
                  : []),
                { label: 'Hospitality Tax (10%)', amount: tax },
                { label: 'Service & Booking Fee (2%)', amount: fee },
              ],
            });
          }
        }
      } catch (err: any) {
        if (isMounted) setQuoteError(err.message || 'Error fetching quote');
      } finally {
        if (isMounted) setIsQuoting(false);
      }
    }

    fetchAuthoritativeQuote();
    return () => {
      isMounted = false;
    };
  }, [
    hotel.id,
    activeRoom.id,
    activeRoom.pricePerNight,
    activeRoom.title,
    checkInDate,
    checkOutDate,
    nights,
    adults,
    children,
    roomQuantity,
    includeTransfer,
    selectedVehicleCategory,
    transferRates,
  ]);

  // Quick adjust check-in date
  const handleShiftDates = (daysDelta: number) => {
    const nextCheckIn = addCalendarDays(checkInDate, daysDelta);
    // ensure check-in is not in the past
    if (nextCheckIn < todayAddis) return;
    const nextCheckOut = addCalendarDays(nextCheckIn, nights);
    setCheckInDate(nextCheckIn);
    setCheckOutDate(nextCheckOut);
  };

  const handleAdjustNights = (delta: number) => {
    const nextNights = Math.max(1, nights + delta);
    setCheckOutDate(addCalendarDays(checkInDate, nextNights));
  };

  // Submit final reservation
  const handleConfirmReservation = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        hotelId: hotel.id,
        roomTypeId: activeRoom.id,
        numberOfRooms: roomQuantity,
        adults,
        children,
        includeAirportTransfer: includeTransfer,
        airportTransferVehicleType: includeTransfer ? selectedVehicleCategory : undefined,
        checkInDate,
        checkOutDate,
        guestCount: adults + children,
        adultsCount: adults,
        childrenCount: children,
        roomItems: [
          {
            roomTypeId: activeRoom.id,
            quantity: roomQuantity,
          },
        ],
        guestName: guestName.trim() || undefined,
        guestPhone: guestPhone.trim() || undefined,
        specialRequests: specialRequests.trim() || undefined,
        airportTransfer: includeTransfer
          ? {
              includeTransfer: true,
              vehicleCategory: selectedVehicleCategory,
              flightNumber: flightNumber.trim() || undefined,
              pickupDate: checkInDate,
              pickupTime: pickupTime.trim() || undefined,
              passengerCount: adults + children,
            }
          : undefined,
      };

      const res = await HotelService.createBooking(payload);

      let bookingRef = `KT-HTL-${Math.floor(1000 + Math.random() * 9000)}`;
      if (res.success && res.data) {
        bookingRef = res.data.bookingReference || res.data.id || bookingRef;
      }

      // Add to local persistent store for instant synchronization
      const totalETB = quote?.totalAmount || activeRoom.pricePerNight * nights;
      addHotelReservation({
        hotelId: hotel.id,
        hotelName: hotel.name,
        hotelCity: hotel.city,
        hotelImage: hotel.heroImage,
        roomId: activeRoom.id,
        roomTitle: activeRoom.title,
        checkInDate,
        checkOutDate,
        nightsCount: nights,
        guestsCount: adults + children,
        totalPriceETB: totalETB,
        status: 'CONFIRMED',
        hasAirportTransfer: includeTransfer,
        airportTransferStatus: includeTransfer ? 'SCHEDULED' : undefined,
        airportTransferVehicle: includeTransfer ? selectedVehicleCategory : undefined,
      });

      setConfirmedBooking({
        bookingReference: bookingRef,
        hotelName: hotel.name,
        roomTitle: activeRoom.title,
        checkInDate,
        checkOutDate,
        nights,
        totalETB,
        includeTransfer,
      });
    } catch (err: any) {
      Alert.alert('Booking Error', err.message || 'Unable to confirm reservation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingHotel) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="Hotel Reservation" showBack />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primaryDark} />
          <Text style={styles.loadingText}>Loading hotel details and pricing rates...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title="Confirm Hotel Booking" showBack />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {confirmedBooking ? (
          <View style={styles.confirmationSuccess}>
            <CheckCircle2 size={60} color={theme.colors.success} />
            <Text style={styles.successTitle}>Reservation Confirmed!</Text>
            <View style={styles.referenceBadge}>
              <Text style={styles.referenceLabel}>Booking Reference</Text>
              <Text style={styles.referenceCode}>{confirmedBooking.bookingReference}</Text>
            </View>

            <View style={styles.successDetailsCard}>
              <Text style={styles.successHotelName}>{confirmedBooking.hotelName}</Text>
              <Text style={styles.successRoomTitle}>{confirmedBooking.roomTitle}</Text>

              <View style={styles.successDivider} />

              <View style={styles.successRow}>
                <Text style={styles.successKey}>Check-In Date</Text>
                <Text style={styles.successVal}>
                  {formatCalendarDisplay(confirmedBooking.checkInDate)}
                </Text>
              </View>
              <View style={styles.successRow}>
                <Text style={styles.successKey}>Check-Out Date</Text>
                <Text style={styles.successVal}>
                  {formatCalendarDisplay(confirmedBooking.checkOutDate)} ({confirmedBooking.nights} nights)
                </Text>
              </View>

              {confirmedBooking.includeTransfer && (
                <View style={styles.successTransferRow}>
                  <Plane size={14} color="#0D5C3A" />
                  <Text style={styles.successTransferText}>
                    Gondar Airport (GDQ) private pickup scheduled
                  </Text>
                </View>
              )}

              <View style={styles.successDivider} />

              <View style={styles.successRow}>
                <Text style={styles.successKeyBold}>Authoritative Total</Text>
                <Text style={styles.successValBold}>{formatETB(confirmedBooking.totalETB)}</Text>
              </View>
            </View>

            <PrimaryButton
              title="View In My Bookings"
              onPress={() => router.replace('/(tabs)/bookings')}
              style={styles.doneBtn}
            />
          </View>
        ) : (
          <>
            {/* Hotel Summary Header */}
            <View style={styles.hotelSummaryCard}>
              <Text style={styles.hotelName}>{hotel.name}</Text>
              <Text style={styles.roomName}>{activeRoom.title}</Text>
              <Text style={styles.hotelAddress}>{hotel.address}</Text>
            </View>

            {/* Room Type Selector (if multiple rooms available) */}
            {hotel.rooms.length > 1 && (
              <View style={styles.configCard}>
                <Text style={styles.configTitle}>Select Room Type</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.roomPillsContainer}
                >
                  {hotel.rooms.map((r) => {
                    const isSelected = r.id === selectedRoomId;
                    return (
                      <TouchableOpacity
                        key={r.id}
                        onPress={() => setSelectedRoomId(r.id)}
                        style={[
                          styles.roomPill,
                          isSelected && styles.roomPillActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.roomPillTitle,
                            isSelected && styles.roomPillTitleActive,
                          ]}
                        >
                          {r.title}
                        </Text>
                        <Text
                          style={[
                            styles.roomPillPrice,
                            isSelected && styles.roomPillPriceActive,
                          ]}
                        >
                          {formatETB(r.pricePerNight)}/nt
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Dynamic Dates & Nights (Addis Ababa Timezone) */}
            <View style={styles.configCard}>
              <View style={styles.configHeader}>
                <Calendar size={18} color={theme.colors.hotelAccent} />
                <Text style={styles.configTitle}>Reservation Dates (Africa/Addis_Ababa)</Text>
              </View>

              <View style={styles.dateDisplayRow}>
                <View style={styles.dateBox}>
                  <Text style={styles.dateBoxLabel}>Check-In</Text>
                  <Text style={styles.dateBoxDate}>
                    {formatCalendarDisplay(checkInDate)}
                  </Text>
                  <Text style={styles.dateBoxSub}>After 14:00 EAT</Text>
                </View>

                <View style={styles.dateDurationBox}>
                  <Text style={styles.durationDaysText}>{nights} Nights</Text>
                  <View style={styles.durationLine} />
                </View>

                <View style={styles.dateBox}>
                  <Text style={styles.dateBoxLabel}>Check-Out</Text>
                  <Text style={styles.dateBoxDate}>
                    {formatCalendarDisplay(checkOutDate)}
                  </Text>
                  <Text style={styles.dateBoxSub}>Before 11:00 EAT</Text>
                </View>
              </View>

              {/* Nights Stepper */}
              <View style={styles.counterRow}>
                <View>
                  <Text style={styles.counterLabel}>Duration (Nights)</Text>
                  <Text style={styles.counterSub}>Change stay length</Text>
                </View>
                <View style={styles.stepperWrap}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => handleAdjustNights(-1)}
                  >
                    <Minus size={16} color={theme.colors.text} />
                  </TouchableOpacity>
                  <Text style={styles.stepValue}>{nights}</Text>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => handleAdjustNights(1)}
                  >
                    <Plus size={16} color={theme.colors.text} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Shift Check-In Stepper */}
              <View style={[styles.counterRow, { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 10 }]}>
                <View>
                  <Text style={styles.counterLabel}>Adjust Check-In Date</Text>
                  <Text style={styles.counterSub}>Move dates forward or backward</Text>
                </View>
                <View style={styles.stepperWrap}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => handleShiftDates(-1)}
                  >
                    <Minus size={16} color={theme.colors.text} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => handleShiftDates(1)}
                  >
                    <Plus size={16} color={theme.colors.text} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Guests & Room Quantity */}
            <View style={styles.configCard}>
              <View style={styles.configHeader}>
                <Users size={18} color={theme.colors.hotelAccent} />
                <Text style={styles.configTitle}>Guests & Rooms</Text>
              </View>

              {/* Adults Counter */}
              <View style={styles.counterRow}>
                <View>
                  <Text style={styles.counterLabel}>Adult Guests</Text>
                  <Text style={styles.counterSub}>Age 13 and above</Text>
                </View>
                <View style={styles.stepperWrap}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setAdults(Math.max(1, adults - 1))}
                  >
                    <Minus size={16} color={theme.colors.text} />
                  </TouchableOpacity>
                  <Text style={styles.stepValue}>{adults}</Text>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setAdults(Math.min(8, adults + 1))}
                  >
                    <Plus size={16} color={theme.colors.text} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Children Counter */}
              <View style={[styles.counterRow, { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 10 }]}>
                <View>
                  <Text style={styles.counterLabel}>Children</Text>
                  <Text style={styles.counterSub}>Age 0-12</Text>
                </View>
                <View style={styles.stepperWrap}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setChildren(Math.max(0, children - 1))}
                  >
                    <Minus size={16} color={theme.colors.text} />
                  </TouchableOpacity>
                  <Text style={styles.stepValue}>{children}</Text>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setChildren(Math.min(4, children + 1))}
                  >
                    <Plus size={16} color={theme.colors.text} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Room Quantity Counter */}
              <View style={[styles.counterRow, { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 10 }]}>
                <View>
                  <Text style={styles.counterLabel}>Number of Rooms</Text>
                  <Text style={styles.counterSub}>{activeRoom.title}</Text>
                </View>
                <View style={styles.stepperWrap}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setRoomQuantity(Math.max(1, roomQuantity - 1))}
                  >
                    <Minus size={16} color={theme.colors.text} />
                  </TouchableOpacity>
                  <Text style={styles.stepValue}>{roomQuantity}</Text>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setRoomQuantity(Math.min(activeRoom.availableCount || 4, roomQuantity + 1))}
                  >
                    <Plus size={16} color={theme.colors.text} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Optional Gondar Airport Transfer Section */}
            <View style={styles.transferSectionCard}>
              <View style={styles.transferHeaderRow}>
                <View style={styles.transferTitleWrap}>
                  <Plane size={20} color="#0D5C3A" />
                  <View>
                    <Text style={styles.transferSectionTitle}>
                      Include Gondar Airport (GDQ) Transfer
                    </Text>
                    <Text style={styles.transferSectionSubtitle}>
                      Private airport pickup directly to {hotel.name}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={includeTransfer}
                  onValueChange={setIncludeTransfer}
                  trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
                  thumbColor={includeTransfer ? '#0D5C3A' : '#F3F4F6'}
                />
              </View>

              {includeTransfer && (
                <View style={styles.transferExpandedWrap}>
                  <Text style={styles.transferVehicleSelectLabel}>
                    Select Vehicle Class (Fixed Price Rate):
                  </Text>
                  <View style={styles.vehicleCategoryRow}>
                    {transferRates.map((rate) => {
                      const isSelected = selectedVehicleCategory === rate.vehicleCategory;
                      return (
                        <TouchableOpacity
                          key={rate.id}
                          onPress={() => setSelectedVehicleCategory(rate.vehicleCategory)}
                          style={[
                            styles.vehicleOptionCard,
                            isSelected && styles.vehicleOptionCardSelected,
                          ]}
                        >
                          <Car
                            size={18}
                            color={isSelected ? '#0D5C3A' : theme.colors.textMuted}
                          />
                          <Text
                            style={[
                              styles.vehicleOptionName,
                              isSelected && styles.vehicleOptionNameSelected,
                            ]}
                          >
                            {rate.vehicleCategory}
                          </Text>
                          <Text style={styles.vehicleOptionPrice}>
                            {formatETB(rate.fixedPriceETB)}
                          </Text>
                          <Text style={styles.vehicleOptionEta}>Fixed</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Flight & Time Inputs */}
                  <View style={styles.flightInputsRow}>
                    <View style={styles.inputCol}>
                      <Text style={styles.inputLabel}>Flight Number</Text>
                      <TextInput
                        style={styles.textInput}
                        value={flightNumber}
                        onChangeText={setFlightNumber}
                        placeholder="e.g. ET 152"
                        placeholderTextColor={theme.colors.textMuted}
                      />
                    </View>
                    <View style={styles.inputCol}>
                      <Text style={styles.inputLabel}>Estimated Arrival (EAT)</Text>
                      <TextInput
                        style={styles.textInput}
                        value={pickupTime}
                        onChangeText={setPickupTime}
                        placeholder="14:30"
                        placeholderTextColor={theme.colors.textMuted}
                      />
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* Guest Information */}
            <View style={styles.configCard}>
              <Text style={styles.configTitle}>Lead Guest Information</Text>
              <TextInput
                style={styles.textInputMargin}
                value={guestName}
                onChangeText={setGuestName}
                placeholder="Full Name (as on Passport / ID)"
                placeholderTextColor={theme.colors.textMuted}
              />
              <TextInput
                style={styles.textInputMargin}
                value={guestPhone}
                onChangeText={setGuestPhone}
                placeholder="Phone Number (+251 9...)"
                keyboardType="phone-pad"
                placeholderTextColor={theme.colors.textMuted}
              />
              <TextInput
                style={styles.textInputMargin}
                value={specialRequests}
                onChangeText={setSpecialRequests}
                placeholder="Special Requests (e.g. high floor, early arrival)"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>

            {/* Authoritative Price Summary */}
            <View style={styles.priceSection}>
              <View style={styles.priceHeaderRow}>
                <Text style={styles.sectionTitle}>Authoritative Price Summary</Text>
                {isQuoting && (
                  <ActivityIndicator size="small" color={theme.colors.primaryDark} />
                )}
              </View>

              {quote ? (
                <PriceBreakdown
                  items={quote.breakdown.map((item) => ({
                    label: item.label,
                    amount: item.amount,
                  }))}
                  total={quote.totalAmount}
                  totalLabel="Total Authoritative Fare (ETB)"
                  style={styles.priceCard}
                />
              ) : quoteError ? (
                <View style={styles.quoteErrorCard}>
                  <AlertCircle size={16} color={theme.colors.error} />
                  <Text style={styles.quoteErrorText}>{quoteError}</Text>
                </View>
              ) : null}
            </View>

            {/* Payment Method Selector Preview */}
            <TouchableOpacity
              style={styles.paymentMethodPreview}
              onPress={() => router.push('/payments/checkout')}
            >
              <View style={styles.paymentLeft}>
                <CreditCard size={18} color={theme.colors.primaryDark} />
                <View>
                  <Text style={styles.paymentMethodText}>Payment: Telebirr / CBE Birr / Cash</Text>
                  <Text style={styles.paymentMethodSub}>Pay on arrival or mobile checkout</Text>
                </View>
              </View>
              <ChevronRight size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>

            {/* Confirm Reservation CTA */}
            <PrimaryButton
              title={
                isSubmitting
                  ? 'Confirming Reservation...'
                  : `Confirm Reservation • ${formatETB(quote?.totalAmount || 0)}`
              }
              onPress={handleConfirmReservation}
              disabled={isSubmitting || isQuoting}
              style={styles.confirmBtn}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  hotelSummaryCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.borderGold,
    marginBottom: theme.spacing.md,
    ...theme.shadows.cardGold,
  },
  hotelName: {
    ...theme.typography.h3,
    color: theme.colors.deepChocolate,
    fontWeight: '700',
  },
  roomName: {
    ...theme.typography.bodyBold,
    color: theme.colors.antiqueGold,
    fontWeight: '700',
    marginTop: 2,
  },
  hotelAddress: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  configCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.borderGold,
    marginBottom: theme.spacing.md,
    ...theme.shadows.cardGold,
  },
  configHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: theme.spacing.sm,
  },
  configTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.deepChocolate,
    fontWeight: '700',
  },
  roomPillsContainer: {
    gap: 8,
    paddingVertical: 8,
  },
  roomPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.borderGold,
  },
  roomPillActive: {
    borderColor: theme.colors.brightGold,
    backgroundColor: theme.colors.paleGold,
  },
  roomPillTitle: {
    ...theme.typography.captionBold,
    color: theme.colors.text,
  },
  roomPillTitleActive: {
    color: theme.colors.antiqueGold,
    fontWeight: '700',
  },
  roomPillPrice: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  roomPillPriceActive: {
    color: theme.colors.antiqueGold,
    fontWeight: '700',
  },
  dateDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF4DC',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderGold,
    padding: 10,
    marginBottom: 12,
  },
  dateBox: {
    flex: 1,
    alignItems: 'center',
  },
  dateBoxLabel: {
    ...theme.typography.captionBold,
    color: theme.colors.textMuted,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  dateBoxDate: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
    fontSize: 13,
    marginTop: 2,
  },
  dateBoxSub: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  dateDurationBox: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  durationDaysText: {
    ...theme.typography.captionBold,
    color: theme.colors.hotelAccent,
    fontSize: 11,
  },
  durationLine: {
    width: 30,
    height: 1,
    backgroundColor: theme.colors.border,
    marginTop: 4,
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  counterLabel: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  counterSub: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
    minWidth: 24,
    textAlign: 'center',
  },
  transferSectionCard: {
    backgroundColor: '#F0FDF4',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: theme.spacing.md,
  },
  transferHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  transferTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 8,
  },
  transferSectionTitle: {
    ...theme.typography.bodyBold,
    color: '#14532D',
  },
  transferSectionSubtitle: {
    ...theme.typography.caption,
    color: '#166534',
    fontSize: 11,
  },
  transferExpandedWrap: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#BBF7D0',
  },
  transferVehicleSelectLabel: {
    ...theme.typography.captionBold,
    color: '#14532D',
    marginBottom: 8,
  },
  vehicleCategoryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  vehicleOptionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.md,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  vehicleOptionCardSelected: {
    borderColor: '#0D5C3A',
    backgroundColor: '#DCFCE7',
  },
  vehicleOptionName: {
    ...theme.typography.captionBold,
    color: theme.colors.text,
    fontSize: 11,
    marginTop: 4,
  },
  vehicleOptionNameSelected: {
    color: '#0D5C3A',
  },
  vehicleOptionPrice: {
    ...theme.typography.captionBold,
    color: '#0D5C3A',
    fontSize: 12,
    marginTop: 2,
  },
  vehicleOptionEta: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontSize: 9,
  },
  flightInputsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  inputCol: {
    flex: 1,
  },
  inputLabel: {
    ...theme.typography.captionBold,
    color: '#14532D',
    fontSize: 11,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    ...theme.typography.body,
    fontSize: 13,
    color: theme.colors.text,
  },
  textInputMargin: {
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 10,
    ...theme.typography.body,
    fontSize: 13,
    color: theme.colors.text,
    marginBottom: 8,
  },
  priceSection: {
    marginBottom: theme.spacing.md,
  },
  priceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  sectionTitle: {
    ...theme.typography.h4,
    color: theme.colors.text,
  },
  priceCard: {
    marginTop: 4,
  },
  quoteErrorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: theme.borderRadius.md,
  },
  quoteErrorText: {
    ...theme.typography.caption,
    color: theme.colors.error,
  },
  paymentMethodPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paymentMethodText: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
    fontSize: 13,
  },
  paymentMethodSub: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  confirmBtn: {
    marginBottom: theme.spacing.xl,
  },
  confirmationSuccess: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.md,
  },
  successTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginTop: 12,
    marginBottom: 6,
  },
  referenceBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignItems: 'center',
    marginBottom: 16,
  },
  referenceLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  referenceCode: {
    ...theme.typography.h3,
    color: theme.colors.primaryDark,
    letterSpacing: 1,
  },
  successDetailsCard: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 20,
  },
  successHotelName: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  successRoomTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.hotelAccent,
    marginTop: 2,
  },
  successDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 10,
  },
  successRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  successKey: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  successVal: {
    ...theme.typography.captionBold,
    color: theme.colors.text,
  },
  successKeyBold: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  successValBold: {
    ...theme.typography.h3,
    color: theme.colors.primaryDark,
  },
  successTransferRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    padding: 8,
    borderRadius: theme.borderRadius.sm,
    marginTop: 6,
  },
  successTransferText: {
    ...theme.typography.captionBold,
    color: '#0D5C3A',
    fontSize: 11,
  },
  doneBtn: {
    width: '100%',
  },
});
