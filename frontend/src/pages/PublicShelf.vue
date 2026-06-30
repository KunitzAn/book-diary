<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getPublicUserBooks } from '../api/public'
import type { Book, PublicAuthor } from '../types/models'

const props = defineProps<{ userId: string }>()
const router = useRouter()

const author = ref<PublicAuthor | null>(null)
const books = ref<Book[]>([])
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
    const data = await getPublicUserBooks(Number(props.userId))
    author.value = data.user
    books.value = data.books
  } catch (e: any) {
    error.value = e?.message ?? 'Не удалось загрузить'
  } finally {
    loading.value = false
  }
})

function openBook(id: number) {
  router.push(`/community/book/${id}`)
}
</script>

<template>
  <div class="shelf">
    <button class="back" @click="router.push('/community')">← Сообщество</button>

    <h1 v-if="author">
      Полка: {{ author.username || `Пользователь #${author.id}` }}
    </h1>

    <p v-if="loading">Загрузка…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <p v-else-if="books.length === 0">Здесь пока пусто</p>

    <div v-else class="grid">
      <div
        v-for="b in books"
        :key="b.id"
        class="book"
        @click="openBook(b.id)"
      >
        <div class="cover">
          <img
            v-if="b.coverUrl"
            :src="coverSrc(b.coverUrl)"
            :alt="b.title"
            :style="{ objectPosition: coverPos(b) }"
          />
          <div v-else class="no-cover">{{ b.title }}</div>
        </div>
        <div class="title">{{ b.title }}</div>
        <div class="author">{{ b.author }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shelf { max-width: 900px; margin: 0 auto; padding: 16px; }
.back { background: none; border: none; color: #555; cursor: pointer; padding: 8px 0; }
.grid {
  display: grid; gap: 18px;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
}
.book { cursor: pointer; }
.cover { aspect-ratio: 2/3; border-radius: 8px; overflow: hidden; background: #eee; }
.cover img { width: 100%; height: 100%; object-fit: cover; }
.no-cover { display: flex; align-items: center; justify-content: center;
  height: 100%; padding: 8px; font-size: 13px; text-align: center; color: #777; }
.title { font-weight: 600; margin-top: 6px; font-size: 14px; }
.author { color: #888; font-size: 13px; }
.error { color: #c00; }
</style>