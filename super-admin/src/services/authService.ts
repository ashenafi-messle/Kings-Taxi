/**
 * Kings Taxi Super Admin - Authentication Service
 *
 * Fully integrated with the central backend (https://kings-taxi.onrender.com/api/v1)
 * authenticating real administrator accounts stored in the production PostgreSQL database.
 */

import { AdminUser, LoginCredentials, PasswordResetPayload } from '../types';
import { apiRequest, executeSingleFlightRefresh } from './apiClient';

const AUTH_STORAGE_KEY = 'kt_super_admin_session';
const TOKEN_STORAGE_KEY = 'kt_admin_token';
const REFRESH_TOKEN_STORAGE_KEY = 'kt_admin_refresh_token';

export class AuthService {
  /**
   * Real Super Admin Login against the central Render backend
   */
  static async login(
    credentials: LoginCredentials
  ): Promise<{ success: boolean; user?: AdminUser; error?: string }> {
    const emailClean = credentials.email.trim().toLowerCase();

    // 1. Authenticate against central backend
    try {
      const apiRes = await apiRequest<{
        token: string;
        refreshToken?: string;
        user: any;
      }>('/auth/admin/login', {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({
          email: emailClean,
          password: credentials.password,
        }),
      });

      if (apiRes.success && apiRes.data) {
        const backendUser: AdminUser = {
          id: apiRes.data.user.id,
          name: apiRes.data.user.name || apiRes.data.user.fullName,
          email: apiRes.data.user.email,
          role: apiRes.data.user.role,
          avatarUrl: apiRes.data.user.avatarUrl || '/branding/kings-taxi-monogram.png',
          phone: apiRes.data.user.phone || apiRes.data.user.phoneNumber,
          department: apiRes.data.user.department || 'Executive Operations',
          status: apiRes.data.user.status || 'ACTIVE',
          permissions: apiRes.data.user.permissions || [],
          mustChangePassword: false,
          lastLoginAt: apiRes.data.user.lastLoginAt,
          createdAt: apiRes.data.user.createdAt || new Date().toISOString(),
        };

        this.saveSession(backendUser, apiRes.data.token, apiRes.data.refreshToken);
        return { success: true, user: backendUser };
      }

      if (apiRes.error) {
        return { success: false, error: apiRes.error };
      }
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Unable to connect to central authentication service.',
      };
    }

    return {
      success: false,
      error: 'Invalid administrator credentials. Please check your email and password.',
    };
  }

  /**
   * Dispatches 6-digit email OTP for administrator password recovery
   */
  static async requestPasswordReset(email: string): Promise<{
    success: boolean;
    message: string;
    email?: string;
    expiresInSeconds?: number;
    resendCooldownSeconds?: number;
    error?: string;
  }> {
    const cleanEmail = email.trim().toLowerCase();

    try {
      const res = await apiRequest<{
        message: string;
        email: string;
        expiresInSeconds: number;
        resendCooldownSeconds: number;
      }>('/auth/admin/forgot-password', {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({ email: cleanEmail }),
      });

      if (res.success && res.data) {
        return {
          success: true,
          message: res.data.message || 'Verification code dispatched to your email.',
          email: res.data.email,
          expiresInSeconds: res.data.expiresInSeconds || 300,
          resendCooldownSeconds: res.data.resendCooldownSeconds || 60,
        };
      }

      return {
        success: false,
        message: res.error || 'Failed to dispatch verification code.',
        error: res.error,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Error communicating with recovery service.',
        error: err.message,
      };
    }
  }

  /**
   * Resends 6-digit email OTP for administrator password recovery
   */
  static async resendResetOtp(email: string): Promise<{
    success: boolean;
    message: string;
    expiresInSeconds?: number;
    resendCooldownSeconds?: number;
    error?: string;
  }> {
    const cleanEmail = email.trim().toLowerCase();

    try {
      const res = await apiRequest<{
        message: string;
        expiresInSeconds: number;
        resendCooldownSeconds: number;
      }>('/auth/admin/resend-reset-otp', {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({ email: cleanEmail }),
      });

      if (res.success && res.data) {
        return {
          success: true,
          message: res.data.message || 'New verification code dispatched.',
          expiresInSeconds: res.data.expiresInSeconds || 300,
          resendCooldownSeconds: res.data.resendCooldownSeconds || 60,
        };
      }

      return {
        success: false,
        message: res.error || 'Failed to resend code.',
        error: res.error,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Error requesting new code.',
        error: err.message,
      };
    }
  }

  /**
   * Verifies 6-digit email OTP and receives short-lived reset authorization token
   */
  static async verifyResetOtp(
    email: string,
    otp: string
  ): Promise<{
    success: boolean;
    resetToken?: string;
    message?: string;
    error?: string;
  }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    try {
      const res = await apiRequest<{
        resetToken: string;
        message: string;
      }>('/auth/admin/verify-reset-otp', {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({ email: cleanEmail, otp: cleanOtp }),
      });

      if (res.success && res.data?.resetToken) {
        return {
          success: true,
          resetToken: res.data.resetToken,
          message: res.data.message || 'Code verified successfully.',
        };
      }

      return {
        success: false,
        error: res.error || 'Invalid or expired verification code.',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Error verifying code.',
      };
    }
  }

  /**
   * Sets new password using reset authorization token
   */
  static async resetPassword(payload: {
    email: string;
    resetToken: string;
    newPassword: string;
  }): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      const res = await apiRequest<{ message: string }>('/auth/admin/reset-password', {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({
          email: payload.email.trim().toLowerCase(),
          resetToken: payload.resetToken,
          newPassword: payload.newPassword,
        }),
      });

      if (res.success) {
        return {
          success: true,
          message: res.data?.message || 'Your password has been reset successfully.',
        };
      }

      return {
        success: false,
        message: res.error || 'Failed to reset password.',
        error: res.error,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Error communicating with reset service.',
        error: err.message,
      };
    }
  }

  /**
   * Normal administrative password update (from Settings page)
   */
  static async changePassword(params: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const apiRes = await apiRequest<{ message: string }>('/auth/admin/change-password', {
        method: 'POST',
        body: JSON.stringify(params),
      });

      if (apiRes.success) {
        return {
          success: true,
          message: apiRes.data?.message || 'Password updated successfully.',
        };
      }

      return {
        success: false,
        message: apiRes.error || 'Failed to update password.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Error updating password.',
      };
    }
  }

  /**
   * Verifies current administrator session with backend /auth/admin/me
   */
  static async verifySession(): Promise<{
    success: boolean;
    user?: AdminUser;
    error?: string;
  }> {
    try {
      const res = await apiRequest<any>('/auth/admin/me', { method: 'GET' });
      if (res.success && res.data) {
        const u = res.data;
        const backendUser: AdminUser = {
          id: u.id,
          name: u.name || u.fullName,
          email: u.email,
          role: u.role,
          avatarUrl: u.avatarUrl || '/branding/kings-taxi-monogram.png',
          phone: u.phone || u.phoneNumber,
          department: u.department || 'Executive Operations',
          status: u.status || 'ACTIVE',
          permissions: u.permissions || [],
          mustChangePassword: false,
          lastLoginAt: u.lastLoginAt,
          createdAt: u.createdAt || new Date().toISOString(),
        };
        return { success: true, user: backendUser };
      }
      return { success: false, error: res.error || 'Session invalid or expired' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to verify session' };
    }
  }

  /**
   * Refreshes access token using central single-flight refresh mechanism
   */
  static async refreshToken(): Promise<{
    success: boolean;
    token?: string;
    error?: string;
  }> {
    try {
      const token = await executeSingleFlightRefresh();
      if (token) {
        return { success: true, token };
      }
      return { success: false, error: 'Session expired. Please sign in again.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error refreshing token.' };
    }
  }

  /**
   * Retrieves active session from browser storage.
   * Never defaults to simulated admin accounts.
   */
  static getStoredSession(): { user: AdminUser | null; token: string | null } {
    if (typeof window === 'undefined') {
      return { user: null, token: null };
    }

    try {
      const userRaw = localStorage.getItem(AUTH_STORAGE_KEY);
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (userRaw && token) {
        const user = JSON.parse(userRaw);
        return { user, token };
      }
    } catch {
      // Storage parsing failure
    }

    return { user: null, token: null };
  }

  /**
   * Persists authenticated administrator session
   */
  static saveSession(user: AdminUser, token: string, refreshToken?: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      if (refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
      }
      document.cookie = `kt_admin_logged_in=true; path=/; max-age=86400; SameSite=Lax; Secure`;
    } catch {
      // Non-blocking
    }
  }

  /**
   * Terminates active administrator session
   */
  static logout(): void {
    if (typeof window === 'undefined') return;
    try {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
      // Non-blocking notification to backend with refreshToken for database revocation
      apiRequest('/auth/admin/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {});
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
      document.cookie = 'kt_admin_logged_in=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    } catch {
      // Non-blocking
    }
  }
}
