import { SupportTicket, SupportFilterParams, TicketStatus, PaginatedResult } from '../types';
import { mockSupportTickets } from './mockData/support.mock';

let ticketsStore: SupportTicket[] = [...mockSupportTickets];

export const supportService = {
  async getTickets(params: SupportFilterParams = {}): Promise<PaginatedResult<SupportTicket>> {
    await new Promise((resolve) => setTimeout(resolve, 80));

    let filtered = [...ticketsStore];

    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.ticketReference.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          t.requesterName.toLowerCase().includes(q) ||
          t.requesterEmail.toLowerCase().includes(q)
      );
    }

    if (params.status && params.status !== 'ALL') {
      filtered = filtered.filter((t) => t.status === params.status);
    }

    if (params.priority && params.priority !== 'ALL') {
      filtered = filtered.filter((t) => t.priority === params.priority);
    }

    if (params.category && params.category !== 'ALL') {
      filtered = filtered.filter((t) => t.category === params.category);
    }

    const page = params.page || 1;
    const limit = params.limit || 10;
    const startIndex = (page - 1) * limit;
    const paginatedItems = filtered.slice(startIndex, startIndex + limit);

    return {
      items: paginatedItems,
      total: filtered.length,
      page,
      limit,
      totalPages: Math.ceil(filtered.length / limit) || 1,
    };
  },

  async getTicketById(id: string): Promise<SupportTicket | null> {
    await new Promise((resolve) => setTimeout(resolve, 60));
    return ticketsStore.find((t) => t.id === id || t.ticketReference === id) || null;
  },

  async updateTicketStatus(id: string, status: TicketStatus): Promise<SupportTicket> {
    await new Promise((resolve) => setTimeout(resolve, 80));
    const index = ticketsStore.findIndex((t) => t.id === id);
    if (index === -1) throw new Error('Ticket not found');

    const updated: SupportTicket = {
      ...ticketsStore[index],
      status,
      updatedAt: new Date().toISOString(),
    };
    ticketsStore[index] = updated;
    return updated;
  },

  async assignAdmin(id: string, adminId: string, adminName: string): Promise<SupportTicket> {
    await new Promise((resolve) => setTimeout(resolve, 80));
    const index = ticketsStore.findIndex((t) => t.id === id);
    if (index === -1) throw new Error('Ticket not found');

    const updated: SupportTicket = {
      ...ticketsStore[index],
      assignedAdminId: adminId,
      assignedAdminName: adminName,
      updatedAt: new Date().toISOString(),
    };
    ticketsStore[index] = updated;
    return updated;
  },

  async replyToTicket(
    id: string,
    message: string,
    senderRole: 'ADMIN' | 'SUPPORT_AGENT' = 'ADMIN',
    senderId: string = 'adm_001',
    senderName: string = 'Super Administrator'
  ): Promise<SupportTicket> {
    await new Promise((resolve) => setTimeout(resolve, 90));
    const index = ticketsStore.findIndex((t) => t.id === id);
    if (index === -1) throw new Error('Ticket not found');

    const newMessage = {
      id: `msg_${Date.now()}`,
      senderId,
      senderName,
      senderRole,
      message,
      createdAt: new Date().toISOString(),
    };

    const updated: SupportTicket = {
      ...ticketsStore[index],
      messages: [...ticketsStore[index].messages, newMessage],
      status: ticketsStore[index].status === 'OPEN' ? 'IN_PROGRESS' : ticketsStore[index].status,
      updatedAt: new Date().toISOString(),
    };
    ticketsStore[index] = updated;
    return updated;
  },
};
