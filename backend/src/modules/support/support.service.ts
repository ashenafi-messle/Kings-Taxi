import { prisma } from '../../core/database/prisma';
import { AppError } from '../../core/errors/appError';
import { logger } from '../../core/logging/logger';
import { CloudinaryService, CloudinaryUploadResult } from '../../integrations/cloudinary/cloudinary.service';
import { NotificationService } from '../notifications/notification.service';
import { emitSupportEvent } from './supportSocket';
import {
  CreateSupportTicketInput,
  AddSupportMessageInput,
  UpdateTicketStatusInput,
  AssignTicketInput,
  UpdateTicketPriorityInput,
  ReopenTicketInput,
  PassengerTicketQuery,
  AdminTicketQuery,
  TicketMessagesQuery,
  SupportAttachmentInput,
  SupportAttachmentDTO,
  SupportTicketAuditLogDTO,
  SupportOverviewStats,
  SupportTicketSummaryDTO,
  SupportTicketDetailDTO,
  SupportMessageDTO,
  SupportSenderType,
} from './support.types';

function parseUuidOrNull(val: string | null | undefined): string | null {
  if (!val) return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(val) ? val : null;
}

function mapAttachment(a: any): SupportAttachmentDTO {
  return {
    id: a.id,
    ticketId: a.ticketId,
    messageId: a.messageId ?? null,
    uploadedByType: a.uploadedByType,
    uploadedById: a.uploadedById ?? null,
    fileUrl: a.fileUrl,
    cloudinaryPublicId: a.cloudinaryPublicId,
    mimeType: a.mimeType,
    fileSizeBytes: a.fileSizeBytes,
    originalFilename: a.originalFilename ?? null,
    createdAt: a.createdAt,
  };
}

function mapMessage(m: any): SupportMessageDTO {
  return {
    id: m.id,
    ticketId: m.ticketId,
    senderType: m.senderType,
    passengerId: m.passengerId ?? null,
    adminId: m.adminId ?? null,
    senderName: m.senderName,
    message: m.message,
    readAt: m.readAt ?? null,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
    attachments: Array.isArray(m.attachments) ? m.attachments.map(mapAttachment) : undefined,
  };
}

function mapAuditLog(l: any): SupportTicketAuditLogDTO {
  return {
    id: l.id,
    ticketId: l.ticketId,
    actorType: l.actorType,
    actorId: l.actorId ?? null,
    actorName: l.actorName,
    action: l.action,
    previousValue: (l.previousValue as Record<string, unknown> | null) ?? null,
    newValue: (l.newValue as Record<string, unknown> | null) ?? null,
    note: l.note ?? null,
    createdAt: l.createdAt,
  };
}

interface UploadedSupportAsset {
  upload: CloudinaryUploadResult;
  mimeType: string;
  originalFilename: string | null;
}

export class SupportService {
  /**
   * Generate a sequential, collision-resistant ticket number backed by PostgreSQL sequence.
   * Format: KT-SUP-YYYY-NNNNNN
   */
  private async generateTicketNumber(): Promise<string> {
    const year = new Date().getUTCFullYear();
    try {
      const rows = await prisma.$queryRaw<Array<{ seq: bigint | number }>>`
        SELECT nextval('support_ticket_number_seq') AS seq
      `;
      const seqNum = Number(rows?.[0]?.seq ?? 0);
      if (seqNum > 0) {
        return `KT-SUP-${year}-${String(seqNum).padStart(6, '0')}`;
      }
    } catch {
      // Fallback when sequence is unavailable in mocked unit test environments
    }

    const fallbackSeq = String((Date.now() % 900000) + 100000);
    return `KT-SUP-${year}-${fallbackSeq}`;
  }

  /**
   * Upload support image attachments to Cloudinary outside the DB transaction.
   * Cleans up already uploaded assets if any subsequent upload fails.
   */
  private async uploadSupportAttachments(
    attachments: SupportAttachmentInput[] | undefined,
    folderKey: string
  ): Promise<UploadedSupportAsset[]> {
    if (!attachments || attachments.length === 0) return [];

    const uploaded: UploadedSupportAsset[] = [];
    try {
      for (const att of attachments) {
        const result = await CloudinaryService.uploadAsset(att.fileData, {
          folder: `kings-taxi/support/${folderKey}`,
          resourceType: 'image',
        });
        uploaded.push({
          upload: result,
          mimeType: att.mimeType || `image/${result.format || 'jpeg'}`,
          originalFilename: att.originalFilename || null,
        });
      }
      return uploaded;
    } catch (err) {
      await this.cleanupUploadedAssets(uploaded);
      throw err;
    }
  }

  private async cleanupUploadedAssets(assets: UploadedSupportAsset[]): Promise<void> {
    if (!assets.length) return;
    await Promise.all(
      assets.map((item) =>
        CloudinaryService.deleteAsset(item.upload.publicId, 'image').catch((cleanupErr) => {
          logger.warn(
            { err: cleanupErr?.message, publicId: item.upload.publicId },
            '[SupportService] Failed to cleanup orphaned Cloudinary attachment'
          );
        })
      )
    );
  }

  private async dispatchPassengerNotification(
    passengerId: string,
    title: string,
    message: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    try {
      await NotificationService.getInstance().dispatch({
        recipientId: passengerId,
        recipientType: 'PASSENGER',
        title,
        message,
        notificationType: 'SYSTEM_NOTICE',
        metadata,
      });
    } catch (err: any) {
      logger.warn({ err: err?.message, passengerId }, '[SupportService] Support notification dispatch failed');
    }
  }

  // ============================================================================
  // PASSENGER ACTIONS
  // ============================================================================

  /**
   * Create a support ticket, first message, optional Cloudinary attachments, and initial audit log.
   */
  async createPassengerTicket(
    passengerId: string,
    input: CreateSupportTicketInput
  ): Promise<SupportTicketDetailDTO> {
    const passenger = await prisma.passenger.findUnique({
      where: { id: passengerId },
      select: { id: true, fullName: true, phoneNumber: true, email: true },
    });

    if (!passenger) {
      throw new AppError('Passenger account not found', 404, 'PASSENGER_NOT_FOUND');
    }

    const uploadedAssets = await this.uploadSupportAttachments(input.attachments, passengerId);
    const ticketNumber = await this.generateTicketNumber();
    const now = new Date();
    const passengerName = passenger.fullName || 'Passenger';

    let createdTicket: any;
    try {
      createdTicket = await prisma.$transaction(async (tx) => {
        const ticket = await tx.supportTicket.create({
          data: {
            ticketNumber,
            passengerId,
            category: input.category,
            subject: input.subject,
            status: 'OPEN',
            priority: input.priority || 'MEDIUM',
            bookingId: input.bookingId || null,
            bookingType: input.bookingType || null,
            lastMessageAt: now,
          },
        });

        const firstMessage = await tx.supportMessage.create({
          data: {
            ticketId: ticket.id,
            senderType: 'PASSENGER',
            passengerId,
            senderName: passengerName,
            message: input.message,
            createdAt: now,
            updatedAt: now,
          },
        });

        if (uploadedAssets.length > 0 && tx.supportAttachment) {
          await tx.supportAttachment.createMany({
            data: uploadedAssets.map((asset) => ({
              ticketId: ticket.id,
              messageId: firstMessage.id,
              uploadedByType: 'PASSENGER',
              uploadedById: passengerId,
              fileUrl: asset.upload.secureUrl,
              cloudinaryPublicId: asset.upload.publicId,
              mimeType: asset.mimeType,
              fileSizeBytes: asset.upload.bytes,
              originalFilename: asset.originalFilename,
            })),
          });
        }

        if (tx.supportTicketAuditLog) {
          await tx.supportTicketAuditLog.create({
            data: {
              ticketId: ticket.id,
              actorType: 'PASSENGER',
              actorId: passengerId,
              actorName: passengerName,
              action: 'TICKET_CREATED',
              newValue: {
                status: 'OPEN',
                priority: input.priority || 'MEDIUM',
                category: input.category,
              },
            },
          });
        }

        const fullTicket = await tx.supportTicket.findUnique({
          where: { id: ticket.id },
          include: {
            passenger: {
              select: { id: true, fullName: true, phoneNumber: true, email: true },
            },
            messages: {
              orderBy: { createdAt: 'asc' },
              include: { attachments: true },
            },
            attachments: {
              orderBy: { createdAt: 'asc' },
            },
            auditLogs: {
              orderBy: { createdAt: 'asc' },
            },
          },
        });

        return fullTicket || { ...ticket, passenger, messages: [firstMessage], attachments: [], auditLogs: [] };
      });
    } catch (err) {
      await this.cleanupUploadedAssets(uploadedAssets);
      throw err;
    }

    const dto: SupportTicketDetailDTO = {
      id: createdTicket.id,
      ticketNumber: createdTicket.ticketNumber,
      passengerId: createdTicket.passengerId,
      category: createdTicket.category,
      subject: createdTicket.subject,
      status: createdTicket.status,
      priority: createdTicket.priority,
      assignedAdminId: createdTicket.assignedAdminId ?? null,
      assignedAdminName: createdTicket.assignedAdminName ?? null,
      bookingId: createdTicket.bookingId ?? null,
      bookingType: createdTicket.bookingType ?? null,
      lastMessageAt: createdTicket.lastMessageAt,
      resolvedAt: createdTicket.resolvedAt ?? null,
      closedAt: createdTicket.closedAt ?? null,
      resolutionNotes: createdTicket.resolutionNotes ?? null,
      unreadCount: 0,
      latestMessage: input.message,
      attachmentCount: createdTicket.attachments?.length || 0,
      createdAt: createdTicket.createdAt,
      updatedAt: createdTicket.updatedAt,
      passenger: createdTicket.passenger,
      messages: (createdTicket.messages || []).map(mapMessage),
      attachments: (createdTicket.attachments || []).map(mapAttachment),
      auditLogs: (createdTicket.auditLogs || []).map(mapAuditLog),
    };

    logger.info(
      { ticketId: dto.id, ticketNumber: dto.ticketNumber, passengerId },
      '[SupportService] Created new support ticket'
    );

    emitSupportEvent(
      'support:ticket_created',
      { ticket: dto },
      { passengerId, notifyAdmins: true }
    );
    emitSupportEvent(
      'support:unread_count_updated',
      { ticketId: dto.id, actor: 'PASSENGER' },
      { notifyAdmins: true }
    );

    return dto;
  }

  /**
   * List tickets filed by the authenticated passenger with status filtering and unread count.
   */
  async listPassengerTickets(
    passengerId: string,
    query: PassengerTicketQuery
  ): Promise<{ items: SupportTicketSummaryDTO[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      passengerId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.category ? { category: query.category } : {}),
    };

    const [total, tickets] = await Promise.all([
      prisma.supportTicket.count({ where }),
      prisma.supportTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastMessageAt: 'desc' },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: {
            select: {
              attachments: true,
              messages: {
                where: {
                  senderType: 'ADMIN',
                  readAt: null,
                },
              },
            },
          },
        },
      }),
    ]);

    const items: SupportTicketSummaryDTO[] = tickets.map((t: any) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      passengerId: t.passengerId,
      category: t.category,
      subject: t.subject,
      status: t.status,
      priority: t.priority,
      assignedAdminId: t.assignedAdminId ?? null,
      assignedAdminName: t.assignedAdminName ?? null,
      bookingId: t.bookingId ?? null,
      bookingType: t.bookingType ?? null,
      lastMessageAt: t.lastMessageAt,
      resolvedAt: t.resolvedAt ?? null,
      closedAt: t.closedAt ?? null,
      unreadCount: t._count?.messages ?? 0,
      attachmentCount: t._count?.attachments ?? 0,
      latestMessage: t.messages[0]?.message || '',
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Get a single ticket and chronological messages.
   * Enforces IDOR security: only the ticket owner can view it.
   */
  async getPassengerTicket(passengerId: string, ticketId: string): Promise<SupportTicketDetailDTO> {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        passenger: {
          select: { id: true, fullName: true, phoneNumber: true, email: true },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { attachments: true },
        },
        attachments: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      throw new AppError('Support ticket not found', 404, 'TICKET_NOT_FOUND');
    }

    if (ticket.passengerId !== passengerId) {
      throw new AppError('Access forbidden: you do not own this ticket', 403, 'FORBIDDEN_TICKET_ACCESS');
    }

    const unreadAdminMsgIds = ticket.messages
      .filter((m) => m.senderType === 'ADMIN' && m.readAt === null)
      .map((m) => m.id);

    const readNow = new Date();
    if (unreadAdminMsgIds.length > 0) {
      await prisma.supportMessage.updateMany({
        where: { id: { in: unreadAdminMsgIds } },
        data: { readAt: readNow },
      });

      emitSupportEvent(
        'support:message_read',
        { ticketId, readerType: 'PASSENGER', readAt: readNow.toISOString(), count: unreadAdminMsgIds.length },
        { ticketId, passengerId, notifyAdmins: true }
      );
    }

    return {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      passengerId: ticket.passengerId,
      category: ticket.category,
      subject: ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
      assignedAdminId: ticket.assignedAdminId ?? null,
      assignedAdminName: ticket.assignedAdminName ?? null,
      bookingId: ticket.bookingId ?? null,
      bookingType: ticket.bookingType ?? null,
      lastMessageAt: ticket.lastMessageAt,
      resolvedAt: ticket.resolvedAt ?? null,
      closedAt: ticket.closedAt ?? null,
      resolutionNotes: ticket.resolutionNotes ?? null,
      unreadCount: 0,
      attachmentCount: (ticket as any).attachments?.length ?? 0,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      passenger: ticket.passenger,
      attachments: ((ticket as any).attachments || []).map(mapAttachment),
      messages: ticket.messages.map((m: any) => ({
        ...mapMessage(m),
        readAt: m.senderType === 'ADMIN' && m.readAt === null ? readNow : m.readAt,
      })),
    };
  }

  /**
   * Paginated messages for a ticket (Passenger view, IDOR-protected).
   */
  async getPassengerTicketMessages(
    passengerId: string,
    ticketId: string,
    query: TicketMessagesQuery
  ): Promise<{ items: SupportMessageDTO[]; total: number; page: number; limit: number; totalPages: number }> {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { id: true, passengerId: true },
    });

    if (!ticket) {
      throw new AppError('Support ticket not found', 404, 'TICKET_NOT_FOUND');
    }

    if (ticket.passengerId !== passengerId) {
      throw new AppError('Access forbidden: you do not own this ticket', 403, 'FORBIDDEN_TICKET_ACCESS');
    }

    return this.paginateTicketMessages(ticketId, query);
  }

  /**
   * Add a reply message (with optional Cloudinary attachments) from the passenger.
   */
  async addPassengerMessage(
    passengerId: string,
    ticketId: string,
    input: AddSupportMessageInput
  ): Promise<SupportMessageDTO> {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        passenger: {
          select: { id: true, fullName: true },
        },
      },
    });

    if (!ticket) {
      throw new AppError('Support ticket not found', 404, 'TICKET_NOT_FOUND');
    }

    if (ticket.passengerId !== passengerId) {
      throw new AppError('Access forbidden: you do not own this ticket', 403, 'FORBIDDEN_TICKET_ACCESS');
    }

    if (ticket.status === 'CLOSED') {
      throw new AppError(
        'This ticket is closed. Please submit a new support request if you require further assistance.',
        400,
        'TICKET_CLOSED'
      );
    }

    const uploadedAssets = await this.uploadSupportAttachments(input.attachments, ticketId);
    const now = new Date();
    const senderName = ticket.passenger?.fullName || 'Passenger';
    const nextStatus =
      ticket.status === 'WAITING_FOR_PASSENGER' || ticket.status === 'RESOLVED'
        ? 'IN_PROGRESS'
        : ticket.status;

    let createdMessage: any;
    try {
      createdMessage = await prisma.$transaction(async (tx) => {
        const msg = await tx.supportMessage.create({
          data: {
            ticketId,
            senderType: 'PASSENGER',
            passengerId,
            senderName,
            message: input.message,
            createdAt: now,
            updatedAt: now,
          },
        });

        if (uploadedAssets.length > 0 && tx.supportAttachment) {
          await tx.supportAttachment.createMany({
            data: uploadedAssets.map((asset) => ({
              ticketId,
              messageId: msg.id,
              uploadedByType: 'PASSENGER',
              uploadedById: passengerId,
              fileUrl: asset.upload.secureUrl,
              cloudinaryPublicId: asset.upload.publicId,
              mimeType: asset.mimeType,
              fileSizeBytes: asset.upload.bytes,
              originalFilename: asset.originalFilename,
            })),
          });
        }

        await tx.supportTicket.update({
          where: { id: ticketId },
          data: {
            lastMessageAt: now,
            status: nextStatus,
            ...(ticket.status === 'RESOLVED' ? { resolvedAt: null } : {}),
          },
        });

        const fullMessage = await tx.supportMessage.findUnique({
          where: { id: msg.id },
          include: { attachments: true },
        });
        return fullMessage || msg;
      });
    } catch (err) {
      await this.cleanupUploadedAssets(uploadedAssets);
      throw err;
    }

    const dto = mapMessage(createdMessage);

    logger.info(
      { ticketId, messageId: dto.id, passengerId },
      '[SupportService] Passenger added message to ticket'
    );

    emitSupportEvent(
      'support:message_created',
      { ticketId, message: dto, nextStatus },
      { ticketId, passengerId, notifyAdmins: true }
    );
    if (nextStatus !== ticket.status) {
      emitSupportEvent(
        'support:ticket_status_changed',
        { ticketId, previousStatus: ticket.status, status: nextStatus },
        { ticketId, passengerId, notifyAdmins: true }
      );
    }
    emitSupportEvent(
      'support:unread_count_updated',
      { ticketId, actor: 'PASSENGER' },
      { notifyAdmins: true }
    );

    return dto;
  }

  /**
   * Reopen an eligible RESOLVED ticket as the ticket owner.
   */
  async reopenPassengerTicket(
    passengerId: string,
    ticketId: string,
    input: ReopenTicketInput
  ): Promise<SupportTicketDetailDTO> {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: { passenger: { select: { id: true, fullName: true } } },
    });

    if (!ticket) {
      throw new AppError('Support ticket not found', 404, 'TICKET_NOT_FOUND');
    }

    if (ticket.passengerId !== passengerId) {
      throw new AppError('Access forbidden: you do not own this ticket', 403, 'FORBIDDEN_TICKET_ACCESS');
    }

    if (ticket.status === 'CLOSED') {
      throw new AppError(
        'Closed tickets cannot be reopened. Please create a new support ticket.',
        400,
        'TICKET_CLOSED'
      );
    }

    if (ticket.status !== 'RESOLVED') {
      throw new AppError('Only resolved tickets can be reopened', 400, 'INVALID_STATUS_TRANSITION');
    }

    const now = new Date();
    const passengerName = ticket.passenger?.fullName || 'Passenger';

    await prisma.$transaction(async (tx) => {
      await tx.supportTicket.update({
        where: { id: ticketId },
        data: {
          status: 'OPEN',
          resolvedAt: null,
          lastMessageAt: now,
        },
      });

      if (input.reason) {
        await tx.supportMessage.create({
          data: {
            ticketId,
            senderType: 'PASSENGER',
            passengerId,
            senderName: passengerName,
            message: `Ticket reopened: ${input.reason}`,
            createdAt: now,
            updatedAt: now,
          },
        });
      }

      if (tx.supportTicketAuditLog) {
        await tx.supportTicketAuditLog.create({
          data: {
            ticketId,
            actorType: 'PASSENGER',
            actorId: passengerId,
            actorName: passengerName,
            action: 'TICKET_REOPENED',
            previousValue: { status: ticket.status },
            newValue: { status: 'OPEN' },
            note: input.reason || null,
          },
        });
      }
    });

    const updated = await this.getPassengerTicket(passengerId, ticketId);

    emitSupportEvent(
      'support:ticket_status_changed',
      { ticketId, previousStatus: ticket.status, status: 'OPEN' },
      { ticketId, passengerId, notifyAdmins: true }
    );
    emitSupportEvent(
      'support:ticket_updated',
      { ticket: updated },
      { ticketId, passengerId, notifyAdmins: true }
    );

    return updated;
  }

  /**
   * Upload a standalone attachment to a ticket (Passenger or Admin).
   */
  async uploadTicketAttachment(
    actorType: 'PASSENGER' | 'ADMIN',
    actorId: string,
    ticketId: string,
    input: SupportAttachmentInput & { messageId?: string }
  ): Promise<SupportAttachmentDTO> {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { id: true, passengerId: true, status: true },
    });

    if (!ticket) {
      throw new AppError('Support ticket not found', 404, 'TICKET_NOT_FOUND');
    }

    if (actorType === 'PASSENGER' && ticket.passengerId !== actorId) {
      throw new AppError('Access forbidden: you do not own this ticket', 403, 'FORBIDDEN_TICKET_ACCESS');
    }

    if (actorType === 'PASSENGER' && ticket.status === 'CLOSED') {
      throw new AppError('Cannot attach files to a closed ticket', 400, 'TICKET_CLOSED');
    }

    const uploaded = await this.uploadSupportAttachments([input], ticketId);
    const asset = uploaded[0];

    let record: any;
    try {
      record = await prisma.supportAttachment.create({
        data: {
          ticketId,
          messageId: input.messageId || null,
          uploadedByType: actorType,
          uploadedById: parseUuidOrNull(actorId),
          fileUrl: asset.upload.secureUrl,
          cloudinaryPublicId: asset.upload.publicId,
          mimeType: asset.mimeType,
          fileSizeBytes: asset.upload.bytes,
          originalFilename: asset.originalFilename,
        },
      });
    } catch (err) {
      await this.cleanupUploadedAssets(uploaded);
      throw err;
    }

    const dto = mapAttachment(record);
    emitSupportEvent(
      'support:ticket_updated',
      { ticketId, attachment: dto },
      { ticketId, passengerId: ticket.passengerId, notifyAdmins: true }
    );

    return dto;
  }

  /**
   * Mark messages in a ticket as read for either PASSENGER or ADMIN.
   */
  async markTicketRead(
    actorType: 'PASSENGER' | 'ADMIN',
    actorId: string,
    ticketId: string
  ): Promise<{ updatedCount: number; readAt: string }> {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { id: true, passengerId: true },
    });

    if (!ticket) {
      throw new AppError('Support ticket not found', 404, 'TICKET_NOT_FOUND');
    }

    if (actorType === 'PASSENGER' && ticket.passengerId !== actorId) {
      throw new AppError('Access forbidden: you do not own this ticket', 403, 'FORBIDDEN_TICKET_ACCESS');
    }

    const targetSenderType: SupportSenderType = actorType === 'PASSENGER' ? 'ADMIN' : 'PASSENGER';
    const readNow = new Date();

    const result = await prisma.supportMessage.updateMany({
      where: {
        ticketId,
        senderType: targetSenderType,
        readAt: null,
      },
      data: { readAt: readNow },
    });

    if (result.count > 0) {
      emitSupportEvent(
        'support:message_read',
        { ticketId, readerType: actorType, readAt: readNow.toISOString(), count: result.count },
        { ticketId, passengerId: ticket.passengerId, notifyAdmins: true }
      );
      emitSupportEvent(
        'support:unread_count_updated',
        { ticketId, readerType: actorType },
        { passengerId: ticket.passengerId, notifyAdmins: true }
      );
    }

    return { updatedCount: result.count, readAt: readNow.toISOString() };
  }

  // ============================================================================
  // SUPER ADMIN ACTIONS
  // ============================================================================

  /**
   * Get high-level support operations overview statistics.
   */
  async getAdminOverview(): Promise<SupportOverviewStats> {
    const [
      total,
      open,
      inProgress,
      waitingForPassenger,
      resolved,
      closed,
      unassigned,
      urgent,
      unreadPassengerMessages,
    ] = await Promise.all([
      prisma.supportTicket.count(),
      prisma.supportTicket.count({ where: { status: 'OPEN' } }),
      prisma.supportTicket.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.supportTicket.count({ where: { status: 'WAITING_FOR_PASSENGER' } }),
      prisma.supportTicket.count({ where: { status: 'RESOLVED' } }),
      prisma.supportTicket.count({ where: { status: 'CLOSED' } }),
      prisma.supportTicket.count({
        where: {
          assignedAdminId: null,
          status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_PASSENGER'] },
        },
      }),
      prisma.supportTicket.count({
        where: {
          priority: 'URGENT',
          status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_PASSENGER'] },
        },
      }),
      prisma.supportMessage.count({
        where: {
          senderType: 'PASSENGER',
          readAt: null,
        },
      }),
    ]);

    return {
      total,
      open,
      inProgress,
      waitingForPassenger,
      resolved,
      closed,
      unassigned,
      urgent,
      unreadPassengerMessages,
    };
  }

  /**
   * List tickets for Super Admin inbox with search, filter and pagination.
   */
  async listAdminTickets(
    query: AdminTicketQuery
  ): Promise<{ items: SupportTicketSummaryDTO[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = query.page || 1;
    const limit = query.limit || 25;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.status) where.status = query.status;
    if (query.category) where.category = query.category;
    if (query.priority) where.priority = query.priority;
    if (query.assignedAdminId) where.assignedAdminId = query.assignedAdminId;
    if (query.unassignedOnly) where.assignedAdminId = null;
    if (query.unreadOnly) {
      where.messages = {
        some: {
          senderType: 'PASSENGER',
          readAt: null,
        },
      };
    }

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { ticketNumber: { contains: s, mode: 'insensitive' } },
        { subject: { contains: s, mode: 'insensitive' } },
        {
          passenger: {
            OR: [
              { fullName: { contains: s, mode: 'insensitive' } },
              { phoneNumber: { contains: s, mode: 'insensitive' } },
              { email: { contains: s, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const [total, tickets] = await Promise.all([
      prisma.supportTicket.count({ where }),
      prisma.supportTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastMessageAt: 'desc' },
        include: {
          passenger: {
            select: { id: true, fullName: true, phoneNumber: true, email: true },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: {
            select: {
              attachments: true,
              messages: {
                where: {
                  senderType: 'PASSENGER',
                  readAt: null,
                },
              },
            },
          },
        },
      }),
    ]);

    const items: SupportTicketSummaryDTO[] = tickets.map((t: any) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      passengerId: t.passengerId,
      category: t.category,
      subject: t.subject,
      status: t.status,
      priority: t.priority,
      assignedAdminId: t.assignedAdminId ?? null,
      assignedAdminName: t.assignedAdminName ?? null,
      bookingId: t.bookingId ?? null,
      bookingType: t.bookingType ?? null,
      lastMessageAt: t.lastMessageAt,
      resolvedAt: t.resolvedAt ?? null,
      closedAt: t.closedAt ?? null,
      unreadCount: t._count?.messages ?? 0,
      attachmentCount: t._count?.attachments ?? 0,
      latestMessage: t.messages[0]?.message || '',
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      passenger: t.passenger,
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Get single ticket detail for Admin view and mark unread passenger messages as read.
   */
  async getAdminTicket(ticketId: string): Promise<SupportTicketDetailDTO> {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        passenger: {
          select: { id: true, fullName: true, phoneNumber: true, email: true },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { attachments: true },
        },
        attachments: {
          orderBy: { createdAt: 'asc' },
        },
        auditLogs: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      throw new AppError('Support ticket not found', 404, 'TICKET_NOT_FOUND');
    }

    const unreadPassengerMsgIds = ticket.messages
      .filter((m) => m.senderType === 'PASSENGER' && m.readAt === null)
      .map((m) => m.id);

    const readNow = new Date();
    if (unreadPassengerMsgIds.length > 0) {
      await prisma.supportMessage.updateMany({
        where: { id: { in: unreadPassengerMsgIds } },
        data: { readAt: readNow },
      });

      emitSupportEvent(
        'support:message_read',
        { ticketId, readerType: 'ADMIN', readAt: readNow.toISOString(), count: unreadPassengerMsgIds.length },
        { ticketId, passengerId: ticket.passengerId, notifyAdmins: true }
      );
      emitSupportEvent(
        'support:unread_count_updated',
        { ticketId, readerType: 'ADMIN' },
        { notifyAdmins: true }
      );
    }

    return {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      passengerId: ticket.passengerId,
      category: ticket.category,
      subject: ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
      assignedAdminId: ticket.assignedAdminId ?? null,
      assignedAdminName: ticket.assignedAdminName ?? null,
      bookingId: ticket.bookingId ?? null,
      bookingType: ticket.bookingType ?? null,
      lastMessageAt: ticket.lastMessageAt,
      resolvedAt: ticket.resolvedAt ?? null,
      closedAt: ticket.closedAt ?? null,
      resolutionNotes: ticket.resolutionNotes ?? null,
      unreadCount: 0,
      attachmentCount: (ticket as any).attachments?.length ?? 0,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      passenger: ticket.passenger,
      attachments: ((ticket as any).attachments || []).map(mapAttachment),
      auditLogs: ((ticket as any).auditLogs || []).map(mapAuditLog),
      messages: ticket.messages.map((m: any) => ({
        ...mapMessage(m),
        readAt: m.senderType === 'PASSENGER' && m.readAt === null ? readNow : m.readAt,
      })),
    };
  }

  /**
   * Paginated messages for Admin view.
   */
  async getAdminTicketMessages(
    ticketId: string,
    query: TicketMessagesQuery
  ): Promise<{ items: SupportMessageDTO[]; total: number; page: number; limit: number; totalPages: number }> {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { id: true },
    });

    if (!ticket) {
      throw new AppError('Support ticket not found', 404, 'TICKET_NOT_FOUND');
    }

    return this.paginateTicketMessages(ticketId, query);
  }

  private async paginateTicketMessages(
    ticketId: string,
    query: TicketMessagesQuery
  ): Promise<{ items: SupportMessageDTO[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const [total, rows] = await Promise.all([
      prisma.supportMessage.count({ where: { ticketId } }),
      prisma.supportMessage.findMany({
        where: { ticketId },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: { attachments: true },
      }),
    ]);

    return {
      items: rows.map(mapMessage),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Super Admin reply to a support ticket (with optional attachments, Socket.IO broadcast, and notification).
   */
  async addAdminMessage(
    adminId: string,
    adminName: string,
    ticketId: string,
    input: AddSupportMessageInput
  ): Promise<SupportMessageDTO> {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new AppError('Support ticket not found', 404, 'TICKET_NOT_FOUND');
    }

    const uploadedAssets = await this.uploadSupportAttachments(input.attachments, ticketId);
    const now = new Date();
    const effectiveAdminName = adminName || 'Kings Customer Care Team';
    const validAdminUuid = parseUuidOrNull(adminId);
    const nextStatus =
      ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS'
        ? 'WAITING_FOR_PASSENGER'
        : ticket.status;

    let createdMessage: any;
    try {
      createdMessage = await prisma.$transaction(async (tx) => {
        const msg = await tx.supportMessage.create({
          data: {
            ticketId,
            senderType: 'ADMIN',
            adminId: validAdminUuid,
            senderName: effectiveAdminName,
            message: input.message,
            createdAt: now,
            updatedAt: now,
          },
        });

        if (uploadedAssets.length > 0 && tx.supportAttachment) {
          await tx.supportAttachment.createMany({
            data: uploadedAssets.map((asset) => ({
              ticketId,
              messageId: msg.id,
              uploadedByType: 'ADMIN',
              uploadedById: validAdminUuid,
              fileUrl: asset.upload.secureUrl,
              cloudinaryPublicId: asset.upload.publicId,
              mimeType: asset.mimeType,
              fileSizeBytes: asset.upload.bytes,
              originalFilename: asset.originalFilename,
            })),
          });
        }

        await tx.supportTicket.update({
          where: { id: ticketId },
          data: {
            lastMessageAt: now,
            status: nextStatus,
            assignedAdminId: ticket.assignedAdminId || validAdminUuid,
            assignedAdminName: ticket.assignedAdminName || effectiveAdminName,
          },
        });

        const fullMessage = await tx.supportMessage.findUnique({
          where: { id: msg.id },
          include: { attachments: true },
        });
        return fullMessage || msg;
      });
    } catch (err) {
      await this.cleanupUploadedAssets(uploadedAssets);
      throw err;
    }

    const dto = mapMessage(createdMessage);

    logger.info(
      { ticketId, messageId: dto.id, adminId },
      '[SupportService] Admin replied to support ticket'
    );

    emitSupportEvent(
      'support:message_created',
      { ticketId, message: dto, nextStatus },
      { ticketId, passengerId: ticket.passengerId, notifyAdmins: true }
    );
    if (nextStatus !== ticket.status) {
      emitSupportEvent(
        'support:ticket_status_changed',
        { ticketId, previousStatus: ticket.status, status: nextStatus },
        { ticketId, passengerId: ticket.passengerId, notifyAdmins: true }
      );
    }
    emitSupportEvent(
      'support:unread_count_updated',
      { ticketId, actor: 'ADMIN' },
      { passengerId: ticket.passengerId, notifyAdmins: true }
    );

    await this.dispatchPassengerNotification(
      ticket.passengerId,
      `Support Reply · ${ticket.ticketNumber}`,
      `${effectiveAdminName}: ${input.message.slice(0, 140)}`,
      {
        kind: 'SUPPORT_REPLY',
        ticketId,
        ticketNumber: ticket.ticketNumber,
      }
    );

    return dto;
  }

  /**
   * Assign a support ticket to an admin (or self).
   */
  async assignAdminTicket(
    actorAdminId: string,
    actorAdminName: string,
    ticketId: string,
    input: AssignTicketInput
  ): Promise<SupportTicketDetailDTO> {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new AppError('Support ticket not found', 404, 'TICKET_NOT_FOUND');
    }

    let targetAdminId = parseUuidOrNull(input.assignedAdminId ?? actorAdminId);
    let targetAdminName = input.assignedAdminName?.trim() || actorAdminName || 'Super Admin';

    if (input.assignedAdminId && !input.assignedAdminName) {
      const admin = await prisma.adminUser.findUnique({
        where: { id: input.assignedAdminId },
        select: { id: true, fullName: true, email: true },
      });
      if (!admin) {
        throw new AppError('Target admin user not found', 404, 'ADMIN_NOT_FOUND');
      }
      targetAdminId = admin.id;
      targetAdminName = admin.fullName || admin.email;
    }

    await prisma.$transaction(async (tx) => {
      await tx.supportTicket.update({
        where: { id: ticketId },
        data: {
          assignedAdminId: targetAdminId,
          assignedAdminName: targetAdminName,
          status: ticket.status === 'OPEN' ? 'IN_PROGRESS' : ticket.status,
        },
      });

      if (tx.supportTicketAuditLog) {
        await tx.supportTicketAuditLog.create({
          data: {
            ticketId,
            actorType: 'ADMIN',
            actorId: parseUuidOrNull(actorAdminId),
            actorName: actorAdminName || 'Super Admin',
            action: 'TICKET_ASSIGNED',
            previousValue: {
              assignedAdminId: ticket.assignedAdminId,
              assignedAdminName: ticket.assignedAdminName,
            },
            newValue: {
              assignedAdminId: targetAdminId,
              assignedAdminName: targetAdminName,
            },
          },
        });
      }
    });

    const updated = await this.getAdminTicket(ticketId);

    emitSupportEvent(
      'support:ticket_assigned',
      {
        ticketId,
        assignedAdminId: targetAdminId,
        assignedAdminName: targetAdminName,
      },
      { ticketId, passengerId: ticket.passengerId, notifyAdmins: true }
    );
    emitSupportEvent(
      'support:ticket_updated',
      { ticket: updated },
      { ticketId, passengerId: ticket.passengerId, notifyAdmins: true }
    );

    return updated;
  }

  /**
   * Update ticket priority independently.
   */
  async updateTicketPriority(
    actorAdminId: string,
    actorAdminName: string,
    ticketId: string,
    input: UpdateTicketPriorityInput
  ): Promise<SupportTicketDetailDTO> {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new AppError('Support ticket not found', 404, 'TICKET_NOT_FOUND');
    }

    await prisma.$transaction(async (tx) => {
      await tx.supportTicket.update({
        where: { id: ticketId },
        data: { priority: input.priority },
      });

      if (tx.supportTicketAuditLog) {
        await tx.supportTicketAuditLog.create({
          data: {
            ticketId,
            actorType: 'ADMIN',
            actorId: parseUuidOrNull(actorAdminId),
            actorName: actorAdminName || 'Super Admin',
            action: 'PRIORITY_CHANGED',
            previousValue: { priority: ticket.priority },
            newValue: { priority: input.priority },
          },
        });
      }
    });

    const updated = await this.getAdminTicket(ticketId);

    emitSupportEvent(
      'support:ticket_priority_changed',
      { ticketId, previousPriority: ticket.priority, priority: input.priority },
      { ticketId, passengerId: ticket.passengerId, notifyAdmins: true }
    );
    emitSupportEvent(
      'support:ticket_updated',
      { ticket: updated },
      { ticketId, passengerId: ticket.passengerId, notifyAdmins: true }
    );

    return updated;
  }

  /**
   * Update support ticket status, priority, resolution notes, and assignees.
   */
  async updateTicketStatus(
    adminId: string,
    ticketId: string,
    input: UpdateTicketStatusInput
  ): Promise<SupportTicketDetailDTO> {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new AppError('Support ticket not found', 404, 'TICKET_NOT_FOUND');
    }

    const now = new Date();
    const updateData: any = {
      status: input.status,
      updatedAt: now,
    };

    if (input.priority) {
      updateData.priority = input.priority;
    }

    if (input.assignedAdminName) {
      updateData.assignedAdminName = input.assignedAdminName;
      updateData.assignedAdminId = parseUuidOrNull(adminId);
    }

    if (input.status === 'RESOLVED') {
      updateData.resolvedAt = now;
      if (input.resolutionNotes) {
        updateData.resolutionNotes = input.resolutionNotes;
      }
    } else if (input.status === 'CLOSED') {
      updateData.closedAt = now;
      if (input.resolutionNotes) {
        updateData.resolutionNotes = input.resolutionNotes;
      }
    } else if (ticket.status === 'CLOSED' || ticket.status === 'RESOLVED') {
      updateData.resolvedAt = null;
      updateData.closedAt = null;
    }

    await prisma.$transaction(async (tx) => {
      await tx.supportTicket.update({
        where: { id: ticketId },
        data: updateData,
      });

      if (tx.supportTicketAuditLog) {
        await tx.supportTicketAuditLog.create({
          data: {
            ticketId,
            actorType: 'ADMIN',
            actorId: parseUuidOrNull(adminId),
            actorName: input.assignedAdminName || 'Super Admin',
            action: 'STATUS_CHANGED',
            previousValue: { status: ticket.status, priority: ticket.priority },
            newValue: { status: input.status, priority: input.priority || ticket.priority },
            note: input.resolutionNotes || null,
          },
        });
      }
    });

    logger.info(
      { ticketId, previousStatus: ticket.status, newStatus: input.status, adminId },
      '[SupportService] Updated support ticket status'
    );

    const updated = await this.getAdminTicket(ticketId);

    emitSupportEvent(
      'support:ticket_status_changed',
      { ticketId, previousStatus: ticket.status, status: input.status },
      { ticketId, passengerId: ticket.passengerId, notifyAdmins: true }
    );
    emitSupportEvent(
      'support:ticket_updated',
      { ticket: updated },
      { ticketId, passengerId: ticket.passengerId, notifyAdmins: true }
    );

    if (input.status === 'RESOLVED' || input.status === 'CLOSED') {
      await this.dispatchPassengerNotification(
        ticket.passengerId,
        `Ticket ${input.status === 'RESOLVED' ? 'Resolved' : 'Closed'} · ${ticket.ticketNumber}`,
        `Your support ticket "${ticket.subject}" has been marked as ${input.status.toLowerCase()}.`,
        {
          kind: 'SUPPORT_STATUS_CHANGED',
          ticketId,
          ticketNumber: ticket.ticketNumber,
          status: input.status,
        }
      );
    }

    return updated;
  }
}

export const supportService = new SupportService();
