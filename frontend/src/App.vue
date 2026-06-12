<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Book {
  id: number
  title: string
  author: string
  status?: string
}

const books = ref<Book[]>([])
const error = ref('')
const loading = ref(true)

const newTitle = ref('')
const newAuthor = ref('')
const newStatus = ref('хочу прочитать')
const formError = ref('')
const saving = ref(false)

onMounted(async () => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/books`)
    if (!response.ok) {
      throw new Error('Ошибка ответа сервера')
    }
    books.value = await response.json()
  } catch (e) {
    error.value = 'Не удалось загрузить книги'
  } finally {
    loading.value = false
  }
})

async function addBook() {
  formError.value = ''

  if (!newTitle.value.trim() || !newAuthor.value.trim()) {
    formError.value = 'Заполните название и автора'
    return
  }

  saving.value = true
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTitle.value.trim(),
        author: newAuthor.value.trim(),
        status: newStatus.value,
      }),
    })

    if (!response.ok) {
      throw new Error('Ошибка ответа сервера')
    }

    const createdBook = await response.json()
    books.value.push(createdBook)

    newTitle.value = ''
    newAuthor.value = ''
    newStatus.value = 'хочу прочитать'
  } catch (e) {
    formError.value = 'Не удалось добавить книгу'
  } finally {
    saving.value = false
  }
}

function statusColor(status?: string) {
  if (status === 'читаю') return 'bg-blue-100 text-blue-700'
  if (status === 'прочитано') return 'bg-green-100 text-green-700'
  return 'bg-gray-100 text-gray-600'
}
</script>

<template>
  <main class="min-h-screen bg-gray-50 py-10 px-4">
    <div class="max-w-2xl mx-auto">
      <h1 class="text-3xl font-bold text-gray-800 mb-6">Мои книги</h1>

      <form
        @submit.prevent="addBook"
        class="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-8 flex flex-col sm:flex-row gap-3"
      >
        <input
          v-model="newTitle"
          placeholder="Название"
          class="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <input
          v-model="newAuthor"
          placeholder="Автор"
          class="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <select
          v-model="newStatus"
          class="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="хочу прочитать">хочу прочитать</option>
          <option value="читаю">читаю</option>
          <option value="прочитано">прочитано</option>
        </select>
        <button
          type="submit"
          :disabled="saving"
          class="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg px-4 py-2 transition"
        >
          {{ saving ? 'Добавление...' : 'Добавить' }}
        </button>
      </form>

      <p v-if="formError" class="text-red-600 mb-4">{{ formError }}</p>

      <p v-if="loading" class="text-gray-500">Загрузка...</p>
      <p v-else-if="error" class="text-red-600">{{ error }}</p>
      <p v-else-if="books.length === 0" class="text-gray-500">Книг пока нет</p>

      <ul v-else class="space-y-3">
        <li
          v-for="book in books"
          :key="book.id"
          class="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center justify-between"
        >
          <div>
            <span class="font-semibold text-gray-800">{{ book.title }}</span>
            <span class="text-gray-500"> — {{ book.author }}</span>
          </div>
          <span
            v-if="book.status"
            class="text-sm rounded-full px-3 py-1"
            :class="statusColor(book.status)"
          >
            {{ book.status }}
          </span>
        </li>
      </ul>
    </div>
  </main>
</template>