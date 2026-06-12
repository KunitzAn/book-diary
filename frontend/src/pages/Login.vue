<template>
  <div class="login">
    <h1>📚 Book Diary</h1>
    <p>Войди через Telegram, чтобы вести свою полку</p>

    <div id="telegram-widget"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { setToken } from '../lib/api'

const router = useRouter()

onMounted(() => {
  // Вешаем колбэк на window — виджет вызовет его после входа
  window.onTelegramAuth = async (user: TelegramUser) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/auth/telegram`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user),
        }
      )

      if (!res.ok) throw new Error('Ошибка авторизации')

      const data = await res.json()
      setToken(data.token)
      router.push('/shelf')
    } catch (e) {
      console.error(e)
      alert('Не удалось войти. Попробуй ещё раз.')
    }
  }

  // Вставляем скрипт виджета динамически
  const script = document.createElement('script')
  script.src = 'https://telegram.org/js/telegram-widget.js?22'
  script.setAttribute('data-telegram-login', 'BookDiaryKun_Bot')
  script.setAttribute('data-size', 'large')
  script.setAttribute('data-onauth', 'onTelegramAuth(user)')
  script.setAttribute('data-request-access', 'write')
  script.async = true

  document.getElementById('telegram-widget')?.appendChild(script)
})
</script>

<style scoped>
.login {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: 16px;
  font-family: sans-serif;
}

h1 {
  font-size: 2rem;
}
</style>