<template>
  <div class="shelf">
    <header>
      <h1>📚 Моя полка</h1>
      <button @click="logout">Выйти</button>
    </header>

    <p>Здесь будут твои книги</p>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { removeToken } from '../lib/api'

const router = useRouter()

function logout() {
  removeToken()
  router.push('/login')
}
</script>

<style scoped>
.shelf {
  padding: 24px;
  font-family: sans-serif;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

button {
  padding: 8px 16px;
  cursor: pointer;
}
</style>