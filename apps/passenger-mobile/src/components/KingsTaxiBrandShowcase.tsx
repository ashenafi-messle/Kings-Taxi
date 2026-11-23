import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Animated,
  Easing,
  AppState,
  AppStateStatus,
  AccessibilityInfo,
  ViewStyle,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { theme } from '../theme';

/**
 * Path to the official Kings Taxi passenger application icon asset.
 * Features the royal crown with bold KT monogram in majestic gold.
 * Preserves 100% of the original design, crown, colors, and proportions.
 */
const APP_ICON_SOURCE = require('../../assets/kt-crown-app-icon.png');

export interface KingsTaxiBrandShowcaseProps {
  style?: ViewStyle;
  onPress?: () => void;
}

export const KingsTaxiBrandShowcase: React.FC<KingsTaxiBrandShowcaseProps> = ({
  style,
  onPress,
}) => {
  const [isReduceMotion, setIsReduceMotion] = useState<boolean>(false);

  // Animated values
  const colorAnim = useRef(new Animated.Value(0)).current;
  const sweepAnim = useRef(new Animated.Value(-160)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;

  // Animation composite references
  const colorLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const sweepLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const isNativeDriverSupported = Platform.OS !== 'web';

  const startAnimations = () => {
    try {
      // 1. Continuous modern brand color transition loop
      // Transitions smoothly across royal gold, warm metallic gold, champagne gold, and bright gold
      colorLoopRef.current = Animated.loop(
        Animated.timing(colorAnim, {
          toValue: 4,
          duration: 9000,
          easing: Easing.linear,
          useNativeDriver: false,
        })
      );
      colorLoopRef.current.start();

      // 2. Light sweep highlight running diagonally across the card
      sweepLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(sweepAnim, {
            toValue: 260,
            duration: 2200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: isNativeDriverSupported,
          }),
          Animated.delay(2600),
          Animated.timing(sweepAnim, {
            toValue: -160,
            duration: 1,
            useNativeDriver: isNativeDriverSupported,
          }),
        ])
      );
      sweepLoopRef.current.start();

      // 3. Gentle breathing pulse and glow of the central aura
      pulseLoopRef.current = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.05,
              duration: 2400,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: isNativeDriverSupported,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1.0,
              duration: 2400,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: isNativeDriverSupported,
            }),
          ]),
          Animated.sequence([
            Animated.timing(glowAnim, {
              toValue: 0.85,
              duration: 2400,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: isNativeDriverSupported,
            }),
            Animated.timing(glowAnim, {
              toValue: 0.4,
              duration: 2400,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: isNativeDriverSupported,
            }),
          ]),
        ])
      );
      pulseLoopRef.current.start();
    } catch (animErr) {
      console.warn('[KingsTaxiBrandShowcase] Animation initialization fallback:', animErr);
    }
  };

  const stopAnimations = () => {
    if (colorLoopRef.current) colorLoopRef.current.stop();
    if (sweepLoopRef.current) sweepLoopRef.current.stop();
    if (pulseLoopRef.current) pulseLoopRef.current.stop();
    colorAnim.stopAnimation();
    sweepAnim.stopAnimation();
    pulseAnim.stopAnimation();
    glowAnim.stopAnimation();
  };

  // Accessibility: Detect reduced-motion preferences
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      setIsReduceMotion(enabled);
    });

    const reduceMotionSub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => {
        setIsReduceMotion(enabled);
      }
    );

    return () => {
      reduceMotionSub.remove();
    };
  }, []);

  // AppState: Pause animations when app is backgrounded
  useEffect(() => {
    if (isReduceMotion) {
      stopAnimations();
      colorAnim.setValue(0);
      return;
    }

    startAnimations();

    const appStateSub = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'active') {
          if (!isReduceMotion) {
            startAnimations();
          }
        } else {
          stopAnimations();
        }
      }
    );

    return () => {
      stopAnimations();
      appStateSub.remove();
    };
  }, [isReduceMotion]);

  // Card Left Accent Border color transition (matches the left border accent of neighboring cards)
  const borderLeftColor = colorAnim.interpolate({
    inputRange: [0, 1, 2, 3, 4],
    outputRange: [
      theme.colors.antiqueGold,   // #A36B31 (Antique Gold)
      theme.colors.champagneGold, // #EDD987 (Champagne Gold)
      '#C48E55',                  // Warm Metallic Gold
      theme.colors.deepChocolate, // #502D0A (Deep Chocolate Accent)
      theme.colors.antiqueGold,   // Loop return
    ],
  });

  // Central Halo Aura color transition
  const auraColor = colorAnim.interpolate({
    inputRange: [0, 1, 2, 3, 4],
    outputRange: [
      'rgba(163, 107, 49, 0.20)', // Antique Gold Aura
      'rgba(237, 217, 135, 0.35)', // Champagne Gold Aura
      'rgba(196, 142, 85, 0.25)',  // Warm Gold Aura
      'rgba(80, 45, 10, 0.15)',    // Deep Chocolate Aura
      'rgba(163, 107, 49, 0.20)', // Loop return
    ],
  });

  // Central Badge Border transition
  const badgeBorderColor = colorAnim.interpolate({
    inputRange: [0, 1, 2, 3, 4],
    outputRange: [
      'rgba(163, 107, 49, 0.55)',
      'rgba(237, 217, 135, 0.75)',
      'rgba(196, 142, 85, 0.60)',
      'rgba(80, 45, 10, 0.35)',
      'rgba(163, 107, 49, 0.55)',
    ],
  });

  const cardInner = (
    <>
      {/* Outer subtle radial ring */}
      {!isReduceMotion && (
        <Animated.View
          style={[
            styles.outerHaloRing,
            {
              transform: [{ scale: pulseAnim }],
              opacity: glowAnim,
            },
          ]}
        />
      )}

      {/* Central Ambient Color Transition Aura */}
      <Animated.View
        style={[
          styles.centerAura,
          {
            backgroundColor: auraColor,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />

      {/* Diagonal Light Sweep Highlight */}
      {!isReduceMotion && (
        <Animated.View
          pointerEvents={Platform.OS === 'web' ? undefined : 'none'}
          style={[
            styles.lightSweepBar,
            Platform.OS === 'web' ? ({ pointerEvents: 'none' } as any) : null,
            {
              transform: [{ rotate: '25deg' }, { translateX: sweepAnim }],
            },
          ]}
        />
      )}

      {/* Iconic KT with Crown Badge — Sized to display equally with the card size */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            borderColor: badgeBorderColor,
          },
        ]}
      >
        <Image
          source={APP_ICON_SOURCE}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </Animated.View>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={onPress}
        style={[styles.touchableWrapper, style]}
      >
        <Animated.View
          style={[
            styles.serviceCard,
            styles.fullWidth,
            {
              borderLeftColor,
            },
          ]}
          accessibilityRole="image"
          accessibilityLabel="Kings Taxi - KT with Crown brand showcase"
        >
          {cardInner}
        </Animated.View>
      </TouchableOpacity>
    );
  }

  return (
    <Animated.View
      style={[
        styles.serviceCard,
        {
          borderLeftColor,
        },
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel="Kings Taxi - KT with Crown brand showcase"
    >
      {cardInner}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  touchableWrapper: {
    width: '48%',
  },
  fullWidth: {
    width: '100%',
  },
  serviceCard: {
    width: '48%',
    backgroundColor: theme.colors.surface, // Same clean surface as nearby cards
    borderRadius: theme.borderRadius.lg,   // 16px - Matches nearby cards
    borderWidth: 1.5,
    borderColor: theme.colors.borderGold,  // Matches nearby cards
    borderLeftWidth: 4,                    // Matches rideCard, hotelCard, heritageCard
    minHeight: 168,                        // Matches nearby cards height
    padding: 10,                           // Optimized to allow maximum logo presence
    justifyContent: 'center',              // Centers KT with crown vertically
    alignItems: 'center',                  // Centers KT with crown horizontally
    overflow: 'hidden',
    position: 'relative',
    ...theme.shadows.cardGold,
  },
  outerHaloRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: 'rgba(163, 107, 49, 0.25)',
    backgroundColor: 'rgba(237, 217, 135, 0.20)',
  },
  centerAura: {
    position: 'absolute',
    width: 144,
    height: 144,
    borderRadius: 72,
  },
  lightSweepBar: {
    position: 'absolute',
    top: -60,
    left: -40,
    width: 44,
    height: 300,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  logoContainer: {
    width: 132,
    height: 132,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.antiqueGold,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.20,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      default: {},
    }),
  },
  logoImage: {
    width: 122,
    height: 122,
    borderRadius: 20,
  },
});
