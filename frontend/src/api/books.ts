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