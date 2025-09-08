import { createOpenAIClient, OPENAI_MODELS } from './openai'
import { createGeminiClient, GEMINI_MODELS } from './gemini'
import type { Provider, AIClient, TranslationSettings, TranslationChunk, TranslationResult } from './types'
import { SYSTEM_PROMPT, createUserPrompt } from './prompts'
import { OPENAI_MODEL } from '@/config/ai'

export function createAIClient(provider: Provider): AIClient {
  switch (provider) {
    case 'openai':
      return createOpenAIClient()
    case 'gemini':
      return createGeminiClient()
    default:
      throw new Error(`Unknown provider: ${provider}`)
  }
}

export function getModelsForProvider(provider: Provider) {
  switch (provider) {
    case 'openai':
      return OPENAI_MODELS
    case 'gemini':
      return GEMINI_MODELS
    default:
      return []
  }
}

export async function translateChunk(
  chunk: TranslationChunk,
  detectedLanguage: string,
  settings: TranslationSettings
): Promise<TranslationResult> {
  const client = createAIClient(settings.provider)
  const userPrompt = createUserPrompt(chunk.text, detectedLanguage, settings)

  try {
    const translated = await client.translateChunk({
      model: settings.model,
      system: SYSTEM_PROMPT,
      user: userPrompt,
    })

    return {
      id: chunk.id,
      source: chunk.text,
      translated,
      page: chunk.page,
      isRTL: chunk.isRTL,
    }
  } catch (error) {
    console.error(`Translation failed for chunk ${chunk.id}:`, error)
    throw error
  }
}

export async function* streamTranslateChunk(
  chunk: TranslationChunk,
  detectedLanguage: string,
  settings: TranslationSettings
): AsyncIterable<{ chunkId: string; content: string; isComplete: boolean }> {
  const client = createAIClient(settings.provider)
  const userPrompt = createUserPrompt(chunk.text, detectedLanguage, settings)

  if (!client.streamTranslateChunk) {
    // Fallback to non-streaming
    const result = await translateChunk(chunk, detectedLanguage, settings)
    yield { chunkId: chunk.id, content: result.translated, isComplete: true }
    return
  }

  try {
    let accumulated = ''
    for await (const content of client.streamTranslateChunk({
      model: settings.model,
      system: SYSTEM_PROMPT,
      user: userPrompt,
    })) {
      accumulated += content
      yield { chunkId: chunk.id, content: accumulated, isComplete: false }
    }
    
    // Final chunk with complete flag
    yield { chunkId: chunk.id, content: accumulated, isComplete: true }
  } catch (error) {
    console.error(`Streaming translation failed for chunk ${chunk.id}:`, error)
    throw error
  }
}

// Rate limiting and concurrency control
export class TranslationQueue {
  private queue: Array<() => Promise<any>> = []
  private running = 0
  private maxConcurrent: number

  constructor(maxConcurrent = 3) {
    this.maxConcurrent = maxConcurrent
  }

  async add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })
      this.process()
    })
  }

  private async process() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return
    }

    this.running++
    const task = this.queue.shift()!
    
    try {
      await task()
    } finally {
      this.running--
      this.process()
    }
  }
}

export * from './types'
export { SYSTEM_PROMPT, createUserPrompt } from './prompts'
