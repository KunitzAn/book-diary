export type Status = 'WANT' | 'READING' | 'READ'

export interface Book {
  id: number
  title: string
  author: string
  genre?: string | null
  year?: number | null
  status: Status
  rating?: number | null
  notes?: string | null
  summary?: string | null   // ← добавь если нет
  coverUrl?: string | null
  quotes?: Quote[]
  characters?: Character[]
  createdAt: string
}

export interface Quote {
  id: number
  bookId: number
  text: string
  chapter: string | null
}

export interface Character {
  id: number
  bookId: number
  name: string
  description: string | null
}

// Удобные подписи статусов для UI
export const STATUS_LABELS: Record<Status, string> = {
  WANT: 'Хочу прочитать',
  READING: 'Читаю',
  READ: 'Прочитано',
}

// Варианты сортировки полки (под ?sort= на бэке)
export type SortBy = 'date' | 'rating' | 'author'