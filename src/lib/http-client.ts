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
  const accessMaxAge = payload.exp ? payload.exp - Math.floor(Date.now() / 1000) : undefined;

  setCookie('access_token', data.access_token, { maxAge: accessMaxAge });
  // Refresh token may be opaque (not a JWT) — safely try to decode for maxAge
  let refreshMaxAge: number | undefined;
  try {
    const refreshPayload = decodeJwt(data.refresh_token);
    refreshMaxAge = refreshPayload.exp
      ? refreshPayload.exp - Math.floor(Date.now() / 1000)
      : undefined;
  } catch {
    // Opaque refresh token — no maxAge, cookie persists until session ends
  }
  setCookie('refresh_token', data.refresh_token, { maxAge: refreshMaxAge });
}

function clearTokens() {
  removeCookie('access_token');
  removeCookie('refresh_token');
}

/**
 * Attempt to refresh tokens. Used by route guards to refresh
 * before redirecting to login. Throws on failure.
 */
export async function tryRefreshTokens(): Promise<void> {
  try {
    refreshPromise ??= refreshTokens();
    const data = await refreshPromise;
    saveTokens(data);
  } catch {
    clearTokens();
    throw new HttpError(401, 'Session expired');
  } finally {
    refreshPromise = null;
  }
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

interface UploadOptions {
  signal?: AbortSignal;
  /** Raw byte counts, straight from the browser's upload progress events. */
  onProgress?: (loaded: number, total: number) => void;
}

/**
 * Multipart POST via XHR — fetch cannot report upload progress. Mirrors
 * `request`'s semantics: Bearer auth, `HttpError` with the parsed body on a
 * non-2xx response, and a deduplicated refresh-and-retry on 401. No
 * Content-Type header — the browser adds the multipart boundary itself.
 */
function uploadRequest<T>(path: string, form: FormData, options?: UploadOptions): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (options?.signal?.aborted) {
      reject(new DOMException('The upload was aborted', 'AbortError'));
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE_URL}${path}`);
    xhr.setRequestHeader('Accept', 'application/json');
    const token = getCookie('access_token');
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    const onSignalAbort = () => xhr.abort();
    options?.signal?.addEventListener('abort', onSignalAbort);
    const settle = (finish: () => void) => {
      options?.signal?.removeEventListener('abort', onSignalAbort);
      finish();
    };

    const onProgress = options?.onProgress;
    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) onProgress(event.loaded, event.total);
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const value =
            xhr.status === 204 || xhr.responseText === ''
              ? (undefined as T)
              : (JSON.parse(xhr.responseText) as T);
          settle(() => resolve(value));
        } catch (parseError) {
          settle(() => reject(parseError));
        }
        return;
      }

      if (xhr.status === 401 && !AUTH_PATHS.includes(path)) {
        settle(() =>
          resolve(
            (async () => {
              try {
                // Deduplicate concurrent refresh calls
                refreshPromise ??= refreshTokens();
                const data = await refreshPromise;
                saveTokens(data);

                // Retry with the new token; its own errors propagate untouched.
                return uploadRequest<T>(path, form, options);
              } catch {
                clearTokens();
                throw new HttpError(401, 'Session expired');
              } finally {
                refreshPromise = null;
              }
            })(),
          ),
        );
        return;
      }

      let body: unknown;
      try {
        body = xhr.responseText === '' ? undefined : JSON.parse(xhr.responseText);
      } catch {
        body = undefined;
      }
      settle(() =>
        reject(new HttpError(xhr.status, `POST ${path} failed with status ${xhr.status}`, body)),
      );
    });

    xhr.addEventListener('error', () =>
      settle(() => reject(new HttpError(0, `POST ${path} failed: network error`))),
    );
    xhr.addEventListener('abort', () =>
      settle(() => reject(new DOMException('The upload was aborted', 'AbortError'))),
    );

    xhr.send(form);
  });
}

export type { UploadOptions };

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
  delete<T>(path: string, body?: unknown) {
    return request<T>('DELETE', path, { body });
  },
  upload<T>(path: string, form: FormData, options?: UploadOptions) {
    return uploadRequest<T>(path, form, options);
  },
};
