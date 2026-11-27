import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';

export type GpsStatus =
  | 'loading'
  | 'ready'
  | 'denied'
  | 'services_disabled'
  | 'unavailable';

export interface GpsCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
}

export interface ForegroundGpsState {
  status: GpsStatus;
  coords: GpsCoordinates | null;
  errorMessage: string | null;
  retry: () => void;
}

/**
 * Manages foreground GPS permission, initial fix, and a single throttled
 * watchPositionAsync subscription. Never fabricates coordinates.
 */
export function useForegroundGps(enabled = true): ForegroundGpsState {
  const [status, setStatus] = useState<GpsStatus>('loading');
  const [coords, setCoords] = useState<GpsCoordinates | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const webWatchIdRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const cleanupSubscription = useCallback(() => {
    if (subscriptionRef.current) {
      try {
        subscriptionRef.current.remove();
      } catch {
        // Guard against expo-location web LocationEventEmitter.removeSubscription bug
      }
      subscriptionRef.current = null;
    }
    if (
      Platform.OS === 'web' &&
      webWatchIdRef.current !== null &&
      typeof navigator !== 'undefined' &&
      navigator.geolocation
    ) {
      navigator.geolocation.clearWatch(webWatchIdRef.current);
      webWatchIdRef.current = null;
    }
  }, []);

  const retry = useCallback(() => {
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cleanupSubscription();
    };
  }, [cleanupSubscription]);

  useEffect(() => {
    if (!enabled) {
      cleanupSubscription();
      return;
    }

    let cancelled = false;

    const startTracking = async () => {
      cleanupSubscription();
      setStatus('loading');
      setErrorMessage(null);

      // On web, use standard navigator.geolocation directly to avoid expo-location web emitter bug
      if (Platform.OS === 'web') {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
          setStatus('unavailable');
          setCoords(null);
          setErrorMessage('Browser geolocation is not supported in this environment.');
          return;
        }

        const watchId = navigator.geolocation.watchPosition(
          (pos) => {
            if (cancelled || !mountedRef.current) return;
            setCoords({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy ?? null,
              heading: pos.coords.heading ?? null,
            });
            setStatus('ready');
            setErrorMessage(null);
          },
          (geoErr) => {
            if (cancelled || !mountedRef.current) return;
            if (geoErr.code === geoErr.PERMISSION_DENIED) {
              setStatus('denied');
              setErrorMessage('Browser location permission was denied.');
            } else {
              setStatus('unavailable');
              setErrorMessage(geoErr.message || 'Unable to acquire browser GPS.');
            }
            setCoords(null);
          },
          { enableHighAccuracy: false, maximumAge: 10000, timeout: 10000 }
        );
        webWatchIdRef.current = watchId;
        return;
      }

      try {
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (cancelled || !mountedRef.current) return;

        if (!servicesEnabled) {
          setStatus('services_disabled');
          setCoords(null);
          setErrorMessage('Device location services (GPS) are turned off.');
          return;
        }

        const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
        if (cancelled || !mountedRef.current) return;

        if (permStatus !== Location.PermissionStatus.GRANTED) {
          setStatus('denied');
          setCoords(null);
          setErrorMessage('Foreground location permission is required to show your live GPS position.');
          return;
        }

        // Attempt quick initial fix without crashing if signal is temporarily unavailable
        try {
          const initial = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (!cancelled && mountedRef.current) {
            setCoords({
              latitude: initial.coords.latitude,
              longitude: initial.coords.longitude,
              accuracy: initial.coords.accuracy ?? null,
              heading: initial.coords.heading ?? null,
            });
            setStatus('ready');
          }
        } catch {
          // Continue to watchPositionAsync; if watch also fails, unavailable state is set below
        }

        if (cancelled || !mountedRef.current) return;

        const sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 5000,
            distanceInterval: 10,
          },
          (loc) => {
            if (cancelled || !mountedRef.current) return;
            setCoords({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              accuracy: loc.coords.accuracy ?? null,
              heading: loc.coords.heading ?? null,
            });
            setStatus('ready');
            setErrorMessage(null);
          }
        );

        if (cancelled || !mountedRef.current) {
          sub.remove();
          return;
        }

        subscriptionRef.current = sub;
      } catch (err: any) {
        if (cancelled || !mountedRef.current) return;
        setStatus('unavailable');
        setCoords(null);
        setErrorMessage(err?.message || 'Unable to acquire device GPS location.');
      }
    };

    startTracking();

    return () => {
      cancelled = true;
      cleanupSubscription();
    };
  }, [enabled, attempt, cleanupSubscription]);

  return { status, coords, errorMessage, retry };
}
