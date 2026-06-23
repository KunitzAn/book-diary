<!-- src/pages/Shelf.vue -->
<template>
  <div class="px-6 py-6">

    <!-- Шапка -->
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-xl font-semibold">Моя полка</h1>
      <button
        @click="showModal = true"
        class="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        + Добавить
      </button>
    </div>

    <p v-if="loading" class="text-gray-500">Загрузка…</p>

    <p v-else-if="error" class="text-red-600">{{ error }}</p>

    <p v-else-if="books.length === 0" class="text-gray-500">
      Полка пуста — добавь первую книгу.
    </p>

    <ul v-else class="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <li v-for="book in books" :key="book.id">
        <RouterLink
          :to="`/books/${book.id}`"
          class="block rounded-lg border border-gray-200 bg-white p-4 hover:shadow"
        >
          <div class="mb-2 flex aspect-[2/3] items-center justify-center rounded bg-gray-100 text-3xl">
            📖
          </div>
          <div class="truncate font-medium">{{ book.title }}</div>
          <div class="truncate text-sm text-gray-500">{{ book.author }}</div>
          <div class="mt-2 flex items-center justify-between">
            <span
              class="rounded-full px-2 py-0.5 text-xs"
              :class="statusClass(book.status)"
            >
              {{ statusLabel(book.status) }}
            </span>
            <span v-if="book.rating" class="text-xs text-gray-500">
              ⭐ {{ book.rating }}/10
            </span>
          </div>
        </RouterLink>
      </li>
    </ul>

    <!-- Модалка -->
    <AddBookModal
      v-if="showModal"
      @close="showModal = false"
      @created="onBookCreated"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { getBooks } from '../api/books'
import type { Book, Status } from '../types/models'
import { STATUS_LABELS } from '../types/models'
import AddBookModal from '../components/AddBookModal.vue'

const books = ref<Book[]>([])
const loading = ref(true)
const error = ref('')
const showModal = ref(false)

onMounted(async () => {
  try {
    books.value = await getBooks()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось загрузить книги'
  } finally {
    loading.value = false
  }
})

function onBookCreated(book: Book) {
  books.value.unshift(book)  // добавляем в начало без перезагрузки
}

function statusLabel(s: Status): string {
  return STATUS_LABELS[s]
}

function statusClass(s: Status): string {
  return {
    WANT: 'bg-gray-100 text-gray-600',
    READING: 'bg-blue-100 text-blue-700',
    READ: 'bg-green-100 text-green-700',
  }[s]
}
</script>