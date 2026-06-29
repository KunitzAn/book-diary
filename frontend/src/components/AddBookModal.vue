<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm"
    @click.self="$emit('close')"
  >
    <div class="glass-card animate-pop-in w-full max-w-md p-6">
      <h2 class="mb-5 text-xl font-bold">Добавить книгу</h2>

      <form @submit.prevent="submit" class="flex flex-col gap-4">
        <!-- Название -->
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">
            Название <span class="text-accent-pink">*</span>
          </label>
          <input
            v-model="form.title"
            type="text"
            placeholder="Мастер и Маргарита"
            class="field"
          />
          <p v-if="fieldError('title')" class="mt-1 text-xs text-red-500">
            {{ fieldError('title') }}
          </p>
        </div>

        <!-- Автор -->
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">
            Автор <span class="text-accent-pink">*</span>
          </label>
          <input
            v-model="form.author"
            type="text"
            placeholder="Михаил Булгаков"
            class="field"
          />
          <p v-if="fieldError('author')" class="mt-1 text-xs text-red-500">
            {{ fieldError('author') }}
          </p>
        </div>

        <!-- Жанр -->
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">Жанр</label>
          <input v-model="form.genre" type="text" placeholder="Роман" class="field" />
        </div>

        <!-- Год -->
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">Год</label>
          <input
            v-model.number="form.year"
            type="number"
            placeholder="1967"
            min="1000"
            max="2099"
            class="field"
          />
        </div>

        <!-- Статус -->
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">Статус</label>
          <select v-model="form.status" class="field">
            <option value="WANT">Хочу прочитать</option>
            <option value="READING">Читаю</option>
            <option value="READ">Прочитано</option>
          </select>
        </div>

        <!-- Общая ошибка -->
        <p v-if="generalError" class="text-sm text-red-500">{{ generalError }}</p>

        <!-- Кнопки -->
        <div class="mt-1 flex gap-3">
          <button type="button" class="btn-glass flex-1" @click="$emit('close')">
            Отмена
          </button>
          <button type="submit" :disabled="loading" class="btn-primary flex-1">
            {{ loading ? 'Сохраняю…' : 'Добавить' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { createBook } from '../api/books'
import type { Book, Status } from '../types/models'

const emit = defineEmits<{
  close: []
  created: [book: Book]
}>()

const form = reactive({
  title: '',
  author: '',
  genre: '',
  year: null as number | null,
  status: 'WANT' as Status,
})

const loading = ref(false)
const generalError = ref('')
const errors = ref<Record<string, string>>({})

function fieldError(field: string): string {
  return errors.value[field] ?? ''
}

function validate(): boolean {
  errors.value = {}
  if (!form.title.trim()) errors.value.title = 'Введите название'
  if (!form.author.trim()) errors.value.author = 'Введите автора'
  return Object.keys(errors.value).length === 0
}

async function submit() {
  generalError.value = ''
  if (!validate()) return

  loading.value = true
  try {
    const book = await createBook({
      title: form.title.trim(),
      author: form.author.trim(),
      genre: form.genre.trim() || undefined,
      year: form.year ?? undefined,
      status: form.status,
    })
    emit('created', book)
    emit('close')
  } catch (e) {
    generalError.value = e instanceof Error ? e.message : 'Не удалось добавить книгу'
  } finally {
    loading.value = false
  }
}
</script>