import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
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
} from 'lucide-react-native';
import { theme } from '../../src/theme';
import {
  AppHeader,
  PriceBreakdown,
  PrimaryButton,
} from '../../src/components';
import { mockHotels } from '../../src/mocks';
import { useBookingStore } from '../../src/stores';
import { formatETB } from '../../src/utils/currency';
import { useTranslation } from '../../src/i18n';

export default function HotelReserveScreen() {
  const router = useRouter();
  const { t } = useTranslation(['hotels', 'common', 'navigation', 'payments']);
  const params = useLocalSearchParams();
  const hotelId = (params.hotelId as string) || mockHotels[0].id;
  const roomId = (params.roomId as string) || mockHotels[0].rooms[0].id;

  const hotel = mockHotels.find((h) => h.id === hotelId) || mockHotels[0];
  const room = hotel.rooms.find((r) => r.id === roomId) || hotel.rooms[0];

  const { addHotelReservation } = useBookingStore();

  const [nights, setNights] = useState(2);
  const [adults, setAdults] = useState(2);
  const [confirmed, setConfirmed] = useState(false);

  const roomSubtotal = room.pricePerNight * nights;
  const serviceCharge = Math.round(roomSubtotal * 0.1); // 10% hospitality fee
  const totalAmount = roomSubtotal + serviceCharge;

  const priceItems = [
    { label: `${room.title} (${nights} ${t('nights', { count: nights })} @ ${formatETB(room.pricePerNight)})`, amount: roomSubtotal },
    { label: `${t('common:tax')} (10%)`, amount: serviceCharge },
  ];

  const handleConfirmReservation = () => {
    addHotelReservation({
      hotelId: hotel.id,
      hotelName: hotel.name,
      hotelCity: hotel.city,
      hotelImage: hotel.heroImage,
      roomId: room.id,
      roomTitle: room.title,
      checkInDate: '2026-11-12',
      checkOutDate: '2026-11-14',
      nightsCount: nights,
      guestsCount: adults,
      totalPriceETB: totalAmount,
      status: 'CONFIRMED',
    });

    setConfirmed(true);
    setTimeout(() => {
      router.replace('/(tabs)/bookings');
    }, 1200);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title={t('reservationTitle')} showBack />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {confirmed ? (
          <View style={styles.confirmationSuccess}>
            <CheckCircle2 size={54} color={theme.colors.success} />
            <Text style={styles.successTitle}>{t('bookingSuccess')}</Text>
            <Text style={styles.successDesc}>
              {t('bookingSuccessMsg', { hotel: hotel.name })}
            </Text>
          </View>
        ) : (
          <>
            {/* Hotel Summary Header */}
            <View style={styles.hotelSummaryCard}>
              <Text style={styles.hotelName}>{hotel.name}</Text>
              <Text style={styles.roomName}>{room.title}</Text>
              <Text style={styles.hotelAddress}>{hotel.address}</Text>
            </View>

            {/* Dates & Nights Configuration */}
            <View style={styles.configCard}>
              <View style={styles.configHeader}>
                <Calendar size={18} color={theme.colors.hotelAccent} />
                <Text style={styles.configTitle}>{t('datesAndGuests')}</Text>
              </View>
              <View style={styles.counterRow}>
                <View>
                  <Text style={styles.counterLabel}>{t('nights', { count: nights })}</Text>
                  <Text style={styles.counterSub}>{t('checkInDate')}: Nov 12 • {t('checkOutDate')}: Nov 14</Text>
                </View>
                <View style={styles.stepperWrap}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setNights(Math.max(1, nights - 1))}
                  >
                    <Minus size={16} color={theme.colors.text} />
                  </TouchableOpacity>
                  <Text style={styles.stepValue}>{nights}</Text>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setNights(nights + 1)}
                  >
                    <Plus size={16} color={theme.colors.text} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Guests Configuration */}
            <View style={styles.configCard}>
              <View style={styles.configHeader}>
                <Users size={18} color={theme.colors.hotelAccent} />
                <Text style={styles.configTitle}>{t('guestCount')}</Text>
              </View>
              <View style={styles.counterRow}>
                <View>
                  <Text style={styles.counterLabel}>{adults} {t('guestCount')}</Text>
                  <Text style={styles.counterSub}>{room.capacityAdults} max</Text>
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
                    onPress={() => setAdults(Math.min(room.capacityAdults + 1, adults + 1))}
                  >
                    <Plus size={16} color={theme.colors.text} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Price Breakdown */}
            <Text style={styles.sectionTitle}>{t('priceSummary')}</Text>
            <PriceBreakdown
              items={priceItems}
              total={totalAmount}
              totalLabel={t('common:total')}
              style={styles.priceCard}
            />

            {/* Payment Method Selector Preview */}
            <TouchableOpacity
              style={styles.paymentMethodPreview}
              onPress={() => router.push('/payments/checkout')}
            >
              <View style={styles.paymentLeft}>
                <CreditCard size={18} color={theme.colors.primaryDark} />
                <Text style={styles.paymentMethodText}>Telebirr / CBE Birr</Text>
              </View>
              <ChevronRight size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>

            {/* Confirm Reservation CTA */}
            <PrimaryButton
              title={`${t('confirmReservation')} • ${formatETB(totalAmount)}`}
              onPress={handleConfirmReservation}
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
  hotelSummaryCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
    ...theme.shadows.subtle,
  },
  hotelName: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  roomName: {
    ...theme.typography.bodyBold,
    color: theme.colors.hotelAccent,
    marginTop: 2,
  },
  hotelAddress: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  configCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
    ...theme.shadows.subtle,
  },
  configHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: theme.spacing.sm,
  },
  configTitle: {
    ...theme.typography.h4,
    color: theme.colors.text,
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  counterLabel: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  counterSub: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
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
  stepValue: {
    ...theme.typography.h4,
    color: theme.colors.text,
    minWidth: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    ...theme.typography.h4,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  priceCard: {
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
    marginBottom: theme.spacing.lg,
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  paymentMethodText: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  confirmBtn: {
    width: '100%',
  },
  confirmationSuccess: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginTop: theme.spacing.xl,
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
});
