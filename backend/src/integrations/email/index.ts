/**
 * Kings Taxi — Transactional Email Provider Interface
 */

export interface IEmailProvider {
  sendOtpEmail(to: string, otp: string, recipientName: string): Promise<boolean>;
  sendSecurityAlert(to: string, title: string, details: string): Promise<boolean>;
}

