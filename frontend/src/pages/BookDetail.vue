<template>
  <div class="min-h-screen bg-gray-50 pb-10">

    <!-- Шапка -->
    <div class="flex items-center gap-3 bg-white px-4 py-4 shadow-sm">
      <button @click="router.back()" class="text-xl text-gray-600">←</button>
      <h1 class="truncate text-lg font-semibold">{{ book?.title ?? '…' }}</h1>
    </div>

    <div v-if="loading" class="p-6 text-gray-500">Загрузка…</div>
    <div v-else-if="error" class="p-6 text-red-600">{{ error }}</div>

    <div v-else-if="book" class="p-4 flex flex-col gap-4">

    <!-- Обложка -->
    <div class="mx-auto flex flex-col items-center gap-2">
      <div class="flex h-44 w-30 items-center justify-center rounded-xl bg-gray-200 shadow overflow-hidden relative">
        <img
          v-if="book.coverUrl"
          :src="apiBase + book.coverUrl"
          alt="Обложка"
          class="h-full w-full object-cover"
        />
        <span v-else class="text-5xl">📖</span>

        <div
          v-if="coverGenerating"
          class="absolute inset-0 flex flex-col items-center justify-center bg-black/50 rounded-xl gap-2"
        >
          <span class="text-2xl animate-spin">⏳</span>
          <span class="text-xs text-white">Ищу обложку…</span>
        </div>
      </div>

      <button
        @click="onGenerateCover"
        :disabled="coverGenerating || coverUploading"
        class="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        <span v-if="coverGenerating" class="animate-spin">⏳</span>
        <span v-else>✨</span>
        {{ coverGenerating ? 'Ищу обложку…' : 'Найти обложку' }}
      </button>

      <label class="cursor-pointer text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2">
        {{ coverUploading ? 'Загружаю…' : 'или загрузить свою' }}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          class="hidden"
          :disabled="coverUploading || coverGenerating"
          @change="onCoverChange"
        />
      </label>

      <p v-if="coverError" class="text-xs text-red-500">{{ coverError }}</p>
    </div>

      <!-- Основные поля -->
      <div class="rounded-2xl bg-white p-4 shadow-sm flex flex-col gap-4">
        <InlineField label="Название" :value="book.title"
          @save="v => patch({ title: v })" />
        <InlineField label="Автор" :value="book.author"
          @save="v => patch({ author: v })" />
        <InlineField label="Жанр" :value="book.genre ?? ''" placeholder="не указан"
          @save="v => patch({ genre: v || null })" />
        <InlineField label="Год" :value="book.year ? String(book.year) : ''"
          placeholder="не указан" type="number"
          @save="v => patch({ year: v ? Number(v) : null })" />

        <!-- F4: AI жанр и год -->
        <button
          @click="generateGenreYearAI"
          :disabled="genreYearLoading"
          class="self-start flex items-center gap-1.5 rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-600 hover:bg-purple-100 disabled:opacity-50"
        >
          <span v-if="genreYearLoading" class="animate-spin">⏳</span>
          <span v-else>✨</span>
          {{ genreYearLoading ? 'Определяю…' : 'Определить жанр и год (AI)' }}
        </button>
        <p v-if="genreYearError" class="text-xs text-red-500">{{ genreYearError }}</p>
      </div>

      <!-- Статус -->
      <div class="rounded-2xl bg-white p-4 shadow-sm">
        <p class="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Статус</p>
        <div class="flex gap-2">
          <button
            v-for="s in statuses" :key="s.value"
            @click="patch({ status: s.value })"
            class="flex-1 rounded-full py-1.5 text-sm font-medium transition"
            :class="book.status === s.value
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
          >
            {{ s.label }}
          </button>
        </div>
      </div>

      <!-- Рейтинг -->
      <div class="rounded-2xl bg-white p-4 shadow-sm">
        <p class="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Рейтинг</p>
        <div class="flex gap-0.5">
          <button
            v-for="n in 10" :key="n"
            @click="patch({ rating: book.rating === n ? null : n })"
            class="text-xl transition"
            :class="(book.rating ?? 0) >= n ? 'opacity-100' : 'opacity-20'"
          >⭐</button>
        </div>
        <p class="mt-1 text-xs text-gray-400">
          {{ book.rating ? `${book.rating} / 10` : 'не оценена' }}
        </p>
      </div>

      <!-- Вкладки -->
      <div class="rounded-2xl bg-white shadow-sm overflow-hidden">

        <div class="flex border-b border-gray-100">
          <button
            v-for="tab in tabs" :key="tab.id"
            @click="activeTab = tab.id"
            class="flex-1 py-3 text-sm font-medium transition"
            :class="activeTab === tab.id
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-400 hover:text-gray-600'"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- Заметки -->
        <div v-if="activeTab === 'notes'" class="p-4">
          <textarea
            v-model="notesValue"
            rows="6"
            placeholder="Свои мысли о книге…"
            class="w-full resize-none rounded-lg border border-gray-200 p-3 text-sm outline-none focus:border-blue-400"
          />
          <button
            @click="saveNotes"
            :disabled="notesSaving"
            class="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {{ notesSaving ? 'Сохраняю…' : 'Сохранить' }}
          </button>
          <span v-if="notesSaved" class="ml-3 text-sm text-green-600">✓ Сохранено</span>

          <!-- F2: Вайб книги -->
          <div class="mt-6 border-t border-gray-100 pt-4">
            <div class="flex items-center justify-between mb-2">
              <p class="text-xs font-medium uppercase tracking-wide text-gray-400">Вайб книги</p>
              <button
                @click="generateVibeAI"
                :disabled="vibeLoading"
                class="flex items-center gap-1 rounded-lg bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-600 hover:bg-purple-100 disabled:opacity-50"
              >
                <span v-if="vibeLoading" class="animate-spin">⏳</span>
                <span v-else>✨</span>
                {{ vibeLoading ? '…' : (book.vibeTags?.length ? 'Обновить' : 'Сгенерировать') }}
              </button>
            </div>

            <div v-if="book.vibeTags?.length" class="flex flex-wrap gap-2">
              <span
                v-for="tag in book.vibeTags" :key="tag"
                class="rounded-full bg-gradient-to-r from-purple-100 to-blue-100 px-3 py-1 text-xs font-medium text-purple-700"
              >
                #{{ tag }}
              </span>
            </div>
            <p v-else-if="!vibeLoading" class="text-xs text-gray-400">
              Добавь цитаты во вкладке 💬, затем нажми «Сгенерировать» — ИИ определит атмосферу книги.
            </p>

            <p v-if="vibeError" class="mt-2 text-xs text-red-500">{{ vibeError }}</p>
          </div>
        </div>

        <!-- Цитаты -->
        <div v-else-if="activeTab === 'quotes'" class="p-4 flex flex-col gap-3">
          <div class="flex flex-col gap-2 rounded-lg border border-dashed border-gray-300 p-3">
            <textarea
              v-model="newQuote.text"
              rows="2"
              placeholder="Текст цитаты…"
              class="w-full resize-none rounded border border-gray-200 p-2 text-sm outline-none focus:border-blue-400"
            />
            <input
              v-model="newQuote.chapter"
              type="text"
              placeholder="Глава (необязательно)"
              class="w-full rounded border border-gray-200 p-2 text-sm outline-none focus:border-blue-400"
            />
            <button
              @click="submitQuote"
              :disabled="!newQuote.text.trim() || quoteAdding"
              class="self-end rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
            >
              {{ quoteAdding ? '…' : '+ Добавить' }}
            </button>
          </div>

          <p v-if="book.quotes?.length === 0" class="text-sm text-gray-400">Цитат пока нет.</p>
          <div
            v-for="q in book.quotes" :key="q.id"
            class="rounded-lg border border-gray-100 p-3"
          >
            <div v-if="editingQuoteId !== q.id">
              <p class="text-sm text-gray-800">«{{ q.text }}»</p>
              <p v-if="q.chapter" class="mt-1 text-xs text-gray-400">{{ q.chapter }}</p>
              <div class="mt-2 flex gap-3">
                <button @click="startEditQuote(q)" class="text-xs text-blue-500">Изменить</button>
                <button @click="removeQuote(q.id)" class="text-xs text-red-400">Удалить</button>
              </div>
            </div>
            <div v-else class="flex flex-col gap-2">
              <textarea
                v-model="editQuoteDraft.text"
                rows="2"
                class="w-full resize-none rounded border border-blue-300 p-2 text-sm outline-none"
              />
              <input
                v-model="editQuoteDraft.chapter"
                type="text"
                placeholder="Глава"
                class="w-full rounded border border-blue-300 p-2 text-sm outline-none"
              />
              <div class="flex gap-2">
                <button @click="saveQuote(q.id)" class="text-sm font-medium text-blue-600">Сохранить</button>
                <button @click="editingQuoteId = null" class="text-sm text-gray-400">Отмена</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Герои -->
        <div v-else-if="activeTab === 'characters'" class="p-4 flex flex-col gap-3">

          <button
            @click="generateCharactersAI"
            :disabled="charsAILoading"
            class="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            <span v-if="charsAILoading" class="animate-spin">⏳</span>
            <span v-else>✨</span>
            {{ charsAILoading ? 'Генерирую…' : 'Сгенерировать персонажей AI' }}
          </button>

          <p v-if="charsAIError" class="text-sm text-red-500">{{ charsAIError }}</p>

          <!-- Ручное добавление + F1 -->
          <div class="flex flex-col gap-2 rounded-lg border border-dashed border-gray-300 p-3">
            <input
              v-model="newChar.name"
              type="text"
              placeholder="Имя персонажа"
              class="w-full rounded border border-gray-200 p-2 text-sm outline-none focus:border-blue-400"
            />
            <textarea
              v-model="newChar.description"
              rows="2"
              placeholder="Описание (необязательно)"
              class="w-full resize-none rounded border border-gray-200 p-2 text-sm outline-none focus:border-blue-400"
            />
            <div class="flex items-center justify-between gap-2">
              <!-- F1: описать одного героя по имени через AI -->
              <button
                @click="generateOneCharacterAI"
                :disabled="!newChar.name.trim() || oneCharLoading"
                class="flex items-center gap-1 rounded-lg bg-purple-50 px-2.5 py-1.5 text-xs font-medium text-purple-600 hover:bg-purple-100 disabled:opacity-40"
              >
                <span v-if="oneCharLoading" class="animate-spin">⏳</span>
                <span v-else>✨</span>
                {{ oneCharLoading ? '…' : 'Описать через AI' }}
              </button>

              <button
                @click="submitCharacter"
                :disabled="!newChar.name.trim() || charAdding"
                class="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
              >
                {{ charAdding ? '…' : '+ Добавить' }}
              </button>
            </div>
            <p v-if="oneCharError" class="text-xs text-red-500">{{ oneCharError }}</p>
          </div>

          <p v-if="book.characters?.length === 0" class="text-sm text-gray-400">Персонажей пока нет.</p>
          <div
            v-for="c in book.characters" :key="c.id"
            class="rounded-lg border border-gray-100 p-3"
          >
            <div v-if="editingCharId !== c.id">
              <p class="font-medium text-sm text-gray-800">{{ c.name }}</p>
              <p v-if="c.description" class="mt-1 text-xs text-gray-500">{{ c.description }}</p>
              <div class="mt-2 flex gap-3">
                <button @click="startEditChar(c)" class="text-xs text-blue-500">Изменить</button>
                <button @click="removeChar(c.id)" class="text-xs text-red-400">Удалить</button>
              </div>
            </div>
            <div v-else class="flex flex-col gap-2">
              <input
                v-model="editCharDraft.name"
                type="text"
                class="w-full rounded border border-blue-300 p-2 text-sm outline-none"
              />
              <textarea
                v-model="editCharDraft.description"
                rows="2"
                class="w-full resize-none rounded border border-blue-300 p-2 text-sm outline-none"
              />
              <div class="flex gap-2">
                <button @click="saveChar(c.id)" class="text-sm font-medium text-blue-600">Сохранить</button>
                <button @click="editingCharId = null" class="text-sm text-gray-400">Отмена</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Саммари -->
        <div v-else-if="activeTab === 'summary'" class="p-4 flex flex-col gap-3">
          <button
            @click="generateSummaryAI"
            :disabled="summaryLoading"
            class="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            <span v-if="summaryLoading" class="animate-spin">⏳</span>
            <span v-else>✨</span>
            {{ summaryLoading ? 'Генерирую…' : (book.summary ? 'Перегенерировать' : 'Сгенерировать саммари') }}
          </button>

          <p v-if="summaryError" class="text-sm text-red-500">{{ summaryError }}</p>

          <div v-if="book.summary" class="rounded-xl bg-gray-50 p-4">
            <p class="text-sm leading-relaxed text-gray-800 whitespace-pre-line">{{ book.summary }}</p>
          </div>

          <p v-else-if="!summaryLoading" class="text-center text-sm text-gray-400 py-4">
            Нажми кнопку — ИИ напишет краткое описание книги 🤖
          </p>
        </div>

      </div>

      <button
        @click="confirmDelete"
        class="w-full rounded-2xl border border-red-200 py-3 text-sm text-red-500 hover:bg-red-50"
      >
        🗑 Удалить книгу
      </button>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  getBook, updateBook, deleteBook,
  addQuote, updateQuote, deleteQuote,
  addCharacter, updateCharacter, deleteCharacter,
  uploadCover,
  generateSummary,
  generateCharacters,
  generateCover,
  generateCharacter,    // F1
  generateVibe,         // F2
  generateGenreYear,    // F4
} from '../api/books'
import type { Book, Quote, Character, Status } from '../types/models'
import InlineField from '../components/InlineField.vue'

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
    alert(e instanceof Error ? e.message : 'Ошибка сохранения')
  }
}

// ─── обложка ──────────────────────────────────────────────
const coverUploading = ref(false)
const coverError = ref('')

async function onCoverChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file || !book.value) return
  coverUploading.value = true
  coverError.value = ''
  try {
    book.value = await uploadCover(book.value.id, file)
    book.value.quotes ??= []
    book.value.characters ??= []
    book.value.vibeTags ??= []
  } catch (err) {
    coverError.value = err instanceof Error ? err.message : 'Ошибка загрузки'
  } finally {
    coverUploading.value = false
    ;(e.target as HTMLInputElement).value = ''
  }
}

const coverGenerating = ref(false)

async function onGenerateCover() {
  if (!book.value) return
  coverGenerating.value = true
  coverError.value = ''
  try {
    book.value = await generateCover(book.value.id)
    book.value.quotes ??= []
    book.value.characters ??= []
    book.value.vibeTags ??= []
  } catch (e) {
    coverError.value = e instanceof Error ? e.message : 'Ошибка генерации обложки'
  } finally {
    coverGenerating.value = false
  }
}

async function confirmDelete() {
  if (!book.value) return
  if (!confirm(`Удалить «${book.value.title}»?`)) return
  try {
    await deleteBook(book.value.id)
    router.replace('/shelf')
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Ошибка удаления')
  }
}

const statuses: { value: Status; label: string }[] = [
  { value: 'WANT', label: 'Хочу' },
  { value: 'READING', label: 'Читаю' },
  { value: 'READ', label: 'Прочитано' },
]

const tabs = [
  { id: 'notes', label: '📝 Заметки' },
  { id: 'quotes', label: '💬 Цитаты' },
  { id: 'characters', label: '👥 Герои' },
  { id: 'summary', label: '🤖 Саммари' },
]
const activeTab = ref('notes')

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
    alert(e instanceof Error ? e.message : 'Ошибка')
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
    alert(e instanceof Error ? e.message : 'Ошибка')
  }
}

async function removeQuote(id: number) {
  if (!confirm('Удалить цитату?')) return
  try {
    await deleteQuote(id)
    book.value!.quotes = book.value!.quotes!.filter(q => q.id !== id)
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Ошибка')
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
    alert(e instanceof Error ? e.message : 'Ошибка')
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
    alert(e instanceof Error ? e.message : 'Ошибка')
  }
}

async function removeChar(id: number) {
  if (!confirm('Удалить персонажа?')) return
  try {
    await deleteCharacter(id)
    book.value!.characters = book.value!.characters!.filter(c => c.id !== id)
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Ошибка')
  }
}

// ─── AI: саммари ──────────────────────────────────────────
const summaryLoading = ref(false)
const summaryError = ref('')

async function generateSummaryAI() {
  if (!book.value) return
  summaryLoading.value = true
  summaryError.value = ''
  try {
    const { summary } = await generateSummary(book.value.id)
    book.value.summary = summary
  } catch (e) {
    summaryError.value = e instanceof Error ? e.message : 'Ошибка генерации'
  } finally {
    summaryLoading.value = false
  }
}

// ─── AI: все персонажи ────────────────────────────────────
const charsAILoading = ref(false)
const charsAIError = ref('')

async function generateCharactersAI() {
  if (!book.value) return
  charsAILoading.value = true
  charsAIError.value = ''
  try {
    const { characters } = await generateCharacters(book.value.id)
    book.value.characters = characters
  } catch (e) {
    charsAIError.value = e instanceof Error ? e.message : 'Ошибка генерации'
  } finally {
    charsAILoading.value = false
  }
}

// ─── F1: AI описание ОДНОГО героя по имени ────────────────
const oneCharLoading = ref(false)
const oneCharError = ref('')

async function generateOneCharacterAI() {
  if (!book.value || !newChar.value.name.trim()) return
  oneCharLoading.value = true
  oneCharError.value = ''
  try {
    const { character } = await generateCharacter(book.value.id, newChar.value.name.trim())
    book.value.characters!.push(character)
    newChar.value = { name: '', description: '' }
  } catch (e) {
    oneCharError.value = e instanceof Error ? e.message : 'Ошибка генерации'
  } finally {
    oneCharLoading.value = false
  }
}

// ─── F2: AI вайб книги по цитатам ─────────────────────────
const vibeLoading = ref(false)
const vibeError = ref('')

async function generateVibeAI() {
  if (!book.value) return
  vibeLoading.value = true
  vibeError.value = ''
  try {
    const { vibeTags } = await generateVibe(book.value.id)
    book.value.vibeTags = vibeTags
  } catch (e) {
    vibeError.value = e instanceof Error ? e.message : 'Ошибка генерации'
  } finally {
    vibeLoading.value = false
  }
}

// ─── F4: AI жанр и год ────────────────────────────────────
const genreYearLoading = ref(false)
const genreYearError = ref('')

async function generateGenreYearAI() {
  if (!book.value) return
  genreYearLoading.value = true
  genreYearError.value = ''
  try {
    const { genre, year } = await generateGenreYear(book.value.id)
    book.value.genre = genre
    book.value.year = year
  } catch (e) {
    genreYearError.value = e instanceof Error ? e.message : 'Ошибка генерации'
  } finally {
    genreYearLoading.value = false
  }
}
</script>