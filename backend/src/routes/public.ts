import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'

// ВАЖНО: здесь НЕТ authMiddleware — эндпоинты открыты всем

export default async function publicRoutes(app: FastifyInstance) {

  // ── GET /public/books — лента всех публичных книг (как в ТГ) ──
  app.get('/public/books', async () => {
    const books = await prisma.book.findMany({
      where: { isPublic: true },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true } },
      },
    })
    return books
  })

  // ── GET /public/users — список юзеров, у которых есть публичные книги ──
  app.get('/public/users', async () => {
    const users = await prisma.user.findMany({
      where: {
        books: { some: { isPublic: true } },
      },
      select: {
        id: true,
        username: true,
        _count: {
          select: { books: { where: { isPublic: true } } },
        },
      },
    })

    // приводим к удобному виду
    return users.map((u) => ({
      id: u.id,
      username: u.username,
      publicBooksCount: u._count.books,
    }))
  })

  // ── GET /public/users/:userId/books — публичные книги конкретного юзера ──
  app.get(
    '/public/users/:userId/books',
    {
      schema: {
        params: {
          type: 'object',
          required: ['userId'],
          properties: { userId: { type: 'integer' } },
        },
      },
    },
    async (request, reply) => {
      const { userId } = request.params as { userId: number }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true },
      })
      if (!user) return reply.code(404).send({ error: 'User not found' })

      const books = await prisma.book.findMany({
        where: { userId, isPublic: true },
        orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
      })

      return { user, books }
    }
  )

  // ── GET /public/books/:id — одна публичная книга (со всем содержимым) ──
  app.get(
    '/public/books/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'integer' } },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: number }

      const book = await prisma.book.findFirst({
        where: { id, isPublic: true },
        include: {
          quotes: true,
          characters: true,
          user: { select: { id: true, username: true } },
        },
      })

      if (!book) return reply.code(404).send({ error: 'Book not found' })
      return book
    }
  )
}