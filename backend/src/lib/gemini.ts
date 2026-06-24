// backend/src/lib/gemini.ts

const PROXY_URL = 'https://kunitcan.chatium.ai/test-api-gemini/api/gemini/generate'
const PROXY_SECRET = process.env.GEMINI_PROXY_SECRET || 'booklib_secret_2024_xK9mP3qR'

const MAX_RETRIES = 5
const BASE_DELAY_MS = 2000

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function callGemini(prompt: string): Promise<string> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, secret: PROXY_SECRET }),
      })

      const data = await res.json() as { result?: string; error?: string }

      if (data.result) {
        return data.result
      }

      if (data.error?.includes('503') || data.error?.includes('UNAVAILABLE')) {
        lastError = new Error(data.error)
        const delay = BASE_DELAY_MS * attempt
        console.warn(`Gemini 503, попытка ${attempt}/${MAX_RETRIES}, жду ${delay}ms...`)
        await sleep(delay)
        continue
      }

      throw new Error(data.error || 'Неизвестная ошибка Gemini')

    } catch (err) {
      if (err instanceof Error && (err.message.includes('503') || err.message.includes('UNAVAILABLE'))) {
        lastError = err
        const delay = BASE_DELAY_MS * attempt
        await sleep(delay)
        continue
      }
      throw err
    }
  }

  throw new Error(`Gemini недоступен после ${MAX_RETRIES} попыток: ${lastError?.message}`)
}

export async function generateText(prompt: string): Promise<string> {
  return callGemini(prompt)
}

export async function generateJSON<T>(prompt: string): Promise<T> {
  const text = await callGemini(prompt)

  // убираем markdown-обёртки если Gemini вернул ```json ... ```
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  try {
    return JSON.parse(cleaned) as T
  } catch {
    throw new Error(`Gemini вернул не JSON: ${cleaned.slice(0, 200)}`)
  }
}