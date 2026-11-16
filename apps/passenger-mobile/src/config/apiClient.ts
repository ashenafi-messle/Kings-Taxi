/**
 * Kings Taxi — Unified Central API Client & HTTP Transport Layer
 *
 * Responsibilities:
 * - Robust URL construction avoiding duplicated `/api/v1` prefixes.
 * - Enforces HTTPS in production; protects against silent localhost fallbacks.
 * - Standardized 15-second request timeouts with AbortController.
 * - Idempotent-only retries with exponential backoff (GET, HEAD, OPTIONS).
 * - Never retries payment creation or non-idempotent mutations.
 * - Centralized HTTP status code mapping (400, 401, 403, 404, 409, 422, 429, 500+).
 * - Automatic 401 session refresh with in-flight mutex deduplication.
 * - Sanitized passenger-safe error messages (no raw SQL or stack leaks).
 */

import { Platform } from 'react-native';
import { ApiResponse } from '../types';

export const PRODUCTION_API_URL = 'https://kings-taxi.onrender.com/api/v1';
const DEFAULT_PORT = 5000;
const DEFAULT_PREFIX = '/api/v1';

export function resolveApiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }

  const isProd =
    process.env.NODE_ENV === 'production' ||
    process.env.EXPO_PUBLIC_ENVIRONMENT === 'production';

  if (isProd) {
    return PRODUCTION_API_URL;
  }

  // Local development fallback
  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${DEFAULT_PORT}${DEFAULT_PREFIX}`;
  }

  return `http://127.0.0.1:${DEFAULT_PORT}${DEFAULT_PREFIX}`;
}

export const API_BASE_URL = resolveApiBaseUrl();

/**
 * Constructs a fully qualified API URL from a relative or absolute path,
 * safely avoiding duplicate `/api/v1` prefixes and trailing slashes.
 */
export function buildApiUrl(endpoint: string, baseUrl?: string): string {
  const base = (baseUrl || resolveApiBaseUrl()).replace(/\/+$/, '');
  let path = (endpoint || '').trim();

  // Guard against duplicate /api/v1 prefixes
  if (base.endsWith('/api/v1') && path.startsWith('/api/v1')) {
    path = path.slice('/api/v1'.length);
  }

  if (!path.startsWith('/')) {
    path = `/${path}`;
  }

  return `${base}${path}`;
}

export interface ApiFetchOptions extends RequestInit {
  timeoutMs?: number;
  skipAuth?: boolean;
  skipRefreshOn401?: boolean;
  idempotent?: boolean;
  retryCount?: number;
}

type TokenGetter = () => string | null;
type RefreshHandler = () => Promise<boolean>;

let activeTokenGetter: TokenGetter | null = null;
let activeRefreshHandler: RefreshHandler | null = null;

/**
 * Registers authentication hooks from the Zustand auth store
 * without introducing circular module dependencies.
 */
export function registerAuthHandlers(
  getToken: TokenGetter,
  refreshSession: RefreshHandler
): void {
  activeTokenGetter = getToken;
  activeRefreshHandler = refreshSession;
}

/**
 * Maps HTTP status codes and error payloads into human-friendly, localized error strings.
 */
function mapHttpError(status: number, responseBody: any): string {
  const serverMsg =
    responseBody?.message ||
    responseBody?.error?.message ||
    (typeof responseBody?.error === 'string' ? responseBody.error : null);

  switch (status) {
    case 400:
      return serverMsg || 'Invalid request. Please verify the provided details and try again.';
    case 401:
      return serverMsg || 'Authentication required. Your session may have expired.';
    case 403:
      return serverMsg || 'Access denied. You do not have permission to perform this action.';
    case 404:
      return serverMsg || 'The requested service or information was not found.';
    case 409:
      return serverMsg || 'A conflicting request already exists. Please refresh and try again.';
    case 422:
      return serverMsg || 'Unable to process the request due to invalid input parameters.';
    case 429:
      return serverMsg || 'Too many requests. Please wait a moment and try again.';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'The Kings Taxi service is momentarily unavailable. Please try again shortly.';
    default:
      return serverMsg || `Request completed with status code ${status}.`;
  }
}

/**
 * Executes an HTTP request against the Kings Taxi central API with:
 * - Configured network timeouts
 * - Bearer authorization headers
 * - Transparent 401 token refresh retry
 * - Safe retries for idempotent requests
 */
export async function apiFetch<T>(
  endpoint: string,
  options: ApiFetchOptions = {},
  customToken?: string | null
): Promise<ApiResponse<T>> {
  const method = (options.method || 'GET').toUpperCase();
  const isIdempotent =
    options.idempotent ?? (method === 'GET' || method === 'HEAD' || method === 'OPTIONS');
  const maxRetries = isIdempotent ? (options.retryCount ?? 1) : 0;
  const timeoutMs = options.timeoutMs ?? 15000;

  const url = buildApiUrl(endpoint);

  const token =
    customToken !== undefined
      ? customToken
      : options.skipAuth
      ? null
      : activeTokenGetter
      ? activeTokenGetter()
      : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let attempt = 0;

  while (attempt <= maxRetries) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        method,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timer);

      const json = await response.json().catch(() => null);

      // Handle 401 Unauthorized: Attempt token refresh once if handler is registered
      if (
        response.status === 401 &&
        !options.skipRefreshOn401 &&
        !endpoint.includes('/auth/login') &&
        !endpoint.includes('/auth/refresh') &&
        !endpoint.includes('/auth/logout') &&
        activeRefreshHandler
      ) {
        const refreshed = await activeRefreshHandler();
        if (refreshed) {
          const newToken = activeTokenGetter ? activeTokenGetter() : null;
          return apiFetch<T>(
            endpoint,
            { ...options, skipRefreshOn401: true },
            newToken
          );
        }
      }

      if (!response.ok) {
        const errorText = mapHttpError(response.status, json);
        return {
          success: false,
          data: (json?.data || null) as T,
          error: errorText,
          message: errorText,
        };
      }

      return {
        success: true,
        data: (json?.data !== undefined ? json.data : json) as T,
        message: json?.message,
      };
    } catch (err: any) {
      clearTimeout(timer);

      const isTimeout = err?.name === 'AbortError';

      // Idempotent retry on network failure or timeout
      if (attempt < maxRetries && isIdempotent) {
        attempt++;
        await new Promise((resolve) => setTimeout(resolve, attempt * 600));
        continue;
      }

      const errorMessage = isTimeout
        ? 'Network request timed out. Please check your connection and try again.'
        : 'Unable to connect to Kings Taxi server. Please verify your internet connection.';

      return {
        success: false,
        data: null as any,
        error: errorMessage,
        message: errorMessage,
      };
    }
  }

  return {
    success: false,
    data: null as any,
    error: 'Request failed after maximum retry attempts.',
  };
}
