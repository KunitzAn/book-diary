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
  ratingIcon?: string         
  notes?: string | null
  summary?: string | null
  vibeTags?: string[]
  coverUrl?: string | null
  coverPosition?: number     
  position?: number
  isPublic?: boolean
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

// ── G: Сообщество ──

export interface PublicUser {
  id: number
  username: string | null
  publicBooksCount: number
}

// Облегчённый юзер (только id + username) — приходит в публичных книгах
export interface PublicAuthor {
  id: number
  username: string | null
}

// ── Книга в публичной ленте (с владельцем) ──
export type FeedBook = Book & { user: PublicAuthor }

// ── Значки рейтинга ──
export interface RatingIcon {
  id: string
  emoji: string
  label: string
}

export const RATING_ICONS: RatingIcon[] = [
  { id: 'star',      emoji: '⭐', label: 'Звезда' },
  { id: 'heart',     emoji: '❤️', label: 'Сердце' },
  { id: 'skull',     emoji: '💀', label: 'Череп' },
  { id: 'flower',    emoji: '🌸', label: 'Цветок' },
  { id: 'moon',      emoji: '🌙', label: 'Луна' },
  { id: 'fire',      emoji: '🔥', label: 'Огонь' },
  { id: 'crown',     emoji: '👑', label: 'Корона' },
  { id: 'gem',       emoji: '💎', label: 'Кристалл' },
  { id: 'lightning', emoji: '⚡', label: 'Молния' },
  { id: 'clover',    emoji: '🍀', label: 'Клевер' },
  { id: 'butterfly', emoji: '🦋', label: 'Бабочка' },
  { id: 'sparkles',  emoji: '✨', label: 'Искры' },
]

export function ratingEmoji(iconId?: string): string {
  return RATING_ICONS.find((i) => i.id === iconId)?.emoji ?? '⭐'
}