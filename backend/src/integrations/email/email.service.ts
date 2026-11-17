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
  provider?: string;
  errorMessage?: string;
}

export class EmailService implements IEmailProvider {
  private static instance: EmailService;
  private primaryTransporter: Transporter | null = null;
  private fallbackTransporter: Transporter | null = null;
  private recentAudits: EmailDeliveryAudit[] = [];
  private readonly maxAuditHistory = 50;

  private constructor() {
    this.initTransporters();
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * Cleans and sanitizes the configured sender address, stripping any accidental surrounding quotes.
   */
  public getSenderDetails(): { name: string; email: string; full: string } {
    const raw = (env.SMTP_FROM || 'Kings Taxi <ashenafimesele78@gmail.com>')
      .replace(/^["']+|["']+$/g, '')
      .trim();
    const match = raw.match(/^(.*?)\s*<([^>]+)>$/);
    if (match) {
      return {
        name: match[1].trim() || 'Kings Taxi',
        email: match[2].trim(),
        full: raw,
      };
    }
    return {
      name: 'Kings Taxi',
      email: raw,
      full: `Kings Taxi <${raw}>`,
    };
  }

  private initTransporters(): void {
    if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
      logger.warn('[EmailService] SMTP credentials not fully configured; checking for REST API keys.');
      return;
    }

    try {
      // Primary SMTP Transporter
      this.primaryTransporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE || env.SMTP_PORT === 465,
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
        connectionTimeout: 5000, // 5s fast timeout to prevent hanging requests
        greetingTimeout: 4000,
        socketTimeout: 8000,
      });

      // If host is Brevo and port is 587, prepare alternate port 2525 fallback
      // (Render and certain cloud hosts block ports 25, 465, 587 on free tiers; Brevo accepts 2525)
      if (env.SMTP_PORT === 587 && env.SMTP_HOST.includes('brevo.com')) {
        this.fallbackTransporter = nodemailer.createTransport({
          host: env.SMTP_HOST,
          port: 2525,
          secure: false,
          auth: {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
          },
          tls: {
            rejectUnauthorized: env.NODE_ENV === 'production',
          },
          connectionTimeout: 5000,
          greetingTimeout: 4000,
          socketTimeout: 8000,
        });
      }

      logger.info(
        { host: env.SMTP_HOST, port: env.SMTP_PORT, fallbackPort: this.fallbackTransporter ? 2525 : null },
        '[EmailService] Email transporters initialized'
      );
    } catch (err: any) {
      logger.error({ err: err.message }, '[EmailService] Failed to initialize Nodemailer transporters');
      this.primaryTransporter = null;
      this.fallbackTransporter = null;
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
   * Health check / Diagnostics: verifies available email delivery channels
   */
  public async verifyConnection(): Promise<{ success: boolean; latencyMs: number; provider: string; error?: string }> {
    const start = Date.now();

    // 1. Check Brevo REST API if configured
    const brevoApiKey = env.BREVO_API_KEY || (env.SMTP_PASS?.startsWith('xkeysib-') ? env.SMTP_PASS : undefined);
    if (brevoApiKey) {
      try {
        const res = await fetch('https://api.brevo.com/v3/account', {
          headers: { 'api-key': brevoApiKey },
        });
        const latencyMs = Date.now() - start;
        if (res.ok) {
          return { success: true, latencyMs, provider: 'Brevo HTTPS REST API' };
        }
      } catch (err: any) {
        // continue to test SMTP
      }
    }

    // 2. Check Resend REST API if configured
    if (env.RESEND_API_KEY) {
      try {
        const res = await fetch('https://api.resend.com/api-keys', {
          headers: { Authorization: `Bearer ${env.RESEND_API_KEY}` },
        });
        const latencyMs = Date.now() - start;
        if (res.ok) {
          return { success: true, latencyMs, provider: 'Resend HTTPS REST API' };
        }
      } catch (err: any) {
        // continue to test SMTP
      }
    }

    // 3. Check Primary SMTP
    if (!this.primaryTransporter) {
      this.initTransporters();
    }

    if (this.primaryTransporter) {
      try {
        await this.primaryTransporter.verify();
        const latencyMs = Date.now() - start;
        return { success: true, latencyMs, provider: `SMTP (${env.SMTP_HOST}:${env.SMTP_PORT})` };
      } catch (primaryErr: any) {
        // 4. Try Fallback SMTP (port 2525) if configured
        if (this.fallbackTransporter) {
          try {
            await this.fallbackTransporter.verify();
            const latencyMs = Date.now() - start;
            return { success: true, latencyMs, provider: `SMTP Fallback (${env.SMTP_HOST}:2525)` };
          } catch (fallbackErr: any) {
            const latencyMs = Date.now() - start;
            return {
              success: false,
              latencyMs,
              provider: 'SMTP (587 & 2525)',
              error: `Primary: ${primaryErr.message}; Fallback: ${fallbackErr.message}`,
            };
          }
        }
        const latencyMs = Date.now() - start;
        return { success: false, latencyMs, provider: 'SMTP', error: primaryErr.message };
      }
    }

    return {
      success: false,
      latencyMs: 0,
      provider: 'None',
      error: 'No email provider credentials configured (SMTP or HTTPS API)',
    };
  }

  /**
   * Attempts delivery via Brevo HTTPS REST API (Port 443 — never blocked by firewalls)
   */
  private async sendViaBrevoApi(
    to: string,
    recipientName: string,
    subject: string,
    htmlContent: string,
    plainText: string
  ): Promise<boolean> {
    const apiKey = env.BREVO_API_KEY || (env.SMTP_PASS?.startsWith('xkeysib-') ? env.SMTP_PASS : undefined);
    if (!apiKey) return false;

    const sender = this.getSenderDetails();
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          sender: { name: sender.name, email: sender.email },
          to: [{ email: to, name: recipientName || 'Passenger' }],
          subject,
          htmlContent,
          textContent: plainText,
        }),
      });

      if (res.ok) {
        return true;
      }
      const err = await res.json().catch(() => ({}));
      logger.warn({ err }, '[EmailService] Brevo HTTPS REST API error response');
      return false;
    } catch (err: any) {
      logger.warn({ error: err.message }, '[EmailService] Brevo HTTPS REST API network request failed');
      return false;
    }
  }

  /**
   * Attempts delivery via Resend HTTPS REST API (Port 443)
   */
  private async sendViaResendApi(
    to: string,
    subject: string,
    htmlContent: string,
    plainText: string
  ): Promise<boolean> {
    if (!env.RESEND_API_KEY) return false;

    const sender = this.getSenderDetails();
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: sender.full,
          to: [to],
          subject,
          html: htmlContent,
          text: plainText,
        }),
      });

      return res.ok;
    } catch (err: any) {
      logger.warn({ error: err.message }, '[EmailService] Resend HTTPS REST API network request failed');
      return false;
    }
  }

  /**
   * Dispatches Kings Taxi branded OTP verification email
   */
  async sendOtpEmail(to: string, otp: string, recipientName: string): Promise<boolean> {
    const startTime = Date.now();
    const maskedTo = this.maskEmail(to);

    // 1. Validate email format
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
    if (!this.primaryTransporter && !env.BREVO_API_KEY && !env.RESEND_API_KEY && env.NODE_ENV === 'test') {
      logger.info({ recipient: maskedTo }, '[EmailService] [TEST MODE] Simulating email delivery');
      this.recordAudit({
        id: `aud_${Date.now()}`,
        recipient: maskedTo,
        purpose: 'OTP_VERIFICATION',
        status: 'SIMULATED',
        timestamp: new Date().toISOString(),
        durationMs: 5,
        provider: 'Test Simulator',
      });
      return true;
    }

    const sender = this.getSenderDetails();
    const subject = 'Kings Taxi — Verify Your Email Address';

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kings Taxi — Verify Your Email Address</title>
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
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
    }
    .header {
      background: linear-gradient(135deg, #1c2128 0%, #111418 100%);
      padding: 30px 32px 24px;
      border-bottom: 2px solid #D99A28;
      text-align: center;
    }
    .brand-title {
      color: #D99A28;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: 1.5px;
      margin: 0;
      text-transform: uppercase;
    }
    .brand-sub {
      color: #F5D69E;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 2px;
      margin-top: 6px;
      text-transform: uppercase;
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
      border: 2px dashed #D99A28;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      margin-bottom: 28px;
    }
    .otp-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #8b949e;
      margin-bottom: 10px;
    }
    .otp-code {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 40px;
      font-weight: 800;
      color: #FFC04A;
      letter-spacing: 10px;
      margin: 0;
    }
    .expiry-note {
      font-size: 13px;
      color: #F5D69E;
      margin-top: 14px;
      font-weight: 600;
    }
    .security-notice {
      background: #1c2128;
      border-left: 4px solid #D99A28;
      border-radius: 6px;
      padding: 14px 18px;
      margin-bottom: 24px;
      font-size: 13px;
      line-height: 1.5;
      color: #e0e6ed;
    }
    .footer {
      padding: 20px 32px;
      background-color: #0d1117;
      border-top: 1px solid #21262d;
      text-align: center;
      font-size: 12px;
      color: #8b949e;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="brand-title">🚕 KINGS TAXI</div>
      <div class="brand-sub">PREMIUM CLASS TRANSPORT</div>
    </div>
    <div class="content">
      <p class="greeting">Hello <strong>${recipientName || 'Passenger'}</strong>,</p>
      <p class="message">
        Thank you for choosing Kings Taxi. Use the six-digit verification code below to verify your email address and continue with your registration:
      </p>

      <div class="otp-card">
        <div class="otp-label">Verification Code</div>
        <div class="otp-code">${otp}</div>
        <div class="expiry-note">⏱ This verification code expires in 5 minutes</div>
      </div>

      <div class="security-notice">
        <strong>Security Warning:</strong> Never share this verification code with anyone. Kings Taxi dispatchers, drivers, or support staff will never ask for your code.
      </div>

      <p class="message" style="margin-bottom: 0; font-size: 13px; color: #8b949e;">
        If you did not request this verification code, please ignore this email or contact Kings Taxi Passenger Support.
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
KINGS TAXI — PREMIUM CLASS TRANSPORT
==================================================

Hello ${recipientName || 'Passenger'},

Thank you for choosing Kings Taxi. Your six-digit verification code is:

    ${otp}

* This code expires in 5 minutes.
* SECURITY WARNING: Never share this verification code with anyone. Kings Taxi staff will never ask for your code.
* If you did not request this code, you can safely ignore this email.

Kings Taxi Transport Service, Gondar, Ethiopia.
    `.trim();

    // 2. Try HTTPS REST API first if configured (immune to firewall port blocks)
    const sentViaBrevoApi = await this.sendViaBrevoApi(to, recipientName, subject, htmlContent, plainText);
    if (sentViaBrevoApi) {
      const durationMs = Date.now() - startTime;
      logger.info({ recipient: maskedTo, durationMs }, '[EmailService] OTP email delivered via Brevo HTTPS API');
      this.recordAudit({
        id: `aud_${Date.now()}`,
        recipient: maskedTo,
        purpose: 'OTP_VERIFICATION',
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
        durationMs,
        provider: 'Brevo HTTPS API',
      });
      return true;
    }

    const sentViaResendApi = await this.sendViaResendApi(to, subject, htmlContent, plainText);
    if (sentViaResendApi) {
      const durationMs = Date.now() - startTime;
      logger.info({ recipient: maskedTo, durationMs }, '[EmailService] OTP email delivered via Resend HTTPS API');
      this.recordAudit({
        id: `aud_${Date.now()}`,
        recipient: maskedTo,
        purpose: 'OTP_VERIFICATION',
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
        durationMs,
        provider: 'Resend HTTPS API',
      });
      return true;
    }

    // 3. Try Primary SMTP Transporter
    if (!this.primaryTransporter) {
      this.initTransporters();
    }

    if (this.primaryTransporter) {
      try {
        const info = await this.primaryTransporter.sendMail({
          from: sender.full,
          to,
          subject,
          text: plainText,
          html: htmlContent,
        });

        const durationMs = Date.now() - startTime;
        logger.info(
          { recipient: maskedTo, messageId: info.messageId, durationMs },
          '[EmailService] OTP email delivered successfully via primary SMTP'
        );

        this.recordAudit({
          id: info.messageId || `aud_${Date.now()}`,
          recipient: maskedTo,
          purpose: 'OTP_VERIFICATION',
          status: 'SUCCESS',
          timestamp: new Date().toISOString(),
          durationMs,
          provider: `SMTP (${env.SMTP_HOST}:${env.SMTP_PORT})`,
        });

        return true;
      } catch (primaryErr: any) {
        logger.warn(
          { recipient: maskedTo, error: primaryErr.message, code: primaryErr.code },
          '[EmailService] Primary SMTP delivery failed; checking for fallback transporter'
        );

        // 4. Try Fallback Transporter (port 2525) if available
        if (this.fallbackTransporter) {
          try {
            const info = await this.fallbackTransporter.sendMail({
              from: sender.full,
              to,
              subject,
              text: plainText,
              html: htmlContent,
            });

            const durationMs = Date.now() - startTime;
            logger.info(
              { recipient: maskedTo, messageId: info.messageId, durationMs },
              '[EmailService] OTP email delivered successfully via fallback SMTP (port 2525)'
            );

            this.recordAudit({
              id: info.messageId || `aud_${Date.now()}`,
              recipient: maskedTo,
              purpose: 'OTP_VERIFICATION',
              status: 'SUCCESS',
              timestamp: new Date().toISOString(),
              durationMs,
              provider: `SMTP Fallback (${env.SMTP_HOST}:2525)`,
            });

            return true;
          } catch (fallbackErr: any) {
            logger.error(
              { recipient: maskedTo, error: fallbackErr.message },
              '[EmailService] Fallback SMTP (port 2525) delivery also failed'
            );
          }
        }
      }
    }

    const durationMs = Date.now() - startTime;
    logger.error({ recipient: maskedTo, durationMs }, '[EmailService] All email delivery transports failed');

    this.recordAudit({
      id: `aud_${Date.now()}`,
      recipient: maskedTo,
      purpose: 'OTP_VERIFICATION',
      status: 'FAILED',
      timestamp: new Date().toISOString(),
      durationMs,
      errorMessage: 'All email delivery transports failed (SMTP and HTTPS API)',
    });

    return false;
  }

  async sendSecurityAlert(to: string, title: string, details: string): Promise<boolean> {
    const maskedTo = this.maskEmail(to);
    const sender = this.getSenderDetails();

    if (!this.primaryTransporter) {
      logger.info({ recipient: maskedTo, title }, '[EmailService] Security alert logged (transporter offline)');
      return true;
    }

    try {
      await this.primaryTransporter.sendMail({
        from: sender.full,
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
