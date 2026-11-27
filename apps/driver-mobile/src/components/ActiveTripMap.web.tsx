import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { MapPinOff, Navigation, RefreshCw } from 'lucide-react-native';
import { Colors, Radius, Spacing } from '../theme/tokens';
import { GeoPoint } from '../types/driver.types';
import { useForegroundGps } from '../hooks/useForegroundGps';

interface ActiveTripMapProps {
  pickupLocation: string;
  destination: string;
  pickupCoords?: GeoPoint;
  destinationCoords?: GeoPoint;
}

/**
 * Web fallback for ActiveTripMap (react-native-maps is native-only on Android/iOS).
 * Still reads real browser geolocation via expo-location when permitted.
 */
export const ActiveTripMap: React.FC<ActiveTripMapProps> = ({
  pickupLocation,
  destination,
}) => {
  const { status, coords, errorMessage, retry } = useForegroundGps(true);

  if (status === 'loading' && !coords) {
    return (
      <View style={styles.box}>
        <ActivityIndicator size="small" color={Colors.primaryBlack} />
        <Text style={styles.title}>Acquiring Browser GPS...</Text>
      </View>
    );
  }

  if (status !== 'ready' || !coords) {
    return (
      <View style={styles.box}>
        <MapPinOff size={24} color={Colors.error} />
        <Text style={styles.title}>Location Unavailable on Web</Text>
        <Text style={styles.subtitle}>
          {errorMessage || 'Native map renders on Android & iOS via react-native-maps.'}
        </Text>
        <Pressable onPress={retry} style={styles.retryBtn}>
          <RefreshCw size={13} color={Colors.cardWhite} />
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.box}>
      <View style={styles.badge}>
        <View style={styles.dot} />
        <Text style={styles.badgeText}>
          LIVE GPS: {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}{' '}
          {coords.accuracy ? `(±${Math.round(coords.accuracy)}m)` : ''}
        </Text>
      </View>
      <View style={styles.routeRow}>
        <Navigation size={14} color={Colors.primaryBlack} />
        <Text style={styles.routeText} numberOfLines={2}>
          Mock Route: {pickupLocation} → {destination}
        </Text>
      </View>
      <Text style={styles.note}>
        Interactive map tiles render via react-native-maps on Android &amp; iOS devices.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    height: 210,
    backgroundColor: Colors.cardWhite,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.primarySilver,
    padding: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.screenBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.success },
  badgeText: { fontSize: 11, fontWeight: '800', color: Colors.primaryBlack },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  routeText: { fontSize: 13, fontWeight: '700', color: Colors.primaryBlack, textAlign: 'center' },
  title: { fontSize: 14, fontWeight: '800', color: Colors.primaryBlack },
  subtitle: { fontSize: 12, color: Colors.secondaryText, textAlign: 'center' },
  note: { fontSize: 11, color: Colors.secondaryText, textAlign: 'center' },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryBlack,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.md,
  },
  retryText: { fontSize: 12, fontWeight: '700', color: Colors.cardWhite },
});
