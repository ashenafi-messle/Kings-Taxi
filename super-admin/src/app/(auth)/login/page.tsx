'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Eye, EyeOff, ShieldCheck, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { AuthService } from '../../../services/authService';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@kingstaxi.et');
  const [password, setPassword] = useState('Admin@123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const response = await AuthService.login({
        email,
        password,
        rememberMe,
      });

      if (response.success) {
        if (response.user?.mustChangePassword) {
          router.push('/change-password');
        } else {
          router.push('/');
        }
      } else {
        setErrorMessage(response.error || 'Invalid administrator credentials');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected authentication error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillCredentials = (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPassword(userPass);
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
        {/* Card */}
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

            <h1
              className="h4 fw-bold mb-1 tracking-wider text-obsidian"
              style={{ letterSpacing: '0.04em' }}
            >
              KINGS TAXI
            </h1>
            <div className="d-flex align-items-center justify-content-center gap-1.5 mb-2">
              <span
                className="badge px-2.5 py-1 text-uppercase fw-bold"
                style={{
                  backgroundColor: '#E9B83F',
                  color: '#252525',
                  fontSize: '0.7rem',
                  letterSpacing: '0.06em',
                }}
              >
                SUPER ADMIN PORTAL
              </span>
            </div>
            <p className="small mb-0" style={{ color: '#77736A' }}>
              Central Fleet, GPS Journey & Tourism Operations
            </p>
          </div>

          {/* Form Area */}
          <div className="p-4 p-sm-5">
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

            <form onSubmit={handleLogin}>
              {/* Email */}
              <div className="mb-3.5">
                <label className="form-label small fw-semibold mb-1" style={{ color: '#252525' }}>
                  Administrator Email
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
                    placeholder="admin@kingstaxi.et"
                    style={{
                      backgroundColor: '#FFFDF7',
                      borderColor: '#E8E3D8',
                      borderRadius: '0.5rem',
                      color: '#252525',
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="mb-3.5">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label className="form-label small fw-semibold mb-0" style={{ color: '#252525' }}>
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-gold text-decoration-none small fw-semibold"
                    style={{ fontSize: '0.78125rem' }}
                  >
                    Forgot Password?
                  </Link>
                </div>
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
                    placeholder="Enter password"
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
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="form-check mb-4">
                <input
                  className="form-check-input shadow-none"
                  type="checkbox"
                  id="rememberMeCheck"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{
                    backgroundColor: rememberMe ? '#E9B83F' : '#FFFDF7',
                    borderColor: rememberMe ? '#E9B83F' : '#E8E3D8',
                  }}
                />
                <label className="form-check-label small" htmlFor="rememberMeCheck" style={{ color: '#77736A' }}>
                  Keep me securely logged in on this terminal
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-gold w-100 py-2.5 fw-bold d-flex align-items-center justify-content-center gap-2 rounded-3"
                style={{ fontSize: '0.9375rem' }}
              >
                {isLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Super Admin</span>
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Credentials Box */}
            <div
              className="mt-4 p-3 rounded-3 border"
              style={{
                backgroundColor: '#F2E9D5',
                borderColor: '#E8E3D8',
              }}
            >
              <div className="d-flex align-items-center justify-content-between mb-1.5">
                <div className="d-flex align-items-center gap-1.5 text-gold fw-bold text-xs">
                  <ShieldCheck size={15} />
                  <span>DEMONSTRATION ACCESS</span>
                </div>
                <span className="badge bg-gold text-dark text-xs fw-bold">1-CLICK LOGIN</span>
              </div>
              <p className="small mb-2" style={{ color: '#77736A', fontSize: '0.78125rem' }}>
                Pre-configured with Executive Super Admin credentials:
              </p>
              <div className="d-flex flex-wrap gap-1.5">
                <button
                  type="button"
                  className="btn btn-sm btn-gold py-1 px-2 text-xs fw-bold"
                  onClick={() => fillCredentials('ashurack664@gmail.com', '12345678')}
                >
                  Super Admin (Ashura)
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-gold py-1 px-2 text-xs fw-bold"
                  onClick={() => fillCredentials('ambelugesese@gmail.com', '12345678')}
                >
                  Super Admin (Ambelu)
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-light py-1 px-2 text-xs border"
                  onClick={() => fillCredentials('admin@kingstaxi.et', 'Admin@123')}
                  style={{ backgroundColor: '#FFFDF7', borderColor: '#E8E3D8' }}
                >
                  Demo Admin
                </button>
              </div>
            </div>
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
