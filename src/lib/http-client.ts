import { getCookie, setCookie, removeCookie } from './cookie';
import { decodeJwt } from './jwt';
import type { LoginResponse } from '@/types';

export class HttpError extends Error {
  status: number;
  body?: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.body = body;
  }
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

const AUTH_PATHS = ['/auth/login', '/auth/refresh'];

let refreshPromise: Promise<LoginResponse> | null = null;

export function saveTokens(data: LoginResponse) {
  const payload = decodeJwt(data.access_token);
  const maxAge = payload.exp ? payload.exp - Math.floor(Date.now() / 1000) : undefined;

  setCookie('access_token', data.access_token, { maxAge });
  setCookie('refresh_token', data.refresh_token, { maxAge });
}

function clearTokens() {
  removeCookie('access_token');
  removeCookie('refresh_token');
}

async function refreshTokens(): Promise<LoginResponse> {
  const token = getCookie('refresh_token');
  if (!token) {
    throw new HttpError(401, 'No refresh token found');
  }

  const response = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: token }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => undefined);
    throw new HttpError(response.status, 'Token refresh failed', body);
  }

  return response.json() as Promise<LoginResponse>;
}

async function request<T>(
  method: string,
  path: string,
  options?: { body?: unknown; signal?: AbortSignal },
): Promise<T> {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };

  const token = getCookie('access_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const hasBody = options?.body !== undefined;
  if (hasBody) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: hasBody ? JSON.stringify(options.body) : undefined,
    signal: options?.signal,
  });

  if (!response.ok) {
    if (response.status === 401 && !AUTH_PATHS.includes(path)) {
      try {
        // Deduplicate concurrent refresh calls
        refreshPromise ??= refreshTokens();
        const data = await refreshPromise;
        saveTokens(data);

        // Retry the original request with the new token
        return request<T>(method, path, options);
      } catch {
        clearTokens();
        throw new HttpError(401, 'Session expired');
      } finally {
        refreshPromise = null;
      }
    }

    const body = await response.json().catch(() => undefined);
    throw new HttpError(
      response.status,
      `${method} ${path} failed with status ${response.status}`,
      body,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const httpClient = {
  get<T>(path: string, signal?: AbortSignal) {
    return request<T>('GET', path, { signal });
  },
  post<T>(path: string, body?: unknown) {
    return request<T>('POST', path, { body });
  },
  put<T>(path: string, body?: unknown) {
    return request<T>('PUT', path, { body });
  },
  patch<T>(path: string, body?: unknown) {
    return request<T>('PATCH', path, { body });
  },
  delete<T>(path: string) {
    return request<T>('DELETE', path);
  },
};
