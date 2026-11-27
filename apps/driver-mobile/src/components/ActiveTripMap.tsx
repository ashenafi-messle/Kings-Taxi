import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, {
  Circle,
  Marker,
  Polyline,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
} from 'react-native-maps';
import { Crosshair, MapPinOff, Navigation, RefreshCw } from 'lucide-react-native';
import { Colors, Radius, Spacing } from '../theme/tokens';
import { GeoPoint } from '../types/driver.types';
import { useForegroundGps } from '../hooks/useForegroundGps';

interface ActiveTripMapProps {
  pickupLocation: string;
  destination: string;
  pickupCoords?: GeoPoint;
  destinationCoords?: GeoPoint;
}

const HAS_GOOGLE_MAPS_CONFIG = Boolean(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY);

export const ActiveTripMap: React.FC<ActiveTripMapProps> = ({
  pickupLocation,
  destination,
  pickupCoords,
  destinationCoords,
}) => {
  const { status, coords, errorMessage, retry } = useForegroundGps(true);
  const mapRef = useRef<MapView | null>(null);
  const hasCenteredRef = useRef(false);

  useEffect(() => {
    if (status === 'ready' && coords && mapRef.current && !hasCenteredRef.current) {
      hasCenteredRef.current = true;
      mapRef.current.animateToRegion(
        {
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 0.025,
          longitudeDelta: 0.025,
        },
        450
      );
    }
  }, [status, coords]);

  const handleRecenter = () => {
    if (!coords || !mapRef.current) return;
    mapRef.current.animateToRegion(
      {
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      },
      350
    );
  };

  if (status === 'loading' && !coords) {
    return (
      <View style={styles.stateBox}>
        <ActivityIndicator size="small" color={Colors.primaryBlack} />
        <Text style={styles.stateTitle}>Acquiring Device GPS...</Text>
        <Text style={styles.stateSubtitle}>
          Waiting for foreground location fix from your device.
        </Text>
      </View>
    );
  }

  if (status === 'denied' || status === 'services_disabled' || (status === 'unavailable' && !coords)) {
    return (
      <View style={styles.stateBox}>
        <MapPinOff size={28} color={Colors.error} />
        <Text style={styles.stateTitle}>
          {status === 'denied'
            ? 'Location Permission Denied'
            : status === 'services_disabled'
            ? 'Location Services Disabled'
            : 'GPS Location Unavailable'}
        </Text>
        <Text style={styles.stateSubtitle}>
          {errorMessage || 'Enable foreground GPS access to view your live position on the map.'}
        </Text>
        <View style={styles.stateActions}>
          <Pressable onPress={retry} style={styles.retryBtn}>
            <RefreshCw size={14} color={Colors.cardWhite} />
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
          <Pressable onPress={() => Linking.openSettings()} style={styles.settingsBtn}>
            <Text style={styles.settingsBtnText}>Open Settings</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!coords) {
    return null;
  }

  const provider =
    Platform.OS === 'android' && HAS_GOOGLE_MAPS_CONFIG ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;

  const mockRoutePoints =
    pickupCoords && destinationCoords ? [pickupCoords, destinationCoords] : null;

  return (
    <View style={styles.mapWrapper}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={provider}
        initialRegion={{
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
        rotateEnabled
        zoomEnabled
        scrollEnabled
      >
        {/* Real Device GPS Accuracy Radius */}
        {coords.accuracy ? (
          <Circle
            center={{ latitude: coords.latitude, longitude: coords.longitude }}
            radius={Math.min(Math.max(coords.accuracy, 15), 250)}
            fillColor="rgba(17, 17, 17, 0.08)"
            strokeColor="rgba(17, 17, 17, 0.25)"
            strokeWidth={1}
          />
        ) : null}

        {/* Real Device GPS Driver Marker */}
        <Marker
          coordinate={{ latitude: coords.latitude, longitude: coords.longitude }}
          title="Your Live GPS Location"
          description={
            coords.accuracy
              ? `Accuracy: ±${Math.round(coords.accuracy)} m`
              : 'Device foreground GPS'
          }
          pinColor="#111111"
        />

        {/* Mock Ride Pickup & Destination Markers */}
        {pickupCoords ? (
          <Marker
            coordinate={pickupCoords}
            title="Mock Pickup"
            description={pickupLocation}
            pinColor="#2E7D32"
          />
        ) : null}
        {destinationCoords ? (
          <Marker
            coordinate={destinationCoords}
            title="Mock Destination"
            description={destination}
            pinColor="#B7791F"
          />
        ) : null}

        {/* Clearly Labeled Mock Straight-Line Route (No Road Navigation API) */}
        {mockRoutePoints ? (
          <Polyline
            coordinates={mockRoutePoints}
            strokeColor="#111111"
            strokeWidth={3}
            lineDashPattern={[8, 6]}
          />
        ) : null}
      </MapView>

      {/* Top Overlay: GPS Accuracy & Mock Route Distinction */}
      <View style={styles.overlayTop}>
        <View style={styles.gpsBadge}>
          <View style={styles.gpsDot} />
          <Text style={styles.gpsBadgeText}>
            LIVE GPS {coords.accuracy ? `(±${Math.round(coords.accuracy)}m)` : ''} • MOCK ROUTE
          </Text>
        </View>

        <Pressable onPress={handleRecenter} style={styles.recenterBtn} hitSlop={8}>
          <Crosshair size={16} color={Colors.primaryBlack} />
        </Pressable>
      </View>

      {/* Bottom Route Summary Bar */}
      <View style={styles.overlayBottom}>
        <Navigation size={13} color={Colors.primaryBlack} />
        <Text style={styles.routeSummary} numberOfLines={1}>
          {pickupLocation} → {destination}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mapWrapper: {
    height: 270,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.primarySilver,
    backgroundColor: Colors.lightSilver,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayTop: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gpsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  gpsDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  gpsBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primaryBlack,
    letterSpacing: 0.4,
  },
  recenterBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayBottom: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  routeSummary: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryBlack,
  },
  stateBox: {
    height: 230,
    backgroundColor: Colors.cardWhite,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stateTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.primaryBlack,
    textAlign: 'center',
  },
  stateSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    color: Colors.secondaryText,
    textAlign: 'center',
  },
  stateActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: Spacing.xs,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryBlack,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.md,
  },
  retryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.cardWhite,
  },
  settingsBtn: {
    backgroundColor: Colors.lightSilver,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.md,
  },
  settingsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryBlack,
  },
});
