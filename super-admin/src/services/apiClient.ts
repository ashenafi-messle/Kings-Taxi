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
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  const { timeoutMs = 15000, skipAuth = false, ...fetchOptions } = options;

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
