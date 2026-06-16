import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { authMiddleware } from '../middleware/auth.js'

// ── Переиспользуемые куски схем ──
const idParam = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'integer' } },
}

const bookStatus = { type: 'string', enum: ['WANT', 'READING', 'READ'] }

export default async function booksRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authMiddleware)

  // ── 8.1.1 GET /books ──
  app.get('/books', async (request, reply) => {
    const userId = request.user!.userId
    const { status, genre, sort } = request.query as {
      status?: string
      genre?: string
      sort?: string
    }

    const where: any = { userId }
    if (status) where.status = status
    if (genre) where.genre = genre

    let orderBy: any = { createdAt: 'desc' }
    if (sort === 'rating') orderBy = { rating: 'desc' }
    if (sort === 'author') orderBy = { author: 'asc' }
    if (sort === 'date') orderBy = { createdAt: 'desc' }

    const books = await prisma.book.findMany({ where, orderBy })
    return books
  })

  // ── 8.1.2 GET /books/:id ──
  app.get(
    '/books/:id',
    { schema: { params: idParam } },
    async (request, reply) => {
      const userId = request.user!.userId
      const { id } = request.params as { id: number }

      const book = await prisma.book.findFirst({
        where: { id, userId },
        include: { quotes: true, characters: true },
      })

      if (!book) return reply.code(404).send({ error: 'Book not found' })
      return book
    }
  )

  // ── 8.1.3 POST /books ──
  app.post(
    '/books',
    {
      schema: {
        body: {
          type: 'object',
          required: ['title', 'author'],
          properties: {
            title: { type: 'string', minLength: 1 },
            author: { type: 'string', minLength: 1 },
            genre: { type: 'string' },
            year: { type: 'integer' },
            status: bookStatus,
            rating: { type: 'integer', minimum: 1, maximum: 10 },
            coverUrl: { type: 'string' },
            notes: { type: 'string' },
            summary: { type: 'string' },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const userId = request.user!.userId
      const body = request.body as any

      const book = await prisma.book.create({
        data: {
          userId,
          title: body.title,
          author: body.author,
          genre: body.genre,
          year: body.year,
          status: body.status ?? 'WANT',
          rating: body.rating,
          coverUrl: body.coverUrl,
          notes: body.notes,
          summary: body.summary,
        },
      })

      return reply.code(201).send(book)
    }
  )

  // ── 8.1.4 PATCH /books/:id ──
  app.patch(
    '/books/:id',
    {
      schema: {
        params: idParam,
        body: {
          type: 'object',
          properties: {
            title: { type: 'string', minLength: 1 },
            author: { type: 'string', minLength: 1 },
            genre: { type: 'string' },
            year: { type: 'integer' },
            status: bookStatus,
            rating: { type: 'integer', minimum: 1, maximum: 10 },
            coverUrl: { type: 'string' },
            notes: { type: 'string' },
            summary: { type: 'string' },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const userId = request.user!.userId
      const { id } = request.params as { id: number }
      const body = request.body as Record<string, any>

      const existing = await prisma.book.findFirst({ where: { id, userId } })
      if (!existing) return reply.code(404).send({ error: 'Book not found' })

      const allowed = [
        'title', 'author', 'genre', 'year',
        'status', 'rating', 'coverUrl', 'notes', 'summary',
      ]
      const data: Record<string, any> = {}
      for (const key of allowed) if (key in body) data[key] = body[key]

      const updated = await prisma.book.update({ where: { id }, data })
      return updated
    }
  )

  // ── 8.1.5 DELETE /books/:id ──
  app.delete(
    '/books/:id',
    { schema: { params: idParam } },
    async (request, reply) => {
      const userId = request.user!.userId
      const { id } = request.params as { id: number }

      const existing = await prisma.book.findFirst({ where: { id, userId } })
      if (!existing) return reply.code(404).send({ error: 'Book not found' })

      await prisma.book.delete({ where: { id } })
      return reply.code(204).send()
    }
  )
}