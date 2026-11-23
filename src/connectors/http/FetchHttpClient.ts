import type { HttpRequestOptions, IHttpClient } from '@/types/api';

const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 2;
const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryDelayMs(res: Response, attempt: number): number {
  const retryAfter = res.headers.get('retry-after');
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds > 0) {
      return Math.min(seconds * 1000, 10_000);
    }
  }
  const base = 400 * 2 ** attempt;
  const jitter = Math.floor(Math.random() * 150);
  return base + jitter;
}

/**
 * Standard Fetch-based implementation of IHttpClient.
 * Supports query-parameter auth (defaultParams), header-based auth (defaultHeaders),
 * request timeouts, and automatic retry with backoff for 429 / transient 5xx responses.
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

    for (const [k, v] of Object.entries(this.defaultParams)) {
      if (v !== undefined && v !== null) {
        url.searchParams.set(k, String(v));
      }
    }

    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) {
          url.searchParams.set(k, String(v));
        }
      }
    }

    return url.toString();
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeoutMs: number,
    externalSignal?: AbortSignal,
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const onExternalAbort = () => controller.abort();

    if (externalSignal) {
      if (externalSignal.aborted) {
        controller.abort();
      } else {
        externalSignal.addEventListener('abort', onExternalAbort, { once: true });
      }
    }

    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
      externalSignal?.removeEventListener('abort', onExternalAbort);
    }
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    options?: HttpRequestOptions,
  ): Promise<T> {
    const url = this.buildUrl(path, options?.params);
    const hasBody = options?.body !== undefined;
    const isFormData = typeof FormData !== 'undefined' && options?.body instanceof FormData;
    const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
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

    const canRetry = method === 'GET' || !isFormData;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const res = await this.fetchWithTimeout(url, init, timeoutMs, options?.signal);

      if (!res.ok) {
        if (canRetry && RETRYABLE_STATUSES.has(res.status) && attempt < MAX_RETRIES) {
          await sleep(getRetryDelayMs(res, attempt));
          continue;
        }
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

    throw new HttpApiError(0, 'RetryExhausted', 'Request failed after maximum retries');
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
