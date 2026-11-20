/**
 * Kings Taxi Super Admin - Central API Client
 *
 * Prepared for future integration with the existing Kings Taxi central backend.
 * Provides unified request handling, token injection, timeout, and response normalization.
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://kings-taxi.onrender.com/api/v1';

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
  const url = `${API_BASE_URL.replace(/\/+$/, '')}${cleanEndpoint}`;

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
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return {
        success: false,
        error: data?.message || data?.error || `Request failed with HTTP status ${res.status}`,
      };
    }

    return {
      success: true,
      data: data?.data !== undefined ? data.data : data,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return { success: false, error: 'Request timed out. Please try again.' };
    }
    return { success: false, error: err.message || 'Network error occurred.' };
  }
}
