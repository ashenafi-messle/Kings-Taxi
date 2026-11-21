/**
 * Kings Taxi Super Admin - Central API Client
 *
 * Configured for direct HTTPS communication with the Kings Taxi central backend.
 * Base URL: https://kings-taxi.onrender.com
 * API Prefix: /api/v1
 */

/**
 * Normalizes any provided base URL string to guarantee it represents the root origin
 * without trailing slashes, /api, or /api/v1 suffixes.
 *
 * Guarantees:
 *   "https://kings-taxi.onrender.com"        -> "https://kings-taxi.onrender.com"
 *   "https://kings-taxi.onrender.com/"       -> "https://kings-taxi.onrender.com"
 *   "https://kings-taxi.onrender.com/api"    -> "https://kings-taxi.onrender.com"
 *   "https://kings-taxi.onrender.com/api/"   -> "https://kings-taxi.onrender.com"
 *   "https://kings-taxi.onrender.com/api/v1" -> "https://kings-taxi.onrender.com"
 *   "https://kings-taxi.onrender.com/api/v1/"-> "https://kings-taxi.onrender.com"
 */
export function getApiBaseUrl(): string {
  const envUrl = (
    process.env.NEXT_PUBLIC_API_URL || 'https://kings-taxi.onrender.com'
  ).trim();

  let base = envUrl.replace(/\/+$/, '');

  // Sequentially strip any trailing /api/v1, /v1, or /api segments to get the clean host origin
  while (
    base.endsWith('/api/v1') ||
    base.endsWith('/api') ||
    base.endsWith('/v1')
  ) {
    if (base.endsWith('/api/v1')) {
      base = base.slice(0, -'/api/v1'.length).replace(/\/+$/, '');
    } else if (base.endsWith('/api')) {
      base = base.slice(0, -'/api'.length).replace(/\/+$/, '');
    } else if (base.endsWith('/v1')) {
      base = base.slice(0, -'/v1'.length).replace(/\/+$/, '');
    }
  }

  return base || 'https://kings-taxi.onrender.com';
}

export const API_BASE_URL = getApiBaseUrl();
export const API_PREFIX = '/api/v1';

/**
 * Constructs a fully qualified API URL ensuring the /api/v1 prefix is added exactly once.
 * Even if callers pass '/auth/admin/...', '/api/v1/auth/admin/...', or 'auth/admin/...',
 * the resulting URL will never contain '/api/api/'.
 */
export function buildApiUrl(endpoint: string): string {
  const base = getApiBaseUrl();
  let path = (endpoint || '').trim();

  if (!path.startsWith('/')) {
    path = `/${path}`;
  }

  // Strip redundant leading /api/v1 or /api if the caller included it
  while (path.startsWith('/api/v1/') || path.startsWith('/api/')) {
    if (path.startsWith('/api/v1/')) {
      path = path.slice('/api/v1'.length);
    } else if (path.startsWith('/api/')) {
      path = path.slice('/api'.length);
    }
  }

  if (path === '/api/v1' || path === '/api') {
    path = '';
  }

  if (path && !path.startsWith('/')) {
    path = `/${path}`;
  }

  let fullUrl = `${base}${API_PREFIX}${path}`;

  // Ultimate guarantee against duplicate /api segments:
  while (fullUrl.includes('/api/api/')) {
    fullUrl = fullUrl.replace('/api/api/', '/api/');
  }

  return fullUrl;
}

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  skipAuth?: boolean;
  _retried?: boolean;
}

// Single-flight refresh mechanism singleton
let refreshPromise: Promise<string | null> | null = null;

/**
 * Executes a single-flight token refresh against the central backend.
 * Concurrency protected: multiple simultaneous 401 requests await the exact same refresh operation.
 */
export async function executeSingleFlightRefresh(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  const refreshToken = localStorage.getItem('kt_admin_refresh_token');
  if (!refreshToken) {
    handleSessionExpired();
    return null;
  }

  try {
    const refreshUrl = buildApiUrl('/auth/admin/refresh');
    const res = await fetch(refreshUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ refreshToken }),
    });

    const data = await res.json().catch(() => null);

    if (res.ok && data?.success && data?.data?.token) {
      const newAccessToken = data.data.token;
      localStorage.setItem('kt_admin_token', newAccessToken);
      if (data.data.refreshToken) {
        localStorage.setItem('kt_admin_refresh_token', data.data.refreshToken);
      }
      if (data.data.user) {
        try {
          const existingSession = localStorage.getItem('kt_super_admin_session');
          const userObj = existingSession ? { ...JSON.parse(existingSession), ...data.data.user } : data.data.user;
          localStorage.setItem('kt_super_admin_session', JSON.stringify(userObj));
        } catch {
          localStorage.setItem('kt_super_admin_session', JSON.stringify(data.data.user));
        }
      }
      return newAccessToken;
    }

    // Refresh token expired, revoked, or rejected by backend
    handleSessionExpired();
    return null;
  } catch (err) {
    return null;
  }
}

/**
 * Securely clears administrator tokens upon permanent session expiration
 * and redirects to login with an explicit session-expired query notification.
 */
export function handleSessionExpired(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('kt_admin_token');
    localStorage.removeItem('kt_admin_refresh_token');
    localStorage.removeItem('kt_super_admin_session');
    document.cookie = 'kt_admin_logged_in=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login?expired=1';
    }
  } catch {
    // Non-blocking
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  const { timeoutMs = 15000, skipAuth = false, _retried = false, ...fetchOptions } = options;

  let token: string | null = null;
  if (!skipAuth && typeof window !== 'undefined') {
    token = localStorage.getItem('kt_admin_token');
  }

  const url = buildApiUrl(endpoint);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...fetchOptions,
      credentials: 'include',
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      // Check if 401 specifically due to expired or invalid access token
      const isUnauthorized = res.status === 401;
      const isAuthExemptEndpoint =
        url.includes('/auth/admin/login') ||
        url.includes('/auth/admin/refresh') ||
        url.includes('/auth/admin/forgot-password') ||
        url.includes('/auth/admin/resend-reset-otp') ||
        url.includes('/auth/admin/verify-reset-otp') ||
        url.includes('/auth/admin/reset-password');

      const isTokenExpired =
        isUnauthorized &&
        !skipAuth &&
        !_retried &&
        !isAuthExemptEndpoint &&
        (
          data?.code === 'TOKEN_EXPIRED' ||
          data?.code === 'UNAUTHORIZED' ||
          data?.error?.code === 'TOKEN_EXPIRED' ||
          data?.error?.code === 'UNAUTHORIZED' ||
          (typeof data?.message === 'string' && data.message.toLowerCase().includes('expired')) ||
          (typeof data?.error?.message === 'string' && data.error.message.toLowerCase().includes('expired')) ||
          res.status === 401
        );

      if (isTokenExpired) {
        // Single-flight refresh: only 1 network refresh request executes; others await the same promise
        if (!refreshPromise) {
          refreshPromise = executeSingleFlightRefresh().finally(() => {
            refreshPromise = null;
          });
        }

        const newAccessToken = await refreshPromise;

        if (newAccessToken) {
          // Replay the exact original request once with the renewed access token
          const retryHeaders = {
            ...headers,
            Authorization: `Bearer ${newAccessToken}`,
          };
          return apiRequest<T>(endpoint, {
            ...options,
            _retried: true,
            headers: retryHeaders,
          });
        }

        return {
          success: false,
          error: 'Your administrator session has expired. Please sign in again.',
        };
      }

      const errMsg =
        data?.message ||
        data?.error?.message ||
        data?.error ||
        `Request failed with HTTP status ${res.status}`;
      return {
        success: false,
        error: errMsg,
      };
    }

    return {
      success: true,
      data: data?.data !== undefined ? data.data : data,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return {
        success: false,
        error: 'The request timed out. The central backend may be waking up, please retry.',
      };
    }
    return {
      success: false,
      error: err.message || 'Network error communicating with central backend.',
    };
  }
}
