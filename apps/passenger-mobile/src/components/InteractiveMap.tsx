import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { MapPin, Navigation, Car, AlertTriangle } from 'lucide-react-native';
import { theme } from '../theme';
import { LocationCoordinates } from '../types';

export interface InteractiveMapProps {
  pickupCoords?: LocationCoordinates;
  destinationCoords?: LocationCoordinates;
  driverCoords?: LocationCoordinates;
  driverBearing?: number;
  onSelectCoordinates?: (coords: LocationCoordinates) => void;
  permissionGranted?: boolean;
  onRequestPermission?: () => void;
  height?: number;
  style?: ViewStyle;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  pickupCoords,
  destinationCoords,
  driverCoords,
  permissionGranted = true,
  onRequestPermission,
  height = 240,
  style,
}) => {
  return (
    <View style={[styles.container, { height }, style]}>
      {/* Visual Map Canvas Grid (Simulated High-Performance Vector Grid) */}
      <View style={styles.gridCanvas}>
        <View style={styles.gridLineHorizontal1} />
        <View style={styles.gridLineHorizontal2} />
        <View style={styles.gridLineVertical1} />
        <View style={styles.gridLineVertical2} />

        {/* Road Overlay Representation */}
        <View style={styles.roadMain} />
        <View style={styles.roadCross} />

        {/* Pickup Pin */}
        {pickupCoords && (
          <View style={styles.pickupPinWrapper}>
            <View style={styles.pickupCallout}>
              <Text style={styles.calloutText}>Pickup</Text>
            </View>
            <View style={styles.pickupMarker}>
              <MapPin size={20} color="#FFFFFF" />
            </View>
          </View>
        )}

        {/* Destination Pin */}
        {destinationCoords && (
          <View style={styles.destinationPinWrapper}>
            <View style={styles.destinationCallout}>
              <Text style={styles.calloutText}>Destination</Text>
            </View>
            <View style={styles.destinationMarker}>
              <MapPin size={20} color="#FFFFFF" />
            </View>
          </View>
        )}

        {/* Driver Live Marker */}
        {driverCoords && (
          <View style={styles.driverMarkerWrapper}>
            <View style={styles.driverPulseRing} />
            <View style={styles.driverCarPin}>
              <Car size={16} color="#FFFFFF" />
            </View>
          </View>
        )}

        {/* Dynamic Route Line indicator when both pins exist */}
        {pickupCoords && destinationCoords && (
          <View style={styles.routeLineIndicator}>
            <View style={styles.routeDashes} />
          </View>
        )}
      </View>

      {/* Permission Warning Notice */}
      {!permissionGranted && (
        <View style={styles.permissionBanner}>
          <AlertTriangle size={16} color="#B45309" />
          <Text style={styles.permissionText}>
            GPS is disabled. Using manual map selection.
          </Text>
          {onRequestPermission && (
            <TouchableOpacity onPress={onRequestPermission}>
              <Text style={styles.enableGpsText}>Enable</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Location Recenter Control */}
      <TouchableOpacity
        style={styles.recenterButton}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Recenter map"
      >
        <Navigation size={18} color={theme.colors.secondary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#E8ECF2',
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  gridCanvas: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#E5E9F0',
  },
  gridLineHorizontal1: {
    position: 'absolute',
    top: '30%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#D8DEE9',
  },
  gridLineHorizontal2: {
    position: 'absolute',
    top: '70%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#D8DEE9',
  },
  gridLineVertical1: {
    position: 'absolute',
    left: '35%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#D8DEE9',
  },
  gridLineVertical2: {
    position: 'absolute',
    left: '65%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#D8DEE9',
  },
  roadMain: {
    position: 'absolute',
    top: '48%',
    left: 0,
    right: 0,
    height: 18,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#CBD5E1',
    transform: [{ rotate: '-8deg' }],
  },
  roadCross: {
    position: 'absolute',
    left: '52%',
    top: 0,
    bottom: 0,
    width: 14,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#CBD5E1',
    transform: [{ rotate: '12deg' }],
  },
  pickupPinWrapper: {
    position: 'absolute',
    top: '32%',
    left: '28%',
    alignItems: 'center',
  },
  pickupCallout: {
    backgroundColor: theme.colors.text,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  calloutText: {
    ...theme.typography.captionBold,
    color: theme.colors.textInverse,
    fontSize: 10,
  },
  pickupMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...theme.shadows.card,
  },
  destinationPinWrapper: {
    position: 'absolute',
    top: '55%',
    right: '25%',
    alignItems: 'center',
  },
  destinationCallout: {
    backgroundColor: theme.colors.text,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  destinationMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...theme.shadows.card,
  },
  driverMarkerWrapper: {
    position: 'absolute',
    top: '44%',
    left: '42%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverPulseRing: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(212, 175, 55, 0.35)',
  },
  driverCarPin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  routeLineIndicator: {
    position: 'absolute',
    top: '40%',
    left: '32%',
    width: '42%',
    height: 4,
    backgroundColor: theme.colors.secondary,
    borderRadius: 2,
    transform: [{ rotate: '24deg' }],
  },
  routeDashes: {
    width: '100%',
    height: '100%',
    borderStyle: 'dashed',
  },
  permissionBanner: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    backgroundColor: theme.colors.warningLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  permissionText: {
    ...theme.typography.caption,
    color: '#92400E',
    flex: 1,
  },
  enableGpsText: {
    ...theme.typography.captionBold,
    color: theme.colors.primaryDark,
    textDecorationLine: 'underline',
  },
  recenterButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
});
