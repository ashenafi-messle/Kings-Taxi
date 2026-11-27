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

  /**
   * Dispatches Kings Taxi branded Super Admin password reset OTP verification email
   */
  async sendAdminPasswordResetOtpEmail(to: string, otp: string, recipientName: string): Promise<boolean> {
    const startTime = Date.now();
    const maskedTo = this.maskEmail(to);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to.trim())) {
      logger.warn({ recipient: maskedTo }, '[EmailService] Invalid recipient email address for admin password reset');
      this.recordAudit({
        id: `aud_${Date.now()}`,
        recipient: maskedTo,
        purpose: 'ADMIN_PASSWORD_RESET_OTP',
        status: 'FAILED',
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        errorMessage: 'Invalid recipient email format',
      });
      return false;
    }

    if (env.NODE_ENV === 'test' || process.env.NODE_ENV === 'test') {
      logger.info({ recipient: maskedTo }, '[EmailService] [TEST MODE] Simulating admin password reset email delivery');
      this.recordAudit({
        id: `aud_${Date.now()}`,
        recipient: maskedTo,
        purpose: 'ADMIN_PASSWORD_RESET_OTP',
        status: 'SIMULATED',
        timestamp: new Date().toISOString(),
        durationMs: 5,
        provider: 'Test Simulator',
      });
      return true;
    }

    const sender = this.getSenderDetails();
    const subject = 'Kings Taxi — Password Reset Verification Code';

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kings Taxi — Password Reset Verification Code</title>
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
      <div class="brand-title">👑 KINGS TAXI</div>
      <div class="brand-sub">SUPER ADMIN PORTAL &bull; SECURITY</div>
    </div>
    <div class="content">
      <p class="greeting">Hello <strong>${recipientName || 'Administrator'}</strong>,</p>
      <p class="message">
        We received a request to reset the password for your Kings Taxi Super Admin account. Use the six-digit verification code below to authorize your password reset:
      </p>

      <div class="otp-card">
        <div class="otp-label">Password Reset Code</div>
        <div class="otp-code">${otp}</div>
        <div class="expiry-note">⏱ This verification code expires in 5 minutes</div>
      </div>

      <div class="security-notice">
        <strong>Security Warning:</strong> Never share this verification code with anyone. Kings Taxi operations, dispatch, or technical support will never ask for your code.
      </div>

      <p class="message" style="margin-bottom: 0; font-size: 13px; color: #8b949e;">
        If you did not initiate this password reset request, please ignore this email. Your existing credentials remain secure and no changes have been applied to your administrator account.
      </p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Kings Taxi Transportation & Tourism Platform.<br>
      Confidential Administrative Notification &bull; Please do not reply directly to this message.
    </div>
  </div>
</body>
</html>
    `.trim();

    const plainText = `
KINGS TAXI — SUPER ADMIN SECURITY
==================================================

Hello ${recipientName || 'Administrator'},

We received a request to reset the password for your Kings Taxi Super Admin account.
Your six-digit password reset verification code is:

    ${otp}

* This code expires in 5 minutes.
* SECURITY WARNING: Never share this verification code with anyone. Kings Taxi staff will never ask for your code.
* If you did not initiate this request, you can safely ignore this email. Your account remains secure.

Kings Taxi Transportation & Tourism Platform.
    `.trim();

    // 1. Try Brevo HTTPS REST API
    const sentViaBrevoApi = await this.sendViaBrevoApi(to, recipientName, subject, htmlContent, plainText);
    if (sentViaBrevoApi) {
      const durationMs = Date.now() - startTime;
      logger.info({ recipient: maskedTo, durationMs }, '[EmailService] Admin reset OTP email delivered via Brevo HTTPS API');
      this.recordAudit({
        id: `aud_${Date.now()}`,
        recipient: maskedTo,
        purpose: 'ADMIN_PASSWORD_RESET_OTP',
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
        durationMs,
        provider: 'Brevo HTTPS API',
      });
      return true;
    }

    // 2. Try Resend HTTPS REST API
    const sentViaResendApi = await this.sendViaResendApi(to, subject, htmlContent, plainText);
    if (sentViaResendApi) {
      const durationMs = Date.now() - startTime;
      logger.info({ recipient: maskedTo, durationMs }, '[EmailService] Admin reset OTP email delivered via Resend HTTPS API');
      this.recordAudit({
        id: `aud_${Date.now()}`,
        recipient: maskedTo,
        purpose: 'ADMIN_PASSWORD_RESET_OTP',
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
        durationMs,
        provider: 'Resend HTTPS API',
      });
      return true;
    }

    // 3. Try Primary / Fallback SMTP
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
          '[EmailService] Admin reset OTP email delivered successfully via primary SMTP'
        );

        this.recordAudit({
          id: info.messageId || `aud_${Date.now()}`,
          recipient: maskedTo,
          purpose: 'ADMIN_PASSWORD_RESET_OTP',
          status: 'SUCCESS',
          timestamp: new Date().toISOString(),
          durationMs,
          provider: `SMTP (${env.SMTP_HOST}:${env.SMTP_PORT})`,
        });

        return true;
      } catch (primaryErr: any) {
        logger.warn(
          { recipient: maskedTo, error: primaryErr.message },
          '[EmailService] Primary SMTP delivery failed for admin reset; trying fallback'
        );

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
              '[EmailService] Admin reset OTP email delivered successfully via fallback SMTP (port 2525)'
            );

            this.recordAudit({
              id: info.messageId || `aud_${Date.now()}`,
              recipient: maskedTo,
              purpose: 'ADMIN_PASSWORD_RESET_OTP',
              status: 'SUCCESS',
              timestamp: new Date().toISOString(),
              durationMs,
              provider: `SMTP Fallback (${env.SMTP_HOST}:2525)`,
            });

            return true;
          } catch (fallbackErr: any) {
            logger.error({ recipient: maskedTo, error: fallbackErr.message }, '[EmailService] Fallback SMTP failed');
          }
        }
      }
    }

    const durationMs = Date.now() - startTime;
    logger.error({ recipient: maskedTo, durationMs }, '[EmailService] All email transports failed for admin reset');

    this.recordAudit({
      id: `aud_${Date.now()}`,
      recipient: maskedTo,
      purpose: 'ADMIN_PASSWORD_RESET_OTP',
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

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Shared multi-transport email dispatch (Brevo HTTPS -> Resend HTTPS -> Primary SMTP -> Fallback SMTP)
   * without logging sensitive message bodies or credentials.
   */
  private async dispatchViaTransports(params: {
    to: string;
    recipientName: string;
    subject: string;
    htmlContent: string;
    plainText: string;
    purpose: string;
  }): Promise<{ success: boolean; provider?: string; error?: string }> {
    const startTime = Date.now();
    const maskedTo = this.maskEmail(params.to);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(params.to.trim())) {
      this.recordAudit({
        id: `aud_${Date.now()}`,
        recipient: maskedTo,
        purpose: params.purpose,
        status: 'FAILED',
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        errorMessage: 'Invalid recipient email format',
      });
      return { success: false, error: 'Invalid recipient email format' };
    }

    if (!this.primaryTransporter && !env.BREVO_API_KEY && !env.RESEND_API_KEY && env.NODE_ENV === 'test') {
      logger.info({ recipient: maskedTo, purpose: params.purpose }, '[EmailService] [TEST MODE] Simulating email delivery');
      this.recordAudit({
        id: `aud_${Date.now()}`,
        recipient: maskedTo,
        purpose: params.purpose,
        status: 'SIMULATED',
        timestamp: new Date().toISOString(),
        durationMs: 5,
        provider: 'Test Simulator',
      });
      return { success: true, provider: 'Test Simulator' };
    }

    const sender = this.getSenderDetails();

    if (await this.sendViaBrevoApi(params.to, params.recipientName, params.subject, params.htmlContent, params.plainText)) {
      const durationMs = Date.now() - startTime;
      logger.info({ recipient: maskedTo, purpose: params.purpose, durationMs }, '[EmailService] Delivered via Brevo HTTPS API');
      this.recordAudit({
        id: `aud_${Date.now()}`,
        recipient: maskedTo,
        purpose: params.purpose,
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
        durationMs,
        provider: 'Brevo HTTPS API',
      });
      return { success: true, provider: 'Brevo HTTPS API' };
    }

    if (await this.sendViaResendApi(params.to, params.subject, params.htmlContent, params.plainText)) {
      const durationMs = Date.now() - startTime;
      logger.info({ recipient: maskedTo, purpose: params.purpose, durationMs }, '[EmailService] Delivered via Resend HTTPS API');
      this.recordAudit({
        id: `aud_${Date.now()}`,
        recipient: maskedTo,
        purpose: params.purpose,
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
        durationMs,
        provider: 'Resend HTTPS API',
      });
      return { success: true, provider: 'Resend HTTPS API' };
    }

    if (!this.primaryTransporter) {
      this.initTransporters();
    }

    let lastError = 'No email provider credentials configured (SMTP or HTTPS API)';
    if (this.primaryTransporter) {
      try {
        const info = await this.primaryTransporter.sendMail({
          from: sender.full,
          to: params.to,
          subject: params.subject,
          text: params.plainText,
          html: params.htmlContent,
        });
        const durationMs = Date.now() - startTime;
        logger.info({ recipient: maskedTo, messageId: info.messageId, purpose: params.purpose, durationMs }, '[EmailService] Delivered via primary SMTP');
        this.recordAudit({
          id: info.messageId || `aud_${Date.now()}`,
          recipient: maskedTo,
          purpose: params.purpose,
          status: 'SUCCESS',
          timestamp: new Date().toISOString(),
          durationMs,
          provider: `SMTP (${env.SMTP_HOST}:${env.SMTP_PORT})`,
        });
        return { success: true, provider: `SMTP (${env.SMTP_HOST}:${env.SMTP_PORT})` };
      } catch (primaryErr: any) {
        lastError = primaryErr?.message || 'Primary SMTP failed';
        logger.warn({ recipient: maskedTo, error: lastError }, '[EmailService] Primary SMTP failed; checking fallback');

        if (this.fallbackTransporter) {
          try {
            const info = await this.fallbackTransporter.sendMail({
              from: sender.full,
              to: params.to,
              subject: params.subject,
              text: params.plainText,
              html: params.htmlContent,
            });
            const durationMs = Date.now() - startTime;
            logger.info({ recipient: maskedTo, messageId: info.messageId, purpose: params.purpose, durationMs }, '[EmailService] Delivered via fallback SMTP');
            this.recordAudit({
              id: info.messageId || `aud_${Date.now()}`,
              recipient: maskedTo,
              purpose: params.purpose,
              status: 'SUCCESS',
              timestamp: new Date().toISOString(),
              durationMs,
              provider: `SMTP Fallback (${env.SMTP_HOST}:2525)`,
            });
            return { success: true, provider: `SMTP Fallback (${env.SMTP_HOST}:2525)` };
          } catch (fallbackErr: any) {
            lastError = fallbackErr?.message || lastError;
            logger.error({ recipient: maskedTo, error: lastError }, '[EmailService] Fallback SMTP failed');
          }
        }
      }
    }

    const durationMs = Date.now() - startTime;
    logger.error({ recipient: maskedTo, purpose: params.purpose, durationMs }, '[EmailService] All email delivery transports failed');
    this.recordAudit({
      id: `aud_${Date.now()}`,
      recipient: maskedTo,
      purpose: params.purpose,
      status: 'FAILED',
      timestamp: new Date().toISOString(),
      durationMs,
      errorMessage: lastError,
    });
    return { success: false, error: lastError };
  }

  /**
   * Sends the Kings Taxi branded Driver Account Provisioning & Temporary Password onboarding email.
   * Never logs the temporary password.
   */
  async sendDriverOnboardingEmail(params: {
    to: string;
    driverName: string;
    registeredEmail: string;
    registeredPhone: string;
    temporaryPassword: string;
    expiresAt: Date;
  }): Promise<{ success: boolean; provider?: string; error?: string }> {
    const sender = this.getSenderDetails();
    const subject = 'Your Kings Taxi Driver Account Has Been Created';
    const expiryDisplay = params.expiresAt.toISOString().split('T')[0];

    const safeName = this.escapeHtml(params.driverName);
    const safeEmail = this.escapeHtml(params.registeredEmail);
    const safePhone = this.escapeHtml(params.registeredPhone);
    const safePass = this.escapeHtml(params.temporaryPassword);
    const safeSupportEmail = this.escapeHtml(sender.email);

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0d0f12; margin: 0; padding: 0; color: #e0e6ed; }
    .wrapper { max-width: 600px; margin: 28px auto; background-color: #161a22; border: 1px solid #2d333b; border-radius: 14px; overflow: hidden; box-shadow: 0 8px 28px rgba(0,0,0,0.45); }
    .header { background: linear-gradient(135deg, #1c2128 0%, #111418 100%); padding: 28px 32px 22px; border-bottom: 2px solid #D99A28; text-align: center; }
    .brand-title { color: #D99A28; font-size: 26px; font-weight: 800; letter-spacing: 1.5px; margin: 0; text-transform: uppercase; }
    .brand-sub { color: #F5D69E; font-size: 11px; font-weight: 700; letter-spacing: 2px; margin-top: 6px; text-transform: uppercase; }
    .body { padding: 30px 32px; line-height: 1.6; font-size: 15px; color: #d1d5db; }
    .cred-box { background-color: #111418; border: 1px solid #D99A28; border-radius: 10px; padding: 18px 20px; margin: 22px 0; }
    .cred-row { margin: 8px 0; font-size: 14px; }
    .cred-label { color: #9ca3af; font-weight: 600; display: inline-block; min-width: 155px; }
    .cred-value { color: #ffffff; font-weight: 700; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .pass-pill { display: inline-block; background-color: #241c0d; color: #F5D69E; border: 1px dashed #D99A28; padding: 6px 12px; border-radius: 6px; font-size: 16px; letter-spacing: 0.8px; }
    .notice { background-color: #1f1912; border-left: 3px solid #D99A28; padding: 12px 16px; border-radius: 6px; font-size: 13px; color: #f3e8d2; margin: 18px 0; }
    .footer { background-color: #111418; padding: 18px 32px; border-top: 1px solid #2d333b; text-align: center; font-size: 12px; color: #9ca3af; }
    a { color: #D99A28; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1 class="brand-title">KINGS TAXI</h1>
      <div class="brand-sub">Fleet &amp; Driver Operations • Ethiopia</div>
    </div>
    <div class="body">
      <p style="margin-top:0;font-size:17px;color:#ffffff;font-weight:700;">Welcome to Kings Taxi, ${safeName}!</p>
      <p>Your driver account has been successfully registered by the Kings Taxi administration.</p>
      <div class="cred-box">
        <div class="cred-row"><span class="cred-label">Registered Email:</span> <span class="cred-value">${safeEmail}</span></div>
        <div class="cred-row"><span class="cred-label">Registered Phone:</span> <span class="cred-value">${safePhone}</span></div>
        <div class="cred-row"><span class="cred-label">Temporary Password:</span> <span class="cred-value pass-pill">${safePass}</span></div>
        <div class="cred-row"><span class="cred-label">Credential Valid Until:</span> <span class="cred-value">${expiryDisplay}</span></div>
      </div>
      <p>Keep these credentials safe. You will use your registered email or phone number and this temporary password to access the <strong>Kings Taxi Driver App</strong> when the driver application becomes available.</p>
      <div class="notice">
        <strong>Security Notice:</strong> For security reasons, you will be required to change your temporary password when the driver authentication system is implemented and you first access your account. <strong>Never share your password with anyone</strong> — Kings Taxi staff will never ask for your password.
      </div>
      <p style="margin-bottom:0;font-size:13px;color:#9ca3af;">Need assistance? Contact Kings Taxi Fleet Support at <a href="mailto:${safeSupportEmail}">${safeSupportEmail}</a>.</p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Kings Taxi Ethiopia. All rights reserved.
    </div>
  </div>
</body>
</html>`.trim();

    const plainText = [
      `Welcome to Kings Taxi, ${params.driverName}!`,
      '',
      'Your driver account has been successfully registered by our administration.',
      '',
      'Your account login information:',
      `Registered Email: ${params.registeredEmail}`,
      `Registered Phone: ${params.registeredPhone}`,
      `Temporary Password: ${params.temporaryPassword}`,
      `Credential Valid Until: ${expiryDisplay}`,
      '',
      'Keep these credentials safe. You will use your registered email or phone number and this password to access the Kings Taxi Driver App when the driver application becomes available.',
      '',
      'For security reasons, you will be required to change your temporary password when the driver authentication system is implemented and you first access your account.',
      '',
      'Never share your password with anyone.',
      `Support Contact: ${sender.email}`,
    ].join('\n');

    return this.dispatchViaTransports({
      to: params.to,
      recipientName: params.driverName,
      subject,
      htmlContent,
      plainText,
      purpose: 'DRIVER_ONBOARDING',
    });
  }

  /**
   * Sends a 6-digit OTP for Driver Forgot-Password verification.
   * Never logs the OTP.
   */
  async sendDriverPasswordResetOtpEmail(params: {
    to: string;
    driverName: string;
    otp: string;
    expiresInMinutes?: number;
  }): Promise<{ success: boolean; provider?: string; error?: string }> {
    const sender = this.getSenderDetails();
    const ttlMin = params.expiresInMinutes ?? 10;
    const subject = 'Kings Taxi Driver — Password Reset Verification Code';

    const safeName = this.escapeHtml(params.driverName);
    const safeOtp = this.escapeHtml(params.otp);
    const safeSupportEmail = this.escapeHtml(sender.email);

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0d0f12; margin: 0; padding: 0; color: #e0e6ed; }
    .wrapper { max-width: 560px; margin: 28px auto; background-color: #161a22; border: 1px solid #2d333b; border-radius: 14px; overflow: hidden; }
    .header { background: #111418; padding: 24px 28px; border-bottom: 2px solid #D99A28; text-align: center; }
    .brand-title { color: #D99A28; font-size: 24px; font-weight: 800; letter-spacing: 1.5px; margin: 0; }
    .body { padding: 28px; line-height: 1.6; font-size: 15px; color: #d1d5db; }
    .otp-box { background-color: #111418; border: 1px dashed #D99A28; border-radius: 10px; padding: 18px; margin: 20px 0; text-align: center; }
    .otp-code { font-size: 30px; font-weight: 800; letter-spacing: 8px; color: #F5D69E; font-family: ui-monospace, monospace; }
    .footer { background-color: #111418; padding: 16px 28px; border-top: 1px solid #2d333b; text-align: center; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header"><h1 class="brand-title">KINGS TAXI DRIVER</h1></div>
    <div class="body">
      <p style="margin-top:0;color:#ffffff;font-weight:700;">Hello ${safeName},</p>
      <p>We received a request to reset your Kings Taxi Driver App password. Use the verification code below within <strong>${ttlMin} minutes</strong>:</p>
      <div class="otp-box"><span class="otp-code">${safeOtp}</span></div>
      <p style="font-size:13px;color:#9ca3af;">If you did not request this password reset, please ignore this message and never share this code with anyone. Support: ${safeSupportEmail}</p>
    </div>
    <div class="footer">&copy; ${new Date().getFullYear()} Kings Taxi Ethiopia</div>
  </div>
</body>
</html>`.trim();

    const plainText = [
      `Hello ${params.driverName},`,
      '',
      `Your Kings Taxi Driver password reset verification code is: ${params.otp}`,
      `This code expires in ${ttlMin} minutes.`,
      '',
      'Never share this code with anyone.',
      `Support: ${sender.email}`,
    ].join('\n');

    return this.dispatchViaTransports({
      to: params.to,
      recipientName: params.driverName,
      subject,
      htmlContent,
      plainText,
      purpose: 'DRIVER_PASSWORD_RESET_OTP',
    });
  }
}
