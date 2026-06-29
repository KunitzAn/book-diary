import { reactive } from 'vue'

export interface Toast {
  id: number
  message: string
  type: 'error' | 'success' | 'info'
}

export const toasts = reactive<Toast[]>([])

let counter = 0

export function showToast(message: string, type: Toast['type'] = 'error', duration = 3500) {
  const id = ++counter
  toasts.push({ id, message, type })
  setTimeout(() => dismissToast(id), duration)
}

export function dismissToast(id: number) {
  const i = toasts.findIndex(t => t.id === id)
  if (i !== -1) toasts.splice(i, 1)
}

export const toastError = (m: string) => showToast(m, 'error')
export const toastSuccess = (m: string) => showToast(m, 'success')