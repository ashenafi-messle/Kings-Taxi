import React from 'react';
import { View, Image, Text, StyleSheet, ViewStyle, ImageStyle } from 'react-native';
import { colors } from '../../theme/colors';

export type LogoVariant = 'hero' | 'full' | 'header' | 'monogram' | 'compact';

interface KingsTaxiLogoProps {
  variant?: LogoVariant;
  showTagline?: boolean;
  showText?: boolean;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
  inverted?: boolean;
  scale?: number;
}

// Focused bold monogram (crown + bold KT letterforms)
const MONOGRAM_SOURCE = require('../../../assets/branding/kings-taxi-monogram.png');
// Focused cropped full logo
const CROPPED_LOGO_SOURCE = require('../../../assets/branding/kings-taxi-logo-cropped.png');

export const KingsTaxiLogo: React.FC<KingsTaxiLogoProps> = ({
  variant = 'full',
  showTagline = true,
  showText = true,
  style,
  imageStyle,
  inverted = false,
  scale = 1,
}) => {
  const getDimensions = () => {
    switch (variant) {
      case 'hero':
        return {
          size: Math.round(210 * scale),
          borderRadius: 32,
          borderWidth: 2.5,
          source: CROPPED_LOGO_SOURCE,
        };
      case 'full':
        return {
          size: Math.round(130 * scale),
          borderRadius: 22,
          borderWidth: 2,
          source: CROPPED_LOGO_SOURCE,
        };
      case 'monogram':
        return {
          size: Math.round(84 * scale),
          borderRadius: 18,
          borderWidth: 2,
          source: MONOGRAM_SOURCE,
        };
      case 'compact':
        return {
          size: Math.round(44 * scale),
          borderRadius: 10,
          borderWidth: 1.5,
          source: MONOGRAM_SOURCE,
        };
      case 'header':
      default:
        // Header uses the high-definition focused monogram for maximum KT recognition
        return {
          size: Math.round(52 * scale),
          borderRadius: 14,
          borderWidth: 1.8,
          source: MONOGRAM_SOURCE,
        };
    }
  };

  const { size, borderRadius, borderWidth, source } = getDimensions();

  if (variant === 'header') {
    return (
      <View
        style={[styles.headerContainer, style]}
        accessibilityRole="image"
        accessibilityLabel="Kings Taxi - Premium Class Transport"
      >
        <View
          style={[
            styles.headerBadge,
            {
              width: size,
              height: size,
              borderRadius,
              borderWidth,
            },
          ]}
        >
          <Image
            source={source}
            style={[
              styles.logoImage,
              { width: size - 4, height: size - 4, borderRadius: borderRadius - 2 },
              imageStyle,
            ]}
            resizeMode="cover"
          />
        </View>

        {showText && (
          <View style={styles.headerTextContainer}>
            <Text style={[styles.brandTitleHeader, inverted && styles.textInverted]}>
              KINGS <Text style={{ color: colors.primaryGold }}>TAXI</Text>
            </Text>
            {showTagline && (
              <Text
                style={[
                  styles.brandTaglineHeader,
                  inverted && styles.textInvertedMuted,
                ]}
              >
                PREMIUM CLASS TRANSPORT
              </Text>
            )}
          </View>
        )}
      </View>
    );
  }

  return (
    <View
      style={[styles.container, style]}
      accessibilityRole="image"
      accessibilityLabel="Kings Taxi Official Brand Logo"
    >
      <View
        style={[
          styles.logoCard,
          {
            borderRadius: borderRadius + 2,
            borderWidth,
          },
        ]}
      >
        <Image
          source={source}
          style={[
            styles.logoImage,
            { width: size, height: size, borderRadius },
            imageStyle,
          ]}
          resizeMode="cover"
        />
      </View>

      {showText && variant !== 'monogram' && variant !== 'compact' && (
        <View style={styles.textContainer}>
          <Text
            style={[
              variant === 'hero' ? styles.brandTitleHero : styles.brandTitle,
              inverted && styles.textInverted,
            ]}
          >
            KINGS <Text style={{ color: colors.primaryGold }}>TAXI</Text>
          </Text>
          {showTagline && (
            <Text
              style={[
                variant === 'hero' ? styles.brandTaglineHero : styles.brandTagline,
                inverted && styles.textInvertedMuted,
              ]}
            >
              PREMIUM CLASS TRANSPORT
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerBadge: {
    backgroundColor: colors.white,
    borderColor: colors.primaryGold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primaryGold,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 4,
  },
  logoCard: {
    padding: 3,
    backgroundColor: colors.white,
    borderColor: colors.primaryGold,
    shadowColor: colors.primaryGold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 7,
  },
  logoImage: {
    overflow: 'hidden',
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 14,
  },
  headerTextContainer: {
    justifyContent: 'center',
  },
  brandTitleHero: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 3.5,
    color: colors.dark,
    textAlign: 'center',
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2.5,
    color: colors.dark,
    textAlign: 'center',
  },
  brandTitleHeader: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
    color: colors.dark,
  },
  brandTaglineHero: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 3,
    color: colors.secondaryText,
    marginTop: 5,
    textTransform: 'uppercase',
  },
  brandTagline: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2.2,
    color: colors.secondaryText,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  brandTaglineHeader: {
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: colors.secondaryText,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  textInverted: {
    color: colors.white,
  },
  textInvertedMuted: {
    color: colors.champagne,
  },
});
