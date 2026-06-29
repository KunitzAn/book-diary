<template>
  <div>
    <p class="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
      {{ label }}
    </p>

    <!-- Просмотр -->
    <div
      v-if="!editing"
      @click="startEdit"
      class="group flex cursor-pointer items-center gap-1.5 rounded-2xl px-3 py-2 text-sm transition hover:bg-white/60"
    >
      <span :class="displayValue ? 'text-gray-900' : 'text-gray-400'">
        {{ displayValue || placeholder }}
      </span>
      <span class="text-xs text-gray-300 opacity-0 transition group-hover:opacity-100">✎</span>
    </div>

    <!-- Редактирование -->
    <div v-else class="flex items-center gap-2">
      <input
        ref="inputRef"
        v-model="draft"
        :type="type"
        class="field flex-1"
        @keydown.enter="save"
        @keydown.escape="cancel"
      />
      <button @click="save" class="text-sm font-semibold text-accent-violet">OK</button>
      <button @click="cancel" class="text-sm text-gray-400">✕</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    label: string
    value: string
    placeholder?: string
    type?: string
  }>(),
  { placeholder: '—', type: 'text' }
)

const emit = defineEmits<{ save: [value: string] }>()

const editing = ref(false)
const draft = ref('')
const displayValue = ref(props.value)
const inputRef = ref<HTMLInputElement | null>(null)

watch(() => props.value, v => { displayValue.value = v })

async function startEdit() {
  draft.value = displayValue.value
  editing.value = true
  await nextTick()
  inputRef.value?.focus()
}

function save() {
  displayValue.value = draft.value
  editing.value = false
  emit('save', draft.value)
}

function cancel() {
  editing.value = false
}
</script>