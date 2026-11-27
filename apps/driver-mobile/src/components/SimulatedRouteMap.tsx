import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Car, MapPin, Navigation } from 'lucide-react-native';
import { Colors, Radius, Spacing } from '../theme/tokens';

interface SimulatedRouteMapProps {
  pickupLocation: string;
  destination: string;
  progressPct: number;
}

/**
 * Simulated map interface designed as a drop-in slot for a real map SDK
 * (e.g. react-native-maps) in Phase 2. Does not use live GPS.
 */
export const SimulatedRouteMap: React.FC<SimulatedRouteMapProps> = ({
  pickupLocation,
  destination,
  progressPct,
}) => {
  const clampedPct = Math.min(96, Math.max(6, progressPct));

  return (
    <View style={styles.mapContainer}>
      {/* Subtle automotive grid lines */}
      <View style={styles.gridOverlay}>
        <View style={[styles.gridLineH, { top: '28%' }]} />
        <View style={[styles.gridLineH, { top: '58%' }]} />
        <View style={[styles.gridLineV, { left: '30%' }]} />
        <View style={[styles.gridLineV, { left: '68%' }]} />
      </View>

      <View style={styles.topBadgeRow}>
        <View style={styles.simBadge}>
          <View style={styles.simDot} />
          <Text style={styles.simBadgeText}>SIMULATED MAP PREVIEW (NO LIVE GPS)</Text>
        </View>
      </View>

      {/* Route visualization */}
      <View style={styles.routeVisual}>
        <View style={styles.endpointBox}>
          <View style={styles.pickupNode}>
            <Navigation size={14} color={Colors.primaryBlack} />
          </View>
          <Text style={styles.endpointLabel} numberOfLines={1}>
            {pickupLocation}
          </Text>
        </View>

        <View style={styles.trackWrapper}>
          <View style={styles.trackBg} />
          <View style={[styles.trackFill, { width: `${clampedPct}%` }]} />
          <View style={[styles.driverMarker, { left: `${clampedPct}%` }]}>
            <Car size={15} color={Colors.cardWhite} />
          </View>
        </View>

        <View style={styles.endpointBox}>
          <View style={styles.destNode}>
            <MapPin size={14} color={Colors.cardWhite} />
          </View>
          <Text style={styles.endpointLabel} numberOfLines={1}>
            {destination}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mapContainer: {
    height: 210,
    backgroundColor: '#E9ECEF',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.primarySilver,
    overflow: 'hidden',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    position: 'relative',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(17, 17, 17, 0.06)',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(17, 17, 17, 0.06)',
  },
  topBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  simBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.cardWhite,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  simDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.warning,
  },
  simBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primaryBlack,
    letterSpacing: 0.4,
  },
  routeVisual: {
    gap: 12,
  },
  endpointBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pickupNode: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.lightSilver,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destNode: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primaryBlack,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endpointLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryBlack,
  },
  trackWrapper: {
    height: 28,
    justifyContent: 'center',
    position: 'relative',
    marginHorizontal: 8,
  },
  trackBg: {
    height: 5,
    backgroundColor: Colors.primarySilver,
    borderRadius: 3,
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    height: 5,
    backgroundColor: Colors.primaryBlack,
    borderRadius: 3,
  },
  driverMarker: {
    position: 'absolute',
    marginLeft: -15,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primaryBlack,
    borderWidth: 2,
    borderColor: Colors.cardWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
