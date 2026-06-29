<template>
  <div class="min-h-screen">
    <header
      v-if="showHeader"
      class="sticky top-0 z-40 px-4 pt-4"
    >
      <div class="glass mx-auto flex max-w-3xl items-center justify-between rounded-full px-5 py-2.5">
        <RouterLink to="/shelf" class="flex items-center gap-2 text-base font-semibold">
          <span class="text-xl">📚</span>
          <span class="bg-gradient-to-r from-accent-violet to-accent-blue bg-clip-text text-transparent">
            Моя полка
          </span>
        </RouterLink>
        <button
          class="rounded-full px-3 py-1.5 text-sm text-gray-500 transition hover:bg-white/60 hover:text-gray-900"
          @click="logout"
        >
          Выйти
        </button>
      </div>
    </header>

    <main class="mx-auto max-w-3xl">
      <RouterView v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </RouterView>
    </main>
    <ToastHost />
  </div>
</template>

<script setup lang="ts">
import ToastHost from './components/ToastHost.vue'
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

<style scoped>
.page-enter-active,
.page-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.page-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.page-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>