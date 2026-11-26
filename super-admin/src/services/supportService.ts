import { io, Socket } from 'socket.io-client';
import { API_BASE_URL, apiRequest } from './apiClient';
import {
  SupportTicket,
  SupportFilterParams,
  TicketStatus,
  TicketPriority,
  SupportOverviewStats,
  TicketMessage,
} from '../types/support.types';

const CATEGORY_LABELS: Record<string, string> = {
  RIDE_ISSUE: 'Ride Issue',
  BOOKING_ISSUE: 'Booking Issue',
  PAYMENT_ISSUE: 'Payment Issue',
  ACCOUNT_ISSUE: 'Account Issue',
  DRIVER_BEHAVIOR: 'Driver Behavior',
  SAFETY_CONCERN: 'Safety Concern',
  APP_TECHNICAL_ISSUE: 'App / Technical',
  OTHER: 'Other Inquiry',
};

function mapMessageDto(m: any): TicketMessage {
  return {
    id: m.id,
    senderId: m.adminId || m.passengerId || '',
    senderName: m.senderName || (m.senderType === 'ADMIN' ? 'Support Team' : 'Passenger'),
    senderRole: m.senderType === 'ADMIN' ? 'ADMIN' : m.senderType === 'SYSTEM' ? 'SYSTEM' : 'PASSENGER',
    message: m.message,
    readAt: m.readAt || null,
    attachments: Array.isArray(m.attachments) ? m.attachments : [],
    createdAt: m.createdAt,
  };
}

function mapTicketDto(dto: any): SupportTicket {
  const passenger = dto.passenger || {};
  return {
    id: dto.id,
    ticketReference: dto.ticketNumber || dto.id,
    subject: dto.subject,
    category: dto.category,
    categoryLabel: CATEGORY_LABELS[dto.category] || dto.category,
    priority: dto.priority,
    status: dto.status,
    requesterId: dto.passengerId,
    requesterName: passenger.fullName || 'Passenger',
    requesterEmail: passenger.email || '—',
    requesterPhone: passenger.phoneNumber || '—',
    requesterRole: 'PASSENGER',
    assignedAdminId: dto.assignedAdminId ?? null,
    assignedAdminName: dto.assignedAdminName ?? null,
    relatedEntityId: dto.bookingId ?? null,
    relatedEntityType: dto.bookingType ?? null,
    unreadCount: Number(dto.unreadCount ?? 0),
    attachmentCount: Number(dto.attachmentCount ?? dto.attachments?.length ?? 0),
    latestMessage: dto.latestMessage ?? '',
    resolutionNotes: dto.resolutionNotes ?? null,
    lastMessageAt: dto.lastMessageAt,
    resolvedAt: dto.resolvedAt ?? null,
    closedAt: dto.closedAt ?? null,
    messages: Array.isArray(dto.messages) ? dto.messages.map(mapMessageDto) : [],
    attachments: Array.isArray(dto.attachments) ? dto.attachments : [],
    auditLogs: Array.isArray(dto.auditLogs) ? dto.auditLogs : [],
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export interface SupportSocketHandlers {
  onConnectionChange?: (connected: boolean) => void;
  onTicketCreated?: (ticket: SupportTicket) => void;
  onTicketUpdated?: (payload: any) => void;
  onMessageCreated?: (payload: { ticketId: string; message: TicketMessage; nextStatus?: TicketStatus }) => void;
  onStatusChanged?: (payload: { ticketId: string; status: TicketStatus }) => void;
  onPriorityChanged?: (payload: { ticketId: string; priority: TicketPriority }) => void;
  onTicketAssigned?: (payload: { ticketId: string; assignedAdminId: string | null; assignedAdminName: string | null }) => void;
  onMessageRead?: (payload: { ticketId: string; readerType: string; readAt: string }) => void;
  onTyping?: (payload: { ticketId: string; isTyping: boolean; senderType: string; senderName: string }) => void;
  onUnreadCountUpdated?: () => void;
}

export const supportService = {
  async getOverview(): Promise<SupportOverviewStats> {
    const res = await apiRequest<SupportOverviewStats>('/admin/support/overview');
    if (!res.data) {
      throw new Error('Failed to load support overview');
    }
    return res.data;
  },

  async getTickets(
    params?: SupportFilterParams
  ): Promise<{ items: SupportTicket[]; total: number; page: number; limit: number; totalPages: number }> {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') query.set('status', params.status);
    if (params?.priority && params.priority !== 'ALL') query.set('priority', params.priority);
    if (params?.category && params.category !== 'ALL') query.set('category', params.category);
    if (params?.assignedAdminId) query.set('assignedAdminId', params.assignedAdminId);
    if (params?.unassignedOnly) query.set('unassignedOnly', 'true');
    if (params?.unreadOnly) query.set('unreadOnly', 'true');
    if (params?.search?.trim()) query.set('search', params.search.trim());
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));

    const qs = query.toString();
    const res = await apiRequest<{
      items: any[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`/admin/support/tickets${qs ? `?${qs}` : ''}`);

    return {
      items: (res.data?.items || []).map(mapTicketDto),
      total: res.data?.total || 0,
      page: res.data?.page || 1,
      limit: res.data?.limit || 25,
      totalPages: res.data?.totalPages || 1,
    };
  },

  async getTicketById(id: string): Promise<SupportTicket> {
    const res = await apiRequest<any>(`/admin/support/tickets/${encodeURIComponent(id)}`);
    return mapTicketDto(res.data);
  },

  async replyToTicket(
    id: string,
    message: string,
    attachments?: Array<{ fileData: string; mimeType?: string; originalFilename?: string }>
  ): Promise<TicketMessage> {
    const res = await apiRequest<any>(`/admin/support/tickets/${encodeURIComponent(id)}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        message,
        ...(attachments?.length ? { attachments } : {}),
      }),
    });
    return mapMessageDto(res.data);
  },

  async updateTicketStatus(
    id: string,
    status: TicketStatus,
    resolutionNotes?: string
  ): Promise<SupportTicket> {
    const res = await apiRequest<any>(`/admin/support/tickets/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        status,
        ...(resolutionNotes !== undefined ? { resolutionNotes } : {}),
      }),
    });
    return mapTicketDto(res.data);
  },

  async updateTicketPriority(id: string, priority: TicketPriority): Promise<SupportTicket> {
    const res = await apiRequest<any>(`/admin/support/tickets/${encodeURIComponent(id)}/priority`, {
      method: 'PATCH',
      body: JSON.stringify({ priority }),
    });
    return mapTicketDto(res.data);
  },

  async assignTicket(
    id: string,
    assignedAdminId?: string | null,
    assignedAdminName?: string | null
  ): Promise<SupportTicket> {
    const res = await apiRequest<any>(`/admin/support/tickets/${encodeURIComponent(id)}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ assignedAdminId, assignedAdminName }),
    });
    return mapTicketDto(res.data);
  },

  async markTicketRead(id: string): Promise<void> {
    await apiRequest(`/admin/support/tickets/${encodeURIComponent(id)}/read`, {
      method: 'PATCH',
    });
  },

  connectSupportSocket(handlers: SupportSocketHandlers): Socket | null {
    if (typeof window === 'undefined') return null;
    const token = window.localStorage.getItem('kt_admin_token');
    if (!token) return null;

    const socket = io(API_BASE_URL, {
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

    socket.on('support:ticket_created', (payload: any) => {
      if (payload?.ticket) {
        handlers.onTicketCreated?.(mapTicketDto(payload.ticket));
      }
    });

    socket.on('support:ticket_updated', (payload: any) => {
      handlers.onTicketUpdated?.(
        payload?.ticket ? { ...payload, ticket: mapTicketDto(payload.ticket) } : payload
      );
    });

    socket.on('support:message_created', (payload: any) => {
      if (payload?.ticketId && payload?.message) {
        handlers.onMessageCreated?.({
          ticketId: payload.ticketId,
          message: mapMessageDto(payload.message),
          nextStatus: payload.nextStatus,
        });
      }
    });

    socket.on('support:ticket_status_changed', (payload: any) => {
      handlers.onStatusChanged?.(payload);
    });

    socket.on('support:ticket_priority_changed', (payload: any) => {
      handlers.onPriorityChanged?.(payload);
    });

    socket.on('support:ticket_assigned', (payload: any) => {
      handlers.onTicketAssigned?.(payload);
    });

    socket.on('support:message_read', (payload: any) => {
      handlers.onMessageRead?.(payload);
    });

    socket.on('support:typing', (payload: any) => {
      handlers.onTyping?.(payload);
    });

    socket.on('support:unread_count_updated', () => {
      handlers.onUnreadCountUpdated?.();
    });

    return socket;
  },
};
