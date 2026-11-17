import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('OTP Verification Security & Native Reliability Audits', () => {
  const verifyOtpPath = path.resolve(__dirname, '../../app/(auth)/verify-otp.tsx');
  const registerPath = path.resolve(__dirname, '../../app/(auth)/register.tsx');
  const forgotPasswordPath = path.resolve(__dirname, '../../app/(auth)/forgot-password.tsx');
  const authServicePath = path.resolve(__dirname, '../services/auth.service.ts');
  const authStorePath = path.resolve(__dirname, '../stores/auth.store.ts');
  const authTypesPath = path.resolve(__dirname, '../types/auth.types.ts');

  it('1. verify-otp.tsx must NOT contain any devOtp, devBanner, or devHintBox references', () => {
    const content = fs.readFileSync(verifyOtpPath, 'utf-8');
    expect(content).not.toContain('devOtp');
    expect(content).not.toContain('devBanner');
    expect(content).not.toContain('devHintBox');
    expect(content).not.toContain('initialDevOtp');
  });

  it('2. verify-otp.tsx implements native full-coverage TextInput for Android keyboard and paste reliability', () => {
    const content = fs.readFileSync(verifyOtpPath, 'utf-8');
    expect(content).toContain('fullCoverInput');
    expect(content).toContain('pointerEvents="none"');
    expect(content).toContain('autoComplete="one-time-code"');
    expect(content).toContain('textContentType="oneTimeCode"');
    expect(content).toContain('importantForAutofill="yes"');
  });

  it('3. register.tsx and forgot-password.tsx do not pass devOtp in router params', () => {
    const regContent = fs.readFileSync(registerPath, 'utf-8');
    const fpContent = fs.readFileSync(forgotPasswordPath, 'utf-8');

    expect(regContent).not.toContain('devOtp');
    expect(fpContent).not.toContain('devOtp');
  });

  it('4. auth.store.ts and auth.types.ts do not expose devOtp in public contract', () => {
    const storeContent = fs.readFileSync(authStorePath, 'utf-8');
    const typesContent = fs.readFileSync(authTypesPath, 'utf-8');

    expect(storeContent).not.toContain('devOtp');
    expect(typesContent).not.toContain('devOtp');
  });

  it('5. auth.service.ts routes all verification through central backend', () => {
    const serviceContent = fs.readFileSync(authServicePath, 'utf-8');
    expect(serviceContent).toContain('API_CONFIG.endpoints.registerInitiate');
    expect(serviceContent).toContain('API_CONFIG.endpoints.registerVerifyOtp');
    expect(serviceContent).toContain('API_CONFIG.endpoints.registerComplete');
    expect(serviceContent).toContain('API_CONFIG.endpoints.recoveryInitiate');
    expect(serviceContent).toContain('API_CONFIG.endpoints.recoveryVerifyOtp');
  });
});
