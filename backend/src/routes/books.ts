import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { authMiddleware } from '../middleware/auth.js'
import { writeFile, mkdir } from 'node:fs/promises'   
import { join } from 'node:path'                       

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

    // ── 10.1.2 POST /books/:id/cover ──
  app.post(
    '/books/:id/cover',
    { schema: { params: idParam } },
    async (request, reply) => {
      const userId = request.user!.userId
      const { id } = request.params as { id: number }

      // проверяем что книга есть и принадлежит юзеру
      const existing = await prisma.book.findFirst({ where: { id, userId } })
      if (!existing) return reply.code(404).send({ error: 'Book not found' })

      // получаем файл
      const data = await request.file()
      if (!data) return reply.code(400).send({ error: 'No file uploaded' })

      // валидация типа
      const allowedMime: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
      }
      const ext = allowedMime[data.mimetype]
      if (!ext) {
        return reply
          .code(400)
          .send({ error: 'Unsupported format. Use jpg, png or webp' })
      }

      // читаем содержимое (тут же сработает лимит 5 МБ из конфига)
      let buffer: Buffer
      try {
        buffer = await data.toBuffer()
      } catch (err) {
        return reply.code(413).send({ error: 'File too large (max 5MB)' })
      }

      // папка для загрузок
      const uploadsDir = join(process.cwd(), 'uploads', 'covers')
      await mkdir(uploadsDir, { recursive: true })

      // уникальное имя
      const filename = `${id}-${Date.now()}.${ext}`
      await writeFile(join(uploadsDir, filename), buffer)

      // путь, по которому файл будет отдаваться наружу
      const coverUrl = `/uploads/covers/${filename}`

      const updated = await prisma.book.update({
        where: { id },
        data: { coverUrl },
      })

      return updated
    }
  )
}