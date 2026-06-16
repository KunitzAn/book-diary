import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { authMiddleware } from '../middleware/auth.js'

export default async function quotesRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authMiddleware)

  // 8.2.1 POST /books/:id/quotes — добавить цитату
  app.post('/books/:id/quotes', async (request, reply) => {
    const userId = request.user!.userId
    const { id } = request.params as { id: string }
    const body = request.body as { text: string; chapter?: string }

    // проверка владельца через книгу
    const book = await prisma.book.findFirst({
      where: { id: Number(id), userId },
    })
    if (!book) return reply.code(404).send({ error: 'Book not found' })

    const quote = await prisma.quote.create({
      data: { bookId: Number(id), text: body.text, chapter: body.chapter },
    })
    return reply.code(201).send(quote)
  })

  // 8.2.2 PATCH /quotes/:id — редактировать
  app.patch('/quotes/:id', async (request, reply) => {
    const userId = request.user!.userId
    const { id } = request.params as { id: string }
    const body = request.body as Record<string, any>

    // цитата + её книга, проверяем владельца книги
    const quote = await prisma.quote.findFirst({
      where: { id: Number(id), book: { userId } },
    })
    if (!quote) return reply.code(404).send({ error: 'Quote not found' })

    const allowed = ['text', 'chapter']
    const data: Record<string, any> = {}
    for (const key of allowed) if (key in body) data[key] = body[key]

    const updated = await prisma.quote.update({
      where: { id: Number(id) },
      data,
    })
    return updated
  })

  // 8.2.3 DELETE /quotes/:id — удалить
  app.delete('/quotes/:id', async (request, reply) => {
    const userId = request.user!.userId
    const { id } = request.params as { id: string }

    const quote = await prisma.quote.findFirst({
      where: { id: Number(id), book: { userId } },
    })
    if (!quote) return reply.code(404).send({ error: 'Quote not found' })

    await prisma.quote.delete({ where: { id: Number(id) } })
    return reply.code(204).send()
  })
}