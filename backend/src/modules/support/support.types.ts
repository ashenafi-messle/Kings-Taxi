export type SupportCategory =
  | 'RIDE_ISSUE'
  | 'BOOKING_ISSUE'
  | 'PAYMENT_ISSUE'
  | 'ACCOUNT_ISSUE'
  | 'DRIVER_BEHAVIOR'
  | 'SAFETY_CONCERN'
  | 'APP_TECHNICAL_ISSUE'
  | 'OTHER';

export type SupportTicketStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_PASSENGER'
  | 'RESOLVED'
  | 'CLOSED';

export type SupportPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type SupportSenderType = 'PASSENGER' | 'ADMIN' | 'SYSTEM';

export interface SupportAttachmentInput {
  fileData: string;
  mimeType?: 'image/jpeg' | 'image/jpg' | 'image/png' | 'image/webp';
  originalFilename?: string;
}

export interface SupportAttachmentDTO {
  id: string;
  ticketId: string;
  messageId: string | null;
  uploadedByType: SupportSenderType;
  uploadedById: string | null;
  fileUrl: string;
  cloudinaryPublicId: string;
  mimeType: string;
  fileSizeBytes: number;
  originalFilename: string | null;
  createdAt: Date | string;
}

export interface SupportTicketAuditLogDTO {
  id: string;
  ticketId: string;
  actorType: SupportSenderType;
  actorId: string | null;
  actorName: string;
  action: string;
  previousValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  note: string | null;
  createdAt: Date | string;
}

export interface CreateSupportTicketInput {
  category: SupportCategory;
  subject: string;
  message: string;
  bookingId?: string | null;
  bookingType?: string | null;
  priority?: SupportPriority;
  attachments?: SupportAttachmentInput[];
}

export interface AddSupportMessageInput {
  message: string;
  attachments?: SupportAttachmentInput[];
}

export interface UpdateTicketStatusInput {
  status: SupportTicketStatus;
  resolutionNotes?: string | null;
  assignedAdminName?: string | null;
  priority?: SupportPriority;
}

export interface AssignTicketInput {
  assignedAdminId?: string | null;
  assignedAdminName?: string | null;
}

export interface UpdateTicketPriorityInput {
  priority: SupportPriority;
}

export interface ReopenTicketInput {
  reason?: string;
}

export interface PassengerTicketQuery {
  status?: SupportTicketStatus;
  category?: SupportCategory;
  page?: number;
  limit?: number;
}

export interface AdminTicketQuery {
  status?: SupportTicketStatus;
  category?: SupportCategory;
  priority?: SupportPriority;
  assignedAdminId?: string;
  unassignedOnly?: boolean;
  unreadOnly?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface TicketMessagesQuery {
  page?: number;
  limit?: number;
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

export interface SupportMessageDTO {
  id: string;
  ticketId: string;
  senderType: SupportSenderType;
  passengerId: string | null;
  adminId: string | null;
  senderName: string;
  message: string;
  readAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  attachments?: SupportAttachmentDTO[];
}

export interface SupportTicketSummaryDTO {
  id: string;
  ticketNumber: string;
  passengerId: string;
  category: SupportCategory;
  subject: string;
  status: SupportTicketStatus;
  priority: SupportPriority;
  assignedAdminId: string | null;
  assignedAdminName: string | null;
  bookingId: string | null;
  bookingType: string | null;
  lastMessageAt: Date | string;
  resolvedAt: Date | string | null;
  closedAt: Date | string | null;
  unreadCount: number;
  latestMessage?: string;
  attachmentCount?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  passenger?: {
    id: string;
    fullName: string;
    phoneNumber: string | null;
    email: string | null;
  };
}

export interface SupportTicketDetailDTO extends SupportTicketSummaryDTO {
  resolutionNotes: string | null;
  messages: SupportMessageDTO[];
  attachments?: SupportAttachmentDTO[];
  auditLogs?: SupportTicketAuditLogDTO[];
}
