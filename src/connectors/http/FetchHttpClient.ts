import type { HttpRequestOptions, IHttpClient } from '@/types/api';

export class HttpApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    message: string,
  ) {
    super(message);
    this.name = 'HttpApiError';
  }
}

/**
 * Standard Fetch-based implementation of IHttpClient.
 * Supports query-parameter auth (defaultParams) and header-based auth (defaultHeaders, e.g. Bearer/Basic).
 */
export class FetchHttpClient implements IHttpClient {
  constructor(
    private readonly baseUrl: string = '',
    private readonly defaultParams: Record<string, string> = {},
    private readonly defaultHeaders: Record<string, string> = {},
  ) {}

  private buildUrl(path: string, params?: HttpRequestOptions['params']): string {
    const rawUrl = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    const url = new URL(rawUrl);

    Object.entries(this.defaultParams).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        url.searchParams.set(k, String(v));
      }
    });

    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          url.searchParams.set(k, String(v));
        }
      });
    }

    return url.toString();
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    options?: HttpRequestOptions,
  ): Promise<T> {
    const url = this.buildUrl(path, options?.params);
    const hasBody = options?.body !== undefined;
    const isFormData = typeof FormData !== 'undefined' && options?.body instanceof FormData;
    const init: RequestInit = {
      method,
      headers: {
        ...this.defaultHeaders,
        ...(hasBody && !isFormData ? { 'Content-Type': 'application/json' } : {}),
        ...(options?.headers || {}),
      },
      ...(hasBody
        ? { body: isFormData ? (options.body as FormData) : JSON.stringify(options.body) }
        : {}),
    };

    const res = await fetch(url, init);
    if (!res.ok) {
      const errorText = await res.text().catch(() => res.statusText);
      throw new HttpApiError(
        res.status,
        res.statusText,
        `HTTP ${res.status} ${res.statusText}: ${errorText}`,
      );
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return (await res.json()) as T;
    }
    return undefined as T;
  }

  get<T>(path: string, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>('GET', path, options);
  }

  post<T>(path: string, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>('POST', path, options);
  }

  put<T>(path: string, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>('PUT', path, options);
  }

  patch<T>(path: string, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>('PATCH', path, options);
  }

  delete<T>(path: string, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>('DELETE', path, options);
  }
}
