import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = process.env.GEMINI_API_KEY

if (!apiKey) {
  throw new Error('GEMINI_API_KEY не задан в .env')
}

const genAI = new GoogleGenerativeAI(apiKey)

// Retry-обёртка: 3 попытки с паузой 2с
async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (error: any) {
      const isRetryable = error?.status === 503 || error?.status === 429
      if (isRetryable && i < attempts - 1) {
        await new Promise(r => setTimeout(r, 2000 * (i + 1)))
        continue
      }
      if (error?.status === 429) throw new Error('Превышен лимит запросов к Gemini, попробуй позже')
      if (error?.status === 503) throw new Error('Gemini временно недоступен, попробуй позже')
      if (error?.status === 400) throw new Error('Некорректный запрос к Gemini')
      throw new Error(`Ошибка Gemini: ${error?.message ?? 'неизвестная ошибка'}`)
    }
  }
  throw new Error('Gemini не ответил после нескольких попыток')
}

export async function generateText(prompt: string): Promise<string> {
  return withRetry(async () => {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const result = await model.generateContent(prompt)
    return result.response.text()
  })
}

export async function generateJSON<T>(prompt: string): Promise<T> {
  return withRetry(async () => {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: { responseMimeType: 'application/json' },
    })
    const result = await model.generateContent(prompt)
    const text = result.response.text()
    return JSON.parse(text) as T
  })
}