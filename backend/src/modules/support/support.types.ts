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

export type SupportSenderType = 'PASSENGER' | 'ADMIN';

export interface CreateSupportTicketInput {
  category: SupportCategory;
  subject: string;
  message: string;
  bookingId?: string | null;
  bookingType?: string | null;
  priority?: SupportPriority;
}

export interface AddSupportMessageInput {
  message: string;
}

export interface UpdateTicketStatusInput {
  status: SupportTicketStatus;
  resolutionNotes?: string | null;
  assignedAdminName?: string | null;
  priority?: SupportPriority;
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
  search?: string;
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
}

export interface SupportTicketSummaryDTO {
  id: string;
  ticketNumber: string;
  passengerId: string;
  category: SupportCategory;
  subject: string;
  status: SupportTicketStatus;
  priority: SupportPriority;
  assignedAdminName: string | null;
  bookingId: string | null;
  bookingType: string | null;
  lastMessageAt: Date | string;
  resolvedAt: Date | string | null;
  closedAt: Date | string | null;
  unreadCount: number;
  latestMessage?: string;
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
}
