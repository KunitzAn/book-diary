import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { authMiddleware } from '../middleware/auth.js'
import { generateText, generateJSON } from '../lib/gemini.js'

export default async function aiRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authMiddleware)   // ← ДОБАВИЛИ

  // POST /books/:id/generate-summary
  app.post('/books/:id/generate-summary', async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const bookId = parseInt(req.params.id)
    const userId = req.user!.userId   // ← ИСПРАВИЛИ

    const book = await prisma.book.findFirst({
      where: { id: bookId, userId }
    })

    if (!book) {
      return reply.status(404).send({ error: 'Книга не найдена' })
    }

    const prompt = `Напиши краткое саммари книги "${book.title}" автора ${book.author}. 
2-3 абзаца, без спойлеров концовки. Только текст саммари, без вступлений и пояснений.`

    const summary = await generateText(prompt)

    const updated = await prisma.book.update({
      where: { id: bookId },
      data: { summary }
    })

    return reply.send({ summary: updated.summary })
  })

  // POST /books/:id/generate-characters
  app.post('/books/:id/generate-characters', async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const bookId = parseInt(req.params.id)
    const userId = req.user!.userId   // ← ИСПРАВИЛИ

    const book = await prisma.book.findFirst({
      where: { id: bookId, userId }
    })

    if (!book) {
      return reply.status(404).send({ error: 'Книга не найдена' })
    }

    const prompt = `Перечисли главных персонажей книги "${book.title}" автора ${book.author}.
Верни ТОЛЬКО массив JSON объектов с полями name и description (1-2 предложения). Без markdown, без обёрток.`

    const characters = await generateJSON<{ name: string; description: string }[]>(prompt)

    await prisma.character.deleteMany({ where: { bookId } })
    await prisma.character.createMany({
      data: characters.map(c => ({
        bookId,
        name: c.name,
        description: c.description
      }))
    })

    const saved = await prisma.character.findMany({ where: { bookId } })
    return reply.send({ characters: saved })
  })
}