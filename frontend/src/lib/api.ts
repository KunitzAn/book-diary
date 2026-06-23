const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export function getToken(): string | null {
  return localStorage.getItem('token')
}

export function setToken(token: string): void {
  localStorage.setItem('token', token)
}

export function removeToken(): void {
  localStorage.removeItem('token')
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()

  // Content-Type нужен только если есть тело
  const hasBody = options.body != null
  
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),  // ← вот тут
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const msg = data.error ?? data.message ?? `Ошибка ${res.status}`
    const err = new Error(msg) as Error & { status?: number }
    err.status = res.status
    throw err
  }

  if (res.status === 204) {
    return undefined as T
  }

  return res.json()
}