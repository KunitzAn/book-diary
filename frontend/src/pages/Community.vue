<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getPublicUsers } from '../api/public'
import type { PublicUser } from '../types/models'

const router = useRouter()
const users = ref<PublicUser[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    users.value = await getPublicUsers()
  } catch (e: any) {
    error.value = e?.message ?? 'Не удалось загрузить'
  } finally {
    loading.value = false
  }
})

function openUser(id: number) {
  router.push(`/community/user/${id}`)
}
</script>

<template>
  <div class="community">
    <h1>Сообщество</h1>

    <p v-if="loading">Загрузка…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <p v-else-if="users.length === 0">Пока никто не открыл свои книги 📚</p>

    <ul v-else class="user-list">
      <li v-for="u in users" :key="u.id" @click="openUser(u.id)" class="user-card">
        <span class="name">{{ u.username || `Пользователь #${u.id}` }}</span>
        <span class="count">{{ u.publicBooksCount }} кн.</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.community { max-width: 720px; margin: 0 auto; padding: 16px; }
.user-list { list-style: none; padding: 0; display: grid; gap: 12px; }
.user-card {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 18px; border: 1px solid #ddd; border-radius: 12px;
  cursor: pointer; transition: background .15s;
}
.user-card:hover { background: #f5f5f5; }
.name { font-weight: 600; }
.count { color: #888; font-size: 14px; }
.error { color: #c00; }
</style>