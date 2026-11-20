'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Eye, EyeOff, CheckCircle2, ArrowLeft, AlertCircle, Check } from 'lucide-react';
import { AuthService } from '../../../services/authService';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const qEmail = searchParams.get('email');
    const qToken = searchParams.get('token');
    if (qEmail) setEmail(qEmail);
    if (qToken) setResetToken(qToken);
  }, [searchParams]);

  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !resetToken) {
      setError('Missing password reset authorization. Please restart recovery from the Forgot Password page.');
      return;
    }

    if (!isPasswordValid) {
      setError('Please fulfill all password security requirements.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await AuthService.resetPassword({
        email,
        resetToken,
        newPassword: password,
      });

      if (res.success) {
        setIsSuccess(true);
      } else {
        setError(res.message || 'Failed to update administrator password.');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with reset service.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center p-3"
      style={{
        backgroundColor: '#F8F5EB',
        backgroundImage:
          'radial-gradient(circle at 50% 15%, rgba(233, 184, 63, 0.16) 0%, transparent 60%)',
      }}
    >
      <div className="w-100" style={{ maxWidth: 450 }}>
        <div
          className="card rounded-4 overflow-hidden"
          style={{
            backgroundColor: '#FFFDF7',
            borderColor: '#E8E3D8',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
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
            <h1 className="h5 fw-bold text-obsidian mb-1">Set New Administrator Password</h1>
            <p className="small mb-0" style={{ color: '#77736A' }}>
              Create a strong password for your Super Admin console
            </p>
          </div>

          <div className="p-4 p-sm-5">
            {isSuccess ? (
              <div className="text-center py-2">
                <div
                  className="rounded-circle mx-auto d-flex align-items-center justify-content-center mb-3 shadow-sm"
                  style={{ width: 64, height: 64, backgroundColor: '#EAF7EE', color: '#15803D' }}
                >
                  <CheckCircle2 size={36} />
                </div>
                <h2 className="h6 fw-bold text-obsidian mb-2">Password Reset Successfully</h2>
                <p className="small mb-4" style={{ color: '#77736A', lineHeight: 1.5 }}>
                  Your password has been securely updated in the production database. You may now sign in.
                </p>
                <Link href="/login" className="btn btn-gold w-100 py-2.5 fw-bold rounded-3">
                  Return to Sign In
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {error && (
                  <div
                    className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 text-xs mb-3.5 rounded-2"
                    role="alert"
                    style={{ backgroundColor: '#FEE8E8', borderColor: '#FCA5A5', color: '#B91C1C' }}
                  >
                    <AlertCircle size={16} className="flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Account Email (read-only if pre-filled, or editable) */}
                <div className="mb-3">
                  <label className="form-label small fw-semibold mb-1" style={{ color: '#252525' }}>
                    Administrator Account Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-control py-2 shadow-none text-sm"
                    placeholder="admin@kingstaxi.et"
                    style={{ backgroundColor: '#FFFDF7', borderColor: '#E8E3D8' }}
                  />
                </div>

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
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="form-control ps-5 pe-5 py-2 shadow-none text-sm"
                      placeholder="••••••••"
                      style={{ backgroundColor: '#FFFDF7', borderColor: '#E8E3D8' }}
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
                    Confirm Password
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
                      className="form-control ps-5 pe-3 py-2 shadow-none text-sm"
                      placeholder="••••••••"
                      style={{ backgroundColor: '#FFFDF7', borderColor: '#E8E3D8' }}
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
                  disabled={isLoading || !isPasswordValid}
                  className="btn btn-gold w-100 py-2.5 fw-bold rounded-3 mb-3"
                >
                  {isLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <span>Update Password & Return to Login</span>
                  )}
                </button>

                <div className="text-center">
                  <Link
                    href="/forgot-password"
                    className="small text-decoration-none d-inline-flex align-items-center gap-1.5"
                    style={{ color: '#77736A' }}
                  >
                    <ArrowLeft size={14} />
                    <span>Back to Forgot Password</span>
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>

        <div className="text-center small mt-4" style={{ color: '#77736A', fontSize: '0.75rem' }}>
          Kings Taxi Mobility & Tourism Platform • Secured Super Admin Console
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: '#F8F5EB' }}>
          <div className="spinner-border text-gold" role="status" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
