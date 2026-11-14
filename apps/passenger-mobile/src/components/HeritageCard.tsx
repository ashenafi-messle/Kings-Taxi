import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  Image,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { MapPin, Award } from 'lucide-react-native';
import { theme } from '../theme';
import { HeritageSite } from '../types';
import { useTranslation } from '../i18n';

export interface HeritageCardProps {
  site: HeritageSite;
  onPress: () => void;
  style?: ViewStyle;
}

export const HeritageCard: React.FC<HeritageCardProps> = ({
  site,
  onPress,
  style,
}) => {
  const { t } = useTranslation(['heritage', 'common']);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.card, style]}
    >
      <Image source={{ uri: site.heroImage }} style={styles.image} />
      {site.unescoDesignated && (
        <View style={styles.unescoBadge}>
          <Award size={12} color={theme.colors.brightGold} />
          <Text style={styles.unescoText}>{t('categories.unesco')}</Text>
        </View>
      )}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.name}>{site.name}</Text>
          <View style={styles.regionRow}>
            <MapPin size={12} color={theme.colors.antiqueGold} />
            <Text style={styles.regionText}>{site.region}</Text>
          </View>
        </View>
        <Text style={styles.description} numberOfLines={2}>
          {site.shortDescription}
        </Text>
        <View style={styles.footerRow}>
          <Text style={styles.duration}>{t('recommendedDuration')}: {site.recommendedDuration}</Text>
          <Text style={styles.exploreLink}>{t('common:viewDetails')} →</Text>
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
  unescoBadge: {
    position: 'absolute',
    top: theme.spacing.sm,
    left: theme.spacing.sm,
    backgroundColor: theme.colors.deepChocolate,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.brightGold,
  },
  unescoText: {
    ...theme.typography.badge,
    color: theme.colors.champagneGold,
    fontWeight: '700',
  },
  content: {
    padding: theme.spacing.md,
  },
  titleRow: {
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
  },
  regionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  regionText: {
    ...theme.typography.captionBold,
    color: theme.colors.antiqueGold,
  },
  description: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderGold,
  },
  duration: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  exploreLink: {
    ...theme.typography.captionBold,
    color: theme.colors.antiqueGold,
    fontWeight: '700',
  },
});
