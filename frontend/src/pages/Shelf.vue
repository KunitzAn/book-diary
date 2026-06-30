<template>
  <div class="px-4 py-6 sm:px-6">
    <!-- Хедер полки -->
    <div class="mb-5 flex items-center justify-between">
      <h1 class="text-2xl font-bold tracking-tight">Моя полка</h1>
      <div class="flex items-center gap-2">
        <router-link to="/community" class="chip">
          Сообщество
        </router-link>
        <button @click="showAdd = true" class="btn-soft">
          Добавить
        </button>
      </div>
    </div>

    <!-- Фильтры -->
    <div class="mb-5 flex gap-2 overflow-x-auto pb-1">
      <button
        @click="setFilter(undefined)"
        class="chip"
        :class="activeStatus === undefined ? 'chip-active' : ''"
      >Все</button>
      <button
        v-for="(label, value) in STATUS_LABELS" :key="value"
        @click="setFilter(value as Status)"
        class="chip"
        :class="activeStatus === value ? 'chip-active' : ''"
      >{{ label }}</button>
    </div>

    <!-- Загрузка -->
    <div v-if="loading" class="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div v-for="n in 6" :key="n" class="glass-card h-56 animate-pulse" />
    </div>

    <!-- Пусто -->
    <div v-else-if="books.length === 0" class="glass-card mt-10 p-10 text-center">
      <p class="text-lg font-medium text-gray-600">Полка пуста</p>
      <p class="mt-1 text-sm text-gray-400">Добавь первую книгу, чтобы начать дневник</p>
      <button @click="showAdd = true" class="btn-soft mt-4">Добавить книгу</button>
    </div>

    <!-- Грид с drag&drop -->
    <draggable
      v-else
      v-model="books"
      item-key="id"
      class="grid grid-cols-2 gap-3 sm:grid-cols-3"
      :animation="220"
      ghost-class="drag-ghost"
      chosen-class="drag-chosen"
      drag-class="drag-active"
      delay="120"
      :delay-on-touch-only="true"
      @end="onReorder"
    >
      <template #item="{ element: book }: { element: Book }">
        <router-link
          :to="`/book/${book.id}`"
          class="glass-card group flex cursor-grab flex-col overflow-hidden active:cursor-grabbing"
        >
          <div class="relative aspect-[2/3] w-full overflow-hidden bg-gradient-to-br from-white/50 to-white/10">
            <img
              v-if="book.coverUrl"
              :src="apiBase + book.coverUrl"
              :alt="book.title"
              class="h-full w-full object-cover"
              draggable="false"
            />
            <div v-else class="flex h-full w-full items-center justify-center px-3 text-center">
              <span class="text-sm font-medium text-gray-400">{{ book.title }}</span>
            </div>

            <span
              class="absolute left-2 top-2 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-medium text-gray-600 backdrop-blur-md"
            >{{ STATUS_LABELS[book.status] }}</span>
          </div>

          <div class="p-2.5">
            <p class="truncate text-sm font-medium text-gray-800">{{ book.title }}</p>
            <p class="truncate text-xs text-gray-400">{{ book.author }}</p>
          </div>
        </router-link>
      </template>
    </draggable>

    <AddBookModal v-if="showAdd" @close="showAdd = false" @created="onCreated" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import draggable from 'vuedraggable'
import { getBooks, updateBook } from '../api/books'
import type { Book, Status } from '../types/models'
import { STATUS_LABELS } from '../types/models'
import AddBookModal from '../components/AddBookModal.vue'
import { toastError } from '../lib/toast'

const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

const books = ref<Book[]>([])
const loading = ref(true)
const showAdd = ref(false)
const activeStatus = ref<Status | undefined>(undefined)

async function load() {
  loading.value = true
  try {
    books.value = await getBooks(activeStatus.value ? { status: activeStatus.value } : {})
  } catch (e) {
    toastError(e instanceof Error ? e.message : 'Не удалось загрузить полку')
  } finally {
    loading.value = false
  }
}

function setFilter(status?: Status) {
  activeStatus.value = status
  load()
}

function onCreated() {
  showAdd.value = false
  load()
}

// Сохраняем новый порядок. Требует поля position на бэке.
async function onReorder() {
  try {
    await Promise.all(
      books.value.map((b, i) => updateBook(b.id, { position: i })),
    )
    books.value.forEach((b, i) => (b.position = i))
  } catch {
    toastError('Не удалось сохранить порядок')
  }
}

onMounted(load)
</script>