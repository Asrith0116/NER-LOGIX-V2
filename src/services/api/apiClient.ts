/**
 * Centralized API Client for NER-LOGIX Frontend.
 * Standardizes fetch requests, timeouts, and error handling for the authoritative
 * Node/Vite operational backend (with SQLite persistence), while remaining compatible
 * with the future/stand-alone FastAPI backend architecture.
 * Crucially designed for resilience: if the backend is down or unreachable,
 * it returns clean structured error results without throwing unhandled exceptions.
 */

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  ok: boolean;
  status: number;
}

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 3000;

export const getApiBaseUrl = (): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL as string;
  }
  if (typeof window !== 'undefined') {
    return '';
  }
  return 'http://localhost:3000';
};

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, headers = {}, ...rest } = options;
  const baseUrl = getApiBaseUrl().replace(/\/+$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${cleanEndpoint}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
      try {
        const errJson = await response.json();
        if (errJson && (errJson.detail || errJson.message || errJson.error)) {
          errorMessage = errJson.detail || errJson.message || errJson.error;
        }
      } catch {
        // Fall back to status text
      }

      return {
        data: null,
        error: errorMessage,
        ok: false,
        status: response.status,
      };
    }

    const data = (await response.json()) as T;
    return {
      data,
      error: null,
      ok: true,
      status: response.status,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const isAbort = err instanceof DOMException && err.name === 'AbortError';
    const errorMsg = isAbort
      ? `Request to ${endpoint} timed out after ${timeoutMs}ms`
      : `Backend unreachable: ${(err as Error).message || 'Connection refused'}`;

    return {
      data: null,
      error: errorMsg,
      ok: false,
      status: 0,
    };
  }
}

export async function apiGet<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, { method: 'GET', ...options });
}

export async function apiPost<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...options,
  });
}

export async function apiPut<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, {
    method: 'PUT',
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...options,
  });
}
