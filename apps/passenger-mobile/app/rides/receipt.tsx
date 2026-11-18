import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CheckCircle2, Navigation, MapPin, Share2 } from 'lucide-react-native';
import { theme } from '../../src/theme';
import {
  AppHeader,
  PriceBreakdown,
  RatingComponent,
  PrimaryButton,
} from '../../src/components';
import { useRideStore } from '../../src/stores';
import { formatETB } from '../../src/utils/currency';
import { useTranslation } from '../../src/i18n';
import { RideBooking } from '../../src/types';

export default function RideReceiptScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { t } = useTranslation(['transportation', 'common', 'navigation', 'payments']);
  const { currentRide, lastCompletedRide, rideHistory, resetRide } = useRideStore();

  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const selectedFromHistory = params.id ? rideHistory.find((r) => r.id === params.id) : null;
  const ride: RideBooking =
    selectedFromHistory ||
    lastCompletedRide ||
    currentRide ||
    rideHistory[0] || {
    id: 'ride_rec_demo',
    status: 'PAYMENT_COMPLETED',
    subcityName: 'Maraki',
    pickup: {
      id: 'maraki_loc',
      title: 'Maraki Campus, University of Gondar',
      address: 'Maraki Campus, Gondar',
      coordinates: { latitude: 12.6074, longitude: 37.4589 },
      city: 'Gondar',
    },
    destination: {
      id: 'fasil_loc',
      title: 'Fasil Ghebbi (Royal Enclosure), Gondar',
      address: 'Piasa, Gondar',
      coordinates: { latitude: 12.608, longitude: 37.469 },
      city: 'Gondar',
    },
    finalPrice: 185,
    estimatedPrice: 185,
    distanceKm: 4.8,
    estimatedDurationMins: 14,
    createdAt: new Date().toISOString(),
    driver: {
      id: 'driver_demo_1',
      name: 'Dawit Haile',
      phone: '+251918000000',
      rating: 4.9,
      totalTrips: 184,
      vehiclePlate: '3-A12345',
      vehicleModel: 'Corolla',
      vehicleMake: 'Toyota',
      vehicleColor: 'Silver',
      photoUrl:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    },
  };

  const handleFinish = () => {
    setSubmitted(true);
    setTimeout(() => {
      resetRide();
      router.replace('/(tabs)');
    }, 600);
  };

  const totalPriceVal = ride.finalPrice ?? ride.estimatedPrice ?? 150;
  const baseFareVal = ride.fareBreakdown?.baseFare ?? 100;
  const distanceFareVal = ride.fareBreakdown?.distanceFare ?? Math.round(ride.distanceKm * 25);
  const timeFareVal = ride.fareBreakdown?.timeFare ?? Math.max(0, totalPriceVal - baseFareVal - distanceFareVal);

  const breakdownItems = [
    { label: t('baseFare'), amount: baseFareVal },
    { label: `${t('distanceCharge')} (${ride.distanceKm.toFixed(1)} ${t('common:km')} @ ETB 25/km)`, amount: distanceFareVal },
    { label: `${t('timeCharge')} (~${ride.estimatedDurationMins} ${t('common:mins')} @ ETB 2/min)`, amount: timeFareVal },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title={t('navigation:titles.rideReceipt')}
        showBack
        onBack={() => {
          resetRide();
          router.replace('/(tabs)');
        }}
        rightAction={
          <TouchableOpacity style={styles.shareBtn}>
            <Share2 size={20} color={theme.colors.text} />
          </TouchableOpacity>
        }
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Stamp */}
        <View style={styles.successStamp}>
          <CheckCircle2 size={44} color={theme.colors.success} />
          <Text style={styles.paidTitle}>{t('payments:successTitle')}</Text>
          <Text style={styles.paidMethod}>Telebirr SuperApp</Text>
          <Text style={styles.totalAmountText}>
            {formatETB(totalPriceVal)}
          </Text>
        </View>

        {/* Route Summary */}
        <View style={styles.routeCard}>
          <View style={styles.routeRow}>
            <Navigation size={14} color={theme.colors.success} />
            <Text style={styles.routeText}>{ride.pickup?.title || (ride.subcityName ? `${ride.subcityName} Subcity` : 'Gondar City')}</Text>
          </View>
          <View style={styles.routeRow}>
            <MapPin size={14} color={theme.colors.danger} />
            <Text style={styles.routeText}>{ride.destination?.title || 'On-Demand Journey in Gondar'}</Text>
          </View>
        </View>

        {/* Itemized Price Breakdown */}
        <Text style={styles.sectionTitle}>{t('receiptTitle')}</Text>
        <PriceBreakdown
          items={breakdownItems}
          total={totalPriceVal}
          totalLabel={t('totalFare')}
          style={styles.priceCard}
        />

        {/* Rate Driver Section */}
        <View style={styles.ratingCard}>
          <Text style={styles.ratingTitle}>{t('rateDriverTitle')}</Text>
          <Text style={styles.ratingSubtitle}>
            {t('rateDriverPrompt', { name: ride.driver?.name || t('driverName') })}
          </Text>

          {ride.driver && (
            <View style={styles.driverSnippet}>
              <Image source={{ uri: ride.driver.photoUrl }} style={styles.driverImg} />
              <View>
                <Text style={styles.driverSnippetName}>{ride.driver.name}</Text>
                <Text style={styles.driverSnippetVehicle}>
                  {ride.driver.vehicleModel} • {ride.driver.vehiclePlate}
                </Text>
              </View>
            </View>
          )}

          <RatingComponent
            rating={rating}
            interactive
            onRatingChange={setRating}
            size={32}
            style={styles.starRow}
          />

          <TextInput
            placeholder={t('submitRating')}
            placeholderTextColor={theme.colors.textLight}
            value={feedback}
            onChangeText={setFeedback}
            style={styles.feedbackInput}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Done Button */}
        <PrimaryButton
          title={submitted ? t('common:done') : `${t('submitRating')} & ${t('doneBtn')}`}
          onPress={handleFinish}
          style={styles.doneBtn}
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
  shareBtn: {
    padding: theme.spacing.xs,
  },
  successStamp: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.borderGold,
    marginBottom: theme.spacing.md,
    ...theme.shadows.cardGold,
  },
  paidTitle: {
    ...theme.typography.h3,
    color: theme.colors.deepChocolate,
    fontWeight: '700',
    marginTop: theme.spacing.sm,
  },
  paidMethod: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  totalAmountText: {
    ...theme.typography.h1,
    color: theme.colors.antiqueGold,
    fontWeight: '800',
    marginTop: theme.spacing.sm,
  },
  routeCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.borderGold,
    marginBottom: theme.spacing.md,
    gap: 8,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeText: {
    ...theme.typography.bodySmall,
    color: theme.colors.deepChocolate,
    flex: 1,
  },
  sectionTitle: {
    ...theme.typography.h4,
    color: theme.colors.deepChocolate,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  priceCard: {
    marginBottom: theme.spacing.md,
  },
  ratingCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.borderGold,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    ...theme.shadows.cardGold,
  },
  ratingTitle: {
    ...theme.typography.h3,
    color: theme.colors.deepChocolate,
    fontWeight: '700',
  },
  ratingSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
    marginBottom: theme.spacing.md,
  },
  driverSnippet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  driverImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceMuted,
  },
  driverSnippetName: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  driverSnippetVehicle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  starRow: {
    marginBottom: theme.spacing.md,
  },
  feedbackInput: {
    width: '100%',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    ...theme.typography.bodySmall,
    color: theme.colors.text,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  doneBtn: {
    width: '100%',
  },
});
