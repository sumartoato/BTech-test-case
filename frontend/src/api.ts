const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';
const TIMEOUT_MS = 15000;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
  headers?: Record<string, string>;
  retries?: number;
}

let onUnauthorized: () => void = () => {};

export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const method = opts.method ?? 'GET';
  // only GET is retried by default; other calls opt in when they are safe to repeat
  const retries = opts.retries ?? (method === 'GET' ? 3 : 0);

  for (let attempt = 0; ; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(BASE_URL + path, {
        method,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
          ...opts.headers,
        },
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        if (res.status === 401 && opts.token) onUnauthorized();
        const message = Array.isArray(data?.message)
          ? data.message.join(', ')
          : (data?.message ?? res.statusText);
        throw new ApiError(res.status, message);
      }

      return data as T;
    } catch (err) {
      const isServerError = err instanceof ApiError && err.status >= 500;
      const isNetworkError = !(err instanceof ApiError);

      if ((isServerError || isNetworkError) && attempt < retries) {
        await sleep(Math.min(1000 * 2 ** attempt, 8000));
        continue;
      }

      if (isNetworkError) {
        throw new ApiError(0, 'Connection problem, please try again');
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}
