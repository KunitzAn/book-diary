import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import { join } from 'node:path'
import { prisma } from './lib/prisma.js'
import { authRoutes } from './routes/auth.js'
import booksRoutes from './routes/books.js'
import quotesRoutes from './routes/quotes.js'
import charactersRoutes from './routes/characters.js'
import aiRoutes from './routes/ai.js'
import publicRoutes from './routes/public.js'    
    

const app = Fastify({ logger: true })

await app.register(cors, {
  origin: [
    'http://localhost:5173',
    'https://bookdiary.pages.dev',
    'https://kunitcan.online',
    'https://www.kunitcan.online'
  ],
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
})

await app.register(multipart, {
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
})

await app.register(fastifyStatic, {
  root: join(process.cwd(), 'uploads'),
  prefix: '/uploads/',
})

app.register(authRoutes)
app.register(booksRoutes)
app.register(quotesRoutes)
app.register(charactersRoutes)
app.register(aiRoutes)
app.register(publicRoutes)                        

app.get('/health', async () => ({ ok: true }))

app.listen({ port: 3000, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
  console.log(`Сервер запущен: ${address}`)
})