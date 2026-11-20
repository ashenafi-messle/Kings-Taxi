'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, CheckCircle2, ArrowLeft } from 'lucide-react';
import { AuthService } from '../../../services/authService';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await AuthService.resetPassword({
        email: 'admin@kingstaxi.et',
        resetToken: 'valid-demo-token',
        newPassword: password,
      });

      if (res.success) {
        setIsSuccess(true);
        setTimeout(() => {
          router.push('/login');
        }, 1800);
      } else {
        setError('Failed to update password.');
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
      <div className="w-100" style={{ maxWidth: 440 }}>
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
            <h1 className="h5 fw-bold text-obsidian mb-1">Set New Password</h1>
            <p className="small mb-0" style={{ color: '#77736A' }}>
              Create a secure password for your administrator terminal
            </p>
          </div>

          <div className="p-4 p-sm-5">
            {isSuccess ? (
              <div className="text-center py-2">
                <div
                  className="rounded-circle mx-auto d-flex align-items-center justify-content-center mb-3"
                  style={{ width: 56, height: 56, backgroundColor: '#EAF7EE', color: '#15803D' }}
                >
                  <CheckCircle2 size={32} />
                </div>
                <h2 className="h6 fw-bold text-obsidian mb-2">Password Successfully Updated</h2>
                <p className="small mb-3" style={{ color: '#77736A' }}>
                  Redirecting to administrator sign in...
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {error && (
                  <div
                    className="alert alert-danger py-2 px-3 text-xs mb-3 rounded-2"
                    role="alert"
                    style={{ backgroundColor: '#FEE8E8', borderColor: '#FCA5A5', color: '#B91C1C' }}
                  >
                    {error}
                  </div>
                )}

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
                      className="form-control ps-5 pe-5 py-2.5 shadow-none text-sm"
                      placeholder="At least 8 characters"
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
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="mb-4">
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
                      className="form-control ps-5 pe-3 py-2.5 shadow-none text-sm"
                      placeholder="Confirm password"
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
                  disabled={isLoading}
                  className="btn btn-gold w-100 py-2.5 fw-bold d-flex align-items-center justify-content-center gap-2 rounded-3 mb-3"
                >
                  {isLoading ? (
                    <span className="spinner-border spinner-border-sm" role="status" />
                  ) : (
                    <span>Update Password & Enter</span>
                  )}
                </button>

                <div className="text-center">
                  <Link
                    href="/login"
                    className="small text-decoration-none d-inline-flex align-items-center gap-1.5"
                    style={{ color: '#77736A' }}
                  >
                    <ArrowLeft size={14} />
                    <span>Back to Sign In</span>
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
