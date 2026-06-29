// frontend/src/types/models.ts
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
  summary?: string | null
  vibeTags?: string[]
  coverUrl?: string | null
  position?: number          // ← для drag&drop
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

export const STATUS_LABELS: Record<Status, string> = {
  WANT: 'Хочу прочитать',
  READING: 'Читаю',
  READ: 'Прочитано',
}

export type SortBy = 'date' | 'rating' | 'author'