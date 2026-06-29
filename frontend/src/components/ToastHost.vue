<template>
  <div class="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4">
    <transition-group name="toast">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="glass pointer-events-auto flex max-w-sm items-center gap-2 rounded-2xl px-4 py-2.5 text-sm"
        :class="{
          'text-red-600': t.type === 'error',
          'text-emerald-600': t.type === 'success',
          'text-gray-700': t.type === 'info',
        }"
        @click="dismissToast(t.id)"
      >
        <span>{{ icon(t.type) }}</span>
        <span class="font-medium">{{ t.message }}</span>
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { toasts, dismissToast, type Toast } from '../lib/toast'

function icon(type: Toast['type']): string {
  return { error: '⚠️', success: '✅', info: 'ℹ️' }[type]
}
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(-12px);
}
.toast-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>