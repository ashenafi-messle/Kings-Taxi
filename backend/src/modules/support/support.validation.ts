import { z } from 'zod';

export const SUPPORT_CATEGORIES = [
  'RIDE_ISSUE',
  'BOOKING_ISSUE',
  'PAYMENT_ISSUE',
  'ACCOUNT_ISSUE',
  'DRIVER_BEHAVIOR',
  'SAFETY_CONCERN',
  'APP_TECHNICAL_ISSUE',
  'OTHER',
] as const;

export const SUPPORT_STATUSES = [
  'OPEN',
  'IN_PROGRESS',
  'WAITING_FOR_PASSENGER',
  'RESOLVED',
  'CLOSED',
] as const;

export const SUPPORT_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

export const createTicketSchema = z.object({
  category: z.enum(SUPPORT_CATEGORIES, {
    errorMap: () => ({ message: 'Invalid support category' }),
  }),
  subject: z
    .string()
    .min(3, 'Subject must be at least 3 characters')
    .max(160, 'Subject cannot exceed 160 characters')
    .trim(),
  message: z
    .string()
    .min(5, 'Message must be at least 5 characters')
    .max(5000, 'Message cannot exceed 5000 characters')
    .trim(),
  bookingId: z.string().uuid('Invalid booking UUID').optional().nullable(),
  bookingType: z.string().max(32).optional().nullable(),
  priority: z.enum(SUPPORT_PRIORITIES).optional().default('MEDIUM'),
});

export const addMessageSchema = z.object({
  message: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(5000, 'Message cannot exceed 5000 characters')
    .trim(),
});

export const updateTicketStatusSchema = z.object({
  status: z.enum(SUPPORT_STATUSES, {
    errorMap: () => ({ message: 'Invalid ticket status' }),
  }),
  resolutionNotes: z.string().max(2000).optional().nullable(),
  assignedAdminName: z.string().max(128).optional().nullable(),
  priority: z.enum(SUPPORT_PRIORITIES).optional(),
});

export const passengerQuerySchema = z.object({
  status: z.enum(SUPPORT_STATUSES).optional(),
  category: z.enum(SUPPORT_CATEGORIES).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export const adminQuerySchema = z.object({
  status: z.enum(SUPPORT_STATUSES).optional(),
  category: z.enum(SUPPORT_CATEGORIES).optional(),
  priority: z.enum(SUPPORT_PRIORITIES).optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
});

