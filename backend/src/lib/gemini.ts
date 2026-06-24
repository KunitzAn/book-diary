import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = process.env.GEMINI_API_KEY

if (!apiKey) {
  throw new Error('GEMINI_API_KEY не задан в .env')
}

const genAI = new GoogleGenerativeAI(apiKey)

export const geminiModel = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
})

export async function generateText(prompt: string): Promise<string> {
  try {
    const result = await geminiModel.generateContent(prompt)
    return result.response.text()
  } catch (error: any) {
    if (error?.status === 429) {
      throw new Error('Превышен лимит запросов к Gemini, попробуй позже')
    }
    if (error?.status === 400) {
      throw new Error('Некорректный запрос к Gemini')
    }
    throw new Error(`Ошибка Gemini: ${error?.message ?? 'неизвестная ошибка'}`)
  }
}

export async function generateJSON<T>(prompt: string): Promise<T> {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    })
    const result = await model.generateContent(prompt)
    const text = result.response.text()
    return JSON.parse(text) as T
  } catch (error: any) {
    if (error?.status === 429) {
      throw new Error('Превышен лимит запросов к Gemini, попробуй позже')
    }
    throw new Error(`Ошибка Gemini JSON: ${error?.message ?? 'неизвестная ошибка'}`)
  }
}