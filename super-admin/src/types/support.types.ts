/**
 * Support Ticket & Help Center Type Definitions
 */

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_RESPONSE' | 'RESOLVED' | 'CLOSED';
export type TicketCategory = 'TRIP_ISSUE' | 'PAYMENT_DISPUTE' | 'ACCOUNT_ACCESS' | 'HOTEL_BOOKING' | 'HERITAGE_TOUR' | 'SAFETY_CONCERN';

export interface TicketMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'PASSENGER' | 'DRIVER' | 'ADMIN' | 'SUPPORT_AGENT';
  message: string;
  attachments?: string[];
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  ticketReference: string; // e.g. "TKT-5521"
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
  assignedAdminId?: string;
  assignedAdminName?: string;
  
  relatedEntityId?: string; // e.g. Ride ID or Booking Reference
  relatedEntityType?: 'RIDE' | 'HOTEL_BOOKING' | 'HERITAGE_BOOKING';
  
  messages: TicketMessage[];
  
  createdAt: string;
  updatedAt: string;
}

export interface SupportFilterParams {
  search?: string;
  status?: string;
  priority?: string;
  category?: string;
  assignedAdminId?: string;
  page?: number;
  limit?: number;
}
