export type Provider = 'openai' | 'gemini'

export type TranslateOptions = {
  model: string
  system: string
  user: string
  temperature?: number
  maxTokens?: number
}

export interface AIClient {
  translateChunk(options: TranslateOptions): Promise<string>
  streamTranslateChunk?(options: TranslateOptions): AsyncIterable<string>
}

export type TranslationSettings = {
  provider: Provider
  model: string
  tone: 'formal' | 'informal' | 'neutral'
  fidelity: 'literal' | 'adaptive' | 'balanced'
  keepLineBreaks: boolean
  glossary?: Record<string, string>
}

export type TranslationChunk = {
  id: string
  text: string
  page?: number
  isRTL?: boolean
}

export type TranslationResult = {
  id: string
  source: string
  translated: string
  page?: number
  isRTL?: boolean
}

export type TranslationProgress = {
  completed: number
  total: number
  currentChunk?: string
  status: 'idle' | 'processing' | 'completed' | 'error'
  error?: string
}
