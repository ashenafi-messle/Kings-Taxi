import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

const {
  mockPrisma,
  mockUploadAsset,
  mockDeleteAsset,
  mockDispatchNotification,
  mockEmitSupportEvent,
} = vi.hoisted(() => {
  const txMock = {
    supportTicket: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    supportMessage: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    supportAttachment: {
      createMany: vi.fn(),
    },
    supportTicketAuditLog: {
      create: vi.fn(),
    },
  };

  return {
    mockPrisma: {
      $queryRaw: vi.fn(),
      $transaction: vi.fn(async (cb: any) => cb(txMock)),
      tx: txMock,
      passenger: { findUnique: vi.fn() },
      adminUser: { findUnique: vi.fn() },
      supportTicket: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
      },
      supportMessage: {
        count: vi.fn(),
        findMany: vi.fn(),
        updateMany: vi.fn(),
      },
      supportAttachment: {
        create: vi.fn(),
      },
    },
    mockUploadAsset: vi.fn(),
    mockDeleteAsset: vi.fn(),
    mockDispatchNotification: vi.fn(),
    mockEmitSupportEvent: vi.fn(),
  };
});

vi.mock('../../src/core/database/prisma', () => ({
  prisma: mockPrisma,
}));

vi.mock('../../src/integrations/cloudinary/cloudinary.service', () => ({
  CloudinaryService: {
    uploadAsset: mockUploadAsset,
    deleteAsset: mockDeleteAsset,
  },
}));

vi.mock('../../src/modules/notifications/notification.service', () => ({
  NotificationService: {
    getInstance: () => ({
      dispatch: mockDispatchNotification,
    }),
  },
}));

vi.mock('../../src/modules/support/supportSocket', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/modules/support/supportSocket')>();
  return {
    ...actual,
    emitSupportEvent: mockEmitSupportEvent,
  };
});

import { supportService } from '../../src/modules/support/support.service';
import {
  authorizeTicketRoomJoin,
  verifySupportSocketToken,
} from '../../src/modules/support/supportSocket';
import { env } from '../../src/config/env';

const PASSENGER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_PASSENGER_ID = '22222222-2222-4222-8222-222222222222';
const ADMIN_ID = '33333333-3333-4333-8333-333333333333';
const TICKET_ID = '44444444-4444-4444-8444-444444444444';
const MESSAGE_ID = '55555555-5555-4555-8555-555555555555';

describe('Kings Taxi Real-Time Help & Support System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteAsset.mockResolvedValue(undefined);
    mockDispatchNotification.mockResolvedValue(undefined);
  });

  it('creates a ticket with sequence-backed KT-SUP-YYYY-NNNNNN number, Cloudinary attachment, and emits Socket.IO event', async () => {
    const now = new Date();
    mockPrisma.passenger.findUnique.mockResolvedValue({
      id: PASSENGER_ID,
      fullName: 'Abebe Kebede',
      phoneNumber: '+251911223344',
      email: 'abebe@example.com',
    });
    mockPrisma.$queryRaw.mockResolvedValue([{ seq: 42n }]);
    mockUploadAsset.mockResolvedValue({
      url: 'http://res.cloudinary.com/demo/image/upload/v1/support_1.jpg',
      secureUrl: 'https://res.cloudinary.com/demo/image/upload/v1/support_1.jpg',
      publicId: 'kings-taxi/support/test/support_1',
      format: 'jpg',
      bytes: 12345,
      resourceType: 'image',
    });

    mockPrisma.tx.supportTicket.create.mockResolvedValue({
      id: TICKET_ID,
      ticketNumber: `KT-SUP-${now.getUTCFullYear()}-000042`,
      passengerId: PASSENGER_ID,
      category: 'PAYMENT_ISSUE',
      subject: 'Telebirr double charge',
      status: 'OPEN',
      priority: 'HIGH',
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    });
    mockPrisma.tx.supportMessage.create.mockResolvedValue({
      id: MESSAGE_ID,
      ticketId: TICKET_ID,
      senderType: 'PASSENGER',
      passengerId: PASSENGER_ID,
      senderName: 'Abebe Kebede',
      message: 'Charged twice for my ride',
      createdAt: now,
      updatedAt: now,
    });
    mockPrisma.tx.supportTicket.findUnique.mockResolvedValue({
      id: TICKET_ID,
      ticketNumber: `KT-SUP-${now.getUTCFullYear()}-000042`,
      passengerId: PASSENGER_ID,
      category: 'PAYMENT_ISSUE',
      subject: 'Telebirr double charge',
      status: 'OPEN',
      priority: 'HIGH',
      assignedAdminId: null,
      assignedAdminName: null,
      bookingId: null,
      bookingType: null,
      lastMessageAt: now,
      resolvedAt: null,
      closedAt: null,
      resolutionNotes: null,
      createdAt: now,
      updatedAt: now,
      passenger: {
        id: PASSENGER_ID,
        fullName: 'Abebe Kebede',
        phoneNumber: '+251911223344',
        email: 'abebe@example.com',
      },
      messages: [
        {
          id: MESSAGE_ID,
          ticketId: TICKET_ID,
          senderType: 'PASSENGER',
          passengerId: PASSENGER_ID,
          adminId: null,
          senderName: 'Abebe Kebede',
          message: 'Charged twice for my ride',
          readAt: null,
          createdAt: now,
          updatedAt: now,
          attachments: [
            {
              id: '66666666-6666-4666-8666-666666666666',
              ticketId: TICKET_ID,
              messageId: MESSAGE_ID,
              uploadedByType: 'PASSENGER',
              uploadedById: PASSENGER_ID,
              fileUrl: 'https://res.cloudinary.com/demo/image/upload/v1/support_1.jpg',
              cloudinaryPublicId: 'kings-taxi/support/test/support_1',
              mimeType: 'image/jpeg',
              fileSizeBytes: 12345,
              originalFilename: 'receipt.jpg',
              createdAt: now,
            },
          ],
        },
      ],
      attachments: [
        {
          id: '66666666-6666-4666-8666-666666666666',
          ticketId: TICKET_ID,
          messageId: MESSAGE_ID,
          uploadedByType: 'PASSENGER',
          uploadedById: PASSENGER_ID,
          fileUrl: 'https://res.cloudinary.com/demo/image/upload/v1/support_1.jpg',
          cloudinaryPublicId: 'kings-taxi/support/test/support_1',
          mimeType: 'image/jpeg',
          fileSizeBytes: 12345,
          originalFilename: 'receipt.jpg',
          createdAt: now,
        },
      ],
      auditLogs: [],
    });

    const result = await supportService.createPassengerTicket(PASSENGER_ID, {
      category: 'PAYMENT_ISSUE',
      subject: 'Telebirr double charge',
      message: 'Charged twice for my ride',
      priority: 'HIGH',
      attachments: [
        {
          fileData: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/',
          mimeType: 'image/jpeg',
          originalFilename: 'receipt.jpg',
        },
      ],
    });

    expect(result.ticketNumber).toBe(`KT-SUP-${now.getUTCFullYear()}-000042`);
    expect(result.attachments).toHaveLength(1);
    expect(mockUploadAsset).toHaveBeenCalledTimes(1);
    expect(mockPrisma.tx.supportAttachment.createMany).toHaveBeenCalledTimes(1);
    expect(mockEmitSupportEvent).toHaveBeenCalledWith(
      'support:ticket_created',
      expect.objectContaining({ ticket: expect.objectContaining({ id: TICKET_ID }) }),
      { passengerId: PASSENGER_ID, notifyAdmins: true }
    );
  });

  it('cleans up uploaded Cloudinary attachment if DB transaction fails', async () => {
    mockPrisma.passenger.findUnique.mockResolvedValue({
      id: PASSENGER_ID,
      fullName: 'Abebe Kebede',
    });
    mockPrisma.$queryRaw.mockResolvedValue([{ seq: 7n }]);
    mockUploadAsset.mockResolvedValue({
      url: 'http://res.cloudinary.com/demo/image/upload/v1/orphan.jpg',
      secureUrl: 'https://res.cloudinary.com/demo/image/upload/v1/orphan.jpg',
      publicId: 'kings-taxi/support/test/orphan',
      format: 'jpg',
      bytes: 900,
      resourceType: 'image',
    });
    mockPrisma.$transaction.mockRejectedValueOnce(new Error('DB_WRITE_FAILED'));

    await expect(
      supportService.createPassengerTicket(PASSENGER_ID, {
        category: 'OTHER',
        subject: 'App feedback',
        message: 'Testing rollback cleanup',
        attachments: [{ fileData: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/' }],
      })
    ).rejects.toThrow('DB_WRITE_FAILED');

    expect(mockDeleteAsset).toHaveBeenCalledWith('kings-taxi/support/test/orphan', 'image');
    expect(mockEmitSupportEvent).not.toHaveBeenCalled();
  });

  it('enforces IDOR protection when another passenger tries to view, reply, or reopen a ticket', async () => {
    mockPrisma.supportTicket.findUnique.mockResolvedValue({
      id: TICKET_ID,
      passengerId: PASSENGER_ID,
      status: 'RESOLVED',
      messages: [],
      passenger: { id: PASSENGER_ID, fullName: 'Owner' },
    });

    await expect(
      supportService.getPassengerTicket(OTHER_PASSENGER_ID, TICKET_ID)
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN_TICKET_ACCESS' });

    await expect(
      supportService.addPassengerMessage(OTHER_PASSENGER_ID, TICKET_ID, { message: 'Hello' })
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN_TICKET_ACCESS' });

    await expect(
      supportService.reopenPassengerTicket(OTHER_PASSENGER_ID, TICKET_ID, {})
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN_TICKET_ACCESS' });
  });

  it('allows owner to reopen a RESOLVED ticket and rejects reopening a CLOSED ticket', async () => {
    const now = new Date();
    mockPrisma.supportTicket.findUnique
      .mockResolvedValueOnce({
        id: TICKET_ID,
        passengerId: PASSENGER_ID,
        status: 'RESOLVED',
        passenger: { id: PASSENGER_ID, fullName: 'Abebe' },
      })
      .mockResolvedValueOnce({
        id: TICKET_ID,
        ticketNumber: 'KT-SUP-2026-000042',
        passengerId: PASSENGER_ID,
        category: 'RIDE_ISSUE',
        subject: 'Driver route',
        status: 'OPEN',
        priority: 'MEDIUM',
        lastMessageAt: now,
        createdAt: now,
        updatedAt: now,
        passenger: { id: PASSENGER_ID, fullName: 'Abebe', phoneNumber: null, email: null },
        messages: [],
        attachments: [],
      });

    const reopened = await supportService.reopenPassengerTicket(PASSENGER_ID, TICKET_ID, {
      reason: 'Refund has not arrived yet',
    });

    expect(reopened.status).toBe('OPEN');
    expect(mockPrisma.tx.supportTicketAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'TICKET_REOPENED' }),
      })
    );

    mockPrisma.supportTicket.findUnique.mockResolvedValueOnce({
      id: TICKET_ID,
      passengerId: PASSENGER_ID,
      status: 'CLOSED',
      passenger: { id: PASSENGER_ID, fullName: 'Abebe' },
    });

    await expect(
      supportService.reopenPassengerTicket(PASSENGER_ID, TICKET_ID, {})
    ).rejects.toMatchObject({ statusCode: 400, code: 'TICKET_CLOSED' });
  });

  it('sends admin reply, moves OPEN ticket to WAITING_FOR_PASSENGER, emits Socket.IO, and dispatches notification', async () => {
    const now = new Date();
    mockPrisma.supportTicket.findUnique.mockResolvedValue({
      id: TICKET_ID,
      ticketNumber: 'KT-SUP-2026-000042',
      passengerId: PASSENGER_ID,
      status: 'OPEN',
      assignedAdminId: null,
      assignedAdminName: null,
    });
    mockPrisma.tx.supportMessage.create.mockResolvedValue({
      id: MESSAGE_ID,
      ticketId: TICKET_ID,
      senderType: 'ADMIN',
      adminId: ADMIN_ID,
      senderName: 'Support Lead',
      message: 'We have refunded your duplicate charge.',
      readAt: null,
      createdAt: now,
      updatedAt: now,
    });
    mockPrisma.tx.supportMessage.findUnique.mockResolvedValue({
      id: MESSAGE_ID,
      ticketId: TICKET_ID,
      senderType: 'ADMIN',
      adminId: ADMIN_ID,
      senderName: 'Support Lead',
      message: 'We have refunded your duplicate charge.',
      readAt: null,
      createdAt: now,
      updatedAt: now,
      attachments: [],
    });

    const msg = await supportService.addAdminMessage(
      ADMIN_ID,
      'Support Lead',
      TICKET_ID,
      { message: 'We have refunded your duplicate charge.' }
    );

    expect(msg.senderType).toBe('ADMIN');
    expect(mockEmitSupportEvent).toHaveBeenCalledWith(
      'support:message_created',
      expect.objectContaining({ ticketId: TICKET_ID, nextStatus: 'WAITING_FOR_PASSENGER' }),
      { ticketId: TICKET_ID, passengerId: PASSENGER_ID, notifyAdmins: true }
    );
    expect(mockDispatchNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: PASSENGER_ID,
        recipientType: 'PASSENGER',
        notificationType: 'SYSTEM_NOTICE',
      })
    );
  });

  it('authenticates Socket.IO JWT tokens and enforces ticket room join authorization', async () => {
    const token = jwt.sign({ sub: PASSENGER_ID, role: 'PASSENGER' }, env.JWT_ACCESS_SECRET, {
      expiresIn: '15m',
    });
    const decoded = verifySupportSocketToken(token);
    expect(decoded.sub).toBe(PASSENGER_ID);
    expect(decoded.role).toBe('PASSENGER');

    mockPrisma.supportTicket.findUnique.mockResolvedValue({
      id: TICKET_ID,
      passengerId: PASSENGER_ID,
    });

    const ownerJoin = await authorizeTicketRoomJoin({ sub: PASSENGER_ID, role: 'PASSENGER' }, TICKET_ID);
    expect(ownerJoin.allowed).toBe(true);

    const intruderJoin = await authorizeTicketRoomJoin(
      { sub: OTHER_PASSENGER_ID, role: 'PASSENGER' },
      TICKET_ID
    );
    expect(intruderJoin).toEqual({ allowed: false, reason: 'FORBIDDEN_TICKET_ACCESS' });

    const adminJoin = await authorizeTicketRoomJoin({ sub: ADMIN_ID, role: 'SUPER_ADMIN' }, TICKET_ID);
    expect(adminJoin.allowed).toBe(true);
  });
});
