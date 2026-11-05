import React from 'react';
import { View, Image, Text, StyleSheet, ViewStyle, ImageStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

export type LogoVariant = 'hero' | 'full' | 'header' | 'monogram' | 'compact';

interface KingsTaxiLogoProps {
  variant?: LogoVariant;
  showTagline?: boolean;
  showText?: boolean;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
  inverted?: boolean;
}

// Statically require the official downloaded logo asset
const LOGO_SOURCE = require('../../../assets/branding/kings-taxi-logo.png');

export const KingsTaxiLogo: React.FC<KingsTaxiLogoProps> = ({
  variant = 'full',
  showTagline = true,
  showText = true,
  style,
  imageStyle,
  inverted = false,
}) => {
  const getDimensions = () => {
    switch (variant) {
      case 'hero':
        return { size: 160, borderRadius: 28 };
      case 'full':
        return { size: 110, borderRadius: 20 };
      case 'monogram':
        return { size: 72, borderRadius: 14 };
      case 'compact':
        return { size: 48, borderRadius: 10 };
      case 'header':
      default:
        return { size: 42, borderRadius: 10 };
    }
  };

  const { size, borderRadius } = getDimensions();

  if (variant === 'header') {
    return (
      <View style={[styles.headerContainer, style]} accessibilityRole="image" accessibilityLabel="Kings Taxi Logo">
        <Image
          source={LOGO_SOURCE}
          style={[
            styles.logoImage,
            { width: size, height: size, borderRadius },
            imageStyle,
          ]}
          resizeMode="cover"
        />
        {showText && (
          <View style={styles.headerTextContainer}>
            <Text style={[styles.brandTitleHeader, inverted && styles.textInverted]}>
              KINGS <Text style={{ color: colors.primaryGold }}>TAXI</Text>
            </Text>
            {showTagline && (
              <Text style={[styles.brandTaglineHeader, inverted && styles.textInvertedMuted]}>
                PREMIUM CLASS TRANSPORT
              </Text>
            )}
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]} accessibilityRole="image" accessibilityLabel="Kings Taxi Official Brand Logo">
      <View style={[styles.logoCard, { borderRadius: borderRadius + 2 }]}>
        <Image
          source={LOGO_SOURCE}
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
          <Text style={[styles.brandTitle, inverted && styles.textInverted]}>
            KINGS <Text style={{ color: colors.primaryGold }}>TAXI</Text>
          </Text>
          {showTagline && (
            <Text style={[styles.brandTagline, inverted && styles.textInvertedMuted]}>
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
    gap: 10,
  },
  logoCard: {
    padding: 3,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.borderGold,
    shadowColor: colors.primaryGold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  logoImage: {
    overflow: 'hidden',
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 12,
  },
  headerTextContainer: {
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 2.5,
    color: colors.dark,
    textAlign: 'center',
  },
  brandTitleHeader: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.8,
    color: colors.dark,
  },
  brandTagline: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2,
    color: colors.textSecondary,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  brandTaglineHeader: {
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 1.2,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: 1,
  },
  textInverted: {
    color: colors.white,
  },
  textInvertedMuted: {
    color: colors.champagne,
  },
});
