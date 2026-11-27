import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Calendar, ChevronRight, Clock, MapPin, Navigation } from 'lucide-react-native';
import { CardShadow, Colors, Radius, Spacing } from '../theme/tokens';
import { RideItem } from '../types/driver.types';
import { StatusPill } from './StatusPill';

interface RideCardProps {
  ride: RideItem;
  onPressDetails: (rideId: string) => void;
}

export const RideCard: React.FC<RideCardProps> = ({ ride, onPressDetails }) => {
  const fare = ride.finalFareETB ?? ride.estimatedPriceETB;

  return (
    <Pressable
      onPress={() => onPressDetails(ride.id)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.topRow}>
        <View style={styles.passengerRow}>
          <Image source={{ uri: ride.passengerAvatar }} style={styles.avatar} />
          <View style={styles.passengerMeta}>
            <Text style={styles.passengerName} numberOfLines={1}>
              {ride.passengerName}
            </Text>
            <Text style={styles.serviceText} numberOfLines={1}>
              {ride.requestedService} • {ride.referenceCode}
            </Text>
          </View>
        </View>
        <StatusPill status={ride.status} />
      </View>

      <View style={styles.routeBox}>
        <View style={styles.routeRow}>
          <View style={styles.pinStart}>
            <Navigation size={12} color={Colors.primaryBlack} />
          </View>
          <Text style={styles.locationText} numberOfLines={1}>
            {ride.pickupLocation}
          </Text>
        </View>
        <View style={styles.routeConnector} />
        <View style={styles.routeRow}>
          <View style={styles.pinEnd}>
            <MapPin size={12} color={Colors.cardWhite} />
          </View>
          <Text style={styles.locationText} numberOfLines={1}>
            {ride.destination}
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaChip}>
          <Calendar size={13} color={Colors.secondaryText} />
          <Text style={styles.metaText}>{ride.requestDate}</Text>
        </View>
        <View style={styles.metaChip}>
          <Clock size={13} color={Colors.secondaryText} />
          <Text style={styles.metaText}>{ride.requestTime}</Text>
        </View>
        <Text style={styles.distanceText}>{ride.estimatedDistanceKm.toFixed(1)} km</Text>
      </View>

      <View style={styles.footerRow}>
        <View>
          <Text style={styles.fareLabel}>
            {ride.finalFareETB ? 'Final Fare' : 'Est. Fare'}
          </Text>
          <Text style={styles.fareValue}>ETB {fare.toLocaleString()}</Text>
        </View>

        <Pressable
          onPress={() => onPressDetails(ride.id)}
          style={({ pressed }) => [styles.detailsBtn, pressed && styles.detailsBtnPressed]}
        >
          <Text style={styles.detailsBtnText}>Details</Text>
          <ChevronRight size={15} color={Colors.cardWhite} />
        </Pressable>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardWhite,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...CardShadow,
  },
  cardPressed: {
    opacity: 0.96,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.md,
  },
  passengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.lightSilver,
  },
  passengerMeta: {
    flex: 1,
  },
  passengerName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primaryBlack,
  },
  serviceText: {
    fontSize: 12,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  routeBox: {
    backgroundColor: Colors.screenBg,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pinStart: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.lightSilver,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinEnd: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primaryBlack,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeConnector: {
    width: 1.5,
    height: 12,
    backgroundColor: Colors.primarySilver,
    marginLeft: 10,
    marginVertical: 2,
  },
  locationText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primaryBlack,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    color: Colors.secondaryText,
    fontWeight: '500',
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryBlack,
    backgroundColor: Colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
  fareLabel: {
    fontSize: 11,
    color: Colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fareValue: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.primaryBlack,
    marginTop: 1,
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryBlack,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Radius.md,
  },
  detailsBtnPressed: {
    opacity: 0.85,
  },
  detailsBtnText: {
    color: Colors.cardWhite,
    fontSize: 13,
    fontWeight: '700',
  },
});
