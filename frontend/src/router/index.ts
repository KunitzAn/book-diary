import { createRouter, createWebHistory } from 'vue-router'
import { getToken } from '../lib/api'
import Login from '../pages/Login.vue'
import Shelf from '../pages/Shelf.vue'
import BookDetail from '../pages/BookDetail.vue'
import Community from '../pages/Community.vue'
import PublicShelf from '../pages/PublicShelf.vue'
import PublicBook from '../pages/PublicBook.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      component: Login,
    },
    {
      path: '/shelf',
      component: Shelf,
      meta: { requiresAuth: true },
    },
    {
      path: '/book/:id',
      component: BookDetail,
      meta: { requiresAuth: true },
      props: true,
    },
    // ── G: Сообщество (публичные, без авторизации) ──
    {
      path: '/community',
      component: Community,
    },
    {
      path: '/community/user/:userId',
      component: PublicShelf,
      props: true,
    },
    {
      path: '/community/book/:id',
      component: PublicBook,
      props: true,
    },
    {
      path: '/',
      redirect: '/shelf',
    },
  ],
})

// Защита роутов — неавторизованных гоним на /login
router.beforeEach((to) => {
  if (to.meta.requiresAuth && !getToken()) {
    return '/login'
  }
})

export default router