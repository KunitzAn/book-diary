// backend/src/lib/deepseek.ts

const BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'
const API_KEY = process.env.DEEPSEEK_API_KEY || ''
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat'

const MAX_RETRIES = 5
const BASE_DELAY_MS = 2000

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function callDeepSeek(prompt: string): Promise<string> {
  if (!API_KEY) {
    throw new Error('DEEPSEEK_API_KEY не задан в .env')
  }

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: prompt },
          ],
          stream: false,
        }),
      })

      // Сервис временно недоступен / лимиты — ретраим
      if (res.status === 503 || res.status === 429 || res.status >= 500) {
        lastError = new Error(`DeepSeek HTTP ${res.status}`)
        const delay = BASE_DELAY_MS * attempt
        console.warn(`DeepSeek ${res.status}, попытка ${attempt}/${MAX_RETRIES}, жду ${delay}ms...`)
        await sleep(delay)
        continue
      }

      if (!res.ok) {
        const errText = await res.text()
        throw new Error(`DeepSeek HTTP ${res.status}: ${errText.slice(0, 200)}`)
      }

      const data = await res.json() as {
        choices?: { message?: { content?: string } }[]
        error?: { message?: string }
      }

      const content = data.choices?.[0]?.message?.content
      if (content) {
        return content
      }

      throw new Error(data.error?.message || 'Пустой ответ от DeepSeek')

    } catch (err) {
      // сетевые сбои тоже ретраим
      if (err instanceof Error && /fetch failed|ECONNRESET|ETIMEDOUT|network/i.test(err.message)) {
        lastError = err
        const delay = BASE_DELAY_MS * attempt
        await sleep(delay)
        continue
      }
      throw err
    }
  }

  throw new Error(`DeepSeek недоступен после ${MAX_RETRIES} попыток: ${lastError?.message}`)
}

export async function generateText(prompt: string): Promise<string> {
  return callDeepSeek(prompt)
}

export async function generateJSON<T>(prompt: string): Promise<T> {
  const text = await callDeepSeek(prompt)

  // убираем markdown-обёртки если модель вернула ```json ... ```
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  try {
    return JSON.parse(cleaned) as T
  } catch {
    throw new Error(`DeepSeek вернул не JSON: ${cleaned.slice(0, 200)}`)
  }
}