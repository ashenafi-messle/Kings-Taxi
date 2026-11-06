import { Router } from 'express';
import { HealthController } from './health.controller';

export const healthRouter = Router();

healthRouter.get('/health', HealthController.getHealth);
healthRouter.get('/health/live', HealthController.getLive);
healthRouter.get('/health/ready', HealthController.getReady);

