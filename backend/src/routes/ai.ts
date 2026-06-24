import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { authMiddleware } from '../middleware/auth.js'
import { generateText, generateJSON } from '../lib/gemini.js'

export default async function aiRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authMiddleware)

  // POST /books/:id/generate-summary
  app.post('/books/:id/generate-summary', async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const bookId = parseInt(req.params.id)
    const userId = req.user!.userId

    const book = await prisma.book.findFirst({ where: { id: bookId, userId } })
    if (!book) return reply.status(404).send({ error: 'Книга не найдена' })

    const prompt = `Напиши краткое саммари книги "${book.title}" автора ${book.author}. 
2-3 абзаца, без спойлеров концовки. Только текст саммари, без вступлений и пояснений.`

    const summary = await generateText(prompt)
    const updated = await prisma.book.update({ where: { id: bookId }, data: { summary } })
    return reply.send({ summary: updated.summary })
  })

  // POST /books/:id/generate-characters
  app.post('/books/:id/generate-characters', async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const bookId = parseInt(req.params.id)
    const userId = req.user!.userId

    const book = await prisma.book.findFirst({ where: { id: bookId, userId } })
    if (!book) return reply.status(404).send({ error: 'Книга не найдена' })

    const prompt = `Перечисли главных персонажей книги "${book.title}" автора ${book.author}.
Верни ТОЛЬКО массив JSON объектов с полями name и description (1-2 предложения). Без markdown, без обёрток.`

    const characters = await generateJSON<{ name: string; description: string }[]>(prompt)

    await prisma.character.deleteMany({ where: { bookId } })
    await prisma.character.createMany({
      data: characters.map(c => ({ bookId, name: c.name, description: c.description }))
    })

    const saved = await prisma.character.findMany({ where: { bookId } })
    return reply.send({ characters: saved })
  })

  // POST /ai/similar — похожие на выбранные книги
  app.post('/ai/similar', async (
    req: FastifyRequest<{ Body: { bookIds: number[] } }>,
    reply: FastifyReply
  ) => {
    const userId = req.user!.userId
    const { bookIds } = req.body

    if (!bookIds?.length) return reply.status(400).send({ error: 'Нужно выбрать книги' })

    const books = await prisma.book.findMany({
      where: { id: { in: bookIds }, userId }
    })

    if (!books.length) return reply.status(404).send({ error: 'Книги не найдены' })

    // Все книги пользователя чтобы не рекомендовать уже прочитанные
    const allUserBooks = await prisma.book.findMany({
      where: { userId },
      select: { title: true, author: true }
    })

    const bookList = books.map(b => `"${b.title}" (${b.author})`).join(', ')
    const existingList = allUserBooks.map(b => `"${b.title}"`).join(', ')

    const prompt = `Пользователь читал книги: ${bookList}.
Порекомендуй 5 похожих книг, которых НЕТ в этом списке: ${existingList}.
Верни ТОЛЬКО JSON массив объектов с полями: title, author, reason (1 предложение почему похоже).
Без markdown, без пояснений.`

    const recommendations = await generateJSON<{ title: string; author: string; reason: string }[]>(prompt)
    return reply.send({ recommendations })
  })

  // GET /ai/author-books/:bookId — другие книги этого автора
  app.get('/ai/author-books/:bookId', async (
    req: FastifyRequest<{ Params: { bookId: string } }>,
    reply: FastifyReply
  ) => {
    const userId = req.user!.userId
    const bookId = parseInt(req.params.bookId)

    const book = await prisma.book.findFirst({ where: { id: bookId, userId } })
    if (!book) return reply.status(404).send({ error: 'Книга не найдена' })

    const authorBooks = await prisma.book.findMany({
      where: { userId, author: book.author },
      select: { title: true }
    })
    const existingTitles = authorBooks.map(b => `"${b.title}"`).join(', ')

    const prompt = `Какие ещё книги написал автор ${book.author}? 
Исключи эти книги, которые уже есть у пользователя: ${existingTitles}.
Верни ТОЛЬКО JSON массив объектов с полями: title, author, description (1 предложение об этой книге).
Максимум 5 книг. Без markdown, без пояснений.`

    const recommendations = await generateJSON<{ title: string; author: string; description: string }[]>(prompt)
    return reply.send({ recommendations })
  })

  // POST /ai/what-next — что читать дальше (анализ всей полки)
  app.post('/ai/what-next', async (
    req: FastifyRequest,
    reply: FastifyReply
  ) => {
    const userId = req.user!.userId

    const books = await prisma.book.findMany({
      where: { userId },
      select: { title: true, author: true, status: true, rating: true }
    })

    if (books.length < 2) {
      return reply.status(400).send({ error: 'Нужно хотя бы 2 книги на полке' })
    }

    const readBooks = books.filter(b => b.status === 'READ')
    const wantBooks = books.filter(b => b.status === 'WANT_TO_READ')

    const readList = readBooks
      .map(b => `"${b.title}" (${b.author})${b.rating ? `, оценка ${b.rating}/10` : ''}`)
      .join('; ')

    const wantList = wantBooks.map(b => `"${b.title}" (${b.author})`).join('; ')

    const prompt = `Вот книги пользователя:
Прочитанные: ${readList || 'нет'}.
Хочет прочитать: ${wantList || 'нет'}.

На основе вкусов пользователя порекомендуй 5 книг, которых нет в его списках.
Верни ТОЛЬКО JSON массив объектов с полями: title, author, reason (почему подойдёт этому читателю, 1-2 предложения).
Без markdown, без пояснений.`

    const recommendations = await generateJSON<{ title: string; author: string; reason: string }[]>(prompt)
    return reply.send({ recommendations })
  })
}