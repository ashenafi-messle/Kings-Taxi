import { prisma } from '../../core/database/prisma';
import { AppError } from '../../core/errors/appError';
import { logger } from '../../core/logging/logger';
import {
  CreateSupportTicketInput,
  AddSupportMessageInput,
  UpdateTicketStatusInput,
  PassengerTicketQuery,
  AdminTicketQuery,
  SupportOverviewStats,
  SupportTicketSummaryDTO,
  SupportTicketDetailDTO,
  SupportMessageDTO,
} from './support.types';

function parseUuidOrNull(val: string | null | undefined): string | null {
  if (!val) return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(val) ? val : null;
}

export class SupportService {
  /**
   * Generate an uppercase human-readable ticket number.
   * Format: KT-TKT-XXXXXX (e.g. KT-TKT-M1K9A2)
   */
  private generateTicketNumber(): string {
    const timestampPart = Date.now().toString(36).toUpperCase().slice(-4);
    const randomPart = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `KT-TKT-${timestampPart}${randomPart}`;
  }

  // ============================================================================
  // PASSENGER ACTIONS
  // ============================================================================

  /**
   * Create a support ticket and its first conversational message transactionally.
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

    const ticketNumber = this.generateTicketNumber();
    const now = new Date();

    const createdTicket = await prisma.$transaction(async (tx) => {
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
          messages: {
            create: {
              senderType: 'PASSENGER',
              passengerId,
              senderName: passenger.fullName || 'Passenger',
              message: input.message,
              createdAt: now,
              updatedAt: now,
            },
          },
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
          passenger: {
            select: { id: true, fullName: true, phoneNumber: true, email: true },
          },
        },
      });

      return ticket;
    });

    logger.info(
      { ticketId: createdTicket.id, ticketNumber, passengerId },
      '[SupportService] Created new support ticket'
    );

    return {
      id: createdTicket.id,
      ticketNumber: createdTicket.ticketNumber,
      passengerId: createdTicket.passengerId,
      category: createdTicket.category,
      subject: createdTicket.subject,
      status: createdTicket.status,
      priority: createdTicket.priority,
      assignedAdminName: createdTicket.assignedAdminName,
      bookingId: createdTicket.bookingId,
      bookingType: createdTicket.bookingType,
      lastMessageAt: createdTicket.lastMessageAt,
      resolvedAt: createdTicket.resolvedAt,
      closedAt: createdTicket.closedAt,
      resolutionNotes: createdTicket.resolutionNotes,
      unreadCount: 0,
      latestMessage: input.message,
      createdAt: createdTicket.createdAt,
      updatedAt: createdTicket.updatedAt,
      passenger: createdTicket.passenger,
      messages: createdTicket.messages.map((m) => ({
        id: m.id,
        ticketId: m.ticketId,
        senderType: m.senderType,
        passengerId: m.passengerId,
        adminId: m.adminId,
        senderName: m.senderName,
        message: m.message,
        readAt: m.readAt,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      })),
    };
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

    const items: SupportTicketSummaryDTO[] = tickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      passengerId: t.passengerId,
      category: t.category,
      subject: t.subject,
      status: t.status,
      priority: t.priority,
      assignedAdminName: t.assignedAdminName,
      bookingId: t.bookingId,
      bookingType: t.bookingType,
      lastMessageAt: t.lastMessageAt,
      resolvedAt: t.resolvedAt,
      closedAt: t.closedAt,
      unreadCount: t._count.messages,
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
   * Get a single ticket and all chronological messages.
   * Enforces IDOR security: only the ticket owner can view it.
   * Automatically marks unread ADMIN replies as read.
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
        },
      },
    });

    if (!ticket) {
      throw new AppError('Support ticket not found', 404, 'TICKET_NOT_FOUND');
    }

    if (ticket.passengerId !== passengerId) {
      throw new AppError('Access forbidden: you do not own this ticket', 403, 'FORBIDDEN_TICKET_ACCESS');
    }

    // Mark unread ADMIN messages as read
    const unreadAdminMsgIds = ticket.messages
      .filter((m) => m.senderType === 'ADMIN' && m.readAt === null)
      .map((m) => m.id);

    if (unreadAdminMsgIds.length > 0) {
      await prisma.supportMessage.updateMany({
        where: { id: { in: unreadAdminMsgIds } },
        data: { readAt: new Date() },
      });
    }

    return {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      passengerId: ticket.passengerId,
      category: ticket.category,
      subject: ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
      assignedAdminName: ticket.assignedAdminName,
      bookingId: ticket.bookingId,
      bookingType: ticket.bookingType,
      lastMessageAt: ticket.lastMessageAt,
      resolvedAt: ticket.resolvedAt,
      closedAt: ticket.closedAt,
      resolutionNotes: ticket.resolutionNotes,
      unreadCount: 0,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      passenger: ticket.passenger,
      messages: ticket.messages.map((m) => ({
        id: m.id,
        ticketId: m.ticketId,
        senderType: m.senderType,
        passengerId: m.passengerId,
        adminId: m.adminId,
        senderName: m.senderName,
        message: m.message,
        readAt: m.senderType === 'ADMIN' && m.readAt === null ? new Date() : m.readAt,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      })),
    };
  }

  /**
   * Add a reply message from the passenger to their existing ticket.
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

    const now = new Date();
    const senderName = ticket.passenger?.fullName || 'Passenger';

    // If ticket was WAITING_FOR_PASSENGER or RESOLVED, reopen/continue in IN_PROGRESS
    let nextStatus = ticket.status;
    if (ticket.status === 'WAITING_FOR_PASSENGER' || ticket.status === 'RESOLVED') {
      nextStatus = 'IN_PROGRESS';
    }

    const [newMessage] = await prisma.$transaction([
      prisma.supportMessage.create({
        data: {
          ticketId,
          senderType: 'PASSENGER',
          passengerId,
          senderName,
          message: input.message,
          createdAt: now,
          updatedAt: now,
        },
      }),
      prisma.supportTicket.update({
        where: { id: ticketId },
        data: {
          lastMessageAt: now,
          status: nextStatus,
        },
      }),
    ]);

    logger.info(
      { ticketId, messageId: newMessage.id, passengerId },
      '[SupportService] Passenger added message to ticket'
    );

    return {
      id: newMessage.id,
      ticketId: newMessage.ticketId,
      senderType: newMessage.senderType,
      passengerId: newMessage.passengerId,
      adminId: newMessage.adminId,
      senderName: newMessage.senderName,
      message: newMessage.message,
      readAt: newMessage.readAt,
      createdAt: newMessage.createdAt,
      updatedAt: newMessage.updatedAt,
    };
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
      unreadPassengerMessages,
    ] = await Promise.all([
      prisma.supportTicket.count(),
      prisma.supportTicket.count({ where: { status: 'OPEN' } }),
      prisma.supportTicket.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.supportTicket.count({ where: { status: 'WAITING_FOR_PASSENGER' } }),
      prisma.supportTicket.count({ where: { status: 'RESOLVED' } }),
      prisma.supportTicket.count({ where: { status: 'CLOSED' } }),
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

    if (query.status) {
      where.status = query.status;
    }
    if (query.category) {
      where.category = query.category;
    }
    if (query.priority) {
      where.priority = query.priority;
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

    const items: SupportTicketSummaryDTO[] = tickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      passengerId: t.passengerId,
      category: t.category,
      subject: t.subject,
      status: t.status,
      priority: t.priority,
      assignedAdminName: t.assignedAdminName,
      bookingId: t.bookingId,
      bookingType: t.bookingType,
      lastMessageAt: t.lastMessageAt,
      resolvedAt: t.resolvedAt,
      closedAt: t.closedAt,
      unreadCount: t._count.messages,
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
        },
      },
    });

    if (!ticket) {
      throw new AppError('Support ticket not found', 404, 'TICKET_NOT_FOUND');
    }

    // Mark unread passenger messages as read
    const unreadPassengerMsgIds = ticket.messages
      .filter((m) => m.senderType === 'PASSENGER' && m.readAt === null)
      .map((m) => m.id);

    if (unreadPassengerMsgIds.length > 0) {
      await prisma.supportMessage.updateMany({
        where: { id: { in: unreadPassengerMsgIds } },
        data: { readAt: new Date() },
      });
    }

    return {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      passengerId: ticket.passengerId,
      category: ticket.category,
      subject: ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
      assignedAdminName: ticket.assignedAdminName,
      bookingId: ticket.bookingId,
      bookingType: ticket.bookingType,
      lastMessageAt: ticket.lastMessageAt,
      resolvedAt: ticket.resolvedAt,
      closedAt: ticket.closedAt,
      resolutionNotes: ticket.resolutionNotes,
      unreadCount: 0,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      passenger: ticket.passenger,
      messages: ticket.messages.map((m) => ({
        id: m.id,
        ticketId: m.ticketId,
        senderType: m.senderType,
        passengerId: m.passengerId,
        adminId: m.adminId,
        senderName: m.senderName,
        message: m.message,
        readAt: m.senderType === 'PASSENGER' && m.readAt === null ? new Date() : m.readAt,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      })),
    };
  }

  /**
   * Super Admin reply to a support ticket.
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

    const now = new Date();
    const effectiveAdminName = adminName || 'Kings Customer Care Team';
    const validAdminUuid = parseUuidOrNull(adminId);

    // When admin responds, automatically move to WAITING_FOR_PASSENGER unless resolved/closed
    let nextStatus = ticket.status;
    if (ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS') {
      nextStatus = 'WAITING_FOR_PASSENGER';
    }

    const [newMessage] = await prisma.$transaction([
      prisma.supportMessage.create({
        data: {
          ticketId,
          senderType: 'ADMIN',
          adminId: validAdminUuid,
          senderName: effectiveAdminName,
          message: input.message,
          createdAt: now,
          updatedAt: now,
        },
      }),
      prisma.supportTicket.update({
        where: { id: ticketId },
        data: {
          lastMessageAt: now,
          status: nextStatus,
          assignedAdminId: ticket.assignedAdminId || validAdminUuid,
          assignedAdminName: ticket.assignedAdminName || effectiveAdminName,
        },
      }),
    ]);

    logger.info(
      { ticketId, messageId: newMessage.id, adminId },
      '[SupportService] Admin replied to support ticket'
    );

    return {
      id: newMessage.id,
      ticketId: newMessage.ticketId,
      senderType: newMessage.senderType,
      passengerId: newMessage.passengerId,
      adminId: newMessage.adminId,
      senderName: newMessage.senderName,
      message: newMessage.message,
      readAt: newMessage.readAt,
      createdAt: newMessage.createdAt,
      updatedAt: newMessage.updatedAt,
    };
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
    } else {
      // Reopened or active
      if (ticket.status === 'CLOSED' || ticket.status === 'RESOLVED') {
        updateData.resolvedAt = null;
        updateData.closedAt = null;
      }
    }

    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: updateData,
    });

    logger.info(
      { ticketId, previousStatus: ticket.status, newStatus: input.status, adminId },
      '[SupportService] Updated support ticket status'
    );

    return this.getAdminTicket(ticketId);
  }
}

export const supportService = new SupportService();
