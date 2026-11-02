import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Star } from 'lucide-react-native';
import { theme } from '../theme';

export interface RatingComponentProps {
  rating: number;
  maxStars?: number;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  size?: number;
  showScore?: boolean;
  reviewCount?: number;
  style?: ViewStyle;
}

export const RatingComponent: React.FC<RatingComponentProps> = ({
  rating,
  maxStars = 5,
  interactive = false,
  onRatingChange,
  size = 18,
  showScore = false,
  reviewCount,
  style,
}) => {
  const stars = Array.from({ length: maxStars }, (_, i) => i + 1);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.starsRow}>
        {stars.map((starValue) => {
          const isFilled = starValue <= Math.round(rating);
          const StarIcon = (
            <Star
              key={starValue}
              size={size}
              color={isFilled ? theme.colors.primaryDark : theme.colors.borderStrong}
              fill={isFilled ? theme.colors.primary : 'transparent'}
            />
          );

          if (interactive && onRatingChange) {
            return (
              <TouchableOpacity
                key={starValue}
                onPress={() => onRatingChange(starValue)}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                {StarIcon}
              </TouchableOpacity>
            );
          }

          return <View key={starValue} style={styles.starSpacing}>{StarIcon}</View>;
        })}
      </View>
      {showScore && (
        <Text style={styles.scoreText}>
          {rating.toFixed(1)}
          {reviewCount !== undefined && (
            <Text style={styles.countText}> ({reviewCount})</Text>
          )}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starSpacing: {
    marginRight: 2,
  },
  scoreText: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
    marginLeft: theme.spacing.xs,
  },
  countText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
});
