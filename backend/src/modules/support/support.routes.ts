import { Router, Request, Response } from 'express';
import { supportController } from './support.controller';
import { authenticateToken, requireRole } from '../../core/middleware/auth.middleware';
import { ApiResponse } from '../../core/response/apiResponse';

export const supportRouter = Router();
export const adminSupportRouter = Router();

const adminAuth = [authenticateToken, requireRole(['ADMIN', 'SUPER_ADMIN'])];

// Status probe
supportRouter.get('/status', (_req: Request, res: Response) => {
  ApiResponse.success(
    res,
    {
      module: 'support',
      status: 'operational',
      features: [
        'passenger_ticket_creation',
        'conversational_message_threading',
        'super_admin_inbox',
        'status_state_machine',
        'html_admin_portal',
      ],
    },
    'Support service is operational'
  );
});

// ============================================================================
// PASSENGER ENDPOINTS (Authenticated Passenger)
// ============================================================================
supportRouter.post('/tickets', authenticateToken, (req: Request, res: Response) =>
  supportController.createTicket(req, res)
);

supportRouter.get('/tickets', authenticateToken, (req: Request, res: Response) =>
  supportController.listPassengerTickets(req, res)
);

supportRouter.get('/tickets/:id', authenticateToken, (req: Request, res: Response) =>
  supportController.getPassengerTicket(req, res)
);

supportRouter.post('/tickets/:id/messages', authenticateToken, (req: Request, res: Response) =>
  supportController.addPassengerMessage(req, res)
);

// ============================================================================
// SUPER ADMIN ENDPOINTS (Protected by RBAC)
// ============================================================================

// HTML Dashboard Portal
supportRouter.get('/admin/dashboard', (req: Request, res: Response) =>
  supportController.renderDashboard(req, res)
);
adminSupportRouter.get('/dashboard', (req: Request, res: Response) =>
  supportController.renderDashboard(req, res)
);
adminSupportRouter.get('/', (req: Request, res: Response) =>
  supportController.renderDashboard(req, res)
);

// Overview statistics
supportRouter.get('/admin/overview', adminAuth, (req: Request, res: Response) =>
  supportController.getAdminOverview(req, res)
);
adminSupportRouter.get('/overview', adminAuth, (req: Request, res: Response) =>
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

