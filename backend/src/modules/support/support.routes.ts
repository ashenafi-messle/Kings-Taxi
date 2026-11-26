import { Router, Request, Response } from 'express';
import { supportController } from './support.controller';
import { authenticateToken, requireRole } from '../../core/middleware/auth.middleware';
import { ApiResponse } from '../../core/response/apiResponse';

export const supportRouter = Router();
export const adminSupportRouter = Router();

const passengerAuth = [authenticateToken, requireRole(['PASSENGER'])];
const adminAuth = [authenticateToken, requireRole(['ADMIN', 'SUPER_ADMIN'])];

// Status probe
supportRouter.get('/status', (_req: Request, res: Response) => {
  ApiResponse.success(
    res,
    {
      module: 'support',
      status: 'operational',
      realtime: 'socket.io',
      features: [
        'passenger_ticket_creation',
        'conversational_message_threading',
        'cloudinary_attachments',
        'super_admin_inbox',
        'status_state_machine',
        'realtime_chat_typing_read_receipts',
      ],
    },
    'Support service is operational'
  );
});

// ============================================================================
// PASSENGER ENDPOINTS (Authenticated Passenger)
// ============================================================================
supportRouter.post('/tickets', passengerAuth, (req: Request, res: Response) =>
  supportController.createTicket(req, res)
);

supportRouter.get('/tickets', passengerAuth, (req: Request, res: Response) =>
  supportController.listPassengerTickets(req, res)
);

supportRouter.get('/tickets/:id', passengerAuth, (req: Request, res: Response) =>
  supportController.getPassengerTicket(req, res)
);

supportRouter.get('/tickets/:id/messages', passengerAuth, (req: Request, res: Response) =>
  supportController.getPassengerTicketMessages(req, res)
);

supportRouter.post('/tickets/:id/messages', passengerAuth, (req: Request, res: Response) =>
  supportController.addPassengerMessage(req, res)
);

supportRouter.patch('/tickets/:id/read', passengerAuth, (req: Request, res: Response) =>
  supportController.markPassengerTicketRead(req, res)
);

supportRouter.post('/tickets/:id/attachments', passengerAuth, (req: Request, res: Response) =>
  supportController.uploadPassengerAttachment(req, res)
);

supportRouter.post('/tickets/:id/reopen', passengerAuth, (req: Request, res: Response) =>
  supportController.reopenPassengerTicket(req, res)
);

// ============================================================================
// SUPER ADMIN ENDPOINTS (Protected by RBAC)
// ============================================================================

supportRouter.get('/admin/dashboard', (req: Request, res: Response) =>
  supportController.renderDashboard(req, res)
);
adminSupportRouter.get('/dashboard', (req: Request, res: Response) =>
  supportController.renderDashboard(req, res)
);
adminSupportRouter.get('/', (req: Request, res: Response) =>
  supportController.renderDashboard(req, res)
);

// Overview & statistics
supportRouter.get('/admin/overview', adminAuth, (req: Request, res: Response) =>
  supportController.getAdminOverview(req, res)
);
adminSupportRouter.get('/overview', adminAuth, (req: Request, res: Response) =>
  supportController.getAdminOverview(req, res)
);
supportRouter.get('/admin/statistics', adminAuth, (req: Request, res: Response) =>
  supportController.getAdminOverview(req, res)
);
adminSupportRouter.get('/statistics', adminAuth, (req: Request, res: Response) =>
  supportController.getAdminOverview(req, res)
);

// Ticket management
supportRouter.get('/admin/tickets', adminAuth, (req: Request, res: Response) =>
  supportController.listAdminTickets(req, res)
);
adminSupportRouter.get('/tickets', adminAuth, (req: Request, res: Response) =>
  supportController.listAdminTickets(req, res)
);

supportRouter.get('/admin/tickets/:id', adminAuth, (req: Request, res: Response) =>
  supportController.getAdminTicket(req, res)
);
adminSupportRouter.get('/tickets/:id', adminAuth, (req: Request, res: Response) =>
  supportController.getAdminTicket(req, res)
);

supportRouter.get('/admin/tickets/:id/messages', adminAuth, (req: Request, res: Response) =>
  supportController.getAdminTicketMessages(req, res)
);
adminSupportRouter.get('/tickets/:id/messages', adminAuth, (req: Request, res: Response) =>
  supportController.getAdminTicketMessages(req, res)
);

supportRouter.post('/admin/tickets/:id/messages', adminAuth, (req: Request, res: Response) =>
  supportController.addAdminMessage(req, res)
);
adminSupportRouter.post('/tickets/:id/messages', adminAuth, (req: Request, res: Response) =>
  supportController.addAdminMessage(req, res)
);

supportRouter.patch('/admin/tickets/:id/status', adminAuth, (req: Request, res: Response) =>
  supportController.updateTicketStatus(req, res)
);
adminSupportRouter.patch('/tickets/:id/status', adminAuth, (req: Request, res: Response) =>
  supportController.updateTicketStatus(req, res)
);

supportRouter.patch('/admin/tickets/:id/priority', adminAuth, (req: Request, res: Response) =>
  supportController.updateTicketPriority(req, res)
);
adminSupportRouter.patch('/tickets/:id/priority', adminAuth, (req: Request, res: Response) =>
  supportController.updateTicketPriority(req, res)
);

supportRouter.patch('/admin/tickets/:id/assign', adminAuth, (req: Request, res: Response) =>
  supportController.assignAdminTicket(req, res)
);
adminSupportRouter.patch('/tickets/:id/assign', adminAuth, (req: Request, res: Response) =>
  supportController.assignAdminTicket(req, res)
);

supportRouter.patch('/admin/tickets/:id/read', adminAuth, (req: Request, res: Response) =>
  supportController.markAdminTicketRead(req, res)
);
adminSupportRouter.patch('/tickets/:id/read', adminAuth, (req: Request, res: Response) =>
  supportController.markAdminTicketRead(req, res)
);
