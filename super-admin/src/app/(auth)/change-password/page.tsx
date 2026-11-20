'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Lock,
  Eye,
  EyeOff,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  KeyRound,
} from 'lucide-react';
import { AuthService } from '../../../services/authService';

export default function MandatoryChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('12345678');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [adminEmail, setAdminEmail] = useState('');

  useEffect(() => {
    const session = AuthService.getStoredSession();
    if (!session.user) {
      router.push('/login');
      return;
    }
    setAdminEmail(session.user.email);
  }, [router]);

  // Real-time password strength requirements
  const hasMinLength = newPassword.length >= 8;
  const hasUpperLower = /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isDifferentFromCurrent = newPassword.length > 0 && newPassword !== currentPassword;
  const isFormValid = hasMinLength && hasUpperLower && hasNumber && passwordsMatch && isDifferentFromCurrent;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!isFormValid) {
      if (!hasMinLength) {
        setErrorMessage('New password must contain at least 8 characters.');
        return;
      }
      if (!isDifferentFromCurrent) {
        setErrorMessage('New password must be different from your current temporary bootstrap password.');
        return;
      }
      if (!passwordsMatch) {
        setErrorMessage('The new password and confirmation password do not match.');
        return;
      }
      setErrorMessage('Please ensure your new password satisfies all security requirements.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await AuthService.changePassword({
        currentPassword,
        newPassword,
      });

      if (res.success) {
        setSuccessMessage('Password changed successfully! Unlocking full Super Admin dashboard access...');
        setTimeout(() => {
          router.push('/');
        }, 1500);
      } else {
        setErrorMessage(res.message || 'Failed to update password.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error updating administrator password.');
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
          'radial-gradient(circle at 50% 15%, rgba(233, 184, 63, 0.16) 0%, transparent 60%), radial-gradient(circle at 80% 85%, rgba(242, 233, 213, 0.5) 0%, transparent 50%)',
      }}
    >
      <div className="w-100" style={{ maxWidth: 480 }}>
        {/* Card */}
        <div
          className="card rounded-4 overflow-hidden"
          style={{
            backgroundColor: '#FFFDF7',
            borderColor: '#E8E3D8',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {/* Top Banner */}
          <div
            className="p-4 pt-5 pb-3 text-center border-bottom"
            style={{ backgroundColor: '#F2E9D5', borderColor: '#E8E3D8' }}
          >
            <div
              className="position-relative mx-auto rounded-3 overflow-hidden shadow-sm mb-3"
              style={{ width: 84, height: 84, border: '2px solid #E9B83F' }}
            >
              <Image
                src="/branding/kings-taxi-official-auth-logo.jpg"
                alt="Kings Taxi Royal Logo"
                fill
                sizes="84px"
                style={{ objectFit: 'cover' }}
                priority
              />
            </div>

            <div className="d-flex align-items-center justify-content-center gap-1.5 mb-2">
              <span
                className="badge px-2.5 py-1 text-uppercase fw-bold d-inline-flex align-items-center gap-1"
                style={{
                  backgroundColor: '#E9B83F',
                  color: '#252525',
                  fontSize: '0.72rem',
                  letterSpacing: '0.06em',
                }}
              >
                <ShieldAlert size={14} />
                <span>MANDATORY FIRST-LOGIN SECURITY ACTION</span>
              </span>
            </div>

            <h1 className="h5 fw-bold mb-1 text-obsidian">Change Temporary Password</h1>
            <p className="small mb-0" style={{ color: '#77736A' }}>
              Account: <strong className="text-obsidian">{adminEmail || 'Super Administrator'}</strong>
            </p>
          </div>

          {/* Form */}
          <div className="p-4 p-sm-5">
            <div
              className="alert py-2.5 px-3 mb-4 rounded-3 text-xs"
              style={{
                backgroundColor: '#FBF4DC',
                borderColor: '#F2E09B',
                color: '#7A5B0B',
              }}
            >
              <strong>Security Policy:</strong> You have logged in with a temporary bootstrap password. To protect the Kings Taxi platform, you must set a private secure password before accessing the operational dashboard.
            </div>

            {errorMessage && (
              <div
                className="alert alert-danger d-flex align-items-center gap-2 py-2.5 px-3 mb-4 rounded-3 text-sm"
                role="alert"
                style={{ backgroundColor: '#FEE8E8', borderColor: '#FCA5A5', color: '#B91C1C' }}
              >
                <AlertCircle size={18} className="flex-shrink-0" />
                <div>{errorMessage}</div>
              </div>
            )}

            {successMessage && (
              <div
                className="alert alert-success d-flex align-items-center gap-2 py-2.5 px-3 mb-4 rounded-3 text-sm"
                role="alert"
                style={{ backgroundColor: '#DEF7EC', borderColor: '#84E1BC', color: '#03543F' }}
              >
                <CheckCircle2 size={18} className="flex-shrink-0" />
                <div>{successMessage}</div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Current Temporary Password */}
              <div className="mb-3.5">
                <label className="form-label small fw-semibold mb-1" style={{ color: '#252525' }}>
                  Current Temporary Password
                </label>
                <div className="position-relative">
                  <span className="position-absolute top-50 start-0 translate-middle-y ps-3 text-muted">
                    <KeyRound size={16} />
                  </span>
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="form-control ps-5 pe-5 py-2.5 shadow-none text-sm"
                    placeholder="Enter current password"
                    style={{
                      backgroundColor: '#FFFDF7',
                      borderColor: '#E8E3D8',
                      borderRadius: '0.5rem',
                      color: '#252525',
                    }}
                  />
                  <button
                    type="button"
                    className="btn position-absolute top-50 end-0 translate-middle-y pe-3 text-muted border-0 bg-transparent p-0"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    aria-label="Toggle password visibility"
                  >
                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="mb-3.5">
                <label className="form-label small fw-semibold mb-1" style={{ color: '#252525' }}>
                  New Secure Password
                </label>
                <div className="position-relative">
                  <span className="position-absolute top-50 start-0 translate-middle-y ps-3 text-muted">
                    <Lock size={16} />
                  </span>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="form-control ps-5 pe-5 py-2.5 shadow-none text-sm"
                    placeholder="Create a strong password"
                    style={{
                      backgroundColor: '#FFFDF7',
                      borderColor: '#E8E3D8',
                      borderRadius: '0.5rem',
                      color: '#252525',
                    }}
                  />
                  <button
                    type="button"
                    className="btn position-absolute top-50 end-0 translate-middle-y pe-3 text-muted border-0 bg-transparent p-0"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    aria-label="Toggle password visibility"
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div className="mb-3">
                <label className="form-label small fw-semibold mb-1" style={{ color: '#252525' }}>
                  Confirm New Password
                </label>
                <div className="position-relative">
                  <span className="position-absolute top-50 start-0 translate-middle-y ps-3 text-muted">
                    <Lock size={16} />
                  </span>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="form-control ps-5 pe-3 py-2.5 shadow-none text-sm"
                    placeholder="Repeat new password"
                    style={{
                      backgroundColor: '#FFFDF7',
                      borderColor: '#E8E3D8',
                      borderRadius: '0.5rem',
                      color: '#252525',
                    }}
                  />
                </div>
              </div>

              {/* Real-time Checklist */}
              <div
                className="p-3 mb-4 rounded-3 border"
                style={{
                  backgroundColor: '#F8F5EB',
                  borderColor: '#E8E3D8',
                  fontSize: '0.75rem',
                }}
              >
                <div className="fw-bold mb-1.5 text-obsidian">Password Strength Checklist:</div>
                <div className="d-flex flex-column gap-1">
                  <div className={`d-flex align-items-center gap-1.5 ${hasMinLength ? 'text-success' : 'text-muted'}`}>
                    <CheckCircle2 size={13} className={hasMinLength ? 'text-success' : 'text-secondary'} />
                    <span>Minimum 8 characters in length</span>
                  </div>
                  <div className={`d-flex align-items-center gap-1.5 ${hasUpperLower ? 'text-success' : 'text-muted'}`}>
                    <CheckCircle2 size={13} className={hasUpperLower ? 'text-success' : 'text-secondary'} />
                    <span>Includes both uppercase and lowercase letters</span>
                  </div>
                  <div className={`d-flex align-items-center gap-1.5 ${hasNumber ? 'text-success' : 'text-muted'}`}>
                    <CheckCircle2 size={13} className={hasNumber ? 'text-success' : 'text-secondary'} />
                    <span>Includes at least one numeric digit (0-9)</span>
                  </div>
                  <div className={`d-flex align-items-center gap-1.5 ${isDifferentFromCurrent ? 'text-success' : 'text-muted'}`}>
                    <CheckCircle2 size={13} className={isDifferentFromCurrent ? 'text-success' : 'text-secondary'} />
                    <span>Different from temporary bootstrap password</span>
                  </div>
                  <div className={`d-flex align-items-center gap-1.5 ${passwordsMatch ? 'text-success' : 'text-muted'}`}>
                    <CheckCircle2 size={13} className={passwordsMatch ? 'text-success' : 'text-secondary'} />
                    <span>Passwords match exactly</span>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading || !isFormValid}
                className="btn btn-gold w-100 py-2.5 fw-bold d-flex align-items-center justify-content-center gap-2 rounded-3"
                style={{ fontSize: '0.9375rem' }}
              >
                {isLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" />
                    <span>Updating Password & Unlocking Access...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Activate Super Admin Access</span>
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
