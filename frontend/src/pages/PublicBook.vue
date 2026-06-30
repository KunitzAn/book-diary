<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getPublicBook } from '../api/public'
import type { Book, PublicAuthor } from '../types/models'
import { STATUS_LABELS, ratingEmoji } from '../types/models'

const props = defineProps<{ id: string }>()
const router = useRouter()

const book = ref<(Book & { user: PublicAuthor }) | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

function coverSrc(url?: string | null): string {
  if (!url) return ''
  return url.startsWith('http') ? url : `${API_URL}${url}`
}

function coverPos(b: { coverPosition?: number | null }): string {
  return `center ${b.coverPosition ?? 50}%`
}

onMounted(async () => {
  try {
    book.value = await getPublicBook(Number(props.id))
  } catch (e: any) {
    error.value = e?.message ?? 'Книга не найдена'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="page">
    <button
      class="back"
      @click="book ? router.push(`/community/user/${book.user.id}`) : router.push('/community')"
    >
      ← Назад
    </button>

    <p v-if="loading">Загрузка…</p>
    <p v-else-if="error" class="error">{{ error }}</p>

    <template v-else-if="book">
      <!-- Широкая обложка во всю ширину сверху -->
      <div class="hero">
        <img
          v-if="book.coverUrl"
          :src="coverSrc(book.coverUrl)"
          :alt="book.title"
          :style="{ objectPosition: coverPos(book) }"
        />
        <div v-else class="no-cover">{{ book.title }}</div>
      </div>

      <div class="meta">
        <h1>{{ book.title }}</h1>
        <p class="author">{{ book.author }}</p>
        <p v-if="book.genre" class="row">Жанр: {{ book.genre }}</p>
        <p v-if="book.year" class="row">Год: {{ book.year }}</p>
        <p class="row">Статус: {{ STATUS_LABELS[book.status] }}</p>
        <p v-if="book.rating != null" class="row">
          Оценка: {{ ratingEmoji(book.ratingIcon) }} {{ book.rating }}/10
        </p>
        <p class="owner">из полки {{ book.user.username || `#${book.user.id}` }}</p>
      </div>

      <div v-if="book.vibeTags?.length" class="tags">
        <span v-for="t in book.vibeTags" :key="t" class="tag">#{{ t }}</span>
      </div>

      <section v-if="book.summary">
        <h2>Саммари</h2>
        <p>{{ book.summary }}</p>
      </section>

      <section v-if="book.notes">
        <h2>Заметки</h2>
        <p class="pre">{{ book.notes }}</p>
      </section>

      <section v-if="book.quotes?.length">
        <h2>Цитаты</h2>
        <ul class="quotes">
          <li v-for="q in book.quotes" :key="q.id">
            «{{ q.text }}»
            <span v-if="q.chapter" class="chapter">— {{ q.chapter }}</span>
          </li>
        </ul>
      </section>

      <section v-if="book.characters?.length">
        <h2>Персонажи</h2>
        <ul class="chars">
          <li v-for="c in book.characters" :key="c.id">
            <strong>{{ c.name }}</strong>
            <span v-if="c.description"> — {{ c.description }}</span>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>

<style scoped>
.page { max-width: 720px; margin: 0 auto; padding: 16px; }
.back { background: none; border: none; color: #555; cursor: pointer; padding: 8px 0; }

/* Широкая обложка-герой */
.hero {
  width: 100%;
  height: 220px;
  border-radius: 16px;
  overflow: hidden;
  background: #eee;
  margin-bottom: 16px;
}
.hero img { width: 100%; height: 100%; object-fit: cover; }
.no-cover {
  display: flex; align-items: center; justify-content: center;
  height: 100%; padding: 8px; text-align: center; color: #777;
}

.meta { margin-bottom: 20px; }
.meta h1 { margin: 0 0 4px; }
.author { color: #666; margin: 0 0 12px; }
.row { margin: 2px 0; font-size: 14px; }
.owner { margin-top: 12px; color: #999; font-size: 13px; }
.tags { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
.tag { background: #f0f0f0; padding: 4px 10px; border-radius: 999px; font-size: 13px; }
section { margin-bottom: 24px; }
section h2 { font-size: 18px; margin-bottom: 8px; }
.pre { white-space: pre-wrap; }
.quotes, .chars { padding-left: 18px; }
.quotes li, .chars li { margin-bottom: 8px; }
.chapter { color: #999; font-size: 13px; }
.error { color: #c00; }
</style>