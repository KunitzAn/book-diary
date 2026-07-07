import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { authMiddleware } from '../middleware/auth.js'
import { generateJSON } from '../lib/gemini.js'

const idParam = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'integer' } },
}

export default async function quotesRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authMiddleware)

  // ── 8.2.1 POST /books/:id/quotes ──
  app.post(
    '/books/:id/quotes',
    {
      schema: {
        params: idParam,
        body: {
          type: 'object',
          required: ['text'],
          properties: {
            text: { type: 'string', minLength: 1 },
            chapter: { type: 'string' },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const userId = request.user!.userId
      const { id } = request.params as { id: number }
      const body = request.body as { text: string; chapter?: string }

      const book = await prisma.book.findFirst({ where: { id, userId } })
      if (!book) return reply.code(404).send({ error: 'Book not found' })

      const quote = await prisma.quote.create({
        data: { bookId: id, text: body.text, chapter: body.chapter },
      })
      return reply.code(201).send(quote)
    }
  )

  // ── POST /books/:id/quotes/bulk-ai — разбор массового текста на цитаты через ИИ ──
  app.post(
    '/books/:id/quotes/bulk-ai',
    {
      schema: {
        params: idParam,
        body: {
          type: 'object',
          required: ['text'],
          properties: {
            text: { type: 'string', minLength: 1, maxLength: 20000 },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const userId = request.user!.userId
      const { id } = request.params as { id: number }
      const { text } = request.body as { text: string }

      const book = await prisma.book.findFirst({ where: { id, userId } })
      if (!book) return reply.code(404).send({ error: 'Book not found' })

      const prompt = `Ниже — сырой текст, скопированный из книги/сервиса.
В нём подряд идут несколько цитат, возможно с лишними символами, номерами страниц,
переносами строк, кавычками разного вида, служебными пометками.

Твоя задача — аккуратно разбить этот текст на ОТДЕЛЬНЫЕ цитаты.
Правила:
- Каждая цитата — это законченная мысль/фрагмент.
- Убери лишние кавычки по краям, номера страниц, служебный мусор.
- НЕ придумывай и НЕ переписывай текст — только чисти и разделяй.
- Сохраняй исходный язык и пунктуацию внутри цитаты.
- Если это одна большая цитата — верни массив из одного элемента.

Верни ТОЛЬКО JSON-массив строк, где каждая строка — одна цитата.
Без markdown, без пояснений, без ключей — просто массив строк.

Текст:
"""
${text}
"""`

      const parsed = await generateJSON<string[]>(prompt)

      const quotesToCreate = (Array.isArray(parsed) ? parsed : [])
        .map(q => (typeof q === 'string' ? q.trim() : ''))
        .filter(Boolean)

      if (quotesToCreate.length === 0) {
        return reply.code(422).send({ error: 'Не удалось выделить цитаты из текста' })
      }

      await prisma.quote.createMany({
        data: quotesToCreate.map(t => ({ bookId: id, text: t })),
      })

      // возвращаем именно созданные (последние N по id)
      const created = await prisma.quote.findMany({
        where: { bookId: id },
        orderBy: { id: 'desc' },
        take: quotesToCreate.length,
      })

      return reply.code(201).send({ quotes: created.reverse() })
    }
  )

  // ── 8.2.2 PATCH /quotes/:id ──
  app.patch(
    '/quotes/:id',
    {
      schema: {
        params: idParam,
        body: {
          type: 'object',
          properties: {
            text: { type: 'string', minLength: 1 },
            chapter: { type: 'string' },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const userId = request.user!.userId
      const { id } = request.params as { id: number }
      const body = request.body as Record<string, any>

      const quote = await prisma.quote.findFirst({
        where: { id, book: { userId } },
      })
      if (!quote) return reply.code(404).send({ error: 'Quote not found' })

      const allowed = ['text', 'chapter']
      const data: Record<string, any> = {}
      for (const key of allowed) if (key in body) data[key] = body[key]

      const updated = await prisma.quote.update({ where: { id }, data })
      return updated
    }
  )

  // ── 8.2.3 DELETE /quotes/:id ──
  app.delete(
    '/quotes/:id',
    { schema: { params: idParam } },
    async (request, reply) => {
      const userId = request.user!.userId
      const { id } = request.params as { id: number }

      const quote = await prisma.quote.findFirst({
        where: { id, book: { userId } },
      })
      if (!quote) return reply.code(404).send({ error: 'Quote not found' })

      await prisma.quote.delete({ where: { id } })
      return reply.code(204).send()
    }
  )
}