import { prisma } from '../database/prisma';
import { logger } from '../logging/logger';
import { ActorType } from '@prisma/client';

export interface AuditLogEntry {
  actorId?: string;
  actorType: ActorType;
  action: string;
  entityType: string;
  entityId: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

const inMemoryAuditLogs: Array<AuditLogEntry & { id: string; createdAt: Date }> = [];

export class AuditService {
  private static instance: AuditService;

  public static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  public async record(entry: AuditLogEntry): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          actorId: entry.actorId,
          actorType: entry.actorType,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          metadata: entry.metadata || {},
        },
      });
      logger.info({ action: entry.action, entityType: entry.entityType, entityId: entry.entityId }, '[AuditService] Action logged');
    } catch (err: any) {
      logger.warn({ err: err.message }, '[AuditService] Database unavailable; buffering audit entry in-memory');
      inMemoryAuditLogs.unshift({
        id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        ...entry,
        createdAt: new Date(),
      });
    }
  }

  public getInMemoryLogs(entityId?: string) {
    if (!entityId) return inMemoryAuditLogs;
    return inMemoryAuditLogs.filter((l) => l.entityId === entityId);
  }
}

export const auditService = AuditService.getInstance();
