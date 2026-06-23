<template>
  <div class="min-h-screen bg-gray-50 text-gray-900">
    <header
      v-if="showHeader"
      class="border-b border-gray-200 bg-white"
    >
      <div class="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
        <RouterLink to="/shelf" class="text-lg font-semibold">
          📚 Моя полка
        </RouterLink>
        <button
          class="text-sm text-gray-500 hover:text-gray-900"
          @click="logout"
        >
          Выйти
        </button>
      </div>
    </header>

    <main class="mx-auto max-w-3xl">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, RouterLink, useRoute, useRouter } from 'vue-router'
import { removeToken } from './lib/api'

const route = useRoute()
const router = useRouter()

const showHeader = computed(() => route.path !== '/login')

function logout() {
  removeToken()
  router.push('/login')
}
</script>