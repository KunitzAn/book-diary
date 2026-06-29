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

  // ─── F1: POST /books/:id/generate-character — описание ОДНОГО героя по имени ───
  app.post('/books/:id/generate-character', async (
    req: FastifyRequest<{ Params: { id: string }; Body: { name: string } }>,
    reply: FastifyReply
  ) => {
    const bookId = parseInt(req.params.id)
    const userId = req.user!.userId
    const name = req.body?.name?.trim()

    if (!name) return reply.status(400).send({ error: 'Нужно имя персонажа' })

    const book = await prisma.book.findFirst({ where: { id: bookId, userId } })
    if (!book) return reply.status(404).send({ error: 'Книга не найдена' })

    const prompt = `В книге "${book.title}" автора ${book.author} есть персонаж по имени "${name}".
Напиши краткое описание этого персонажа в 1-2 предложениях.
Только текст описания, без вступлений, без кавычек, без markdown.`

    const description = await generateText(prompt)

    const character = await prisma.character.create({
      data: { bookId, name, description: description.trim() }
    })

    return reply.send({ character })
  })

  // ─── F2: POST /books/:id/generate-vibe — хештеги вайба по цитатам ───
  app.post('/books/:id/generate-vibe', async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const bookId = parseInt(req.params.id)
    const userId = req.user!.userId

    const book = await prisma.book.findFirst({
      where: { id: bookId, userId },
      include: { quotes: true }
    })
    if (!book) return reply.status(404).send({ error: 'Книга не найдена' })

    if (!book.quotes.length) {
      return reply.status(400).send({ error: 'Сначала добавь хотя бы одну цитату' })
    }

    const quotesText = book.quotes.map(q => `«${q.text}»`).join('\n')

    const prompt = `Вот цитаты из книги "${book.title}" автора ${book.author}:
${quotesText}

На основе этих цитат определи атмосферу, настроение и стиль книги.
Верни ТОЛЬКО JSON массив из 5-8 коротких хештегов на русском (одно-два слова, без символа #).
Пример: ["меланхолия", "одиночество", "поиск смысла"].
Без markdown, без пояснений.`

    const tags = await generateJSON<string[]>(prompt)
    const vibeTags = tags.map(t => t.replace(/^#/, '').trim()).filter(Boolean)

    const updated = await prisma.book.update({
      where: { id: bookId },
      data: { vibeTags }
    })

    return reply.send({ vibeTags: updated.vibeTags })
  })

  // ─── F4: POST /books/:id/generate-genre-year — жанр и год по названию+автору ───
  app.post('/books/:id/generate-genre-year', async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const bookId = parseInt(req.params.id)
    const userId = req.user!.userId

    const book = await prisma.book.findFirst({ where: { id: bookId, userId } })
    if (!book) return reply.status(404).send({ error: 'Книга не найдена' })

    const prompt = `Книга "${book.title}" автора ${book.author}.
Определи её жанр и год первой публикации.
Верни ТОЛЬКО JSON объект с полями: genre (строка, на русском) и year (число — год издания).
Если год неизвестен, поставь null. Без markdown, без пояснений.`

    const result = await generateJSON<{ genre: string | null; year: number | null }>(prompt)

    const updated = await prisma.book.update({
      where: { id: bookId },
      data: {
        genre: result.genre || book.genre,
        year: result.year ?? book.year,
      }
    })

    return reply.send({ genre: updated.genre, year: updated.year })
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
    const wantBooks = books.filter(b => b.status === 'WANT') // ← исправлен баг WANT_TO_READ → WANT

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