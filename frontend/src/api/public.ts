import { apiFetch } from '../lib/api'
import type { Book, PublicUser, PublicAuthor } from '../types/models'

// Публичные эндпоинты — без авторизации, но apiFetch просто не пошлёт токен,
// бэк их и так не требует.

// Список юзеров с публичными книгами
export function getPublicUsers(): Promise<PublicUser[]> {
  return apiFetch<PublicUser[]>('/public/users')
}

// Публичные книги конкретного юзера
export function getPublicUserBooks(
  userId: number
): Promise<{ user: PublicAuthor; books: Book[] }> {
  return apiFetch<{ user: PublicAuthor; books: Book[] }>(
    `/public/users/${userId}/books`
  )
}

// Одна публичная книга (со всем содержимым)
export function getPublicBook(
  id: number
): Promise<Book & { user: PublicAuthor }> {
  return apiFetch<Book & { user: PublicAuthor }>(`/public/books/${id}`)
}