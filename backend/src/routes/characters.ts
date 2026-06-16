import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { authMiddleware } from '../middleware/auth.js'

const idParam = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'integer' } },
}

export default async function charactersRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authMiddleware)

  // ── 8.2.4 POST /books/:id/characters ──
  app.post(
    '/books/:id/characters',
    {
      schema: {
        params: idParam,
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1 },
            description: { type: 'string' },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const userId = request.user!.userId
      const { id } = request.params as { id: number }
      const body = request.body as { name: string; description?: string }

      const book = await prisma.book.findFirst({ where: { id, userId } })
      if (!book) return reply.code(404).send({ error: 'Book not found' })

      const character = await prisma.character.create({
        data: { bookId: id, name: body.name, description: body.description },
      })
      return reply.code(201).send(character)
    }
  )

  // ── 8.2.5 PATCH /characters/:id ──
  app.patch(
    '/characters/:id',
    {
      schema: {
        params: idParam,
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1 },
            description: { type: 'string' },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const userId = request.user!.userId
      const { id } = request.params as { id: number }
      const body = request.body as Record<string, any>

      const character = await prisma.character.findFirst({
        where: { id, book: { userId } },
      })
      if (!character) return reply.code(404).send({ error: 'Character not found' })

      const allowed = ['name', 'description']
      const data: Record<string, any> = {}
      for (const key of allowed) if (key in body) data[key] = body[key]

      const updated = await prisma.character.update({ where: { id }, data })
      return updated
    }
  )

  // ── 8.2.6 DELETE /characters/:id ──
  app.delete(
    '/characters/:id',
    { schema: { params: idParam } },
    async (request, reply) => {
      const userId = request.user!.userId
      const { id } = request.params as { id: number }

      const character = await prisma.character.findFirst({
        where: { id, book: { userId } },
      })
      if (!character) return reply.code(404).send({ error: 'Character not found' })

      await prisma.character.delete({ where: { id } })
      return reply.code(204).send()
    }
  )
}