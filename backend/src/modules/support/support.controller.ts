import { Request, Response } from 'express';
import { supportService } from './support.service';
import {
  createTicketSchema,
  addMessageSchema,
  updateTicketStatusSchema,
  passengerQuerySchema,
  adminQuerySchema,
} from './support.validation';
import { renderAdminSupportDashboardHtml } from './adminSupportDashboard';
import { ApiResponse } from '../../core/response/apiResponse';
import { logger } from '../../core/logging/logger';
import { AppError } from '../../core/errors/appError';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function handleSupportError(res: Response, err: any, defaultMessage: string) {
  const name = String(err?.name || '');
  const msg = String(err?.message || '');
  const code = String(err?.code || '');

  const isDbDown =
    name.includes('PrismaClientInitializationError') ||
    name.includes('PrismaClientRustPanicError') ||
    code === 'P1001' ||
    code === 'P1002' ||
    code === 'P1003' ||
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT' ||
    code === 'EADDRNOTAVAIL' ||
    code === 'EHOSTUNREACH' ||
    msg.includes("Can't reach database server") ||
    msg.includes('connection timed out') ||
    msg.includes('Connection refused') ||
    msg.includes('connect ECONNREFUSED') ||
    msg.includes('connect ETIMEDOUT');

  if (isDbDown) {
    ApiResponse.error(
      res,
      'DEPENDENCY_UNAVAILABLE',
      'PostgreSQL database server at 127.0.0.1:5433 is unreachable. Ensure the SSH tunnel is active.',
      503
    );
    return;
  }

  if (code === 'P2023') {
    ApiResponse.error(res, 'INVALID_IDENTIFIER', 'Invalid UUID or query identifier format', 400);
    return;
  }

  if (code === 'P2025') {
    ApiResponse.error(res, 'NOT_FOUND', 'Requested support ticket was not found', 404);
    return;
  }

  if (err instanceof AppError) {
    ApiResponse.error(res, err.code, err.message, err.statusCode);
    return;
  }

  logger.error({ err }, `[SupportController] ${defaultMessage}: ${msg}`);
  ApiResponse.error(res, 'INTERNAL_SERVER_ERROR', defaultMessage, 500);
}

export class SupportController {
  // ============================================================================
  // PASSENGER ENDPOINTS
  // ============================================================================

  /**
   * POST /api/v1/support/tickets
   */
  async createTicket(req: Request, res: Response): Promise<void> {
    try {
      const passengerId = req.user?.sub;
      if (!passengerId) {
        ApiResponse.error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const parseResult = createTicketSchema.safeParse(req.body);
      if (!parseResult.success) {
        ApiResponse.error(
          res,
          'VALIDATION_ERROR',
          parseResult.error.errors[0]?.message || 'Invalid input data',
          400,
          parseResult.error.flatten()
        );
        return;
      }

      const ticket = await supportService.createPassengerTicket(passengerId, parseResult.data);
      ApiResponse.success(res, ticket, 'Support ticket created successfully', 201);
    } catch (err: any) {
      handleSupportError(res, err, 'Failed to create support ticket');
    }
  }

  /**
   * GET /api/v1/support/tickets
   */
  async listPassengerTickets(req: Request, res: Response): Promise<void> {
    try {
      const passengerId = req.user?.sub;
      if (!passengerId) {
        ApiResponse.error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const parseResult = passengerQuerySchema.safeParse(req.query);
      if (!parseResult.success) {
        ApiResponse.error(
          res,
          'VALIDATION_ERROR',
          parseResult.error.errors[0]?.message || 'Invalid query parameters',
          400
        );
        return;
      }

      const result = await supportService.listPassengerTickets(passengerId, parseResult.data);
      ApiResponse.success(res, result, 'Passenger support tickets retrieved successfully');
    } catch (err: any) {
      handleSupportError(res, err, 'Failed to list support tickets');
    }
  }

  /**
   * GET /api/v1/support/tickets/:id
   */
  async getPassengerTicket(req: Request, res: Response): Promise<void> {
    try {
      const passengerId = req.user?.sub;
      if (!passengerId) {
        ApiResponse.error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const ticketId = req.params.id;
      if (!ticketId || !UUID_REGEX.test(ticketId)) {
        ApiResponse.error(res, 'VALIDATION_ERROR', 'A valid ticket UUID is required', 400);
        return;
      }

      const ticket = await supportService.getPassengerTicket(passengerId, ticketId);
      ApiResponse.success(res, ticket, 'Ticket retrieved successfully');
    } catch (err: any) {
      handleSupportError(res, err, 'Failed to retrieve support ticket');
    }
  }

  /**
   * POST /api/v1/support/tickets/:id/messages
   */
  async addPassengerMessage(req: Request, res: Response): Promise<void> {
    try {
      const passengerId = req.user?.sub;
      if (!passengerId) {
        ApiResponse.error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const ticketId = req.params.id;
      if (!ticketId || !UUID_REGEX.test(ticketId)) {
        ApiResponse.error(res, 'VALIDATION_ERROR', 'A valid ticket UUID is required', 400);
        return;
      }

      const parseResult = addMessageSchema.safeParse(req.body);
      if (!parseResult.success) {
        ApiResponse.error(
          res,
          'VALIDATION_ERROR',
          parseResult.error.errors[0]?.message || 'Invalid message',
          400
        );
        return;
      }

      const message = await supportService.addPassengerMessage(
        passengerId,
        ticketId,
        parseResult.data
      );
      ApiResponse.success(res, message, 'Message added successfully', 201);
    } catch (err: any) {
      handleSupportError(res, err, 'Failed to send message');
    }
  }

  // ============================================================================
  // SUPER ADMIN ENDPOINTS
  // ============================================================================

  /**
   * GET /api/v1/support/admin/overview
   */
  async getAdminOverview(_req: Request, res: Response): Promise<void> {
    try {
      const overview = await supportService.getAdminOverview();
      ApiResponse.success(res, overview, 'Admin support overview retrieved successfully');
    } catch (err: any) {
      handleSupportError(res, err, 'Failed to retrieve admin overview');
    }
  }

  /**
   * GET /api/v1/support/admin/tickets
   */
  async listAdminTickets(req: Request, res: Response): Promise<void> {
    try {
      const parseResult = adminQuerySchema.safeParse(req.query);
      if (!parseResult.success) {
        ApiResponse.error(
          res,
          'VALIDATION_ERROR',
          parseResult.error.errors[0]?.message || 'Invalid query parameters',
          400
        );
        return;
      }

      const result = await supportService.listAdminTickets(parseResult.data);
      ApiResponse.success(res, result, 'Admin tickets retrieved successfully');
    } catch (err: any) {
      handleSupportError(res, err, 'Failed to retrieve tickets');
    }
  }

  /**
   * GET /api/v1/support/admin/tickets/:id
   */
  async getAdminTicket(req: Request, res: Response): Promise<void> {
    try {
      const ticketId = req.params.id;
      if (!ticketId || !UUID_REGEX.test(ticketId)) {
        ApiResponse.error(res, 'VALIDATION_ERROR', 'A valid ticket UUID is required', 400);
        return;
      }

      const ticket = await supportService.getAdminTicket(ticketId);
      ApiResponse.success(res, ticket, 'Admin ticket retrieved successfully');
    } catch (err: any) {
      handleSupportError(res, err, 'Failed to retrieve ticket');
    }
  }

  /**
   * POST /api/v1/support/admin/tickets/:id/messages
   */
  async addAdminMessage(req: Request, res: Response): Promise<void> {
    try {
      const adminId = req.user?.sub || 'system-admin';
      const adminName = (req.user as any)?.name || (req.user as any)?.email || 'Super Admin';

      const ticketId = req.params.id;
      if (!ticketId || !UUID_REGEX.test(ticketId)) {
        ApiResponse.error(res, 'VALIDATION_ERROR', 'A valid ticket UUID is required', 400);
        return;
      }

      const parseResult = addMessageSchema.safeParse(req.body);
      if (!parseResult.success) {
        ApiResponse.error(
          res,
          'VALIDATION_ERROR',
          parseResult.error.errors[0]?.message || 'Invalid message',
          400
        );
        return;
      }

      const message = await supportService.addAdminMessage(
        adminId,
        adminName,
        ticketId,
        parseResult.data
      );
      ApiResponse.success(res, message, 'Admin reply sent successfully', 201);
    } catch (err: any) {
      handleSupportError(res, err, 'Failed to send admin reply');
    }
  }

  /**
   * PATCH /api/v1/support/admin/tickets/:id/status
   */
  async updateTicketStatus(req: Request, res: Response): Promise<void> {
    try {
      const adminId = req.user?.sub || 'system-admin';
      const adminName = (req.user as any)?.name || (req.user as any)?.email || 'Super Admin';

      const ticketId = req.params.id;
      if (!ticketId || !UUID_REGEX.test(ticketId)) {
        ApiResponse.error(res, 'VALIDATION_ERROR', 'A valid ticket UUID is required', 400);
        return;
      }

      const parseResult = updateTicketStatusSchema.safeParse(req.body);
      if (!parseResult.success) {
        ApiResponse.error(
          res,
          'VALIDATION_ERROR',
          parseResult.error.errors[0]?.message || 'Invalid status data',
          400
        );
        return;
      }

      const updated = await supportService.updateTicketStatus(
        adminId,
        ticketId,
        {
          ...parseResult.data,
          assignedAdminName: parseResult.data.assignedAdminName || adminName,
        }
      );
      ApiResponse.success(res, updated, 'Ticket status updated successfully');
    } catch (err: any) {
      handleSupportError(res, err, 'Failed to update ticket status');
    }
  }

  /**
   * GET /admin/support or /api/v1/support/admin/dashboard
   * Serves the HTML Super Admin Support Portal.
   */
  renderDashboard(_req: Request, res: Response): void {
    const html = renderAdminSupportDashboardHtml();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  }
}

export const supportController = new SupportController();

