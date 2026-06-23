import Fastify from 'fastify'
import cors from '@fastify/cors'
import { prisma } from './lib/prisma.js'
import { authRoutes } from './routes/auth.js'
import booksRoutes from './routes/books.js'
import quotesRoutes from './routes/quotes.js'
import charactersRoutes from './routes/characters.js'

const app = Fastify({ logger: true })

await app.register(cors, {
  origin: [
    'http://localhost:5173',
    'https://bookdiary.pages.dev',
    'https://kunitcan.online',
    'https://www.kunitcan.online'
  ],
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],  // ← добавить
})

app.register(authRoutes)
app.register(booksRoutes)
app.register(quotesRoutes)
app.register(charactersRoutes)

app.get('/health', async () => ({ ok: true }))

app.listen({ port: 3000, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
  console.log(`Сервер запущен: ${address}`)
})