/*import Fastify from 'fastify'
import { PrismaClient } from './generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'
import cors from '@fastify/cors'
import { authRoutes } from './routes/auth.js'

const app = Fastify({ logger: true })
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

await app.register(cors, {
  origin: [
    'http://localhost:5173',
    'https://bookdiary.pages.dev',
    'https://kunitcan.online',
    'https://www.kunitcan.online'
  ]
})

// Роуты авторизации
app.register(authRoutes)

// Получить список всех книг
app.get('/books', async () => {
  const books = await prisma.book.findMany()
  return books
})
*/

import Fastify from 'fastify'
import cors from '@fastify/cors'
import { prisma } from './lib/prisma.js'
import { authRoutes } from './routes/auth.js'

const app = Fastify({ logger: true })

await app.register(cors, {
  origin: [
    'http://localhost:5173',
    'https://bookdiary.pages.dev',
    'https://kunitcan.online',
    'https://www.kunitcan.online'
  ]
})

app.register(authRoutes)

app.get('/health', async () => ({ ok: true })) 

app.get('/books', async () => {
  return prisma.book.findMany()
})

// Добавить книгу
app.post('/books', async (request, reply) => {
  const { title, author, status } = request.body as {
    title: string
    author: string
    status?: string
  }

  const book = await prisma.book.create({
    data: { title, author, status },
  })

  reply.code(201)
  return book
})

// Запускаем сервер
app.listen({ port: 3000, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
  console.log(`Сервер запущен: ${address}`)
})