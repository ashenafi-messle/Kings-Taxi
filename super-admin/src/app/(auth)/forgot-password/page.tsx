'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Mail,
  ArrowLeft,
  Send,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  RotateCcw,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react';
import { AuthService } from '../../../services/authService';

type RecoveryStep = 'EMAIL_INPUT' | 'OTP_VERIFY' | 'SET_PASSWORD' | 'SUCCESS';

export default function ForgotPasswordPage() {
  const router = useRouter();

  // Current Step
  const [step, setStep] = useState<RecoveryStep>('EMAIL_INPUT');

  // Step 1: Email Form State
  const [email, setEmail] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Step 2: OTP Verification State
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Step 3: New Password State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Timer Countdown for OTP Resend Cooldown
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (step === 'OTP_VERIFY' && cooldownSeconds > 0) {
      setCanResend(false);
      timer = setInterval(() => {
        setCooldownSeconds((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (cooldownSeconds === 0) {
      setCanResend(true);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, cooldownSeconds]);

  // Handle Step 1: Submit Email for OTP Dispatch
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setEmailError('Please enter a valid administrator email address.');
      return;
    }

    setEmail(cleanEmail);
    setIsSendingOtp(true);
    try {
      const res = await AuthService.requestPasswordReset(cleanEmail);
      if (res.success) {
        setMaskedEmail(res.email || cleanEmail);
        setCooldownSeconds(res.resendCooldownSeconds || 60);
        setCanResend(false);
        setStep('OTP_VERIFY');
        // Reset OTP inputs
        setOtpDigits(['', '', '', '', '', '']);
        setTimeout(() => otpInputRefs.current[0]?.focus(), 150);
      } else {
        setEmailError(res.message || 'Unable to dispatch verification code. Please try again.');
      }
    } catch (err: any) {
      setEmailError(err.message || 'Error communicating with central authentication service.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Handle Step 2: Resend OTP
  const handleResendOtp = async () => {
    if (!canResend) return;
    setOtpError('');
    setIsSendingOtp(true);

    const cleanEmail = email.trim().toLowerCase();
    try {
      const res = await AuthService.resendResetOtp(cleanEmail);
      if (res.success) {
        setCooldownSeconds(res.resendCooldownSeconds || 60);
        setCanResend(false);
        setOtpDigits(['', '', '', '', '', '']);
        setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
      } else {
        setOtpError(res.message || 'Failed to resend code. Please wait.');
      }
    } catch (err: any) {
      setOtpError(err.message || 'Network error requesting a new code.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Handle Digit Keying & Auto-focus
  const handleDigitChange = (index: number, val: string) => {
    // Handle multi-character inputs (e.g. paste on mobile or autofill)
    const cleanVal = val.replace(/\D/g, '');
    if (cleanVal.length > 1) {
      const chars = cleanVal.slice(0, 6).split('');
      const newDigits = [...otpDigits];
      chars.forEach((c, i) => {
        if (index + i < 6) newDigits[index + i] = c;
      });
      setOtpDigits(newDigits);
      setOtpError('');
      const nextIndex = Math.min(index + chars.length, 5);
      otpInputRefs.current[nextIndex]?.focus();
      return;
    }

    const char = cleanVal.slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = char;
    setOtpDigits(newDigits);
    setOtpError('');

    // Advance to next box if character entered
    if (char && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Support Pasting Full 6-digit Code
  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || '';
    }
    setOtpDigits(newDigits);
    setOtpError('');

    const focusIndex = Math.min(pasted.length, 5);
    otpInputRefs.current[focusIndex]?.focus();
  };

  // Handle Step 2: Submit OTP for Verification
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');

    const fullCode = otpDigits.join('').trim();
    if (fullCode.length !== 6 || !/^\d{6}$/.test(fullCode)) {
      setOtpError('Please enter the complete 6-digit verification code.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    setIsVerifyingOtp(true);
    try {
      const res = await AuthService.verifyResetOtp(cleanEmail, fullCode);
      if (res.success && res.resetToken) {
        setResetToken(res.resetToken);
        setStep('SET_PASSWORD');
      } else {
        setOtpError(res.error || 'Invalid or expired verification code. Please check and retry.');
      }
    } catch (err: any) {
      setOtpError(err.message || 'Error verifying code.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Password Requirement Checks
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && passwordsMatch;

  // Handle Step 3: Set New Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (!isPasswordValid) {
      setPasswordError('Please meet all password security requirements.');
      return;
    }

    setIsResetting(true);
    try {
      const res = await AuthService.resetPassword({
        email: email.trim().toLowerCase(),
        resetToken,
        newPassword,
      });

      if (res.success) {
        setStep('SUCCESS');
      } else {
        setPasswordError(res.message || 'Failed to update administrator password.');
      }
    } catch (err: any) {
      setPasswordError(err.message || 'Error updating password.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center p-3"
      style={{
        backgroundColor: '#F8F5EB',
        backgroundImage:
          'radial-gradient(circle at 50% 15%, rgba(233, 184, 63, 0.16) 0%, transparent 60%), radial-gradient(circle at 80% 85%, rgba(242, 233, 213, 0.5) 0%, transparent 50%)',
      }}
    >
      <div className="w-100" style={{ maxWidth: 460 }}>
        <div
          className="card rounded-4 overflow-hidden"
          style={{
            backgroundColor: '#FFFDF7',
            borderColor: '#E8E3D8',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {/* Top Brand Banner */}
          <div
            className="p-4 pt-5 pb-3 text-center border-bottom"
            style={{ backgroundColor: '#F2E9D5', borderColor: '#E8E3D8' }}
          >
            <div
              className="position-relative mx-auto rounded-3 overflow-hidden shadow-sm mb-3"
              style={{ width: 72, height: 72, border: '2px solid #E9B83F' }}
            >
              <Image
                src="/branding/kings-taxi-official-auth-logo.jpg"
                alt="Kings Taxi Royal Logo"
                fill
                sizes="72px"
                style={{ objectFit: 'cover' }}
              />
            </div>
            <h1 className="h5 fw-bold text-obsidian mb-1">
              {step === 'EMAIL_INPUT' && 'Recover Super Admin Access'}
              {step === 'OTP_VERIFY' && 'Verify 6-Digit Email Code'}
              {step === 'SET_PASSWORD' && 'Create New Password'}
              {step === 'SUCCESS' && 'Password Reset Complete'}
            </h1>
            <p className="small mb-0" style={{ color: '#77736A' }}>
              {step === 'EMAIL_INPUT' && 'Enter your registered administrator email to receive a secure OTP'}
              {step === 'OTP_VERIFY' && `Verification code dispatched to ${maskedEmail || email}`}
              {step === 'SET_PASSWORD' && 'Choose a strong, secure password for your administrator account'}
              {step === 'SUCCESS' && 'Your account security credentials have been updated'}
            </p>
          </div>

          <div className="p-4 p-sm-5">
            {/* ========================================================================= */}
            {/* STEP 1: EMAIL INPUT                                                       */}
            {/* ========================================================================= */}
            {step === 'EMAIL_INPUT' && (
              <form onSubmit={handleRequestOtp}>
                {emailError && (
                  <div
                    className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 text-xs mb-3.5 rounded-2"
                    role="alert"
                    style={{ backgroundColor: '#FEE8E8', borderColor: '#FCA5A5', color: '#B91C1C' }}
                  >
                    <AlertCircle size={16} className="flex-shrink-0" />
                    <span>{emailError}</span>
                  </div>
                )}

                <div className="mb-3.5">
                  <label className="form-label small fw-semibold mb-1" style={{ color: '#252525' }}>
                    Administrator Email Address
                  </label>
                  <div className="position-relative">
                    <span className="position-absolute top-50 start-0 translate-middle-y ps-3 text-muted">
                      <Mail size={16} />
                    </span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="form-control ps-5 pe-3 py-2.5 shadow-none text-sm"
                      placeholder="e.g. ashurack664@gmail.com"
                      style={{
                        backgroundColor: '#FFFDF7',
                        borderColor: '#E8E3D8',
                        borderRadius: '0.5rem',
                        color: '#252525',
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSendingOtp}
                  className="btn btn-gold w-100 py-2.5 fw-bold d-flex align-items-center justify-content-center gap-2 rounded-3 mb-3"
                >
                  {isSendingOtp ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" />
                      <span>Dispatching Code...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Verification Code</span>
                      <Send size={15} />
                    </>
                  )}
                </button>

                <div className="text-center">
                  <Link
                    href="/login"
                    className="small text-decoration-none d-inline-flex align-items-center gap-1.5 fw-medium"
                    style={{ color: '#77736A' }}
                  >
                    <ArrowLeft size={14} />
                    <span>Return to Sign In</span>
                  </Link>
                </div>
              </form>
            )}

            {/* ========================================================================= */}
            {/* STEP 2: 6-DIGIT OTP VERIFICATION                                          */}
            {/* ========================================================================= */}
            {step === 'OTP_VERIFY' && (
              <form onSubmit={handleVerifyOtp}>
                {otpError && (
                  <div
                    className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 text-xs mb-3.5 rounded-2"
                    role="alert"
                    style={{ backgroundColor: '#FEE8E8', borderColor: '#FCA5A5', color: '#B91C1C' }}
                  >
                    <AlertCircle size={16} className="flex-shrink-0" />
                    <span>{otpError}</span>
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label small fw-semibold text-center d-block mb-2" style={{ color: '#252525' }}>
                    Enter 6-Digit Verification Code
                  </label>

                  {/* 6 Digit Input Boxes */}
                  <div className="d-flex justify-content-between gap-2 mb-2">
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => {
                          otpInputRefs.current[idx] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                        onPaste={idx === 0 ? handleOtpPaste : undefined}
                        className="form-control text-center fw-bold shadow-none p-0"
                        style={{
                          width: '100%',
                          height: 52,
                          fontSize: '1.5rem',
                          backgroundColor: '#FFFDF7',
                          borderColor: digit ? '#E9B83F' : '#E8E3D8',
                          borderRadius: '0.5rem',
                          color: '#252525',
                          borderWidth: digit ? 2 : 1,
                        }}
                      />
                    ))}
                  </div>
                  <div className="text-center text-xs text-muted mb-3">
                    Paste supported &bull; Code expires in 5 minutes
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isVerifyingOtp || otpDigits.join('').length !== 6}
                  className="btn btn-gold w-100 py-2.5 fw-bold d-flex align-items-center justify-content-center gap-2 rounded-3 mb-3"
                >
                  {isVerifyingOtp ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" />
                      <span>Verifying Code...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound size={16} />
                      <span>Verify & Continue</span>
                    </>
                  )}
                </button>

                {/* Resend & Cooldown */}
                <div className="d-flex align-items-center justify-content-between pt-2 border-top">
                  <button
                    type="button"
                    disabled={!canResend || isSendingOtp}
                    onClick={handleResendOtp}
                    className="btn btn-link p-0 small text-decoration-none fw-semibold d-flex align-items-center gap-1"
                    style={{ color: canResend ? '#D99B19' : '#999488' }}
                  >
                    <RotateCcw size={13} />
                    <span>{canResend ? 'Resend Code' : `Resend in ${cooldownSeconds}s`}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep('EMAIL_INPUT');
                      setOtpError('');
                    }}
                    className="btn btn-link p-0 small text-decoration-none text-secondary"
                  >
                    Change Email
                  </button>
                </div>
              </form>
            )}

            {/* ========================================================================= */}
            {/* STEP 3: SET NEW PASSWORD                                                  */}
            {/* ========================================================================= */}
            {step === 'SET_PASSWORD' && (
              <form onSubmit={handleResetPassword}>
                {passwordError && (
                  <div
                    className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 text-xs mb-3.5 rounded-2"
                    role="alert"
                    style={{ backgroundColor: '#FEE8E8', borderColor: '#FCA5A5', color: '#B91C1C' }}
                  >
                    <AlertCircle size={16} className="flex-shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                {/* New Password */}
                <div className="mb-3">
                  <label className="form-label small fw-semibold mb-1" style={{ color: '#252525' }}>
                    New Password
                  </label>
                  <div className="position-relative">
                    <span className="position-absolute top-50 start-0 translate-middle-y ps-3 text-muted">
                      <Lock size={16} />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="form-control ps-5 pe-5 py-2.5 shadow-none text-sm"
                      placeholder="Enter new password"
                      style={{
                        backgroundColor: '#FFFDF7',
                        borderColor: '#E8E3D8',
                        borderRadius: '0.5rem',
                        color: '#252525',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="btn btn-link position-absolute top-50 end-0 translate-middle-y pe-3 text-muted shadow-none p-0"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="mb-3">
                  <label className="form-label small fw-semibold mb-1" style={{ color: '#252525' }}>
                    Confirm New Password
                  </label>
                  <div className="position-relative">
                    <span className="position-absolute top-50 start-0 translate-middle-y ps-3 text-muted">
                      <Lock size={16} />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="form-control ps-5 pe-3 py-2.5 shadow-none text-sm"
                      placeholder="Re-enter new password"
                      style={{
                        backgroundColor: '#FFFDF7',
                        borderColor: '#E8E3D8',
                        borderRadius: '0.5rem',
                        color: '#252525',
                      }}
                    />
                  </div>
                </div>

                {/* Requirements Checklist */}
                <div
                  className="p-3 rounded-3 border mb-3.5 text-xs"
                  style={{ backgroundColor: '#F8F5EB', borderColor: '#E8E3D8' }}
                >
                  <span className="fw-semibold text-secondary d-block mb-1.5">Password Requirements:</span>
                  <div className="d-flex flex-column gap-1">
                    <span className={`d-flex align-items-center gap-1.5 ${hasMinLength ? 'text-success' : 'text-muted'}`}>
                      <Check size={13} className={hasMinLength ? 'text-success' : 'text-muted'} />
                      <span>At least 8 characters</span>
                    </span>
                    <span className={`d-flex align-items-center gap-1.5 ${hasUppercase ? 'text-success' : 'text-muted'}`}>
                      <Check size={13} className={hasUppercase ? 'text-success' : 'text-muted'} />
                      <span>At least one uppercase letter (A-Z)</span>
                    </span>
                    <span className={`d-flex align-items-center gap-1.5 ${hasLowercase ? 'text-success' : 'text-muted'}`}>
                      <Check size={13} className={hasLowercase ? 'text-success' : 'text-muted'} />
                      <span>At least one lowercase letter (a-z)</span>
                    </span>
                    <span className={`d-flex align-items-center gap-1.5 ${hasNumber ? 'text-success' : 'text-muted'}`}>
                      <Check size={13} className={hasNumber ? 'text-success' : 'text-muted'} />
                      <span>At least one number (0-9)</span>
                    </span>
                    <span className={`d-flex align-items-center gap-1.5 ${passwordsMatch ? 'text-success' : 'text-muted'}`}>
                      <Check size={13} className={passwordsMatch ? 'text-success' : 'text-muted'} />
                      <span>Passwords match</span>
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isResetting || !isPasswordValid}
                  className="btn btn-gold w-100 py-2.5 fw-bold d-flex align-items-center justify-content-center gap-2 rounded-3"
                >
                  {isResetting ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <span>Set New Password & Finish</span>
                  )}
                </button>
              </form>
            )}

            {/* ========================================================================= */}
            {/* STEP 4: SUCCESS CONFIRMATION                                              */}
            {/* ========================================================================= */}
            {step === 'SUCCESS' && (
              <div className="text-center py-2">
                <div
                  className="rounded-circle mx-auto d-flex align-items-center justify-content-center mb-3 shadow-sm"
                  style={{ width: 64, height: 64, backgroundColor: '#EAF7EE', color: '#15803D' }}
                >
                  <CheckCircle2 size={36} />
                </div>
                <h2 className="h6 fw-bold text-obsidian mb-2">Password Reset Successfully</h2>
                <p className="small mb-4" style={{ color: '#77736A', lineHeight: 1.5 }}>
                  Your Super Admin password has been securely updated in the production database. You may now sign in with your new credentials.
                </p>
                <Link href="/login" className="btn btn-gold w-100 py-2.5 fw-bold rounded-3">
                  Sign In with New Password
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center small mt-4" style={{ color: '#77736A', fontSize: '0.75rem' }}>
          Kings Taxi Mobility & Tourism Platform • Secured Super Admin Console
        </div>
      </div>
    </div>
  );
}
