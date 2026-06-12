import { JwtPayload } from '../middleware/auth'

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      userId: number
      telegramId: string
    }
  }
}