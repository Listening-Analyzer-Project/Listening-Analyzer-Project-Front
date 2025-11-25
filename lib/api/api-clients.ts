type Method = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
// TODO : trier commentaires
interface ApiClientOptions {
  timeoutMs?: number // request timeout
  maxRetries?: number // number of retries on network/server errors
}

class ApiError extends Error {
  status?: number
  data?: any
  constructor(message: string, status?: number, data?: any) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

const BASE = process.env.NEXT_PUBLIC_API_BASE || ''

export class ApiClient {
  private timeoutMs: number
  private maxRetries: number
  private defaultHeaders: Record<string, string>
  private cache = new Map<string, any>() // simple GET cache

  constructor(opts: ApiClientOptions = {}) {
    this.timeoutMs = opts.timeoutMs ?? 15_000
    this.maxRetries = opts.maxRetries ?? 1
    this.defaultHeaders = { Accept: 'application/json' }
  }

  // Build full url simply using the BASE env variable
  private buildFullUrl(path: string, query?: Record<string, string | number | boolean>) {
    const trimmed = path.startsWith('/') ? path.slice(1) : path
    const baseUrl = path.startsWith('http') ? path : `${BASE}/${trimmed}`
    if (!query || Object.keys(query).length === 0) return baseUrl
    const q = new URLSearchParams()
    Object.entries(query).forEach(([k, v]) => q.append(k, String(v)))
    return `${baseUrl}?${q.toString()}`
  }

  private shouldRetryStatus(status: number) {
    return [502, 503, 504].includes(status)
  }

  private delay(ms: number) {
    return new Promise(res => setTimeout(res, ms))
  }

  // Generic request
  private async request<T>(
    method: Method,
    path: string,
    opts?: {
      query?: Record<string, string | number | boolean>
      body?: any
      headers?: Record<string, string>
      cache?: boolean // GET-only
      timeoutMs?: number
      signal?: AbortSignal // allow caller to cancel
      retries?: number // override client default
    }
  ): Promise<T> {
    const url = this.buildFullUrl(path, opts?.query)

    // Simple GET cache
    if (method === 'GET' && opts?.cache && this.cache.has(url)) {
      return this.cache.get(url) as T
    }

    const headers: Record<string, string> = { ...this.defaultHeaders, ...(opts?.headers ?? {}) }

    const init: RequestInit = {
      method,
      headers,
    }

    if (opts?.body !== undefined && method !== 'GET' && method !== 'HEAD') {
      if (opts.body instanceof FormData) {
        // let browser set the multipart boundary
        init.body = opts.body as unknown as BodyInit
      } else if (typeof opts.body === 'object') {
        headers['Content-Type'] = 'application/json'
        init.body = JSON.stringify(opts.body)
      } else {
        init.body = opts.body as unknown as BodyInit
      }
    }

    // Combine caller signal (if any) and our timeout into a single AbortController
    const controller = new AbortController()
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    if (opts?.signal) {
      // forward abort from external signal
      if (opts.signal.aborted) {
        controller.abort()
      } else {
        const onAbort = () => controller.abort()
        opts.signal.addEventListener('abort', onAbort, { once: true })
        // cleanup listener after request finishes
        // (we remove it below)
      }
    }

    const timeout = opts?.timeoutMs ?? this.timeoutMs
    timeoutId = setTimeout(() => controller.abort(), timeout)

    init.signal = controller.signal

    const retries = opts?.retries ?? this.maxRetries
    let attempt = 0
    let lastError: any = null

    while (attempt <= retries) {
      try {
        const res = await fetch(url, init)
        const contentType = res.headers.get('content-type') ?? ''
        const text = await res.text()
        const data = contentType.includes('application/json') && text ? JSON.parse(text) : text

        if (!res.ok) {
          // TODO : gérer les erreurs
          const err = new ApiError(data?.message ?? `HTTP ${res.status}`, res.status, data)
          if (attempt < retries && this.shouldRetryStatus(res.status)) {
            attempt++
            await this.delay(2 ** attempt * 100)
            continue
          }
          throw err
        }

        // cache GET
        if (method === 'GET' && opts?.cache) {
          this.cache.set(url, data)
        }

        // cleanup event listener on external signal if present
        if (opts?.signal) {
          try {
            opts.signal.removeEventListener('abort', () => { })
          } catch (e) {
            /* ignore */
          }
        }
        if (timeoutId) clearTimeout(timeoutId)

        return data as T
      } catch (err: any) {
        // TODO : gérer les erreurs
        lastError = err
        // retry on network error or aborted? only retry on network (TypeError) or certain statuses handled above
        const isNetworkError = err instanceof TypeError || (err instanceof ApiError && !err.status)
        if (attempt < retries && isNetworkError) {
          attempt++
          await this.delay(2 ** attempt * 100)
          continue
        }
        // cleanup
        if (timeoutId) clearTimeout(timeoutId)
        throw err
      }
    }

    throw lastError ?? new ApiError('Unknown error')
  }

  // Convenience methods
  get<T>(
    path: string,
    opts?: {
      query?: Record<string, string | number | boolean>
      cache?: boolean
      headers?: Record<string, string>
      timeoutMs?: number
      signal?: AbortSignal
    }
  ) {
    return this.request<T>('GET', path, {
      query: opts?.query,
      cache: opts?.cache,
      headers: opts?.headers,
      timeoutMs: opts?.timeoutMs,
      signal: opts?.signal,
    })
  }
  post<T>(path: string, body?: any, headers?: Record<string, string>) {
    return this.request<T>('POST', path, { body, headers })
  }
  put<T>(path: string, body?: any, headers?: Record<string, string>) {
    return this.request<T>('PUT', path, { body, headers })
  }
  patch<T>(path: string, body?: any, headers?: Record<string, string>) {
    return this.request<T>('PATCH', path, { body, headers })
  }
  delete<T>(path: string, body?: any, headers?: Record<string, string>) {
    return this.request<T>('DELETE', path, { body, headers })
  }

  // Cache helpers
  invalidateCache(path?: string) {
    if (!path) {
      this.cache.clear()
      return
    }
    const full = path.startsWith('http') ? path : this.buildFullUrl(path)
    this.cache.delete(full)
  }
}

// Default singleton
export const apiClient = new ApiClient()
export default apiClient
