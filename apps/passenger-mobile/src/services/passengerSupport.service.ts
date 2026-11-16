import { API_CONFIG, buildApiUrl } from '../config/api';
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

export interface SupportMessage {
  id: string;
  ticketId: string;
  senderType: 'PASSENGER' | 'ADMIN';
  passengerId: string | null;
  adminId: string | null;
  senderName: string;
  message: string;
  readAt: string | null;
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
  latestMessage: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupportTicketDetail extends SupportTicketSummary {
  resolutionNotes: string | null;
  messages: SupportMessage[];
}

export interface CreateTicketParams {
  category: SupportCategory;
  subject: string;
  message: string;
  bookingId?: string | null;
  bookingType?: string | null;
  priority?: SupportPriority;
}

export class PassengerSupportService {
  private static getHeaders(): Record<string, string> {
    const token = useAuthStore.getState().token;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  /**
   * Create a new support ticket with an initial passenger message.
   */
  static async createTicket(params: CreateTicketParams): Promise<SupportTicketDetail> {
    const url = buildApiUrl('/support/tickets');
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(params),
    });

    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json.message || 'Failed to submit support request');
    }

    return json.data;
  }

  /**
   * List support tickets filed by the currently authenticated passenger.
   */
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

  /**
   * Retrieve ticket details with full message history and mark unread admin responses as read.
   */
  static async getTicketDetail(ticketId: string): Promise<SupportTicketDetail> {
    const url = buildApiUrl(`/support/tickets/${ticketId}`);
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

  /**
   * Send a passenger reply to an existing open support ticket.
   */
  static async replyTicket(ticketId: string, message: string): Promise<SupportMessage> {
    const url = buildApiUrl(`/support/tickets/${ticketId}/messages`);
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ message }),
    });

    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json.message || 'Failed to send reply');
    }

    return json.data;
  }
}

