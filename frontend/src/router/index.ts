import { createRouter, createWebHistory } from 'vue-router'
import { getToken } from '../lib/api'
import Login from '../pages/Login.vue'
import Shelf from '../pages/Shelf.vue'
import BookDetail from '../pages/BookDetail.vue'

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
      path: '/books/:id',
      component: BookDetail,
      meta: { requiresAuth: true },
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