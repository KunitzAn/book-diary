import { FastifyInstance } from 'fastify'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma.js'

interface TelegramAuthData {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

function verifyTelegramAuth(data: TelegramAuthData): boolean {
  const { hash, ...rest } = data

  // Строка для проверки: поля отсортированы по алфавиту, через \n
  const checkString = Object.keys(rest)
    .sort()
    .map(key => `${key}=${rest[key as keyof typeof rest]}`)
    .join('\n')

  // Секретный ключ = SHA256 от токена бота
  const secretKey = crypto
    .createHash('sha256')
    .update(process.env.TELEGRAM_BOT_TOKEN!)
    .digest()

  const hmac = crypto
    .createHmac('sha256', secretKey)
    .update(checkString)
    .digest('hex')

  // Проверяем подпись
  if (hmac !== hash) return false

  // Проверяем свежесть (не старше 24 часов)
  const now = Math.floor(Date.now() / 1000)
  if (now - data.auth_date > 86400) return false

  return true
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/telegram', async (request, reply) => {
    const data = request.body as TelegramAuthData

    if (!verifyTelegramAuth(data)) {
      return reply.status(401).send({ error: 'Invalid Telegram auth data' })
    }

    // Найти или создать пользователя
    const user = await prisma.user.upsert({
      where: { telegramId: String(data.id) },
      update: { username: data.username },
      create: {
        telegramId: String(data.id),
        username: data.username,
      },
    })

    // Выдаём JWT
    const token = jwt.sign(
      { userId: user.id, telegramId: user.telegramId },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    )

    return reply.send({ token, user })
  })
}