import { Router, Request, Response } from 'express';
import { ApiResponse } from '../../core/response/apiResponse';

/**
 * Kings Taxi — Push & In-App Notification Module
 *
 * Responsibilities:
 * - Real-time trip status push notifications (Expo Push / FCM)
 * - Security alerts (new device login, password changed)
 * - Multilingual template localization (Amharic, English, Tigrinya, Afaan Oromoo)
 */

export const notificationRouter = Router();

notificationRouter.get('/status', (_req: Request, res: Response) => {
  ApiResponse.success(
    res,
    {
      module: 'notifications',
      status: 'operational',
      description: 'Push notification dispatch and multilingual alert services',
    },
    'Notification service status operational'
  );
});

export interface INotificationService {
  // Subsequent phase contract
}
