import rateLimit from 'express-rate-limit';
import { env } from '../../config/env';
import { ApiResponse } from '../response/apiResponse';

export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    ApiResponse.error(
      res,
      'TOO_MANY_REQUESTS',
      'Too many requests from this IP address, please try again later.',
      429,
      { retryAfterMs: env.RATE_LIMIT_WINDOW_MS }
    );
  },
});

