import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { prisma } from '../../core/database/prisma';
import { logger } from '../../core/logging/logger';
import type { TokenPayload } from '../../core/middleware/auth.middleware';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SupportSocketEventName =
  | 'support:connection_status'
  | 'support:ticket_created'
  | 'support:ticket_updated'
  | 'support:message_created'
  | 'support:message_read'
  | 'support:typing'
  | 'support:ticket_assigned'
  | 'support:ticket_status_changed'
  | 'support:ticket_priority_changed'
  | 'support:unread_count_updated';

export interface SupportEmitTargets {
  ticketId?: string;
  passengerId?: string;
  notifyAdmins?: boolean;
}

let ioInstance: SocketIOServer | null = null;

// In-memory throttle map for typing events: `${socket.id}:${ticketId}` -> timestamp
const typingThrottleMap = new Map<string, number>();

function extractToken(socket: Socket): string | null {
  const authToken = socket.handshake.auth?.token;
  if (typeof authToken === 'string' && authToken.trim()) {
    return authToken.replace(/^Bearer\s+/i, '').trim();
  }

  const headerAuth = socket.handshake.headers?.authorization;
  if (typeof headerAuth === 'string' && /^Bearer\s+/i.test(headerAuth)) {
    return headerAuth.replace(/^Bearer\s+/i, '').trim();
  }

  const queryToken = socket.handshake.query?.token;
  if (typeof queryToken === 'string' && queryToken.trim()) {
    return queryToken.replace(/^Bearer\s+/i, '').trim();
  }

  return null;
}

export function verifySupportSocketToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
}

export async function authorizeTicketRoomJoin(
  user: TokenPayload,
  ticketId: string
): Promise<{ allowed: boolean; reason?: string }> {
  if (!UUID_REGEX.test(ticketId)) {
    return { allowed: false, reason: 'INVALID_TICKET_ID' };
  }

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    select: { id: true, passengerId: true },
  });

  if (!ticket) {
    return { allowed: false, reason: 'TICKET_NOT_FOUND' };
  }

  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
    return { allowed: true };
  }

  if (user.role === 'PASSENGER' && ticket.passengerId === user.sub) {
    return { allowed: true };
  }

  return { allowed: false, reason: 'FORBIDDEN_TICKET_ACCESS' };
}

export function initSupportSocket(httpServer: HttpServer): SocketIOServer {
  if (ioInstance) {
    return ioInstance;
  }

  const allowedOrigins =
    env.CORS_ORIGINS === '*'
      ? '*'
      : env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);

  const io = new SocketIOServer(httpServer, {
    path: '/socket.io',
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  io.use((socket, next) => {
    try {
      const token = extractToken(socket);
      if (!token) {
        return next(new Error('UNAUTHORIZED'));
      }
      const decoded = verifySupportSocketToken(token);
      if (!decoded?.sub || !decoded?.role) {
        return next(new Error('INVALID_TOKEN'));
      }
      if (!['PASSENGER', 'ADMIN', 'SUPER_ADMIN'].includes(decoded.role)) {
        return next(new Error('FORBIDDEN'));
      }
      socket.data.user = decoded;
      return next();
    } catch (err: any) {
      return next(new Error(err?.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as TokenPayload;
    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';

    if (isAdmin) {
      socket.join('support:admins');
    } else if (user.role === 'PASSENGER') {
      socket.join(`passenger:${user.sub}`);
    }

    socket.emit('support:connection_status', {
      connected: true,
      userId: user.sub,
      role: user.role,
      timestamp: new Date().toISOString(),
    });

    socket.on('support:join_ticket', async (payload: { ticketId?: string }, ack?: (res: any) => void) => {
      try {
        const ticketId = String(payload?.ticketId || '').trim();
        const auth = await authorizeTicketRoomJoin(user, ticketId);
        if (!auth.allowed) {
          ack?.({ ok: false, error: auth.reason });
          return;
        }
        await socket.join(`support-ticket:${ticketId}`);
        ack?.({ ok: true, ticketId });
      } catch (err: any) {
        logger.warn({ err: err?.message }, '[SupportSocket] Failed to join ticket room');
        ack?.({ ok: false, error: 'JOIN_FAILED' });
      }
    });

    socket.on('support:leave_ticket', async (payload: { ticketId?: string }, ack?: (res: any) => void) => {
      const ticketId = String(payload?.ticketId || '').trim();
      if (UUID_REGEX.test(ticketId)) {
        await socket.leave(`support-ticket:${ticketId}`);
      }
      ack?.({ ok: true });
    });

    socket.on('support:typing', (payload: { ticketId?: string; isTyping?: boolean; senderName?: string }) => {
      const ticketId = String(payload?.ticketId || '').trim();
      if (!UUID_REGEX.test(ticketId)) return;
      const room = `support-ticket:${ticketId}`;
      if (!socket.rooms.has(room)) return;

      const isTyping = Boolean(payload?.isTyping);
      const throttleKey = `${socket.id}:${ticketId}`;
      const now = Date.now();
      const last = typingThrottleMap.get(throttleKey) || 0;
      if (isTyping && now - last < 750) {
        return;
      }
      typingThrottleMap.set(throttleKey, now);

      socket.to(room).emit('support:typing', {
        ticketId,
        isTyping,
        senderType: isAdmin ? 'ADMIN' : 'PASSENGER',
        senderId: user.sub,
        senderName: payload?.senderName || (isAdmin ? 'Support Team' : 'Passenger'),
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('disconnect', () => {
      for (const key of typingThrottleMap.keys()) {
        if (key.startsWith(`${socket.id}:`)) {
          typingThrottleMap.delete(key);
        }
      }
    });
  });

  ioInstance = io;
  logger.info('[SupportSocket] Socket.IO support server initialized');
  return io;
}

export function emitSupportEvent(
  eventName: SupportSocketEventName,
  payload: Record<string, unknown>,
  targets: SupportEmitTargets
): void {
  if (!ioInstance) return;

  const rooms: string[] = [];
  if (targets.ticketId) rooms.push(`support-ticket:${targets.ticketId}`);
  if (targets.passengerId) rooms.push(`passenger:${targets.passengerId}`);
  if (targets.notifyAdmins) rooms.push('support:admins');

  if (rooms.length === 0) return;
  ioInstance.to(rooms).emit(eventName, payload);
}

export async function closeSupportSocket(): Promise<void> {
  if (!ioInstance) return;
  const current = ioInstance;
  ioInstance = null;
  typingThrottleMap.clear();
  await new Promise<void>((resolve) => {
    current.close(() => resolve());
  });
}
