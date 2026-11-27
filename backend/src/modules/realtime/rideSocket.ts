import { Server as SocketIOServer, Socket } from 'socket.io';
import { BookingStatus } from '@prisma/client';
import { prisma } from '../../core/database/prisma';
import { logger } from '../../core/logging/logger';
import type { TokenPayload } from '../../core/middleware/auth.middleware';

let sharedIo: SocketIOServer | null = null;

// Track active socket IDs per driver to handle multi-connection / reconnect safely
const driverSockets = new Map<string, Set<string>>();
// Throttle DB heartbeat writes to at most once every 20s per driver
const lastDbHeartbeatWrite = new Map<string, number>();
const HEARTBEAT_WRITE_INTERVAL_MS = 20_000;

export const ACTIVE_RIDE_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.REQUESTED,
  BookingStatus.DRIVER_ASSIGNED,
  BookingStatus.DRIVER_ARRIVING,
  BookingStatus.DRIVER_ARRIVED,
  BookingStatus.TRIP_STARTED,
];

export function setRideSocketServer(io: SocketIOServer): void {
  sharedIo = io;
}

export function getRideSocketServer(): SocketIOServer | null {
  return sharedIo;
}

export function isDriverSocketActive(driverId: string): boolean {
  const set = driverSockets.get(driverId);
  return Boolean(set && set.size > 0);
}

export function emitToDriver(driverId: string, event: string, payload: unknown): void {
  if (!sharedIo || !driverId) return;
  sharedIo.to(`driver:${driverId}`).emit(event, payload);
}

export function emitToPassenger(passengerId: string, event: string, payload: unknown): void {
  if (!sharedIo || !passengerId) return;
  sharedIo.to(`passenger:${passengerId}`).emit(event, payload);
}

export function emitAvailabilityChanged(payload: {
  driverId: string;
  availabilityStatus: string;
  subcityIds?: string[];
}): void {
  if (!sharedIo) return;
  sharedIo.emit('driver:availability:changed', payload);
  sharedIo.emit('drivers:availability:changed', payload);
}

export async function registerRideSocketConnection(socket: Socket, user: TokenPayload): Promise<void> {
  if (user.role === 'PASSENGER' && user.sub) {
    socket.join(`passenger:${user.sub}`);
    return;
  }

  if (user.role !== 'DRIVER' || !user.sub) {
    return;
  }

  const driverId = user.sub;
  socket.join(`driver:${driverId}`);

  let set = driverSockets.get(driverId);
  if (!set) {
    set = new Set<string>();
    driverSockets.set(driverId, set);
  }
  set.add(socket.id);

  const now = new Date();
  lastDbHeartbeatWrite.set(driverId, now.getTime());

  try {
    await prisma.driver.update({
      where: { id: driverId },
      data: {
        isSocketConnected: true,
        lastHeartbeatAt: now,
      },
    });
  } catch (err: any) {
    logger.warn({ driverId, err: err?.message }, '[RideSocket] Failed to mark driver socket connected');
  }

  // Send immediate reconnect sync payload with current availability and active/pending request
  try {
    const driver = await prisma.driver.findFirst({
      where: { id: driverId, deletedAt: null },
      select: {
        id: true,
        availabilityStatus: true,
        accountStatus: true,
        verificationStatus: true,
      },
    });
    const activeBooking = await prisma.booking.findFirst({
      where: {
        driverId,
        bookingStatus: { in: [BookingStatus.REQUESTED, BookingStatus.DRIVER_ASSIGNED] },
      },
      include: {
        passenger: { select: { id: true, fullName: true, profileImage: true } },
        subcity: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    socket.emit('driver:session:reconnected', {
      driverId,
      availabilityStatus: driver?.availabilityStatus || 'OFFLINE',
      isSocketConnected: true,
      activeRequest: activeBooking || null,
      syncedAt: now.toISOString(),
    });
  } catch (err: any) {
    logger.warn({ driverId, err: err?.message }, '[RideSocket] Failed to emit reconnect sync');
  }

  socket.on('driver:heartbeat', async () => {
    const ts = Date.now();
    const prev = lastDbHeartbeatWrite.get(driverId) || 0;
    if (ts - prev < HEARTBEAT_WRITE_INTERVAL_MS) {
      return;
    }
    lastDbHeartbeatWrite.set(driverId, ts);
    try {
      await prisma.driver.update({
        where: { id: driverId },
        data: {
          isSocketConnected: true,
          lastHeartbeatAt: new Date(ts),
        },
      });
    } catch {
      // Non-fatal
    }
  });

  socket.on('disconnect', async () => {
    const activeSet = driverSockets.get(driverId);
    if (activeSet) {
      activeSet.delete(socket.id);
      if (activeSet.size > 0) {
        return; // Another socket for this driver is still connected
      }
      driverSockets.delete(driverId);
    }

    try {
      await prisma.driver.update({
        where: { id: driverId },
        data: {
          isSocketConnected: false,
        },
      });
    } catch {
      // Non-fatal
    }
  });
}
