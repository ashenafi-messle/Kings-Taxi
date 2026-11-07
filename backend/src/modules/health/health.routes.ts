import { Router } from 'express';
import { HealthController } from './health.controller';

export const healthRouter = Router();

// Standard health endpoints
healthRouter.get('/health', HealthController.getHealth);
healthRouter.get('/health/live', HealthController.getLive);
healthRouter.get('/health/ready', HealthController.getReady);

// Direct probe aliases (/api/v1/live, /api/v1/ready)
healthRouter.get('/live', HealthController.getLive);
healthRouter.get('/ready', HealthController.getReady);
