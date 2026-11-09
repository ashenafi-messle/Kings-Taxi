import nodemailer, { Transporter } from 'nodemailer';
import { IEmailProvider } from './index';
import { logger } from '../../core/logging/logger';
import { env } from '../../config/env';

export interface EmailDeliveryAudit {
  id: string;
  recipient: string; // masked
  purpose: string;
  status: 'SUCCESS' | 'FAILED' | 'SIMULATED';
  timestamp: string;
  durationMs: number;
  errorMessage?: string;
}

export class EmailService implements IEmailProvider {
  private static instance: EmailService;
  private transporter: Transporter | null = null;
  private recentAudits: EmailDeliveryAudit[] = [];
  private readonly maxAuditHistory = 50;

  private constructor() {
    this.initTransporter();
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private initTransporter(): void {
    if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
      logger.warn('[EmailService] SMTP credentials not fully configured; email sending will be simulated or fail.');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE, // false for port 587 (STARTTLS)
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: env.NODE_ENV === 'production',
        },
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        connectionTimeout: 10000, // 10s
        greetingTimeout: 5000,
        socketTimeout: 15000,
      });
      logger.info(
        { host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_SECURE },
        '[EmailService] Brevo SMTP Transporter initialized successfully'
      );
    } catch (err: any) {
      logger.error({ err: err.message }, '[EmailService] Failed to initialize Nodemailer transporter');
      this.transporter = null;
    }
  }

  private maskEmail(email: string): string {
    if (!email || !email.includes('@')) return '***';
    const [user, domain] = email.split('@');
    const maskedUser = user.length > 2 ? `${user[0]}***${user[user.length - 1]}` : `${user[0]}***`;
    return `${maskedUser}@${domain}`;
  }

  private recordAudit(audit: EmailDeliveryAudit): void {
    this.recentAudits.unshift(audit);
    if (this.recentAudits.length > this.maxAuditHistory) {
      this.recentAudits.pop();
    }
  }

  public getRecentAudits(): EmailDeliveryAudit[] {
    return [...this.recentAudits];
  }

  /**
   * Health check / Diagnostics: verifies SMTP connection without sending an email
   */
  public async verifyConnection(): Promise<{ success: boolean; latencyMs: number; error?: string }> {
    if (!this.transporter) {
      this.initTransporter();
    }
    if (!this.transporter) {
      return { success: false, latencyMs: 0, error: 'SMTP transporter not configured or credentials missing' };
    }

    const start = Date.now();
    try {
      await this.transporter.verify();
      const latencyMs = Date.now() - start;
      return { success: true, latencyMs };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      logger.error({ error: err.message }, '[EmailService] Brevo SMTP verification failed');
      return { success: false, latencyMs, error: err.message || 'SMTP verification failed' };
    }
  }

  /**
   * Dispatches Kings Taxi branded OTP verification email
   */
  async sendOtpEmail(to: string, otp: string, recipientName: string): Promise<boolean> {
    const startTime = Date.now();
    const maskedTo = this.maskEmail(to);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to.trim())) {
      logger.warn({ recipient: maskedTo }, '[EmailService] Invalid recipient email address');
      this.recordAudit({
        id: `aud_${Date.now()}`,
        recipient: maskedTo,
        purpose: 'OTP_VERIFICATION',
        status: 'FAILED',
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        errorMessage: 'Invalid recipient email format',
      });
      return false;
    }

    // In non-production test mode where SMTP is deliberately unconfigured, simulate safely
    if (!this.transporter && env.NODE_ENV === 'test') {
      logger.info({ recipient: maskedTo }, '[EmailService] [TEST MODE] Simulating email delivery');
      this.recordAudit({
        id: `aud_${Date.now()}`,
        recipient: maskedTo,
        purpose: 'OTP_VERIFICATION',
        status: 'SIMULATED',
        timestamp: new Date().toISOString(),
        durationMs: 5,
      });
      return true;
    }

    if (!this.transporter) {
      this.initTransporter();
    }

    if (!this.transporter) {
      logger.error({ recipient: maskedTo }, '[EmailService] Cannot send email: SMTP transporter is not initialized');
      this.recordAudit({
        id: `aud_${Date.now()}`,
        recipient: maskedTo,
        purpose: 'OTP_VERIFICATION',
        status: 'FAILED',
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        errorMessage: 'SMTP transporter not initialized',
      });
      return false;
    }

    const fromAddress = env.SMTP_FROM || 'Kings Taxi <ashenafimesele78@gmail.com>';
    const subject = `${otp} is your Kings Taxi verification code`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kings Taxi Verification Code</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #0d0f12;
      margin: 0;
      padding: 0;
      color: #e0e6ed;
    }
    .wrapper {
      max-width: 580px;
      margin: 30px auto;
      background-color: #161a22;
      border: 1px solid #2d333b;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    }
    .header {
      background: linear-gradient(135deg, #1c2128 0%, #111418 100%);
      padding: 28px 32px;
      border-bottom: 2px solid #E6B800;
      text-align: center;
    }
    .brand-title {
      color: #E6B800;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 1.5px;
      margin: 0;
      text-transform: uppercase;
    }
    .brand-sub {
      color: #8b949e;
      font-size: 13px;
      margin-top: 4px;
      letter-spacing: 0.5px;
    }
    .content {
      padding: 32px 32px 28px;
    }
    .greeting {
      font-size: 16px;
      color: #f0f6fc;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .message {
      font-size: 15px;
      line-height: 1.6;
      color: #c9d1d9;
      margin-bottom: 28px;
    }
    .otp-card {
      background: #0d1117;
      border: 2px dashed #E6B800;
      border-radius: 10px;
      padding: 24px;
      text-align: center;
      margin-bottom: 28px;
    }
    .otp-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #8b949e;
      margin-bottom: 8px;
    }
    .otp-code {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 38px;
      font-weight: 800;
      color: #E6B800;
      letter-spacing: 8px;
      margin: 0;
    }
    .expiry-note {
      font-size: 13px;
      color: #ff7b72;
      margin-top: 12px;
      font-weight: 500;
    }
    .security-notice {
      background: #1c2128;
      border-left: 4px solid #E6B800;
      border-radius: 4px;
      padding: 14px 18px;
      margin-bottom: 24px;
      font-size: 13px;
      color: #8b949e;
      line-height: 1.5;
    }
    .security-notice strong {
      color: #f0f6fc;
    }
    .footer {
      background-color: #0f1419;
      padding: 20px 32px;
      border-top: 1px solid #21262d;
      text-align: center;
      font-size: 12px;
      color: #6e7681;
      line-height: 1.5;
    }
    .footer a {
      color: #58a6ff;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="brand-title">🚕 KINGS TAXI</div>
      <div class="brand-sub">Gondar City's Premier Transportation Platform</div>
    </div>
    <div class="content">
      <p class="greeting">Hello <strong>${recipientName || 'Passenger'}</strong>,</p>
      <p class="message">
        Thank you for choosing Kings Taxi. Use the verification code below to complete your authentication.
      </p>

      <div class="otp-card">
        <div class="otp-label">Verification Code</div>
        <div class="otp-code">${otp}</div>
        <div class="expiry-note">⏱ This code expires in 5 minutes</div>
      </div>

      <div class="security-notice">
        <strong>Security Warning:</strong> Never share this verification code with anyone. Kings Taxi dispatchers, drivers, or support staff will never ask for your code.
      </div>

      <p class="message" style="margin-bottom: 0; font-size: 13px; color: #8b949e;">
        If you did not request this verification code, please ignore this email or contact Kings Taxi Gondar Passenger Support.
      </p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Kings Taxi Transport Service. Gondar, Ethiopia.<br>
      Automated system email &bull; Please do not reply directly to this message.
    </div>
  </div>
</body>
</html>
    `;

    const plainText = `
KINGS TAXI — Gondar City Passenger Verification
==================================================

Hello ${recipientName || 'Passenger'},

Your Kings Taxi verification code is:

    ${otp}

* This code expires in 5 minutes.
* SECURITY WARNING: Never share this code with anyone. Kings Taxi staff will never ask for your code.
* If you did not request this code, you can safely ignore this email.

Kings Taxi Transport Service, Gondar, Ethiopia.
    `.trim();

    try {
      const info = await this.transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        text: plainText,
        html: htmlContent,
      });

      const durationMs = Date.now() - startTime;
      logger.info(
        {
          recipient: maskedTo,
          messageId: info.messageId,
          durationMs,
        },
        '[EmailService] OTP email delivered successfully via Brevo SMTP'
      );

      this.recordAudit({
        id: info.messageId || `aud_${Date.now()}`,
        recipient: maskedTo,
        purpose: 'OTP_VERIFICATION',
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
        durationMs,
      });

      return true;
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      logger.error(
        {
          recipient: maskedTo,
          error: err.message,
          code: err.code,
          command: err.command,
          durationMs,
        },
        '[EmailService] Failed to send OTP email via Brevo SMTP'
      );

      this.recordAudit({
        id: `aud_${Date.now()}`,
        recipient: maskedTo,
        purpose: 'OTP_VERIFICATION',
        status: 'FAILED',
        timestamp: new Date().toISOString(),
        durationMs,
        errorMessage: err.message || 'SMTP dispatch error',
      });

      return false;
    }
  }

  async sendSecurityAlert(to: string, title: string, details: string): Promise<boolean> {
    const maskedTo = this.maskEmail(to);
    if (!this.transporter) {
      logger.info({ recipient: maskedTo, title }, '[EmailService] Security alert logged (transporter offline)');
      return true;
    }

    try {
      await this.transporter.sendMail({
        from: env.SMTP_FROM || 'Kings Taxi <ashenafimesele78@gmail.com>',
        to,
        subject: `[Kings Taxi Security Alert] ${title}`,
        text: `Kings Taxi Security Notice:\n\n${details}\n\nIf you did not perform this action, please secure your account immediately.`,
      });
      return true;
    } catch (err: any) {
      logger.error({ recipient: maskedTo, error: err.message }, '[EmailService] Failed to send security alert');
      return false;
    }
  }
}
