<!-- src/components/InlineField.vue -->
<template>
  <div>
    <p class="mb-0.5 text-xs font-medium uppercase tracking-wide text-gray-400">
      {{ label }}
    </p>

    <!-- Просмотр -->
    <div
      v-if="!editing"
      @click="startEdit"
      class="cursor-pointer rounded-lg px-2 py-1 text-sm hover:bg-gray-50 flex items-center gap-1"
    >
      <span :class="displayValue ? 'text-gray-900' : 'text-gray-400'">
        {{ displayValue || placeholder }}
      </span>
      <span class="text-xs text-gray-300">✎</span>
    </div>

    <!-- Редактирование -->
    <div v-else class="flex gap-2 items-center">
      <input
        ref="inputRef"
        v-model="draft"
        :type="type"
        class="flex-1 rounded-lg border border-blue-400 px-2 py-1 text-sm outline-none"
        @keydown.enter="save"
        @keydown.escape="cancel"
      />
      <button @click="save" class="text-sm font-medium text-blue-600">OK</button>
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

// синхронизируем если пропс изменился снаружи
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