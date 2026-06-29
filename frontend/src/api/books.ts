import { apiFetch } from '../lib/api'
import type { Book, Quote, Character, Status, SortBy } from '../types/models'

// ---------- Books ----------

export interface BookFilters {
  status?: Status
  genre?: string
  sort?: SortBy
}

export function getBooks(filters: BookFilters = {}): Promise<Book[]> {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.genre) params.set('genre', filters.genre)
  if (filters.sort) params.set('sort', filters.sort)

  const qs = params.toString()
  return apiFetch<Book[]>(`/books${qs ? `?${qs}` : ''}`)
}

export function getBook(id: number): Promise<Book> {
  return apiFetch<Book>(`/books/${id}`)
}

export type BookInput = Partial<
  Pick<Book, 'title' | 'author' | 'genre' | 'year' | 'status' | 'rating' | 'coverUrl' | 'notes' | 'summary'>
>

export function createBook(data: BookInput): Promise<Book> {
  return apiFetch<Book>('/books', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateBook(id: number, data: BookInput): Promise<Book> {
  return apiFetch<Book>(`/books/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function deleteBook(id: number): Promise<void> {
  return apiFetch<void>(`/books/${id}`, { method: 'DELETE' })
}

// ---------- Quotes ----------

export function addQuote(bookId: number, data: { text: string; chapter?: string | null }): Promise<Quote> {
  return apiFetch<Quote>(`/books/${bookId}/quotes`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateQuote(id: number, data: { text?: string; chapter?: string | null }): Promise<Quote> {
  return apiFetch<Quote>(`/quotes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function deleteQuote(id: number): Promise<void> {
  return apiFetch<void>(`/quotes/${id}`, { method: 'DELETE' })
}

// ---------- Characters ----------

export function addCharacter(bookId: number, data: { name: string; description?: string | null }): Promise<Character> {
  return apiFetch<Character>(`/books/${bookId}/characters`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateCharacter(id: number, data: { name?: string; description?: string | null }): Promise<Character> {
  return apiFetch<Character>(`/characters/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function deleteCharacter(id: number): Promise<void> {
  return apiFetch<void>(`/characters/${id}`, { method: 'DELETE' })
}

// ---------- Cover ----------

export async function uploadCover(bookId: number, file: File): Promise<Book> {
  const formData = new FormData()
  formData.append('cover', file)

  const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
  const token = localStorage.getItem('token')

  const res = await fetch(`${BASE_URL}/books/${bookId}/cover`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message ?? 'Ошибка загрузки обложки')
  }

  return res.json()
}

// ---------- AI генерация ----------

export function generateSummary(bookId: number): Promise<{ summary: string }> {
  return apiFetch<{ summary: string }>(`/books/${bookId}/generate-summary`, {
    method: 'POST',
  })
}

export function generateCharacters(bookId: number): Promise<{ characters: Character[] }> {
  return apiFetch<{ characters: Character[] }>(`/books/${bookId}/generate-characters`, {
    method: 'POST',
  })
}

export function generateCover(bookId: number): Promise<Book> {
  return apiFetch<Book>(`/books/${bookId}/generate-cover`, {
    method: 'POST',
  })
}

// ---------- AI: новые ----------

// F1 — описание одного героя по имени
export function generateCharacter(bookId: number, name: string): Promise<{ character: Character }> {
  return apiFetch<{ character: Character }>(`/books/${bookId}/generate-character`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

// F2 — хештеги-вайб по цитатам
export function generateVibe(bookId: number): Promise<{ vibeTags: string[] }> {
  return apiFetch<{ vibeTags: string[] }>(`/books/${bookId}/generate-vibe`, {
    method: 'POST',
  })
}

// F4 — жанр и год по названию+автору
export function generateGenreYear(bookId: number): Promise<{ genre: string | null; year: number | null }> {
  return apiFetch<{ genre: string | null; year: number | null }>(`/books/${bookId}/generate-genre-year`, {
    method: 'POST',
  })
}