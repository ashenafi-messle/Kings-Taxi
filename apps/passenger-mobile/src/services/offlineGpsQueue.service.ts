/**
 * Kings Taxi — Persistent Offline GPS SQLite Queue Service
 *
 * Implements persistent local queue for GPS telematics during network outages.
 *
 * Requirements:
 * - Persistent storage that survives device reboots and app termination.
 * - Captures: latitude, longitude, accuracy, speed, heading, altitude, deviceTimestamp, tripId, sequenceNumber.
 * - Guarantees chronological sequence preservation.
 * - Idempotent sample submission to eliminate duplicate server records.
 * - Automatic background synchronization when network (Wi-Fi or cellular) is restored.
 * - Atomic confirmation: samples remain in persistent queue until backend confirms HTTP 200 persistence.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { networkService, NetworkState } from './network.service';
import { API_CONFIG } from '../config/api';
import { useAuthStore } from '../stores/auth.store';

export interface OfflineGpsSample {
  id: string; // Idempotency key: `KT-GPS-${tripId}-${sequenceNumber}-${deviceTimestamp}`
  tripId: string;
  sequenceNumber: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  altitude: number | null;
  deviceTimestamp: string;
  status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
  attempts: number;
  createdAt: string;
}

const STORAGE_KEY_PREFIX = '@kings_taxi_offline_gps_';
const QUEUE_INDEX_KEY = '@kings_taxi_offline_gps_queue_index';

export class OfflineGpsQueueService {
  private static instance: OfflineGpsQueueService;
  private isSyncing: boolean = false;
  private syncTimer: any = null;
  private nextSequenceNumber: number = 1;

  private constructor() {
    this.initAutoSyncOnReconnection();
  }

  public static getInstance(): OfflineGpsQueueService {
    if (!OfflineGpsQueueService.instance) {
      OfflineGpsQueueService.instance = new OfflineGpsQueueService();
    }
    return OfflineGpsQueueService.instance;
  }

  /**
   * Automatically listens for network reconnection (Wi-Fi or Mobile Data)
   * and triggers queue flush
   */
  private initAutoSyncOnReconnection() {
    networkService.addListener((state: NetworkState) => {
      if (state.isConnected && state.isInternetReachable) {
        // Automatic synchronization triggered on reconnection
        this.syncQueue();
      }
    });
  }

  /**
   * Generates a deterministic idempotency key for every sample
   */
  public generateIdempotencyKey(tripId: string, sequenceNumber: number, timestamp: string): string {
    const cleanTime = new Date(timestamp).getTime();
    return `KT-GPS-${tripId}-${sequenceNumber}-${cleanTime}`;
  }

  /**
   * Enqueue GPS sample to persistent storage
   */
  public async enqueueSample(
    sample: Omit<OfflineGpsSample, 'id' | 'status' | 'attempts' | 'createdAt'>
  ): Promise<OfflineGpsSample> {
    const id = this.generateIdempotencyKey(sample.tripId, sample.sequenceNumber, sample.deviceTimestamp);
    const fullSample: OfflineGpsSample = {
      ...sample,
      id,
      status: 'PENDING',
      attempts: 0,
      createdAt: new Date().toISOString(),
    };

    try {
      const storageKey = `${STORAGE_KEY_PREFIX}${fullSample.tripId}`;
      const existingRaw = await AsyncStorage.getItem(storageKey);
      const queue: OfflineGpsSample[] = existingRaw ? JSON.parse(existingRaw) : [];

      // Deduplicate check
      const existsIndex = queue.findIndex((s) => s.id === fullSample.id);
      if (existsIndex >= 0) {
        // Already recorded
        return queue[existsIndex];
      }

      queue.push(fullSample);
      // Sort chronologically by sequenceNumber and deviceTimestamp
      queue.sort(
        (a, b) =>
          a.sequenceNumber - b.sequenceNumber ||
          new Date(a.deviceTimestamp).getTime() - new Date(b.deviceTimestamp).getTime()
      );

      await AsyncStorage.setItem(storageKey, JSON.stringify(queue));

      // Register trip in active index
      await this.registerTripInIndex(sample.tripId);

      this.nextSequenceNumber = Math.max(this.nextSequenceNumber, sample.sequenceNumber + 1);

      // If online, trigger background sync
      if (networkService.isOnline()) {
        this.scheduleSync();
      }

      return fullSample;
    } catch (err) {
      console.warn('[OfflineGpsQueue] Failed to persist GPS sample locally:', err);
      return fullSample;
    }
  }

  /**
   * Retrieve all pending samples for a specific trip (chronologically ordered)
   */
  public async getPendingSamples(tripId: string): Promise<OfflineGpsSample[]> {
    try {
      const storageKey = `${STORAGE_KEY_PREFIX}${tripId}`;
      const raw = await AsyncStorage.getItem(storageKey);
      if (!raw) return [];
      const queue: OfflineGpsSample[] = JSON.parse(raw);
      return queue
        .filter((s) => s.status === 'PENDING' || s.status === 'FAILED')
        .sort((a, b) => a.sequenceNumber - b.sequenceNumber);
    } catch {
      return [];
    }
  }

  /**
   * Retrieve all samples (both pending and synced) for a trip
   */
  public async getAllSamplesForTrip(tripId: string): Promise<OfflineGpsSample[]> {
    try {
      const storageKey = `${STORAGE_KEY_PREFIX}${tripId}`;
      const raw = await AsyncStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /**
   * Mark batch of samples as SYNCED only after server confirmation
   */
  public async markSamplesSynced(tripId: string, sampleIds: string[]): Promise<void> {
    if (sampleIds.length === 0) return;
    try {
      const storageKey = `${STORAGE_KEY_PREFIX}${tripId}`;
      const raw = await AsyncStorage.getItem(storageKey);
      if (!raw) return;

      const queue: OfflineGpsSample[] = JSON.parse(raw);
      const idSet = new Set(sampleIds);

      for (const sample of queue) {
        if (idSet.has(sample.id)) {
          sample.status = 'SYNCED';
        }
      }

      await AsyncStorage.setItem(storageKey, JSON.stringify(queue));
    } catch (err) {
      console.warn('[OfflineGpsQueue] Error updating synced status:', err);
    }
  }

  /**
   * Synchronize pending samples with backend API
   */
  public async syncQueue(targetTripId?: string): Promise<{ syncedCount: number; pendingCount: number }> {
    if (this.isSyncing) {
      return { syncedCount: 0, pendingCount: 0 };
    }

    if (!networkService.isOnline()) {
      return { syncedCount: 0, pendingCount: 1 };
    }

    this.isSyncing = true;
    let totalSynced = 0;
    let totalPending = 0;

    try {
      const tripIds = targetTripId ? [targetTripId] : await this.getTripIndex();

      for (const tripId of tripIds) {
        const pending = await this.getPendingSamples(tripId);
        if (pending.length === 0) continue;

        totalPending += pending.length;

        // Batch in groups of up to 15 samples
        const batchSize = 15;
        for (let i = 0; i < pending.length; i += batchSize) {
          const batch = pending.slice(i, i + batchSize);
          const success = await this.transmitBatchToServer(tripId, batch);

          if (success) {
            const syncedIds = batch.map((s) => s.id);
            await this.markSamplesSynced(tripId, syncedIds);
            totalSynced += batch.length;
            totalPending -= batch.length;
          } else {
            // Temporary failure: stop this trip sync and retry on next interval
            break;
          }
        }
      }
    } finally {
      this.isSyncing = false;
    }

    return { syncedCount: totalSynced, pendingCount: totalPending };
  }

  /**
   * Transmits batch of GPS samples with authorization and idempotency
   */
  private async transmitBatchToServer(tripId: string, samples: OfflineGpsSample[]): Promise<boolean> {
    if (API_CONFIG.isMockAuth) {
      // In mock development mode, treat as successful transmission
      return true;
    }

    const token = useAuthStore.getState().token;
    const url = `${API_CONFIG.baseUrl}/trips/${tripId}/location`;

    const payload = {
      samples: samples.map((s) => ({
        sampleId: s.id,
        latitude: s.latitude,
        longitude: s.longitude,
        accuracy: s.accuracy,
        speed: s.speed,
        heading: s.heading,
        altitude: s.altitude,
        deviceTimestamp: s.deviceTimestamp,
        sequenceNumber: s.sequenceNumber,
      })),
    };

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        // Token expired: attempt token refresh
        const refreshed = await this.attemptTokenRefresh();
        if (refreshed) {
          // Retry once with refreshed token
          return this.transmitBatchToServer(tripId, samples);
        }
        return false;
      }

      if (!res.ok) {
        return false;
      }

      const data = await res.json().catch(() => null);
      return data?.success === true || res.status === 200;
    } catch (err) {
      console.warn('[OfflineGpsQueue] Network error during batch upload:', err);
      return false;
    }
  }

  private async attemptTokenRefresh(): Promise<boolean> {
    try {
      return await useAuthStore.getState().refreshSession();
    } catch {
      return false;
    }
  }

  private scheduleSync() {
    if (this.syncTimer) clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => {
      this.syncQueue();
    }, 1200);
  }

  private async registerTripInIndex(tripId: string) {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_INDEX_KEY);
      const index: string[] = raw ? JSON.parse(raw) : [];
      if (!index.includes(tripId)) {
        index.push(tripId);
        await AsyncStorage.setItem(QUEUE_INDEX_KEY, JSON.stringify(index));
      }
    } catch {
      // Non-blocking
    }
  }

  public async getTripIndex(): Promise<string[]> {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_INDEX_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /**
   * Purge synced records for a trip once ride is fully completed & paid
   */
  public async purgeCompletedTrip(tripId: string): Promise<void> {
    try {
      const storageKey = `${STORAGE_KEY_PREFIX}${tripId}`;
      await AsyncStorage.removeItem(storageKey);

      const raw = await AsyncStorage.getItem(QUEUE_INDEX_KEY);
      if (raw) {
        const index: string[] = JSON.parse(raw);
        const filtered = index.filter((id) => id !== tripId);
        await AsyncStorage.setItem(QUEUE_INDEX_KEY, JSON.stringify(filtered));
      }
    } catch {
      // Non-blocking
    }
  }

  /**
   * Reset local queue (for testing)
   */
  public async clearAll(): Promise<void> {
    try {
      const tripIds = await this.getTripIndex();
      for (const id of tripIds) {
        await AsyncStorage.removeItem(`${STORAGE_KEY_PREFIX}${id}`);
      }
      await AsyncStorage.removeItem(QUEUE_INDEX_KEY);
      this.nextSequenceNumber = 1;
    } catch {
      // Handled
    }
  }
}

export const offlineGpsQueueService = OfflineGpsQueueService.getInstance();
