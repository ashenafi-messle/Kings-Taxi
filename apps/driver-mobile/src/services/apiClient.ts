import { DRIVER_API_ENDPOINTS, resolveApiBaseUrl } from '../config/api';
import { DriverTokenStorage } from '../utils/secureStorage';

export interface ApiEnvelope<T = any> {
  success: boolean;
  code?: string;
  message?: string;
  data?: T;
  error?: { code?: string; message?: string } | string;
}

export class ApiClientError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code = 'API_ERROR') {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
  }
}

const REQUEST_TIMEOUT_MS = 15000;

let inFlightRefresh: Promise<boolean> | null = null;
let onSessionExpiredCallback: (() => void) | null = null;

export function registerSessionExpiredHandler(cb: () => void): void {
  onSessionExpiredCallback = cb;
}

function buildUrl(path: string): string {
  const base = resolveApiBaseUrl().replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

function extractErrorMessage(payload: ApiEnvelope | null, status: number): { message: string; code: string } {
  if (payload) {
    if (typeof payload.error === 'object' && payload.error?.message) {
      return {
        message: payload.error.message,
        code: payload.error.code || payload.code || 'API_ERROR',
      };
    }
    if (typeof payload.error === 'string' && payload.error) {
      return { message: payload.error, code: payload.code || 'API_ERROR' };
    }
    if (payload.message) {
      return { message: payload.message, code: payload.code || 'API_ERROR' };
    }
  }
  if (status >= 500) {
    return { message: 'Server is temporarily unavailable. Please try again shortly.', code: 'SERVER_ERROR' };
  }
  return { message: 'Request failed. Please check your input and try again.', code: 'REQUEST_FAILED' };
}

async function performFetch<T>(
  endpoint: string,
  options: RequestInit & { skipAuth?: boolean } = {}
): Promise<{ status: number; payload: ApiEnvelope<T> | null }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    };

    if (!options.skipAuth) {
      const token = await DriverTokenStorage.getAccessToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    const response = await fetch(buildUrl(endpoint), {
      ...options,
      headers,
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
    return { status: response.status, payload };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new ApiClientError('Request timed out. Check your internet connection.', 408, 'TIMEOUT');
    }
    throw new ApiClientError(
      'Unable to reach Kings Taxi server. Check your internet connection.',
      0,
      'NETWORK_ERROR'
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function refreshDriverSession(): Promise<boolean> {
  if (inFlightRefresh) {
    return inFlightRefresh;
  }

  inFlightRefresh = (async () => {
    try {
      const refreshToken = await DriverTokenStorage.getRefreshToken();
      if (!refreshToken) {
        return false;
      }

      const { status, payload } = await performFetch<{
        accessToken: string;
        refreshToken: string;
      }>(DRIVER_API_ENDPOINTS.refresh, {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({ refreshToken }),
      });

      if (status >= 200 && status < 300 && payload?.success && payload.data?.accessToken && payload.data?.refreshToken) {
        await DriverTokenStorage.saveTokens(
          payload.data.accessToken,
          payload.data.refreshToken
        );
        return true;
      }

      await DriverTokenStorage.clearTokens();
      return false;
    } catch {
      return false;
    } finally {
      inFlightRefresh = null;
    }
  })();

  return inFlightRefresh;
}

export async function driverApiRequest<T>(
  endpoint: string,
  options: RequestInit & { skipAuth?: boolean; skipRefreshOn401?: boolean } = {}
): Promise<T> {
  const { status, payload } = await performFetch<T>(endpoint, options);

  if (status === 401 && !options.skipAuth && !options.skipRefreshOn401) {
    const refreshed = await refreshDriverSession();
    if (refreshed) {
      const retry = await performFetch<T>(endpoint, options);
      if (retry.status >= 200 && retry.status < 300 && retry.payload?.success) {
        return retry.payload.data as T;
      }
      const retryErr = extractErrorMessage(retry.payload, retry.status);
      throw new ApiClientError(retryErr.message, retry.status, retryErr.code);
    }

    await DriverTokenStorage.clearTokens();
    if (onSessionExpiredCallback) {
      onSessionExpiredCallback();
    }
    throw new ApiClientError('Your session has expired. Please sign in again.', 401, 'SESSION_EXPIRED');
  }

  if (status >= 200 && status < 300 && payload?.success) {
    return payload.data as T;
  }

  const errInfo = extractErrorMessage(payload, status);
  throw new ApiClientError(errInfo.message, status, errInfo.code);
}
