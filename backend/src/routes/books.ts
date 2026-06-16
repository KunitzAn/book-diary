import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { authMiddleware } from '../middleware/auth.js'

export async function booksRoutes(app: FastifyInstance) {
  // Охранник: проверяем JWT перед КАЖДЫМ запросом в этом файле.
  // После этого хука request.user.userId доступен везде ниже.
  app.addHook('onRequest', authMiddleware)

  // --- временно переносим то, что было в server.ts ---
  // (логику с userId добавим в Блоке 8.1, пока 1:1 как было)

  app.get('/books', async () => {
    return prisma.book.findMany()
  })

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
}