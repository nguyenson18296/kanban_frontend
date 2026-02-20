import { getCookie } from './cookie';

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
