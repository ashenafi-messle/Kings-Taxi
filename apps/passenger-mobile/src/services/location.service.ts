/**
 * Kings Taxi - Cross-Platform Location Service
 *
 * Provides accurate GPS tracking and address geocoding for Android & iOS.
 * Handles permission lifecycles, background/foreground state, and graceful
 * offline/denied fallbacks to Addis Ababa reference points.
 */

import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { AddressLocation, LocationCoordinates } from '../types';
import { offlineGpsQueueService } from './offlineGpsQueue.service';

export interface GpsTelemetrySample {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  altitude: number | null;
  deviceTimestamp: string;
  tripId: string;
  sequenceNumber: number;
}

export const DEFAULT_ADDIS_COORDINATES: LocationCoordinates = {
  latitude: 8.9778,
  longitude: 38.7993,
};

export const DEFAULT_PICKUP_LOCATION: AddressLocation = {
  id: 'loc_bole_default',
  title: 'Bole International Airport (Terminal 2)',
  address: 'Bole Airport, Addis Ababa, Ethiopia',
  coordinates: DEFAULT_ADDIS_COORDINATES,
};

export interface LocationPermissionResult {
  granted: boolean;
  canAskAgain: boolean;
  status: Location.PermissionStatus;
}

export class LocationService {
  /**
   * Checks current permission status without prompting user
   */
  static async checkPermissions(): Promise<LocationPermissionResult> {
    try {
      const response = await Location.getForegroundPermissionsAsync();
      return {
        granted: response.granted,
        canAskAgain: response.canAskAgain,
        status: response.status,
      };
    } catch (err) {
      console.warn('Failed to inspect foreground location permission:', err);
      return {
        granted: false,
        canAskAgain: true,
        status: Location.PermissionStatus.UNDETERMINED,
      };
    }
  }

  /**
   * Requests foreground location permissions from passenger
   */
  static async requestPermissions(): Promise<LocationPermissionResult> {
    try {
      const response = await Location.requestForegroundPermissionsAsync();
      return {
        granted: response.granted,
        canAskAgain: response.canAskAgain,
        status: response.status,
      };
    } catch (err) {
      console.warn('Failed to request foreground location permission:', err);
      return {
        granted: false,
        canAskAgain: false,
        status: Location.PermissionStatus.DENIED,
      };
    }
  }

  /**
   * Validates whether device location services (GPS hardware) are switched on
   */
  static async isLocationServicesEnabled(): Promise<boolean> {
    try {
      return await Location.hasServicesEnabledAsync();
    } catch {
      return false;
    }
  }

  /**
   * Obtains the passenger's current GPS position with timeout and fallback
   */
  static async getCurrentLocation(): Promise<LocationCoordinates> {
    try {
      const perm = await this.checkPermissions();
      if (!perm.granted) {
        const requested = await this.requestPermissions();
        if (!requested.granted) {
          return DEFAULT_ADDIS_COORDINATES;
        }
      }

      const servicesEnabled = await this.isLocationServicesEnabled();
      if (!servicesEnabled) {
        return DEFAULT_ADDIS_COORDINATES;
      }

      // First attempt fast last known position to prevent blocking UI
      const lastKnown = await Location.getLastKnownPositionAsync({
        maxAge: 1000 * 60 * 5, // 5 minutes fresh
      }).catch(() => null);

      if (lastKnown?.coords) {
        return {
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
        };
      }

      // Fetch fresh position with balanced accuracy to optimize battery on mobile devices
      const freshPosition = await Location.getCurrentPositionAsync({
        accuracy:
          Platform.OS === 'android'
            ? Location.Accuracy.Balanced
            : Location.Accuracy.High,
      });

      return {
        latitude: freshPosition.coords.latitude,
        longitude: freshPosition.coords.longitude,
      };
    } catch (err) {
      console.warn('Could not acquire current GPS position, using default:', err);
      return DEFAULT_ADDIS_COORDINATES;
    }
  }

  /**
   * Reverse-geocodes GPS coordinates into readable street / district address
   */
  static async reverseGeocode(
    coords: LocationCoordinates
  ): Promise<{ title: string; address: string }> {
    try {
      const results = await Location.reverseGeocodeAsync({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });

      if (results && results.length > 0) {
        const place = results[0];
        const street = place.street || place.name || 'Current Location';
        const district = place.district || place.subregion || place.city || 'Addis Ababa';
        const country = place.country || 'Ethiopia';

        return {
          title: street,
          address: `${street}, ${district}, ${country}`,
        };
      }
    } catch (err) {
      console.warn('Reverse geocoding error:', err);
    }

    return {
      title: DEFAULT_PICKUP_LOCATION.title,
      address: DEFAULT_PICKUP_LOCATION.address,
    };
  }

  /**
   * Returns complete default pickup location object
   */
  static getDefaultLocation(): AddressLocation {
    return { ...DEFAULT_PICKUP_LOCATION };
  }

  private static activeSubscription: Location.LocationSubscription | null = null;
  private static sequenceCounter: number = 1;

  /**
   * Starts high-accuracy GNSS/GPS tracking independent of internet connectivity.
   * Captured samples are immediately stored in the persistent local SQLite queue.
   */
  static async startTripTracking(
    tripId: string,
    onSample?: (sample: GpsTelemetrySample) => void
  ): Promise<boolean> {
    try {
      const perm = await this.checkPermissions();
      if (!perm.granted) {
        const requested = await this.requestPermissions();
        if (!requested.granted) return false;
      }

      this.stopTripTracking();
      this.sequenceCounter = 1;

      // Watch position with highest accuracy supported by native GNSS chip
      this.activeSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2500, // 2.5 seconds
          distanceInterval: 5, // 5 meters
        },
        async (loc) => {
          const sample: GpsTelemetrySample = {
            tripId,
            sequenceNumber: this.sequenceCounter++,
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracy: loc.coords.accuracy ?? 5.0,
            speed: loc.coords.speed ?? null,
            heading: loc.coords.heading ?? null,
            altitude: loc.coords.altitude ?? null,
            deviceTimestamp: new Date(loc.timestamp).toISOString(),
          };

          // Save into persistent local offline queue
          await offlineGpsQueueService.enqueueSample(sample);

          if (onSample) {
            onSample(sample);
          }
        }
      );

      return true;
    } catch (err) {
      console.warn('[LocationService] Failed to start active trip tracking:', err);
      return false;
    }
  }

  /**
   * Stops active GNSS/GPS trip tracking
   */
  static stopTripTracking() {
    if (this.activeSubscription) {
      this.activeSubscription.remove();
      this.activeSubscription = null;
    }
  }
}

