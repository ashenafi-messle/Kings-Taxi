import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { Colors, Radius, Spacing } from '../theme/tokens';

/**
 * Illustrative QR code placeholder for Phase 1 UI checkout.
 * Does not encode any real bank or mobile-money merchant account.
 */
export const QrPlaceholder: React.FC<{ size?: number }> = ({ size = 128 }) => {
  return (
    <View style={styles.wrapper}>
      <View style={styles.frame}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Rect x="0" y="0" width="100" height="100" fill="#FFFFFF" />
          {/* Top-left finder */}
          <Rect x="8" y="8" width="24" height="24" stroke="#111111" strokeWidth="4" fill="none" />
          <Rect x="15" y="15" width="10" height="10" fill="#111111" />
          {/* Top-right finder */}
          <Rect x="68" y="8" width="24" height="24" stroke="#111111" strokeWidth="4" fill="none" />
          <Rect x="75" y="15" width="10" height="10" fill="#111111" />
          {/* Bottom-left finder */}
          <Rect x="8" y="68" width="24" height="24" stroke="#111111" strokeWidth="4" fill="none" />
          <Rect x="15" y="75" width="10" height="10" fill="#111111" />
          {/* Illustrative matrix cells */}
          <Rect x="40" y="12" width="6" height="6" fill="#111111" />
          <Rect x="50" y="12" width="6" height="6" fill="#111111" />
          <Rect x="44" y="24" width="8" height="6" fill="#777777" />
          <Rect x="12" y="42" width="6" height="6" fill="#111111" />
          <Rect x="24" y="46" width="6" height="8" fill="#111111" />
          <Rect x="40" y="40" width="18" height="18" fill="#111111" />
          <Rect x="45" y="45" width="8" height="8" fill="#FFFFFF" />
          <Rect x="66" y="42" width="8" height="6" fill="#111111" />
          <Rect x="82" y="44" width="8" height="8" fill="#777777" />
          <Rect x="42" y="68" width="8" height="8" fill="#111111" />
          <Rect x="56" y="72" width="6" height="6" fill="#111111" />
          <Rect x="70" y="68" width="10" height="8" fill="#111111" />
          <Rect x="84" y="82" width="8" height="8" fill="#111111" />
          <Rect x="50" y="84" width="12" height="6" fill="#777777" />
        </Svg>
      </View>
      <Text style={styles.caption}>Illustrative QR Placeholder — Phase 1 UI</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  frame: {
    padding: Spacing.md,
    backgroundColor: Colors.cardWhite,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  caption: {
    fontSize: 11,
    color: Colors.secondaryText,
    fontWeight: '600',
  },
});
