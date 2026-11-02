import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
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

export default function RideReceiptScreen() {
  const router = useRouter();
  const { currentRide, resetRide } = useRideStore();

  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const ride = currentRide || {
    id: 'ride_rec_demo',
    pickup: { title: 'Bole International Airport (ADD)' },
    destination: { title: 'Ethiopian Skylight Hotel' },
    finalPrice: 480,
    estimatedPrice: 480,
    distanceKm: 4.8,
    estimatedDurationMins: 14,
    driver: {
      name: 'Abebe Kebede',
      vehiclePlate: 'AA 3-B48192',
      vehicleModel: 'Toyota Corolla Silver',
      photoUrl:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    },
  };

  const handleFinish = () => {
    setSubmitted(true);
    setTimeout(() => {
      resetRide();
      router.replace('/(tabs)');
    }, 600);
  };

  const breakdownItems = [
    { label: 'Base Flag-Down Fare', amount: 180 },
    { label: `Distance Fare (${ride.distanceKm} km)`, amount: 220 },
    { label: `Travel Time (${ride.estimatedDurationMins} mins)`, amount: 80 },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Digital Trip Receipt"
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
          <Text style={styles.paidTitle}>Payment Completed</Text>
          <Text style={styles.paidMethod}>Paid via Telebirr SuperApp</Text>
          <Text style={styles.totalAmountText}>
            {formatETB(ride.finalPrice || ride.estimatedPrice)}
          </Text>
        </View>

        {/* Route Summary */}
        <View style={styles.routeCard}>
          <View style={styles.routeRow}>
            <Navigation size={14} color={theme.colors.success} />
            <Text style={styles.routeText}>{ride.pickup.title}</Text>
          </View>
          <View style={styles.routeRow}>
            <MapPin size={14} color={theme.colors.danger} />
            <Text style={styles.routeText}>{ride.destination.title}</Text>
          </View>
        </View>

        {/* Itemized Price Breakdown */}
        <Text style={styles.sectionTitle}>Itemized Fare Breakdown</Text>
        <PriceBreakdown
          items={breakdownItems}
          total={ride.finalPrice || ride.estimatedPrice}
          totalLabel="Total Fare (ETB)"
          style={styles.priceCard}
        />

        {/* Rate Driver Section */}
        <View style={styles.ratingCard}>
          <Text style={styles.ratingTitle}>Rate Your Experience</Text>
          <Text style={styles.ratingSubtitle}>
            How was your ride with {ride.driver?.name || 'your driver'}?
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
            placeholder="Add an optional compliment or feedback..."
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
          title={submitted ? 'Rating Submitted!' : 'Submit Rating & Done'}
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
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
    ...theme.shadows.subtle,
  },
  paidTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
  },
  paidMethod: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  totalAmountText: {
    ...theme.typography.h1,
    color: theme.colors.primaryDark,
    marginTop: theme.spacing.sm,
  },
  routeCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    color: theme.colors.text,
    flex: 1,
  },
  sectionTitle: {
    ...theme.typography.h4,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  priceCard: {
    marginBottom: theme.spacing.md,
  },
  ratingCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    ...theme.shadows.subtle,
  },
  ratingTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
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
