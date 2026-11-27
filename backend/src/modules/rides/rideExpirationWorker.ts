import { rideRequestService } from './rideRequest.service';
import { logger } from '../../core/logging/logger';

class RideExpirationWorker {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  start(intervalMs = 10_000): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.tick();
    }, intervalMs);
    this.timer.unref?.();
    logger.info({ intervalMs }, '[RideExpirationWorker] Started');
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async tick(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    try {
      await rideRequestService.expirePendingRideRequests();
      await rideRequestService.reconcileStaleDrivers();
    } catch (err: any) {
      logger.warn({ err: err?.message }, '[RideExpirationWorker] Tick failed');
    } finally {
      this.isRunning = false;
    }
  }
}

export const rideExpirationWorker = new RideExpirationWorker();
