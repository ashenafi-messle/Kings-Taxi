/**
 * Support Ticket & Help Center Type Definitions
 */

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'CRITICAL';
export type TicketStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_PASSENGER'
  | 'WAITING_FOR_RESPONSE'
  | 'RESOLVED'
  | 'CLOSED';
export type TicketCategory =
  | 'RIDE_ISSUE'
  | 'BOOKING_ISSUE'
  | 'PAYMENT_ISSUE'
  | 'ACCOUNT_ISSUE'
  | 'DRIVER_BEHAVIOR'
  | 'SAFETY_CONCERN'
  | 'APP_TECHNICAL_ISSUE'
  | 'OTHER'
  | 'TRIP_ISSUE'
  | 'PAYMENT_DISPUTE'
  | 'ACCOUNT_ACCESS'
  | 'HOTEL_BOOKING'
  | 'HERITAGE_TOUR';

export interface SupportAttachment {
  id: string;
  ticketId: string;
  messageId: string | null;
  uploadedByType: 'PASSENGER' | 'ADMIN' | 'SYSTEM';
  fileUrl: string;
  cloudinaryPublicId: string;
  mimeType: string;
  fileSizeBytes: number;
  originalFilename: string | null;
  createdAt: string;
}

export interface SupportAuditLog {
  id: string;
  ticketId: string;
  actorType: 'PASSENGER' | 'ADMIN' | 'SYSTEM';
  actorName: string;
  action: string;
  previousValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  note: string | null;
  createdAt: string;
}

export interface TicketMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'PASSENGER' | 'DRIVER' | 'ADMIN' | 'SUPPORT_AGENT' | 'SYSTEM';
  message: string;
  readAt?: string | null;
  attachments?: SupportAttachment[];
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  ticketReference: string;
  subject: string;
  category: TicketCategory;
  categoryLabel: string;
  priority: TicketPriority;
  status: TicketStatus;

  // Requester
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone: string;
  requesterRole: 'PASSENGER' | 'DRIVER';

  // Assigned Administrator
  assignedAdminId?: string | null;
  assignedAdminName?: string | null;

  relatedEntityId?: string | null;
  relatedEntityType?: string | null;

  unreadCount?: number;
  attachmentCount?: number;
  latestMessage?: string;
  resolutionNotes?: string | null;
  lastMessageAt?: string;
  resolvedAt?: string | null;
  closedAt?: string | null;

  messages: TicketMessage[];
  attachments?: SupportAttachment[];
  auditLogs?: SupportAuditLog[];

  createdAt: string;
  updatedAt: string;
}

export interface SupportOverviewStats {
  total: number;
  open: number;
  inProgress: number;
  waitingForPassenger: number;
  resolved: number;
  closed: number;
  unassigned: number;
  urgent: number;
  unreadPassengerMessages: number;
}

export interface SupportFilterParams {
  search?: string;
  status?: string;
  priority?: string;
  category?: string;
  assignedAdminId?: string;
  unassignedOnly?: boolean;
  unreadOnly?: boolean;
  page?: number;
  limit?: number;
}
