import { io, Socket } from 'socket.io-client';
import { buildApiUrl, resolveApiBaseUrl } from '../config/api';
import { useAuthStore } from '../stores/auth.store';

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

export interface SupportAttachmentInput {
  fileData: string;
  mimeType?: 'image/jpeg' | 'image/jpg' | 'image/png' | 'image/webp';
  originalFilename?: string;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  senderType: 'PASSENGER' | 'ADMIN' | 'SYSTEM';
  passengerId: string | null;
  adminId: string | null;
  senderName: string;
  message: string;
  readAt: string | null;
  attachments?: SupportAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface SupportTicketSummary {
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
  lastMessageAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
  unreadCount: number;
  attachmentCount?: number;
  latestMessage: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupportTicketDetail extends SupportTicketSummary {
  resolutionNotes: string | null;
  messages: SupportMessage[];
  attachments?: SupportAttachment[];
}

export interface PassengerSupportSocketHandlers {
  onConnectionChange?: (connected: boolean) => void;
  onMessageCreated?: (payload: { ticketId: string; message: SupportMessage; nextStatus?: SupportTicketStatus }) => void;
  onMessageRead?: (payload: { ticketId: string; readerType: string; readAt: string }) => void;
  onStatusChanged?: (payload: { ticketId: string; status: SupportTicketStatus }) => void;
  onTicketAssigned?: (payload: { ticketId: string; assignedAdminName: string | null }) => void;
  onTicketUpdated?: (payload: any) => void;
  onTyping?: (payload: { ticketId: string; isTyping: boolean; senderType: string; senderName: string }) => void;
  onUnreadCountUpdated?: () => void;
}

export class PassengerSupportService {
  private static getHeaders() {
    const token = useAuthStore.getState().token;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  static async createTicket(payload: {
    category: SupportCategory;
    subject: string;
    message: string;
    bookingId?: string;
    bookingType?: string;
    priority?: SupportPriority;
    attachments?: SupportAttachmentInput[];
  }): Promise<SupportTicketDetail> {
    const url = buildApiUrl('/support/tickets');
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json.message || 'Failed to create support ticket');
    }

    return json.data;
  }

  static async getMyTickets(query?: {
    status?: SupportTicketStatus;
    category?: SupportCategory;
    page?: number;
    limit?: number;
  }): Promise<{ items: SupportTicketSummary[]; total: number; page: number; totalPages: number }> {
    const queryParts: string[] = [];
    if (query?.status) queryParts.push(`status=${encodeURIComponent(query.status)}`);
    if (query?.category) queryParts.push(`category=${encodeURIComponent(query.category)}`);
    if (query?.page) queryParts.push(`page=${query.page}`);
    if (query?.limit) queryParts.push(`limit=${query.limit}`);

    const qs = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    const url = buildApiUrl(`/support/tickets${qs}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json.message || 'Failed to retrieve support tickets');
    }

    return json.data;
  }

  static async getTicketDetail(ticketId: string): Promise<SupportTicketDetail> {
    const url = buildApiUrl(`/support/tickets/${encodeURIComponent(ticketId)}`);
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json.message || 'Failed to load ticket conversation');
    }

    return json.data;
  }

  static async replyTicket(
    ticketId: string,
    message: string,
    attachments?: SupportAttachmentInput[]
  ): Promise<SupportMessage> {
    const url = buildApiUrl(`/support/tickets/${encodeURIComponent(ticketId)}/messages`);
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        message,
        ...(attachments?.length ? { attachments } : {}),
      }),
    });

    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json.message || 'Failed to send reply');
    }

    return json.data;
  }

  static async markTicketRead(ticketId: string): Promise<void> {
    const url = buildApiUrl(`/support/tickets/${encodeURIComponent(ticketId)}/read`);
    await fetch(url, {
      method: 'PATCH',
      headers: this.getHeaders(),
    });
  }

  static async reopenTicket(ticketId: string, reason?: string): Promise<SupportTicketDetail> {
    const url = buildApiUrl(`/support/tickets/${encodeURIComponent(ticketId)}/reopen`);
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(reason ? { reason } : {}),
    });

    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json.message || 'Failed to reopen ticket');
    }

    return json.data;
  }

  static connectSocket(handlers: PassengerSupportSocketHandlers): Socket | null {
    const token = useAuthStore.getState().token;
    if (!token) return null;

    const socket = io(resolveApiBaseUrl(), {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
    });

    socket.on('connect', () => handlers.onConnectionChange?.(true));
    socket.on('disconnect', () => handlers.onConnectionChange?.(false));
    socket.on('connect_error', () => handlers.onConnectionChange?.(false));

    socket.on('support:message_created', (payload: any) => {
      if (payload?.ticketId && payload?.message) {
        handlers.onMessageCreated?.(payload);
      }
    });
    socket.on('support:message_read', (payload: any) => handlers.onMessageRead?.(payload));
    socket.on('support:ticket_status_changed', (payload: any) => handlers.onStatusChanged?.(payload));
    socket.on('support:ticket_assigned', (payload: any) => handlers.onTicketAssigned?.(payload));
    socket.on('support:ticket_updated', (payload: any) => handlers.onTicketUpdated?.(payload));
    socket.on('support:typing', (payload: any) => handlers.onTyping?.(payload));
    socket.on('support:unread_count_updated', () => handlers.onUnreadCountUpdated?.());

    return socket;
  }
}
