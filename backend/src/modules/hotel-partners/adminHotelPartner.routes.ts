import { Router, Request, Response } from 'express';
import { adminHotelPartnerController } from './adminHotelPartner.controller';
import { authenticateToken, requireRole } from '../../core/middleware/auth.middleware';

export const adminHotelPartnerRouter = Router();

const adminAuth = [authenticateToken, requireRole(['ADMIN', 'SUPER_ADMIN'])];

// Aggregate partner statistics
adminHotelPartnerRouter.get('/stats', adminAuth, (req: Request, res: Response) =>
  adminHotelPartnerController.getStats(req, res)
);

// Partner management CRUD
adminHotelPartnerRouter.get('/', adminAuth, (req: Request, res: Response) =>
  adminHotelPartnerController.listPartners(req, res)
);
adminHotelPartnerRouter.get('/:id', adminAuth, (req: Request, res: Response) =>
  adminHotelPartnerController.getPartnerById(req, res)
);
adminHotelPartnerRouter.post('/', adminAuth, (req: Request, res: Response) =>
  adminHotelPartnerController.createPartner(req, res)
);
adminHotelPartnerRouter.patch('/:id', adminAuth, (req: Request, res: Response) =>
  adminHotelPartnerController.updatePartner(req, res)
);
adminHotelPartnerRouter.patch('/:id/status', adminAuth, (req: Request, res: Response) =>
  adminHotelPartnerController.updatePartnerStatus(req, res)
);
adminHotelPartnerRouter.patch('/:id/verification', adminAuth, (req: Request, res: Response) =>
  adminHotelPartnerController.verifyPartner(req, res)
);
adminHotelPartnerRouter.post('/:id/documents', adminAuth, (req: Request, res: Response) =>
  adminHotelPartnerController.uploadPartnerDocument(req, res)
);
