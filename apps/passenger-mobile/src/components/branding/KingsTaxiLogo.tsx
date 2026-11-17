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

// Official Kings Taxi Authentication Logo (Cloudinary URI + Local Bundled Asset)
export const OFFICIAL_AUTH_LOGO_URL =
  'https://res.cloudinary.com/oxzqogef/image/upload/v1794923454/Gemini_Generated_Image_9rs3pd9rs3pd9rs3.jpg';
export const OFFICIAL_AUTH_LOGO_LOCAL = require('../../../assets/branding/kings-taxi-official-auth-logo.jpg');

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
  const [remoteFailed, setRemoteFailed] = React.useState(false);
  const officialAuthLogoSource = remoteFailed
    ? OFFICIAL_AUTH_LOGO_LOCAL
    : { uri: OFFICIAL_AUTH_LOGO_URL };

  const getDimensions = () => {
    switch (variant) {
      case 'hero':
        return {
          size: Math.round(210 * scale),
          borderRadius: 32,
          borderWidth: 2.5,
          source: officialAuthLogoSource,
          defaultSource: OFFICIAL_AUTH_LOGO_LOCAL,
          resizeMode: 'contain' as const,
        };
      case 'full':
        return {
          size: Math.round(148 * scale),
          borderRadius: 24,
          borderWidth: 2,
          source: officialAuthLogoSource,
          defaultSource: OFFICIAL_AUTH_LOGO_LOCAL,
          resizeMode: 'contain' as const,
        };
      case 'monogram':
        return {
          size: Math.round(84 * scale),
          borderRadius: 18,
          borderWidth: 2,
          source: MONOGRAM_SOURCE,
          defaultSource: undefined,
          resizeMode: 'cover' as const,
        };
      case 'compact':
        return {
          size: Math.round(44 * scale),
          borderRadius: 10,
          borderWidth: 1.5,
          source: MONOGRAM_SOURCE,
          defaultSource: undefined,
          resizeMode: 'cover' as const,
        };
      case 'header':
      default:
        // Header uses the high-definition focused monogram for maximum KT recognition
        return {
          size: Math.round(52 * scale),
          borderRadius: 14,
          borderWidth: 1.8,
          source: MONOGRAM_SOURCE,
          defaultSource: undefined,
          resizeMode: 'cover' as const,
        };
    }
  };

  const { size, borderRadius, borderWidth, source, defaultSource, resizeMode } = getDimensions();

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
            defaultSource={defaultSource}
            style={[
              styles.logoImage,
              { width: size - 4, height: size - 4, borderRadius: borderRadius - 2 },
              imageStyle,
            ]}
            resizeMode={resizeMode}
            onError={() => setRemoteFailed(true)}
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
          defaultSource={defaultSource}
          style={[
            styles.logoImage,
            { width: size, height: size, borderRadius },
            variant === 'full' && styles.authLogoImage,
            imageStyle,
          ]}
          resizeMode={resizeMode}
          onError={() => setRemoteFailed(true)}
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
            KINGS{' '}
            <Text
              style={
                variant === 'hero'
                  ? { color: colors.primaryGold }
                  : { color: '#1455A0' }
              }
            >
              TAXI
            </Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    overflow: 'hidden',
  },
  authLogoImage: {
    transform: [{ scale: 1.3 }],
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
    color: '#1455A0',
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
    color: '#1455A0',
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
