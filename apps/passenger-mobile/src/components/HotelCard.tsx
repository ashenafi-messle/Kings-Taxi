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
import { useTranslation } from '../i18n';

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
  const { t } = useTranslation(['hotels', 'common']);
  const defaultFallback = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800';
  const [failedUri, setFailedUri] = React.useState<string | null>(null);
  const imageUri =
    failedUri && failedUri === hotel.heroImage
      ? defaultFallback
      : hotel.heroImage || defaultFallback;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.card, style]}
    >
      <Image
        source={{ uri: imageUri }}
        onError={() => setFailedUri(hotel.heroImage || defaultFallback)}
        style={styles.image}
      />
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.name} numberOfLines={1}>{hotel.name}</Text>
          <View style={styles.cityPill}>
            <MapPin size={10} color={theme.colors.antiqueGold} />
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
            <Text style={styles.startingFrom}>{t('startingFrom')}</Text>
            <Text style={styles.price}>{formatETB(hotel.startingPricePerNight)}<Text style={styles.perNight}> / {t('common:perNight')}</Text></Text>
          </View>
          <View style={styles.viewButton}>
            <Text style={styles.viewButtonText}>{t('selectRoom')}</Text>
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
    borderWidth: 1.5,
    borderColor: theme.colors.borderGold,
    marginBottom: theme.spacing.md,
    ...theme.shadows.cardGold,
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
    color: theme.colors.deepChocolate,
    fontWeight: '700',
    flex: 1,
    marginRight: theme.spacing.xs,
  },
  cityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: theme.colors.surfaceGold,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.borderGold,
  },
  cityText: {
    ...theme.typography.captionBold,
    color: theme.colors.antiqueGold,
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
    borderTopColor: theme.colors.borderGold,
  },
  startingFrom: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  price: {
    ...theme.typography.h4,
    color: theme.colors.antiqueGold,
    fontWeight: '800',
  },
  perNight: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  viewButton: {
    backgroundColor: theme.colors.antiqueGold,
    borderWidth: 1,
    borderColor: theme.colors.brightGold,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.subtle,
  },
  viewButtonText: {
    ...theme.typography.captionBold,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
