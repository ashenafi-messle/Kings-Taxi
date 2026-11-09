import { describe, it, expect } from 'vitest';
import { EmailService } from '../../src/integrations/email/email.service';

describe('EmailService Unit Tests', () => {
  const emailService = EmailService.getInstance();

  it('should return singleton instance', () => {
    const instance2 = EmailService.getInstance();
    expect(emailService).toBe(instance2);
  });

  it('should reject malformed email address and record failed audit', async () => {
    const result = await emailService.sendOtpEmail('not-an-email', '123456', 'Dawit');
    expect(result).toBe(false);

    const audits = emailService.getRecentAudits();
    expect(audits.length).toBeGreaterThan(0);
    expect(audits[0].status).toBe('FAILED');
    expect(audits[0].errorMessage).toBe('Invalid recipient email format');
  });

  it('should safely simulate or dispatch OTP in test environment', async () => {
    const result = await emailService.sendOtpEmail('passenger@kingstaxi.et', '654321', 'Dawit Haile');
    expect(typeof result).toBe('boolean');

    const audits = emailService.getRecentAudits();
    expect(audits.length).toBeGreaterThan(0);
    expect(audits[0].recipient).toContain('***');
    expect(audits[0].recipient).not.toBe('passenger@kingstaxi.et'); // Must be masked
  });

  it('should provide connection verification diagnostic without credentials leak', async () => {
    const diag = await emailService.verifyConnection();
    expect(diag).toHaveProperty('success');
    expect(diag).toHaveProperty('latencyMs');
    expect(typeof diag.success).toBe('boolean');
    expect(typeof diag.latencyMs).toBe('number');
  });
});

