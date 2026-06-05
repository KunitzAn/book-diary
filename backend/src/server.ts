import Fastify from 'fastify'
import { PrismaClient } from './generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'
import cors from '@fastify/cors'

const app = Fastify({ logger: true })
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

await app.register(cors, { origin: 'http://localhost:5173' })

// Получить список всех книг
app.get('/books', async () => {
  const books = await prisma.book.findMany()
  return books
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