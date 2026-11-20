/**
 * Kings Taxi Super Admin - Central API Client
 *
 * Configured for direct HTTPS communication with the Kings Taxi central backend
 * deployed on Render (https://kings-taxi.onrender.com/api/v1).
 */

const RAW_URL = process.env.NEXT_PUBLIC_API_URL || 'https://kings-taxi.onrender.com';
const API_PREFIX = '/api/v1';

// Safely construct API_BASE_URL ensuring /api/v1 is present
export const API_BASE_URL = RAW_URL.replace(/\/+$/, '').endsWith(API_PREFIX)
  ? RAW_URL.replace(/\/+$/, '')
  : `${RAW_URL.replace(/\/+$/, '')}${API_PREFIX}`;

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

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;

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
