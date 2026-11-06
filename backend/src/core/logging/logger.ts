import pino from 'pino';
import { env } from '../../config/env';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'passwordHash',
      'passwordSalt',
      'token',
      'accessToken',
      'refreshToken',
      'code',
      'otp',
      'otpHash',
      'DATABASE_URL',
      'JWT_ACCESS_SECRET',
      'JWT_REFRESH_SECRET',
      'CHAPA_SECRET_KEY',
      'TELEGRAM_BOT_TOKEN',
    ],
    remove: true,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
});

