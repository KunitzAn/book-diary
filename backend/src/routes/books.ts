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

// ← НОВОЕ: допустимые значки рейтинга + рейтинг с шагом 0.5
const RATING_ICONS = [
  'star', 'heart', 'skull', 'flower', 'moon', 'fire',
  'crown', 'gem', 'lightning', 'clover', 'butterfly', 'sparkles',
]
const ratingIconSchema = { type: 'string', enum: RATING_ICONS }
const ratingSchema = { type: 'number', minimum: 0, maximum: 10, multipleOf: 0.5 }

// ─── Вспомогательная функция: Google Books → Pollinations fallback ───
async function fetchOrGenerateCover(
  title: string,
  author: string | null
): Promise<{ url: string; source: 'google' | 'pollinations' }> {
  // 1. Пробуем Google Books API
  try {
    const query = [title, author].filter(Boolean).join(' ')
    const encoded = encodeURIComponent(query)
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY
    const gbUrl = `https://www.googleapis.com/books/v1/volumes?q=${encoded}&maxResults=3${apiKey ? `&key=${apiKey}` : ''}`

    console.log('[cover] Google Books запрос:', gbUrl)

    const gbRes = await fetch(gbUrl, { signal: AbortSignal.timeout(6000) })
    console.log('[cover] Google Books статус:', gbRes.status)

    if (gbRes.ok) {
      const gbData = await gbRes.json()
      const items = gbData?.items ?? []
      console.log('[cover] Google Books найдено книг:', items.length)

      for (const item of items) {
        const imageLinks = item?.volumeInfo?.imageLinks
        if (!imageLinks) continue

        const raw =
          imageLinks.extraLarge ??
          imageLinks.large ??
          imageLinks.medium ??
          imageLinks.small ??
          imageLinks.thumbnail ??
          imageLinks.smallThumbnail

        if (!raw) continue

        const url = raw
          .replace(/^http:\/\//, 'https://')
          .replace(/&zoom=\d/, '&zoom=1')
          .replace(/&edge=curl/, '')

        console.log('[cover] Google Books URL найден:', url)

        try {
          const testRes = await fetch(url, {
            signal: AbortSignal.timeout(5000),
            redirect: 'follow',
          })
          console.log(
            '[cover] Google Books картинка статус:',
            testRes.status,
            'size:',
            testRes.headers.get('content-length')
          )

          if (testRes.ok) {
            const ct = testRes.headers.get('content-type') ?? ''
            if (ct.startsWith('image/')) {
              return { url, source: 'google' }
            }
            console.warn('[cover] Google вернул не картинку, content-type:', ct)
          }
        } catch (fetchErr) {
          console.warn('[cover] Не удалось проверить картинку:', fetchErr)
        }
      }

      console.warn('[cover] Google Books: книги найдены но обложки не подошли')
    }
  } catch (e) {
    console.warn('[cover] Google Books API ошибка:', e)
  }

  // 2. Fallback: Pollinations
  console.log('[cover] Используем Pollinations fallback')
  const prompt = encodeURIComponent(
    `book cover "${title}"${author ? ` by ${author}` : ''}, ` +
      `professional publishing house design, detailed illustration, ` +
      `dramatic lighting, no text, no words`
  )
  return {
    url: `https://image.pollinations.ai/prompt/${prompt}?width=400&height=600&nologo=true&seed=${Date.now()}`,
    source: 'pollinations',
  }
}

export default async function booksRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authMiddleware)

  // ── GET /books ──
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

    let orderBy: any = [{ position: 'asc' }, { createdAt: 'desc' }]
    if (sort === 'rating') orderBy = { rating: 'desc' }
    if (sort === 'author') orderBy = { author: 'asc' }
    if (sort === 'date') orderBy = { createdAt: 'desc' }

    const books = await prisma.book.findMany({ where, orderBy })
    return books
  })

  // ── GET /books/:id ──
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

  // ── POST /books ──
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
            rating: ratingSchema,              // ← было integer
            ratingIcon: ratingIconSchema,      // ← НОВОЕ
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

      const last = await prisma.book.findFirst({
        where: { userId },
        orderBy: { position: 'desc' },
        select: { position: true },
      })
      const nextPosition = (last?.position ?? -1) + 1

      const book = await prisma.book.create({
        data: {
          userId,
          title: body.title,
          author: body.author,
          genre: body.genre,
          year: body.year,
          status: body.status ?? 'WANT',
          rating: body.rating,
          ratingIcon: body.ratingIcon ?? 'star',   // ← НОВОЕ
          coverUrl: body.coverUrl,
          notes: body.notes,
          summary: body.summary,
          position: nextPosition,
        },
      })

      return reply.code(201).send(book)
    }
  )

  // ── PATCH /books/:id ──
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
            rating: ratingSchema,                                        // ← 0.5 шаг
            ratingIcon: ratingIconSchema,                                // ← НОВОЕ
            coverUrl: { type: 'string' },
            coverPosition: { type: 'number', minimum: 0, maximum: 100 }, // ← НОВОЕ
            notes: { type: 'string' },
            summary: { type: 'string' },
            position: { type: 'integer', minimum: 0 },
            isPublic: { type: 'boolean' },
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
        'status', 'rating', 'ratingIcon', 'coverUrl', 'coverPosition',
        'notes', 'summary', 'position', 'isPublic',
      ]
      const data: Record<string, any> = {}
      for (const key of allowed) if (key in body) data[key] = body[key]

      const updated = await prisma.book.update({ where: { id }, data })
      return updated
    }
  )

  // ── DELETE /books/:id ──
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

  // ── POST /books/:id/cover (загрузка файла) ──
  app.post(
    '/books/:id/cover',
    { schema: { params: idParam } },
    async (request, reply) => {
      const userId = request.user!.userId
      const { id } = request.params as { id: number }

      const existing = await prisma.book.findFirst({ where: { id, userId } })
      if (!existing) return reply.code(404).send({ error: 'Book not found' })

      const data = await request.file()
      if (!data) return reply.code(400).send({ error: 'No file uploaded' })

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

      let buffer: Buffer
      try {
        buffer = await data.toBuffer()
      } catch (err) {
        return reply.code(413).send({ error: 'File too large (max 5MB)' })
      }

      const uploadsDir = join(process.cwd(), 'uploads', 'covers')
      await mkdir(uploadsDir, { recursive: true })

      const filename = `${id}-${Date.now()}.${ext}`
      await writeFile(join(uploadsDir, filename), buffer)

      const coverUrl = `/uploads/covers/${filename}`
      const updated = await prisma.book.update({
        where: { id },
        data: { coverUrl, coverPosition: 50 },   // ← сброс фокуса при новой обложке
      })

      return updated
    }
  )

  // ── POST /books/:id/generate-cover (Google Books → Pollinations) ──
  app.post(
    '/books/:id/generate-cover',
    { schema: { params: idParam } },
    async (request, reply) => {
      const userId = request.user!.userId
      const { id } = request.params as { id: number }

      const book = await prisma.book.findFirst({ where: { id, userId } })
      if (!book) return reply.code(404).send({ error: 'Book not found' })

      console.log(`[cover] Запрос обложки для: "${book.title}" / "${book.author}"`)

      try {
        const { url, source } = await fetchOrGenerateCover(book.title, book.author)
        console.log(`[cover] Источник: ${source}, URL: ${url}`)

        const imageRes = await fetch(url, {
          redirect: 'follow',
          signal: AbortSignal.timeout(15000),
        })

        if (!imageRes.ok) {
          throw new Error(`HTTP ${imageRes.status} при скачивании обложки`)
        }

        const contentType = imageRes.headers.get('content-type') ?? 'image/jpeg'
        const ext = contentType.includes('png')
          ? 'png'
          : contentType.includes('webp')
          ? 'webp'
          : 'jpg'

        const buffer = Buffer.from(await imageRes.arrayBuffer())
        console.log(`[cover] Скачано ${buffer.length} байт, тип: ${contentType}`)

        if (buffer.length < 1000) {
          throw new Error(`Слишком маленький файл: ${buffer.length} байт`)
        }

        const uploadsDir = join(process.cwd(), 'uploads', 'covers')
        await mkdir(uploadsDir, { recursive: true })

        const filename = `${source}-${id}-${Date.now()}.${ext}`
        await writeFile(join(uploadsDir, filename), buffer)

        const updated = await prisma.book.update({
          where: { id },
          data: { coverUrl: `/uploads/covers/${filename}`, coverPosition: 50 },
          include: { quotes: true, characters: true },
        })

        console.log(`[cover] Готово: /uploads/covers/${filename}`)
        return updated
      } catch (e) {
        console.error('[cover] Ошибка:', e)
        return reply.code(500).send({ error: 'Ошибка генерации обложки' })
      }
    }
  )
}