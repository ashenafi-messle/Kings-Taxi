import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  Image,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { MapPin } from 'lucide-react-native';
import { theme } from '../theme';
import { Hotel } from '../types';
import { formatETB } from '../utils/currency';
import { RatingComponent } from './RatingComponent';

export interface HotelCardProps {
  hotel: Hotel;
  onPress: () => void;
  style?: ViewStyle;
}

export const HotelCard: React.FC<HotelCardProps> = ({
  hotel,
  onPress,
  style,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.card, style]}
    >
      <Image source={{ uri: hotel.heroImage }} style={styles.image} />
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.name} numberOfLines={1}>{hotel.name}</Text>
          <View style={styles.cityPill}>
            <MapPin size={10} color={theme.colors.hotelAccent} />
            <Text style={styles.cityText}>{hotel.city}</Text>
          </View>
        </View>

        <RatingComponent
          rating={hotel.reviewScore}
          reviewCount={hotel.reviewCount}
          showScore
          size={14}
          style={styles.rating}
        />

        <Text style={styles.amenitiesText} numberOfLines={1}>
          {hotel.amenities.slice(0, 3).join(' • ')}
        </Text>

        <View style={styles.footerRow}>
          <View>
            <Text style={styles.startingFrom}>From</Text>
            <Text style={styles.price}>{formatETB(hotel.startingPricePerNight)}<Text style={styles.perNight}> / night</Text></Text>
          </View>
          <View style={styles.viewButton}>
            <Text style={styles.viewButtonText}>View Rooms</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  image: {
    width: '100%',
    height: 160,
    backgroundColor: theme.colors.surfaceMuted,
  },
  content: {
    padding: theme.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    ...theme.typography.h3,
    color: theme.colors.text,
    flex: 1,
    marginRight: theme.spacing.xs,
  },
  cityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
  },
  cityText: {
    ...theme.typography.captionBold,
    color: theme.colors.hotelAccent,
  },
  rating: {
    marginVertical: 4,
  },
  amenitiesText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginVertical: 4,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  startingFrom: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  price: {
    ...theme.typography.h4,
    color: theme.colors.primaryDark,
  },
  perNight: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  viewButton: {
    backgroundColor: theme.colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
  },
  viewButtonText: {
    ...theme.typography.captionBold,
    color: theme.colors.textInverse,
  },
});
