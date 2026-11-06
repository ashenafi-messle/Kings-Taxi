import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Router } from 'express';
import { env } from './env';

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Kings Taxi Central API',
      version: '1.0.0',
      description:
        'Central Monolithic REST and Real-Time Backend for Kings Taxi (Passenger, Driver, and Admin applications initially serving Gondar City, Ethiopia).',
      contact: {
        name: 'Kings Taxi Engineering Team',
        email: 'dev@kingstaxi.et',
      },
      license: {
        name: 'Proprietary - Ardab Tech Solutions',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}${env.API_PREFIX}`,
        description: 'Local Development Server',
      },
      {
        url: `https://taxi-api.erkabskill.com${env.API_PREFIX}`,
        description: 'Staging / VPS Test Server (Zergaw VPS)',
      },
      {
        url: `https://api.kingstaxi.com${env.API_PREFIX}`,
        description: 'Production Server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Pass the short-lived JWT access token in the Authorization header.',
        },
      },
      schemas: {
        StandardSuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
            error: { type: 'null', example: null },
            meta: {
              type: 'object',
              properties: {
                timestamp: { type: 'string', format: 'date-time' },
                requestId: { type: 'string', example: 'd3b07384-d113-4638-9cf1-09852f8be8a8' },
                version: { type: 'string', example: '1.0.0' },
              },
            },
          },
        },
        StandardErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            data: { type: 'null', example: null },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string', example: 'Invalid input parameters' },
                details: { type: 'object' },
              },
            },
            meta: {
              type: 'object',
              properties: {
                timestamp: { type: 'string', format: 'date-time' },
                requestId: { type: 'string', example: 'd3b07384-d113-4638-9cf1-09852f8be8a8' },
              },
            },
          },
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'ok' },
            service: { type: 'string', example: 'kings-taxi-central-backend' },
            version: { type: 'string', example: '1.0.0' },
            uptime: { type: 'number', example: 120.45 },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        ReadinessResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'healthy' },
            service: { type: 'string', example: 'kings-taxi-central-backend' },
            checks: {
              type: 'object',
              properties: {
                database: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'up' },
                    latencyMs: { type: 'number', example: 4.2 },
                  },
                },
              },
            },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    paths: {
      '/health': {
        get: {
          summary: 'Service liveness and health overview',
          tags: ['System Health'],
          responses: {
            200: {
              description: 'Service is operational',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/StandardSuccessResponse' },
                },
              },
            },
          },
        },
      },
      '/health/live': {
        get: {
          summary: 'Kubernetes/Docker liveness probe',
          tags: ['System Health'],
          responses: {
            200: {
              description: 'Process is alive and accepting connections',
            },
          },
        },
      },
      '/health/ready': {
        get: {
          summary: 'Kubernetes/Docker readiness probe (verifies database connectivity)',
          tags: ['System Health'],
          responses: {
            200: {
              description: 'All system dependencies (PostgreSQL) are operational',
            },
            503: {
              description: 'One or more critical dependencies are down or degraded',
            },
          },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);

export const swaggerRouter = Router();
swaggerRouter.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
swaggerRouter.get('/docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

