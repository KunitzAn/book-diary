import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { authMiddleware } from '../middleware/auth.js'
import { writeFile, mkdir } from 'node:fs/promises'   
import { join } from 'node:path'       
import { pipeline } from 'node:stream/promises'
import { createWriteStream } from 'node:fs'                

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

  // ─── Вспомогательная функция: Google Books → Pollinations fallback ───
  async function fetchOrGenerateCover(title: string, author: string | null): Promise<string> {
    // 1. Пробуем Google Books API
    try {
      const query = [title, author].filter(Boolean).join(' ')
      const encoded = encodeURIComponent(query)
      const gbRes = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encoded}&maxResults=1&fields=items(volumeInfo/imageLinks)`,
        { signal: AbortSignal.timeout(5000) }
      )

      if (gbRes.ok) {
        const gbData = await gbRes.json()
        const imageLinks = gbData?.items?.[0]?.volumeInfo?.imageLinks

        if (imageLinks) {
          // Берём максимальное доступное качество
          const url =
            imageLinks.extraLarge ??
            imageLinks.large ??
            imageLinks.medium ??
            imageLinks.small ??
            imageLinks.thumbnail

          if (url) {
            // Google Books отдаёт http — форсируем https
            return url.replace(/^http:\/\//, 'https://')
          }
        }
      }
    } catch (e) {
      console.warn('Google Books API недоступен, fallback на Pollinations:', e)
    }

    // 2. Fallback: Pollinations с детальным промптом
    const prompt = encodeURIComponent(
      `book cover for "${title}"${author ? ` by ${author}` : ''}, ` +
      `professional book cover design, high quality, detailed illustration, ` +
      `publishing house style, dramatic lighting, no text`
    )
    return `https://image.pollinations.ai/prompt/${prompt}?width=400&height=600&nologo=true`
  }

  // POST /books/:id/generate-cover
  router.post('/:id/generate-cover', requireAuth, async (req, res) => {
    const id = Number(req.params.id)
    const book = await prisma.book.findFirst({
      where: { id, userId: req.userId },
    })
    if (!book) return res.status(404).json({ message: 'Книга не найдена' })

    try {
      const coverUrl = await fetchOrGenerateCover(book.title, book.author)

      // Скачиваем картинку и сохраняем локально
      const imageRes = await fetch(coverUrl)
      if (!imageRes.ok) throw new Error('Не удалось скачать обложку')

      const buffer = Buffer.from(await imageRes.arrayBuffer())
      const filename = `ai-${id}-${Date.now()}.jpg`
      const filepath = path.join(uploadsDir, filename)
      await fs.writeFile(filepath, buffer)

      const updated = await prisma.book.update({
        where: { id },
        data: { coverUrl: `/uploads/covers/${filename}` },
        include: { quotes: true, characters: true },
      })

      return res.json(updated)
    } catch (e) {
      console.error('generate-cover error:', e)
      return res.status(500).json({ message: 'Ошибка генерации обложки' })
    }
  })
}