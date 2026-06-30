<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getPublicUsers, getPublicFeed } from '../api/public'
import type { PublicUser, FeedBook } from '../types/models'
import { ratingEmoji } from '../types/models'

const router = useRouter()

const mode = ref<'feed' | 'users'>('feed')   // по умолчанию — лента книг

const feed = ref<FeedBook[]>([])
const users = ref<PublicUser[]>([])
const loadingFeed = ref(false)
const loadingUsers = ref(false)
const error = ref<string | null>(null)

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
function coverSrc(url?: string | null): string {
  if (!url) return ''
  return url.startsWith('http') ? url : `${API_URL}${url}`
}

async function loadFeed() {
  if (feed.value.length || loadingFeed.value) return
  loadingFeed.value = true
  try {
    feed.value = await getPublicFeed()
  } catch (e: any) {
    error.value = e?.message ?? 'Не удалось загрузить'
  } finally {
    loadingFeed.value = false
  }
}

async function loadUsers() {
  if (users.value.length || loadingUsers.value) return
  loadingUsers.value = true
  try {
    users.value = await getPublicUsers()
  } catch (e: any) {
    error.value = e?.message ?? 'Не удалось загрузить'
  } finally {
    loadingUsers.value = false
  }
}

function setMode(m: 'feed' | 'users') {
  mode.value = m
  error.value = null
  if (m === 'feed') loadFeed()
  else loadUsers()
}

onMounted(loadFeed)

function openBook(id: number) {
  router.push(`/community/book/${id}`)
}
function openUser(id: number) {
  router.push(`/community/user/${id}`)
}
</script>

<template>
  <div class="px-4 py-6 sm:px-6">
    <div class="glass mb-5 flex items-center gap-3 rounded-2xl px-4 py-3">
      <h1 class="text-lg font-semibold">Сообщество</h1>
    </div>

    <!-- Переключатель режимов -->
    <div class="mb-5 flex gap-2">
      <button
        @click="setMode('feed')"
        class="flex-1 rounded-full py-2 text-sm font-medium transition active:scale-95"
        :class="mode === 'feed'
          ? 'bg-gradient-to-r from-accent-violet to-accent-blue text-white shadow-glow-violet'
          : 'bg-white/50 text-gray-600 hover:bg-white/70'"
      >📚 Книги</button>
      <button
        @click="setMode('users')"
        class="flex-1 rounded-full py-2 text-sm font-medium transition active:scale-95"
        :class="mode === 'users'
          ? 'bg-gradient-to-r from-accent-violet to-accent-blue text-white shadow-glow-violet'
          : 'bg-white/50 text-gray-600 hover:bg-white/70'"
      >👥 Читатели</button>
    </div>

    <p v-if="error" class="text-sm text-red-500">{{ error }}</p>

    <!-- ЛЕНТА КНИГ -->
    <div v-if="mode === 'feed'">
      <p v-if="loadingFeed" class="text-sm text-gray-400">Загрузка…</p>
      <p v-else-if="feed.length === 0" class="py-8 text-center text-sm text-gray-400">
        Пока никто не открыл свои книги 📚
      </p>

      <div v-else class="flex flex-col gap-4">
        <div
          v-for="b in feed" :key="b.id"
          @click="openBook(b.id)"
          class="glass-card flex cursor-pointer gap-3 p-3 transition active:scale-[0.99]"
        >
          <div class="h-24 w-16 shrink-0 overflow-hidden rounded-xl bg-white/40">
            <img
              v-if="b.coverUrl"
              :src="coverSrc(b.coverUrl)"
              :alt="b.title"
              class="h-full w-full object-cover"
              :style="{ objectPosition: `center ${b.coverPosition ?? 50}%` }"
            />
            <div v-else class="flex h-full w-full items-center justify-center text-2xl opacity-40">📖</div>
          </div>

          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold text-gray-800">{{ b.title }}</p>
            <p class="truncate text-xs text-gray-500">{{ b.author }}</p>

            <div v-if="b.vibeTags?.length" class="mt-1 flex flex-wrap gap-1">
              <span
                v-for="t in b.vibeTags.slice(0, 3)" :key="t"
                class="rounded-full bg-accent-violet/10 px-2 py-0.5 text-[10px] font-medium text-accent-violet"
              >#{{ t }}</span>
            </div>

            <p v-if="b.rating" class="mt-1 text-xs text-gray-400">
              {{ ratingEmoji(b.ratingIcon) }} {{ b.rating }}/10
            </p>

            <!-- владелец полупрозрачным -->
            <p class="mt-1 text-[11px] text-gray-400/80">
              из полки {{ b.user.username || `#${b.user.id}` }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- СПИСОК ЧИТАТЕЛЕЙ -->
    <div v-else>
      <p v-if="loadingUsers" class="text-sm text-gray-400">Загрузка…</p>
      <p v-else-if="users.length === 0" class="py-8 text-center text-sm text-gray-400">
        Пока никого нет
      </p>

      <ul v-else class="flex flex-col gap-3">
        <li
          v-for="u in users" :key="u.id"
          @click="openUser(u.id)"
          class="glass-card flex cursor-pointer items-center justify-between p-4 transition active:scale-[0.99]"
        >
          <span class="font-medium text-gray-800">{{ u.username || `Пользователь #${u.id}` }}</span>
          <span class="text-sm text-gray-400">{{ u.publicBooksCount }} кн.</span>
        </li>
      </ul>
    </div>
  </div>
</template>