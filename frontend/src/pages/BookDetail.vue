<template>
  <div class="px-4 py-6 sm:px-6">

    <!-- Шапка -->
    <div class="glass mb-5 flex items-center gap-3 rounded-2xl px-4 py-3">
      <button
        @click="router.back()"
        class="flex h-8 w-8 items-center justify-center rounded-full text-lg text-gray-600 transition hover:bg-white/60"
      >←</button>
      <h1 class="truncate text-lg font-semibold">{{ book?.title ?? '…' }}</h1>
    </div>

    <!-- Загрузка -->
    <div v-if="loading" class="flex flex-col gap-4">
      <div class="glass-card h-56 animate-pulse rounded-2xl bg-white/50"></div>
      <div class="glass-card h-32 animate-pulse"></div>
      <div class="glass-card h-40 animate-pulse"></div>
    </div>

    <!-- Ошибка -->
    <div v-else-if="error" class="glass-card animate-fade-in p-6 text-center">
      <p class="text-3xl">😕</p>
      <p class="mt-2 text-sm text-red-500">{{ error }}</p>
    </div>

    <div v-else-if="book" class="flex animate-fade-in flex-col gap-4">

      <!-- ── Обложка (широкая, вытянутая, с перетаскиванием фокуса) ── -->
      <div class="flex flex-col items-center gap-2">
        <div
          ref="coverBox"
          class="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-br from-white/60 to-white/20 shadow-glass"
          style="height: 220px;"
          :class="book.coverUrl ? 'cursor-grab active:cursor-grabbing' : ''"
          @pointerdown="onDragStart"
        >
          <img
            v-if="book.coverUrl"
            :src="apiBase + book.coverUrl"
            alt="Обложка"
            draggable="false"
            class="h-full w-full select-none object-cover"
            :style="{ objectPosition: `center ${coverPos}%` }"
          />
          <div v-else class="flex h-full w-full items-center justify-center">
            <span class="text-5xl opacity-50">📖</span>
          </div>

          <!-- подсказка перетаскивания -->
          <div
            v-if="book.coverUrl"
            class="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 text-[11px] text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100"
            :class="{ '!opacity-100': dragging }"
          >
            ↕ Потяни, чтобы выбрать кадр
          </div>
        </div>

        <label class="cursor-pointer text-xs text-gray-400 underline underline-offset-2 hover:text-gray-600">
          {{ coverUploading ? 'Загружаю…' : (book.coverUrl ? 'Заменить обложку' : 'Загрузить обложку') }}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            class="hidden"
            :disabled="coverUploading"
            @change="onCoverChange"
          />
        </label>
      </div>

      <!-- Основные поля -->
      <div class="glass-card flex flex-col gap-4 p-4">
        <InlineField label="Название" :value="book.title" @save="v => patch({ title: v })" />
        <InlineField label="Автор" :value="book.author" @save="v => patch({ author: v })" />
        <InlineField label="Жанр" :value="book.genre ?? ''" placeholder="не указан"
          @save="v => patch({ genre: v || null })" />
        <InlineField label="Год" :value="book.year ? String(book.year) : ''"
          placeholder="не указан" type="number"
          @save="v => patch({ year: v ? Number(v) : null })" />

        <button @click="generateGenreYearAI" :disabled="genreYearLoading" class="btn-ai-ghost self-start">
          <span v-if="genreYearLoading" class="animate-spin">⏳</span>
          <span v-else>✨</span>
          {{ genreYearLoading ? 'Определяю…' : 'Определить жанр и год (AI)' }}
        </button>
      </div>

      <!-- Статус -->
      <div class="glass-card p-4">
        <p class="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Статус</p>
        <div class="flex gap-2">
          <button
            v-for="s in statuses" :key="s.value"
            @click="patch({ status: s.value })"
            class="flex-1 rounded-full py-1.5 text-sm font-medium transition active:scale-95"
            :class="book.status === s.value
              ? 'bg-gradient-to-r from-accent-violet to-accent-blue text-white shadow-glow-violet'
              : 'bg-white/50 text-gray-600 hover:bg-white/70'"
          >
            {{ s.label }}
          </button>
        </div>
      </div>

      <!-- ── Рейтинг (значки + половинки + шаг 0.5) ── -->
      <div class="glass-card p-4">
        <div class="mb-3 flex items-center justify-between">
          <p class="text-xs font-medium uppercase tracking-wide text-gray-400">Рейтинг</p>
          <button
            @click="iconPickerOpen = !iconPickerOpen"
            class="flex items-center gap-1 rounded-full bg-white/50 px-3 py-1 text-xs text-gray-600 transition hover:bg-white/70"
          >
            <span class="text-base">{{ currentEmoji }}</span>
            Значок
          </button>
        </div>

        <!-- Выбор значка -->
        <div v-if="iconPickerOpen" class="mb-3 grid grid-cols-6 gap-2 rounded-2xl bg-white/40 p-3">
          <button
            v-for="ic in RATING_ICONS" :key="ic.id"
            @click="chooseIcon(ic.id)"
            class="flex h-9 items-center justify-center rounded-xl text-xl transition active:scale-90"
            :class="(book.ratingIcon ?? 'star') === ic.id
              ? 'bg-gradient-to-r from-accent-violet/30 to-accent-blue/30 ring-2 ring-accent-violet'
              : 'hover:bg-white/60'"
            :title="ic.label"
          >{{ ic.emoji }}</button>
        </div>

        <!-- Шкала из 10 значков с поддержкой половинок -->
        <div class="flex gap-0.5">
          <button
            v-for="n in 10" :key="n"
            type="button"
            class="relative h-7 w-7 transition active:scale-90"
            @click="onRatingClick(n, $event)"
          >
            <!-- фон (пустой значок) -->
            <span class="absolute inset-0 flex items-center justify-center text-xl opacity-20">
              {{ currentEmoji }}
            </span>
            <!-- заполнение (целое / половина) -->
            <span
              class="absolute inset-0 flex items-center justify-center overflow-hidden text-xl"
              :style="{ width: fillWidth(n) }"
            >
              {{ currentEmoji }}
            </span>
          </button>
        </div>

        <p class="mt-1 text-xs text-gray-400">
          {{ book.rating != null ? `${book.rating} / 10` : 'не оценена' }}
          <button
            v-if="book.rating != null"
            @click="patch({ rating: null })"
            class="ml-2 underline underline-offset-2"
          >сбросить</button>
        </p>
      </div>

      <!-- Публичность -->
      <div class="glass-card p-4">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-medium text-gray-800">Открыть в сообществе</p>
            <p class="mt-0.5 text-xs text-gray-400">
              {{ book.isPublic
                ? 'Книгу видят все: заметки, цитаты, герои, оценка'
                : 'Книга видна только тебе' }}
            </p>
          </div>

          <button
            @click="togglePublic"
            :disabled="publicSaving"
            class="relative h-7 w-12 shrink-0 rounded-full transition"
            :class="book.isPublic
              ? 'bg-gradient-to-r from-accent-violet to-accent-blue'
              : 'bg-gray-300'"
            role="switch"
            :aria-checked="book.isPublic ? 'true' : 'false'"
          >
            <span
              class="absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all"
              :class="book.isPublic ? 'left-6' : 'left-1'"
            />
          </button>
        </div>
      </div>

      <!-- Вкладки -->
      <div class="glass-card overflow-hidden">
        <div class="flex border-b border-white/40 overflow-x-auto">
          <button
            v-for="tab in tabs" :key="tab.id"
            @click="activeTab = tab.id"
            class="flex-1 whitespace-nowrap px-4 py-3 text-sm font-medium transition"
            :class="activeTab === tab.id
              ? 'border-b-2 border-accent-violet text-accent-violet'
              : 'text-gray-400 hover:text-gray-600'"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- Саммари -->
        <div v-if="activeTab === 'summary'" class="flex flex-col gap-3 p-4">
          <button @click="generateSummaryAI" :disabled="summaryLoading" class="btn-ai">
            <span v-if="summaryLoading" class="animate-spin">⏳</span>
            <span v-else>✨</span>
            {{ summaryLoading ? 'Генерирую…' : (book.summary ? 'Перегенерировать' : 'Сгенерировать саммари') }}
          </button>

          <div v-if="book.summary" class="rounded-2xl border border-white/50 bg-white/40 p-4">
            <p class="whitespace-pre-line text-sm leading-relaxed text-gray-800">{{ book.summary }}</p>
          </div>
          <p v-else-if="!summaryLoading" class="py-4 text-center text-sm text-gray-400">
            Нажми кнопку — ИИ напишет краткое описание книги 🤖
          </p>
        </div>

        <!-- Герои -->
        <div v-else-if="activeTab === 'characters'" class="flex flex-col gap-3 p-4">
          <button @click="generateCharactersAI" :disabled="charsAILoading" class="btn-ai">
            <span v-if="charsAILoading" class="animate-spin">⏳</span>
            <span v-else>✨</span>
            {{ charsAILoading ? 'Генерирую…' : 'Сгенерировать персонажей AI' }}
          </button>

          <div class="flex flex-col gap-2 rounded-2xl border border-dashed border-white/60 bg-white/30 p-3">
            <input v-model="newChar.name" type="text" placeholder="Имя персонажа" class="field" />
            <textarea v-model="newChar.description" rows="2" placeholder="Описание (необязательно)" class="field resize-none" />
            <div class="flex items-center justify-between gap-2">
              <button @click="generateOneCharacterAI" :disabled="!newChar.name.trim() || oneCharLoading" class="btn-ai-ghost">
                <span v-if="oneCharLoading" class="animate-spin">⏳</span>
                <span v-else>✨</span>
                {{ oneCharLoading ? '…' : 'Описать через AI' }}
              </button>
              <button @click="submitCharacter" :disabled="!newChar.name.trim() || charAdding" class="btn-primary">
                {{ charAdding ? '…' : '+ Добавить' }}
              </button>
            </div>
          </div>

          <p v-if="book.characters?.length === 0" class="py-4 text-center text-sm text-gray-400">
            👥 Персонажей пока нет.
          </p>
          <div
            v-for="c in book.characters" :key="c.id"
            class="rounded-2xl border border-white/50 bg-white/40 p-3"
          >
            <div v-if="editingCharId !== c.id">
              <p class="text-sm font-medium text-gray-800">{{ c.name }}</p>
              <p v-if="c.description" class="mt-1 text-xs text-gray-500">{{ c.description }}</p>
              <div class="mt-2 flex gap-3">
                <button @click="startEditChar(c)" class="link-muted">Изменить</button>
                <button @click="removeChar(c.id)" class="link-muted">Удалить</button>
              </div>
            </div>
            <div v-else class="flex flex-col gap-2">
              <input v-model="editCharDraft.name" type="text" class="field" />
              <textarea v-model="editCharDraft.description" rows="2" class="field resize-none" />
              <div class="flex gap-2">
                <button @click="saveChar(c.id)" class="text-sm font-semibold text-accent-violet">Сохранить</button>
                <button @click="editingCharId = null" class="text-sm text-gray-400">Отмена</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Цитаты -->
        <div v-else-if="activeTab === 'quotes'" class="flex flex-col gap-3 p-4">
          <div class="flex flex-col gap-2 rounded-2xl border border-dashed border-white/60 bg-white/30 p-3">
            <textarea v-model="newQuote.text" rows="2" placeholder="Текст цитаты…" class="field resize-none" />
            <input v-model="newQuote.chapter" type="text" placeholder="Глава (необязательно)" class="field" />
            <button @click="submitQuote" :disabled="!newQuote.text.trim() || quoteAdding" class="btn-primary self-end">
              {{ quoteAdding ? '…' : '+ Добавить' }}
            </button>
          </div>

          <p v-if="book.quotes?.length === 0" class="py-4 text-center text-sm text-gray-400">
            💬 Цитат пока нет.
          </p>
          <div
            v-for="q in book.quotes" :key="q.id"
            class="rounded-2xl border border-white/50 bg-white/40 p-3"
          >
            <div v-if="editingQuoteId !== q.id">
              <p class="text-sm text-gray-800">«{{ q.text }}»</p>
              <p v-if="q.chapter" class="mt-1 text-xs text-gray-400">{{ q.chapter }}</p>
              <div class="mt-2 flex gap-3">
                <button @click="startEditQuote(q)" class="link-muted">Изменить</button>
                <button @click="removeQuote(q.id)" class="link-muted">Удалить</button>
              </div>
            </div>
            <div v-else class="flex flex-col gap-2">
              <textarea v-model="editQuoteDraft.text" rows="2" class="field resize-none" />
              <input v-model="editQuoteDraft.chapter" type="text" placeholder="Глава" class="field" />
              <div class="flex gap-2">
                <button @click="saveQuote(q.id)" class="text-sm font-semibold text-accent-violet">Сохранить</button>
                <button @click="editingQuoteId = null" class="text-sm text-gray-400">Отмена</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Заметки -->
        <div v-else-if="activeTab === 'notes'" class="p-4">
          <textarea v-model="notesValue" rows="6" placeholder="Свои мысли о книге…"
            class="field resize-none" />
          <div class="mt-2 flex items-center">
            <button @click="saveNotes" :disabled="notesSaving" class="btn-primary">
              {{ notesSaving ? 'Сохраняю…' : 'Сохранить' }}
            </button>
            <span v-if="notesSaved" class="ml-3 text-sm text-emerald-600">✓ Сохранено</span>
          </div>

          <!-- Вайб -->
          <div class="mt-6 border-t border-white/40 pt-4">
            <div class="mb-2 flex items-center justify-between">
              <p class="text-xs font-medium uppercase tracking-wide text-gray-400">Вайб книги</p>
              <button @click="generateVibeAI" :disabled="vibeLoading" class="btn-ai-ghost">
                <span v-if="vibeLoading" class="animate-spin">⏳</span>
                <span v-else>✨</span>
                {{ vibeLoading ? '…' : (book.vibeTags?.length ? 'Обновить' : 'Сгенерировать') }}
              </button>
            </div>

            <div v-if="book.vibeTags?.length" class="flex flex-wrap gap-2">
              <span
                v-for="tag in book.vibeTags" :key="tag"
                class="rounded-full bg-gradient-to-r from-accent-violet/15 to-accent-pink/15 px-3 py-1 text-xs font-medium text-accent-violet"
              >#{{ tag }}</span>
            </div>
            <p v-else-if="!vibeLoading" class="text-xs text-gray-400">
              ИИ определит атмосферу книги по жанру, содержанию и цитатам — нажми «Сгенерировать».
            </p>
          </div>
        </div>
      </div>

      <button
        @click="confirmDelete"
        class="btn-delete-soft"
      >
        Удалить книгу
      </button>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import {
  getBook, updateBook, deleteBook,
  addQuote, updateQuote, deleteQuote,
  addCharacter, updateCharacter, deleteCharacter,
  uploadCover,
  generateSummary,
  generateCharacters,
  generateCharacter,    // F1
  generateVibe,         // F2
  generateGenreYear,    // F4
} from '../api/books'
import type { Book, Quote, Character, Status } from '../types/models'
import { RATING_ICONS, ratingEmoji } from '../types/models'
import InlineField from '../components/InlineField.vue'
import { toastError } from '../lib/toast'

const props = defineProps<{ id: string }>()
const router = useRouter()

const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

const book = ref<Book | null>(null)
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    book.value = await getBook(Number(props.id))
    notesValue.value = book.value.notes ?? ''
    book.value.quotes ??= []
    book.value.characters ??= []
    book.value.vibeTags ??= []
    coverPos.value = book.value.coverPosition ?? 50
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось загрузить книгу'
  } finally {
    loading.value = false
  }
})

async function patch(data: Partial<Book>) {
  if (!book.value) return
  try {
    book.value = await updateBook(book.value.id, data)
    book.value.quotes ??= []
    book.value.characters ??= []
    book.value.vibeTags ??= []
  } catch (e) {
    toastError(e instanceof Error ? e.message : 'Ошибка сохранения')
  }
}

// ─── обложка: загрузка ────────────────────────────────────
const coverUploading = ref(false)

async function onCoverChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file || !book.value) return
  coverUploading.value = true
  try {
    book.value = await uploadCover(book.value.id, file)
    book.value.quotes ??= []
    book.value.characters ??= []
    book.value.vibeTags ??= []
    coverPos.value = book.value.coverPosition ?? 50
  } catch (err) {
    toastError(err instanceof Error ? err.message : 'Ошибка загрузки')
  } finally {
    coverUploading.value = false
    ;(e.target as HTMLInputElement).value = ''
  }
}

// ─── обложка: перетаскивание фокуса (object-position Y) ───
const coverBox = ref<HTMLElement | null>(null)
const coverPos = ref(50)       // 0..100 %
const dragging = ref(false)
let startY = 0
let startPos = 50

function onDragStart(e: PointerEvent) {
  if (!book.value?.coverUrl) return
  dragging.value = true
  startY = e.clientY
  startPos = coverPos.value
  window.addEventListener('pointermove', onDragMove)
  window.addEventListener('pointerup', onDragEnd)
}

function onDragMove(e: PointerEvent) {
  if (!dragging.value || !coverBox.value) return
  const h = coverBox.value.clientHeight || 220
  // двигаем фокус: вверх тянем — показываем низ
  const deltaPercent = ((startY - e.clientY) / h) * 100
  let next = startPos + deltaPercent
  next = Math.max(0, Math.min(100, next))
  coverPos.value = next
}

function onDragEnd() {
  if (!dragging.value) return
  dragging.value = false
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', onDragEnd)
  // сохраняем округлённо
  const rounded = Math.round(coverPos.value)
  if (book.value && rounded !== (book.value.coverPosition ?? 50)) {
    patch({ coverPosition: rounded })
  }
}

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', onDragEnd)
})

async function confirmDelete() {
  if (!book.value) return
  if (!confirm(`Удалить «${book.value.title}»?`)) return
  try {
    await deleteBook(book.value.id)
    router.replace('/shelf')
  } catch (e) {
    toastError(e instanceof Error ? e.message : 'Ошибка удаления')
  }
}

const statuses: { value: Status; label: string }[] = [
  { value: 'WANT', label: 'Хочу' },
  { value: 'READING', label: 'Читаю' },
  { value: 'READ', label: 'Прочитано' },
]

// ── Задача 4: новый порядок вкладок + дефолт ──
const tabs = [
  { id: 'summary', label: 'Саммари' },
  { id: 'characters', label: 'Герои' },
  { id: 'quotes', label: 'Цитаты' },
  { id: 'notes', label: 'Заметки' },
]
const activeTab = ref('summary')

// ─── Задача 3: рейтинг — значок + половинки ───────────────
const iconPickerOpen = ref(false)

const currentEmoji = computed(() => ratingEmoji(book.value?.ratingIcon))

function chooseIcon(id: string) {
  iconPickerOpen.value = false
  patch({ ratingIcon: id })
}

// ширина заполнения значка №n (0 / 50% / 100%)
function fillWidth(n: number): string {
  const r = book.value?.rating ?? 0
  if (r >= n) return '100%'
  if (r >= n - 0.5) return '50%'
  return '0%'
}

// клик по значку: левая половина = .5, правая = целое
function onRatingClick(n: number, e: MouseEvent) {
  const el = e.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  const isLeftHalf = e.clientX - rect.left < rect.width / 2
  const value = isLeftHalf ? n - 0.5 : n
  // повторный клик по тому же значению — сброс
  patch({ rating: book.value?.rating === value ? null : value })
}

// ─── заметки ──────────────────────────────────────────────
const notesValue = ref('')
const notesSaving = ref(false)
const notesSaved = ref(false)

async function saveNotes() {
  notesSaving.value = true
  notesSaved.value = false
  await patch({ notes: notesValue.value || null })
  notesSaving.value = false
  notesSaved.value = true
  setTimeout(() => (notesSaved.value = false), 2000)
}

// ─── цитаты ───────────────────────────────────────────────
const newQuote = ref({ text: '', chapter: '' })
const quoteAdding = ref(false)
const editingQuoteId = ref<number | null>(null)
const editQuoteDraft = ref({ text: '', chapter: '' })

async function submitQuote() {
  if (!book.value || !newQuote.value.text.trim()) return
  quoteAdding.value = true
  try {
    const q = await addQuote(book.value.id, {
      text: newQuote.value.text.trim(),
      chapter: newQuote.value.chapter.trim() || null,
    })
    book.value.quotes!.push(q)
    newQuote.value = { text: '', chapter: '' }
  } catch (e) {
    toastError(e instanceof Error ? e.message : 'Ошибка')
  } finally {
    quoteAdding.value = false
  }
}

function startEditQuote(q: Quote) {
  editingQuoteId.value = q.id
  editQuoteDraft.value = { text: q.text, chapter: q.chapter ?? '' }
}

async function saveQuote(id: number) {
  try {
    const updated = await updateQuote(id, {
      text: editQuoteDraft.value.text,
      chapter: editQuoteDraft.value.chapter || null,
    })
    const idx = book.value!.quotes!.findIndex(q => q.id === id)
    if (idx !== -1) book.value!.quotes![idx] = updated
    editingQuoteId.value = null
  } catch (e) {
    toastError(e instanceof Error ? e.message : 'Ошибка')
  }
}

async function removeQuote(id: number) {
  if (!confirm('Удалить цитату?')) return
  try {
    await deleteQuote(id)
    book.value!.quotes = book.value!.quotes!.filter(q => q.id !== id)
  } catch (e) {
    toastError(e instanceof Error ? e.message : 'Ошибка')
  }
}

// ─── персонажи ────────────────────────────────────────────
const newChar = ref({ name: '', description: '' })
const charAdding = ref(false)
const editingCharId = ref<number | null>(null)
const editCharDraft = ref({ name: '', description: '' })

async function submitCharacter() {
  if (!book.value || !newChar.value.name.trim()) return
  charAdding.value = true
  try {
    const c = await addCharacter(book.value.id, {
      name: newChar.value.name.trim(),
      description: newChar.value.description.trim() || null,
    })
    book.value.characters!.push(c)
    newChar.value = { name: '', description: '' }
  } catch (e) {
    toastError(e instanceof Error ? e.message : 'Ошибка')
  } finally {
    charAdding.value = false
  }
}

function startEditChar(c: Character) {
  editingCharId.value = c.id
  editCharDraft.value = { name: c.name, description: c.description ?? '' }
}

async function saveChar(id: number) {
  try {
    const updated = await updateCharacter(id, {
      name: editCharDraft.value.name,
      description: editCharDraft.value.description || null,
    })
    const idx = book.value!.characters!.findIndex(c => c.id === id)
    if (idx !== -1) book.value!.characters![idx] = updated
    editingCharId.value = null
  } catch (e) {
    toastError(e instanceof Error ? e.message : 'Ошибка')
  }
}

async function removeChar(id: number) {
  if (!confirm('Удалить персонажа?')) return
  try {
    await deleteCharacter(id)
    book.value!.characters = book.value!.characters!.filter(c => c.id !== id)
  } catch (e) {
    toastError(e instanceof Error ? e.message : 'Ошибка')
  }
}

// ─── AI: саммари ──────────────────────────────────────────
const summaryLoading = ref(false)

async function generateSummaryAI() {
  if (!book.value) return
  summaryLoading.value = true
  try {
    const { summary } = await generateSummary(book.value.id)
    book.value.summary = summary
  } catch (e) {
    toastError(e instanceof Error ? e.message : 'Ошибка генерации')
  } finally {
    summaryLoading.value = false
  }
}

// ─── AI: все персонажи ────────────────────────────────────
const charsAILoading = ref(false)

async function generateCharactersAI() {
  if (!book.value) return
  charsAILoading.value = true
  try {
    const { characters } = await generateCharacters(book.value.id)
    book.value.characters = characters
  } catch (e) {
    toastError(e instanceof Error ? e.message : 'Ошибка генерации')
  } finally {
    charsAILoading.value = false
  }
}

// ─── F1: AI описание ОДНОГО героя по имени ────────────────
const oneCharLoading = ref(false)

async function generateOneCharacterAI() {
  if (!book.value || !newChar.value.name.trim()) return
  oneCharLoading.value = true
  try {
    const { character } = await generateCharacter(book.value.id, newChar.value.name.trim())
    book.value.characters!.push(character)
    newChar.value = { name: '', description: '' }
  } catch (e) {
    toastError(e instanceof Error ? e.message : 'Ошибка генерации')
  } finally {
    oneCharLoading.value = false
  }
}

// ─── F2: AI вайб книги ────────────────────────────────────
const vibeLoading = ref(false)

async function generateVibeAI() {
  if (!book.value) return
  vibeLoading.value = true
  try {
    const { vibeTags } = await generateVibe(book.value.id)
    book.value.vibeTags = vibeTags
  } catch (e) {
    toastError(e instanceof Error ? e.message : 'Ошибка генерации')
  } finally {
    vibeLoading.value = false
  }
}

// ─── F4: AI жанр и год ────────────────────────────────────
const genreYearLoading = ref(false)

async function generateGenreYearAI() {
  if (!book.value) return
  genreYearLoading.value = true
  try {
    const { genre, year } = await generateGenreYear(book.value.id)
    book.value.genre = genre
    book.value.year = year
  } catch (e) {
    toastError(e instanceof Error ? e.message : 'Ошибка генерации')
  } finally {
    genreYearLoading.value = false
  }
}

// ─── G: публичность книги ─────────────────────────────────
const publicSaving = ref(false)

async function togglePublic() {
  if (!book.value) return
  publicSaving.value = true
  try {
    await patch({ isPublic: !book.value.isPublic })
  } finally {
    publicSaving.value = false
  }
}
</script>