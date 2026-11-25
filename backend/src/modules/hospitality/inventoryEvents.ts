import { EventEmitter } from 'events';
import { Request, Response } from 'express';
import crypto from 'crypto';

export type InventoryEventType =
  | 'INVENTORY_RESERVED'
  | 'INVENTORY_CONFIRMED'
  | 'INVENTORY_RELEASED'
  | 'INVENTORY_CANCELLED'
  | 'INVENTORY_EXPIRED'
  | 'INVENTORY_ADJUSTED'
  | 'INVENTORY_BLOCKED'
  | 'INVENTORY_UNBLOCKED'
  | 'ROOM_TYPE_STATUS_CHANGED';

export interface InventorySyncEvent {
  eventId: string;
  type: InventoryEventType;
  hotelId: string;
  roomTypeId: string;
  bookingId?: string;
  dates: string[];
  timestamp: string;
}

class InventoryEventBus extends EventEmitter {
  emitSync(payload: Omit<InventorySyncEvent, 'eventId' | 'timestamp'>): InventorySyncEvent {
    const event: InventorySyncEvent = {
      ...payload,
      eventId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    this.emit('inventory:sync', event);
    return event;
  }
}

export const inventoryEventBus = new InventoryEventBus();
inventoryEventBus.setMaxListeners(100);

/**
 * SSE Endpoint handler for Super Admin real-time inventory synchronization.
 * Clients connect via EventSource('/api/v1/admin/hotels/inventory/events?token=...')
 */
export function subscribeAdminInventoryEvents(req: Request, res: Response): void {
  const filterHotelId = typeof req.query.hotelId === 'string' ? req.query.hotelId.trim() : '';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const sendEvent = (eventName: string, data: unknown) => {
    try {
      res.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch {
      // Connection closed
    }
  };

  sendEvent('connected', {
    status: 'connected',
    hotelId: filterHotelId || 'ALL',
    timestamp: new Date().toISOString(),
  });

  const onSync = (event: InventorySyncEvent) => {
    if (filterHotelId && event.hotelId !== filterHotelId) {
      return;
    }
    sendEvent('inventory_sync', event);
  };

  inventoryEventBus.on('inventory:sync', onSync);

  const heartbeat = setInterval(() => {
    try {
      res.write(`: heartbeat ${Date.now()}\n\n`);
    } catch {
      // Connection closed
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    inventoryEventBus.off('inventory:sync', onSync);
  });
}
