import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { authMiddleware } from '../middleware/auth.js'

export default async function booksRoutes(app: FastifyInstance) {
  // Защита всех роутов книг
  app.addHook('onRequest', authMiddleware)

  // ── 8.1.1 GET /books — мои книги + фильтры + сортировка ──
  app.get('/books', async (request, reply) => {
    const userId = request.user!.userId
    const { status, genre, sort } = request.query as {
      status?: string
      genre?: string
      sort?: string
    }

    const where: any = { userId }
    if (status) where.status = status      // WANT / READING / READ
    if (genre) where.genre = genre

    let orderBy: any = { createdAt: 'desc' }
    if (sort === 'rating') orderBy = { rating: 'desc' }
    if (sort === 'author') orderBy = { author: 'asc' }
    if (sort === 'date') orderBy = { createdAt: 'desc' }

    const books = await prisma.book.findMany({ where, orderBy })
    return books
  })

  // ── 8.1.2 GET /books/:id — одна книга со связями + владелец ──
  app.get('/books/:id', async (request, reply) => {
    const userId = request.user!.userId
    const { id } = request.params as { id: string }

    const book = await prisma.book.findFirst({
      where: { id: Number(id), userId },
      include: { quotes: true, characters: true },
    })

    if (!book) {
      return reply.code(404).send({ error: 'Book not found' })
    }
    return book
  })

  // ── 8.1.3 POST /books — создать (userId из токена) ──
  app.post('/books', async (request, reply) => {
    const userId = request.user!.userId
    const body = request.body as {
      title: string
      author: string
      genre?: string
      year?: number
      status?: 'WANT' | 'READING' | 'READ'
      rating?: number
      coverUrl?: string
      notes?: string
      summary?: string
    }

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
  })

  // ── 8.1.4 PATCH /books/:id — частичное редактирование + владелец ──
  app.patch('/books/:id', async (request, reply) => {
    const userId = request.user!.userId
    const { id } = request.params as { id: string }
    const body = request.body as Record<string, any>

    const existing = await prisma.book.findFirst({
      where: { id: Number(id), userId },
    })
    if (!existing) {
      return reply.code(404).send({ error: 'Book not found' })
    }

    const allowed = [
      'title', 'author', 'genre', 'year',
      'status', 'rating', 'coverUrl', 'notes', 'summary',
    ]
    const data: Record<string, any> = {}
    for (const key of allowed) {
      if (key in body) data[key] = body[key]
    }

    const updated = await prisma.book.update({
      where: { id: Number(id) },
      data,
    })
    return updated
  })

  // ── 8.1.5 DELETE /books/:id — удалить + владелец ──
  app.delete('/books/:id', async (request, reply) => {
    const userId = request.user!.userId
    const { id } = request.params as { id: string }

    const existing = await prisma.book.findFirst({
      where: { id: Number(id), userId },
    })
    if (!existing) {
      return reply.code(404).send({ error: 'Book not found' })
    }

    await prisma.book.delete({ where: { id: Number(id) } })
    return reply.code(204).send()
  })
}