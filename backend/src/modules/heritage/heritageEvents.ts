import { EventEmitter } from 'events';
import { Request, Response } from 'express';
import crypto from 'crypto';

export type HeritageEventType =
  | 'heritage.site.created'
  | 'heritage.site.updated'
  | 'heritage.site.published'
  | 'heritage.site.unpublished'
  | 'heritage.booking.created'
  | 'heritage.booking.confirmed'
  | 'heritage.booking.declined'
  | 'heritage.booking.cancelled'
  | 'heritage.booking.updated';

export interface HeritageSyncEvent {
  eventId: string;
  type: HeritageEventType;
  siteId?: string;
  bookingId?: string;
  bookingReference?: string;
  passengerId?: string;
  status?: string;
  timestamp: string;
}

class HeritageEventBus extends EventEmitter {
  emitHeritage(payload: Omit<HeritageSyncEvent, 'eventId' | 'timestamp'>): HeritageSyncEvent {
    const event: HeritageSyncEvent = {
      ...payload,
      eventId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    this.emit('heritage:sync', event);
    return event;
  }
}

export const heritageEventBus = new HeritageEventBus();
heritageEventBus.setMaxListeners(200);

function writeSseEvent(res: Response, eventName: string, data: unknown) {
  try {
    res.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
  } catch {
    // Client disconnected
  }
}

function initSseHeaders(res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();
}

/**
 * Protected Super Admin SSE stream for all heritage site & booking synchronization events.
 */
export function subscribeAdminHeritageEvents(req: Request, res: Response): void {
  initSseHeaders(res);
  writeSseEvent(res, 'connected', { scope: 'ADMIN', timestamp: new Date().toISOString() });

  const onSync = (event: HeritageSyncEvent) => {
    writeSseEvent(res, event.type, event);
    writeSseEvent(res, 'heritage_sync', event);
  };

  heritageEventBus.on('heritage:sync', onSync);

  const heartbeat = setInterval(() => {
    try {
      res.write(`: heartbeat ${Date.now()}\n\n`);
    } catch {
      // Closed
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    heritageEventBus.off('heritage:sync', onSync);
  });
}

/**
 * Passenger / Public SSE stream:
 * - Always delivers non-sensitive site publication updates (heritage.site.*)
 * - Delivers booking status updates ONLY for the authenticated passengerId (never leaks other passengers' bookings)
 */
export function subscribePassengerHeritageEvents(req: Request, res: Response): void {
  const passengerId = (req as any).user?.sub || (req as any).user?.userId || (req as any).user?.id || '';

  initSseHeaders(res);
  writeSseEvent(res, 'connected', {
    scope: passengerId ? 'PASSENGER' : 'PUBLIC',
    timestamp: new Date().toISOString(),
  });

  const onSync = (event: HeritageSyncEvent) => {
    if (event.type.startsWith('heritage.site.')) {
      writeSseEvent(res, event.type, {
        eventId: event.eventId,
        type: event.type,
        siteId: event.siteId,
        timestamp: event.timestamp,
      });
      return;
    }

    if (passengerId && event.passengerId === passengerId) {
      writeSseEvent(res, event.type, {
        eventId: event.eventId,
        type: event.type,
        bookingId: event.bookingId,
        bookingReference: event.bookingReference,
        status: event.status,
        timestamp: event.timestamp,
      });
    }
  };

  heritageEventBus.on('heritage:sync', onSync);

  const heartbeat = setInterval(() => {
    try {
      res.write(`: heartbeat ${Date.now()}\n\n`);
    } catch {
      // Closed
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    heritageEventBus.off('heritage:sync', onSync);
  });
}
